-- Fix rating_prompts to use orders table instead of ticket_sales

-- Drop old FK
ALTER TABLE public.rating_prompts
DROP CONSTRAINT IF EXISTS rating_prompts_ticket_sale_id_fkey;

-- Delete any orphaned prompts
DELETE FROM public.rating_prompts
WHERE ticket_sale_id NOT IN (SELECT id FROM public.orders);

-- Add new FK to orders
ALTER TABLE public.rating_prompts
ADD CONSTRAINT rating_prompts_order_id_fkey
FOREIGN KEY (ticket_sale_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- Add RLS policies
ALTER TABLE public.rating_prompts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.rating_prompts TO authenticated;

-- Users can view their own prompts (where they are the prompter)
DROP POLICY IF EXISTS "Users can view own rating prompts" ON public.rating_prompts;
CREATE POLICY "Users can view own rating prompts" ON public.rating_prompts
  FOR SELECT USING (auth.uid() = prompter_id);

-- Users can update their own prompts (to mark as completed/dismissed)
DROP POLICY IF EXISTS "Users can update own rating prompts" ON public.rating_prompts;
CREATE POLICY "Users can update own rating prompts" ON public.rating_prompts
  FOR UPDATE USING (auth.uid() = prompter_id);

-- Service role / edge functions can insert prompts
DROP POLICY IF EXISTS "Service can insert rating prompts" ON public.rating_prompts;
CREATE POLICY "Service can insert rating prompts" ON public.rating_prompts
  FOR INSERT WITH CHECK (true);
