import React from 'react';
import authIllustration from '@/assets/auth-crypto-illustration.png';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Auth form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-background">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

      {/* Right side - Illustration (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#F5F5F7] items-center justify-center p-8 relative overflow-hidden">
        {/* CoinEdge branding */}
        <div className="absolute top-8 left-8">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">Coinedge</span>
            <div className="w-8 h-2 bg-green-300 rounded-sm -rotate-12 -ml-1" />
          </div>
        </div>

        {/* Illustration */}
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          <img 
            src={authIllustration} 
            alt="Cryptocurrency illustration" 
            className="max-w-full max-h-[80vh] object-contain"
          />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
