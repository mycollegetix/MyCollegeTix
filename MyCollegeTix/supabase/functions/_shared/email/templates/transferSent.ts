// supabase/functions/_shared/email/templates/transferSent.ts
// Email template for when seller transfers ticket to buyer

import { baseTemplate, infoRow, infoTable, appLink } from './baseTemplate.ts'

export interface TransferSentParams {
  ticketTitle: string
  eventDate: string
  sellerName: string
  orderId: string
}

export function transferSentEmail(params: TransferSentParams): string {
  const { ticketTitle, eventDate, sellerName, orderId } = params

  const content = `
    <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.6;">
      ${sellerName} has transferred your ticket! Check your email inbox or ticketing app for the ticket.
    </p>

    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 16px 0; text-align: center;">
      <p style="margin: 0 0 4px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Status</p>
      <p style="margin: 0; font-size: 20px; font-weight: 700; color: #166534;">Ticket Transferred</p>
    </div>

    ${infoTable(
      infoRow('Ticket', ticketTitle) +
      infoRow('Event Date', eventDate) +
      infoRow('Seller', sellerName)
    )}

    <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>Important:</strong><br>
        Once you receive the ticket, please confirm receipt in the app. This releases payment to the seller and completes the transaction.
      </p>
    </div>

    <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
      Didn't receive the ticket? Contact support or file a dispute if the seller hasn't transferred within 48 hours.
    </p>
  `

  return baseTemplate({
    title: 'Your Ticket Has Been Transferred!',
    preheader: `${sellerName} sent you "${ticketTitle}"`,
    content,
    ctaText: 'Confirm Receipt',
    ctaUrl: appLink(`orders/${orderId}`),
  })
}
