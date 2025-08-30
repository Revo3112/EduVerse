"use client";

import { useActiveAccount, useWalletBalance } from "thirdweb/react";
import { client } from "../app/client";
import { chain } from "../lib/chains";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function Web3Status() {
  const account = useActiveAccount();
  const { data: balance, isLoading } = useWalletBalance({
    client,
    chain,
    address: account?.address,
  });

  if (!account) {
    return (
      <div className="p-6 text-center">
        <div className="w-20 h-20 mx-auto mb-4 gradient-secondary rounded-full flex items-center justify-center shadow-inner">
          <span className="text-3xl">🔌</span>
        </div>
        <h3 className="font-semibold text-foreground mb-2">Wallet Disconnected</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Connect your wallet to access Web3 features and start learning
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="border-border bg-card">
        <AlertDescription className="text-card-foreground font-medium flex items-center gap-2">
          <span className="text-lg">✅</span>
          Wallet Successfully Connected
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <Card className="border-0 gradient-accent">
          <CardContent className="p-4">
            <div className="text-center mb-3">
              <Badge variant="secondary">
                🔗 Connected Account
              </Badge>
            </div>
            <div className="p-3 bg-card rounded-lg font-mono text-xs break-all text-center border border-border">
              {account.address}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 gradient-card">
            <CardContent className="p-4 text-center">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Network
              </div>
              <Badge className="bg-primary text-primary-foreground">
                {chain.name}
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">
                ID: {chain.id}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 gradient-card">
            <CardContent className="p-4 text-center">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Balance
              </div>
              {isLoading ? (
                <div className="animate-pulse bg-muted h-6 w-16 rounded mx-auto"></div>
              ) : (
                <>
                  <div className="text-lg font-bold text-foreground">
                    {balance ? parseFloat(balance.displayValue).toFixed(4) : "0.0000"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {balance ? balance.symbol : "ETH"}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Separator />

        <div className="text-center">
          <Badge variant="outline">
            🟢 Ready for Web3 Learning
          </Badge>
        </div>
      </div>
    </div>
  );
}
