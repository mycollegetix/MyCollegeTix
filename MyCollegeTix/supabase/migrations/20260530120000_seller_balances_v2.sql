-- 20260530120000_seller_balances_v2.sql
--
-- Revision of seller_balances view from 20260530000000.
--
-- Changes:
--   1. Drop `available_cents` — in practice always $0 (Stripe auto-deposits
--      from Connect to bank within ~2 business days, so the "in Connect
--      awaiting deposit" state is transient and not useful to surface).
--   2. Redefine `lifetime_earnings_cents` to mean "all sales the seller has
--      ever closed" — pending + transferred. Previously it only counted
--      paid-out transfers, which showed $0 for sellers who had completed
--      sales but no payouts had run yet (misleading).
--   3. Defensively pre-aggregate seller_transfers so multiple transfer
--      rows per escrow_payment (e.g., retry of a failed transfer) can't
--      double-count.
--
-- Definitions:
--   pending_cents          — escrow_payments in 'paid' or 'payout_pending'
--                            with no successful seller_transfer yet.
--                            Money the platform has collected but hasn't
--                            transferred to the seller.
--
--   lifetime_earnings_cents — every successful sale ever. Sum of
--                             escrow_payments where status is paid,
--                             payout_pending, or paid_out. Refunds excluded.

-- Postgres won't let CREATE OR REPLACE drop columns from an existing view,
-- and v1 had an `available_cents` column we're removing. Drop + recreate.
DROP VIEW IF EXISTS public.seller_balances;

CREATE VIEW public.seller_balances AS
WITH paid_transfers AS (
  SELECT
    escrow_payment_id,
    SUM(amount_cents)::bigint AS paid_cents
  FROM public.seller_transfers
  WHERE status = 'paid'
  GROUP BY escrow_payment_id
)
SELECT
  o.seller_id,
  COALESCE(SUM(CASE
    WHEN ep.status IN ('paid', 'payout_pending')
     AND COALESCE(pt.paid_cents, 0) = 0
    THEN ep.amount_cents
    ELSE 0
  END), 0)::bigint AS pending_cents,
  COALESCE(SUM(CASE
    WHEN ep.status IN ('paid', 'payout_pending', 'paid_out')
    THEN ep.amount_cents
    ELSE 0
  END), 0)::bigint AS lifetime_earnings_cents
FROM public.orders o
LEFT JOIN public.escrow_payments ep ON ep.order_id = o.id
LEFT JOIN paid_transfers pt          ON pt.escrow_payment_id = ep.id
GROUP BY o.seller_id;

ALTER VIEW public.seller_balances SET (security_invoker = true);
GRANT SELECT ON public.seller_balances TO authenticated;

COMMENT ON VIEW public.seller_balances IS
  'Per-seller aggregates of pending and lifetime earnings in cents. Derived from escrow_payments + seller_transfers. Read-only.';
