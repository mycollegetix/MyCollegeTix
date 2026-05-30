-- 20260530000000_seller_balances_view.sql
--
-- Adds a read-only `seller_balances` view that derives three numbers per seller
-- from the existing escrow / payout tables. No new tables, no triggers, no
-- changes to escrow logic — purely a transparency layer surfaced in the
-- profile/wallet UI.
--
-- amounts are in CENTS. The app divides by 100 for display.
--
-- Why a view (and not a stored balances table):
--   * `escrow_payments` and `seller_transfers` are already the source of truth
--     for money state. A stored balance would inevitably drift if any webhook
--     event was missed or replayed.
--   * Every edge case (refund, dispute, failed transfer) collapses to "exclude
--     these rows from the SUM" — no extra plumbing.
--   * Volume is tiny (hundreds of orders per seller, max) — aggregation cost is
--     microseconds. No need for materialization.
--
-- Definitions:
--   pending_cents          — funds collected from the buyer but not yet paid
--                            out to the seller's Stripe Connect account.
--                            Source: escrow_payments.status IN
--                            ('paid','payout_pending'). Refunded escrows are
--                            excluded (status='refunded' / 'paid_out').
--                            Disputed orders stay in pending — the money is
--                            real, just locked while review happens.
--
--   available_cents        — funds that have actually landed in the seller's
--                            Stripe Connect balance. Source:
--                            seller_transfers.status = 'paid'. (Stripe pays
--                            out from Connect to bank on its own schedule.)
--
--   lifetime_earnings_cents — same as available for now (every settled
--                             transfer counts forever). If we ever need to
--                             net out refund-after-payout, this becomes its
--                             own SUM with refund offsets.
--
-- Platform fees: MyCollegeTix absorbs Stripe processing fees. The full
-- ticket.price is transferred to the seller — no application_fee_amount on
-- the PaymentIntent, and process-payout transfers the full amount_cents.
-- So gross == seller-received; no fee math here.

CREATE OR REPLACE VIEW public.seller_balances AS
SELECT
  o.seller_id,
  COALESCE(SUM(CASE
    WHEN ep.status IN ('paid', 'payout_pending')
    THEN ep.amount_cents
    ELSE 0
  END), 0)::bigint AS pending_cents,
  COALESCE(SUM(CASE
    WHEN st.status = 'paid'
    THEN st.amount_cents
    ELSE 0
  END), 0)::bigint AS available_cents,
  COALESCE(SUM(CASE
    WHEN st.status = 'paid'
    THEN st.amount_cents
    ELSE 0
  END), 0)::bigint AS lifetime_earnings_cents
FROM public.orders o
LEFT JOIN public.escrow_payments ep ON ep.order_id = o.id
LEFT JOIN public.seller_transfers st ON st.escrow_payment_id = ep.id
GROUP BY o.seller_id;

-- security_invoker=true (Postgres 15+) makes the view honor the calling
-- user's RLS on the underlying tables. So a seller querying
-- `seller_balances` only ever sees rows for orders/escrow_payments/
-- seller_transfers their RLS already lets them see. No new policy needed.
ALTER VIEW public.seller_balances SET (security_invoker = true);

-- Grant the view to authenticated users (RLS still applies through
-- security_invoker).
GRANT SELECT ON public.seller_balances TO authenticated;

COMMENT ON VIEW public.seller_balances IS
  'Per-seller aggregates of available, pending, and lifetime earnings in cents. Derived from escrow_payments and seller_transfers. Read-only.';
