import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SalesRepLayout } from '@/components/sales-rep/SalesRepLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSalesRepMerchants } from '@/hooks/useSalesRepData';
import { MapPin, TrendingUp, Store } from 'lucide-react';

const SalesRepMap: React.FC = () => {
  const { data: merchants, isLoading } = useSalesRepMerchants();
  const navigate = useNavigate();

  const merchantsWithCoords = merchants?.filter((m) => m.lat && m.lng) || [];
  const activeMerchants = merchants?.filter((m) => m.status === 'active') || [];

  return (
    <SalesRepLayout title="Map" subtitle="View your merchants by location">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map Placeholder */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              My Merchant Locations
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
                  Your merchant locations will be plotted here
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  {merchantsWithCoords.length} of {merchants?.length || 0} merchants have coordinates
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Growth Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-success" />
                Growth Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeMerchants.length > 0 ? (
                <div className="space-y-3">
                  {activeMerchants.slice(0, 3).map((merchant) => (
                    <div
                      key={merchant.id}
                      className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/rep/merchants/${merchant.id}`)}
                    >
                      <div className="rounded-full bg-success/10 p-1.5">
                        <TrendingUp className="h-4 w-4 text-success" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{merchant.business_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {merchant.city}, {merchant.state}
                        </p>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          Active
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No active merchants yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Merchant List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Store className="h-4 w-4" />
                All Merchants ({merchants?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-20 items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : merchants && merchants.length > 0 ? (
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {merchants.map((merchant) => (
                    <div
                      key={merchant.id}
                      className="flex items-center justify-between rounded-lg border p-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/rep/merchants/${merchant.id}`)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{merchant.business_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {merchant.city && merchant.state
                            ? `${merchant.city}, ${merchant.state}`
                            : 'No location'}
                        </p>
                      </div>
                      <Badge
                        variant={merchant.status === 'active' ? 'default' : 'outline'}
                        className="text-xs ml-2"
                      >
                        {merchant.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No merchants yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SalesRepLayout>
  );
};

export default SalesRepMap;
