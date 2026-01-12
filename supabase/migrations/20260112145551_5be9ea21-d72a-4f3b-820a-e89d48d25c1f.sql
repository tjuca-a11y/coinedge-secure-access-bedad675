-- Create enum for swap order type
CREATE TYPE public.swap_order_type AS ENUM ('BUY_BTC', 'SELL_BTC');

-- Create enum for swap order status
CREATE TYPE public.swap_order_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- Create customer_swap_orders table
-- When customers buy BTC, they spend USDC and receive BTC from CoinEdge inventory
-- When customers sell BTC, they spend BTC and receive USDC from CoinEdge inventory
CREATE TABLE public.customer_swap_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE DEFAULT ('SWP-' || substring(gen_random_uuid()::text from 1 for 8)),
  customer_id UUID NOT NULL,
  order_type swap_order_type NOT NULL,
  
  -- Amounts
  btc_amount NUMERIC(18, 8) NOT NULL,
  usdc_amount NUMERIC(18, 2) NOT NULL,
  btc_price_at_order NUMERIC(18, 2) NOT NULL,
  fee_usdc NUMERIC(18, 2) NOT NULL DEFAULT 0,
  
  -- Status
  status swap_order_status NOT NULL DEFAULT 'PENDING',
  
  -- For BUY_BTC: customer's BTC address where we send BTC
  -- For SELL_BTC: customer's USDC address where we send USDC
  destination_address TEXT,
  
  -- Transaction tracking
  tx_hash TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_swap_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own orders
CREATE POLICY "Users can view their own swap orders"
ON public.customer_swap_orders
FOR SELECT
USING (auth.uid() = customer_id);

-- Users can create their own orders
CREATE POLICY "Users can create their own swap orders"
ON public.customer_swap_orders
FOR INSERT
WITH CHECK (auth.uid() = customer_id);

-- Admins can view all orders
CREATE POLICY "Admins can view all swap orders"
ON public.customer_swap_orders
FOR SELECT
USING (is_admin(auth.uid()));

-- Admins can update orders (for processing)
CREATE POLICY "Admins can update swap orders"
ON public.customer_swap_orders
FOR UPDATE
USING (is_admin(auth.uid()));

-- Deny anonymous access
CREATE POLICY "Deny anonymous access to customer_swap_orders"
ON public.customer_swap_orders
FOR ALL
USING (false)
WITH CHECK (false);

-- Create trigger for updated_at
CREATE TRIGGER update_customer_swap_orders_updated_at
BEFORE UPDATE ON public.customer_swap_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index on customer_id for faster lookups
CREATE INDEX idx_customer_swap_orders_customer_id ON public.customer_swap_orders(customer_id);

-- Add index on status for queue processing
CREATE INDEX idx_customer_swap_orders_status ON public.customer_swap_orders(status);