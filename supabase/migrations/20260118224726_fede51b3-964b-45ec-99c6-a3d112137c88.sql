-- Add redemption_fee_rate to lock in the fee at time of purchase
ALTER TABLE public.bitcard_activation_events
ADD COLUMN IF NOT EXISTS redemption_fee_rate numeric DEFAULT 0.0875;

-- Add comment for clarity
COMMENT ON COLUMN public.bitcard_activation_events.redemption_fee_rate IS 'The redemption fee rate (default 8.75%) locked in at time of card activation';