"use client";

import { useActiveAccount } from "thirdweb/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Copy,
  CheckCircle2,
  AlertCircle,
  Wallet,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function WalletDebugPage() {
  const account = useActiveAccount();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Address copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const testGoldskyQuery = async () => {
    if (!account?.address) {
      toast.error("No wallet connected");
      return;
    }

    const normalizedAddress = account.address.toLowerCase();

    try {
      const response = await fetch(
        `https://api.goldsky.com/api/public/project_cmezpe79yxzxt01sxhkaz5fq2/subgraphs/eduverse-manta-pacific-sepolia/1.5.2/gn`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `{
              enrollments(where: {student: "${normalizedAddress}"}) {
                id
                student
                courseId
                isActive
                course {
                  title
                }
              }
            }`,
          }),
        }
      );

      const data = await response.json();

      if (data.errors) {
        toast.error("GraphQL Error: " + data.errors[0].message);
      } else {
        const count = data.data.enrollments.length;
        if (count > 0) {
          toast.success(`Found ${count} enrollment(s)!`);
        } else {
          toast.warning("No enrollments found for this address");
        }
        console.log("Goldsky Response:", data);
      }
    } catch (error) {
      toast.error("Failed to query Goldsky");
      console.error(error);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wallet className="h-8 w-8" />
            Wallet Address Debugger
          </h1>
          <p className="text-muted-foreground mt-2">
            Verify wallet connection and address format
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Active Wallet Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {account?.address ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Wallet Connected</span>
                  <Badge className="bg-green-600">Active</Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Original Address (from thirdweb)
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-muted p-2 rounded flex-1 font-mono break-all">
                        {account.address}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(account.address)}
                      >
                        {copied ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Normalized (lowercase for Goldsky)
                    </p>
                    <code className="text-sm bg-muted p-2 rounded block font-mono break-all">
                      {account.address.toLowerCase()}
                    </code>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Address Length
                    </p>
                    <Badge variant="outline">
                      {account.address.length} characters (expected: 42)
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Format Check
                    </p>
                    <div className="flex gap-2">
                      {account.address.startsWith("0x") ? (
                        <Badge className="bg-green-600">✓ Has 0x prefix</Badge>
                      ) : (
                        <Badge variant="destructive">✗ Missing 0x prefix</Badge>
                      )}
                      {account.address.length === 42 ? (
                        <Badge className="bg-green-600">✓ Correct length</Badge>
                      ) : (
                        <Badge variant="destructive">✗ Wrong length</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={testGoldskyQuery}
                    className="w-full"
                    variant="default"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Test Goldsky Query with This Address
                  </Button>
                </div>
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Wallet Connected</AlertTitle>
                <AlertDescription>
                  Please connect your wallet using the Connect Wallet button in
                  the navigation
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Known Enrollment Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This is the address that has an active enrollment in the Goldsky
              subgraph:
            </p>
            <code className="text-sm bg-muted p-2 rounded block font-mono break-all">
              0xc584f07acd9e7d7a925d77760037386647574337
            </code>

            {account?.address && (
              <div className="pt-2">
                {account.address.toLowerCase() ===
                "0xc584f07acd9e7d7a925d77760037386647574337" ? (
                  <Alert className="border-green-600">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-600">
                      Address Match!
                    </AlertTitle>
                    <AlertDescription>
                      Your connected wallet matches the enrollment address.
                      Enrollments should appear in My Learning.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Address Mismatch</AlertTitle>
                    <AlertDescription>
                      Your connected wallet does not match the enrollment
                      address. Please switch to the wallet that enrolled in the
                      course.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                <strong>Check MetaMask:</strong> Open MetaMask and verify which
                account is currently selected
              </li>
              <li>
                <strong>Multiple Accounts:</strong> If you have multiple
                accounts, make sure you select the one used for enrollment
              </li>
              <li>
                <strong>Transaction History:</strong> Check your MetaMask
                transaction history for the course purchase
              </li>
              <li>
                <strong>Address Format:</strong> Ethereum addresses are
                case-insensitive but should always start with 0x
              </li>
              <li>
                <strong>Goldsky Query:</strong> Use the &quot;Test Goldsky
                Query&quot; button above to verify if enrollments exist
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How to Fix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Solution</AlertTitle>
              <AlertDescription>
                <ol className="list-decimal list-inside space-y-1 mt-2">
                  <li>Open MetaMask extension</li>
                  <li>Click on the account dropdown at the top center</li>
                  <li>
                    Select the account ending in:{" "}
                    <code className="font-mono">...74337</code>
                  </li>
                  <li>Refresh this page</li>
                  <li>Navigate to My Learning page</li>
                </ol>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
