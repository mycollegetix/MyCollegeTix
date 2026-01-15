// supabase/functions/_shared/email/sendTransactionalEmail.ts
// High-level helper to send transactional emails and track delivery
// @ts-nocheck

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail } from './emailClient.ts'

export interface TransactionalEmailParams {
  supabase: SupabaseClient
  userId: string
  subject: string
  html: string
  notificationId?: string // Optional: update notification record with email status
}

export interface TransactionalEmailResult {
  success: boolean
  messageId?: string
  error?: string
  userEmail?: string
}

/**
 * Send a transactional email to a user
 * - Fetches the user's email from profiles table
 * - Sends the email via AWS SES
 * - Optionally updates the notification record with email tracking info
 */
export async function sendTransactionalEmail(
  params: TransactionalEmailParams
): Promise<TransactionalEmailResult> {
  const { supabase, userId, subject, html, notificationId } = params

  try {
    // Fetch user's email from auth.users (via profiles join or direct)
    // First try profiles table for email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    let userEmail = profile?.email

    // If no email in profiles, try auth.users via service role
    if (!userEmail) {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
      if (authError) {
        console.error('Failed to fetch user auth data:', authError)
        return { success: false, error: 'Could not find user email' }
      }
      userEmail = authUser?.user?.email
    }

    if (!userEmail) {
      console.error(`No email found for user ${userId}`)
      return { success: false, error: 'User has no email address' }
    }

    // Send the email
    const result = await sendEmail({
      to: userEmail,
      subject,
      html,
    })

    // Update notification record if provided
    if (notificationId && result.success) {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
          email_message_id: result.messageId,
        })
        .eq('id', notificationId)

      if (updateError) {
        console.error('Failed to update notification with email status:', updateError)
      }
    }

    return {
      ...result,
      userEmail,
    }
  } catch (error) {
    console.error('sendTransactionalEmail error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Helper to send email without notification tracking
 * Used when creating the notification and email simultaneously
 */
export async function sendEmailToUser(
  supabase: SupabaseClient,
  userId: string,
  subject: string,
  html: string
): Promise<TransactionalEmailResult> {
  return sendTransactionalEmail({
    supabase,
    userId,
    subject,
    html,
  })
}
