// supabase/functions/mark-transfer-sent/index.ts
// Called when seller marks that they've transferred the ticket to the buyer
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmailToUser, transferSentEmail } from '../_shared/email/index.ts'
import { rateLimitMiddleware } from '../_shared/rateLimiter.ts'
import { MarkTransferSentSchema, validateInput } from '../_shared/validation/schemas.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface MarkTransferSentRequest {
  orderId: string
  proofUrl?: string  // Optional transfer proof image URL
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

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
      'mark-transfer-sent',
      'financial',
      user.id,
      corsHeaders
    )
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Validate input
    const rawInput = await req.json()
    const validation = validateInput(MarkTransferSentSchema, rawInput, corsHeaders)
    if (!validation.success) {
      return validation.response
    }
    const { orderId, proofUrl } = validation.data

    console.log(`📝 Mark transfer sent - Order: ${orderId}, Has proof: ${!!proofUrl}`)

    // Get order with related data
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error('Order not found')
    }

    // Verify seller owns this order
    if (order.seller_id !== user.id) {
      throw new Error('You can only mark transfers for your own sales')
    }

    // Check order status - should be payment_held
    if (order.escrow_status !== 'payment_held') {
      const statusMessages: Record<string, string> = {
        'completed': 'This order has already been completed.',
        'refunded': 'This order has been refunded.',
        'disputed': 'This order is currently under dispute.',
        'payment_pending': 'Payment has not been completed yet. Please wait for the buyer to complete payment.',
        'transfer_pending': 'You have already marked this transfer as sent.',
        'payout_pending': 'Payment is already being processed.',
      }
      throw new Error(statusMessages[order.escrow_status] || 'This order cannot be updated at this time.')
    }

    // Update ticket transfer status with optional proof URL
    const transferUpdateData: Record<string, any> = {
      status: 'sent',
      transfer_initiated_at: new Date().toISOString(),
    }

    if (proofUrl) {
      transferUpdateData.transfer_proof_url = proofUrl
      console.log(`📸 Transfer proof attached`)
    }

    const { error: transferError } = await supabase
      .from('ticket_transfers')
      .update(transferUpdateData)
      .eq('order_id', orderId)

    if (transferError) {
      console.error('Error updating ticket transfer:', transferError)
    }

    // Update order status to transfer_pending
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({ escrow_status: 'transfer_pending' })
      .eq('id', orderId)

    if (orderUpdateError) {
      console.error('Order update error:', orderUpdateError)
      throw new Error('Failed to update order. Please try again.')
    }

    // Get ticket and seller info for notification
    const { data: ticket } = await supabase
      .from('tickets')
      .select('title')
      .eq('id', order.ticket_id)
      .single()

    const { data: seller } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', user.id)
      .single()

    const ticketTitle = ticket?.title || 'your ticket'
    const sellerName = seller?.full_name || seller?.username || 'The seller'

    // Send notification to buyer
    await supabase
      .from('notifications')
      .insert({
        user_id: order.buyer_id,
        title: 'Ticket Transferred!',
        message: `${sellerName} has sent you the ticket for "${ticketTitle}". Please check your email or ticketing app, then confirm receipt in the app.`,
        type: 'purchase',
        related_ticket_id: order.ticket_id,
        related_order_id: orderId,
        read: false,
      })

    console.log(`📬 Notification sent to buyer ${order.buyer_id}`)

    // Get event date for email
    const { data: ticketDetails } = await supabase
      .from('tickets')
      .select('event_date')
      .eq('id', order.ticket_id)
      .single()

    const eventDate = ticketDetails?.event_date
      ? new Date(ticketDetails.event_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'TBD'

    // Send email to buyer
    try {
      const emailResult = await sendEmailToUser(
        supabase,
        order.buyer_id,
        `Ticket Transferred: ${ticketTitle}`,
        transferSentEmail({
          ticketTitle,
          eventDate,
          sellerName,
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

    console.log(`✅ Transfer marked as sent for order ${orderId}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transfer marked as sent! The buyer has been notified.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Mark transfer sent error:', error)

    // Extract user-friendly error message from Stripe errors
    let errorMessage = 'Unknown error'
    if (error?.raw?.message) {
      errorMessage = error.raw.message
    } else if (error?.message) {
      errorMessage = error.message
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
