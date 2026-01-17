import React from 'react';
import authIllustration from '@/assets/auth-illustration.png';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Illustration (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#E8E9F0] items-center justify-center relative overflow-hidden">
        {/* CoinEdge branding */}
        <div className="absolute top-8 left-8 z-20">
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold text-primary">Coinedge</span>
            <div className="w-10 h-3 bg-[#7DD3A8] rounded-sm -rotate-6 -ml-2 -mt-3" />
          </div>
        </div>

        {/* Full illustration as background */}
        <img 
          src={authIllustration} 
          alt="Cryptocurrency illustration" 
          className="w-full h-full object-cover"
        />
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
