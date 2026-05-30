// supabase/functions/retry-pending-transfers/index.ts
// Cron job that retries Stripe Transfers stuck in `pending` because of
// `balance_insufficient` (or legacy stuck orders with escrow_status=payout_pending
// and no seller_transfers row). Runs every 4 hours via pg_cron.
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Summary {
  processed: number
  succeeded: number
  still_pending: number
  failed: number
}

// @ts-ignore: Deno global
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth: accept either x-cron-secret header (for pg_cron) or admin JWT (for manual triggers)
    const cronSecret = req.headers.get('x-cron-secret')
    // @ts-ignore: Deno global
    const expectedSecret = Deno.env.get('CRON_SECRET')
    const authHeader = req.headers.get('Authorization')

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

    let isAdmin = false
    if (authHeader) {
      // @ts-ignore: Deno global
      const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: { user } } = await supabaseAuth.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()
        isAdmin = profile?.is_admin === true
      }
    }

    if (cronSecret !== expectedSecret && !isAdmin) {
      // @ts-ignore: Deno global
      const isDev = Deno.env.get('ENVIRONMENT') === 'development'
      if (!isDev) {
        throw new Error('Unauthorized')
      }
    }

    console.log('🔄 Running retry-pending-transfers...')

    const summary: Summary = { processed: 0, succeeded: 0, still_pending: 0, failed: 0 }

    // --- Step 1: pending seller_transfers rows that never got a Stripe transfer ID
    const { data: pendingTransfers, error: pendingErr } = await supabase
      .from('seller_transfers')
      .select(`
        id,
        escrow_payment_id,
        seller_id,
        stripe_account_id,
        amount_cents,
        escrow_payment:escrow_payments (
          id,
          order_id,
          status,
          order:orders (
            id,
            seller_id,
            buyer_id,
            ticket_id,
            escrow_status
          )
        )
      `)
      .eq('status', 'pending')
      .is('stripe_transfer_id', null)
      .limit(50)

    if (pendingErr) {
      throw new Error(`Failed to fetch pending transfers: ${pendingErr.message}`)
    }

    for (const row of pendingTransfers ?? []) {
      summary.processed++
      const escrow = row.escrow_payment
      const order = escrow?.order
      if (!escrow || !order) {
        console.log(`⚠️ Skipping transfer ${row.id} - missing escrow/order link`)
        summary.failed++
        continue
      }

      if (await hasActiveDispute(supabase, order.id)) {
        console.log(`⏭️ Skipping order ${order.id} - active dispute`)
        continue
      }

      const result = await attemptTransfer(stripe, supabase, {
        orderId: order.id,
        sellerId: order.seller_id,
        buyerId: order.buyer_id,
        ticketId: order.ticket_id,
        escrowPaymentId: escrow.id,
        amountCents: row.amount_cents,
        stripeAccountId: row.stripe_account_id,
        existingTransferRowId: row.id,
      })

      tallyResult(summary, result)
    }

    // --- Step 2: legacy stuck orders (escrow_status=payout_pending, no transfer row at all)
    const { data: orphanOrders, error: orphanErr } = await supabase
      .from('orders')
      .select(`
        id,
        seller_id,
        buyer_id,
        ticket_id,
        escrow_status,
        escrow_payment:escrow_payments (
          id,
          status,
          amount_cents
        )
      `)
      .eq('escrow_status', 'payout_pending')
      .limit(50)

    if (orphanErr) {
      throw new Error(`Failed to fetch payout_pending orders: ${orphanErr.message}`)
    }

    for (const order of orphanOrders ?? []) {
      const escrow = Array.isArray(order.escrow_payment) ? order.escrow_payment[0] : order.escrow_payment
      if (!escrow) continue

      // Skip if a seller_transfers row already exists for this escrow payment
      const { data: existingTransfer } = await supabase
        .from('seller_transfers')
        .select('id, status, stripe_transfer_id')
        .eq('escrow_payment_id', escrow.id)
        .maybeSingle()

      if (existingTransfer) continue // Handled in Step 1 or already paid

      summary.processed++

      if (await hasActiveDispute(supabase, order.id)) {
        console.log(`⏭️ Skipping orphan order ${order.id} - active dispute`)
        continue
      }

      // Look up seller's stripe account for the transfer
      const { data: sellerAccount } = await supabase
        .from('stripe_accounts')
        .select('stripe_account_id, payouts_enabled')
        .eq('user_id', order.seller_id)
        .single()

      if (!sellerAccount?.stripe_account_id) {
        console.log(`⚠️ Orphan order ${order.id} - seller has no Stripe account`)
        summary.failed++
        continue
      }
      if (!sellerAccount.payouts_enabled) {
        console.log(`⚠️ Orphan order ${order.id} - seller payouts not enabled`)
        summary.failed++
        continue
      }

      const result = await attemptTransfer(stripe, supabase, {
        orderId: order.id,
        sellerId: order.seller_id,
        buyerId: order.buyer_id,
        ticketId: order.ticket_id,
        escrowPaymentId: escrow.id,
        amountCents: escrow.amount_cents,
        stripeAccountId: sellerAccount.stripe_account_id,
        existingTransferRowId: null, // INSERT a new row on success
      })

      tallyResult(summary, result)
    }

    console.log(
      `🏁 Retry complete: processed=${summary.processed} succeeded=${summary.succeeded} ` +
      `still_pending=${summary.still_pending} failed=${summary.failed}`
    )

    return new Response(
      JSON.stringify({ success: true, ...summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Retry-pending-transfers error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message ?? 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

type AttemptOutcome = 'succeeded' | 'still_pending' | 'failed'

async function attemptTransfer(
  stripe: Stripe,
  supabase: any,
  params: {
    orderId: string
    sellerId: string
    buyerId: string
    ticketId: string | null
    escrowPaymentId: string
    amountCents: number
    stripeAccountId: string
    existingTransferRowId: string | null
  }
): Promise<AttemptOutcome> {
  let transfer: Stripe.Transfer
  try {
    transfer = await stripe.transfers.create({
      amount: params.amountCents,
      currency: 'usd',
      destination: params.stripeAccountId,
      metadata: {
        order_id: params.orderId,
        escrow_payment_id: params.escrowPaymentId,
        seller_id: params.sellerId,
        buyer_id: params.buyerId,
        retry: 'true',
      },
    })
  } catch (transferError: any) {
    if (transferError?.code === 'balance_insufficient') {
      console.log(`⏳ Order ${params.orderId} - still insufficient balance, will retry next run`)
      return 'still_pending'
    }

    const reason = transferError?.raw?.message ?? transferError?.message ?? 'unknown stripe error'
    console.error(`❌ Order ${params.orderId} - transfer failed: ${reason}`)

    if (params.existingTransferRowId) {
      await supabase
        .from('seller_transfers')
        .update({ failure_reason: reason })
        .eq('id', params.existingTransferRowId)
    }
    return 'failed'
  }

  const transferredAt = new Date().toISOString()

  if (params.existingTransferRowId) {
    await supabase
      .from('seller_transfers')
      .update({
        status: 'paid',
        stripe_transfer_id: transfer.id,
        transferred_at: transferredAt,
        failure_reason: null,
      })
      .eq('id', params.existingTransferRowId)
  } else {
    await supabase
      .from('seller_transfers')
      .insert({
        escrow_payment_id: params.escrowPaymentId,
        seller_id: params.sellerId,
        stripe_transfer_id: transfer.id,
        stripe_account_id: params.stripeAccountId,
        amount_cents: params.amountCents,
        status: 'paid',
        transferred_at: transferredAt,
      })
  }

  await supabase
    .from('escrow_payments')
    .update({ status: 'paid_out' })
    .eq('id', params.escrowPaymentId)

  await supabase
    .from('orders')
    .update({ escrow_status: 'completed' })
    .eq('id', params.orderId)

  await sendPaymentReleasedNotification(supabase, {
    sellerId: params.sellerId,
    ticketId: params.ticketId,
    orderId: params.orderId,
    amountCents: params.amountCents,
  })

  console.log(`✅ Order ${params.orderId} - transfer ${transfer.id} succeeded`)
  return 'succeeded'
}

async function hasActiveDispute(supabase: any, orderId: string): Promise<boolean> {
  const { data } = await supabase
    .from('escrow_disputes')
    .select('id')
    .eq('order_id', orderId)
    .in('status', ['open', 'under_review'])
    .limit(1)
  return !!(data && data.length > 0)
}

async function sendPaymentReleasedNotification(
  supabase: any,
  params: { sellerId: string; ticketId: string | null; orderId: string; amountCents: number }
) {
  const { data: ticket } = params.ticketId
    ? await supabase.from('tickets').select('title').eq('id', params.ticketId).single()
    : { data: null }

  const ticketTitle = ticket?.title || 'your ticket'
  const amountDollars = (params.amountCents / 100).toFixed(2)
  const message = `Payment for "${ticketTitle}" has been released. $${amountDollars} has been transferred to your account and will arrive within 1-2 business days.`

  await supabase
    .from('notifications')
    .insert({
      user_id: params.sellerId,
      title: 'Payment Released!',
      message,
      type: 'sale',
      related_ticket_id: params.ticketId,
      related_order_id: params.orderId,
      read: false,
    })
}

function tallyResult(summary: Summary, outcome: AttemptOutcome) {
  if (outcome === 'succeeded') summary.succeeded++
  else if (outcome === 'still_pending') summary.still_pending++
  else summary.failed++
}
