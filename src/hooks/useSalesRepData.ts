import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSalesRepAuth } from '@/contexts/SalesRepAuthContext';
import { startOfDay, startOfWeek, startOfMonth, startOfQuarter, startOfYear, subDays } from 'date-fns';

export const useSalesRepStats = () => {
  const { salesRep } = useSalesRepAuth();

  return useQuery({
    queryKey: ['sales-rep-stats', salesRep?.id],
    queryFn: async () => {
      if (!salesRep) throw new Error('No sales rep');

      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
      const monthStart = startOfMonth(now).toISOString();
      const quarterStart = startOfQuarter(now).toISOString();
      const yearStart = startOfYear(now).toISOString();

      // Fetch all commissions for this rep
      const { data: commissions, error } = await supabase
        .from('commission_ledger')
        .select('*')
        .eq('rep_id', salesRep.id);

      if (error) throw error;

      const calculateStats = (startDate: string) => {
        const filtered = commissions?.filter(c => c.activated_at >= startDate) || [];
        return {
          activatedUsd: filtered.reduce((sum, c) => sum + Number(c.card_value_usd), 0),
          cardsActivated: filtered.length,
          commissionEarned: filtered.reduce((sum, c) => sum + Number(c.rep_commission_usd), 0),
        };
      };

      return {
        today: calculateStats(todayStart),
        week: calculateStats(weekStart),
        month: calculateStats(monthStart),
        quarter: calculateStats(quarterStart),
        year: calculateStats(yearStart),
        lifetime: {
          activatedUsd: commissions?.reduce((sum, c) => sum + Number(c.card_value_usd), 0) || 0,
          cardsActivated: commissions?.length || 0,
          commissionEarned: commissions?.reduce((sum, c) => sum + Number(c.rep_commission_usd), 0) || 0,
        },
      };
    },
    enabled: !!salesRep,
  });
};

export const useSalesRepMerchants = () => {
  const { salesRep } = useSalesRepAuth();

  return useQuery({
    queryKey: ['sales-rep-merchants', salesRep?.id],
    queryFn: async () => {
      if (!salesRep) throw new Error('No sales rep');

      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('rep_id', salesRep.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!salesRep,
  });
};

export const useSalesRepMerchantDetail = (merchantId: string) => {
  const { salesRep } = useSalesRepAuth();

  return useQuery({
    queryKey: ['sales-rep-merchant-detail', merchantId],
    queryFn: async () => {
      if (!salesRep) throw new Error('No sales rep');

      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', merchantId)
        .eq('rep_id', salesRep.id)
        .single();

      if (merchantError) throw merchantError;

      // Fetch bitcards for this merchant
      const { data: bitcards, error: bitcardsError } = await supabase
        .from('bitcards')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (bitcardsError) throw bitcardsError;

      // Fetch commissions for this merchant
      const { data: commissions, error: commissionsError } = await supabase
        .from('commission_ledger')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('rep_id', salesRep.id)
        .order('created_at', { ascending: false });

      if (commissionsError) throw commissionsError;

      // Fetch timeline
      const { data: timeline, error: timelineError } = await supabase
        .from('merchant_timeline')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (timelineError) throw timelineError;

      // Fetch invites
      const { data: invites, error: invitesError } = await supabase
        .from('merchant_invites')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (invitesError) throw invitesError;

      // Fetch merchant wallet for cash credit balance
      const { data: wallet, error: walletError } = await supabase
        .from('merchant_wallets')
        .select('cash_credit_balance')
        .eq('merchant_id', merchantId)
        .maybeSingle();

      if (walletError) throw walletError;

      return {
        merchant,
        bitcards: bitcards || [],
        commissions: commissions || [],
        timeline: timeline || [],
        invites: invites || [],
        cashCreditBalance: wallet?.cash_credit_balance || 0,
      };
    },
    enabled: !!salesRep && !!merchantId,
  });
};

export const useSalesRepCommissions = () => {
  const { salesRep } = useSalesRepAuth();

  return useQuery({
    queryKey: ['sales-rep-commissions', salesRep?.id],
    queryFn: async () => {
      if (!salesRep) throw new Error('No sales rep');

      const { data, error } = await supabase
        .from('commission_ledger')
        .select(`
          *,
          merchants (
            id,
            business_name,
            merchant_id
          ),
          bitcards (
            bitcard_id
          )
        `)
        .eq('rep_id', salesRep.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!salesRep,
  });
};

export const useSalesRepTrendData = (period: 'daily' | 'weekly' | 'monthly') => {
  const { salesRep } = useSalesRepAuth();

  return useQuery({
    queryKey: ['sales-rep-trends', salesRep?.id, period],
    queryFn: async () => {
      if (!salesRep) throw new Error('No sales rep');

      const daysBack = period === 'daily' ? 30 : period === 'weekly' ? 84 : 365;
      const startDate = subDays(new Date(), daysBack).toISOString();

      const { data, error } = await supabase
        .from('commission_ledger')
        .select('card_value_usd, rep_commission_usd, activated_at')
        .eq('rep_id', salesRep.id)
        .gte('activated_at', startDate)
        .order('activated_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!salesRep,
  });
};

export const useMerchantInvites = (merchantId: string) => {
  return useQuery({
    queryKey: ['merchant-invites', merchantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchant_invites')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!merchantId,
  });
};
