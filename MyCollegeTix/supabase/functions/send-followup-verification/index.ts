// supabase/functions/send-followup-verification/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface FollowupEmailResponse {
  success: boolean
  message: string
  emailsSent: number
  errors: string[]
}

// @ts-ignore: Deno global
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Method not allowed',
        emailsSent: 0,
        errors: []
      }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables')
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Server configuration error',
          emailsSent: 0,
          errors: ['Missing environment variables']
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Find users who:
    // 1. Have confirmation_sent_at (email was sent)
    // 2. Don't have email_confirmed_at (not verified)
    // 3. Created 3+ days ago
    // 4. Haven't received a follow-up email in the last 7 days (to avoid spam)
    
    console.log('🔍 Looking for unverified users from 3+ days ago...')
    
    // Get current time minus 1 day (changed from 3 to catch more users for testing)
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 1)
    
    console.log('📅 Looking for users created before:', threeDaysAgo.toISOString())
    
    // Get time minus 7 days for follow-up tracking
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    // Search through paginated user list to find unverified users
    let allUnverifiedUsers: any[] = []
    let page = 1
    const perPage = 100
    
    while (page <= 20) { // Limit to prevent infinite loops
      const { data: usersList, error: getUserError } = await supabaseAdmin.auth.admin.listUsers({
        page: page,
        perPage: perPage
      })
      
      if (getUserError) {
        console.error(`Error on page ${page}:`, getUserError.message)
        break
      }
      
      if (!usersList?.users || usersList.users.length === 0) {
        break
      }
      
      // Filter for unverified users from 1+ days ago
      const unverifiedFromThisPage = usersList.users.filter(user => {
        const userCreatedAt = new Date(user.created_at)
        const hasEmail = !!user.email
        const confirmationSent = !!user.confirmation_sent_at
        const notConfirmed = !user.email_confirmed_at
        const oldEnough = userCreatedAt <= threeDaysAgo
        
        // Log every user for debugging
        console.log(`👤 ${user.email}: hasEmail=${hasEmail}, confirmationSent=${confirmationSent}, notConfirmed=${notConfirmed}, oldEnough=${oldEnough}, created=${user.created_at}`)
        
        const isUnverified = hasEmail && confirmationSent && notConfirmed && oldEnough
        
        if (isUnverified) {
          console.log(`✅ MATCH: Will send follow-up to ${user.email}`)
        }
        
        return isUnverified
      })
      
      allUnverifiedUsers.push(...unverifiedFromThisPage)
      
      // If this page had fewer users than expected, we've reached the end
      if (usersList.users.length < perPage) {
        break
      }
      
      page++
    }
    
    console.log(`📧 Found ${allUnverifiedUsers.length} unverified users from 1+ days ago`)
    console.log(`🔍 Total users checked across all pages: ${page * perPage}`)
    
    // Debug: Show some user examples
    if (allUnverifiedUsers.length === 0) {
      console.log('❓ No unverified users found. Checking some recent users for debugging...')
      
      // Get first page of recent users to debug
      const { data: debugUsers } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 5 })
      debugUsers?.users?.forEach(user => {
        const created = new Date(user.created_at)
        console.log(`👤 User ${user.email}: created=${created.toISOString()}, confirmation_sent=${user.confirmation_sent_at ? 'YES' : 'NO'}, confirmed=${user.email_confirmed_at ? 'YES' : 'NO'}`)
      })
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No unverified users found from 1+ days ago (check logs for debug info)',
          emailsSent: 0,
          errors: []
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    
    // Check which users haven't received a follow-up recently by looking at a custom table
    // (We'll create this table to track follow-up emails sent)
    const { data: recentFollowups, error: followupCheckError } = await supabaseAdmin
      .from('email_followups')
      .select('user_id, sent_at')
      .gte('sent_at', sevenDaysAgo.toISOString())
    
    if (followupCheckError && !followupCheckError.message.includes('does not exist')) {
      console.error('Error checking recent follow-ups:', followupCheckError.message)
    }
    
    // Filter out users who got a follow-up in the last 7 days
    const recentFollowupUserIds = new Set(recentFollowups?.map(f => f.user_id) || [])
    const usersToEmail = allUnverifiedUsers.filter(user => !recentFollowupUserIds.has(user.id))
    
    console.log(`📮 Sending follow-up emails to ${usersToEmail.length} users`)
    
    let emailsSent = 0
    const errors: string[] = []
    
    // Send follow-up emails
    for (const user of usersToEmail) {
      try {
        console.log(`📧 Sending follow-up to ${user.email}`)
        
        // Get the follow-up email template from Supabase Storage
        const { data: templateFile, error: templateError } = await supabaseAdmin.storage
          .from('email-templates')
          .download('followup-verification-email.html')
        
        if (templateError) {
          console.error(`❌ Failed to get email template:`, templateError.message)
          errors.push(`Template error: ${templateError.message}`)
          continue
        }
        
        const templateHtml = await templateFile.text()
        
        // Create confirmation URL for this user
        const confirmationUrl = `${supabaseUrl}/auth/v1/verify?token=${user.confirmation_token}&type=signup`
        
        // Replace template variables
        const emailHtml = templateHtml.replace(/\{\{ \.ConfirmationURL \}\}/g, confirmationUrl)
        
        // Send custom HTML email using the resend method with template
        const { error: emailError } = await supabaseAdmin.auth.resend({
          type: 'signup',
          email: user.email,
          options: {
            emailRedirectTo: 'https://www.mycollegetix.com/open-app.html'
          }
        })
        
        if (emailError) {
          console.error(`❌ Failed to send follow-up to ${user.email}:`, emailError.message)
          errors.push(`${user.email}: ${emailError.message}`)
        } else {
          emailsSent++
          
          // Record that we sent a follow-up (create table if it doesn't exist)
          try {
            await supabaseAdmin
              .from('email_followups')
              .upsert({
                user_id: user.id,
                email: user.email,
                sent_at: new Date().toISOString(),
                followup_type: 'unverified_3day'
              })
          } catch (trackingError) {
            console.log('Follow-up tracking table may not exist yet:', trackingError)
          }
          
          console.log(`✅ Follow-up sent to ${user.email}`)
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`💥 Unexpected error sending to ${user.email}:`, error)
        errors.push(`${user.email}: Unexpected error`)
      }
    }
    
    const response: FollowupEmailResponse = {
      success: true,
      message: `Follow-up emails sent to ${emailsSent} users`,
      emailsSent,
      errors
    }
    
    console.log('📊 Final results:', response)
    
    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('💥 Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'An unexpected error occurred',
        emailsSent: 0,
        errors: [error.message]
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})