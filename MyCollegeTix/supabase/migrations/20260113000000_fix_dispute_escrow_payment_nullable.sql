-- Migration: Fix permissions for escrow tables
-- Issue: Tables have RLS policies but missing base GRANT permissions

-- ============================================
-- 1. GRANT BASE PERMISSIONS TO authenticated ROLE
-- ============================================

-- escrow_payments: users need SELECT, admins/service need UPDATE
GRANT SELECT ON public.escrow_payments TO authenticated;
GRANT UPDATE ON public.escrow_payments TO authenticated;

-- escrow_disputes: users need SELECT, INSERT, UPDATE
GRANT SELECT, INSERT, UPDATE ON public.escrow_disputes TO authenticated;

-- ticket_transfers: users need SELECT, UPDATE
GRANT SELECT ON public.ticket_transfers TO authenticated;
GRANT UPDATE ON public.ticket_transfers TO authenticated;

-- seller_transfers: sellers need SELECT
GRANT SELECT ON public.seller_transfers TO authenticated;

-- stripe_accounts: users need SELECT, UPDATE
GRANT SELECT, UPDATE ON public.stripe_accounts TO authenticated;

-- ============================================
-- 2. MAKE escrow_payment_id NULLABLE
-- ============================================
-- Reason: RLS policy on escrow_payments uses subquery that can fail in some contexts
-- The order_id is the real link - escrow_payment_id is just a convenience reference

ALTER TABLE public.escrow_disputes
ALTER COLUMN escrow_payment_id DROP NOT NULL;

-- ============================================
-- 3. SIMPLER RLS POLICY FOR escrow_payments
-- ============================================

-- Helper function with SECURITY DEFINER to bypass RLS in subquery
CREATE OR REPLACE FUNCTION public.user_is_order_participant(order_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = order_uuid
    AND (buyer_id = auth.uid() OR seller_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the policy with a simpler check
DROP POLICY IF EXISTS "Users can view own escrow payments" ON public.escrow_payments;

CREATE POLICY "Users can view own escrow payments" ON public.escrow_payments
  FOR SELECT USING (
    public.user_is_order_participant(order_id)
  );

-- Also allow users to update escrow_payments they're part of (for status changes)
DROP POLICY IF EXISTS "Users can update own escrow payments" ON public.escrow_payments;

CREATE POLICY "Users can update own escrow payments" ON public.escrow_payments
  FOR UPDATE USING (
    public.user_is_order_participant(order_id)
  );
