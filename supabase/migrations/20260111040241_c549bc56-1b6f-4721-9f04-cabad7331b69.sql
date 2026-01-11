-- CoinEdge Admin Console Database Schema

-- 1. Create the app_role enum for the role-based access system
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'sales_rep');

-- 2. Create the rep_status enum
CREATE TYPE public.rep_status AS ENUM ('draft', 'cleared', 'active', 'disabled');

-- 3. Create the merchant_status enum
CREATE TYPE public.merchant_status AS ENUM ('lead', 'invited', 'onboarding_started', 'kyc_pending', 'approved', 'active', 'paused');

-- 4. Create the invite_status enum
CREATE TYPE public.invite_status AS ENUM ('created', 'sent', 'opened', 'started', 'completed', 'expired');

-- 5. Create the bitcard_status enum
CREATE TYPE public.bitcard_status AS ENUM ('issued', 'active', 'redeemed', 'expired', 'canceled');

-- 6. Create the commission_status enum
CREATE TYPE public.commission_status AS ENUM ('accrued', 'approved', 'paid');

-- 7. Create the actor_type enum for audit logs
CREATE TYPE public.actor_type AS ENUM ('admin', 'system', 'sales_rep');

-- 8. Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 9. Create admin_users table for admin-specific info
CREATE TABLE public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    dob DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    force_password_reset BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- 10. Create sales_reps table
CREATE TABLE public.sales_reps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    dob DATE NOT NULL,
    status rep_status NOT NULL DEFAULT 'draft',
    force_password_reset BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- 11. Create merchants table
CREATE TABLE public.merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id TEXT NOT NULL UNIQUE,
    business_name TEXT NOT NULL,
    point_of_contact TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    street TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    status merchant_status NOT NULL DEFAULT 'lead',
    rep_id UUID REFERENCES public.sales_reps(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 12. Create merchant_timeline table for activity tracking
CREATE TABLE public.merchant_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 13. Create merchant_invites table
CREATE TABLE public.merchant_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_id TEXT NOT NULL UNIQUE,
    merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE NOT NULL,
    rep_id UUID REFERENCES public.sales_reps(id) ON DELETE SET NULL,
    invite_token TEXT NOT NULL UNIQUE,
    invite_code TEXT NOT NULL UNIQUE,
    status invite_status NOT NULL DEFAULT 'created',
    sent_to_email TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 14. Create bitcards table
CREATE TABLE public.bitcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bitcard_id TEXT NOT NULL UNIQUE,
    merchant_id UUID REFERENCES public.merchants(id) ON DELETE SET NULL,
    usd_value DECIMAL(12, 2) NOT NULL,
    status bitcard_status NOT NULL DEFAULT 'issued',
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    activated_at TIMESTAMP WITH TIME ZONE,
    redeemed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 15. Create commission_ledger table
CREATE TABLE public.commission_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commission_id TEXT NOT NULL UNIQUE,
    rep_id UUID REFERENCES public.sales_reps(id) ON DELETE SET NULL,
    merchant_id UUID REFERENCES public.merchants(id) ON DELETE SET NULL,
    bitcard_id UUID REFERENCES public.bitcards(id) ON DELETE SET NULL,
    card_value_usd DECIMAL(12, 2) NOT NULL,
    activation_fee_usd DECIMAL(12, 2) NOT NULL,
    rep_commission_usd DECIMAL(12, 2) NOT NULL,
    coinedge_revenue_usd DECIMAL(12, 2) NOT NULL,
    status commission_status NOT NULL DEFAULT 'accrued',
    activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 16. Create audit_logs table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,
    actor_type actor_type NOT NULL,
    actor_id UUID,
    action TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_reps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Create function to check if user is admin (super_admin or admin)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role IN ('super_admin', 'admin')
    )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all user roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert user roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update user roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for admin_users
CREATE POLICY "Admins can view all admin users"
ON public.admin_users FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert admin users"
ON public.admin_users FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update admin users"
ON public.admin_users FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for sales_reps
CREATE POLICY "Admins can view all sales reps"
ON public.sales_reps FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Sales reps can view their own record"
ON public.sales_reps FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can insert sales reps"
ON public.sales_reps FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update sales reps"
ON public.sales_reps FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for merchants
CREATE POLICY "Admins can view all merchants"
ON public.merchants FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Sales reps can view assigned merchants"
ON public.merchants FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sales_reps sr
        WHERE sr.user_id = auth.uid()
          AND sr.id = public.merchants.rep_id
    )
);

CREATE POLICY "Admins can insert merchants"
ON public.merchants FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update merchants"
ON public.merchants FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Sales reps can update assigned merchants"
ON public.merchants FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sales_reps sr
        WHERE sr.user_id = auth.uid()
          AND sr.id = public.merchants.rep_id
    )
);

-- RLS Policies for merchant_timeline
CREATE POLICY "Admins can view all timeline events"
ON public.merchant_timeline FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Sales reps can view timeline for their merchants"
ON public.merchant_timeline FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.merchants m
        JOIN public.sales_reps sr ON sr.id = m.rep_id
        WHERE m.id = public.merchant_timeline.merchant_id
          AND sr.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can insert timeline events"
ON public.merchant_timeline FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Sales reps can insert timeline for their merchants"
ON public.merchant_timeline FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.merchants m
        JOIN public.sales_reps sr ON sr.id = m.rep_id
        WHERE m.id = public.merchant_timeline.merchant_id
          AND sr.user_id = auth.uid()
    )
);

-- RLS Policies for merchant_invites
CREATE POLICY "Admins can view all invites"
ON public.merchant_invites FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Sales reps can view their invites"
ON public.merchant_invites FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sales_reps sr
        WHERE sr.user_id = auth.uid()
          AND sr.id = public.merchant_invites.rep_id
    )
);

CREATE POLICY "Admins can insert invites"
ON public.merchant_invites FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Sales reps can insert invites"
ON public.merchant_invites FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sales_reps sr
        WHERE sr.user_id = auth.uid()
          AND sr.id = public.merchant_invites.rep_id
    )
);

CREATE POLICY "Admins can update invites"
ON public.merchant_invites FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for bitcards
CREATE POLICY "Admins can view all bitcards"
ON public.bitcards FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Sales reps can view bitcards for their merchants"
ON public.bitcards FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.merchants m
        JOIN public.sales_reps sr ON sr.id = m.rep_id
        WHERE m.id = public.bitcards.merchant_id
          AND sr.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can insert bitcards"
ON public.bitcards FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update bitcards"
ON public.bitcards FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for commission_ledger
CREATE POLICY "Admins can view all commissions"
ON public.commission_ledger FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Sales reps can view their commissions"
ON public.commission_ledger FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sales_reps sr
        WHERE sr.user_id = auth.uid()
          AND sr.id = public.commission_ledger.rep_id
    )
);

CREATE POLICY "Admins can insert commissions"
ON public.commission_ledger FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update commissions"
ON public.commission_ledger FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for audit_logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create trigger for updating merchants updated_at
CREATE TRIGGER update_merchants_updated_at
BEFORE UPDATE ON public.merchants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate unique IDs
CREATE OR REPLACE FUNCTION public.generate_unique_id(prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN prefix || '-' || LOWER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8));
END;
$$;

-- Create function to calculate commission on bitcard activation
CREATE OR REPLACE FUNCTION public.process_bitcard_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_merchant_id UUID;
    v_rep_id UUID;
    v_activation_fee DECIMAL(12, 2);
    v_rep_commission DECIMAL(12, 2);
    v_coinedge_revenue DECIMAL(12, 2);
BEGIN
    -- Only process when status changes to 'active'
    IF NEW.status::text = 'active' AND (OLD.status IS NULL OR OLD.status::text != 'active') THEN
        -- Get merchant and rep info
        SELECT m.id, m.rep_id
        INTO v_merchant_id, v_rep_id
        FROM public.merchants m
        WHERE m.id = NEW.merchant_id;

        IF v_rep_id IS NOT NULL THEN
            -- Calculate commissions (10% activation fee, 70/30 split)
            v_activation_fee := NEW.usd_value * 0.10;
            v_coinedge_revenue := v_activation_fee * 0.70;
            v_rep_commission := v_activation_fee * 0.30;

            -- Insert commission record
            INSERT INTO public.commission_ledger (
                commission_id,
                rep_id,
                merchant_id,
                bitcard_id,
                card_value_usd,
                activation_fee_usd,
                rep_commission_usd,
                coinedge_revenue_usd,
                status,
                activated_at
            ) VALUES (
                public.generate_unique_id('comm'),
                v_rep_id,
                NEW.merchant_id,
                NEW.id,
                NEW.usd_value,
                v_activation_fee,
                v_rep_commission,
                v_coinedge_revenue,
                'accrued',
                COALESCE(NEW.activated_at, now())
            );
        END IF;

        -- Update activated_at if not set
        IF NEW.activated_at IS NULL THEN
            NEW.activated_at := now();
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger for bitcard activation
CREATE TRIGGER on_bitcard_activation
BEFORE UPDATE ON public.bitcards
FOR EACH ROW
EXECUTE FUNCTION public.process_bitcard_activation();