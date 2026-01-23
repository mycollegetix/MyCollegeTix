// supabase/functions/process-refund/index.ts
// Admin-only function to process refunds for disputed or cancelled orders
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0'
import { sendEmailToUser, refundProcessedEmail } from '../_shared/email/index.ts'
import { rateLimitMiddleware } from '../_shared/rateLimiter.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ProcessRefundRequest {
  orderId: string
  reason: string
  disputeId?: string // If refunding due to dispute resolution
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

    // Rate limiting - 5 requests per minute per admin (stricter for admin functions)
    const { response: rateLimitResponse } = await rateLimitMiddleware(
      supabase,
      req,
      'process-refund',
      'financial',
      user.id,
      corsHeaders
    )
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { orderId, reason, disputeId } = await req.json() as ProcessRefundRequest

    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error('Order not found')
    }

    // Check order can be refunded
    const refundableStatuses = ['payment_held', 'transfer_pending', 'disputed']
    if (!refundableStatuses.includes(order.escrow_status)) {
      throw new Error(`Cannot refund order with status: ${order.escrow_status}`)
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

    if (escrowPayment.status === 'refunded') {
      throw new Error('Order has already been refunded')
    }

    // Process Stripe refund
    const refund = await stripe.refunds.create({
      payment_intent: escrowPayment.stripe_payment_intent_id,
      reason: 'requested_by_customer',
      metadata: {
        order_id: orderId,
        admin_id: user.id,
        refund_reason: reason,
        dispute_id: disputeId || null,
      },
    })

    // Update escrow payment
    await supabase
      .from('escrow_payments')
      .update({ status: 'refunded' })
      .eq('id', escrowPayment.id)

    // Update order
    await supabase
      .from('orders')
      .update({
        status: 'refunded',
        escrow_status: 'refunded',
        notes: `Refunded by admin: ${reason}`,
      })
      .eq('id', orderId)

    // Return ticket to available
    await supabase
      .from('tickets')
      .update({
        status: 'available',
        buyer_id: null,
      })
      .eq('id', order.ticket_id)

    // Update ticket transfer status
    await supabase
      .from('ticket_transfers')
      .update({ status: 'cancelled' })
      .eq('order_id', orderId)

    // If this was a dispute resolution, update dispute
    if (disputeId) {
      await supabase
        .from('escrow_disputes')
        .update({
          status: 'resolved_refund',
          resolution: `Refunded to buyer: ${reason}`,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', disputeId)
    }

    // Get ticket info for notification and email
    const { data: ticket } = await supabase
      .from('tickets')
      .select('title')
      .eq('id', order.ticket_id)
      .single()

    const ticketTitle = ticket?.title || 'the ticket'
    const amountDollars = (escrowPayment.amount_cents / 100).toFixed(2)

    // Send in-app notification to buyer
    await supabase
      .from('notifications')
      .insert({
        user_id: order.buyer_id,
        title: 'Refund Processed',
        message: `Your refund of $${amountDollars} for "${ticketTitle}" has been processed. The funds will be returned to your original payment method.`,
        type: 'purchase',
        related_ticket_id: order.ticket_id,
        related_order_id: orderId,
        read: false,
      })

    console.log(`📬 Notification sent to buyer ${order.buyer_id}`)

    // Send email to buyer about refund
    try {
      const emailResult = await sendEmailToUser(
        supabase,
        order.buyer_id,
        `Refund Processed: $${amountDollars}`,
        refundProcessedEmail({
          ticketTitle,
          amount: `$${amountDollars}`,
          reason,
          orderId,
        })
      )
      if (emailResult.success) {
        console.log(`📧 Email sent to buyer ${order.buyer_id}`)
      } else {
        console.error(`❌ Failed to send email to buyer: ${emailResult.error}`)
      }
    } catch (emailError) {
      console.error('Buyer email error:', emailError)
    }

    console.log(`💸 Refund processed for order ${orderId}: ${refund.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Refund processed successfully',
        refundId: refund.id,
        amountCents: escrowPayment.amount_cents,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Process refund error:', error)

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
