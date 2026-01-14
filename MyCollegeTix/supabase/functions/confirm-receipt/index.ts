// supabase/functions/confirm-receipt/index.ts
// Called when buyer confirms receipt of ticket - triggers payout to seller
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ConfirmReceiptRequest {
  orderId: string
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

    const { orderId } = await req.json() as ConfirmReceiptRequest

    // Get order with related data
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error('Order not found')
    }

    // Verify buyer owns this order
    if (order.buyer_id !== user.id) {
      throw new Error('You can only confirm receipt for your own orders')
    }

    // Check order status
    if (order.escrow_status !== 'transfer_pending' && order.escrow_status !== 'payment_held') {
      throw new Error(`Cannot confirm receipt. Order status: ${order.escrow_status}`)
    }

    // Get escrow payment
    const { data: escrowPayment, error: escrowError } = await supabase
      .from('escrow_payments')
      .select('*')
      .eq('order_id', orderId)
      .single()

    if (escrowError || !escrowPayment) {
      throw new Error('Escrow payment not found')
    }

    // Get seller's Stripe account
    const { data: sellerAccount, error: sellerAccountError } = await supabase
      .from('stripe_accounts')
      .select('*')
      .eq('user_id', order.seller_id)
      .single()

    if (sellerAccountError || !sellerAccount) {
      throw new Error('Seller Stripe account not found')
    }

    if (!sellerAccount.payouts_enabled) {
      throw new Error('Seller account is not ready to receive payouts')
    }

    // Update ticket transfer status
    await supabase
      .from('ticket_transfers')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmed_by: 'buyer',
      })
      .eq('order_id', orderId)

    // Update order status
    await supabase
      .from('orders')
      .update({ escrow_status: 'payout_pending' })
      .eq('id', orderId)

    // Update escrow payment status
    await supabase
      .from('escrow_payments')
      .update({ status: 'payout_pending' })
      .eq('id', escrowPayment.id)

    // ESCROW: Now transfer funds from platform to seller's Connect account
    const transfer = await stripe.transfers.create({
      amount: escrowPayment.amount_cents,
      currency: 'usd',
      destination: sellerAccount.stripe_account_id,
      metadata: {
        order_id: orderId,
        escrow_payment_id: escrowPayment.id,
        seller_id: order.seller_id,
        buyer_id: order.buyer_id,
      },
    })

    // Record the transfer
    await supabase
      .from('seller_transfers')
      .insert({
        escrow_payment_id: escrowPayment.id,
        seller_id: order.seller_id,
        stripe_transfer_id: transfer.id,
        stripe_account_id: sellerAccount.stripe_account_id,
        amount_cents: escrowPayment.amount_cents,
        status: 'paid',
        transferred_at: new Date().toISOString(),
      })

    // Mark order as completed
    await supabase
      .from('orders')
      .update({ escrow_status: 'completed' })
      .eq('id', orderId)

    await supabase
      .from('escrow_payments')
      .update({ status: 'paid_out' })
      .eq('id', escrowPayment.id)

    // Get ticket and buyer info for notification
    const { data: ticket } = await supabase
      .from('tickets')
      .select('title')
      .eq('id', order.ticket_id)
      .single()

    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', user.id)
      .single()

    const ticketTitle = ticket?.title || 'the ticket'
    const buyerName = buyerProfile?.full_name || buyerProfile?.username || 'The buyer'
    const amountDollars = (escrowPayment.amount_cents / 100).toFixed(2)

    // Send notification to seller about payment release
    await supabase
      .from('notifications')
      .insert({
        user_id: order.seller_id,
        title: 'Payment Released!',
        message: `${buyerName} confirmed receipt of "${ticketTitle}". $${amountDollars} has been transferred to your account.`,
        type: 'sale',
        related_ticket_id: order.ticket_id,
        related_order_id: orderId,
        read: false,
      })

    console.log(`📬 Notification sent to seller ${order.seller_id}`)

    // Create rating prompt for seller to rate buyer
    const { error: ratingPromptError } = await supabase
      .from('rating_prompts')
      .insert({
        ticket_sale_id: orderId,
        prompter_id: order.seller_id,
        ratee_id: order.buyer_id,
        prompt_type: 'seller_rate_buyer',
        status: 'pending',
      })

    if (ratingPromptError) {
      console.error(`❌ Failed to create rating prompt:`, ratingPromptError)
    } else {
      console.log(`⭐ Rating prompt created for seller to rate buyer`)
    }
    console.log(`✅ Receipt confirmed for order ${orderId}, transfer ${transfer.id} sent to seller`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Receipt confirmed! Payment has been released to the seller.',
        transferId: transfer.id,
        amountCents: escrowPayment.amount_cents,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Confirm receipt error:', error)

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
