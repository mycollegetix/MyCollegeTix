// supabase/functions/submit-support-request/index.ts
// Sends support request emails to the team via AWS SES
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail } from '../_shared/email/emailClient.ts'
import { supportRequestEmail } from '../_shared/email/templates/supportRequest.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SupportRequestBody {
  subject: string
  message: string
  priority: 'low' | 'medium' | 'high'
  appVersion: string
  buildNumber: string
  platform: string
}

// @ts-ignore: Deno global
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // @ts-ignore: Deno global
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    // @ts-ignore: Deno global
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    // @ts-ignore: Deno global
    const teamEmails = Deno.env.get('TEAM_DISPUTE_EMAILS')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables')
    }

    if (!teamEmails) {
      console.warn('TEAM_DISPUTE_EMAILS not configured, skipping support email')
      return new Response(
        JSON.stringify({ success: true, message: 'No team emails configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user is authenticated and get their profile
    // @ts-ignore: Deno global
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Get user's profile for their name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', user.id)
      .single()

    const userName = profile?.full_name || profile?.username || 'Unknown User'
    const userEmail = user.email || 'no-email@unknown.com'

    const {
      subject,
      message,
      priority,
      appVersion,
      buildNumber,
      platform,
    } = await req.json() as SupportRequestBody

    if (!subject?.trim() || !message?.trim()) {
      throw new Error('Subject and message are required')
    }

    console.log(`📧 Processing support request from ${userName}: "${subject}"`)

    const emailHtml = supportRequestEmail({
      subject,
      message,
      priority: priority || 'medium',
      userEmail,
      userName,
      appVersion: appVersion || 'Unknown',
      buildNumber: buildNumber || 'Unknown',
      platform: platform || 'Unknown',
    })

    // Parse team emails (comma-separated) — same list as dispute notifications
    const emailList = teamEmails.split(',').map((e: string) => e.trim()).filter((e: string) => e)

    console.log(`📬 Sending support request to ${emailList.length} team members`)

    const emailResults = await Promise.all(
      emailList.map(async (email: string) => {
        try {
          const result = await sendEmail({
            to: email,
            subject: `[SUPPORT] ${priority?.toUpperCase() || 'MEDIUM'} — ${subject}`,
            html: emailHtml,
            replyTo: userEmail,
          })
          return { email, success: result.success, error: result.error }
        } catch (err) {
          console.error(`Failed to send to ${email}:`, err)
          return { email, success: false, error: String(err) }
        }
      })
    )

    const successCount = emailResults.filter((r: any) => r.success).length
    const failedEmails = emailResults.filter((r: any) => !r.success)

    if (failedEmails.length > 0) {
      console.error('Some support emails failed:', failedEmails)
    }

    console.log(`✅ Support request sent: ${successCount}/${emailList.length} emails delivered`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Support request sent to ${successCount} team members`,
        results: emailResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Submit support request error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
