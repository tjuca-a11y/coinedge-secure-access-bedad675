import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ReconciliationRecord {
  id: string;
  reconciliation_id: string;
  asset_type: 'BTC' | 'USDC' | 'COMPANY_USDC';
  onchain_balance: number;
  database_balance: number;
  discrepancy: number;
  discrepancy_pct: number;
  status: 'PENDING' | 'MATCHED' | 'DISCREPANCY' | 'RESOLVED';
  notes: string | null;
  created_at: string;
  created_by_admin_id: string | null;
  resolved_at: string | null;
  resolved_by_admin_id: string | null;
}

export const useReconciliationRecords = () => {
  return useQuery({
    queryKey: ['reconciliation-records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treasury_reconciliation')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ReconciliationRecord[];
    },
  });
};

export const useLatestReconciliation = () => {
  return useQuery({
    queryKey: ['latest-reconciliation'],
    queryFn: async () => {
      // Get latest for each asset type
      const { data, error } = await supabase
        .from('treasury_reconciliation')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Group by asset type, taking the latest
      const latestByAsset: Record<string, ReconciliationRecord> = {};
      for (const record of (data as ReconciliationRecord[])) {
        if (!latestByAsset[record.asset_type]) {
          latestByAsset[record.asset_type] = record;
        }
      }
      
      return latestByAsset;
    },
  });
};

export const useCreateReconciliation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (record: {
      asset_type: 'BTC' | 'USDC' | 'COMPANY_USDC';
      onchain_balance: number;
      database_balance: number;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Determine status based on discrepancy
      const discrepancy = record.onchain_balance - record.database_balance;
      const discrepancyPct = record.database_balance !== 0 
        ? Math.abs((discrepancy / record.database_balance) * 100) 
        : 0;
      
      // If within 0.01% tolerance, consider matched
      const status = discrepancyPct < 0.01 ? 'MATCHED' : 'DISCREPANCY';

      const { data, error } = await supabase
        .from('treasury_reconciliation')
        .insert({
          ...record,
          status,
          created_by_admin_id: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-records'] });
      queryClient.invalidateQueries({ queryKey: ['latest-reconciliation'] });
      toast({ 
        title: 'Reconciliation recorded',
        description: `Status: ${data.status}`,
        variant: data.status === 'DISCREPANCY' ? 'destructive' : 'default',
      });
    },
    onError: (error) => {
      toast({ title: 'Error creating reconciliation', description: error.message, variant: 'destructive' });
    },
  });
};

export const useResolveReconciliation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('treasury_reconciliation')
        .update({
          status: 'RESOLVED',
          resolved_at: new Date().toISOString(),
          resolved_by_admin_id: user.user?.id,
          notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-records'] });
      queryClient.invalidateQueries({ queryKey: ['latest-reconciliation'] });
      toast({ title: 'Discrepancy marked as resolved' });
    },
    onError: (error) => {
      toast({ title: 'Error resolving', description: error.message, variant: 'destructive' });
    },
  });
};
