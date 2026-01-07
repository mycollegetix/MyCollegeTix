// supabase/functions/stripe-webhook/index.ts
// Handles Stripe webhook events for payments, Connect accounts, and transfers
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// @ts-ignore: Deno global
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // @ts-ignore: Deno global
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    // @ts-ignore: Deno global
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    // @ts-ignore: Deno global
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    // @ts-ignore: Deno global
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    // @ts-ignore: Deno global
    const stripeConnectWebhookSecret = Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET')

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      throw new Error('Missing required environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })

    // Get the raw body for signature verification
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    let event: Stripe.Event

    // Try to verify with available webhook secrets
    const secrets = [stripeWebhookSecret, stripeConnectWebhookSecret].filter(Boolean)

    if (secrets.length > 0 && signature) {
      let verified = false
      let lastError: any = null

      for (const secret of secrets) {
        try {
          // Use async version for Deno compatibility
          event = await stripe.webhooks.constructEventAsync(body, signature, secret!)
          verified = true
          break
        } catch (err) {
          lastError = err
          // Try next secret
        }
      }

      if (!verified) {
        console.error('Webhook signature verification failed with all secrets:', lastError)
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // Development mode - parse without verification
      event = JSON.parse(body)
      console.warn('⚠️ Webhook signature not verified (development mode)')
    }

    console.log(`📥 Received webhook: ${event.type}`)

    // Handle different event types
    switch (event.type) {
      // ============================================
      // PAYMENT EVENTS
      // ============================================
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log(`💳 Payment succeeded: ${paymentIntent.id}`)

        const orderId = paymentIntent.metadata.order_id
        const ticketId = paymentIntent.metadata.ticket_id

        // Update escrow payment status
        await supabase
          .from('escrow_payments')
          .update({
            status: 'payment_held',
            stripe_charge_id: typeof paymentIntent.latest_charge === 'string'
              ? paymentIntent.latest_charge
              : paymentIntent.latest_charge?.id || null,
          })
          .eq('stripe_payment_intent_id', paymentIntent.id)

        // Update order status
        await supabase
          .from('orders')
          .update({
            status: 'completed',
            escrow_status: 'payment_held',
          })
          .eq('id', orderId)

        // Update ticket status to sold
        await supabase
          .from('tickets')
          .update({
            status: 'sold',
            buyer_id: paymentIntent.metadata.buyer_id,
          })
          .eq('id', ticketId)

        // Update ticket transfer status
        await supabase
          .from('ticket_transfers')
          .update({ status: 'pending' }) // Now waiting for seller to transfer
          .eq('order_id', orderId)

        // TODO: Send notification to seller
        console.log(`✅ Order ${orderId} payment confirmed, awaiting ticket transfer`)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log(`❌ Payment failed: ${paymentIntent.id}`)

        const orderId = paymentIntent.metadata.order_id

        // Update escrow payment
        await supabase
          .from('escrow_payments')
          .update({ status: 'pending' }) // Keep as pending for retry
          .eq('stripe_payment_intent_id', paymentIntent.id)

        // Update order
        await supabase
          .from('orders')
          .update({
            status: 'pending',
            escrow_status: 'payment_pending',
            notes: `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
          })
          .eq('id', orderId)

        // TODO: Send notification to buyer
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        console.log(`💸 Charge refunded: ${charge.id}`)

        // Update escrow payment by charge ID
        const { data: escrowPayment } = await supabase
          .from('escrow_payments')
          .select('order_id')
          .eq('stripe_charge_id', charge.id)
          .single()

        if (escrowPayment) {
          await supabase
            .from('escrow_payments')
            .update({ status: 'refunded' })
            .eq('stripe_charge_id', charge.id)

          await supabase
            .from('orders')
            .update({ escrow_status: 'refunded', status: 'refunded' })
            .eq('id', escrowPayment.order_id)

          // Return ticket to available
          await supabase
            .from('tickets')
            .update({ status: 'available', buyer_id: null })
            .eq('id', (await supabase.from('orders').select('ticket_id').eq('id', escrowPayment.order_id).single()).data?.ticket_id)
        }
        break
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute
        console.log(`⚠️ Chargeback dispute created: ${dispute.id}`)

        // Find the escrow payment
        const { data: escrowPayment } = await supabase
          .from('escrow_payments')
          .select('id, order_id')
          .eq('stripe_charge_id', dispute.charge)
          .single()

        if (escrowPayment) {
          // Update statuses to disputed
          await supabase
            .from('escrow_payments')
            .update({ status: 'disputed' })
            .eq('id', escrowPayment.id)

          await supabase
            .from('orders')
            .update({ escrow_status: 'disputed' })
            .eq('id', escrowPayment.order_id)

          // Create internal dispute record
          const { data: order } = await supabase
            .from('orders')
            .select('buyer_id')
            .eq('id', escrowPayment.order_id)
            .single()

          if (order) {
            await supabase
              .from('escrow_disputes')
              .insert({
                order_id: escrowPayment.order_id,
                escrow_payment_id: escrowPayment.id,
                filed_by: order.buyer_id,
                filed_by_role: 'buyer',
                reason: `Stripe chargeback: ${dispute.reason}`,
                status: 'open',
              })
          }

          console.log(`🚨 Chargeback recorded for order ${escrowPayment.order_id}`)
        }
        break
      }

      // ============================================
      // CONNECT ACCOUNT EVENTS
      // ============================================
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        console.log(`👤 Account updated: ${account.id}`)

        const updates: any = {
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
        }

        // Determine account status
        if (account.charges_enabled && account.payouts_enabled) {
          updates.account_status = 'enabled'
          updates.onboarding_completed = true
        } else if (account.requirements?.disabled_reason) {
          updates.account_status = 'disabled'
        } else if (account.requirements?.currently_due?.length > 0) {
          updates.account_status = 'restricted'
        } else if (account.details_submitted) {
          updates.account_status = 'onboarding'
        }

        await supabase
          .from('stripe_accounts')
          .update(updates)
          .eq('stripe_account_id', account.id)

        // Update profile flag if onboarding completed
        if (updates.onboarding_completed) {
          const { data: stripeAccount } = await supabase
            .from('stripe_accounts')
            .select('user_id')
            .eq('stripe_account_id', account.id)
            .single()

          if (stripeAccount) {
            await supabase
              .from('profiles')
              .update({ stripe_onboarding_complete: true })
              .eq('id', stripeAccount.user_id)
          }
        }

        console.log(`✅ Updated Stripe account ${account.id} status`)
        break
      }

      case 'account.application.deauthorized': {
        const account = event.data.object as Stripe.Account
        console.log(`🔌 Account deauthorized: ${account.id}`)

        await supabase
          .from('stripe_accounts')
          .update({
            account_status: 'disabled',
            charges_enabled: false,
            payouts_enabled: false,
          })
          .eq('stripe_account_id', account.id)

        // Update profile flag
        const { data: stripeAccount } = await supabase
          .from('stripe_accounts')
          .select('user_id')
          .eq('stripe_account_id', account.id)
          .single()

        if (stripeAccount) {
          await supabase
            .from('profiles')
            .update({ stripe_onboarding_complete: false })
            .eq('id', stripeAccount.user_id)
        }
        break
      }

      // ============================================
      // TRANSFER EVENTS
      // ============================================
      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer
        console.log(`💰 Transfer created: ${transfer.id}`)

        await supabase
          .from('seller_transfers')
          .update({
            status: 'paid',
            transferred_at: new Date().toISOString(),
          })
          .eq('stripe_transfer_id', transfer.id)
        break
      }

      case 'transfer.failed': {
        const transfer = event.data.object as Stripe.Transfer
        console.log(`❌ Transfer failed: ${transfer.id}`)

        await supabase
          .from('seller_transfers')
          .update({
            status: 'failed',
            failure_reason: 'Transfer failed - see Stripe dashboard for details',
          })
          .eq('stripe_transfer_id', transfer.id)

        // TODO: Alert admin
        break
      }

      case 'transfer.reversed': {
        const transfer = event.data.object as Stripe.Transfer
        console.log(`↩️ Transfer reversed: ${transfer.id}`)

        await supabase
          .from('seller_transfers')
          .update({
            status: 'reversed',
            failure_reason: 'Transfer was reversed',
          })
          .eq('stripe_transfer_id', transfer.id)
        break
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
