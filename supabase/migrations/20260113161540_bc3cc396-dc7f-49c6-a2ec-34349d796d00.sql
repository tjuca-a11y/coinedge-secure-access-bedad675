-- Add column to track when KYC retry is available (cooldown period)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS kyc_retry_available_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.kyc_retry_available_at IS 'Timestamp when user can retry KYC verification after a failed attempt';