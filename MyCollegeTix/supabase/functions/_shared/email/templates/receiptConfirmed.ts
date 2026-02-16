// supabase/functions/_shared/email/templates/receiptConfirmed.ts
// Email template for when buyer confirms receipt and payment is released to seller

import { baseTemplate, highlightBox, infoRow, infoTable, appLink } from './baseTemplate.ts'

export interface ReceiptConfirmedParams {
  ticketTitle: string
  buyerName: string
  amount: string
  orderId: string
}

export function receiptConfirmedEmail(params: ReceiptConfirmedParams): string {
  const { ticketTitle, buyerName, amount, orderId } = params

  const content = `
    <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.6;">
      Great news! ${buyerName} has confirmed receipt of the ticket. Your payment has been released!
    </p>

    ${highlightBox('Payment Released', amount, 'green')}

    ${infoTable(
      infoRow('Ticket', ticketTitle) +
      infoRow('Buyer', buyerName) +
      infoRow('Order ID', orderId.slice(0, 8) + '...')
    )}

    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; font-size: 14px; color: #166534;">
        <strong>Payment transferred!</strong><br>
        The funds have been sent to your connected Stripe account. Please allow 1-2 business days for the transfer to appear in your bank account.
      </p>
    </div>

    <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
      Thank you for selling on MyCollegeTix! Ready to list more tickets?
    </p>
  `

  return baseTemplate({
    title: 'Payment Released!',
    preheader: `${amount} has been transferred to your account`,
    content,
    ctaText: 'View Earnings',
    ctaUrl: appLink('profile/earnings'),
  })
}
