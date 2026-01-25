// supabase/functions/_shared/email/templates/disputeOpened.ts
// Email template for when a dispute is opened - sent to team members

import { baseTemplate, highlightBox, infoRow, infoTable } from './baseTemplate.ts'

export interface DisputeOpenedParams {
  disputeId: string
  orderId: string
  ticketTitle: string
  reason: string
  description: string | null
  filedBy: string
  filedByRole: 'buyer' | 'seller'
  amount: string
  buyerName: string
  sellerName: string
}

export function disputeOpenedEmail(params: DisputeOpenedParams): string {
  const {
    disputeId,
    orderId,
    ticketTitle,
    reason,
    description,
    filedBy,
    filedByRole,
    amount,
    buyerName,
    sellerName,
  } = params

  const reasonLabels: Record<string, string> = {
    ticket_not_received: 'Ticket not received',
    ticket_invalid: 'Ticket is invalid or doesn\'t work',
    wrong_ticket: 'Received wrong ticket',
    duplicate_ticket: 'Ticket was already used',
    seller_unresponsive: 'Seller not responding',
    buyer_unresponsive: 'Buyer not responding',
    payment_issue: 'Payment issue',
    other: 'Other',
  }

  const reasonDisplay = reasonLabels[reason] || reason

  const content = `
    <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.6;">
      A new dispute has been filed and requires your attention.
    </p>

    ${highlightBox('Dispute Status', 'OPEN', 'amber')}

    ${infoTable(
      infoRow('Dispute ID', disputeId.slice(0, 8) + '...') +
      infoRow('Order ID', orderId.slice(0, 8) + '...') +
      infoRow('Ticket', ticketTitle) +
      infoRow('Amount', amount) +
      infoRow('Filed By', `${filedBy} (${filedByRole})`) +
      infoRow('Buyer', buyerName) +
      infoRow('Seller', sellerName) +
      infoRow('Reason', reasonDisplay)
    )}

    ${description ? `
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Description</p>
      <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">
        ${description}
      </p>
    </div>
    ` : ''}

    <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>Action Required:</strong> Please review this dispute in the admin panel and take appropriate action.
      </p>
    </div>
  `

  return baseTemplate({
    title: 'New Dispute Filed',
    preheader: `Dispute filed for "${ticketTitle}" - ${reasonDisplay}`,
    content,
    ctaText: 'View in Admin Panel',
    ctaUrl: 'mycollegetix://admin/disputes',
  })
}
