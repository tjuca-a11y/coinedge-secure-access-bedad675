import { ArrowLeft, Download, Trash2, Eye, FileText, ExternalLink, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const DataPrivacySettings = () => {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [privacySettings, setPrivacySettings] = useState({
    analyticsEnabled: true,
    personalizedAds: false,
    shareWithPartners: false,
  });

  const handleToggle = (key: keyof typeof privacySettings) => {
    setPrivacySettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success("Privacy setting updated");
  };

  const handleExportData = async () => {
    setIsExporting(true);
    // Simulate export
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsExporting(false);
    toast.success("Your data export has been requested. You'll receive an email when it's ready.");
  };

  const handleDeleteAccount = () => {
    toast.info("Account deletion request submitted. You'll receive a confirmation email.");
    setShowDeleteDialog(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Data & Privacy</h1>
            <p className="text-sm text-muted-foreground">Control your data and privacy</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Privacy Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Privacy Controls
            </CardTitle>
            <CardDescription>
              Manage how your data is used
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="analyticsEnabled" className="flex-1">
                <span>Usage Analytics</span>
                <p className="text-sm text-muted-foreground">Help us improve by sharing anonymous usage data</p>
              </Label>
              <Switch
                id="analyticsEnabled"
                checked={privacySettings.analyticsEnabled}
                onCheckedChange={() => handleToggle("analyticsEnabled")}
              />
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <Label htmlFor="personalizedAds" className="flex-1">
                <span>Personalized Content</span>
                <p className="text-sm text-muted-foreground">Show personalized recommendations based on your activity</p>
              </Label>
              <Switch
                id="personalizedAds"
                checked={privacySettings.personalizedAds}
                onCheckedChange={() => handleToggle("personalizedAds")}
              />
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <Label htmlFor="shareWithPartners" className="flex-1">
                <span>Partner Sharing</span>
                <p className="text-sm text-muted-foreground">Share data with trusted partners for better services</p>
              </Label>
              <Switch
                id="shareWithPartners"
                checked={privacySettings.shareWithPartners}
                onCheckedChange={() => handleToggle("shareWithPartners")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Your Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Your Data
            </CardTitle>
            <CardDescription>
              Download or manage your personal data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg border border-border bg-muted/30">
              <h3 className="font-medium mb-1">Export Your Data</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Download a copy of all your data including transactions, profile information, and settings.
              </p>
              <Button 
                variant="outline" 
                onClick={handleExportData}
                disabled={isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? "Preparing..." : "Request Data Export"}
              </Button>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/30">
              <h3 className="font-medium mb-1">Transaction History</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Download your complete transaction history as a CSV file.
              </p>
              <Button 
                variant="outline"
                onClick={() => toast.info("Transaction export coming soon")}
              >
                <FileText className="h-4 w-4 mr-2" />
                Download Transactions
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Legal Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Legal Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="ghost" className="w-full justify-between" asChild>
              <a href="#" onClick={(e) => { e.preventDefault(); toast.info("Coming soon"); }}>
                <span>Privacy Policy</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="ghost" className="w-full justify-between" asChild>
              <a href="#" onClick={(e) => { e.preventDefault(); toast.info("Coming soon"); }}>
                <span>Terms of Service</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="ghost" className="w-full justify-between" asChild>
              <a href="#" onClick={(e) => { e.preventDefault(); toast.info("Coming soon"); }}>
                <span>Cookie Policy</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible account actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <h3 className="font-medium mb-1">Delete Account</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <Button 
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete My Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete your account?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This action is permanent and cannot be undone. All your data will be deleted including:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Your profile and personal information</li>
                <li>Transaction history</li>
                <li>Connected bank accounts</li>
                <li>Wallet addresses</li>
              </ul>
              <p className="font-medium text-foreground">
                Please withdraw any remaining funds before proceeding.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, delete my account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DataPrivacySettings;
