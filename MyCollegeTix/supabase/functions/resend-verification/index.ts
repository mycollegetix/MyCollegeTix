// supabase/functions/resend-verification/index.ts
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ResendVerificationRequest {
  email: string
}

interface ResendVerificationResponse {
  success: boolean
  message: string
  action?: 'sent' | 'already_verified' | 'not_found' | 'rate_limited'
}

// Simple in-memory rate limiting (in production, use Redis or database)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_ATTEMPTS = 3 // Maximum 3 attempts per 15 minutes

function isRateLimited(email: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(email)
  
  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimitMap.set(email, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return false
  }
  
  if (record.count >= MAX_ATTEMPTS) {
    return true
  }
  
  record.count++
  return false
}

// Clean up old rate limit records periodically
setInterval(() => {
  const now = Date.now()
  for (const [email, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(email)
    }
  }
}, 5 * 60 * 1000) // Clean up every 5 minutes

// @ts-ignore: Deno global
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Method not allowed' 
      }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    // Check environment variables first
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error('Missing required environment variables')
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Server configuration error. Missing environment variables.' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    // Get request body
    const { email }: ResendVerificationRequest = await req.json()

    // Validate input
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Email is required and must be a string' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Please enter a valid email address' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Rate limiting check
    if (isRateLimited(email)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Too many requests. Please wait 15 minutes before trying again.',
          action: 'rate_limited'
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Initialize Supabase Admin Client (server-side with service role)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // STEP 1: Check if user exists in the system
    // Search for user with pagination since listUsers only returns first 50 users
    let userData = null
    let page = 1
    const perPage = 100 // Increase page size for efficiency
    
    while (page <= 10) { // Limit to 10 pages (1000 users max) to prevent infinite loops
      const { data: usersList, error: getUserError } = await supabaseAdmin.auth.admin.listUsers({
        page: page,
        perPage: perPage
      })
      
      if (getUserError) {
        console.error(`Error on page ${page}:`, getUserError.message)
        break
      }
      
      if (!usersList?.users || usersList.users.length === 0) {
        break
      }
      
      // Search for the user in this page
      const foundUser = usersList.users.find(user => user.email?.toLowerCase() === email.toLowerCase())
      if (foundUser) {
        userData = { user: foundUser }
        break
      }
      
      // If this page had fewer users than expected, we've reached the end
      if (usersList.users.length < perPage) {
        break
      }
      
      page++
    }

    // Error handling moved to pagination loop above
    if (false) { // This block is no longer used but kept for structure
      // Don't reveal system details, proceed with generic approach
      console.error('❌ Step 1 RESULT: Unknown error, falling back to generic resend')
      
      // Fall back to just attempting the resend without user checking
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })

      console.log('📧 Attempting generic resend verification email')
      const { error: resendError } = await supabaseClient.auth.resend({
        type: 'signup',
        email: email
      })

      if (resendError) {
        console.error('❌ Generic resend error:', resendError.message)
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Failed to send verification email. Please check if the email address is correct and try again.',
            action: 'error'
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Verification email sent to ${email}. Please check your email (including spam folder) and click the verification link.`,
          action: 'sent'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!userData || !userData.user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No account found with this email address. Please create a new account.',
          action: 'not_found'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // STEP 2: Check if user is already verified
    if (userData.user.email_confirmed_at) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Your email is already verified! You can sign in with your password.',
          action: 'already_verified'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // STEP 3: Send verification email (user exists but is unverified)
    
    // Use the standard client to resend verification
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { error: resendError } = await supabaseClient.auth.resend({
      type: 'signup',
      email: email
    })

    if (resendError) {
      console.error('Resend error:', resendError.message)
      
      // Handle specific Supabase errors
      if (resendError.message.includes('rate limit') || resendError.message.includes('too many')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Email sending rate limit exceeded. Please wait a few minutes before requesting another.',
            action: 'rate_limited'
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      } else if (resendError.message.includes('User already confirmed') || 
                 resendError.message.includes('already verified') || 
                 resendError.message.includes('Email already confirmed')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Your email is already verified! You can sign in with your password.',
            action: 'already_verified'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      } else if (resendError.message.includes('User not found') || 
                 resendError.message.includes('user not found') ||
                 resendError.message.includes('No user found')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'No account found with this email address. Please create a new account.',
            action: 'not_found'
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      } else {
        // Generic error
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Failed to send verification email. Please try again in a few minutes.',
            action: 'error'
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Verification email sent to ${email}. Please check your email (including spam folder) and click the verification link.`,
        action: 'sent'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('💥 Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'An unexpected error occurred. Please try again later.' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})