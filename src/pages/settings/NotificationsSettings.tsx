import { ArrowLeft, Bell, Mail, Smartphone, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const NotificationsSettings = () => {
  const navigate = useNavigate();
  
  const [settings, setSettings] = useState({
    // Push notifications
    pushEnabled: true,
    pushTransactions: true,
    pushPriceAlerts: false,
    pushSecurity: true,
    pushMarketing: false,
    
    // Email notifications
    emailEnabled: true,
    emailTransactions: true,
    emailWeeklyReport: true,
    emailSecurity: true,
    emailMarketing: false,
    
    // SMS notifications
    smsEnabled: false,
    smsTransactions: false,
    smsSecurity: true,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success("Notification preference updated");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Notifications</h1>
            <p className="text-sm text-muted-foreground">Manage how we contact you</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Push Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Push Notifications
            </CardTitle>
            <CardDescription>
              Notifications sent to your device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="pushEnabled" className="flex-1">
                <span className="font-medium">Enable Push Notifications</span>
              </Label>
              <Switch
                id="pushEnabled"
                checked={settings.pushEnabled}
                onCheckedChange={() => handleToggle("pushEnabled")}
              />
            </div>
            
            {settings.pushEnabled && (
              <>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <Label htmlFor="pushTransactions" className="flex-1">
                    <span>Transaction Updates</span>
                    <p className="text-sm text-muted-foreground">Get notified about deposits, withdrawals, and trades</p>
                  </Label>
                  <Switch
                    id="pushTransactions"
                    checked={settings.pushTransactions}
                    onCheckedChange={() => handleToggle("pushTransactions")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="pushPriceAlerts" className="flex-1">
                    <span>Price Alerts</span>
                    <p className="text-sm text-muted-foreground">Get notified about significant price changes</p>
                  </Label>
                  <Switch
                    id="pushPriceAlerts"
                    checked={settings.pushPriceAlerts}
                    onCheckedChange={() => handleToggle("pushPriceAlerts")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="pushSecurity" className="flex-1">
                    <span>Security Alerts</span>
                    <p className="text-sm text-muted-foreground">Important security notifications</p>
                  </Label>
                  <Switch
                    id="pushSecurity"
                    checked={settings.pushSecurity}
                    onCheckedChange={() => handleToggle("pushSecurity")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="pushMarketing" className="flex-1">
                    <span>Promotions & Updates</span>
                    <p className="text-sm text-muted-foreground">News, promotions, and product updates</p>
                  </Label>
                  <Switch
                    id="pushMarketing"
                    checked={settings.pushMarketing}
                    onCheckedChange={() => handleToggle("pushMarketing")}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Notifications sent to your email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="emailEnabled" className="flex-1">
                <span className="font-medium">Enable Email Notifications</span>
              </Label>
              <Switch
                id="emailEnabled"
                checked={settings.emailEnabled}
                onCheckedChange={() => handleToggle("emailEnabled")}
              />
            </div>
            
            {settings.emailEnabled && (
              <>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailTransactions" className="flex-1">
                    <span>Transaction Receipts</span>
                    <p className="text-sm text-muted-foreground">Receive email receipts for all transactions</p>
                  </Label>
                  <Switch
                    id="emailTransactions"
                    checked={settings.emailTransactions}
                    onCheckedChange={() => handleToggle("emailTransactions")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailWeeklyReport" className="flex-1">
                    <span>Weekly Summary</span>
                    <p className="text-sm text-muted-foreground">Weekly account activity summary</p>
                  </Label>
                  <Switch
                    id="emailWeeklyReport"
                    checked={settings.emailWeeklyReport}
                    onCheckedChange={() => handleToggle("emailWeeklyReport")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailSecurity" className="flex-1">
                    <span>Security Alerts</span>
                    <p className="text-sm text-muted-foreground">Important security notifications</p>
                  </Label>
                  <Switch
                    id="emailSecurity"
                    checked={settings.emailSecurity}
                    onCheckedChange={() => handleToggle("emailSecurity")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailMarketing" className="flex-1">
                    <span>Promotions & Updates</span>
                    <p className="text-sm text-muted-foreground">News, promotions, and product updates</p>
                  </Label>
                  <Switch
                    id="emailMarketing"
                    checked={settings.emailMarketing}
                    onCheckedChange={() => handleToggle("emailMarketing")}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* SMS Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              SMS Notifications
            </CardTitle>
            <CardDescription>
              Text message notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="smsEnabled" className="flex-1">
                <span className="font-medium">Enable SMS Notifications</span>
              </Label>
              <Switch
                id="smsEnabled"
                checked={settings.smsEnabled}
                onCheckedChange={() => handleToggle("smsEnabled")}
              />
            </div>
            
            {settings.smsEnabled && (
              <>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <Label htmlFor="smsTransactions" className="flex-1">
                    <span>Transaction Alerts</span>
                    <p className="text-sm text-muted-foreground">SMS alerts for large transactions</p>
                  </Label>
                  <Switch
                    id="smsTransactions"
                    checked={settings.smsTransactions}
                    onCheckedChange={() => handleToggle("smsTransactions")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="smsSecurity" className="flex-1">
                    <span>Security Codes</span>
                    <p className="text-sm text-muted-foreground">Receive 2FA codes via SMS</p>
                  </Label>
                  <Switch
                    id="smsSecurity"
                    checked={settings.smsSecurity}
                    onCheckedChange={() => handleToggle("smsSecurity")}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationsSettings;
