import { ArrowLeft, TrendingUp, Shield, FileCheck, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const LimitsSettings = () => {
  const navigate = useNavigate();
  const { isKycApproved } = useAuth();

  const currentTier = isKycApproved ? "Tier 2" : "Tier 1";
  
  const limits = {
    tier1: {
      daily: 500,
      monthly: 2000,
      description: "Basic verification",
    },
    tier2: {
      daily: 10000,
      monthly: 50000,
      description: "Full verification",
    },
  };

  const currentLimits = isKycApproved ? limits.tier2 : limits.tier1;
  
  // Mock usage data
  const usage = {
    dailyUsed: 150,
    monthlyUsed: 800,
  };

  const dailyPercent = (usage.dailyUsed / currentLimits.daily) * 100;
  const monthlyPercent = (usage.monthlyUsed / currentLimits.monthly) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Limits & Compliance</h1>
            <p className="text-sm text-muted-foreground">View your account limits</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Current Tier */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Verification Level
              </CardTitle>
              <Badge variant={isKycApproved ? "default" : "secondary"}>
                {currentTier}
              </Badge>
            </div>
            <CardDescription>
              {isKycApproved 
                ? "You have full access to all features" 
                : "Complete verification to unlock higher limits"}
            </CardDescription>
          </CardHeader>
          {!isKycApproved && (
            <CardContent>
              <Button 
                className="w-full" 
                onClick={() => navigate("/kyc")}
              >
                <FileCheck className="h-4 w-4 mr-2" />
                Complete Verification
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Current Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Current Usage
            </CardTitle>
            <CardDescription>
              Your transaction limits and usage this period
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Daily Limit</span>
                <span className="text-sm text-muted-foreground">
                  ${usage.dailyUsed.toLocaleString()} / ${currentLimits.daily.toLocaleString()}
                </span>
              </div>
              <Progress value={dailyPercent} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                ${(currentLimits.daily - usage.dailyUsed).toLocaleString()} remaining today
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Monthly Limit</span>
                <span className="text-sm text-muted-foreground">
                  ${usage.monthlyUsed.toLocaleString()} / ${currentLimits.monthly.toLocaleString()}
                </span>
              </div>
              <Progress value={monthlyPercent} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                ${(currentLimits.monthly - usage.monthlyUsed).toLocaleString()} remaining this month
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tier Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Limit Tiers</CardTitle>
            <CardDescription>
              Compare verification levels and their limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${!isKycApproved ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Tier 1 - Basic</span>
                  {!isKycApproved && <Badge variant="outline">Current</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mb-2">Email verification only</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Daily:</span>
                    <span className="ml-2 font-medium">${limits.tier1.daily.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Monthly:</span>
                    <span className="ml-2 font-medium">${limits.tier1.monthly.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${isKycApproved ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Tier 2 - Full</span>
                  {isKycApproved && <Badge variant="outline">Current</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mb-2">Identity & address verification</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Daily:</span>
                    <span className="ml-2 font-medium">${limits.tier2.daily.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Monthly:</span>
                    <span className="ml-2 font-medium">${limits.tier2.monthly.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Info */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="ghost" className="w-full justify-between" asChild>
              <a href="#" onClick={(e) => { e.preventDefault(); toast.info("Coming soon"); }}>
                <span>Terms of Service</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="ghost" className="w-full justify-between" asChild>
              <a href="#" onClick={(e) => { e.preventDefault(); toast.info("Coming soon"); }}>
                <span>Privacy Policy</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="ghost" className="w-full justify-between" asChild>
              <a href="#" onClick={(e) => { e.preventDefault(); toast.info("Coming soon"); }}>
                <span>AML Policy</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LimitsSettings;
