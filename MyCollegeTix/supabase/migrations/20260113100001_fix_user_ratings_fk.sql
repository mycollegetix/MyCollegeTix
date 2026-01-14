-- Fix user_ratings foreign key - should reference orders, not ticket_sales

-- Drop the old foreign key constraint
ALTER TABLE public.user_ratings
DROP CONSTRAINT IF EXISTS user_ratings_ticket_sale_id_fkey;

-- Delete orphaned ratings that reference non-existent orders
DELETE FROM public.user_ratings
WHERE ticket_sale_id NOT IN (SELECT id FROM public.orders);

-- Add new foreign key to orders table
ALTER TABLE public.user_ratings
ADD CONSTRAINT user_ratings_order_id_fkey
FOREIGN KEY (ticket_sale_id) REFERENCES public.orders(id) ON DELETE CASCADE;
