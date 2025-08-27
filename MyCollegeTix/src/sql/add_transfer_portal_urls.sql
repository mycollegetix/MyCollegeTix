-- Add transfer portal URL to colleges table
-- This allows each college to have their own ticket transfer portal link

ALTER TABLE public.colleges 
ADD COLUMN transfer_portal_url text;

-- Update existing colleges with their transfer portal URLs
-- Michigan State
UPDATE public.colleges 
SET transfer_portal_url = 'https://msuspartans.evenue.net/signin'
WHERE email_domain LIKE '%msu.edu%' OR short_name = 'MSU' OR name ILIKE '%michigan state%';

-- University of Michigan  
UPDATE public.colleges 
SET transfer_portal_url = 'https://mgoblue.evenue.net/signin'
WHERE email_domain LIKE '%umich.edu%' OR short_name = 'UM' OR name ILIKE '%michigan%' AND name NOT ILIKE '%michigan state%';

-- Add comment for documentation
COMMENT ON COLUMN public.colleges.transfer_portal_url IS 'URL to the college''s official ticket transfer portal (e.g., eVenue)';