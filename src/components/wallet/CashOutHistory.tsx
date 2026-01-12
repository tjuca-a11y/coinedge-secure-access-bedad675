import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Clock, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { useCashoutOrders } from "@/hooks/useTreasury";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow, format } from "date-fns";

const statusConfig: Record<string, { color: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType; label: string }> = {
  PENDING: { color: 'secondary', icon: Clock, label: 'Pending' },
  PROCESSING: { color: 'default', icon: Loader2, label: 'Processing' },
  ACH_INITIATED: { color: 'default', icon: Building2, label: 'ACH Initiated' },
  COMPLETED: { color: 'default', icon: CheckCircle, label: 'Completed' },
  FAILED: { color: 'destructive', icon: XCircle, label: 'Failed' },
  CANCELLED: { color: 'outline', icon: XCircle, label: 'Cancelled' },
};

export const CashOutHistory: React.FC = () => {
  const { user } = useAuth();
  const { data: orders, isLoading, refetch } = useCashoutOrders(
    user ? { userId: user.id } : undefined
  );

  if (!user) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Cash-Out History</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map((order) => {
              const config = statusConfig[order.status] || statusConfig.PENDING;
              const StatusIcon = config.icon;
              const isAnimated = order.status === 'PROCESSING';

              return (
                <div
                  key={order.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">${order.usd_amount.toFixed(2)}</p>
                      <span className="text-xs text-muted-foreground">
                        from {order.source_asset}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                      {order.estimated_arrival && order.status !== 'COMPLETED' && (
                        <> • ETA: {format(new Date(order.estimated_arrival), 'MMM d')}</>
                      )}
                    </p>
                  </div>
                  <Badge variant={config.color} className="flex items-center gap-1">
                    <StatusIcon className={`h-3 w-3 ${isAnimated ? 'animate-spin' : ''}`} />
                    {config.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No cash-out orders yet</p>
            <p className="text-xs">Cash out your crypto to your bank account</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
