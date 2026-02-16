// supabase/functions/_shared/email/templates/baseTemplate.ts
// Base HTML layout for all transactional emails

export interface BaseTemplateParams {
  title: string
  preheader?: string
  content: string
  ctaText?: string
  ctaUrl?: string
}

export function baseTemplate(params: BaseTemplateParams): string {
  const { title, preheader, content, ctaText, ctaUrl } = params

  const ctaButton = ctaText && ctaUrl ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px auto;">
      <tr>
        <td style="border-radius: 8px; background: #2563eb;">
          <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
            ${ctaText}
          </a>
        </td>
      </tr>
    </table>
  ` : ''

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 40px; border-radius: 12px 12px 0 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">MyCollegeTix</h1>
                    <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.85);">Safe & Secure Ticket Marketplace</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <h2 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #111827; line-height: 1.3;">${title}</h2>

              ${content}

              ${ctaButton}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; text-align: center;">
              <p style="margin: 0 0 12px; font-size: 14px; color: #6b7280;">
                Questions? Contact us at <a href="mailto:support@mycollegetix.com" style="color: #2563eb; text-decoration: none;">support@mycollegetix.com</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                MyCollegeTix, Inc.<br>
                You're receiving this email because you have an account with MyCollegeTix.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

// Helper to build a web URL that redirects to the app via deep link.
// Email clients block custom URL schemes (mycollegetix://), so we route
// through open-app.html which does the redirect client-side.
export function appLink(deepLinkPath: string): string {
  return `https://www.mycollegetix.com/open-app.html?path=${encodeURIComponent(deepLinkPath)}`
}

// Helper function to create a highlight box (for amounts, status, etc.)
export function highlightBox(label: string, value: string, color: 'blue' | 'green' | 'amber' = 'blue'): string {
  const colors = {
    blue: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
    green: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
    amber: { bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
  }
  const c = colors[color]

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0;">
      <tr>
        <td style="background-color: ${c.bg}; border: 1px solid ${c.border}; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">${label}</p>
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${c.text};">${value}</p>
        </td>
      </tr>
    </table>
  `
}

// Helper for info rows
export function infoRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
        <span style="color: #6b7280; font-size: 14px;">${label}:</span>
      </td>
      <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
        <span style="color: #111827; font-size: 14px; font-weight: 500;">${value}</span>
      </td>
    </tr>
  `
}

// Helper for info table wrapper
export function infoTable(rows: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0;">
      ${rows}
    </table>
  `
}
