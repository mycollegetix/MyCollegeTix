-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "tickets_with_college_filter" ON tickets;

-- Create new policy that allows buyers to see their purchased tickets
CREATE POLICY "tickets_with_college_and_purchase_filter" ON tickets
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    -- Sellers can see their own tickets
    seller_id = auth.uid() 
    
    -- Admins can see all tickets
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
    
    -- Users can see available tickets from their college
    OR (
      status = 'available'::text 
      AND event_date >= now() 
      AND EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND (
          tickets.home_college_id = p.college_id 
          OR tickets.away_college_id = p.college_id
        )
      )
    )
    
    -- BUYERS can see tickets they purchased (NEW)
    OR EXISTS (
      SELECT 1 FROM ticket_sales 
      WHERE ticket_sales.ticket_id = tickets.id 
      AND ticket_sales.buyer_id = auth.uid()
    )
  )
);