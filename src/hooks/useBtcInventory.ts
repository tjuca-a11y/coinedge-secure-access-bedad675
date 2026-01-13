import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TreasuryWallet {
  id: string;
  btc_address: string | null;
  label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryLot {
  id: string;
  treasury_wallet_id: string;
  received_at: string;
  eligible_at: string;
  amount_btc_total: number;
  amount_btc_available: number;
  source: 'manual_topup' | 'exchange_withdraw' | 'other';
  reference_id: string | null;
  notes: string | null;
  created_by_admin_id: string | null;
  created_at: string;
}

export interface InventoryStats {
  total_btc: number;
  eligible_btc: number;
  locked_btc: number;
  eligible_lots_count: number;
  locked_lots_count: number;
}

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FulfillmentOrder {
  id: string;
  order_type: 'BITCARD_REDEMPTION' | 'BUY_ORDER';
  customer_id: string | null;
  merchant_id: string | null;
  sales_rep_id: string | null;
  bitcard_id: string | null;
  usd_value: number;
  destination_wallet_address: string;
  kyc_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  btc_amount: number | null;
  btc_price_used: number | null;
  status: 'SUBMITTED' | 'KYC_PENDING' | 'WAITING_INVENTORY' | 'READY_TO_SEND' | 'SENDING' | 'SENT' | 'FAILED' | 'HOLD';
  blocked_reason: string | null;
  tx_hash: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  merchants?: { id: string; business_name: string } | null;
  sales_reps?: { id: string; full_name: string } | null;
  profiles?: { id: string; full_name: string } | null;
}

export interface DailyBtcSend {
  id: string;
  send_date: string;
  total_btc_sent: number;
  transaction_count: number;
}

// Treasury Wallet
export const useTreasuryWallet = () => {
  return useQuery({
    queryKey: ['treasury-wallet'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treasury_wallet')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as TreasuryWallet | null;
    },
  });
};

export const useCreateTreasuryWallet = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (wallet: { btc_address?: string; label?: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('treasury_wallet')
        .insert({
          ...wallet,
          fireblocks_vault_id: 'coinedge-treasury', // Legacy field - kept for DB compatibility
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury-wallet'] });
      toast({ title: 'Treasury wallet created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error creating treasury wallet', description: error.message, variant: 'destructive' });
    },
  });
};

// Inventory Lots
export const useInventoryLots = () => {
  return useQuery({
    queryKey: ['inventory-lots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_lots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InventoryLot[];
    },
  });
};

export const useInventoryStats = () => {
  return useQuery({
    queryKey: ['inventory-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inventory_stats');
      if (error) throw error;
      // The RPC returns an array, take first row
      const stats = Array.isArray(data) ? data[0] : data;
      return {
        total_btc: Number(stats?.total_btc || 0),
        eligible_btc: Number(stats?.eligible_btc || 0),
        locked_btc: Number(stats?.locked_btc || 0),
        eligible_lots_count: Number(stats?.eligible_lots_count || 0),
        locked_lots_count: Number(stats?.locked_lots_count || 0),
      } as InventoryStats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useCreateInventoryLot = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (lot: {
      treasury_wallet_id: string;
      amount_btc_total: number;
      received_at?: string;
      source: 'manual_topup' | 'exchange_withdraw' | 'other';
      reference_id?: string;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('inventory_lots')
        .insert({
          ...lot,
          amount_btc_available: lot.amount_btc_total,
          created_by_admin_id: user.user?.id,
          received_at: lot.received_at || new Date().toISOString(),
          eligible_at: new Date().toISOString(), // Will be overwritten by trigger
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-lots'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      toast({ title: 'Inventory lot created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error creating inventory lot', description: error.message, variant: 'destructive' });
    },
  });
};

// System Settings
export const useSystemSettings = () => {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;
      return data as SystemSetting[];
    },
  });
};

export const useUpdateSystemSetting = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('system_settings')
        .update({ setting_value: value, updated_by: user.user?.id })
        .eq('setting_key', key)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast({ title: `Setting ${variables.key} updated` });
    },
    onError: (error) => {
      toast({ title: 'Error updating setting', description: error.message, variant: 'destructive' });
    },
  });
};

// Fulfillment Orders
export const useFulfillmentOrders = (filters?: { status?: string; merchantId?: string }) => {
  return useQuery({
    queryKey: ['fulfillment-orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('fulfillment_orders')
        .select(`
          *,
          merchants(id, business_name),
          sales_reps(id, full_name),
          profiles(id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status as FulfillmentOrder['status']);
      }
      if (filters?.merchantId) {
        query = query.eq('merchant_id', filters.merchantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FulfillmentOrder[];
    },
  });
};

export const useUpdateFulfillmentOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { 
      id: string; 
      updates: Partial<FulfillmentOrder>;
    }) => {
      const { data, error } = await supabase
        .from('fulfillment_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fulfillment-orders'] });
      toast({ title: 'Fulfillment order updated' });
    },
    onError: (error) => {
      toast({ title: 'Error updating order', description: error.message, variant: 'destructive' });
    },
  });
};

// Daily BTC Sends
export const useDailyBtcSends = () => {
  return useQuery({
    queryKey: ['daily-btc-sends'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_btc_sends')
        .select('*')
        .order('send_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data as DailyBtcSend[];
    },
  });
};

// Sent Transfers (for Transfer Log)
export const useSentTransfers = () => {
  return useQuery({
    queryKey: ['sent-transfers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fulfillment_orders')
        .select(`
          *,
          merchants(id, business_name),
          profiles(id, full_name)
        `)
        .in('status', ['SENT', 'SENDING', 'FAILED'])
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as FulfillmentOrder[];
    },
  });
};

// Lot Allocations
export const useLotAllocations = (fulfillmentId?: string) => {
  return useQuery({
    queryKey: ['lot-allocations', fulfillmentId],
    queryFn: async () => {
      let query = supabase
        .from('lot_allocations')
        .select('*, inventory_lots(id, amount_btc_total, received_at)')
        .eq('is_reversed', false)
        .order('created_at', { ascending: false });

      if (fulfillmentId) {
        query = query.eq('fulfillment_id', fulfillmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!fulfillmentId || fulfillmentId === undefined,
  });
};
