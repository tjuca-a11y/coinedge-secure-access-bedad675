
-- =====================================================
-- COINEDGE MERCHANT PORTAL - DATABASE SCHEMA
-- =====================================================

-- 1. Create enum for merchant user roles
CREATE TYPE public.merchant_user_role AS ENUM ('MERCHANT_ADMIN', 'CASHIER');

-- 2. Create enum for merchant user status
CREATE TYPE public.merchant_user_status AS ENUM ('ACTIVE', 'DISABLED');

-- 3. Create enum for merchant wallet ledger entry types
CREATE TYPE public.merchant_ledger_type AS ENUM ('TOPUP', 'ACTIVATION_DEBIT', 'ADJUSTMENT');

-- 4. Create enum for square payment status
CREATE TYPE public.square_payment_status AS ENUM ('CREATED', 'PAID', 'FAILED', 'CANCELED');

-- 5. Create enum for card order status
CREATE TYPE public.card_order_status AS ENUM ('SUBMITTED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELED');

-- 6. Create enum for activation method
CREATE TYPE public.activation_method AS ENUM ('QR_PIN', 'MANUAL');

-- =====================================================
-- MERCHANT USERS TABLE
-- =====================================================
CREATE TABLE public.merchant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role merchant_user_role NOT NULL DEFAULT 'CASHIER',
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    status merchant_user_status NOT NULL DEFAULT 'ACTIVE',
    must_reset_password BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ,
    UNIQUE(merchant_id, email)
);

ALTER TABLE public.merchant_users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- MERCHANT WALLETS TABLE
-- =====================================================
CREATE TABLE public.merchant_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL UNIQUE REFERENCES public.merchants(id) ON DELETE CASCADE,
    balance_usd NUMERIC NOT NULL DEFAULT 0 CHECK (balance_usd >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_wallets ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- MERCHANT WALLET LEDGER TABLE (IMMUTABLE)
-- =====================================================
CREATE TABLE public.merchant_wallet_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    type merchant_ledger_type NOT NULL,
    amount_usd NUMERIC NOT NULL,
    reference TEXT,
    created_by_merchant_user_id UUID REFERENCES public.merchant_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_wallet_ledger ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SQUARE PAYMENTS TABLE
-- =====================================================
CREATE TABLE public.square_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    square_payment_id TEXT,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    amount_usd NUMERIC NOT NULL CHECK (amount_usd > 0),
    status square_payment_status NOT NULL DEFAULT 'CREATED',
    created_by_merchant_user_id UUID REFERENCES public.merchant_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.square_payments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CARD PRODUCTS TABLE
-- =====================================================
CREATE TABLE public.card_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    pack_size INTEGER NOT NULL DEFAULT 1,
    price_usd NUMERIC NOT NULL CHECK (price_usd > 0),
    notes TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.card_products ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CARD ORDERS TABLE
-- =====================================================
CREATE TABLE public.card_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.card_products(id),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    status card_order_status NOT NULL DEFAULT 'SUBMITTED',
    shipping_name TEXT NOT NULL,
    shipping_phone TEXT NOT NULL,
    shipping_address_line1 TEXT NOT NULL,
    shipping_address_line2 TEXT,
    shipping_city TEXT NOT NULL,
    shipping_state TEXT NOT NULL,
    shipping_zip TEXT NOT NULL,
    shipping_country TEXT NOT NULL DEFAULT 'US',
    tracking_number TEXT,
    created_by_merchant_user_id UUID REFERENCES public.merchant_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.card_orders ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- MERCHANT AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE public.merchant_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    actor_merchant_user_id UUID REFERENCES public.merchant_users(id),
    action TEXT NOT NULL,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- BITCARD ACTIVATION EVENTS TABLE
-- =====================================================
CREATE TABLE public.bitcard_activation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    bitcard_id UUID NOT NULL REFERENCES public.bitcards(id),
    usd_value NUMERIC NOT NULL CHECK (usd_value > 0),
    activated_by_merchant_user_id UUID NOT NULL REFERENCES public.merchant_users(id),
    activation_method activation_method NOT NULL DEFAULT 'QR_PIN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bitcard_activation_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- BITCARD PIN ATTEMPTS TABLE
-- =====================================================
CREATE TABLE public.bitcard_pin_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    bitcard_id UUID REFERENCES public.bitcards(id),
    success BOOLEAN NOT NULL DEFAULT false,
    attempted_by_merchant_user_id UUID NOT NULL REFERENCES public.merchant_users(id),
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bitcard_pin_attempts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ADD COLUMNS TO BITCARDS FOR BLANK-VALUE SUPPORT
-- =====================================================
ALTER TABLE public.bitcards 
    ADD COLUMN IF NOT EXISTS pin_hash TEXT,
    ADD COLUMN IF NOT EXISTS pin_required BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS activated_by_merchant_user_id UUID REFERENCES public.merchant_users(id);

-- Make usd_value nullable for blank-value cards
ALTER TABLE public.bitcards ALTER COLUMN usd_value DROP NOT NULL;

-- =====================================================
-- SECURITY DEFINER FUNCTIONS FOR MERCHANT AUTH
-- =====================================================

-- Function to check if user is a merchant user
CREATE OR REPLACE FUNCTION public.is_merchant_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.merchant_users
        WHERE user_id = _user_id AND status = 'ACTIVE'
    )
$$;

-- Function to get merchant user's merchant_id
CREATE OR REPLACE FUNCTION public.get_merchant_id_for_user(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT merchant_id FROM public.merchant_users
    WHERE user_id = _user_id AND status = 'ACTIVE'
    LIMIT 1
$$;

-- Function to check if user is merchant admin
CREATE OR REPLACE FUNCTION public.is_merchant_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.merchant_users
        WHERE user_id = _user_id 
        AND status = 'ACTIVE' 
        AND role = 'MERCHANT_ADMIN'
    )
$$;

-- Function to check if user is cashier (or admin - admins can do cashier things)
CREATE OR REPLACE FUNCTION public.is_merchant_cashier_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.merchant_users
        WHERE user_id = _user_id 
        AND status = 'ACTIVE'
    )
$$;

-- =====================================================
-- RLS POLICIES FOR MERCHANT_USERS
-- =====================================================

-- Deny anonymous access
CREATE POLICY "Deny anonymous access to merchant_users"
ON public.merchant_users
FOR ALL TO anon
USING (false) WITH CHECK (false);

-- Merchant admins can view users in their merchant
CREATE POLICY "Merchant admins can view their merchant users"
ON public.merchant_users FOR SELECT
TO authenticated
USING (
    merchant_id = get_merchant_id_for_user(auth.uid())
);

-- Merchant admins can create users in their merchant
CREATE POLICY "Merchant admins can create merchant users"
ON public.merchant_users FOR INSERT
TO authenticated
WITH CHECK (
    is_merchant_admin(auth.uid()) 
    AND merchant_id = get_merchant_id_for_user(auth.uid())
);

-- Merchant admins can update users in their merchant
CREATE POLICY "Merchant admins can update merchant users"
ON public.merchant_users FOR UPDATE
TO authenticated
USING (
    is_merchant_admin(auth.uid()) 
    AND merchant_id = get_merchant_id_for_user(auth.uid())
);

-- CoinEdge admins can manage all merchant users
CREATE POLICY "Admins can manage merchant users"
ON public.merchant_users FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- =====================================================
-- RLS POLICIES FOR MERCHANT_WALLETS
-- =====================================================

CREATE POLICY "Deny anonymous access to merchant_wallets"
ON public.merchant_wallets
FOR ALL TO anon
USING (false) WITH CHECK (false);

CREATE POLICY "Merchant users can view their wallet"
ON public.merchant_wallets FOR SELECT
TO authenticated
USING (
    merchant_id = get_merchant_id_for_user(auth.uid())
);

CREATE POLICY "System can update wallet balance"
ON public.merchant_wallets FOR UPDATE
TO authenticated
USING (
    is_merchant_cashier_or_admin(auth.uid()) 
    AND merchant_id = get_merchant_id_for_user(auth.uid())
);

CREATE POLICY "Admins can manage merchant wallets"
ON public.merchant_wallets FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- =====================================================
-- RLS POLICIES FOR MERCHANT_WALLET_LEDGER
-- =====================================================

CREATE POLICY "Deny anonymous access to merchant_wallet_ledger"
ON public.merchant_wallet_ledger
FOR ALL TO anon
USING (false) WITH CHECK (false);

CREATE POLICY "Merchant admins can view ledger entries"
ON public.merchant_wallet_ledger FOR SELECT
TO authenticated
USING (
    merchant_id = get_merchant_id_for_user(auth.uid())
);

CREATE POLICY "Merchant users can insert ledger entries"
ON public.merchant_wallet_ledger FOR INSERT
TO authenticated
WITH CHECK (
    is_merchant_cashier_or_admin(auth.uid()) 
    AND merchant_id = get_merchant_id_for_user(auth.uid())
);

CREATE POLICY "Admins can manage merchant ledger"
ON public.merchant_wallet_ledger FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- =====================================================
-- RLS POLICIES FOR SQUARE_PAYMENTS
-- =====================================================

CREATE POLICY "Deny anonymous access to square_payments"
ON public.square_payments
FOR ALL TO anon
USING (false) WITH CHECK (false);

CREATE POLICY "Merchant admins can view their payments"
ON public.square_payments FOR SELECT
TO authenticated
USING (
    is_merchant_admin(auth.uid()) 
    AND merchant_id = get_merchant_id_for_user(auth.uid())
);

CREATE POLICY "Merchant admins can create payments"
ON public.square_payments FOR INSERT
TO authenticated
WITH CHECK (
    is_merchant_admin(auth.uid()) 
    AND merchant_id = get_merchant_id_for_user(auth.uid())
);

CREATE POLICY "Merchant admins can update payments"
ON public.square_payments FOR UPDATE
TO authenticated
USING (
    is_merchant_admin(auth.uid()) 
    AND merchant_id = get_merchant_id_for_user(auth.uid())
);

CREATE POLICY "Admins can manage square payments"
ON public.square_payments FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- =====================================================
-- RLS POLICIES FOR CARD_PRODUCTS
-- =====================================================

CREATE POLICY "Deny anonymous access to card_products"
ON public.card_products
FOR ALL TO anon
USING (false) WITH CHECK (false);

CREATE POLICY "Authenticated users can view active products"
ON public.card_products FOR SELECT
TO authenticated
USING (active = true OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage card products"
ON public.card_products FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- =====================================================
-- RLS POLICIES FOR CARD_ORDERS
-- =====================================================

CREATE POLICY "Deny anonymous access to card_orders"
ON public.card_orders
FOR ALL TO anon
USING (false) WITH CHECK (false);

CREATE POLICY "Merchant admins can view their orders"
ON public.card_orders FOR SELECT
TO authenticated
USING (
    is_merchant_admin(auth.uid()) 
    AND merchant_id = get_merchant_id_for_user(auth.uid())
);

CREATE POLICY "Merchant admins can create orders"
ON public.card_orders FOR INSERT
TO authenticated
WITH CHECK (
    is_merchant_admin(auth.uid()) 
    AND merchant_id = get_merchant_id_for_user(auth.uid())
);

CREATE POLICY "Admins can manage card orders"
ON public.card_orders FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- =====================================================
-- RLS POLICIES FOR MERCHANT_AUDIT_LOGS
-- =====================================================

CREATE POLICY "Deny anonymous access to merchant_audit_logs"
ON public.merchant_audit_logs
FOR ALL TO anon
USING (false) WITH CHECK (false);

CREATE POLICY "Merchant admins can view their audit logs"
ON public.merchant_audit_logs FOR SELECT
TO authenticated
USING (
    is_merchant_admin(auth.uid()) 
    AND merchant_id = get_merchant_id_for_user(auth.uid())
);

CREATE POLICY "Merchant users can insert audit logs"
ON public.merchant_audit_logs FOR INSERT
TO authenticated
WITH CHECK (
    is_merchant_cashier_or_admin(auth.uid()) 
    AND merchant_id = get_merchant_id_for_user(auth.uid())
);

CREATE POLICY "Admins can manage merchant audit logs"
ON public.merchant_audit_logs FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- =====================================================
-- RLS POLICIES FOR BITCARD_ACTIVATION_EVENTS
-- =====================================================

CREATE POLICY "Deny anonymous access to bitcard_activation_events"
ON public.bitcard_activation_events
FOR ALL TO anon
USING (false) WITH CHECK (false);

CREATE POLICY "Merchant users can view their activation events"
ON public.bitcard_activation_events FOR SELECT
TO authenticated
USING (
    merchant_id = get_merchant_id_for_user(auth.uid())
);

CREATE POLICY "Merchant users can create activation events"
ON public.bitcard_activation_events FOR INSERT
TO authenticated
WITH CHECK (
    is_merchant_cashier_or_admin(auth.uid()) 
    AND merchant_id = get_merchant_id_for_user(auth.uid())
);

CREATE POLICY "Admins can manage activation events"
ON public.bitcard_activation_events FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- =====================================================
-- RLS POLICIES FOR BITCARD_PIN_ATTEMPTS
-- =====================================================

CREATE POLICY "Deny anonymous access to bitcard_pin_attempts"
ON public.bitcard_pin_attempts
FOR ALL TO anon
USING (false) WITH CHECK (false);

CREATE POLICY "Merchant users can insert pin attempts"
ON public.bitcard_pin_attempts FOR INSERT
TO authenticated
WITH CHECK (
    is_merchant_cashier_or_admin(auth.uid()) 
    AND merchant_id = get_merchant_id_for_user(auth.uid())
);

CREATE POLICY "Merchant admins can view pin attempts"
ON public.bitcard_pin_attempts FOR SELECT
TO authenticated
USING (
    is_merchant_admin(auth.uid()) 
    AND merchant_id = get_merchant_id_for_user(auth.uid())
);

CREATE POLICY "Admins can manage pin attempts"
ON public.bitcard_pin_attempts FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- =====================================================
-- RLS POLICIES FOR BITCARDS - MERCHANT ACCESS
-- =====================================================

-- Merchant users can view their assigned bitcards
CREATE POLICY "Merchant users can view their bitcards"
ON public.bitcards FOR SELECT
TO authenticated
USING (
    merchant_id = get_merchant_id_for_user(auth.uid())
);

-- Merchant cashiers/admins can update bitcards for activation
CREATE POLICY "Merchant users can update their bitcards"
ON public.bitcards FOR UPDATE
TO authenticated
USING (
    is_merchant_cashier_or_admin(auth.uid()) 
    AND merchant_id = get_merchant_id_for_user(auth.uid())
);

-- =====================================================
-- TRIGGER: AUTO-CREATE WALLET WHEN MERCHANT IS CREATED
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_merchant_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.merchant_wallets (merchant_id, balance_usd)
    VALUES (NEW.id, 0)
    ON CONFLICT (merchant_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_merchant_wallet_trigger
AFTER INSERT ON public.merchants
FOR EACH ROW
EXECUTE FUNCTION public.create_merchant_wallet();

-- =====================================================
-- TRIGGER: UPDATE WALLET BALANCE ON LEDGER INSERT
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_wallet_on_ledger_insert()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.merchant_wallets
    SET balance_usd = balance_usd + NEW.amount_usd,
        updated_at = now()
    WHERE merchant_id = NEW.merchant_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_wallet_balance_trigger
AFTER INSERT ON public.merchant_wallet_ledger
FOR EACH ROW
EXECUTE FUNCTION public.update_wallet_on_ledger_insert();

-- =====================================================
-- CREATE WALLETS FOR EXISTING MERCHANTS
-- =====================================================
INSERT INTO public.merchant_wallets (merchant_id, balance_usd)
SELECT id, 0 FROM public.merchants
WHERE id NOT IN (SELECT merchant_id FROM public.merchant_wallets)
ON CONFLICT (merchant_id) DO NOTHING;

-- =====================================================
-- INSERT SAMPLE CARD PRODUCTS
-- =====================================================
INSERT INTO public.card_products (name, pack_size, price_usd, notes)
VALUES 
    ('Starter Pack', 10, 25.00, '10 blank-value BitCards'),
    ('Business Pack', 50, 100.00, '50 blank-value BitCards'),
    ('Enterprise Pack', 200, 350.00, '200 blank-value BitCards');
