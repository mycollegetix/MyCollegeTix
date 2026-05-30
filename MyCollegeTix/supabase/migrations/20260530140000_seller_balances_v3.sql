-- 20260530140000_seller_balances_v3.sql
--
-- Revision of seller_balances view from v2 (20260530120000).
--
-- Change in this revision: redefine `lifetime_earnings_cents` to mean
-- "total amount actually deposited to the seller, ever" (paid_out only),
-- making it orthogonal to pending_cents.
--
-- Why: in v2 we defined lifetime as "all sales ever, including pending."
-- That made the two cards confusingly equal whenever no payouts had ever
-- completed (which is the user's current data state due to the stuck-money
-- bug being worked separately). Orthogonal semantics make each card mean
-- something distinct:
--   pending  + lifetime = total gross sales ever (if you want it)
--   lifetime alone      = money actually deposited via Stripe Transfer
--
-- Column shape unchanged from v2 — `CREATE OR REPLACE VIEW` is safe here.

CREATE OR REPLACE VIEW public.seller_balances AS
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
    WHEN ep.status = 'paid_out'
    THEN ep.amount_cents
    ELSE 0
  END), 0)::bigint AS lifetime_earnings_cents
FROM public.orders o
LEFT JOIN public.escrow_payments ep ON ep.order_id = o.id
LEFT JOIN paid_transfers pt          ON pt.escrow_payment_id = ep.id
GROUP BY o.seller_id;

-- security_invoker / grants carry over from v2; no-op to re-set defensively.
ALTER VIEW public.seller_balances SET (security_invoker = true);
GRANT SELECT ON public.seller_balances TO authenticated;

COMMENT ON VIEW public.seller_balances IS
  'Per-seller pending (in-escrow) and lifetime (paid-out) earnings in cents. Pending + Lifetime = total gross sales. Read-only.';
