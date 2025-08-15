-- Add IP tracking columns to profiles table
-- This adds columns to track user's IP address, device info, and location data

BEGIN;

-- Add IP tracking columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_ip_address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_ip_address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ip_updated_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_info jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_data jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_agent text;

-- Create index for IP address lookups (useful for admin/security)
CREATE INDEX IF NOT EXISTS idx_profiles_current_ip ON public.profiles(current_ip_address);
CREATE INDEX IF NOT EXISTS idx_profiles_ip_updated ON public.profiles(ip_updated_at);

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.current_ip_address IS 'Current IP address of the user (router/public IP)';
COMMENT ON COLUMN public.profiles.last_ip_address IS 'Previous IP address for comparison';
COMMENT ON COLUMN public.profiles.ip_updated_at IS 'When the IP address was last updated';
COMMENT ON COLUMN public.profiles.device_info IS 'Device information (platform, OS, app version, etc.)';
COMMENT ON COLUMN public.profiles.location_data IS 'Location data from IP geolocation (city, country, etc.)';
COMMENT ON COLUMN public.profiles.user_agent IS 'User agent string from the device';

COMMIT;

-- Display updated schema
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
  AND column_name IN (
    'current_ip_address', 
    'last_ip_address', 
    'ip_updated_at', 
    'device_info', 
    'location_data', 
    'user_agent'
  )
ORDER BY column_name;

SELECT 'SUCCESS: IP tracking columns added to profiles table!' as result;