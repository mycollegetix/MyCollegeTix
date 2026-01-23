// supabase/functions/create-connect-account/index.ts
// Creates a Stripe Connect Express account for sellers
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0'
import { rateLimitMiddleware } from '../_shared/rateLimiter.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CreateAccountRequest {
  userId: string
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
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized: Invalid or expired token')
    }

    // Rate limiting - 3 requests per hour per user+IP (account creation is sensitive)
    const { response: rateLimitResponse } = await rateLimitMiddleware(
      supabase,
      req,
      'create-connect-account',
      'accountCreation',
      user.id,
      corsHeaders
    )
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Parse request
    const { userId } = await req.json() as CreateAccountRequest

    // Verify user is creating account for themselves
    if (userId !== user.id) {
      throw new Error('Cannot create account for another user')
    }

    // Check if user already has a Stripe account
    const { data: existingAccount } = await supabase
      .from('stripe_accounts')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (existingAccount) {
      // Return refresh link instead with HTTPS redirect URLs
      const baseUrl = `${supabaseUrl}/functions/v1/stripe-redirect`
      const accountLink = await stripe.accountLinks.create({
        account: existingAccount.stripe_account_id,
        refresh_url: `${baseUrl}?type=refresh`,
        return_url: `${baseUrl}?type=complete`,
        type: 'account_onboarding',
      })

      return new Response(
        JSON.stringify({
          success: true,
          accountId: existingAccount.stripe_account_id,
          onboardingUrl: accountLink.url,
          isExisting: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single()

    if (!profile) {
      throw new Error('User profile not found')
    }

    // Create Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: profile.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: {
        mycollegetix_user_id: userId,
      },
    })

    // Store account in database
    const { error: insertError } = await supabase
      .from('stripe_accounts')
      .insert({
        user_id: userId,
        stripe_account_id: account.id,
        account_status: 'pending',
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
        onboarding_completed: false,
      })

    if (insertError) {
      // Clean up Stripe account if DB insert fails
      console.error('Database insert error:', insertError)
      await stripe.accounts.del(account.id)
      throw new Error('Failed to set up your payment account. Please try again.')
    }

    // Generate onboarding link with HTTPS redirect URLs
    const baseUrl = `${supabaseUrl}/functions/v1/stripe-redirect`
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}?type=refresh`,
      return_url: `${baseUrl}?type=complete`,
      type: 'account_onboarding',
    })

    console.log(`✅ Created Stripe Connect account ${account.id} for user ${userId}`)

    return new Response(
      JSON.stringify({
        success: true,
        accountId: account.id,
        onboardingUrl: accountLink.url,
        isExisting: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Create Connect account error:', error)

    // Extract user-friendly error message from Stripe errors
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
