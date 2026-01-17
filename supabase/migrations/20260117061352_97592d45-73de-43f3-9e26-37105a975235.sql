-- Add category column to merchants table
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS category text;

-- Remove kyc_pending from merchant_status enum
-- First, update any existing merchants with kyc_pending status to 'approved'
UPDATE public.merchants 
SET status = 'approved' 
WHERE status = 'kyc_pending';

-- Drop the default before changing the type
ALTER TABLE public.merchants 
ALTER COLUMN status DROP DEFAULT;

-- Create a new enum type without kyc_pending
CREATE TYPE public.merchant_status_new AS ENUM (
  'lead',
  'invited',
  'onboarding_started',
  'approved',
  'active',
  'paused'
);

-- Update the column to use the new enum
ALTER TABLE public.merchants 
ALTER COLUMN status TYPE public.merchant_status_new 
USING status::text::public.merchant_status_new;

-- Set the default back
ALTER TABLE public.merchants 
ALTER COLUMN status SET DEFAULT 'lead'::public.merchant_status_new;

-- Drop the old enum and rename the new one
DROP TYPE public.merchant_status;
ALTER TYPE public.merchant_status_new RENAME TO merchant_status;