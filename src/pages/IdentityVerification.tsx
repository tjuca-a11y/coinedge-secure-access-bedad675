import React from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, FileText, Camera, Home, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDynamicWallet } from "@/contexts/DynamicWalletContext";

interface VerificationTier {
  tier: number;
  title: string;
  requirements: string;
  features: string[];
  isActive: boolean;
}

interface DocumentItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  required: boolean;
  verified: boolean;
}

const IdentityVerification: React.FC = () => {
  const navigate = useNavigate();
  const { kycStatus: supabaseKycStatus } = useAuth();
  const { isAuthenticated: isDynamicAuthenticated, syncedProfile } = useDynamicWallet();
  
  // Use centralized KYC status from syncedProfile for Dynamic users
  const kycStatus = isDynamicAuthenticated 
    ? (syncedProfile?.kycStatus || 'not_started') 
    : supabaseKycStatus;

  const handleStartVerification = () => {
    console.log("[IdentityVerification] Start Verification clicked");
    navigate("/kyc");
  };

  const getTierStatus = () => {
    switch (kycStatus) {
      case "approved":
        return { tier0: true, tier1: true, tier2: true };
      case "pending":
        return { tier0: true, tier1: true, tier2: false };
      default:
        return { tier0: true, tier1: false, tier2: false };
    }
  };

  const tierStatus = getTierStatus();

  const verificationTiers: VerificationTier[] = [
    {
      tier: 0,
      title: "Tier 0: View Only",
      requirements: "",
      features: ["View balances", "Browse gift cards", "Read-only access"],
      isActive: tierStatus.tier0,
    },
    {
      tier: 1,
      title: "Tier 1: Basic Access",
      requirements: "Requires: Email verification, Phone verification, Basic info",
      features: ["P2P payments", "Gift card purchases", "$500/day limit"],
      isActive: tierStatus.tier1,
    },
    {
      tier: 2,
      title: "Tier 2: Full Access",
      requirements: "Requires: Government ID, Selfie verification, Address proof",
      features: ["BTC redemption", "USDC transfers", "Loan applications", "$10,000/day limit"],
      isActive: tierStatus.tier2,
    },
  ];

  const documents: DocumentItem[] = [
    {
      icon: <FileText className="h-5 w-5 text-muted-foreground" />,
      title: "Government ID",
      description: "Driver's license or passport",
      required: true,
      verified: kycStatus === "approved",
    },
    {
      icon: <Camera className="h-5 w-5 text-muted-foreground" />,
      title: "Selfie Verification",
      description: "Live photo for identity confirmation",
      required: true,
      verified: kycStatus === "approved",
    },
    {
      icon: <Home className="h-5 w-5 text-muted-foreground" />,
      title: "Proof of Address",
      description: "Utility bill or bank statement",
      required: true,
      verified: kycStatus === "approved",
    },
    {
      icon: <FileText className="h-5 w-5 text-muted-foreground" />,
      title: "Additional Documents",
      description: "For large transfer verification",
      required: false,
      verified: false,
    },
  ];

  const getCurrentTierBadge = () => {
    if (kycStatus === "approved") {
      return <Badge className="bg-success/10 text-success hover:bg-success/20">Tier 2 Verified</Badge>;
    }
    if (kycStatus === "pending") {
      return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">Tier 1 - Pending Tier 2</Badge>;
    }
    return <Badge variant="secondary">Tier 0</Badge>;
  };

  return (
    <DashboardLayout title="" subtitle="">
      <div className="max-w-2xl space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate("/settings")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Settings</span>
        </button>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Identity Verification (KYC)</h1>
            <p className="text-muted-foreground">Verify your identity to unlock platform features</p>
          </div>
          {getCurrentTierBadge()}
        </div>

        {/* Verification Tiers Section */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h3 className="font-semibold text-base">Verification Tiers</h3>
              <p className="text-sm text-muted-foreground">Complete higher tiers to unlock more features and increase limits</p>
            </div>

            {/* Info Banner */}
            <div className="bg-success/10 border border-success/20 rounded-lg p-3">
              <p className="text-sm text-success">
                KYC verification is required for transfers, BTC redemption, and gift card claiming.
              </p>
            </div>

            {/* Tier Cards */}
            <div className="space-y-3">
              {verificationTiers.map((tier) => (
                <div
                  key={tier.tier}
                  className={`border rounded-lg p-4 ${
                    tier.isActive ? "border-success/30 bg-success/5" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${tier.isActive ? "text-success" : "text-muted-foreground"}`}>
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div className="space-y-2">
                        <div>
                          <h4 className="font-medium">{tier.title}</h4>
                          {tier.requirements && (
                            <p className="text-sm text-muted-foreground">{tier.requirements}</p>
                          )}
                        </div>
                        <ul className="space-y-1">
                          {tier.features.map((feature, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                              <span className="text-muted-foreground">•</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {tier.isActive && (
                      <Badge className="bg-success/10 text-success hover:bg-success/20">Active</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Document Upload Section */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h3 className="font-semibold text-base">Document Upload</h3>
              <p className="text-sm text-muted-foreground">Upload required documents for identity verification</p>
            </div>

            <div className="space-y-2">
              {documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {doc.icon}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{doc.title}</span>
                        {doc.required && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">
                            Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{doc.description}</p>
                    </div>
                  </div>
                  {doc.verified ? (
                    <div className="flex items-center gap-1 text-success">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Verified</span>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="gap-2">
                      <Upload className="h-4 w-4" />
                      Upload
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Start Verification Button for non-verified users */}
        {kycStatus !== "approved" && kycStatus !== "pending" && (
          <Button className="w-full" onClick={handleStartVerification}>
            Start Verification
          </Button>
        )}
      </div>
    </DashboardLayout>
  );
};

export default IdentityVerification;
