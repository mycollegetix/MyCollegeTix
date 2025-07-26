# Test Legal Flow

## Current Issues:
1. TypeScript errors fixed ✅
2. Database columns may not exist yet

## Quick Test Steps:

### Step 1: Run the SQL to add legal agreement columns
Run this in your Supabase SQL editor:

```sql
-- Add legal agreement columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS legal_agreements_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS legal_agreements_version TEXT DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS legal_agreements_accepted_at TIMESTAMP WITH TIME ZONE;
```

### Step 2: Test the flow
1. Login with existing user
2. Should be redirected to legal onboarding
3. Accept both agreements
4. Should redirect to main app

### Step 3: If you want to create the full legal_agreements table:

```sql
-- Create legal agreements tracking table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_legal_agreements_user_id ON legal_agreements(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_agreements_type ON legal_agreements(agreement_type);

-- Enable RLS
ALTER TABLE legal_agreements ENABLE ROW LEVEL SECURITY;

-- Users can only read their own legal agreements
CREATE POLICY "Users can read own legal agreements" ON legal_agreements
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Users can insert their own legal agreements
CREATE POLICY "Users can insert own legal agreements" ON legal_agreements
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
```

The current code will work even if the legal_agreements table doesn't exist - it will just store the acceptance status in the profiles table.