import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useMerchantAuth } from '@/contexts/MerchantAuthContext';
import { supabase } from '@/integrations/supabase/client';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  CreditCard,
  DollarSign,
  Package,
  Users,
  Scan,
  Wallet,
  History,
  ChevronDown,
  Settings,
  Lock,
  Loader2,
  LockOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export const MerchantSidebar: React.FC = () => {
  const { isMerchantAdmin, wallet, merchant } = useMerchantAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const adminLinks = [
    { to: '/merchant/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/merchant/admin/add-balance', icon: DollarSign, label: 'Add Balance' },
    { to: '/merchant/admin/order-cards', icon: Package, label: 'Order Cards' },
    { to: '/merchant/admin/orders', icon: CreditCard, label: 'Orders' },
    { to: '/merchant/admin/cashiers', icon: Users, label: 'Cashiers' },
    { to: '/merchant/admin/settings', icon: Settings, label: 'Settings' },
  ];

  const cashierLinks = [
    { to: '/merchant/cashier', icon: Scan, label: 'POS Terminal' },
    { to: '/merchant/history', icon: History, label: 'Activation History' },
  ];

  // Check if current route is an admin route
  const isOnAdminRoute = location.pathname.startsWith('/merchant/admin');

  const handleAdminClick = () => {
    if (adminUnlocked) {
      setAdminOpen(!adminOpen);
    } else {
      setPinDialogOpen(true);
      setPin('');
      setPinError(false);
    }
  };

  const handleLockAdmin = () => {
    setAdminUnlocked(false);
    setAdminOpen(false);
    navigate('/merchant/cashier');
    toast({ title: 'Admin Panel Locked', description: 'Access revoked' });
  };

  const handlePinSubmit = async () => {
    if (!merchant?.id || !pin) return;
    
    setIsVerifying(true);
    setPinError(false);
    
    try {
      const { data, error } = await supabase.rpc('verify_admin_pin', {
        p_merchant_id: merchant.id,
        p_pin: pin
      });
      
      if (error) {
        console.error('PIN verification error:', error);
        setPinError(true);
        setPin('');
        return;
      }
      
      if (data === true) {
        setAdminUnlocked(true);
        setAdminOpen(true);
        setPinDialogOpen(false);
        setPin('');
        toast({ title: 'Admin Panel Unlocked', description: 'Access granted' });
      } else {
        setPinError(true);
        setPin('');
      }
    } catch (err) {
      console.error('PIN verification failed:', err);
      setPinError(true);
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePinKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isVerifying) {
      handlePinSubmit();
    }
  };

  // If navigating away from admin routes and admin is locked, redirect
  React.useEffect(() => {
    if (isOnAdminRoute && !adminUnlocked) {
      navigate('/merchant/cashier');
    }
  }, [isOnAdminRoute, adminUnlocked, navigate]);

  return (
    <>
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
          {/* Cashier section - always visible and at top */}
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

          {/* Admin section - requires PIN to unlock */}
          {isMerchantAdmin && (
            <Collapsible open={adminOpen && adminUnlocked} onOpenChange={handleAdminClick}>
              <SidebarGroup>
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger className="flex-1" onClick={handleAdminClick}>
                    <SidebarGroupLabel className="flex w-full cursor-pointer items-center justify-between pr-2 hover:bg-accent/50 rounded-md">
                      <div className="flex items-center gap-2">
                        {adminUnlocked ? (
                          <LockOpen className="h-4 w-4 text-green-600" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                        <span>Admin Panel</span>
                      </div>
                      {adminUnlocked ? (
                        <ChevronDown className={cn(
                          "h-4 w-4 transition-transform",
                          adminOpen && "rotate-180"
                        )} />
                      ) : (
                        <span className="text-xs text-muted-foreground">PIN required</span>
                      )}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  {adminUnlocked && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={handleLockAdmin}
                      title="Lock Admin Panel"
                    >
                      <Lock className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <CollapsibleContent>
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
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          )}
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

      {/* PIN Entry Dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Admin Access
            </DialogTitle>
            <DialogDescription>
              Enter your admin PIN to access the admin panel
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setPinError(false);
              }}
              onKeyDown={handlePinKeyDown}
              className={cn(
                "text-center text-2xl tracking-widest",
                pinError && "border-destructive"
              )}
              maxLength={6}
              autoFocus
              disabled={isVerifying}
            />
            {pinError && (
              <p className="text-sm text-destructive text-center">Incorrect PIN</p>
            )}
            <Button 
              onClick={handlePinSubmit} 
              className="w-full" 
              disabled={!pin || isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Unlock'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
