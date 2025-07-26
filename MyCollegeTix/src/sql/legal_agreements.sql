-- Legal Agreements Database Schema
-- Add these to your existing Supabase database

-- Table to track legal agreement acceptances
CREATE TABLE IF NOT EXISTS legal_agreements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    agreement_type TEXT NOT NULL CHECK (agreement_type IN ('terms_of_service', 'privacy_policy')),
    version TEXT NOT NULL DEFAULT '1.0',
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add column to profiles to track if user has completed legal onboarding
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS legal_agreements_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS legal_agreements_version TEXT DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS legal_agreements_accepted_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_legal_agreements_user_id ON legal_agreements(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_agreements_type ON legal_agreements(agreement_type);
CREATE INDEX IF NOT EXISTS idx_profiles_legal_accepted ON profiles(legal_agreements_accepted);

-- Row Level Security (RLS) policies
ALTER TABLE legal_agreements ENABLE ROW LEVEL SECURITY;

-- Users can only read their own legal agreements
CREATE POLICY "Users can read own legal agreements" ON legal_agreements
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Users can insert their own legal agreements
CREATE POLICY "Users can insert own legal agreements" ON legal_agreements
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Admins can read all legal agreements (for compliance)
CREATE POLICY "Admins can read all legal agreements" ON legal_agreements
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );