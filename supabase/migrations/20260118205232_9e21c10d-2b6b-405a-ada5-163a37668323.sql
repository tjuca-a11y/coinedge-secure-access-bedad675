-- Create payment method enum
CREATE TYPE public.payment_method_type AS ENUM ('CARD', 'CASH');

-- Add new values to merchant_ledger_type enum
ALTER TYPE public.merchant_ledger_type ADD VALUE IF NOT EXISTS 'MERCHANT_COMMISSION_CARD';
ALTER TYPE public.merchant_ledger_type ADD VALUE IF NOT EXISTS 'MERCHANT_COMMISSION_CASH';
ALTER TYPE public.merchant_ledger_type ADD VALUE IF NOT EXISTS 'CASH_SALE_DEBIT';
ALTER TYPE public.merchant_ledger_type ADD VALUE IF NOT EXISTS 'INITIAL_FUNDING';
ALTER TYPE public.merchant_ledger_type ADD VALUE IF NOT EXISTS 'SALES_REP_BONUS';

-- Add columns to bitcard_activation_events
ALTER TABLE public.bitcard_activation_events 
ADD COLUMN IF NOT EXISTS payment_method public.payment_method_type,
ADD COLUMN IF NOT EXISTS customer_amount_paid DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS merchant_commission_usd DECIMAL(12,2);

-- Add funding columns to merchants table
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS is_initially_funded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS initial_funding_date TIMESTAMPTZ;

-- Add cash credit balance to merchant_wallets
ALTER TABLE public.merchant_wallets 
ADD COLUMN IF NOT EXISTS cash_credit_balance DECIMAL(12,2) DEFAULT 0;

-- Create fee_distributions table (admin only)
CREATE TABLE IF NOT EXISTS public.fee_distributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activation_event_id UUID NOT NULL REFERENCES public.bitcard_activation_events(id) ON DELETE CASCADE,
  base_amount_usd DECIMAL(12,2) NOT NULL,
  total_fee_usd DECIMAL(12,2) NOT NULL,
  customer_paid_usd DECIMAL(12,2) NOT NULL,
  payment_method public.payment_method_type NOT NULL,
  sales_rep_fee_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
  merchant_fee_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
  volatility_reserve_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
  square_processing_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
  coinedge_revenue_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on fee_distributions
ALTER TABLE public.fee_distributions ENABLE ROW LEVEL SECURITY;

-- Only admins can view fee distributions
CREATE POLICY "Only admins can view fee distributions"
ON public.fee_distributions
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Only admins can insert fee distributions
CREATE POLICY "Only admins can insert fee distributions"
ON public.fee_distributions
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fee_distributions_activation_event 
ON public.fee_distributions(activation_event_id);

-- Create index for merchant wallet cash balance lookups
CREATE INDEX IF NOT EXISTS idx_merchant_wallets_cash_credit 
ON public.merchant_wallets(cash_credit_balance);

-- Create index for merchant funding status
CREATE INDEX IF NOT EXISTS idx_merchants_initially_funded 
ON public.merchants(is_initially_funded);