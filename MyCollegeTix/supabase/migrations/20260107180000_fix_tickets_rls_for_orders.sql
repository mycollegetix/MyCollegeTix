-- Fix RLS policy on tickets to allow buyers with orders (not just ticket_sales) to view their purchased tickets

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "tickets_with_college_and_purchase_filter" ON "public"."tickets";

-- Recreate with additional check for orders table
CREATE POLICY "tickets_with_college_and_purchase_filter" ON "public"."tickets" 
FOR SELECT USING (
  (auth.uid() IS NOT NULL) AND (
    -- Seller can always see their own tickets
    (seller_id = auth.uid()) 
    -- Admins can see all
    OR (EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    ))
    -- Available tickets from user's college
    OR (
      (status = 'available') AND 
      (event_date >= now()) AND 
      (EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() AND (
          tickets.home_college_id = p.college_id OR 
          tickets.away_college_id = p.college_id
        )
      ))
    )
    -- Tickets user has purchased via ticket_sales (legacy)
    OR (EXISTS (
      SELECT 1 FROM public.ticket_sales 
      WHERE ticket_sales.ticket_id = tickets.id AND ticket_sales.buyer_id = auth.uid()
    ))
    -- Tickets user has purchased via orders (Stripe escrow)
    OR (EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.ticket_id = tickets.id AND orders.buyer_id = auth.uid()
    ))
  )
);
