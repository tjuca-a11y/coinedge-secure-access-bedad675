import React from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { User, Shield, Bell, Key, LogOut, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, kycStatus } = useAuth();

  const getKycBadge = () => {
    if (kycStatus === "approved") {
      return <Badge className="bg-success/10 text-success hover:bg-success/20">Tier 2 Verified</Badge>;
    }
    if (kycStatus === "pending") {
      return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">Pending</Badge>;
    }
    return <Badge variant="secondary">Tier 0</Badge>;
  };

  return (
    <DashboardLayout title="Settings" subtitle="Manage your account and preferences">
      <div className="space-y-4 md:space-y-6 max-w-2xl">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Your personal information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={profile?.full_name || ""} disabled />
              </div>
            </div>
            {profile?.phone && (
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={profile.phone} disabled />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Identity Verification */}
        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => navigate("/settings/identity-verification")}
        >
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Identity Verification</p>
                  <p className="text-sm text-muted-foreground">KYC status and verification details</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getKycBadge()}
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Manage your notification preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Transaction Alerts</p>
                <p className="text-sm text-muted-foreground">Get notified for all transactions</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Security Alerts</p>
                <p className="text-sm text-muted-foreground">Login attempts and security events</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Marketing Updates</p>
                <p className="text-sm text-muted-foreground">News and promotional content</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start" onClick={() => toast.info("Password reset email sent")}>
              Change Password
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => toast.info("2FA setup coming soon")}>
              Enable Two-Factor Authentication
            </Button>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card className="border-destructive/20">
          <CardContent className="pt-6">
            <Button variant="destructive" className="w-full gap-2" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
