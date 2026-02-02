// supabase/functions/notify-dispute/index.ts
// Sends email notifications to team members when a dispute is opened
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail } from '../_shared/email/emailClient.ts'
import { disputeOpenedEmail } from '../_shared/email/templates/disputeOpened.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface NotifyDisputeRequest {
  disputeId: string
  orderId: string
  ticketTitle: string
  reason: string
  description: string | null
  filedByRole: 'buyer' | 'seller'
  amount: number
  buyerId: string
  sellerId: string
  filedById: string
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
      console.warn('TEAM_DISPUTE_EMAILS not configured, skipping email notifications')
      return new Response(
        JSON.stringify({ success: true, message: 'No team emails configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Verify user is authenticated
    // @ts-ignore: Deno global
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request - data is passed directly from client to avoid RLS issues
    const {
      disputeId,
      orderId,
      ticketTitle,
      reason,
      description,
      filedByRole,
      amount,
      buyerId,
      sellerId,
      filedById,
    } = await req.json() as NotifyDisputeRequest

    if (!disputeId || !orderId || !ticketTitle || !reason) {
      throw new Error('Missing required fields')
    }

    console.log('📋 Processing dispute notification for:', disputeId)

    const amountFormatted = `$${(amount / 100).toFixed(2)}`

    // Get user profiles for buyer, seller, and filer
    const [buyerResult, sellerResult, filerResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, username, email')
        .eq('id', buyerId)
        .single(),
      supabase
        .from('profiles')
        .select('full_name, username, email')
        .eq('id', sellerId)
        .single(),
      supabase
        .from('profiles')
        .select('full_name, username, email')
        .eq('id', filedById)
        .single(),
    ])

    const buyerName = buyerResult.data?.full_name || buyerResult.data?.username || 'Unknown Buyer'
    const sellerName = sellerResult.data?.full_name || sellerResult.data?.username || 'Unknown Seller'
    const filerName = filerResult.data?.full_name || filerResult.data?.username || 'Unknown User'

    // Generate email HTML
    const emailHtml = disputeOpenedEmail({
      disputeId,
      orderId,
      ticketTitle,
      reason,
      description,
      filedBy: filerName,
      filedByRole,
      amount: amountFormatted,
      buyerName,
      sellerName,
    })

    // Parse team emails (comma-separated)
    const emailList = teamEmails.split(',').map(e => e.trim()).filter(e => e)

    console.log(`📧 Sending dispute notification to ${emailList.length} team members`)

    // Send email to each team member
    const emailResults = await Promise.all(
      emailList.map(async (email) => {
        try {
          const result = await sendEmail({
            to: email,
            subject: `[DISPUTE] New dispute filed for "${ticketTitle}"`,
            html: emailHtml,
          })
          return { email, success: result.success, error: result.error }
        } catch (err) {
          console.error(`Failed to send to ${email}:`, err)
          return { email, success: false, error: String(err) }
        }
      })
    )

    const successCount = emailResults.filter(r => r.success).length
    const failedEmails = emailResults.filter(r => !r.success)

    if (failedEmails.length > 0) {
      console.error('Some emails failed to send:', failedEmails)
    }

    console.log(`✅ Dispute notification sent: ${successCount}/${emailList.length} emails delivered`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notification sent to ${successCount} team members`,
        results: emailResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Notify dispute error:', error)

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
