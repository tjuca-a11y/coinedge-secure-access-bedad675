-- Add explicit policy to deny anonymous/public access to admin_users table
-- This ensures unauthenticated users cannot access admin employee data

CREATE POLICY "Deny anonymous access to admin_users"
ON public.admin_users
FOR ALL
TO anon
USING (false)
WITH CHECK (false);