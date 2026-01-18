import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalBitcardsActivated: number;
  totalActivatedUsd: number;
  totalActivationFees: number;
  coinedgeRevenue: number;
  totalRepCommissions: number;
  merchantCount: number;
  salesRepCount: number;
  pendingApprovalCount: number;
  totalMerchantCashCredit: number;
}

export const useAdminStats = () => {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      // Fetch bitcards stats
      const { data: bitcards, error: bitcardsError } = await supabase
        .from('bitcards')
        .select('usd_value, status');

      if (bitcardsError) throw bitcardsError;

      const activatedBitcards = bitcards?.filter(b => b.status === 'active') || [];
      const totalActivatedUsd = activatedBitcards.reduce((sum, b) => sum + Number(b.usd_value), 0);
      const totalActivationFees = totalActivatedUsd * 0.10;
      const coinedgeRevenue = totalActivationFees * 0.70;
      const totalRepCommissions = totalActivationFees * 0.30;

      // Fetch merchant count
      const { count: merchantCount } = await supabase
        .from('merchants')
        .select('*', { count: 'exact', head: true });

      // Fetch sales rep count
      const { count: salesRepCount } = await supabase
        .from('sales_reps')
        .select('*', { count: 'exact', head: true });

      // Fetch pending approval count (merchants awaiting activation)
      const { count: pendingApprovalCount } = await supabase
        .from('merchants')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      // Fetch total merchant cash credit liability
      const { data: wallets, error: walletsError } = await supabase
        .from('merchant_wallets')
        .select('cash_credit_balance');
      
      if (walletsError) throw walletsError;
      
      const totalMerchantCashCredit = wallets?.reduce((sum, w) => sum + Number(w.cash_credit_balance || 0), 0) || 0;

      return {
        totalBitcardsActivated: activatedBitcards.length,
        totalActivatedUsd,
        totalActivationFees,
        coinedgeRevenue,
        totalRepCommissions,
        merchantCount: merchantCount || 0,
        salesRepCount: salesRepCount || 0,
        pendingApprovalCount: pendingApprovalCount || 0,
        totalMerchantCashCredit,
      };
    },
  });
};

export const useMerchants = () => {
  return useQuery({
    queryKey: ['admin-merchants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchants')
        .select(`
          *,
          sales_reps (
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useSalesReps = () => {
  return useQuery({
    queryKey: ['admin-sales-reps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_reps')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useBitcards = () => {
  return useQuery({
    queryKey: ['admin-bitcards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bitcards')
        .select(`
          *,
          merchants (
            id,
            business_name,
            merchant_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useCommissions = () => {
  return useQuery({
    queryKey: ['admin-commissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_ledger')
        .select(`
          *,
          sales_reps (
            id,
            full_name,
            email
          ),
          merchants (
            id,
            business_name
          ),
          bitcards (
            bitcard_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useAuditLogs = () => {
  return useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });
};

export const useMerchantInvites = () => {
  return useQuery({
    queryKey: ['admin-merchant-invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchant_invites')
        .select(`
          *,
          merchants (
            id,
            business_name
          ),
          sales_reps (
            id,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};
