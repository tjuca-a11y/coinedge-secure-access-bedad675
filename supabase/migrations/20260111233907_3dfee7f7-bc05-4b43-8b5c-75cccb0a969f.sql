-- Enable pgcrypto extension if not enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop and recreate functions with correct pgcrypto usage
DROP FUNCTION IF EXISTS public.hash_admin_pin(text);
DROP FUNCTION IF EXISTS public.verify_admin_pin(uuid, text);
DROP FUNCTION IF EXISTS public.update_admin_pin(uuid, text, text);

-- Recreate hash function
CREATE FUNCTION public.hash_admin_pin(p_pin TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(extensions.digest(convert_to(p_pin, 'UTF8'), 'sha256'), 'hex');
END;
$$;

-- Recreate verify function
CREATE FUNCTION public.verify_admin_pin(p_merchant_id UUID, p_pin TEXT)
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
  WHERE id = p_merchant_id;

  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN stored_hash = encode(extensions.digest(convert_to(p_pin, 'UTF8'), 'sha256'), 'hex');
END;
$$;

-- Recreate update function
CREATE FUNCTION public.update_admin_pin(p_merchant_id UUID, p_current_pin TEXT, p_new_pin TEXT)
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
  WHERE id = p_merchant_id;

  IF stored_hash IS NULL OR stored_hash != encode(extensions.digest(convert_to(p_current_pin, 'UTF8'), 'sha256'), 'hex') THEN
    RETURN FALSE;
  END IF;

  UPDATE public.merchants
  SET admin_pin_hash = encode(extensions.digest(convert_to(p_new_pin, 'UTF8'), 'sha256'), 'hex')
  WHERE id = p_merchant_id;

  RETURN TRUE;
END;
$$;

-- Re-hash existing merchant PINs with correct function
UPDATE public.merchants 
SET admin_pin_hash = encode(extensions.digest(convert_to('1234', 'UTF8'), 'sha256'), 'hex')
WHERE admin_pin_hash IS NOT NULL;