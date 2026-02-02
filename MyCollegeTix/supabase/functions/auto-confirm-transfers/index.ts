// supabase/functions/auto-confirm-transfers/index.ts
// Cron job that auto-confirms transfers past their deadline (if no dispute)
// Schedule: Every 15 minutes via pg_cron or external scheduler
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// @ts-ignore: Deno global
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // This can be called by cron or manually with auth
    // For cron, we use a secret key
    const cronSecret = req.headers.get('x-cron-secret')
    // @ts-ignore: Deno global
    const expectedSecret = Deno.env.get('CRON_SECRET')

    // Also allow authenticated admin calls
    const authHeader = req.headers.get('Authorization')
    let isAdmin = false

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

    // Verify authorization
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

    // Must be either cron secret or admin
    if (cronSecret !== expectedSecret && !isAdmin) {
      // In development, allow without secret
      // @ts-ignore: Deno global
      const isDev = Deno.env.get('ENVIRONMENT') === 'development'
      if (!isDev) {
        throw new Error('Unauthorized')
      }
    }

    console.log('🔄 Running auto-confirm transfers...')

    // Find transfers past deadline that haven't been confirmed or disputed
    const now = new Date().toISOString()
    const { data: pendingTransfers, error: fetchError } = await supabase
      .from('ticket_transfers')
      .select(`
        *,
        order:orders (
          id,
          seller_id,
          buyer_id,
          escrow_status
        )
      `)
      .in('status', ['pending', 'transfer_initiated'])
      .lt('transfer_deadline', now)
      .limit(50) // Process in batches

    if (fetchError) {
      throw new Error(`Failed to fetch transfers: ${fetchError.message}`)
    }

    if (!pendingTransfers || pendingTransfers.length === 0) {
      console.log('✅ No transfers to auto-confirm')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No transfers to auto-confirm',
          processed: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Found ${pendingTransfers.length} transfers to auto-confirm`)

    const results: { success: string[]; failed: string[] } = {
      success: [],
      failed: [],
    }

    for (const transfer of pendingTransfers) {
      try {
        const order = transfer.order
        if (!order) {
          console.log(`⚠️ No order found for transfer ${transfer.id}`)
          results.failed.push(transfer.id)
          continue
        }

        // Skip if order is disputed
        if (order.escrow_status === 'disputed') {
          console.log(`⏭️ Skipping disputed order ${order.id}`)
          continue
        }

        // Check for active disputes
        const { data: disputes } = await supabase
          .from('escrow_disputes')
          .select('id')
          .eq('order_id', order.id)
          .in('status', ['open', 'under_review'])
          .limit(1)

        if (disputes && disputes.length > 0) {
          console.log(`⏭️ Skipping order ${order.id} with active dispute`)
          continue
        }

        // Get escrow payment
        const { data: escrowPayment } = await supabase
          .from('escrow_payments')
          .select('*')
          .eq('order_id', order.id)
          .single()

        if (!escrowPayment) {
          console.log(`⚠️ No escrow payment for order ${order.id}`)
          results.failed.push(transfer.id)
          continue
        }

        // Skip if already refunded or paid out
        if (['refunded', 'paid_out'].includes(escrowPayment.status)) {
          console.log(`⏭️ Escrow already ${escrowPayment.status} for order ${order.id}`)
          continue
        }

        // Get seller's Stripe account
        const { data: sellerAccount } = await supabase
          .from('stripe_accounts')
          .select('*')
          .eq('user_id', order.seller_id)
          .single()

        if (!sellerAccount || !sellerAccount.payouts_enabled) {
          console.log(`⚠️ Seller ${order.seller_id} not ready for payouts`)
          results.failed.push(transfer.id)
          continue
        }

        // Auto-confirm the transfer
        await supabase
          .from('ticket_transfers')
          .update({
            status: 'auto_confirmed',
            confirmed_at: new Date().toISOString(),
            confirmed_by: 'auto',
          })
          .eq('id', transfer.id)

        // Update order status
        await supabase
          .from('orders')
          .update({ escrow_status: 'payout_pending' })
          .eq('id', order.id)

        // Update escrow payment
        await supabase
          .from('escrow_payments')
          .update({ status: 'payout_pending' })
          .eq('id', escrowPayment.id)

        // Create Stripe Transfer
        const stripeTransfer = await stripe.transfers.create({
          amount: escrowPayment.amount_cents,
          currency: 'usd',
          destination: sellerAccount.stripe_account_id,
          metadata: {
            order_id: order.id,
            escrow_payment_id: escrowPayment.id,
            seller_id: order.seller_id,
            auto_confirmed: 'true',
          },
        })

        // Create seller transfer record
        await supabase
          .from('seller_transfers')
          .insert({
            escrow_payment_id: escrowPayment.id,
            seller_id: order.seller_id,
            stripe_transfer_id: stripeTransfer.id,
            stripe_account_id: sellerAccount.stripe_account_id,
            amount_cents: escrowPayment.amount_cents,
            status: 'pending',
          })

        console.log(`✅ Auto-confirmed order ${order.id}, transfer ${stripeTransfer.id}`)
        results.success.push(order.id)

        // TODO: Send notifications to buyer and seller about auto-confirmation

      } catch (error) {
        console.error(`❌ Failed to process transfer ${transfer.id}:`, error)
        results.failed.push(transfer.id)
      }
    }

    console.log(`🏁 Auto-confirm complete: ${results.success.length} success, ${results.failed.length} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.success.length} transfers`,
        processed: results.success.length,
        failed: results.failed.length,
        successIds: results.success,
        failedIds: results.failed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Auto-confirm error:', error)

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
