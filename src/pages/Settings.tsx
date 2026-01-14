import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useDynamicWallet } from "@/contexts/DynamicWalletContext";
import { 
  User, 
  Shield, 
  Bell, 
  Lock, 
  Wallet, 
  CreditCard, 
  TrendingUp, 
  Monitor, 
  Database,
  HelpCircle,
  MessageSquare,
  FileText,
  Activity,
  ExternalLink,
  Fingerprint
} from "lucide-react";
import { toast } from "sonner";

interface SettingCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  badge?: React.ReactNode;
  external?: boolean;
}

const SettingCard: React.FC<SettingCardProps> = ({ 
  icon, 
  title, 
  description, 
  onClick, 
  badge,
  external 
}) => (
  <Card 
    className="cursor-pointer hover:bg-accent/50 transition-colors border border-border/50"
    onClick={onClick}
  >
    <CardContent className="p-4 md:p-5">
      <div className="flex items-start gap-4">
        <div className="p-2.5 bg-primary/10 rounded-full shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">{title}</p>
            {badge}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
        {external && (
          <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </div>
    </CardContent>
  </Card>
);

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { kycStatus, signOut } = useAuth();
  const { isAuthenticated: isDynamicAuthenticated, disconnectWallet } = useDynamicWallet();

  const handleSignOut = useCallback(async () => {
    try {
      if (isDynamicAuthenticated) {
        await disconnectWallet();
      } else {
        await signOut();
      }
    } catch (e) {
      console.error("[Settings] sign out failed", e);
      toast.error("Sign out failed");
    }
  }, [disconnectWallet, isDynamicAuthenticated, signOut]);

  const getKycBadge = () => {
    if (kycStatus === "approved") {
      return <Badge className="bg-success text-success-foreground hover:bg-success/90">Tier 2</Badge>;
    }
    if (kycStatus === "pending") {
      return <Badge className="bg-warning text-warning-foreground hover:bg-warning/90">Pending</Badge>;
    }
    return <Badge variant="secondary">Tier 0</Badge>;
  };

  const settingsItems = [
    {
      icon: <User className="h-5 w-5 text-primary" />,
      title: "Profile & Personal Info",
      description: "Manage your personal information and account details",
      onClick: () => navigate("/settings/profile"),
    },
    {
      icon: <Fingerprint className="h-5 w-5 text-primary" />,
      title: "Identity Verification (KYC)",
      description: "Verify your identity to unlock platform features",
      onClick: () => navigate("/settings/identity-verification"),
      badge: getKycBadge(),
    },
    {
      icon: <Lock className="h-5 w-5 text-primary" />,
      title: "Security & Login",
      description: "Protect your account with 2FA and security settings",
      onClick: () => navigate("/settings/security"),
    },
    {
      icon: <CreditCard className="h-5 w-5 text-primary" />,
      title: "Payment Methods",
      description: "Manage your funding sources and withdrawal destinations",
      onClick: () => navigate("/settings/payment-methods"),
    },
    {
      icon: <Wallet className="h-5 w-5 text-primary" />,
      title: "Crypto Wallets",
      description: "View internal balances and add external wallet addresses",
      onClick: () => toast.info("Crypto wallets coming soon"),
    },
    {
      icon: <Bell className="h-5 w-5 text-primary" />,
      title: "Notifications",
      description: "Control how you receive updates and alerts",
      onClick: () => toast.info("Notification settings coming soon"),
    },
    {
      icon: <TrendingUp className="h-5 w-5 text-primary" />,
      title: "Limits & Compliance",
      description: "Monitor your transaction limits and compliance status",
      onClick: () => toast.info("Limits info coming soon"),
    },
    {
      icon: <Monitor className="h-5 w-5 text-primary" />,
      title: "Devices & Sessions",
      description: "Manage active sessions and trusted devices",
      onClick: () => toast.info("Device management coming soon"),
    },
    {
      icon: <Database className="h-5 w-5 text-primary" />,
      title: "Data & Privacy",
      description: "Download your data and manage privacy settings",
      onClick: () => toast.info("Privacy settings coming soon"),
    },
  ];

  const supportItems = [
    {
      icon: <HelpCircle className="h-5 w-5 text-primary" />,
      title: "Help Center",
      description: "Browse FAQs and guides",
      onClick: () => window.open("#", "_blank"),
      external: true,
    },
    {
      icon: <MessageSquare className="h-5 w-5 text-primary" />,
      title: "Contact Support",
      description: "Get help from our team",
      onClick: () => window.open("#", "_blank"),
      external: true,
    },
    {
      icon: <FileText className="h-5 w-5 text-primary" />,
      title: "Report an Issue",
      description: "Submit bug reports or feedback",
      onClick: () => window.open("#", "_blank"),
      external: true,
    },
    {
      icon: <Activity className="h-5 w-5 text-primary" />,
      title: "Status Page",
      description: "Check system uptime",
      onClick: () => window.open("#", "_blank"),
      external: true,
    },
  ];

  return (
    <DashboardLayout title="Settings" subtitle="Manage your account, security, and preferences">
      <div className="space-y-6 max-w-4xl">
        {/* Main Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {settingsItems.map((item, index) => (
            <SettingCard key={index} {...item} />
          ))}
        </div>

        {/* Support & Resources Section */}
        <Card className="border border-border/50">
          <CardContent className="p-4 md:p-6">
            <h3 className="font-semibold text-foreground mb-4">Support & Resources</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {supportItems.map((item, index) => (
                <SettingCard key={index} {...item} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
