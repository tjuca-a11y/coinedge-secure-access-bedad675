import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useMerchantAuth } from '@/contexts/MerchantAuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  CreditCard,
  DollarSign,
  Package,
  Users,
  Scan,
  Wallet,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const MerchantSidebar: React.FC = () => {
  const { isMerchantAdmin, wallet } = useMerchantAuth();
  const location = useLocation();

  const adminLinks = [
    { to: '/merchant/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/merchant/admin/add-balance', icon: DollarSign, label: 'Add Balance' },
    { to: '/merchant/admin/order-cards', icon: Package, label: 'Order Cards' },
    { to: '/merchant/admin/orders', icon: CreditCard, label: 'Orders' },
    { to: '/merchant/admin/cashiers', icon: Users, label: 'Cashiers' },
  ];

  const cashierLinks = [
    { to: '/merchant/cashier', icon: Scan, label: 'POS Terminal' },
    { to: '/merchant/history', icon: History, label: 'Activation History' },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">CoinEdge</h2>
            <p className="text-xs text-muted-foreground">Merchant Portal</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {isMerchantAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminLinks.map((link) => (
                  <SidebarMenuItem key={link.to}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={link.to}
                        className={cn(
                          'flex items-center gap-2',
                          location.pathname === link.to && 'bg-accent text-accent-foreground'
                        )}
                      >
                        <link.icon className="h-4 w-4" />
                        <span>{link.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Cashier</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {cashierLinks.map((link) => (
                <SidebarMenuItem key={link.to}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={link.to}
                      className={cn(
                        'flex items-center gap-2',
                        location.pathname === link.to && 'bg-accent text-accent-foreground'
                      )}
                    >
                      <link.icon className="h-4 w-4" />
                      <span>{link.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
          <Wallet className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="font-semibold">
              ${wallet?.balance_usd?.toFixed(2) ?? '0.00'}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
