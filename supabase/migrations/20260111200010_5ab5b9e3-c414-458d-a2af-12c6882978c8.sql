-- Add explicit policy to deny anonymous/public access to profiles table
-- This ensures that even if RLS is bypassed or misconfigured, 
-- unauthenticated users cannot access sensitive customer data

CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);