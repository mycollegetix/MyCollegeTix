// supabase/functions/stripe-redirect/index.ts
// Handles Stripe Connect redirect back to app via deep link

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const type = url.searchParams.get('type') // 'complete', 'refresh', or 'error'
  const errorMessage = url.searchParams.get('error')

  // Handle explicit error parameter
  const isError = type === 'error' || errorMessage
  const isComplete = type === 'complete' && !isError
  const isRefresh = type === 'refresh' || (!isComplete && !isError)

  const deepLink = isError
    ? 'mycollegetix://stripe/refresh'
    : isComplete
    ? 'mycollegetix://stripe/complete'
    : 'mycollegetix://stripe/refresh'

  const statusMessage = isError
    ? 'Setup Issue'
    : isComplete
    ? 'Payment setup complete!'
    : 'Please try again'

  // Return HTML page that tries deep link, then shows manual instructions
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MyCollegeTix - ${statusMessage}</title>
  <style>
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
    }
    .container {
      text-align: center;
      padding: 40px;
      max-width: 400px;
    }
    .icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: ${isError ? '#ef4444' : isComplete ? '#10b981' : '#f59e0b'};
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 40px;
    }
    h1 { font-size: 28px; margin-bottom: 16px; }
    p { font-size: 16px; opacity: 0.9; margin-bottom: 32px; line-height: 1.5; }
    .instruction {
      background: rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .instruction-text {
      font-size: 14px;
      opacity: 0.8;
    }
    .button {
      display: inline-block;
      background: #ffd700;
      color: #1e3a5f;
      padding: 16px 32px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      border: none;
      margin: 8px;
    }
    .button-secondary {
      background: rgba(255,255,255,0.2);
      color: white;
    }
    .redirecting {
      display: none;
    }
    .manual {
      display: block;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${isError ? '✕' : isComplete ? '✓' : '↻'}</div>
    <h1>${statusMessage}</h1>
    <p>${isError
      ? errorMessage || 'Something went wrong during setup. Please go back to the app and try again.'
      : isComplete
      ? 'Your Stripe account has been set up successfully. You can now receive payments when your tickets sell!'
      : 'Your onboarding session expired or needs to be refreshed. Please go back to the app and try again.'
    }</p>

    <div id="redirecting" class="redirecting">
      <p>Redirecting to app...</p>
    </div>

    <div id="manual" class="manual">
      <div class="instruction">
        <p class="instruction-text">
          ${isError
            ? 'There was an issue with your setup. Please close this page and try again from the app.'
            : isComplete
            ? 'You can close this page and return to the MyCollegeTix app.'
            : 'Close this page and tap "Continue Setup" in the app to try again.'
          }
        </p>
      </div>
      <a href="${deepLink}" class="button">Open App</a>
      <button class="button button-secondary" onclick="window.close()">Close Page</button>
    </div>
  </div>

  <script>
    // Try deep link redirect (works in dev/prod builds, not Expo Go)
    var deepLink = "${deepLink}";

    // Attempt redirect
    window.location.href = deepLink;

    // If we're still here after 2 seconds, show manual instructions
    setTimeout(function() {
      document.getElementById('manual').style.display = 'block';
    }, 500);
  </script>
</body>
</html>
  `

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
})
