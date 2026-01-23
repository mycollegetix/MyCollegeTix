// supabase/functions/stripe-webhook/index.ts
// Handles Stripe webhook events for payments, Connect accounts, and transfers
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0'
import {
  sendEmailToUser,
  paymentSuccessBuyerEmail,
  paymentSuccessSellerEmail,
} from '../_shared/email/index.ts'

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

    // SECURITY: Always require signature verification - no bypass allowed
    if (!signature) {
      console.error('❌ Missing stripe-signature header')
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (secrets.length === 0) {
      console.error('❌ No webhook secrets configured (STRIPE_WEBHOOK_SECRET or STRIPE_CONNECT_WEBHOOK_SECRET)')
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let verified = false
    let lastError: any = null

    for (const secret of secrets) {
      try {
        // Use async version for Deno compatibility
        event = await stripe.webhooks.constructEventAsync(body, signature, secret!)
        verified = true
        console.log('✅ Webhook signature verified')
        break
      } catch (err) {
        lastError = err
        // Try next secret
      }
    }

    if (!verified) {
      console.error('❌ Webhook signature verification failed with all secrets:', lastError)
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
        const sellerId = paymentIntent.metadata.seller_id
        const buyerId = paymentIntent.metadata.buyer_id

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
            buyer_id: buyerId,
          })
          .eq('id', ticketId)

        // Update ticket transfer status
        await supabase
          .from('ticket_transfers')
          .update({ status: 'pending' }) // Now waiting for seller to transfer
          .eq('order_id', orderId)

        // Get ticket and buyer info for notification
        const { data: ticket } = await supabase
          .from('tickets')
          .select('title')
          .eq('id', ticketId)
          .single()

        const { data: buyer } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', buyerId)
          .single()

        const ticketTitle = ticket?.title || 'your ticket'
        const buyerName = buyer?.full_name || buyer?.username || 'A buyer'

        // Get seller info for buyer notification
        const { data: seller } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', sellerId)
          .single()

        const sellerName = seller?.full_name || seller?.username || 'The seller'

        // Send notification to seller
        if (sellerId) {
          await supabase
            .from('notifications')
            .insert({
              user_id: sellerId,
              title: 'Ticket Sold!',
              message: `${buyerName} purchased "${ticketTitle}". Please transfer the ticket to complete the sale.`,
              type: 'sale',
              related_ticket_id: ticketId,
              related_order_id: orderId,
              read: false,
            })
          console.log(`📬 Notification sent to seller ${sellerId}`)
        }

        // Send notification to buyer
        if (buyerId) {
          await supabase
            .from('notifications')
            .insert({
              user_id: buyerId,
              title: 'Purchase Confirmed!',
              message: `Your purchase of "${ticketTitle}" is confirmed! ${sellerName} will transfer the ticket to you soon.`,
              type: 'purchase',
              related_ticket_id: ticketId,
              related_order_id: orderId,
              read: false,
            })
          console.log(`📬 Notification sent to buyer ${buyerId}`)
        }

        // Get additional ticket details for email
        const { data: ticketDetails } = await supabase
          .from('tickets')
          .select('event_date')
          .eq('id', ticketId)
          .single()

        const eventDate = ticketDetails?.event_date
          ? new Date(ticketDetails.event_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : 'TBD'

        const amountFormatted = `$${(paymentIntent.amount / 100).toFixed(2)}`

        // Send email to buyer
        if (buyerId) {
          try {
            const buyerEmailResult = await sendEmailToUser(
              supabase,
              buyerId,
              `Purchase Confirmed: ${ticketTitle}`,
              paymentSuccessBuyerEmail({
                ticketTitle,
                eventDate,
                sellerName,
                amount: amountFormatted,
                orderId,
              })
            )
            if (buyerEmailResult.success) {
              console.log(`📧 Email sent to buyer ${buyerId}`)
            } else {
              console.error(`❌ Failed to send email to buyer: ${buyerEmailResult.error}`)
            }
          } catch (emailError) {
            console.error('Buyer email error:', emailError)
          }
        }

        // Send email to seller
        if (sellerId) {
          try {
            const sellerEmailResult = await sendEmailToUser(
              supabase,
              sellerId,
              `Ticket Sold: ${ticketTitle}`,
              paymentSuccessSellerEmail({
                ticketTitle,
                eventDate,
                buyerName,
                amount: amountFormatted,
                orderId,
              })
            )
            if (sellerEmailResult.success) {
              console.log(`📧 Email sent to seller ${sellerId}`)
            } else {
              console.error(`❌ Failed to send email to seller: ${sellerEmailResult.error}`)
            }
          } catch (emailError) {
            console.error('Seller email error:', emailError)
          }
        }

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

  } catch (error: any) {
    console.error('Webhook error:', error)

    // Extract user-friendly error message from Stripe errors
    let errorMessage = 'Unknown error'
    if (error?.raw?.message) {
      errorMessage = error.raw.message
    } else if (error?.message) {
      errorMessage = error.message
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
