import React, { useCallback } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { KycBanner } from "@/components/kyc/KycBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useDynamicWallet } from "@/contexts/DynamicWalletContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  hideHeader?: boolean;
}

export function DashboardLayout({ children, title, subtitle, hideHeader }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const { isAuthenticated: isDynamicAuthenticated, disconnectWallet } = useDynamicWallet();

  // Handle sign out for both Supabase and Dynamic auth
  const handleSignOut = useCallback(async () => {
    if (isDynamicAuthenticated) {
      await disconnectWallet();
    } else {
      await signOut();
    }
  }, [isDynamicAuthenticated, disconnectWallet, signOut]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {!hideHeader && (
            <header className="h-14 md:h-16 border-b border-border bg-card flex items-center justify-between px-3 md:px-6 sticky top-0 z-10">
              <div className="flex items-center gap-2 md:gap-4 min-w-0">
                <SidebarTrigger className="shrink-0" />
                {title && (
                  <div className="min-w-0">
                    <h1 className="text-base md:text-xl font-semibold text-foreground truncate">{title}</h1>
                    {subtitle && <p className="text-xs md:text-sm text-muted-foreground truncate hidden sm:block">{subtitle}</p>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 md:gap-4 shrink-0">
                <span className="text-xs md:text-sm text-muted-foreground hidden md:block truncate max-w-[150px]">{user?.email}</span>
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-8 w-8 md:h-10 md:w-10">
                  <LogOut className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </div>
            </header>
          )}
          <main className="flex-1 p-3 md:p-6 pb-20 md:pb-6 overflow-auto">
            <KycBanner />
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
