-- Fix RLS for user_ratings table

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.user_ratings TO authenticated;

-- Allow users to insert ratings for transactions they're part of
DROP POLICY IF EXISTS "Users can insert ratings" ON public.user_ratings;
CREATE POLICY "Users can insert ratings" ON public.user_ratings
  FOR INSERT WITH CHECK (auth.uid() = rater_id);

-- Allow users to view ratings
DROP POLICY IF EXISTS "Users can view ratings" ON public.user_ratings;
CREATE POLICY "Users can view ratings" ON public.user_ratings
  FOR SELECT USING (true);

-- Allow users to update their own ratings
DROP POLICY IF EXISTS "Users can update own ratings" ON public.user_ratings;
CREATE POLICY "Users can update own ratings" ON public.user_ratings
  FOR UPDATE USING (auth.uid() = rater_id);
