import React from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuditLogs } from '@/hooks/useAdminStats';
import { format } from 'date-fns';

const AdminAuditLogs: React.FC = () => {
  const { data: logs, isLoading } = useAuditLogs();

  const getActorBadgeVariant = (actorType: string) => {
    switch (actorType) {
      case 'admin':
        return 'default';
      case 'system':
        return 'secondary';
      case 'sales_rep':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatAction = (action: string) => {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <AdminLayout title="Audit Logs" subtitle="Track all administrative actions and system events">
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : logs && logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event ID</TableHead>
                  <TableHead>Actor Type</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">{log.event_id}</TableCell>
                    <TableCell>
                      <Badge variant={getActorBadgeVariant(log.actor_type)}>
                        {log.actor_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{formatAction(log.action)}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {log.metadata ? JSON.stringify(log.metadata) : '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No audit logs found.
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminAuditLogs;
