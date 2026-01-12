import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminNotification {
  id: string;
  notification_id: string;
  type: 'LOW_BTC_INVENTORY' | 'LOW_USDC_INVENTORY' | 'LOW_COMPANY_USDC' | 'FULFILLMENT_FAILED' | 'CASHOUT_FAILED' | 'SYSTEM_ALERT';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  read_at: string | null;
  dismissed_at: string | null;
}

export const useAdminNotifications = (options?: { unreadOnly?: boolean }) => {
  return useQuery({
    queryKey: ['admin-notifications', options],
    queryFn: async () => {
      let query = supabase
        .from('admin_notifications')
        .select('*')
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (options?.unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AdminNotification[];
    },
    refetchInterval: 30000, // Check every 30 seconds
  });
};

export const useUnreadNotificationCount = () => {
  return useQuery({
    queryKey: ['admin-notifications-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('admin_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('is_dismissed', false);

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-count'] });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-count'] });
      toast({ title: 'All notifications marked as read' });
    },
  });
};

export const useDismissNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('admin_notifications')
        .update({ 
          is_dismissed: true, 
          dismissed_at: new Date().toISOString(),
          dismissed_by_admin_id: user.user?.id,
        })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-count'] });
    },
  });
};

export const useCreateNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notification: {
      type: AdminNotification['type'];
      severity: AdminNotification['severity'];
      title: string;
      message: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from('admin_notifications')
        .insert([{
          type: notification.type,
          severity: notification.severity,
          title: notification.title,
          message: notification.message,
          metadata: notification.metadata ? JSON.parse(JSON.stringify(notification.metadata)) : null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-count'] });
    },
  });
};
