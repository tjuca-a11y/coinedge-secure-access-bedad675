import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft, 
  Shield, 
  Key, 
  Smartphone, 
  Mail, 
  Clock, 
  LogOut,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDynamicWallet } from "@/contexts/DynamicWalletContext";
import { toast } from "sonner";

interface SecurityItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  status?: "enabled" | "disabled" | "pending";
  action?: React.ReactNode;
}

const SecuritySettings: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAuthenticated: isDynamicAuthenticated, disconnectWallet } = useDynamicWallet();
  
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);

  const handleSignOut = useCallback(async () => {
    try {
      if (isDynamicAuthenticated) {
        await disconnectWallet();
      } else {
        await signOut();
      }
    } catch (e) {
      console.error("[SecuritySettings] Sign out failed", e);
      toast.error("Sign out failed");
    }
  }, [disconnectWallet, isDynamicAuthenticated, signOut]);

  const handleToggle2FA = () => {
    if (!twoFactorEnabled) {
      toast.info("2FA setup coming soon");
    } else {
      toast.info("Disabling 2FA...");
      setTwoFactorEnabled(false);
    }
  };

  const handleChangePassword = () => {
    toast.info("Password change coming soon");
  };

  const securityItems: SecurityItem[] = [
    {
      icon: <Key className="h-5 w-5 text-primary" />,
      title: "Password",
      description: "Last changed 30 days ago",
      action: (
        <Button variant="outline" size="sm" onClick={handleChangePassword}>
          Change
        </Button>
      ),
    },
    {
      icon: <Smartphone className="h-5 w-5 text-primary" />,
      title: "Two-Factor Authentication (2FA)",
      description: "Add an extra layer of security to your account",
      status: twoFactorEnabled ? "enabled" : "disabled",
      action: (
        <Switch
          checked={twoFactorEnabled}
          onCheckedChange={handleToggle2FA}
        />
      ),
    },
    {
      icon: <Mail className="h-5 w-5 text-primary" />,
      title: "Login Alerts",
      description: "Get notified when someone logs into your account",
      status: emailAlertsEnabled ? "enabled" : "disabled",
      action: (
        <Switch
          checked={emailAlertsEnabled}
          onCheckedChange={setEmailAlertsEnabled}
        />
      ),
    },
  ];

  const recentSessions = [
    {
      device: "Chrome on MacOS",
      location: "New York, US",
      time: "Active now",
      current: true,
    },
    {
      device: "Safari on iPhone",
      location: "New York, US",
      time: "2 hours ago",
      current: false,
    },
    {
      device: "Chrome on Windows",
      location: "Los Angeles, US",
      time: "3 days ago",
      current: false,
    },
  ];

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
            <h1 className="text-2xl font-bold">Security & Login</h1>
            <p className="text-muted-foreground">Protect your account with 2FA and security settings</p>
          </div>
          <Badge variant="outline" className="gap-1">
            <Shield className="h-3 w-3" />
            Secure
          </Badge>
        </div>

        {/* Security Status Card */}
        <Card className="border-success/30 bg-success/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-success/10 rounded-full">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-success">Your account is secured</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  We recommend enabling two-factor authentication for additional protection.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings Card */}
        <Card>
          <CardContent className="pt-6 space-y-1">
            <h3 className="font-semibold mb-4">Security Settings</h3>
            
            {securityItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-4 border-b last:border-b-0"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-full shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.title}</span>
                      {item.status === "enabled" && (
                        <Badge className="bg-success/10 text-success hover:bg-success/20 text-xs">
                          Enabled
                        </Badge>
                      )}
                      {item.status === "disabled" && (
                        <Badge variant="secondary" className="text-xs">
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                {item.action}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Active Sessions Card */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Active Sessions</h3>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                Sign out all
              </Button>
            </div>

            <div className="space-y-3">
              {recentSessions.map((session, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-full">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{session.device}</span>
                        {session.current && (
                          <Badge className="bg-success/10 text-success hover:bg-success/20 text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {session.location} • {session.time}
                      </p>
                    </div>
                  </div>
                  {!session.current && (
                    <Button variant="ghost" size="sm" className="text-destructive">
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/30">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h3 className="font-semibold text-destructive">Danger Zone</h3>
            </div>

            <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg bg-destructive/5">
              <div>
                <p className="font-medium">Sign Out of Account</p>
                <p className="text-sm text-muted-foreground">Sign out from this device</p>
              </div>
              <Button variant="destructive" onClick={handleSignOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SecuritySettings;
