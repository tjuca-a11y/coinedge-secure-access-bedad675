import React, { useState } from 'react';
import { SalesRepSidebar } from './SalesRepSidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

interface SalesRepLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const SalesRepLayout: React.FC<SalesRepLayoutProps> = ({ children, title, subtitle }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <SalesRepSidebar />
      </div>
      
      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SalesRepSidebar />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="flex h-14 md:h-16 items-center justify-between border-b bg-card px-4 md:px-6 shrink-0 safe-area-top">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-semibold text-foreground truncate">{title}</h1>
              {subtitle && <p className="text-xs md:text-sm text-muted-foreground truncate">{subtitle}</p>}
            </div>
          </div>
        </header>
        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 safe-area-bottom">{children}</main>
      </div>
    </div>
  );
};
