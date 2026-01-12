-- =====================================================
-- CoinEdge Treasury: USDC Wallet + Cash-out Support
-- =====================================================

-- Extend treasury_wallet to support USDC on Ethereum
ALTER TABLE public.treasury_wallet
ADD COLUMN IF NOT EXISTS usdc_address text,
ADD COLUMN IF NOT EXISTS asset_type text DEFAULT 'BTC' CHECK (asset_type IN ('BTC', 'USDC'));

-- Create USDC inventory lots table (mirrors BTC lots structure)
CREATE TABLE IF NOT EXISTS public.usdc_inventory_lots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  treasury_wallet_id uuid NOT NULL REFERENCES public.treasury_wallet(id),
  amount_usdc_total numeric NOT NULL,
  amount_usdc_available numeric NOT NULL,
  source text NOT NULL DEFAULT 'manual_topup' CHECK (source IN ('manual_topup', 'user_sell', 'exchange_withdraw', 'other')),
  reference_id text,
  notes text,
  created_by_admin_id uuid,
  received_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.usdc_inventory_lots ENABLE ROW LEVEL SECURITY;

-- RLS policies for USDC lots
CREATE POLICY "Admins can view USDC inventory lots"
  ON public.usdc_inventory_lots
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('super_admin', 'admin')
  ));

CREATE POLICY "Admins can create USDC inventory lots"
  ON public.usdc_inventory_lots
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('super_admin', 'admin')
  ));

CREATE POLICY "Admins can update USDC lots"
  ON public.usdc_inventory_lots
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('super_admin', 'admin')
  ));

-- User bank accounts for ACH cash-out
CREATE TABLE IF NOT EXISTS public.user_bank_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  plaid_access_token text,
  plaid_account_id text,
  plaid_item_id text,
  bank_name text NOT NULL,
  account_mask text NOT NULL,
  account_type text NOT NULL DEFAULT 'checking' CHECK (account_type IN ('checking', 'savings')),
  is_verified boolean DEFAULT false,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for bank accounts
ALTER TABLE public.user_bank_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for bank accounts
CREATE POLICY "Users can view their own bank accounts"
  ON public.user_bank_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bank accounts"
  ON public.user_bank_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts"
  ON public.user_bank_accounts
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank accounts"
  ON public.user_bank_accounts
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bank accounts"
  ON public.user_bank_accounts
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('super_admin', 'admin')
  ));

-- Cash-out orders table (user sells BTC/USDC for USD to bank)
CREATE TABLE IF NOT EXISTS public.cashout_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id text NOT NULL DEFAULT ('CSH-' || SUBSTRING((gen_random_uuid())::text FROM 1 FOR 8)),
  user_id uuid NOT NULL,
  bank_account_id uuid NOT NULL REFERENCES public.user_bank_accounts(id),
  source_asset text NOT NULL CHECK (source_asset IN ('BTC', 'USDC')),
  source_amount numeric NOT NULL,
  usd_amount numeric NOT NULL,
  fee_usd numeric NOT NULL DEFAULT 0,
  conversion_rate numeric,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'ACH_INITIATED', 'COMPLETED', 'FAILED', 'CANCELLED')),
  plaid_transfer_id text,
  failed_reason text,
  estimated_arrival date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

-- Enable RLS for cashout orders
ALTER TABLE public.cashout_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for cashout orders
CREATE POLICY "Users can view their own cashout orders"
  ON public.cashout_orders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cashout orders"
  ON public.cashout_orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all cashout orders"
  ON public.cashout_orders
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('super_admin', 'admin')
  ));

CREATE POLICY "Admins can update cashout orders"
  ON public.cashout_orders
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('super_admin', 'admin')
  ));

-- Add USDC destination address to customer_swap_orders for sell orders
ALTER TABLE public.customer_swap_orders
ADD COLUMN IF NOT EXISTS source_usdc_address text,
ADD COLUMN IF NOT EXISTS inventory_allocated boolean DEFAULT false;

-- Add system settings for USDC thresholds
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
  ('LOW_USDC_THRESHOLD', '50000', 'Alert if USDC inventory falls below this USD amount'),
  ('USDC_PAYOUTS_PAUSED', 'false', 'Pause all USDC payouts'),
  ('ACH_DAILY_LIMIT_USD', '10000', 'Maximum USD per user per day for ACH transfers'),
  ('ACH_ESTIMATED_DAYS', '3', 'Estimated business days for ACH settlement')
ON CONFLICT (setting_key) DO NOTHING;

-- Function to get USDC inventory stats
CREATE OR REPLACE FUNCTION public.get_usdc_inventory_stats()
RETURNS TABLE (
  total_usdc numeric,
  available_usdc numeric,
  lots_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(amount_usdc_total), 0) as total_usdc,
    COALESCE(SUM(amount_usdc_available), 0) as available_usdc,
    COUNT(*)::bigint as lots_count
  FROM usdc_inventory_lots;
END;
$$;