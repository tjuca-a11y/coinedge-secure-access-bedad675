-- =============================================
-- BTC INVENTORY & FULFILLMENT SYSTEM SCHEMA
-- =============================================

-- ENUM TYPES
CREATE TYPE public.inventory_source AS ENUM ('manual_topup', 'exchange_withdraw', 'other');
CREATE TYPE public.fulfillment_order_type AS ENUM ('BITCARD_REDEMPTION', 'BUY_ORDER');
CREATE TYPE public.fulfillment_status AS ENUM ('SUBMITTED', 'KYC_PENDING', 'WAITING_INVENTORY', 'READY_TO_SEND', 'SENDING', 'SENT', 'FAILED', 'HOLD');
CREATE TYPE public.kyc_fulfillment_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- =============================================
-- 1. TREASURY WALLET TABLE
-- =============================================
CREATE TABLE public.treasury_wallet (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fireblocks_vault_id TEXT NOT NULL,
  fireblocks_wallet_id TEXT,
  btc_address TEXT,
  label TEXT DEFAULT 'CoinEdge Treasury',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.treasury_wallet ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view treasury wallet"
  ON public.treasury_wallet FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  ));

CREATE POLICY "Super admins can manage treasury wallet"
  ON public.treasury_wallet FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  ));

-- =============================================
-- 2. INVENTORY LOTS TABLE (with trigger for eligible_at)
-- =============================================
CREATE TABLE public.inventory_lots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  treasury_wallet_id UUID NOT NULL REFERENCES public.treasury_wallet(id),
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  eligible_at TIMESTAMP WITH TIME ZONE NOT NULL,
  amount_btc_total NUMERIC(18, 8) NOT NULL CHECK (amount_btc_total > 0),
  amount_btc_available NUMERIC(18, 8) NOT NULL CHECK (amount_btc_available >= 0),
  source public.inventory_source NOT NULL DEFAULT 'manual_topup',
  reference_id TEXT,
  notes TEXT,
  created_by_admin_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trigger to auto-set eligible_at = received_at + 60 minutes
CREATE OR REPLACE FUNCTION public.set_inventory_lot_eligible_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.eligible_at := NEW.received_at + INTERVAL '60 minutes';
  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_lots_set_eligible_at
  BEFORE INSERT ON public.inventory_lots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_inventory_lot_eligible_at();

ALTER TABLE public.inventory_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view inventory lots"
  ON public.inventory_lots FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  ));

CREATE POLICY "Admins can create inventory lots"
  ON public.inventory_lots FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  ));

CREATE POLICY "Admins can update lots"
  ON public.inventory_lots FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  ));

CREATE INDEX idx_inventory_lots_eligible_at ON public.inventory_lots(eligible_at);
CREATE INDEX idx_inventory_lots_treasury ON public.inventory_lots(treasury_wallet_id);

-- =============================================
-- 3. FULFILLMENT ORDERS TABLE
-- =============================================
CREATE TABLE public.fulfillment_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_type public.fulfillment_order_type NOT NULL,
  customer_id UUID REFERENCES public.profiles(id),
  merchant_id UUID REFERENCES public.merchants(id),
  sales_rep_id UUID REFERENCES public.sales_reps(id),
  bitcard_id UUID REFERENCES public.bitcards(id),
  usd_value NUMERIC(12, 2) NOT NULL CHECK (usd_value > 0),
  destination_wallet_address TEXT NOT NULL,
  kyc_status public.kyc_fulfillment_status NOT NULL DEFAULT 'PENDING',
  btc_amount NUMERIC(18, 8),
  btc_price_used NUMERIC(12, 2),
  status public.fulfillment_status NOT NULL DEFAULT 'SUBMITTED',
  blocked_reason TEXT,
  fireblocks_transfer_id TEXT,
  tx_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.fulfillment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view fulfillment orders"
  ON public.fulfillment_orders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  ));

CREATE POLICY "Admins can manage fulfillment orders"
  ON public.fulfillment_orders FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  ));

CREATE INDEX idx_fulfillment_orders_status ON public.fulfillment_orders(status);
CREATE INDEX idx_fulfillment_orders_merchant ON public.fulfillment_orders(merchant_id);
CREATE INDEX idx_fulfillment_orders_created ON public.fulfillment_orders(created_at DESC);

-- =============================================
-- 4. LOT ALLOCATIONS TABLE
-- =============================================
CREATE TABLE public.lot_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fulfillment_id UUID NOT NULL REFERENCES public.fulfillment_orders(id),
  lot_id UUID NOT NULL REFERENCES public.inventory_lots(id),
  amount_btc_allocated NUMERIC(18, 8) NOT NULL CHECK (amount_btc_allocated > 0),
  is_reversed BOOLEAN NOT NULL DEFAULT false,
  reversed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lot_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view lot allocations"
  ON public.lot_allocations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  ));

CREATE POLICY "Admins can manage lot allocations"
  ON public.lot_allocations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  ));

CREATE INDEX idx_lot_allocations_fulfillment ON public.lot_allocations(fulfillment_id);
CREATE INDEX idx_lot_allocations_lot ON public.lot_allocations(lot_id);

-- =============================================
-- 5. SYSTEM SETTINGS TABLE
-- =============================================
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view system settings"
  ON public.system_settings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  ));

CREATE POLICY "Super admins can manage system settings"
  ON public.system_settings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  ));

INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
  ('AUTO_SEND_ENABLED', 'false', 'Enable automatic BTC sending for ready orders'),
  ('PAYOUTS_PAUSED', 'false', 'Pause all BTC payouts'),
  ('DAILY_BTC_LIMIT', '10', 'Maximum BTC that can be sent per day'),
  ('MAX_TX_BTC_LIMIT', '1', 'Maximum BTC per single transaction'),
  ('LOW_INVENTORY_THRESHOLD_BTC', '5', 'Alert threshold for low eligible inventory');

-- =============================================
-- 6. DAILY SEND TRACKING TABLE
-- =============================================
CREATE TABLE public.daily_btc_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  send_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_btc_sent NUMERIC(18, 8) NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(send_date)
);

ALTER TABLE public.daily_btc_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view daily sends"
  ON public.daily_btc_sends FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  ));

CREATE POLICY "Admins can manage daily sends"
  ON public.daily_btc_sends FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  ));

-- =============================================
-- 7. TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE TRIGGER update_treasury_wallet_updated_at
  BEFORE UPDATE ON public.treasury_wallet
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fulfillment_orders_updated_at
  BEFORE UPDATE ON public.fulfillment_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_btc_sends_updated_at
  BEFORE UPDATE ON public.daily_btc_sends
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 8. FUNCTION: GET INVENTORY STATS
-- =============================================
CREATE OR REPLACE FUNCTION public.get_inventory_stats()
RETURNS TABLE (
  total_btc NUMERIC,
  eligible_btc NUMERIC,
  locked_btc NUMERIC,
  eligible_lots_count BIGINT,
  locked_lots_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(il.amount_btc_available), 0) AS total_btc,
    COALESCE(SUM(CASE WHEN now() >= il.eligible_at THEN il.amount_btc_available ELSE 0 END), 0) AS eligible_btc,
    COALESCE(SUM(CASE WHEN now() < il.eligible_at THEN il.amount_btc_available ELSE 0 END), 0) AS locked_btc,
    COUNT(CASE WHEN now() >= il.eligible_at AND il.amount_btc_available > 0 THEN 1 END) AS eligible_lots_count,
    COUNT(CASE WHEN now() < il.eligible_at AND il.amount_btc_available > 0 THEN 1 END) AS locked_lots_count
  FROM public.inventory_lots il
  WHERE il.amount_btc_available > 0;
END;
$$;

-- =============================================
-- 9. FUNCTION: ALLOCATE BTC FROM LOTS (FIFO)
-- =============================================
CREATE OR REPLACE FUNCTION public.allocate_btc_fifo(
  p_fulfillment_id UUID,
  p_btc_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lot RECORD;
  v_remaining NUMERIC := p_btc_amount;
  v_allocate_amount NUMERIC;
BEGIN
  FOR v_lot IN
    SELECT id, amount_btc_available
    FROM public.inventory_lots
    WHERE eligible_at <= now()
      AND amount_btc_available > 0
    ORDER BY eligible_at ASC, created_at ASC
    FOR UPDATE
  LOOP
    IF v_remaining <= 0 THEN
      EXIT;
    END IF;

    v_allocate_amount := LEAST(v_lot.amount_btc_available, v_remaining);

    INSERT INTO public.lot_allocations (fulfillment_id, lot_id, amount_btc_allocated)
    VALUES (p_fulfillment_id, v_lot.id, v_allocate_amount);

    UPDATE public.inventory_lots
    SET amount_btc_available = amount_btc_available - v_allocate_amount
    WHERE id = v_lot.id;

    v_remaining := v_remaining - v_allocate_amount;
  END LOOP;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Insufficient eligible inventory';
  END IF;

  RETURN TRUE;
END;
$$;

-- =============================================
-- 10. FUNCTION: REVERSE ALLOCATIONS
-- =============================================
CREATE OR REPLACE FUNCTION public.reverse_allocations(p_fulfillment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alloc RECORD;
BEGIN
  FOR v_alloc IN
    SELECT id, lot_id, amount_btc_allocated
    FROM public.lot_allocations
    WHERE fulfillment_id = p_fulfillment_id
      AND is_reversed = false
    FOR UPDATE
  LOOP
    UPDATE public.inventory_lots
    SET amount_btc_available = amount_btc_available + v_alloc.amount_btc_allocated
    WHERE id = v_alloc.lot_id;

    UPDATE public.lot_allocations
    SET is_reversed = true, reversed_at = now()
    WHERE id = v_alloc.id;
  END LOOP;

  RETURN TRUE;
END;
$$;