import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// =====================================================
// Treasury Hooks - BTC + USDC Inventory Management
// =====================================================

export interface TreasuryWallet {
  id: string;
  btc_address: string | null;
  usdc_address: string | null;
  asset_type: 'BTC' | 'USDC';
  label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsdcInventoryLot {
  id: string;
  treasury_wallet_id: string;
  amount_usdc_total: number;
  amount_usdc_available: number;
  source: 'manual_topup' | 'user_sell' | 'exchange_withdraw' | 'other';
  reference_id: string | null;
  notes: string | null;
  created_by_admin_id: string | null;
  received_at: string;
  created_at: string;
}

export interface UsdcInventoryStats {
  total_usdc: number;
  available_usdc: number;
  lots_count: number;
}

export interface UserBankAccount {
  id: string;
  user_id: string;
  bank_name: string;
  account_mask: string;
  account_type: 'checking' | 'savings';
  is_verified: boolean;
  is_primary: boolean;
  created_at: string;
}

export interface CashoutOrder {
  id: string;
  order_id: string;
  user_id: string;
  bank_account_id: string;
  source_asset: 'BTC' | 'USDC';
  source_amount: number;
  usd_amount: number;
  fee_usd: number;
  conversion_rate: number | null;
  status: 'PENDING' | 'PROCESSING' | 'ACH_INITIATED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  plaid_transfer_id: string | null;
  failed_reason: string | null;
  estimated_arrival: string | null;
  created_at: string;
  completed_at: string | null;
}

// =====================================================
// USDC Inventory Hooks
// =====================================================

export const useUsdcInventoryLots = () => {
  return useQuery({
    queryKey: ['usdc-inventory-lots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usdc_inventory_lots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UsdcInventoryLot[];
    },
  });
};

export const useUsdcInventoryStats = () => {
  return useQuery({
    queryKey: ['usdc-inventory-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_usdc_inventory_stats');
      if (error) throw error;
      const stats = Array.isArray(data) ? data[0] : data;
      return {
        total_usdc: Number(stats?.total_usdc || 0),
        available_usdc: Number(stats?.available_usdc || 0),
        lots_count: Number(stats?.lots_count || 0),
      } as UsdcInventoryStats;
    },
    refetchInterval: 30000,
  });
};

export const useCreateUsdcInventoryLot = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (lot: {
      treasury_wallet_id: string;
      amount_usdc_total: number;
      source: 'manual_topup' | 'user_sell' | 'exchange_withdraw' | 'other';
      reference_id?: string;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('usdc_inventory_lots')
        .insert({
          ...lot,
          amount_usdc_available: lot.amount_usdc_total,
          created_by_admin_id: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usdc-inventory-lots'] });
      queryClient.invalidateQueries({ queryKey: ['usdc-inventory-stats'] });
      toast({ title: 'USDC inventory lot created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error creating USDC lot', description: error.message, variant: 'destructive' });
    },
  });
};

// =====================================================
// Bank Account Hooks
// =====================================================

export const useUserBankAccounts = () => {
  return useQuery({
    queryKey: ['user-bank-accounts'],
    queryFn: async () => {
      // Use the secure view that excludes sensitive columns like plaid_access_token
      const { data, error } = await supabase
        .from('user_bank_accounts_public')
        .select('id, bank_name, account_mask, account_type, is_verified, is_primary, created_at, user_id')
        .order('is_primary', { ascending: false });

      if (error) throw error;
      return data as UserBankAccount[];
    },
  });
};

export const useRemoveBankAccount = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from('user_bank_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bank-accounts'] });
      toast({ title: 'Bank account removed' });
    },
    onError: (error) => {
      toast({ title: 'Error removing account', description: error.message, variant: 'destructive' });
    },
  });
};

// =====================================================
// Cashout Order Hooks
// =====================================================

export const useCashoutOrders = (filters?: { userId?: string; status?: string }) => {
  return useQuery({
    queryKey: ['cashout-orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('cashout_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CashoutOrder[];
    },
  });
};

export const useCreateCashoutOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (order: {
      bank_account_id: string;
      source_asset: 'BTC' | 'USDC';
      source_amount: number;
      usd_amount: number;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Calculate fee (0.5% min $1)
      const fee_usd = Math.max(1, order.usd_amount * 0.005);

      // Calculate estimated arrival (3 business days)
      const arrivalDate = new Date();
      let daysAdded = 0;
      while (daysAdded < 3) {
        arrivalDate.setDate(arrivalDate.getDate() + 1);
        const day = arrivalDate.getDay();
        if (day !== 0 && day !== 6) daysAdded++;
      }

      const { data, error } = await supabase
        .from('cashout_orders')
        .insert({
          user_id: user.user.id,
          ...order,
          fee_usd,
          estimated_arrival: arrivalDate.toISOString().split('T')[0],
          status: 'PENDING',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashout-orders'] });
      toast({ 
        title: 'Cash-out order created',
        description: 'Your transfer will be processed within 1-3 business days.'
      });
    },
    onError: (error) => {
      toast({ title: 'Error creating cash-out order', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateCashoutOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { 
      id: string; 
      updates: Partial<CashoutOrder>;
    }) => {
      const { data, error } = await supabase
        .from('cashout_orders')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashout-orders'] });
      toast({ title: 'Cash-out order updated' });
    },
    onError: (error) => {
      toast({ title: 'Error updating order', description: error.message, variant: 'destructive' });
    },
  });
};

// =====================================================
// Company USDC Hooks (Operational Funds)
// =====================================================

export interface CompanyUsdcBalance {
  id: string;
  balance_usdc: number;
  last_updated_at: string;
  updated_by_admin_id: string | null;
}

export interface CompanyUsdcLedgerEntry {
  id: string;
  amount_usdc: number;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'FEE_COLLECTION' | 'OPERATIONAL_EXPENSE' | 'ADJUSTMENT';
  reference: string | null;
  notes: string | null;
  created_at: string;
  created_by_admin_id: string | null;
}

export const useCompanyUsdcBalance = () => {
  return useQuery({
    queryKey: ['company-usdc-balance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_usdc_balance')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data as CompanyUsdcBalance;
    },
    refetchInterval: 30000,
  });
};

export const useCompanyUsdcLedger = () => {
  return useQuery({
    queryKey: ['company-usdc-ledger'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_usdc_ledger')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as CompanyUsdcLedgerEntry[];
    },
  });
};

export const useUpdateCompanyUsdcBalance = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      amount, 
      type,
      reference,
      notes 
    }: { 
      amount: number;
      type: 'DEPOSIT' | 'WITHDRAWAL' | 'FEE_COLLECTION' | 'OPERATIONAL_EXPENSE' | 'ADJUSTMENT';
      reference?: string;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();

      // Get current balance
      const { data: currentBalance, error: balanceError } = await supabase
        .from('company_usdc_balance')
        .select('*')
        .limit(1)
        .single();

      if (balanceError) throw balanceError;

      // Calculate new balance
      const isDebit = ['WITHDRAWAL', 'OPERATIONAL_EXPENSE'].includes(type);
      const newBalance = isDebit 
        ? Number(currentBalance.balance_usdc) - Math.abs(amount)
        : Number(currentBalance.balance_usdc) + Math.abs(amount);

      // Update balance
      const { error: updateError } = await supabase
        .from('company_usdc_balance')
        .update({ 
          balance_usdc: newBalance, 
          last_updated_at: new Date().toISOString(),
          updated_by_admin_id: user.user?.id 
        })
        .eq('id', currentBalance.id);

      if (updateError) throw updateError;

      // Record ledger entry
      const { data: ledgerEntry, error: ledgerError } = await supabase
        .from('company_usdc_ledger')
        .insert({
          amount_usdc: isDebit ? -Math.abs(amount) : Math.abs(amount),
          type,
          reference,
          notes,
          created_by_admin_id: user.user?.id,
        })
        .select()
        .single();

      if (ledgerError) throw ledgerError;
      return ledgerEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-usdc-balance'] });
      queryClient.invalidateQueries({ queryKey: ['company-usdc-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['treasury-overview'] });
      toast({ title: 'Company USDC balance updated' });
    },
    onError: (error) => {
      toast({ title: 'Error updating balance', description: error.message, variant: 'destructive' });
    },
  });
};

// =====================================================
// Combined Treasury Stats
// =====================================================

export const useTreasuryOverview = () => {
  return useQuery({
    queryKey: ['treasury-overview'],
    queryFn: async () => {
      // Get BTC stats
      const { data: btcStats } = await supabase.rpc('get_inventory_stats');
      const btc = Array.isArray(btcStats) ? btcStats[0] : btcStats;

      // Get USDC stats
      const { data: usdcStats } = await supabase.rpc('get_usdc_inventory_stats');
      const usdc = Array.isArray(usdcStats) ? usdcStats[0] : usdcStats;

      // Get company USDC balance
      const { data: companyUsdc } = await supabase
        .from('company_usdc_balance')
        .select('balance_usdc')
        .limit(1)
        .single();

      // Get pending cashouts
      const { count: pendingCashouts } = await supabase
        .from('cashout_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['PENDING', 'PROCESSING', 'ACH_INITIATED']);

      return {
        btc: {
          total: Number(btc?.total_btc || 0),
          eligible: Number(btc?.eligible_btc || 0),
          locked: Number(btc?.locked_btc || 0),
        },
        usdc: {
          total: Number(usdc?.total_usdc || 0),
          available: Number(usdc?.available_usdc || 0),
        },
        companyUsdc: Number(companyUsdc?.balance_usdc || 0),
        pendingCashouts: pendingCashouts || 0,
      };
    },
    refetchInterval: 30000,
  });
};
