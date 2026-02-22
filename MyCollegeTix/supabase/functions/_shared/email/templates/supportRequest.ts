// supabase/functions/_shared/email/templates/supportRequest.ts
// Email template for user-submitted support requests

import { baseTemplate, infoRow, infoTable } from './baseTemplate.ts'

export interface SupportRequestParams {
  subject: string
  message: string
  priority: 'low' | 'medium' | 'high'
  userEmail: string
  userName: string
  appVersion: string
  buildNumber: string
  platform: string
}

const priorityColors: Record<string, { bg: string; border: string; text: string; label: string }> = {
  low:    { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', label: 'LOW' },
  medium: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', label: 'MEDIUM' },
  high:   { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', label: 'HIGH' },
}

export function supportRequestEmail(params: SupportRequestParams): string {
  const {
    subject,
    message,
    priority,
    userEmail,
    userName,
    appVersion,
    buildNumber,
    platform,
  } = params

  const pc = priorityColors[priority] || priorityColors.medium

  const content = `
    <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.6;">
      A user has submitted a support request through the app.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0;">
      <tr>
        <td style="background-color: ${pc.bg}; border: 1px solid ${pc.border}; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Priority</p>
          <p style="margin: 0; font-size: 20px; font-weight: 700; color: ${pc.text};">${pc.label}</p>
        </td>
      </tr>
    </table>

    ${infoTable(
      infoRow('From', `${userName} &lt;${userEmail}&gt;`) +
      infoRow('Subject', subject) +
      infoRow('App Version', appVersion) +
      infoRow('Build', buildNumber) +
      infoRow('Platform', platform)
    )}

    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Message</p>
      <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${message}</p>
    </div>

    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; font-size: 14px; color: #1e40af;">
        <strong>Reply to:</strong> <a href="mailto:${userEmail}" style="color: #1e40af;">${userEmail}</a>
      </p>
    </div>
  `

  return baseTemplate({
    title: `Support Request: ${subject}`,
    preheader: `${priority.toUpperCase()} priority request from ${userName} — ${subject}`,
    content,
  })
}
