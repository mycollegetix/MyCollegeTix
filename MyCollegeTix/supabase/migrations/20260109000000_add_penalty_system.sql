-- Migration: Add Penalty System for Disputes
-- Description: Adds tables for user violations and penalties, extends profiles for account status

-- ============================================
-- 1. USER VIOLATIONS TABLE
-- Tracks violations issued to users from disputes
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dispute_id uuid REFERENCES public.escrow_disputes(id) ON DELETE SET NULL,
  violation_type text NOT NULL
    CHECK (violation_type IN ('non_delivery', 'non_confirmation', 'invalid_ticket', 'fraud', 'other')),
  severity text NOT NULL DEFAULT 'minor'
    CHECK (severity IN ('minor', 'moderate', 'severe')),
  description text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_violations ENABLE ROW LEVEL SECURITY;

-- Policies: Users can view their own violations, admins can manage all
CREATE POLICY "Users can view own violations" ON public.user_violations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all violations" ON public.user_violations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- 2. USER PENALTIES TABLE
-- Tracks penalties applied to users (warnings, deductions, suspensions, bans)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_penalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  violation_id uuid REFERENCES public.user_violations(id) ON DELETE SET NULL,
  penalty_type text NOT NULL
    CHECK (penalty_type IN ('warning', 'payout_deduction', 'temporary_suspension', 'permanent_ban')),
  amount_cents integer,
  suspension_until timestamptz,
  reason text NOT NULL,
  applied_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_penalties ENABLE ROW LEVEL SECURITY;

-- Policies: Users can view their own penalties, admins can manage all
CREATE POLICY "Users can view own penalties" ON public.user_penalties
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all penalties" ON public.user_penalties
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- 3. EXTEND PROFILES TABLE
-- Add account status and rating adjustment columns
-- ============================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'active'
  CHECK (account_status IN ('active', 'suspended', 'banned'));

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS suspension_until timestamptz;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS total_violations integer DEFAULT 0;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS seller_rating_adjustment decimal(3,2) DEFAULT 0;

-- ============================================
-- 4. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_violations_user ON public.user_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_violations_dispute ON public.user_violations(dispute_id);
CREATE INDEX IF NOT EXISTS idx_violations_type ON public.user_violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_violations_created ON public.user_violations(created_at);

CREATE INDEX IF NOT EXISTS idx_penalties_user ON public.user_penalties(user_id);
CREATE INDEX IF NOT EXISTS idx_penalties_violation ON public.user_penalties(violation_id);
CREATE INDEX IF NOT EXISTS idx_penalties_type ON public.user_penalties(penalty_type);
CREATE INDEX IF NOT EXISTS idx_penalties_active ON public.user_penalties(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON public.profiles(suspension_until)
  WHERE account_status = 'suspended';

-- ============================================
-- 5. FUNCTION TO UPDATE VIOLATION COUNT
-- Automatically updates total_violations on profiles
-- ============================================
CREATE OR REPLACE FUNCTION public.update_violation_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET total_violations = total_violations + 1
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET total_violations = GREATEST(0, total_violations - 1)
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for violation count
DROP TRIGGER IF EXISTS trigger_update_violation_count ON public.user_violations;
CREATE TRIGGER trigger_update_violation_count
  AFTER INSERT OR DELETE ON public.user_violations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_violation_count();

-- ============================================
-- 6. FUNCTION TO AUTO-REINSTATE SUSPENDED USERS
-- Called periodically or on login to check suspension status
-- ============================================
CREATE OR REPLACE FUNCTION public.check_and_reinstate_user(check_user_id uuid)
RETURNS boolean AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT account_status, suspension_until
  INTO user_record
  FROM public.profiles
  WHERE id = check_user_id;

  -- If suspended and suspension has expired, reinstate
  IF user_record.account_status = 'suspended'
     AND user_record.suspension_until IS NOT NULL
     AND user_record.suspension_until < now() THEN
    UPDATE public.profiles
    SET account_status = 'active',
        suspension_until = NULL
    WHERE id = check_user_id;

    -- Deactivate the suspension penalty
    UPDATE public.user_penalties
    SET is_active = false
    WHERE user_id = check_user_id
      AND penalty_type = 'temporary_suspension'
      AND is_active = true;

    RETURN true; -- User was reinstated
  END IF;

  RETURN false; -- No change
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
