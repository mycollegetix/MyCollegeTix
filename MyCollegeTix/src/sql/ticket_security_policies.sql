-- Ticket Security Policies for Cross-College Browsing
-- MyCollegeTix - Secure Multi-College Ticket Platform

-- Enable Row Level Security on all relevant tables
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- TICKETS TABLE POLICIES
-- =============================================================================

-- Policy 1: Users can view tickets for games involving their college
CREATE POLICY "tickets_cross_college_view" ON tickets
    FOR SELECT 
    USING (
        -- Ticket must be available
        status = 'available' 
        AND 
        -- Event date must be in the future
        event_date >= NOW()
        AND
        -- User must be authenticated
        auth.uid() IS NOT NULL
        AND
        -- User's college must be involved in the game (home OR away)
        (
            home_college_id IN (
                SELECT college_id 
                FROM profiles 
                WHERE id = auth.uid()
            )
            OR 
            away_college_id IN (
                SELECT college_id 
                FROM profiles 
                WHERE id = auth.uid()
            )
            OR
            -- Allow neutral venue tickets (both colleges null)
            (home_college_id IS NULL AND away_college_id IS NULL)
        )
    );

-- Policy 2: Users can view their own tickets (for selling/management)
CREATE POLICY "tickets_own_tickets_view" ON tickets
    FOR SELECT 
    USING (
        auth.uid() IS NOT NULL 
        AND seller_id = auth.uid()
    );

-- Policy 3: Users can insert their own tickets
CREATE POLICY "tickets_insert_own" ON tickets
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND seller_id = auth.uid()
        AND
        -- User must be verified/have college
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND college_id IS NOT NULL
        )
    );

-- Policy 4: Users can update their own tickets
CREATE POLICY "tickets_update_own" ON tickets
    FOR UPDATE 
    USING (
        auth.uid() IS NOT NULL 
        AND seller_id = auth.uid()
    )
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND seller_id = auth.uid()
    );

-- Policy 5: Users can delete their own available tickets
CREATE POLICY "tickets_delete_own" ON tickets
    FOR DELETE 
    USING (
        auth.uid() IS NOT NULL 
        AND seller_id = auth.uid()
        AND status = 'available'
    );

-- =============================================================================
-- ORDERS TABLE POLICIES  
-- =============================================================================

-- Policy 1: Users can view orders they're involved in (buyer or seller)
CREATE POLICY "orders_participant_view" ON orders
    FOR SELECT 
    USING (
        auth.uid() IS NOT NULL
        AND (
            buyer_id = auth.uid() 
            OR 
            seller_id = auth.uid()
        )
    );

-- Policy 2: Users can create orders as buyers (with college restriction)
CREATE POLICY "orders_create_as_buyer" ON orders
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND buyer_id = auth.uid()
        AND
        -- Buyer cannot buy their own tickets
        seller_id != auth.uid()
        AND
        -- Buyer must have access to view the ticket (cross-college rule)
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_id
            AND t.status = 'available'
            AND (
                t.home_college_id IN (
                    SELECT college_id FROM profiles WHERE id = auth.uid()
                )
                OR 
                t.away_college_id IN (
                    SELECT college_id FROM profiles WHERE id = auth.uid()
                )
                OR
                (t.home_college_id IS NULL AND t.away_college_id IS NULL)
            )
        )
    );

-- Policy 3: Users can update orders they're involved in
CREATE POLICY "orders_update_participant" ON orders
    FOR UPDATE 
    USING (
        auth.uid() IS NOT NULL
        AND (
            buyer_id = auth.uid() 
            OR 
            seller_id = auth.uid()
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            buyer_id = auth.uid() 
            OR 
            seller_id = auth.uid()
        )
    );

-- =============================================================================
-- PROFILES TABLE POLICIES
-- =============================================================================

-- Policy 1: Users can view their own profile
CREATE POLICY "profiles_own_view" ON profiles
    FOR SELECT 
    USING (auth.uid() = id);

-- Policy 2: Users can view profiles of people they're interacting with
CREATE POLICY "profiles_interaction_view" ON profiles
    FOR SELECT 
    USING (
        auth.uid() IS NOT NULL
        AND (
            -- Can see profiles of ticket sellers in their college games
            id IN (
                SELECT seller_id FROM tickets 
                WHERE status = 'available'
                AND (
                    home_college_id IN (
                        SELECT college_id FROM profiles WHERE id = auth.uid()
                    )
                    OR 
                    away_college_id IN (
                        SELECT college_id FROM profiles WHERE id = auth.uid()
                    )
                )
            )
            OR
            -- Can see profiles of people in orders with them
            id IN (
                SELECT buyer_id FROM orders WHERE seller_id = auth.uid()
                UNION
                SELECT seller_id FROM orders WHERE buyer_id = auth.uid()
            )
        )
    );

-- Policy 3: Users can update their own profile
CREATE POLICY "profiles_own_update" ON profiles
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- =============================================================================
-- COLLEGES TABLE POLICIES
-- =============================================================================

-- Policy 1: Anyone can view college information (public data)
CREATE POLICY "colleges_public_view" ON colleges
    FOR SELECT 
    USING (true);

-- =============================================================================
-- ADMIN OVERRIDE POLICIES
-- =============================================================================

-- Admin can do everything on tickets
CREATE POLICY "tickets_admin_all" ON tickets
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND is_admin = true
        )
    );

-- Admin can do everything on orders
CREATE POLICY "orders_admin_all" ON orders
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND is_admin = true
        )
    );

-- Admin can view all profiles
CREATE POLICY "profiles_admin_view" ON profiles
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND is_admin = true
        )
    );

-- =============================================================================
-- SECURITY FUNCTIONS
-- =============================================================================

-- Function to check if user can access a ticket
CREATE OR REPLACE FUNCTION can_user_access_ticket(ticket_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tickets t
        JOIN profiles p ON p.id = user_id
        WHERE t.id = ticket_id
        AND t.status = 'available'
        AND t.event_date >= NOW()
        AND (
            t.home_college_id = p.college_id
            OR t.away_college_id = p.college_id
            OR (t.home_college_id IS NULL AND t.away_college_id IS NULL)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's college ID
CREATE OR REPLACE FUNCTION get_user_college_id(user_id UUID)
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT college_id 
        FROM profiles 
        WHERE id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Index for cross-college ticket queries
CREATE INDEX IF NOT EXISTS idx_tickets_colleges_status_date 
ON tickets (home_college_id, away_college_id, status, event_date);

-- Index for user college lookups
CREATE INDEX IF NOT EXISTS idx_profiles_college_id 
ON profiles (college_id);

-- Index for ticket seller lookups
CREATE INDEX IF NOT EXISTS idx_tickets_seller_status 
ON tickets (seller_id, status);

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON POLICY "tickets_cross_college_view" ON tickets IS 
'Allows users to view tickets for games where their college is playing (home or away)';

COMMENT ON POLICY "orders_create_as_buyer" ON orders IS 
'Ensures buyers can only purchase tickets for games their college is involved in';

COMMENT ON FUNCTION can_user_access_ticket(UUID, UUID) IS 
'Helper function to check if a user can access a specific ticket based on college rules';