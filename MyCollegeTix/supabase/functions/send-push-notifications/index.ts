// supabase/functions/send-push-notification/index.ts
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PushNotificationRequest {
  userIds: string[]
  title: string
  body: string
  data?: any
}

interface ExpoMessage {
  to: string
  title: string
  body: string
  data?: any
  sound: string
  priority: 'normal' | 'high'
}

// @ts-ignore: Deno global
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify request method
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Get environment variables
    // @ts-ignore: Deno global
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    // @ts-ignore: Deno global
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    // @ts-ignore: Deno global
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Missing required environment variables')
    }

    // Initialize Supabase client with the user's token for auth verification
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized: Invalid or expired token')
    }

    // Parse request body
    const requestData = await req.json() as PushNotificationRequest
    const { userIds, title, body, data } = requestData

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new Error('userIds must be a non-empty array')
    }

    if (!title || !body) {
      throw new Error('title and body are required')
    }

    // Initialize Supabase client with anon key and user auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    // Get push tokens from profiles table
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .in('id', userIds)
      .not('expo_push_token', 'is', null)

    if (profileError) {
      throw new Error(`Failed to fetch push tokens: ${profileError.message}`)
    }

    const tokens = profiles
      .map((p: any) => p.expo_push_token)
      .filter((token: any) => token !== null) as string[]

    if (tokens.length === 0) {
      console.warn('No push tokens found for users:', userIds)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No push tokens found', 
          sentCount: 0 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Validate and prepare notification messages
    const validTokens = tokens.filter((token: string) => {
      // Basic Expo push token validation
      return token && (
        token.startsWith('ExponentPushToken[') || 
        token.startsWith('ExpoPushToken[') ||
        token.length > 20 // Basic length check
      )
    })

    if (validTokens.length === 0) {
      console.warn('No valid push tokens found for users:', userIds)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No valid push tokens found', 
          sentCount: 0 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    const messages: ExpoMessage[] = validTokens.map((token: string) => ({
      to: token,
      title,
      body,
      data: data || {},
      sound: 'default',
      priority: 'high',
    }))

    // Send push notifications via Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Expo push API error: ${response.status} ${errorData}`)
    }

    const result = await response.json()
    
    // Log successful sends and any errors
    console.log(`Push notifications sent to ${validTokens.length} devices:`, result)

    // Check for any individual message errors
    const errors = result.data?.filter((receipt: any) => receipt.status === 'error') || []
    if (errors.length > 0) {
      console.error('Some push notifications failed:', errors)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sentCount: validTokens.length,
        results: result,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Push notification error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})