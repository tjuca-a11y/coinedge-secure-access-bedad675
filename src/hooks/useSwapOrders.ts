import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDynamicWallet } from "@/contexts/DynamicWalletContext";
import { useEffect } from "react";

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
  const { syncedProfile, isAuthenticated: isDynamicAuthenticated } = useDynamicWallet();
  const queryClient = useQueryClient();

  // For Dynamic users, use the user_id from syncedProfile
  // For Supabase users, use user.id
  const userId = isDynamicAuthenticated ? syncedProfile?.userId : user?.id;

  // Set up real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`swap-orders-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_swap_orders',
          filter: `customer_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Swap order update:', payload);
          // Invalidate the query to refetch data
          queryClient.invalidateQueries({ queryKey: ["swap-orders", userId] });
          queryClient.invalidateQueries({ queryKey: ["swap-orders-pending", userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return useQuery({
    queryKey: ["swap-orders", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("customer_swap_orders")
        .select("*")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SwapOrder[];
    },
    enabled: !!userId,
  });
};

export const usePendingSwapOrders = () => {
  const { user } = useAuth();
  const { syncedProfile, isAuthenticated: isDynamicAuthenticated } = useDynamicWallet();

  const userId = isDynamicAuthenticated ? syncedProfile?.userId : user?.id;

  return useQuery({
    queryKey: ["swap-orders-pending", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("customer_swap_orders")
        .select("*")
        .eq("customer_id", userId)
        .in("status", ["PENDING", "PROCESSING"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SwapOrder[];
    },
    enabled: !!userId,
  });
};
