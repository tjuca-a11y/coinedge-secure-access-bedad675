import React from 'react';
import { useMerchantAuth } from '@/contexts/MerchantAuthContext';
import { MerchantSidebar } from './MerchantSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MerchantLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const MerchantLayout: React.FC<MerchantLayoutProps> = ({
  children,
  title,
  subtitle,
}) => {
  const { merchantUser, merchant, signOut } = useMerchantAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/merchant/login');
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <MerchantSidebar />
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <div>
                {title && <h1 className="text-lg font-semibold">{title}</h1>}
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden text-right md:block">
                <p className="text-sm font-medium">{merchantUser?.full_name}</p>
                <p className="text-xs text-muted-foreground">{merchant?.business_name}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </header>
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
};
