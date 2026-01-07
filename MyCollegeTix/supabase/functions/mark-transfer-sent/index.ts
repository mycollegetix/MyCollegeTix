// supabase/functions/mark-transfer-sent/index.ts
// Called when seller marks that they've transferred the ticket to the buyer
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface MarkTransferSentRequest {
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

    const { orderId } = await req.json() as MarkTransferSentRequest

    if (!orderId) {
      throw new Error('Order ID is required')
    }

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
      throw new Error(`Cannot mark transfer. Order status: ${order.escrow_status}`)
    }

    // Update ticket transfer status
    const { error: transferError } = await supabase
      .from('ticket_transfers')
      .update({
        status: 'sent',
        transfer_initiated_at: new Date().toISOString(),
      })
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
      throw new Error(`Failed to update order: ${orderUpdateError.message}`)
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
    console.log(`✅ Transfer marked as sent for order ${orderId}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transfer marked as sent! The buyer has been notified.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Mark transfer sent error:', error)

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
