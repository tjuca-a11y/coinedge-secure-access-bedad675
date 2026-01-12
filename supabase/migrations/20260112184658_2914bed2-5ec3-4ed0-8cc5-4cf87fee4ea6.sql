-- Create treasury snapshots table for historical balance tracking
CREATE TABLE public.treasury_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  btc_eligible NUMERIC NOT NULL DEFAULT 0,
  btc_total NUMERIC NOT NULL DEFAULT 0,
  usdc_available NUMERIC NOT NULL DEFAULT 0,
  usdc_total NUMERIC NOT NULL DEFAULT 0,
  company_usdc NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(snapshot_date)
);

-- Enable RLS
ALTER TABLE public.treasury_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies - admins only
CREATE POLICY "Admins can view treasury snapshots"
ON public.treasury_snapshots
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Admins can insert treasury snapshots"
ON public.treasury_snapshots
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Add index for date queries
CREATE INDEX idx_treasury_snapshots_date ON public.treasury_snapshots(snapshot_date DESC);