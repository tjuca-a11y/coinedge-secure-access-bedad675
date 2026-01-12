-- Create company_usdc_balance table for tracking operational USDC
CREATE TABLE public.company_usdc_balance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  balance_usdc NUMERIC NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by_admin_id UUID REFERENCES public.admin_users(id)
);

-- Create company_usdc_ledger for transaction history
CREATE TABLE public.company_usdc_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount_usdc NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'FEE_COLLECTION', 'OPERATIONAL_EXPENSE', 'ADJUSTMENT')),
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by_admin_id UUID REFERENCES public.admin_users(id)
);

-- Enable RLS
ALTER TABLE public.company_usdc_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_usdc_ledger ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_usdc_balance (admin only)
CREATE POLICY "Admins can view company USDC balance"
  ON public.company_usdc_balance FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update company USDC balance"
  ON public.company_usdc_balance FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert company USDC balance"
  ON public.company_usdc_balance FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- RLS policies for company_usdc_ledger (admin only)
CREATE POLICY "Admins can view company USDC ledger"
  ON public.company_usdc_ledger FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert company USDC ledger"
  ON public.company_usdc_ledger FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Initialize with a single row for company balance
INSERT INTO public.company_usdc_balance (balance_usdc) VALUES (0);