// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ALLOWED_DOMAINS = [
  'msu.edu',
  'umich.edu',
]

const ALLOWED_TEST_EMAILS = [
  'aditi.dron@gmail.com',
  'agarwal.vijay@gmail.com',
  'cotejosephr@gmail.com',
  'dinguspickle07@gmail.com',
  'mycollegetix+2@gmail.com',
  'mycollegetix@gmail.com',
  'nikhilmamtani@gmail.com',
  'nikhilmamtani6@gmail.com',
  'riyamathur2014@gmail.com',
  'rohanm.0304@gmail.com',
  'smithhhannee@gmail.com',
  'vivekapatel2005@gmail.com',
]

function isEmailAllowed(email: string): boolean {
  if (!email) {
    return false
  }

  const emailLower = email.toLowerCase().trim()
  const domain = emailLower.split('@')[1]

  if (!domain) {
    return false
  }

  // Special case: Allow specific Gmail test accounts
  if (domain === 'gmail.com') {
    return ALLOWED_TEST_EMAILS.includes(emailLower)
  }

  // Check if domain is in allowed college domains
  return ALLOWED_DOMAINS.includes(domain)
}

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log('🔐 Validate signup webhook triggered:', payload)

    const email = payload.record?.email || payload.user?.email

    if (!email) {
      console.error('❌ No email provided in payload')
      return new Response(
        JSON.stringify({ error: 'No email provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('📧 Validating email:', email)

    if (!isEmailAllowed(email)) {
      console.error('❌ Email not allowed:', email)
      const domain = email.toLowerCase().split('@')[1]

      let message = 'Access is currently limited to students from Michigan State University and University of Michigan.'
      if (domain === 'gmail.com') {
        message = 'Access is currently limited to authorized test accounts. Please use your college email (.edu) to sign up.'
      }

      return new Response(
        JSON.stringify({
          error: {
            message: message,
            status: 403
          }
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Email validation passed:', email)

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('💥 Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
