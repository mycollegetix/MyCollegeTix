// supabase/functions/_shared/email/templates/refundProcessed.ts
// Email template for when a refund is processed for a buyer

import { baseTemplate, highlightBox, infoRow, infoTable } from './baseTemplate.ts'

export interface RefundProcessedParams {
  ticketTitle: string
  amount: string
  reason: string
  orderId: string
}

export function refundProcessedEmail(params: RefundProcessedParams): string {
  const { ticketTitle, amount, reason, orderId } = params

  const content = `
    <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.6;">
      Your refund has been processed. The funds will be returned to your original payment method.
    </p>

    ${highlightBox('Refund Amount', amount, 'blue')}

    ${infoTable(
      infoRow('Ticket', ticketTitle) +
      infoRow('Reason', reason) +
      infoRow('Order ID', orderId.slice(0, 8) + '...')
    )}

    <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; font-size: 14px; color: #4b5563;">
        <strong>Processing Time:</strong><br>
        Refunds typically appear on your statement within 5-10 business days, depending on your bank or card issuer.
      </p>
    </div>

    <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
      We're sorry this transaction didn't work out. If you have questions, please contact our support team.
    </p>
  `

  return baseTemplate({
    title: 'Refund Processed',
    preheader: `Your ${amount} refund is on its way`,
    content,
    ctaText: 'Browse Tickets',
    ctaUrl: 'mycollegetix://browse',
  })
}
