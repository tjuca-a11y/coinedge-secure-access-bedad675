import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  CreditCard, 
  Building2, 
  Plus, 
  CheckCircle,
  Trash2,
  Star,
  AlertCircle,
  User,
  Wallet
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDynamicWallet } from "@/contexts/DynamicWalletContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePlaidLink } from "@/hooks/usePlaidLink";

interface BankAccount {
  id: string;
  bank_name: string;
  account_mask: string;
  account_type: string;
  is_verified: boolean | null;
  is_primary: boolean | null;
  created_at: string;
}

const PaymentMethodsSettings: React.FC = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { isAuthenticated: isDynamicAuth, syncedProfile, dynamicUser } = useDynamicWallet();
  const queryClient = useQueryClient();
  const { openPlaidLink, isReady: plaidReady } = usePlaidLink(() => {
    // refresh after linking
    queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Determine identity source and profile ID
  const isEmailAuth = !!user && !isDynamicAuth;
  const isWalletAuth = isDynamicAuth;
  const profileId = isWalletAuth ? syncedProfile?.userId : profile?.id;
  const identityEmail = isWalletAuth ? (dynamicUser?.email || syncedProfile?.email) : user?.email;

  const { data: bankAccounts = [], isLoading } = useQuery({
    queryKey: ["bank-accounts", profileId],
    queryFn: async () => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from("user_bank_accounts_public")
        .select("id, bank_name, account_mask, account_type, is_verified, is_primary, created_at, user_id")
        .eq("user_id", profileId)
        .order("is_primary", { ascending: false });

      if (error) throw error;
      return (data || []) as BankAccount[];
    },
    enabled: !!profileId,
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (accountId: string) => {
      if (!profileId) throw new Error('Not signed in');

      // First unset all as non-primary
      await supabase
        .from("user_bank_accounts")
        .update({ is_primary: false })
        .eq("user_id", profileId);

      // Then set the selected as primary
      const { error } = await supabase
        .from("user_bank_accounts")
        .update({ is_primary: true })
        .eq("id", accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Primary account updated");
    },
    onError: () => {
      toast.error("Failed to update primary account");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from("user_bank_accounts")
        .delete()
        .eq("id", accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Bank account removed");
      setDeletingId(null);
    },
    onError: () => {
      toast.error("Failed to remove bank account");
      setDeletingId(null);
    },
  });

  const handleAddBank = async () => {
    if (plaidReady) {
      openPlaidLink();
    } else {
      toast.info("Bank linking is initializing, please try again");
    }
  };

  const handleSetPrimary = (accountId: string) => {
    setPrimaryMutation.mutate(accountId);
  };

  const handleDelete = (accountId: string) => {
    setDeletingId(accountId);
    deleteMutation.mutate(accountId);
  };

  const getBankIcon = (bankName: string) => {
    // Could be extended with actual bank logos
    return <Building2 className="h-6 w-6 text-primary" />;
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
            <h1 className="text-2xl font-bold">Payment Methods</h1>
            <p className="text-muted-foreground">Manage your funding sources and withdrawal destinations</p>
          </div>
        </div>

        {/* Identity Panel */}
        <Card className="border-muted bg-muted/30">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-background">
                {isWalletAuth ? (
                  <Wallet className="h-4 w-4 text-primary" />
                ) : (
                  <User className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Signed in as</span>
                  <Badge variant="outline" className="text-xs">
                    {isWalletAuth ? 'Wallet' : 'Email'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {identityEmail || 'No email'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Profile ID</p>
                <code className="text-xs font-mono text-muted-foreground">
                  {profileId ? `${profileId.slice(0, 8)}…` : 'none'}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Banner */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Secure Bank Connection</p>
                <p className="text-sm text-muted-foreground">
                  We use bank-level encryption to securely connect your accounts. Your credentials are never stored.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Accounts Card */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Bank Accounts</h3>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddBank} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Bank
              </Button>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                Loading accounts...
              </div>
            ) : bankAccounts.length === 0 ? (
              <div className="py-8 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">No bank accounts linked</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Add a bank account to fund your wallet or withdraw funds
                </p>
                <Button onClick={handleAddBank} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Link Bank Account
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {bankAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-full">
                        {getBankIcon(account.bank_name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{account.bank_name}</span>
                          {account.is_primary && (
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-xs gap-1">
                              <Star className="h-3 w-3" />
                              Primary
                            </Badge>
                          )}
                          {account.is_verified && (
                            <Badge className="bg-success/10 text-success hover:bg-success/20 text-xs">
                              Verified
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {account.account_type} •••• {account.account_mask}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!account.is_primary && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetPrimary(account.id)}
                          disabled={setPrimaryMutation.isPending}
                        >
                          Set Primary
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(account.id)}
                        disabled={deletingId === account.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cards Section (Coming Soon) */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Debit Cards</h3>
                <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
              </div>
            </div>

            <div className="py-6 text-center border border-dashed rounded-lg">
              <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Debit card support is coming soon
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PaymentMethodsSettings;
