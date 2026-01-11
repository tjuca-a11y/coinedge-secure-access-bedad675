import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSalesRepAuth } from '@/contexts/SalesRepAuthContext';
import {
  LayoutDashboard,
  Map,
  Store,
  UserPlus,
  DollarSign,
  Settings,
  LogOut,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const navItems = [
  { path: '/rep/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/rep/merchants', label: 'My Merchants', icon: Store },
  { path: '/rep/add-merchant', label: 'Add Merchant', icon: UserPlus },
  { path: '/rep/map', label: 'Map', icon: Map },
  { path: '/rep/commissions', label: 'Commissions', icon: DollarSign },
  { path: '/rep/settings', label: 'Settings', icon: Settings },
];

export const SalesRepSidebar: React.FC = () => {
  const { salesRep, signOut } = useSalesRepAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/rep/login');
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-lg font-bold text-sidebar-foreground">CoinEdge</h1>
          <p className="text-xs text-sidebar-foreground/60">Sales Portal</p>
        </div>
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
            {salesRep?.full_name || 'Sales Rep'}
          </p>
          <p className="text-xs text-sidebar-foreground/60">{salesRep?.email}</p>
          <span className="mt-1 inline-block rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
            Sales Representative
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
