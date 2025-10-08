-- Create a function to validate emails before user creation
CREATE OR REPLACE FUNCTION public.validate_user_email()
RETURNS TRIGGER AS $$
DECLARE
  email_domain TEXT;
  email_lower TEXT;
BEGIN
  -- Get lowercase email and domain
  email_lower := LOWER(TRIM(NEW.email));
  email_domain := split_part(email_lower, '@', 2);

  -- Check if domain is allowed (.edu domains)
  IF email_domain IN ('msu.edu', 'umich.edu') THEN
    RETURN NEW;
  END IF;

  -- Check if it's an allowed Gmail test account
  IF email_domain = 'gmail.com' AND email_lower IN (
    'aditi.dron@gmail.com',
    'agarwal.vijay@gmail.com',
    'cotejosephr@gmail.com',
    'dinguspickle07@gmail.com',
    'mycollegetix+2@gmail.com',
    'mycollegetix@gmail.com',
    'nikhilmamtani@gmail.com',
    'nikhilmamtani6@gmail.com',
    'riyamathur2014@gmail.com',
    'rohanm.0304@gmail.com',
    'smithhhannee@gmail.com',
    'vivekapatel2005@gmail.com'
  ) THEN
    RETURN NEW;
  END IF;

  -- If we get here, email is not allowed
  RAISE EXCEPTION 'Access is currently limited to students from Michigan State University and University of Michigan. Please use your college email (.edu) to sign up.'
    USING HINT = 'Email domain not allowed: ' || email_domain;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table to validate email before insert
DROP TRIGGER IF EXISTS validate_user_email_trigger ON auth.users;
CREATE TRIGGER validate_user_email_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_email();
