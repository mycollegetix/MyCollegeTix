// supabase/functions/confirm-receipt/index.ts
// Called when buyer confirms receipt of ticket - triggers payout to seller
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0'
import { sendEmailToUser, receiptConfirmedEmail } from '../_shared/email/index.ts'
import { rateLimitMiddleware } from '../_shared/rateLimiter.ts'
import { ConfirmReceiptSchema, validateInput } from '../_shared/validation/schemas.ts'

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

    // Rate limiting - 10 requests per minute per user+IP
    const { response: rateLimitResponse } = await rateLimitMiddleware(
      supabase,
      req,
      'confirm-receipt',
      'financial',
      user.id,
      corsHeaders
    )
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Validate input
    const rawInput = await req.json()
    const validation = validateInput(ConfirmReceiptSchema, rawInput, corsHeaders)
    if (!validation.success) {
      return validation.response
    }
    const { orderId } = validation.data

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
      const statusMessages: Record<string, string> = {
        'completed': 'This order has already been completed.',
        'refunded': 'This order has been refunded.',
        'disputed': 'This order is currently under dispute.',
        'payment_pending': 'Payment has not been completed yet.',
        'payout_pending': 'Payment is already being processed.',
      }
      throw new Error(statusMessages[order.escrow_status] || 'This order cannot be confirmed at this time.')
    }

    // Get escrow payment
    const { data: escrowPayment, error: escrowError } = await supabase
      .from('escrow_payments')
      .select('*')
      .eq('order_id', orderId)
      .single()

    if (escrowError || !escrowPayment) {
      throw new Error('Payment information not found. Please contact support.')
    }

    // Get seller's Stripe account
    const { data: sellerAccount, error: sellerAccountError } = await supabase
      .from('stripe_accounts')
      .select('*')
      .eq('user_id', order.seller_id)
      .single()

    if (sellerAccountError || !sellerAccount) {
      throw new Error('The seller has not set up their payment account yet. Please contact the seller.')
    }

    if (!sellerAccount.payouts_enabled) {
      throw new Error('The seller\'s payment account is not fully verified. Please contact the seller.')
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

    // Send email to seller about payment release
    try {
      const emailResult = await sendEmailToUser(
        supabase,
        order.seller_id,
        `Payment Released: $${amountDollars}`,
        receiptConfirmedEmail({
          ticketTitle,
          buyerName,
          amount: `$${amountDollars}`,
          orderId,
        })
      )
      if (emailResult.success) {
        console.log(`📧 Email sent to seller ${order.seller_id}`)
      } else {
        console.error(`❌ Failed to send email to seller: ${emailResult.error}`)
      }
    } catch (emailError) {
      console.error('Seller email error:', emailError)
    }

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

  } catch (error: any) {
    console.error('Confirm receipt error:', error)

    // Extract user-friendly error message
    let errorMessage = 'Unknown error'

    // Check for Stripe errors (they have a raw.message or message property)
    if (error?.raw?.message) {
      // Stripe API error - extract the user-friendly message
      errorMessage = error.raw.message
    } else if (error?.message) {
      errorMessage = error.message
    }

    // Make certain Stripe errors more user-friendly
    if (error?.code === 'balance_insufficient') {
      errorMessage = 'The seller\'s Stripe account has insufficient funds. Please contact support.'
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
