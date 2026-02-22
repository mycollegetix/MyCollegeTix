// supabase/functions/_shared/email/templates/paymentSuccess.ts
// Email templates for successful payment notifications

import { baseTemplate, highlightBox, infoRow, infoTable, appLink } from './baseTemplate.ts'

export interface PaymentSuccessBuyerParams {
  ticketTitle: string
  eventDate: string
  sellerName: string
  amount: string
  orderId: string
}

export function paymentSuccessBuyerEmail(params: PaymentSuccessBuyerParams): string {
  const { ticketTitle, eventDate, sellerName, amount, orderId } = params

  const content = `
    <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.6;">
      Great news! Your purchase has been confirmed and your payment is securely held in escrow.
    </p>

    ${highlightBox('Amount Paid', amount, 'green')}

    ${infoTable(
      infoRow('Ticket', ticketTitle) +
      infoRow('Event Date', eventDate) +
      infoRow('Seller', sellerName) +
      infoRow('Order ID', orderId.slice(0, 8) + '...')
    )}

    <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>What happens next?</strong><br>
        The seller will transfer the ticket to your account. Once you receive it, confirm receipt in the app to release payment to the seller.
      </p>
    </div>

    <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
      Your funds are protected by our escrow system until you confirm receipt of the ticket.
    </p>
  `

  return baseTemplate({
    title: 'Purchase Confirmed!',
    preheader: `Your purchase of "${ticketTitle}" is confirmed`,
    content,
    ctaText: 'View Order',
    ctaUrl: appLink(`orders/${orderId}`),
  })
}

export interface PaymentSuccessSellerParams {
  ticketTitle: string
  eventDate: string
  buyerName: string
  amount: string
  orderId: string
}

export function paymentSuccessSellerEmail(params: PaymentSuccessSellerParams): string {
  const { ticketTitle, eventDate, buyerName, amount, orderId } = params

  const content = `
    <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.6;">
      Congratulations! Your ticket has been sold. The buyer's payment is now securely held in escrow.
    </p>

    ${highlightBox('Sale Amount', amount, 'green')}

    ${infoTable(
      infoRow('Ticket', ticketTitle) +
      infoRow('Event Date', eventDate) +
      infoRow('Buyer', buyerName) +
      infoRow('Order ID', orderId.slice(0, 8) + '...')
    )}

    <div style="background-color: #dbeafe; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; font-size: 14px; color: #1e40af;">
        <strong>Action Required:</strong><br>
        Please transfer the ticket to the buyer as soon as possible. Once they confirm receipt, your payment will be released.
      </p>
    </div>

    <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
      Tip: Upload proof of transfer to protect yourself in case of disputes.
    </p>
  `

  return baseTemplate({
    title: 'Ticket Sold!',
    preheader: `"${ticketTitle}" has been purchased`,
    content,
    ctaText: 'Transfer Ticket Now',
    ctaUrl: appLink(`orders/${orderId}`),
  })
}
