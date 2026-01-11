-- Add RLS policy to allow merchant users to view their own merchant record
CREATE POLICY "Merchant users can view their own merchant"
ON public.merchants
FOR SELECT
USING (id = get_merchant_id_for_user(auth.uid()));