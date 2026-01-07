// supabase/functions/process-payout/index.ts
// Admin function to manually trigger payout (or resolve dispute in seller's favor)
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ProcessPayoutRequest {
  orderId: string
  reason?: string
  disputeId?: string // If paying out due to dispute resolution
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

    // Verify admin user
    // @ts-ignore: Deno global
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Check admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      throw new Error('Admin privileges required')
    }

    const { orderId, reason, disputeId } = await req.json() as ProcessPayoutRequest

    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error('Order not found')
    }

    // Check order can be paid out
    const payableStatuses = ['payment_held', 'transfer_pending', 'payout_pending', 'disputed']
    if (!payableStatuses.includes(order.escrow_status)) {
      throw new Error(`Cannot process payout for order with status: ${order.escrow_status}`)
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

    if (escrowPayment.status === 'paid_out') {
      throw new Error('Order has already been paid out')
    }

    if (escrowPayment.status === 'refunded') {
      throw new Error('Order has been refunded, cannot payout')
    }

    // Check if transfer already exists
    const { data: existingTransfer } = await supabase
      .from('seller_transfers')
      .select('*')
      .eq('escrow_payment_id', escrowPayment.id)
      .single()

    if (existingTransfer && existingTransfer.status === 'paid') {
      throw new Error('Transfer already completed')
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

    // Create Stripe Transfer
    const transfer = await stripe.transfers.create({
      amount: escrowPayment.amount_cents,
      currency: 'usd',
      destination: sellerAccount.stripe_account_id,
      metadata: {
        order_id: orderId,
        escrow_payment_id: escrowPayment.id,
        seller_id: order.seller_id,
        admin_id: user.id,
        reason: reason || 'Admin manual payout',
        dispute_id: disputeId || null,
      },
    })

    // Update or create seller transfer record
    if (existingTransfer) {
      await supabase
        .from('seller_transfers')
        .update({
          stripe_transfer_id: transfer.id,
          status: 'pending',
          failure_reason: null,
        })
        .eq('id', existingTransfer.id)
    } else {
      await supabase
        .from('seller_transfers')
        .insert({
          escrow_payment_id: escrowPayment.id,
          seller_id: order.seller_id,
          stripe_transfer_id: transfer.id,
          stripe_account_id: sellerAccount.stripe_account_id,
          amount_cents: escrowPayment.amount_cents,
          status: 'pending',
        })
    }

    // Update escrow payment
    await supabase
      .from('escrow_payments')
      .update({ status: 'payout_pending' })
      .eq('id', escrowPayment.id)

    // Update order
    await supabase
      .from('orders')
      .update({
        escrow_status: 'payout_pending',
        notes: reason ? `Admin payout: ${reason}` : 'Admin initiated payout',
      })
      .eq('id', orderId)

    // Update ticket transfer if needed
    await supabase
      .from('ticket_transfers')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmed_by: 'admin',
      })
      .eq('order_id', orderId)
      .in('status', ['pending', 'transfer_initiated'])

    // If this was a dispute resolution, update dispute
    if (disputeId) {
      await supabase
        .from('escrow_disputes')
        .update({
          status: 'resolved_payout',
          resolution: `Paid out to seller: ${reason || 'Admin decision'}`,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', disputeId)
    }

    console.log(`💰 Payout processed for order ${orderId}: ${transfer.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payout initiated successfully',
        transferId: transfer.id,
        amountCents: escrowPayment.amount_cents,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Process payout error:', error)

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
