-- Add admin_pin_hash column to merchants table for secure PIN storage
ALTER TABLE public.merchants ADD COLUMN admin_pin_hash TEXT;

-- Create a function to hash admin PINs using pgcrypto
CREATE OR REPLACE FUNCTION public.hash_admin_pin(pin TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(digest(pin, 'sha256'), 'hex');
END;
$$;

-- Create a function to verify admin PIN
CREATE OR REPLACE FUNCTION public.verify_admin_pin(merchant_id UUID, pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT admin_pin_hash INTO stored_hash
  FROM public.merchants
  WHERE id = merchant_id;
  
  -- If no PIN is set, deny access
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN stored_hash = encode(digest(pin, 'sha256'), 'hex');
END;
$$;

-- Set default PIN (1234) for existing merchants
UPDATE public.merchants 
SET admin_pin_hash = encode(digest('1234', 'sha256'), 'hex')
WHERE admin_pin_hash IS NULL;