import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAdminMerchantDetail = (merchantId: string) => {
  return useQuery({
    queryKey: ['admin-merchant-detail', merchantId],
    queryFn: async () => {
      // Fetch merchant with sales rep info
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select(`
          *,
          sales_reps (
            id,
            full_name,
            email,
            phone
          )
        `)
        .eq('id', merchantId)
        .maybeSingle();

      if (merchantError) throw merchantError;
      if (!merchant) throw new Error('Merchant not found');

      // Fetch activation events for this merchant
      const { data: activations, error: activationsError } = await supabase
        .from('bitcard_activation_events')
        .select(`
          *,
          bitcards (
            bitcard_id,
            status
          ),
          merchant_users (
            full_name,
            email
          )
        `)
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (activationsError) throw activationsError;

      // Fetch timeline events
      const { data: timeline, error: timelineError } = await supabase
        .from('merchant_timeline')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (timelineError) throw timelineError;

      // Fetch merchant users (cashiers/admins)
      const { data: users, error: usersError } = await supabase
        .from('merchant_users')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch merchant wallet
      const { data: wallet, error: walletError } = await supabase
        .from('merchant_wallets')
        .select('*')
        .eq('merchant_id', merchantId)
        .maybeSingle();

      if (walletError) throw walletError;

      // Fetch card orders
      const { data: cardOrders, error: cardOrdersError } = await supabase
        .from('card_orders')
        .select(`
          *,
          card_products (
            name,
            pack_size
          )
        `)
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (cardOrdersError) throw cardOrdersError;

      // Fetch invites
      const { data: invites, error: invitesError } = await supabase
        .from('merchant_invites')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (invitesError) throw invitesError;

      // Calculate stats
      const totalActivatedUsd = activations?.reduce((sum, a) => sum + Number(a.usd_value), 0) || 0;
      const totalActivations = activations?.length || 0;

      return {
        merchant,
        activations: activations || [],
        timeline: timeline || [],
        users: users || [],
        wallet,
        cardOrders: cardOrders || [],
        invites: invites || [],
        stats: {
          totalActivatedUsd,
          totalActivations,
          walletBalance: wallet?.balance_usd || 0,
          cashCreditBalance: wallet?.cash_credit_balance || 0,
        },
      };
    },
    enabled: !!merchantId,
  });
};
