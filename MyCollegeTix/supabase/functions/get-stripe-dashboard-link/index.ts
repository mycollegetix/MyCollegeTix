// supabase/functions/get-stripe-dashboard-link/index.ts
// Generates a Stripe Connect Express dashboard login link for users
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0'
import { rateLimitMiddleware } from '../_shared/rateLimiter.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// @ts-ignore: Deno global
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    // @ts-ignore: Deno global
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      throw new Error('Missing required environment variables')
    }

    // Initialize clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    // Verify user is authenticated
    // @ts-ignore: Deno global
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized: Invalid or expired token')
    }

    // Rate limiting - general limits (30 requests per minute per user)
    const { response: rateLimitResponse } = await rateLimitMiddleware(
      supabase,
      req,
      'get-stripe-dashboard-link',
      'general',
      user.id,
      corsHeaders
    )
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Check if user has a Stripe account
    const { data: stripeAccount, error: accountError } = await supabase
      .from('stripe_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (accountError || !stripeAccount) {
      // User doesn't have a Stripe account - return flag to initiate onboarding
      return new Response(
        JSON.stringify({
          success: true,
          hasAccount: false,
          message: 'No Stripe account found. Please complete payment setup first.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if onboarding is complete
    if (!stripeAccount.onboarding_completed || !stripeAccount.details_submitted) {
      // Account exists but onboarding not complete - return onboarding link instead
      const baseUrl = `${supabaseUrl}/functions/v1/stripe-redirect`
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccount.stripe_account_id,
        refresh_url: `${baseUrl}?type=refresh`,
        return_url: `${baseUrl}?type=complete`,
        type: 'account_onboarding',
      })

      return new Response(
        JSON.stringify({
          success: true,
          hasAccount: true,
          onboardingComplete: false,
          url: accountLink.url,
          message: 'Please complete your payment setup to access the dashboard.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate Stripe Express dashboard login link
    const loginLink = await stripe.accounts.createLoginLink(
      stripeAccount.stripe_account_id
    )

    console.log(`✅ Generated Stripe dashboard link for user ${user.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        hasAccount: true,
        onboardingComplete: true,
        url: loginLink.url,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Get Stripe dashboard link error:', error)

    // Extract user-friendly error message
    let errorMessage = 'Unknown error'
    if (error?.raw?.message) {
      errorMessage = error.raw.message
    } else if (error?.message) {
      errorMessage = error.message
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
