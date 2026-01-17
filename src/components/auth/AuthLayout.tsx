import React from 'react';
import cryptoIllustration from '@/assets/crypto-illustration.png';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Illustration (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-primary/5 to-background items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl" />
        </div>
        
        {/* Illustration and branding */}
        <div className="relative z-10 max-w-lg text-center">
          <img 
            src={cryptoIllustration} 
            alt="Cryptocurrency illustration" 
            className="w-full max-w-md mx-auto mb-8 drop-shadow-2xl"
          />
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Your Gateway to Crypto
          </h2>
          <p className="text-muted-foreground text-lg">
            Buy, sell, and hold Bitcoin & USDC with confidence. Self-custody means only you control your funds.
          </p>
          
          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <div className="px-4 py-2 bg-card rounded-full border border-border shadow-sm">
              <span className="text-sm font-medium">🔐 Self-Custody</span>
            </div>
            <div className="px-4 py-2 bg-card rounded-full border border-border shadow-sm">
              <span className="text-sm font-medium">⚡ Instant Transfers</span>
            </div>
            <div className="px-4 py-2 bg-card rounded-full border border-border shadow-sm">
              <span className="text-sm font-medium">🛡️ Bank-Level Security</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-background">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
