import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  Wallet,
  Scale,
  ArrowLeftRight,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AdminNotificationBell } from './AdminNotificationBell';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
  defaultOpen?: boolean;
}

const navSections: NavSection[] = [
  {
    id: 'merchant-operations',
    label: 'Merchant Operations',
    icon: Store,
    defaultOpen: true,
    items: [
      { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/admin/map', label: 'Map', icon: Map },
      { path: '/admin/merchants', label: 'Merchants', icon: Store },
      { path: '/admin/bitcards', label: 'BitCards', icon: CreditCard },
      { path: '/admin/sales-reps', label: 'Sales Reps', icon: Users },
      { path: '/admin/commissions', label: 'Commissions', icon: DollarSign },
    ],
  },
  {
    id: 'orders-fulfillment',
    label: 'Orders & Fulfillment',
    icon: ArrowLeftRight,
    items: [
      { path: '/admin/swap-orders', label: 'Buy/Sell Orders', icon: DollarSign },
      { path: '/admin/fulfillment', label: 'Fulfillment Queue', icon: FileText },
    ],
  },
  {
    id: 'treasury-inventory',
    label: 'Treasury & Inventory',
    icon: Wallet,
    items: [
      { path: '/admin/treasury', label: 'Treasury', icon: Wallet },
      { path: '/admin/inventory', label: 'BTC Inventory', icon: Shield },
      { path: '/admin/inventory-lots', label: 'Inventory Lots', icon: CreditCard },
      { path: '/admin/reconciliation', label: 'Reconciliation', icon: Scale },
    ],
  },
  {
    id: 'system',
    label: 'System',
    icon: Settings,
    items: [
      { path: '/admin/system-controls', label: 'System Controls', icon: Settings },
      { path: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
    ],
  },
];

const STORAGE_KEY = 'admin-sidebar-sections';

export const AdminSidebar: React.FC = () => {
  const { adminUser, role, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize open sections from localStorage or defaults
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Fall through to defaults
      }
    }
    // Default: open sections based on defaultOpen or if they contain the current route
    const defaults: Record<string, boolean> = {};
    navSections.forEach((section) => {
      const containsActiveRoute = section.items.some((item) => location.pathname === item.path);
      defaults[section.id] = section.defaultOpen || containsActiveRoute;
    });
    return defaults;
  });

  // Auto-expand section containing active route
  useEffect(() => {
    const activeSection = navSections.find((section) =>
      section.items.some((item) => location.pathname === item.path)
    );
    if (activeSection && !openSections[activeSection.id]) {
      setOpenSections((prev) => ({ ...prev, [activeSection.id]: true }));
    }
  }, [location.pathname]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(openSections));
  }, [openSections]);

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

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
        <nav className="space-y-2">
          {navSections.map((section) => (
            <Collapsible
              key={section.id}
              open={openSections[section.id]}
              onOpenChange={() => toggleSection(section.id)}
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors">
                <div className="flex items-center gap-3">
                  <section.icon className="h-4 w-4" />
                  <span>{section.label}</span>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    openSections[section.id] && 'rotate-180'
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 ml-4 space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground'
                      )
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                ))}
              </CollapsibleContent>
            </Collapsible>
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
