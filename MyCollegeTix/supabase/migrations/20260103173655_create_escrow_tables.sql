-- Migration: Create Escrow System Tables
-- Description: Adds tables for Stripe Connect escrow payments, transfers, and disputes

-- ============================================
-- 1. ESCROW PAYMENTS TABLE
-- Tracks payment collection and escrow status
-- ============================================
CREATE TABLE public.escrow_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  stripe_payment_intent_id text NOT NULL UNIQUE,
  stripe_charge_id text,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'payment_held', 'payout_pending', 'paid_out', 'refunded', 'disputed')),
  buyer_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.escrow_payments ENABLE ROW LEVEL SECURITY;

-- Policies: Users can view their own payments, admins can view all
CREATE POLICY "Users can view own escrow payments" ON public.escrow_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = escrow_payments.order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  );

CREATE POLICY "Admins can view all escrow payments" ON public.escrow_payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- 2. STRIPE ACCOUNTS TABLE
-- Tracks seller Stripe Connect accounts
-- ============================================
CREATE TABLE public.stripe_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL UNIQUE,
  account_status text NOT NULL DEFAULT 'pending'
    CHECK (account_status IN ('pending', 'onboarding', 'enabled', 'restricted', 'disabled')),
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  details_submitted boolean NOT NULL DEFAULT false,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.stripe_accounts ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only view their own account
CREATE POLICY "Users can view own stripe account" ON public.stripe_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stripe account" ON public.stripe_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all stripe accounts" ON public.stripe_accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- 3. SELLER TRANSFERS TABLE
-- Tracks automated payouts to sellers
-- ============================================
CREATE TABLE public.seller_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_payment_id uuid NOT NULL REFERENCES public.escrow_payments(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_transfer_id text NOT NULL UNIQUE,
  stripe_account_id text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'reversed')),
  transferred_at timestamptz,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_transfers ENABLE ROW LEVEL SECURITY;

-- Policies: Sellers can view their own transfers
CREATE POLICY "Sellers can view own transfers" ON public.seller_transfers
  FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Admins can manage all transfers" ON public.seller_transfers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- 4. TICKET TRANSFERS TABLE
-- Tracks the actual ticket transfer process
-- ============================================
CREATE TABLE public.ticket_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'transfer_initiated', 'confirmed', 'auto_confirmed', 'disputed')),
  transfer_method text
    CHECK (transfer_method IS NULL OR transfer_method IN ('email_transfer', 'airdrop', 'screenshot', 'in_person', 'other')),
  transfer_proof_url text,
  transfer_initiated_at timestamptz,
  transfer_deadline timestamptz NOT NULL,
  confirmed_at timestamptz,
  confirmed_by text
    CHECK (confirmed_by IS NULL OR confirmed_by IN ('buyer', 'auto', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_transfers ENABLE ROW LEVEL SECURITY;

-- Policies: Buyer and seller can view their transfers
CREATE POLICY "Users can view own ticket transfers" ON public.ticket_transfers
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Sellers can update transfer status" ON public.ticket_transfers
  FOR UPDATE USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Buyers can confirm receipt" ON public.ticket_transfers
  FOR UPDATE USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Admins can manage all ticket transfers" ON public.ticket_transfers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- 5. ESCROW DISPUTES TABLE
-- Tracks disputes between buyers and sellers
-- ============================================
CREATE TABLE public.escrow_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  escrow_payment_id uuid NOT NULL REFERENCES public.escrow_payments(id) ON DELETE CASCADE,
  filed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  filed_by_role text NOT NULL
    CHECK (filed_by_role IN ('buyer', 'seller')),
  reason text NOT NULL,
  description text,
  evidence_urls text[],
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'under_review', 'resolved_refund', 'resolved_payout', 'escalated')),
  resolution text,
  resolved_by uuid REFERENCES public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.escrow_disputes ENABLE ROW LEVEL SECURITY;

-- Policies: Involved parties can view their disputes
CREATE POLICY "Users can view own disputes" ON public.escrow_disputes
  FOR SELECT USING (
    auth.uid() = filed_by OR
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = escrow_disputes.order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can create disputes" ON public.escrow_disputes
  FOR INSERT WITH CHECK (auth.uid() = filed_by);

CREATE POLICY "Users can update own disputes" ON public.escrow_disputes
  FOR UPDATE USING (auth.uid() = filed_by)
  WITH CHECK (auth.uid() = filed_by);

CREATE POLICY "Admins can manage all disputes" ON public.escrow_disputes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- 6. EXTEND EXISTING TABLES
-- ============================================

-- Add escrow columns to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS escrow_status text DEFAULT 'none'
    CHECK (escrow_status IN ('none', 'payment_pending', 'payment_held', 'transfer_pending',
                              'transfer_confirmed', 'payout_pending', 'completed', 'disputed', 'refunded'));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS transfer_deadline timestamptz;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS event_start_time timestamptz;

-- Add stripe onboarding flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean DEFAULT false;

-- ============================================
-- 7. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_escrow_payments_order ON public.escrow_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_payments_status ON public.escrow_payments(status);
CREATE INDEX IF NOT EXISTS idx_escrow_payments_stripe_pi ON public.escrow_payments(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_stripe_accounts_user ON public.stripe_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_stripe_id ON public.stripe_accounts(stripe_account_id);

CREATE INDEX IF NOT EXISTS idx_seller_transfers_escrow ON public.seller_transfers(escrow_payment_id);
CREATE INDEX IF NOT EXISTS idx_seller_transfers_seller ON public.seller_transfers(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_transfers_status ON public.seller_transfers(status);

CREATE INDEX IF NOT EXISTS idx_ticket_transfers_order ON public.ticket_transfers(order_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_deadline ON public.ticket_transfers(transfer_deadline)
  WHERE status IN ('pending', 'transfer_initiated');
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_status ON public.ticket_transfers(status);

CREATE INDEX IF NOT EXISTS idx_escrow_disputes_order ON public.escrow_disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_disputes_status ON public.escrow_disputes(status);
CREATE INDEX IF NOT EXISTS idx_escrow_disputes_filed_by ON public.escrow_disputes(filed_by);

CREATE INDEX IF NOT EXISTS idx_orders_escrow_status ON public.orders(escrow_status);

-- ============================================
-- 8. TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for each table with updated_at
CREATE TRIGGER set_escrow_payments_updated_at
  BEFORE UPDATE ON public.escrow_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_stripe_accounts_updated_at
  BEFORE UPDATE ON public.stripe_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_ticket_transfers_updated_at
  BEFORE UPDATE ON public.ticket_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
