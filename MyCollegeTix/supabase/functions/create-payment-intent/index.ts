// supabase/functions/create-payment-intent/index.ts
// Creates a Stripe PaymentIntent for ticket purchase with escrow
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0'
import { rateLimitMiddleware } from '../_shared/rateLimiter.ts'
import { CreatePaymentIntentSchema, validateInput } from '../_shared/validation/schemas.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CreatePaymentIntentRequest {
  ticketId: string
}

// Calculate transfer deadline based on event time
function calculateTransferDeadline(eventDate: Date, purchaseDate: Date = new Date()): Date {
  const hoursUntilEvent = (eventDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60)

  let windowHours: number
  if (hoursUntilEvent <= 4) {
    windowHours = 1
  } else if (hoursUntilEvent <= 12) {
    windowHours = 2
  } else if (hoursUntilEvent <= 24) {
    windowHours = 4
  } else {
    windowHours = 24
  }

  return new Date(purchaseDate.getTime() + windowHours * 60 * 60 * 1000)
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

    // Verify user
    // @ts-ignore: Deno global
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Rate limiting - 10 requests per minute per user+IP
    const { response: rateLimitResponse } = await rateLimitMiddleware(
      supabase,
      req,
      'create-payment-intent',
      'financial',
      user.id,
      corsHeaders
    )
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Validate input
    const rawInput = await req.json()
    const validation = validateInput(CreatePaymentIntentSchema, rawInput, corsHeaders)
    if (!validation.success) {
      return validation.response
    }
    const { ticketId } = validation.data

    // Get ticket with seller info
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        seller:profiles!tickets_seller_id_fkey (
          id,
          email,
          full_name
        )
      `)
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      throw new Error('Ticket not found')
    }

    if (ticket.status !== 'available') {
      throw new Error('Ticket is no longer available')
    }

    if (ticket.seller_id === user.id) {
      throw new Error('Cannot purchase your own ticket')
    }

    // Check event hasn't started
    const eventDate = new Date(ticket.event_date)
    const hoursUntilEvent = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60)

    if (hoursUntilEvent <= 1) {
      throw new Error('Cannot purchase tickets within 1 hour of event start')
    }

    // Verify seller has Stripe Connect account
    const { data: sellerAccount, error: accountError } = await supabase
      .from('stripe_accounts')
      .select('*')
      .eq('user_id', ticket.seller_id)
      .single()

    if (accountError || !sellerAccount) {
      throw new Error('Seller has not set up payments. Please contact the seller.')
    }

    if (!sellerAccount.charges_enabled || !sellerAccount.payouts_enabled) {
      throw new Error('Seller payment account is not fully set up')
    }

    // Get buyer profile
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    // Calculate amounts (no platform fee initially)
    const ticketPriceCents = Math.round(ticket.price * 100)
    const transferDeadline = calculateTransferDeadline(eventDate)

    // Create order record
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        ticket_id: ticketId,
        buyer_id: user.id,
        seller_id: ticket.seller_id,
        amount: ticket.price,
        status: 'pending',
        escrow_status: 'payment_pending',
        transfer_deadline: transferDeadline.toISOString(),
        event_start_time: ticket.event_date,
      })
      .select()
      .single()

    if (orderError) {
      throw new Error(`Failed to create order: ${orderError.message}`)
    }

    // Create Stripe PaymentIntent - ESCROW MODEL
    // Funds go to platform account and are held until buyer confirms receipt
    // Then we transfer to seller's Connect account
    const paymentIntent = await stripe.paymentIntents.create({
      amount: ticketPriceCents,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      // NO transfer_data - funds stay in platform account as escrow
      metadata: {
        order_id: order.id,
        ticket_id: ticketId,
        buyer_id: user.id,
        seller_id: ticket.seller_id,
        seller_stripe_account: sellerAccount.stripe_account_id,
      },
    })

    // Create escrow payment record
    const { error: escrowError } = await supabase
      .from('escrow_payments')
      .insert({
        order_id: order.id,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: ticketPriceCents,
        buyer_email: buyerProfile?.email || null,
        status: 'pending',
      })

    if (escrowError) {
      // Clean up
      await stripe.paymentIntents.cancel(paymentIntent.id)
      await supabase.from('orders').delete().eq('id', order.id)
      throw new Error(`Failed to create escrow record: ${escrowError.message}`)
    }

    // Create ticket transfer record
    const { error: transferError } = await supabase
      .from('ticket_transfers')
      .insert({
        order_id: order.id,
        ticket_id: ticketId,
        seller_id: ticket.seller_id,
        buyer_id: user.id,
        transfer_deadline: transferDeadline.toISOString(),
        status: 'pending',
      })

    if (transferError) {
      console.error('Failed to create ticket transfer record:', transferError)
      // Non-fatal - continue
    }

    console.log(`✅ Created PaymentIntent ${paymentIntent.id} for order ${order.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        clientSecret: paymentIntent.client_secret,
        orderId: order.id,
        paymentIntentId: paymentIntent.id,
        amount: ticket.price,
        amountCents: ticketPriceCents,
        transferDeadline: transferDeadline.toISOString(),
        ticket: {
          id: ticket.id,
          title: ticket.title,
          eventDate: ticket.event_date,
        },
        seller: {
          name: ticket.seller?.full_name || 'Seller',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Create PaymentIntent error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
