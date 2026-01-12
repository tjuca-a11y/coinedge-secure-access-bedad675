import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
  LayoutDashboard,
  Map,
  Store,
  CreditCard,
  Users,
  DollarSign,
  FileText,
  LogOut,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  Wallet,
  Scale,
} from 'lucide-react';
import { AdminNotificationBell } from './AdminNotificationBell';

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/map', label: 'Map', icon: Map },
  { path: '/admin/merchants', label: 'Merchants', icon: Store },
  { path: '/admin/bitcards', label: 'BitCards', icon: CreditCard },
  { path: '/admin/sales-reps', label: 'Sales Reps', icon: Users },
  { path: '/admin/commissions', label: 'Commissions', icon: DollarSign },
  { path: '/admin/swap-orders', label: 'Buy/Sell Orders', icon: DollarSign },
  { path: '/admin/treasury', label: 'Treasury', icon: Wallet },
  { path: '/admin/reconciliation', label: 'Reconciliation', icon: Scale },
  { path: '/admin/inventory', label: 'BTC Inventory', icon: Shield },
  { path: '/admin/inventory-lots', label: 'Inventory Lots', icon: CreditCard },
  { path: '/admin/fulfillment', label: 'Fulfillment Queue', icon: FileText },
  { path: '/admin/system-controls', label: 'System Controls', icon: Store },
  { path: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
];

export const AdminSidebar: React.FC = () => {
  const { adminUser, role, signOut } = useAdminAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">CoinEdge</h1>
            <p className="text-xs text-sidebar-foreground/60">Admin Console</p>
          </div>
        </div>
        <AdminNotificationBell />
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

      {/* User Info */}
      <div className="border-t border-sidebar-border p-4">
        <div className="mb-3">
          <p className="text-sm font-medium text-sidebar-foreground">
            {adminUser?.full_name || 'Admin User'}
          </p>
          <p className="text-xs text-sidebar-foreground/60">{adminUser?.email}</p>
          <span className="mt-1 inline-block rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
            {role?.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};
