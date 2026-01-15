import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, RefreshCw, CheckCircle2 } from "lucide-react";
import { useUserBankAccounts } from "@/hooks/useTreasury";
import { useDynamicWallet } from "@/contexts/DynamicWalletContext";
import { formatDistanceToNow } from "date-fns";

export const BankAccountsCard: React.FC = () => {
  const { syncedProfile } = useDynamicWallet();
  const { data: accounts = [], dataUpdatedAt, isLoading } = useUserBankAccounts(syncedProfile?.userId);

  const accountCount = accounts.length;
  const lastRefresh = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  return (
    <Card className="mb-4 md:mb-6">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Bank Accounts</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading…</span>
          </div>
        ) : accountCount > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="font-medium">
                {accountCount} {accountCount === 1 ? "account" : "accounts"} linked
              </span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 pl-6">
              {accounts.map((acc) => (
                <li key={acc.id}>
                  {acc.bank_name} ••••{acc.account_mask}
                </li>
              ))}
            </ul>
            {lastRefresh && (
              <p className="text-xs text-muted-foreground pt-1">
                Last refreshed {formatDistanceToNow(lastRefresh, { addSuffix: true })}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No bank accounts linked yet. Connect one via Buy/Sell or Cash Out.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
