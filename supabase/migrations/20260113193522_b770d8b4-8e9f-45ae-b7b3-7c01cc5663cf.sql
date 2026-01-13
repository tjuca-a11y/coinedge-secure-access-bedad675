-- Create a secure view for user_bank_accounts that excludes sensitive columns
CREATE VIEW public.user_bank_accounts_public
WITH (security_invoker=on) AS
  SELECT 
    id, 
    user_id, 
    bank_name, 
    account_mask, 
    account_type, 
    is_verified, 
    is_primary, 
    created_at, 
    updated_at
  FROM public.user_bank_accounts;

-- Grant permissions on the view
GRANT SELECT ON public.user_bank_accounts_public TO anon, authenticated;

-- Drop existing RLS policies on base table
DROP POLICY IF EXISTS "Users can view their own bank accounts" ON public.user_bank_accounts;
DROP POLICY IF EXISTS "Users can insert their own bank accounts" ON public.user_bank_accounts;
DROP POLICY IF EXISTS "Users can update their own bank accounts" ON public.user_bank_accounts;
DROP POLICY IF EXISTS "Users can delete their own bank accounts" ON public.user_bank_accounts;

-- Deny direct SELECT on base table for regular users (service role still has access)
CREATE POLICY "No direct SELECT access for regular users"
  ON public.user_bank_accounts
  FOR SELECT
  USING (false);

-- Users can insert their own bank accounts
CREATE POLICY "Users can insert their own bank accounts"
  ON public.user_bank_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own bank accounts
CREATE POLICY "Users can update their own bank accounts"
  ON public.user_bank_accounts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own bank accounts
CREATE POLICY "Users can delete their own bank accounts"
  ON public.user_bank_accounts
  FOR DELETE
  USING (auth.uid() = user_id);