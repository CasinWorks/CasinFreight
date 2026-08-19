-- ==============================================================================
-- CasinFreight SaaS: Plans, Subscriptions & PayMongo Billing Schema
-- Migration: 20260819000001_create_plans_and_subscriptions.sql
-- Description: Supabase/PostgreSQL schema for Philippine trucking SaaS subscription
--              tiers, PayMongo payment integration, and Row Level Security (RLS)
-- ==============================================================================

-- 1. Create Enum Types for Subscription Lifecycle
DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM (
        'active',
        'past_due',
        'canceled',
        'trialing',
        'incomplete'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create `plans` Table
CREATE TABLE IF NOT EXISTS public.plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price_php NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    interval TEXT NOT NULL DEFAULT 'month',
    max_bookings_per_month INTEGER, -- NULL means unlimited
    max_storage_mb INTEGER,        -- NULL means unlimited
    is_active BOOLEAN NOT NULL DEFAULT true,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    paymongo_plan_id TEXT,         -- PayMongo Plan ID if using recurring billing API
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Create `subscriptions` Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id TEXT NOT NULL DEFAULT 'comp-casin-01',
    plan_id TEXT NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
    status subscription_status NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '30 days'),
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    canceled_at TIMESTAMPTZ,
    payment_provider TEXT NOT NULL DEFAULT 'paymongo',
    payment_provider_customer_id TEXT,
    payment_provider_subscription_id TEXT,
    payment_provider_checkout_id TEXT,
    last_payment_method TEXT, -- 'gcash', 'paymaya', 'card', 'qrph'
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Create `billing_history` Table (Payment Invoices & Receipts)
CREATE TABLE IF NOT EXISTS public.billing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    paymongo_payment_id TEXT,
    amount_php NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'PHP',
    status TEXT NOT NULL DEFAULT 'paid', -- 'paid', 'failed', 'refunded'
    payment_method TEXT NOT NULL,         -- 'gcash', 'paymaya', 'card', 'qrph'
    receipt_number TEXT,
    billing_period_start TIMESTAMPTZ,
    billing_period_end TIMESTAMPTZ,
    invoice_pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Seed Initial Plans (Free Tier & Founding Plan at ₱499/mo)
INSERT INTO public.plans (id, name, description, price_php, interval, max_bookings_per_month, max_storage_mb, is_active, features)
VALUES 
(
    'plan_free',
    'Free Starter',
    'Basic entry plan for small single-truck operators testing CasinFreight.',
    0.00,
    'month',
    20,      -- Capped at 20 bookings per month
    100,     -- 100 MB photo/POD document storage
    true,
    '[
        "Up to 20 trip bookings per month",
        "100 MB POD & photo storage",
        "Basic dispatch & waybill generation",
        "Single-user access",
        "Standard community support"
    ]'::jsonb
),
(
    'plan_founding',
    'Founding Plan',
    'Full-featured all-inclusive fleet operations, double-entry BIR ledger & unlimited dispatching.',
    499.00,
    'month',
    NULL,    -- Unlimited bookings
    NULL,    -- Unlimited storage
    true,
    '[
        "Unlimited trip bookings & dispatching",
        "Unlimited POD, waybill & receipt storage",
        "Full General Ledger & BIR 2307 EWT Tax Accounting",
        "Multi-role RBAC (Owner, Dispatcher, Billing, Loading)",
        "Automated accessorial calculations (Demurrage, FAF)",
        "Priority 24/7 PayMongo GCash/Maya customer support",
        "Locked founding price of ₱499/mo forever"
    ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_php = EXCLUDED.price_php,
    max_bookings_per_month = EXCLUDED.max_bookings_per_month,
    max_storage_mb = EXCLUDED.max_storage_mb,
    is_active = EXCLUDED.is_active,
    features = EXCLUDED.features,
    updated_at = timezone('utc'::text, now());

-- 6. Helper Functions for Plan Gating & RLS
CREATE OR REPLACE FUNCTION public.get_user_active_plan(p_user_id UUID)
RETURNS TABLE (
    plan_id TEXT,
    plan_name TEXT,
    price_php NUMERIC,
    status subscription_status,
    max_bookings_per_month INTEGER,
    max_storage_mb INTEGER,
    current_period_end TIMESTAMPTZ,
    is_unlimited BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS plan_id,
        p.name AS plan_name,
        p.price_php,
        COALESCE(s.status, 'active'::subscription_status) AS status,
        p.max_bookings_per_month,
        p.max_storage_mb,
        COALESCE(s.current_period_end, (now() + interval '30 days')) AS current_period_end,
        (p.max_bookings_per_month IS NULL) AS is_unlimited
    FROM public.plans p
    LEFT JOIN public.subscriptions s ON s.plan_id = p.id AND s.user_id = p_user_id
    WHERE (s.status = 'active' OR s.status = 'trialing') OR (p.id = 'plan_free' AND s.id IS NULL)
    ORDER BY s.created_at DESC NULLS LAST
    LIMIT 1;
END;
$$;

-- 7. Monthly Booking Limit Verification Function
CREATE OR REPLACE FUNCTION public.check_user_monthly_booking_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_max_bookings INTEGER;
    v_current_count INTEGER;
    v_plan_id TEXT;
BEGIN
    -- 1. Fetch user's active plan limits
    SELECT max_bookings_per_month, plan_id 
    INTO v_max_bookings, v_plan_id
    FROM public.get_user_active_plan(p_user_id);

    -- If unlimited (e.g. Founding Plan), allow immediately
    IF v_max_bookings IS NULL THEN
        RETURN TRUE;
    END IF;

    -- 2. Count bookings created by user in current calendar month
    SELECT COUNT(*) INTO v_current_count
    FROM public.trips
    WHERE (user_id = p_user_id OR company_id = (SELECT company_id FROM public.users WHERE id = p_user_id LIMIT 1))
      AND created_at >= date_trunc('month', now());

    -- 3. Check if under limit
    RETURN v_current_count < v_max_bookings;
END;
$$;

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;

-- Plans RLS: Anyone can read active plans
CREATE POLICY "Public read active plans" ON public.plans
    FOR SELECT USING (is_active = true);

-- Subscriptions RLS: Users can view their own subscription
CREATE POLICY "Users view own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Subscriptions Service Role RLS: Full access for Edge Functions (webhooks)
CREATE POLICY "Service role manages subscriptions" ON public.subscriptions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Billing History RLS: Users view own receipts
CREATE POLICY "Users view own billing history" ON public.billing_history
    FOR SELECT USING (auth.uid() = user_id);

-- 9. Gating RLS Policy on `trips` Table (Sample enforcement for new bookings)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trips') THEN
        ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Enforce plan booking cap on trip insert" ON public.trips;
        CREATE POLICY "Enforce plan booking cap on trip insert" ON public.trips
            FOR INSERT WITH CHECK (
                public.check_user_monthly_booking_limit(auth.uid())
            );
    END IF;
END $$;
