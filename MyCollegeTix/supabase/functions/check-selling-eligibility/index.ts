// supabase/functions/check-selling-eligibility/index.ts
// Checks if a user is eligible to sell tickets based on their Stripe Connect status
// Returns detailed eligibility information including why they can't sell if blocked
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// User-friendly messages for Stripe requirements
const REQUIREMENT_MESSAGES: Record<string, string> = {
  // Identity verification
  'individual.verification.document': 'Identity document verification required',
  'individual.verification.additional_document': 'Additional identity document required',
  'individual.id_number': 'Government ID number required',
  'individual.ssn_last_4': 'Last 4 digits of SSN required',
  'individual.dob.day': 'Date of birth required',
  'individual.dob.month': 'Date of birth required',
  'individual.dob.year': 'Date of birth required',
  'individual.first_name': 'First name required',
  'individual.last_name': 'Last name required',
  'individual.email': 'Email address required',
  'individual.phone': 'Phone number required',
  'individual.address.line1': 'Address required',
  'individual.address.city': 'City required',
  'individual.address.state': 'State required',
  'individual.address.postal_code': 'ZIP code required',

  // Bank account
  'external_account': 'Bank account required for payouts',

  // Business info
  'business_profile.url': 'Business website or profile required',
  'business_profile.mcc': 'Business category required',
  'business_profile.product_description': 'Description of what you sell required',

  // Tax info
  'tos_acceptance.date': 'Terms of service acceptance required',
  'tos_acceptance.ip': 'Terms of service acceptance required',

  // Default
  'default': 'Additional information required',
}

interface EligibilityResult {
  canSell: boolean
  reason: 'eligible' | 'no_account' | 'incomplete_onboarding' | 'restricted' | 'disabled' | 'pending_verification' | 'error'
  message: string
  details?: string[]
  actionRequired?: 'create_account' | 'complete_onboarding' | 'update_info' | 'contact_support' | 'retry'
  onboardingUrl?: string
}

function getRequirementMessage(requirement: string): string {
  // Check for exact match first
  if (REQUIREMENT_MESSAGES[requirement]) {
    return REQUIREMENT_MESSAGES[requirement]
  }

  // Check for partial matches
  for (const [key, message] of Object.entries(REQUIREMENT_MESSAGES)) {
    if (requirement.includes(key) || key.includes(requirement)) {
      return message
    }
  }

  // Clean up the requirement string for display
  const cleaned = requirement
    .replace(/individual\./g, '')
    .replace(/business_profile\./g, '')
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())

  return `${cleaned} required`
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
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      throw new Error('Missing required environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })

    // Verify user is authenticated
    // @ts-ignore: Deno global
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    console.log(`🔍 Checking selling eligibility for user: ${user.id}`)

    // Check if user has a Stripe account in our database
    const { data: dbAccount, error: dbError } = await supabase
      .from('stripe_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Case 1: No Stripe account
    if (dbError || !dbAccount) {
      console.log('❌ No Stripe account found')
      const result: EligibilityResult = {
        canSell: false,
        reason: 'no_account',
        message: 'To sell tickets, you need to set up payments. This only takes a minute.',
        actionRequired: 'create_account',
      }
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch latest account status from Stripe API
    let stripeAccount: Stripe.Account
    try {
      stripeAccount = await stripe.accounts.retrieve(dbAccount.stripe_account_id)
    } catch (stripeError: any) {
      console.error('Error fetching Stripe account:', stripeError)

      // Account might have been deleted or is inaccessible
      if (stripeError.code === 'account_invalid') {
        const result: EligibilityResult = {
          canSell: false,
          reason: 'disabled',
          message: 'Your payment account is no longer active. Please contact support for assistance.',
          actionRequired: 'contact_support',
        }
        return new Response(JSON.stringify({ success: true, ...result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      throw stripeError
    }

    // Update our database with the latest status from Stripe
    const updateData = {
      charges_enabled: stripeAccount.charges_enabled,
      payouts_enabled: stripeAccount.payouts_enabled,
      details_submitted: stripeAccount.details_submitted,
      onboarding_completed: stripeAccount.details_submitted && stripeAccount.charges_enabled && stripeAccount.payouts_enabled,
    }

    // Determine account status
    let accountStatus = 'pending'
    if (stripeAccount.charges_enabled && stripeAccount.payouts_enabled) {
      accountStatus = 'enabled'
    } else if (stripeAccount.requirements?.disabled_reason) {
      accountStatus = 'disabled'
    } else if ((stripeAccount.requirements?.currently_due?.length || 0) > 0) {
      accountStatus = 'restricted'
    } else if (stripeAccount.details_submitted) {
      accountStatus = 'pending_verification'
    }

    await supabase
      .from('stripe_accounts')
      .update({ ...updateData, account_status: accountStatus })
      .eq('stripe_account_id', dbAccount.stripe_account_id)

    // Case 3: Fully enabled - can sell
    if (stripeAccount.charges_enabled && stripeAccount.payouts_enabled) {
      console.log('✅ User is eligible to sell')
      const result: EligibilityResult = {
        canSell: true,
        reason: 'eligible',
        message: 'Your payment account is ready. You can list tickets for sale.',
      }
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get requirements information
    const currentlyDue = stripeAccount.requirements?.currently_due || []
    const eventuallyDue = stripeAccount.requirements?.eventually_due || []
    const pastDue = stripeAccount.requirements?.past_due || []
    const disabledReason = stripeAccount.requirements?.disabled_reason

    // Generate onboarding link for users who need to complete setup
    let onboardingUrl: string | undefined
    try {
      const baseUrl = `${supabaseUrl}/functions/v1/stripe-redirect`
      const accountLink = await stripe.accountLinks.create({
        account: dbAccount.stripe_account_id,
        refresh_url: `${baseUrl}?type=refresh`,
        return_url: `${baseUrl}?type=complete`,
        type: 'account_onboarding',
      })
      onboardingUrl = accountLink.url
    } catch (linkError) {
      console.error('Error creating onboarding link:', linkError)
    }

    // Case: Account disabled
    if (disabledReason) {
      console.log('❌ Account is disabled:', disabledReason)
      let message = 'Your payment account has been disabled.'

      switch (disabledReason) {
        case 'rejected.fraud':
          message = 'Your account was disabled due to suspected fraudulent activity. Please contact support.'
          break
        case 'rejected.terms_of_service':
          message = 'Your account was disabled due to a Terms of Service violation. Please contact support.'
          break
        case 'rejected.listed':
          message = 'Your account was disabled. Please contact support for more information.'
          break
        case 'rejected.other':
          message = 'Your account was disabled. Please contact support for assistance.'
          break
        case 'requirements.past_due':
          message = 'Your account has been restricted because required information is past due. Please update your information.'
          break
        case 'listed':
        case 'platform_paused':
          message = 'Your payment account is temporarily paused. Please contact support.'
          break
        default:
          message = 'Your payment account is currently disabled. Please update your information or contact support.'
      }

      const result: EligibilityResult = {
        canSell: false,
        reason: 'disabled',
        message,
        details: pastDue.length > 0 ? pastDue.map(getRequirementMessage) : undefined,
        actionRequired: disabledReason.startsWith('rejected') ? 'contact_support' : 'update_info',
        onboardingUrl: !disabledReason.startsWith('rejected') ? onboardingUrl : undefined,
      }
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Case 2: Incomplete onboarding (details not submitted)
    if (!stripeAccount.details_submitted) {
      console.log('❌ Onboarding incomplete - details not submitted')
      const allRequirements = [...new Set([...currentlyDue, ...eventuallyDue])]
      const details = allRequirements.slice(0, 5).map(getRequirementMessage)

      const result: EligibilityResult = {
        canSell: false,
        reason: 'incomplete_onboarding',
        message: 'Please complete your payment setup to start selling tickets.',
        details: details.length > 0 ? details : ['Complete your Stripe account setup'],
        actionRequired: 'complete_onboarding',
        onboardingUrl,
      }
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Case: Pending verification (details submitted but waiting)
    if (stripeAccount.details_submitted && !stripeAccount.charges_enabled) {
      console.log('⏳ Pending verification')

      // Check if there are outstanding requirements
      if (currentlyDue.length > 0) {
        const details = currentlyDue.slice(0, 5).map(getRequirementMessage)
        const result: EligibilityResult = {
          canSell: false,
          reason: 'restricted',
          message: 'Additional information is required to enable selling.',
          details,
          actionRequired: 'update_info',
          onboardingUrl,
        }
        return new Response(JSON.stringify({ success: true, ...result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // No outstanding requirements - just waiting for verification
      const result: EligibilityResult = {
        canSell: false,
        reason: 'pending_verification',
        message: 'Your account is being verified by Stripe. This usually takes 1-2 business days.',
        actionRequired: 'retry',
      }
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Case: Restricted (has requirements)
    if (currentlyDue.length > 0 || !stripeAccount.payouts_enabled) {
      console.log('❌ Account restricted - has requirements')
      const details = currentlyDue.slice(0, 5).map(getRequirementMessage)

      let message = 'Your payment account needs attention before you can sell.'
      if (!stripeAccount.payouts_enabled && stripeAccount.charges_enabled) {
        message = 'Your account can accept payments but cannot receive payouts yet. Please complete the required information.'
      }

      const result: EligibilityResult = {
        canSell: false,
        reason: 'restricted',
        message,
        details: details.length > 0 ? details : ['Additional information required'],
        actionRequired: 'update_info',
        onboardingUrl,
      }
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fallback - shouldn't reach here but handle gracefully
    console.log('⚠️ Unexpected state - blocking as precaution')
    const result: EligibilityResult = {
      canSell: false,
      reason: 'error',
      message: 'Unable to verify your payment account status. Please try again.',
      actionRequired: 'retry',
    }
    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Check selling eligibility error:', error)

    // Return a safe error that blocks selling
    const result: EligibilityResult = {
      canSell: false,
      reason: 'error',
      message: 'Unable to verify your payment account. Please check your connection and try again.',
      actionRequired: 'retry',
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message, ...result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' ? 401 : 400,
      }
    )
  }
})
