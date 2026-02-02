// supabase/functions/check-account-status/index.ts
// Check if a user can transact (not suspended/banned)
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CheckAccountStatusRequest {
  userId?: string // Optional - if not provided, checks current user
}

interface AccountStatusResponse {
  success: boolean
  canTransact: boolean
  status: 'active' | 'suspended' | 'banned'
  reason?: string
  suspensionUntil?: string
  totalViolations: number
  ratingAdjustment: number
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

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify requesting user
    // @ts-ignore: Deno global
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const body = await req.json().catch(() => ({})) as CheckAccountStatusRequest
    const targetUserId = body.userId || user.id

    // Get profile with account status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('account_status, suspension_until, total_violations, seller_rating_adjustment')
      .eq('id', targetUserId)
      .single()

    if (profileError) {
      throw new Error('User not found')
    }

    const status = profile.account_status || 'active'
    let canTransact = status === 'active'
    let reason: string | undefined
    let suspensionUntil = profile.suspension_until

    // Check if suspension has expired
    if (status === 'suspended' && suspensionUntil) {
      const suspensionDate = new Date(suspensionUntil)
      if (suspensionDate < new Date()) {
        // Auto-reinstate the user
        await supabase
          .from('profiles')
          .update({
            account_status: 'active',
            suspension_until: null,
          })
          .eq('id', targetUserId)

        // Deactivate suspension penalties
        await supabase
          .from('user_penalties')
          .update({ is_active: false })
          .eq('user_id', targetUserId)
          .eq('penalty_type', 'temporary_suspension')
          .eq('is_active', true)

        console.log(`✅ Auto-reinstated user ${targetUserId} (suspension expired)`)

        // Return reinstated status
        const response: AccountStatusResponse = {
          success: true,
          canTransact: true,
          status: 'active',
          totalViolations: profile.total_violations || 0,
          ratingAdjustment: profile.seller_rating_adjustment || 0,
        }

        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Build reason message for suspended/banned users
    if (status === 'suspended') {
      const until = suspensionUntil
        ? new Date(suspensionUntil).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        : 'indefinitely'
      reason = `Your account is suspended until ${until}. Contact support for more information.`
    } else if (status === 'banned') {
      reason = 'Your account has been permanently banned due to violations of our terms of service.'
      canTransact = false
    }

    const response: AccountStatusResponse = {
      success: true,
      canTransact,
      status,
      reason,
      suspensionUntil: suspensionUntil || undefined,
      totalViolations: profile.total_violations || 0,
      ratingAdjustment: profile.seller_rating_adjustment || 0,
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Check account status error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        canTransact: false,
        status: 'active',
        error: error instanceof Error ? error.message : 'Unknown error',
        totalViolations: 0,
        ratingAdjustment: 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
