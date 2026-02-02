// supabase/functions/_shared/errorPages.ts
// Shared HTML error page templates for user-friendly error displays

export interface ErrorPageOptions {
  title?: string;
  message: string;
  suggestion?: string;
  showBackToApp?: boolean;
  isWarning?: boolean;
}

/**
 * Generate a user-friendly HTML error page
 * Use this when an edge function might be accessed from a browser/WebView
 */
export function generateErrorPage(options: ErrorPageOptions): string {
  const {
    title = 'Something Went Wrong',
    message,
    suggestion = 'Please go back to the app and try again.',
    showBackToApp = true,
    isWarning = false,
  } = options;

  const iconColor = isWarning ? '#f59e0b' : '#ef4444';
  const icon = isWarning ? '⚠' : '✕';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MyCollegeTix - ${title}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      color: white;
      padding: 20px;
    }
    .container {
      text-align: center;
      padding: 40px;
      max-width: 400px;
      width: 100%;
    }
    .icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: ${iconColor};
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 40px;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 16px;
      font-weight: 700;
    }
    .message {
      font-size: 16px;
      opacity: 0.9;
      margin-bottom: 12px;
      line-height: 1.5;
    }
    .suggestion {
      font-size: 14px;
      opacity: 0.7;
      margin-bottom: 32px;
      line-height: 1.4;
    }
    .button-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
    }
    .button {
      display: inline-block;
      background: #ffd700;
      color: #1e3a5f;
      padding: 14px 28px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      border: none;
      min-width: 160px;
    }
    .button-secondary {
      background: rgba(255,255,255,0.2);
      color: white;
    }
    .logo {
      margin-bottom: 20px;
      font-size: 32px;
      font-weight: 800;
      color: #ffd700;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">MyCollegeTix</div>
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p class="message">${message}</p>
    <p class="suggestion">${suggestion}</p>
    ${showBackToApp ? `
    <div class="button-container">
      <a href="mycollegetix://stripe/refresh" class="button">Open App</a>
      <button class="button button-secondary" onclick="window.close()">Close Page</button>
    </div>
    ` : ''}
  </div>
</body>
</html>
  `.trim();
}

/**
 * Create an HTML error response
 */
export function htmlErrorResponse(
  options: ErrorPageOptions,
  status: number = 400
): Response {
  return new Response(generateErrorPage(options), {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

/**
 * Check if request is likely from a browser/WebView (not API call)
 */
export function isLikelyBrowserRequest(req: Request): boolean {
  const acceptHeader = req.headers.get('Accept') || '';
  const userAgent = req.headers.get('User-Agent') || '';

  // If Accept header prefers HTML, it's likely a browser
  if (acceptHeader.includes('text/html') && !acceptHeader.includes('application/json')) {
    return true;
  }

  // Check for browser user agents
  const browserKeywords = ['Mozilla', 'Safari', 'Chrome', 'Edge', 'WebKit'];
  if (browserKeywords.some(keyword => userAgent.includes(keyword))) {
    return true;
  }

  return false;
}

/**
 * Standard error messages for common scenarios
 */
export const ErrorMessages = {
  UNAUTHORIZED: {
    title: 'Session Expired',
    message: 'Your session has expired or is invalid.',
    suggestion: 'Please go back to the app and sign in again.',
  },
  MISSING_AUTH: {
    title: 'Authentication Required',
    message: 'This action requires you to be signed in.',
    suggestion: 'Please open the MyCollegeTix app and try again.',
  },
  STRIPE_NOT_SETUP: {
    title: 'Payment Setup Required',
    message: 'The seller has not completed their payment setup.',
    suggestion: 'Please contact the seller or try a different listing.',
    isWarning: true,
  },
  STRIPE_INCOMPLETE: {
    title: 'Payment Setup Incomplete',
    message: 'Your payment account setup is not complete.',
    suggestion: 'Please go back to the app and finish setting up your payment account.',
    isWarning: true,
  },
  SERVER_ERROR: {
    title: 'Server Error',
    message: 'Something went wrong on our end.',
    suggestion: 'Please try again in a few moments. If the problem persists, contact support.',
  },
  RATE_LIMITED: {
    title: 'Too Many Requests',
    message: 'You\'ve made too many requests recently.',
    suggestion: 'Please wait a moment and try again.',
    isWarning: true,
  },
};
