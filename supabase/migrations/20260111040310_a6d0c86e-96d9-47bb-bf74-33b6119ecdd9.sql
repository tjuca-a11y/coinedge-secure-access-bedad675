-- Fix security warnings

-- Drop the overly permissive audit logs insert policy
DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_logs;

-- Create a more restrictive policy for audit logs
CREATE POLICY "Admins and reps can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin(auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.sales_reps WHERE user_id = auth.uid())
);

-- Fix function search_path for generate_unique_id
CREATE OR REPLACE FUNCTION public.generate_unique_id(prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RETURN prefix || '-' || LOWER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8));
END;
$$;