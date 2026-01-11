-- Drop the existing function first to fix parameter naming
DROP FUNCTION IF EXISTS public.verify_admin_pin(uuid, text);

-- Recreate with prefixed parameter names to avoid ambiguity
CREATE OR REPLACE FUNCTION public.verify_admin_pin(p_merchant_id UUID, p_pin TEXT)
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
  
  -- If no PIN is set, deny access
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN stored_hash = encode(digest(p_pin, 'sha256'), 'hex');
END;
$$;

-- Create a function to update admin PIN (for settings page)
CREATE OR REPLACE FUNCTION public.update_admin_pin(p_merchant_id UUID, p_current_pin TEXT, p_new_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  -- Get current PIN hash
  SELECT admin_pin_hash INTO stored_hash
  FROM public.merchants
  WHERE id = p_merchant_id;
  
  -- Verify current PIN
  IF stored_hash IS NULL OR stored_hash != encode(digest(p_current_pin, 'sha256'), 'hex') THEN
    RETURN FALSE;
  END IF;
  
  -- Update to new PIN
  UPDATE public.merchants
  SET admin_pin_hash = encode(digest(p_new_pin, 'sha256'), 'hex')
  WHERE id = p_merchant_id;
  
  RETURN TRUE;
END;
$$;