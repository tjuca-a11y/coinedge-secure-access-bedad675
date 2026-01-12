import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SwapOrder {
  id: string;
  order_id: string;
  order_type: "BUY_BTC" | "SELL_BTC";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  btc_amount: number;
  usdc_amount: number;
  btc_price_at_order: number;
  fee_usdc: number;
  destination_address: string | null;
  tx_hash: string | null;
  created_at: string;
  completed_at: string | null;
  failed_reason: string | null;
}

export const useSwapOrders = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["swap-orders", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("customer_swap_orders")
        .select("*")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SwapOrder[];
    },
    enabled: !!user,
  });
};

export const usePendingSwapOrders = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["swap-orders-pending", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("customer_swap_orders")
        .select("*")
        .eq("customer_id", user.id)
        .in("status", ["PENDING", "PROCESSING"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SwapOrder[];
    },
    enabled: !!user,
  });
};
