import React, { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useSystemHealth, HealthCheckResult } from "@/hooks/useSystemHealth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  Database,
  Shield,
  Wallet,
  Link2,
  Zap,
  Bitcoin,
  Lock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Settings2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const getIconForCheck = (name: string) => {
  const iconMap: Record<string, React.ElementType> = {
    "Database": Database,
    "Authentication": Shield,
    "Plaid": Link2,
    "Dynamic Auth": Wallet,
    "Alchemy (USDC)": Zap,
    "BTC Price Oracle": Bitcoin,
    "Fireblocks (Treasury)": Lock,
    "Edge Functions": Settings2,
  };
  return iconMap[name] || Settings2;
};

const getStatusColor = (status: HealthCheckResult["status"]) => {
  switch (status) {
    case "healthy":
      return "bg-success text-success-foreground";
    case "degraded":
      return "bg-warning text-warning-foreground";
    case "down":
      return "bg-destructive text-destructive-foreground";
    case "not_configured":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getStatusIcon = (status: HealthCheckResult["status"]) => {
  switch (status) {
    case "healthy":
      return <CheckCircle2 className="h-5 w-5 text-success" />;
    case "degraded":
      return <AlertTriangle className="h-5 w-5 text-warning" />;
    case "down":
      return <XCircle className="h-5 w-5 text-destructive" />;
    case "not_configured":
      return <Settings2 className="h-5 w-5 text-muted-foreground" />;
    default:
      return <Settings2 className="h-5 w-5 text-muted-foreground" />;
  }
};

const getStatusLabel = (status: HealthCheckResult["status"]) => {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "degraded":
      return "Degraded";
    case "down":
      return "Down";
    case "not_configured":
      return "Not Configured";
    default:
      return "Unknown";
  }
};

const HealthCheckCard: React.FC<{ check: HealthCheckResult }> = ({ check }) => {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = getIconForCheck(check.name);
  const hasDetails = check.details && Object.keys(check.details).length > 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">{check.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {check.message || "No message"}
              </p>
            </div>
          </div>
          {getStatusIcon(check.status)}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(check.status)}>
              {getStatusLabel(check.status)}
            </Badge>
            {check.latency_ms !== undefined && (
              <span className="text-xs text-muted-foreground">
                {check.latency_ms}ms
              </span>
            )}
          </div>
          {hasDetails && (
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <span className="ml-1 text-xs">Details</span>
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          )}
        </div>
        {hasDetails && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleContent className="mt-3">
              <div className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(check.details, null, 2)}
                </pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
};

const HealthCheckSkeleton: React.FC = () => (
  <Card>
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div>
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
    </CardHeader>
    <CardContent className="pt-2">
      <Skeleton className="h-5 w-16" />
    </CardContent>
  </Card>
);

const AdminHealthCheck: React.FC = () => {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { data, isLoading, error, refetch, dataUpdatedAt } = useSystemHealth(autoRefresh);

  const overallStatusColor = {
    healthy: "text-success",
    degraded: "text-warning",
    down: "text-destructive",
  };

  const overallStatusIcon = {
    healthy: <CheckCircle2 className="h-8 w-8 text-success" />,
    degraded: <AlertTriangle className="h-8 w-8 text-warning" />,
    down: <XCircle className="h-8 w-8 text-destructive" />,
  };

  return (
    <AdminLayout title="System Health" subtitle="Real-time status of all integrations and services">
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex items-center justify-end gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="auto-refresh" className="text-sm">
              Auto-refresh (30s)
            </Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Overall Status Card */}
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {isLoading ? (
                  <Skeleton className="h-8 w-8 rounded-full" />
                ) : data ? (
                  overallStatusIcon[data.overall_status]
                ) : (
                  <XCircle className="h-8 w-8 text-destructive" />
                )}
                <div>
                  <h2 className="text-lg font-semibold">
                    {isLoading ? (
                      <Skeleton className="h-5 w-32" />
                    ) : data ? (
                      <span className={overallStatusColor[data.overall_status]}>
                        System {data.overall_status.charAt(0).toUpperCase() + data.overall_status.slice(1)}
                      </span>
                    ) : (
                      <span className="text-destructive">Unable to check</span>
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {dataUpdatedAt ? (
                      <>Last checked {formatDistanceToNow(dataUpdatedAt, { addSuffix: true })}</>
                    ) : (
                      "Never checked"
                    )}
                  </p>
                </div>
              </div>
              {data && (
                <div className="flex gap-2">
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    {data.checks.filter((c) => c.status === "healthy").length} Healthy
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <AlertTriangle className="h-3 w-3 text-warning" />
                    {data.checks.filter((c) => c.status === "degraded").length} Degraded
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <XCircle className="h-3 w-3 text-destructive" />
                    {data.checks.filter((c) => c.status === "down").length} Down
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Failed to fetch health status</p>
                  <p className="text-sm text-muted-foreground">
                    {error instanceof Error ? error.message : "Unknown error"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Health Check Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => <HealthCheckSkeleton key={i} />)
          ) : data ? (
            data.checks.map((check) => (
              <HealthCheckCard key={check.name} check={check} />
            ))
          ) : null}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminHealthCheck;
