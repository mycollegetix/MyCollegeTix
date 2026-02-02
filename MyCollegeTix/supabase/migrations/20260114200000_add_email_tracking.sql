-- Add email tracking columns to notifications table
-- This allows us to track which notifications have been sent via email

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_message_id TEXT;

-- Create index for querying unsent emails (useful for retry logic)
CREATE INDEX IF NOT EXISTS idx_notifications_email_not_sent
ON notifications (email_sent)
WHERE email_sent = FALSE;

COMMENT ON COLUMN notifications.email_sent IS 'Whether an email notification was sent';
COMMENT ON COLUMN notifications.email_sent_at IS 'Timestamp when the email was sent';
COMMENT ON COLUMN notifications.email_message_id IS 'Resend message ID for tracking';
