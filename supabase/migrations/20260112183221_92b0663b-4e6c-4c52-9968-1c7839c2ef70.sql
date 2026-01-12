-- Create admin_notifications table
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id TEXT NOT NULL DEFAULT public.generate_unique_id('NOTIF'),
  type TEXT NOT NULL CHECK (type IN ('LOW_BTC_INVENTORY', 'LOW_USDC_INVENTORY', 'LOW_COMPANY_USDC', 'FULFILLMENT_FAILED', 'CASHOUT_FAILED', 'SYSTEM_ALERT')),
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  dismissed_by_admin_id UUID REFERENCES public.admin_users(id)
);

-- Create treasury_reconciliation table to store reconciliation snapshots
CREATE TABLE public.treasury_reconciliation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reconciliation_id TEXT NOT NULL DEFAULT public.generate_unique_id('RECON'),
  asset_type TEXT NOT NULL CHECK (asset_type IN ('BTC', 'USDC', 'COMPANY_USDC')),
  onchain_balance NUMERIC NOT NULL,
  database_balance NUMERIC NOT NULL,
  discrepancy NUMERIC GENERATED ALWAYS AS (onchain_balance - database_balance) STORED,
  discrepancy_pct NUMERIC GENERATED ALWAYS AS (
    CASE WHEN database_balance != 0 
    THEN ((onchain_balance - database_balance) / database_balance) * 100 
    ELSE 0 END
  ) STORED,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'MATCHED', 'DISCREPANCY', 'RESOLVED')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by_admin_id UUID REFERENCES public.admin_users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by_admin_id UUID REFERENCES public.admin_users(id)
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_reconciliation ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_notifications
CREATE POLICY "Admins can view notifications"
  ON public.admin_notifications FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update notifications"
  ON public.admin_notifications FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert notifications"
  ON public.admin_notifications FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- RLS policies for treasury_reconciliation
CREATE POLICY "Admins can view reconciliation"
  ON public.treasury_reconciliation FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert reconciliation"
  ON public.treasury_reconciliation FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update reconciliation"
  ON public.treasury_reconciliation FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Create index for faster notification queries
CREATE INDEX idx_admin_notifications_unread ON public.admin_notifications(is_read, is_dismissed) WHERE is_read = false AND is_dismissed = false;
CREATE INDEX idx_treasury_reconciliation_status ON public.treasury_reconciliation(status, created_at DESC);