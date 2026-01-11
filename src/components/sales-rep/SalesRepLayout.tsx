import React from 'react';
import { SalesRepSidebar } from './SalesRepSidebar';

interface SalesRepLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const SalesRepLayout: React.FC<SalesRepLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="flex h-screen bg-background">
      <SalesRepSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </header>
        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
};
