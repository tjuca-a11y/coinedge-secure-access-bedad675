import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSwapOrders, SwapOrder } from "@/hooks/useSwapOrders";
import { ArrowDownLeft, ArrowUpRight, Clock, CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";
import { format } from "date-fns";

const statusConfig: Record<SwapOrder["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  PENDING: { label: "Pending", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  PROCESSING: { label: "Processing", variant: "default", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  COMPLETED: { label: "Completed", variant: "outline", icon: <CheckCircle2 className="h-3 w-3 text-success" /> },
  FAILED: { label: "Failed", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  CANCELLED: { label: "Cancelled", variant: "secondary", icon: <XCircle className="h-3 w-3" /> },
};

const OrderRow: React.FC<{ order: SwapOrder }> = ({ order }) => {
  const isBuy = order.order_type === "BUY_BTC";
  const status = statusConfig[order.status];

  // Format tx_hash for display (show first 8 and last 6 chars)
  const formatTxHash = (hash: string | null) => {
    if (!hash) return null;
    if (hash.startsWith('p2p_')) return 'Party-to-Party';
    if (hash.length > 20) return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
    return hash;
  };

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${isBuy ? "bg-success/10" : "bg-destructive/10"}`}>
          {isBuy ? (
            <ArrowDownLeft className="h-4 w-4 text-success" />
          ) : (
            <ArrowUpRight className="h-4 w-4 text-destructive" />
          )}
        </div>
        <div>
          <p className="font-medium text-sm">
            {isBuy ? "Buy" : "Sell"} {order.btc_amount.toFixed(8)} BTC
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}
          </p>
          {order.tx_hash && order.status === "COMPLETED" && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <ExternalLink className="h-3 w-3" />
              {formatTxHash(order.tx_hash)}
            </p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium text-sm">
          {isBuy ? "-" : "+"}${order.usdc_amount.toFixed(2)}
        </p>
        <Badge variant={status.variant} className="gap-1 text-xs">
          {status.icon}
          {status.label}
        </Badge>
      </div>
    </div>
  );
};

export const SwapOrderHistory: React.FC = () => {
  const { data: orders, isLoading, error } = useSwapOrders();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="text-right">
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Failed to load orders</p>
        </CardContent>
      </Card>
    );
  }

  const pendingOrders = orders?.filter((o) => o.status === "PENDING" || o.status === "PROCESSING") || [];
  const completedOrders = orders?.filter((o) => o.status !== "PENDING" && o.status !== "PROCESSING") || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Order History
          {pendingOrders.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {pendingOrders.length} pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {(!orders || orders.length === 0) ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No orders yet</p>
            <p className="text-xs mt-1">Your buy and sell orders will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingOrders.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Pending Orders
                </p>
                <div className="bg-muted/30 rounded-lg px-3">
                  {pendingOrders.map((order) => (
                    <OrderRow key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )}
            
            {completedOrders.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Completed
                </p>
                <div className="px-3">
                  {completedOrders.slice(0, 10).map((order) => (
                    <OrderRow key={order.id} order={order} />
                  ))}
                </div>
                {completedOrders.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    + {completedOrders.length - 10} more orders
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
