import React from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMerchants } from '@/hooks/useAdminStats';
import { MapPin, TrendingUp, AlertTriangle } from 'lucide-react';

const AdminMap: React.FC = () => {
  const { data: merchants, isLoading } = useMerchants();

  // Simulated growth alerts - in production this would be calculated from actual data
  const growthAlerts = merchants?.filter((m) => m.status === 'active').slice(0, 3) || [];

  return (
    <AdminLayout title="Map" subtitle="Geographic view of merchant locations and activity">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map Placeholder */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Merchant Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[500px] items-center justify-center rounded-lg border-2 border-dashed border-muted bg-muted/20">
              <div className="text-center">
                <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-lg font-medium text-muted-foreground">
                  Interactive Map View
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Merchant locations will be plotted here with activity indicators
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  {merchants?.filter((m) => m.lat && m.lng).length || 0} merchants with
                  coordinates
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Growth Alerts Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                Growth Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-20 items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : growthAlerts.length > 0 ? (
                <div className="space-y-3">
                  {growthAlerts.map((merchant) => (
                    <div
                      key={merchant.id}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <div className="rounded-full bg-success/10 p-1.5">
                        <TrendingUp className="h-4 w-4 text-success" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{merchant.business_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {merchant.city}, {merchant.state}
                        </p>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          Sales Increasing
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  No growth alerts at this time
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Attention Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-20 items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : (
                <div className="space-y-3">
                  {merchants
                    ?.filter((m) => m.status === 'kyc_pending')
                    .slice(0, 3)
                    .map((merchant) => (
                      <div
                        key={merchant.id}
                        className="flex items-start gap-3 rounded-lg border p-3"
                      >
                        <div className="rounded-full bg-warning/10 p-1.5">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{merchant.business_name}</p>
                          <p className="text-xs text-muted-foreground">KYC Pending Review</p>
                        </div>
                      </div>
                    )) || (
                    <p className="text-center text-sm text-muted-foreground">
                      No items require attention
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Merchant List */}
          <Card>
            <CardHeader>
              <CardTitle>All Merchants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {merchants?.map((merchant) => (
                  <div
                    key={merchant.id}
                    className="flex items-center justify-between rounded-lg border p-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{merchant.business_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {merchant.city}, {merchant.state}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {merchant.sales_reps?.full_name || 'Unassigned'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminMap;
