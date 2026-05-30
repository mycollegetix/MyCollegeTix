-- Schedule the retry-pending-transfers edge function to run every 4 hours.
-- Retries Stripe Transfers stuck on `balance_insufficient` (and backfills legacy
-- stuck orders with escrow_status='payout_pending' that have no seller_transfers row).
--
-- Required Vault secrets (set via Supabase Dashboard -> Project Settings -> Vault):
--   project_url       - e.g. https://<project-ref>.supabase.co
--   service_role_key  - Supabase service role key (used to invoke the edge function)
--   cron_secret       - matches the CRON_SECRET env var on the edge function

-- pg_cron and pg_net are already enabled by 20260103164500_remote_schema.sql.

-- Unschedule any existing job with this name so this migration is idempotent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'retry-pending-transfers') THEN
    PERFORM cron.unschedule('retry-pending-transfers');
  END IF;
END;
$$;

SELECT cron.schedule(
  'retry-pending-transfers',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/retry-pending-transfers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' ||
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
      'x-cron-secret',
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $$
);
