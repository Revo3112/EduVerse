"use client";

import { useActiveAccount } from "thirdweb/react";
import { readContract, prepareContractCall, sendTransaction } from "thirdweb";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertCircle,
  Shield,
  CheckCircle2,
  Settings,
  DollarSign,
  Users,
  Pause,
  Play,
  Link,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  certificateManager,
  courseLicense,
  courseFactory,
  CONTRACT_ADDRESSES,
} from "@/lib/contracts";
import { chain } from "@/lib/chains";

const DEPLOYER_ADDRESS = process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS!;

export default function AdminPage() {
  const account = useActiveAccount();
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [contractData, setContractData] = useState<{
    defaultCertFee?: string;
    defaultCourseAddFee?: string;
    defaultPlatformName?: string;
    defaultBaseRoute?: string;
    platformWallet?: string;
    platformFeePercentage?: string;
  }>({});

  const [certFee, setCertFee] = useState("");
  const [courseAddFee, setCourseAddFee] = useState("");
  const [platformWallet, setPlatformWallet] = useState("");
  const [platformName, setPlatformName] = useState("");
  const [baseRoute, setBaseRoute] = useState("");
  const [licenseBaseURI, setLicenseBaseURI] = useState("");
  const [platformFeePercent, setPlatformFeePercent] = useState("");
  const [blacklistAddress, setBlacklistAddress] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [customTokenURI, setCustomTokenURI] = useState("");
  const [revokeTokenId, setRevokeTokenId] = useState("");
  const [revokeReason, setRevokeReason] = useState("");

  useEffect(() => {
    async function checkOwnership() {
      if (!account?.address) {
        setIsOwner(false);
        setLoading(false);
        return;
      }

      try {
        setIsOwner(
          DEPLOYER_ADDRESS.toLowerCase() === account.address.toLowerCase()
        );

        if (DEPLOYER_ADDRESS.toLowerCase() === account.address.toLowerCase()) {
          await loadContractData();
        }
      } catch (error) {
        console.error("Error checking ownership:", error);
        setIsOwner(false);
      } finally {
        setLoading(false);
      }
    }

    checkOwnership();
  }, [account?.address]);

  async function loadContractData() {
    setLoadingData(true);
    try {
      const [
        defaultCertFee,
        defaultCourseAddFee,
        defaultPlatformName,
        defaultBaseRoute,
        platformWalletAddr,
        platformFeePercentage,
      ] = await Promise.all([
        readContract({
          contract: certificateManager,
          method: "function defaultCertificateFee() view returns (uint256)",
          params: [],
        }),
        readContract({
          contract: certificateManager,
          method: "function defaultCourseAdditionFee() view returns (uint256)",
          params: [],
        }),
        readContract({
          contract: certificateManager,
          method: "function defaultPlatformName() view returns (string)",
          params: [],
        }),
        readContract({
          contract: certificateManager,
          method: "function defaultBaseRoute() view returns (string)",
          params: [],
        }),
        readContract({
          contract: certificateManager,
          method: "function platformWallet() view returns (address)",
          params: [],
        }),
        readContract({
          contract: courseLicense,
          method: "function platformFeePercentage() view returns (uint256)",
          params: [],
        }),
      ]);

      setContractData({
        defaultCertFee: defaultCertFee.toString(),
        defaultCourseAddFee: defaultCourseAddFee.toString(),
        defaultPlatformName,
        defaultBaseRoute,
        platformWallet: platformWalletAddr,
        platformFeePercentage: platformFeePercentage.toString(),
      });
      toast.success("Contract data loaded successfully");
    } catch (error) {
      console.error("Error loading contract data:", error);
      toast.error("Failed to load contract data");
    } finally {
      setLoadingData(false);
    }
  }

  async function handleSetCertificateFee() {
    if (!account) return;
    try {
      const tx = prepareContractCall({
        contract: certificateManager,
        method: "function setDefaultCertificateFee(uint256 newFee)",
        params: [BigInt(certFee)],
      });

      await sendTransaction({ transaction: tx, account });
      toast.success("Certificate fee updated successfully");
      await loadContractData();
    } catch (error) {
      toast.error(
        (error as Error).message || "Failed to update certificate fee"
      );
    }
  }

  async function handleSetCourseAdditionFee() {
    if (!account) return;
    try {
      const tx = prepareContractCall({
        contract: certificateManager,
        method: "function setDefaultCourseAdditionFee(uint256 newFee)",
        params: [BigInt(courseAddFee)],
      });

      await sendTransaction({ transaction: tx, account });
      toast.success("Course addition fee updated successfully");
      await loadContractData();
    } catch (error) {
      toast.error(
        (error as Error).message || "Failed to update course addition fee"
      );
    }
  }

  async function handleSetPlatformWallet() {
    if (!account) return;
    try {
      const tx = prepareContractCall({
        contract: certificateManager,
        method: "function setPlatformWallet(address newWallet)",
        params: [platformWallet],
      });

      await sendTransaction({ transaction: tx, account });
      toast.success("Platform wallet updated successfully");
      await loadContractData();
    } catch (error) {
      toast.error(
        (error as Error).message || "Failed to update platform wallet"
      );
    }
  }

  async function handleSetPlatformName() {
    if (!account) return;
    try {
      const tx = prepareContractCall({
        contract: certificateManager,
        method: "function setDefaultPlatformName(string newPlatformName)",
        params: [platformName],
      });

      await sendTransaction({ transaction: tx, account });
      toast.success("Platform name updated successfully");
      await loadContractData();
    } catch (error) {
      toast.error((error as Error).message || "Failed to update platform name");
    }
  }

  async function handleSetDefaultBaseRoute() {
    if (!account) return;
    try {
      const tx = prepareContractCall({
        contract: certificateManager,
        method: "function updateDefaultBaseRoute(string newBaseRoute)",
        params: [baseRoute],
      });

      await sendTransaction({ transaction: tx, account });
      toast.success("Default base route updated successfully");
      await loadContractData();
    } catch (error) {
      toast.error(
        (error as Error).message || "Failed to update default base route"
      );
    }
  }

  async function handleSetTokenURI() {
    if (!account) return;
    try {
      const tx = prepareContractCall({
        contract: certificateManager,
        method: "function setTokenURI(uint256 tokenId, string tokenURI)",
        params: [BigInt(tokenId), customTokenURI],
      });

      await sendTransaction({ transaction: tx, account });
      toast.success("Token URI updated successfully");
    } catch (error) {
      toast.error((error as Error).message || "Failed to update token URI");
    }
  }

  async function handleRevokeCertificate() {
    if (!account) return;
    try {
      const tx = prepareContractCall({
        contract: certificateManager,
        method: "function revokeCertificate(uint256 tokenId, string reason)",
        params: [BigInt(revokeTokenId), revokeReason],
      });

      await sendTransaction({ transaction: tx, account });
      toast.success("Certificate revoked successfully");
    } catch (error) {
      toast.error((error as Error).message || "Failed to revoke certificate");
    }
  }

  async function handlePauseContract() {
    if (!account) return;
    try {
      const tx = prepareContractCall({
        contract: certificateManager,
        method: "function pause()",
        params: [],
      });

      await sendTransaction({ transaction: tx, account });
      toast.success("Contract paused successfully");
    } catch (error) {
      toast.error((error as Error).message || "Failed to pause contract");
    }
  }

  async function handleUnpauseContract() {
    if (!account) return;
    try {
      const tx = prepareContractCall({
        contract: certificateManager,
        method: "function unpause()",
        params: [],
      });

      await sendTransaction({ transaction: tx, account });
      toast.success("Contract unpaused successfully");
    } catch (error) {
      toast.error((error as Error).message || "Failed to unpause contract");
    }
  }

  async function handleSetLicenseURI() {
    if (!account) return;
    try {
      const tx = prepareContractCall({
        contract: courseLicense,
        method: "function setURI(string newuri)",
        params: [licenseBaseURI],
      });

      await sendTransaction({ transaction: tx, account });
      toast.success("License base URI updated successfully");
    } catch (error) {
      toast.error(
        (error as Error).message || "Failed to update license base URI"
      );
    }
  }

  async function handleSetPlatformFeePercentage() {
    if (!account) return;
    try {
      const tx = prepareContractCall({
        contract: courseLicense,
        method: "function setPlatformFeePercentage(uint256 _feePercentage)",
        params: [BigInt(platformFeePercent)],
      });

      await sendTransaction({ transaction: tx, account });
      toast.success("Platform fee percentage updated successfully");
      await loadContractData();
    } catch (error) {
      toast.error(
        (error as Error).message || "Failed to update platform fee percentage"
      );
    }
  }

  async function handleBlacklistUser() {
    if (!account) return;
    try {
      const tx = prepareContractCall({
        contract: courseFactory,
        method: "function blacklistUser(address user)",
        params: [blacklistAddress],
      });

      await sendTransaction({ transaction: tx, account });
      toast.success("User blacklisted successfully");
    } catch (error) {
      toast.error((error as Error).message || "Failed to blacklist user");
    }
  }

  async function handleUnblacklistUser() {
    if (!account) return;
    try {
      const tx = prepareContractCall({
        contract: courseFactory,
        method: "function unblacklistUser(address user)",
        params: [blacklistAddress],
      });

      await sendTransaction({ transaction: tx, account });
      toast.success("User unblacklisted successfully");
    } catch (error) {
      toast.error((error as Error).message || "Failed to unblacklist user");
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Verifying access...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-2 text-yellow-600 mb-2">
                <AlertCircle className="h-6 w-6" />
                <CardTitle>Wallet Not Connected</CardTitle>
              </div>
              <CardDescription>
                Please connect your wallet to access the admin panel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This page requires wallet authentication. Connect your wallet
                using the button in the navigation bar.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isOwner === false) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full border-red-200 dark:border-red-900">
            <CardHeader>
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <AlertCircle className="h-6 w-6" />
                <CardTitle>Access Denied</CardTitle>
              </div>
              <CardDescription>
                You are not authorized to access this page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This admin panel is restricted to the contract owner only.
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-xs font-mono text-muted-foreground break-all">
                  Your address: {account.address}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Contract management and administrative tools
        </p>
      </div>

      <Card className="mb-8 border-green-200 dark:border-green-900">
        <CardHeader>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <CardTitle>Access Verified</CardTitle>
          </div>
          <CardDescription>
            You are authenticated as the contract owner
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-xs font-mono text-muted-foreground break-all">
              Owner address: {account.address}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  <CardTitle>Certificate Manager Settings</CardTitle>
                </div>
                <CardDescription>
                  Configure certificate fees and platform settings
                </CardDescription>
              </div>
              <Button
                onClick={loadContractData}
                disabled={loadingData}
                variant="outline"
                size="sm"
              >
                {loadingData ? "Loading..." : "Refresh Values"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2 mb-6">
              <h3 className="font-semibold text-sm">Current Contract Values</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">
                    Certificate Fee:
                  </span>
                  <p className="font-mono">
                    {contractData.defaultCertFee
                      ? `${contractData.defaultCertFee} wei`
                      : "Not loaded"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Course Addition Fee:
                  </span>
                  <p className="font-mono">
                    {contractData.defaultCourseAddFee
                      ? `${contractData.defaultCourseAddFee} wei`
                      : "Not loaded"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Platform Name:</span>
                  <p className="font-mono">
                    {contractData.defaultPlatformName || "Not loaded"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Base Route:</span>
                  <p className="font-mono break-all">
                    {contractData.defaultBaseRoute || "Not loaded"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Platform Wallet:
                  </span>
                  <p className="font-mono text-xs break-all">
                    {contractData.platformWallet || "Not loaded"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Platform Fee %:</span>
                  <p className="font-mono">
                    {contractData.platformFeePercentage
                      ? `${contractData.platformFeePercentage}%`
                      : "Not loaded"}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Default Certificate Fee (wei)</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Enter fee in wei"
                    value={certFee}
                    onChange={(e) => setCertFee(e.target.value)}
                  />
                  <Button onClick={handleSetCertificateFee}>Update</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Default Course Addition Fee (wei)</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Enter fee in wei"
                    value={courseAddFee}
                    onChange={(e) => setCourseAddFee(e.target.value)}
                  />
                  <Button onClick={handleSetCourseAdditionFee}>Update</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Platform Wallet Address</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="0x..."
                    value={platformWallet}
                    onChange={(e) => setPlatformWallet(e.target.value)}
                  />
                  <Button onClick={handleSetPlatformWallet}>Update</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Platform Name</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="EduVerse Academy"
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                  />
                  <Button onClick={handleSetPlatformName}>Update</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              <CardTitle>Certificate URI Settings</CardTitle>
            </div>
            <CardDescription>
              Configure base routes and token URIs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Default Base Route</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="https://yourdomain.com/verify"
                  value={baseRoute}
                  onChange={(e) => setBaseRoute(e.target.value)}
                />
                <Button onClick={handleSetDefaultBaseRoute}>Update</Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Set Custom Token URI</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Token ID"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  className="w-32"
                />
                <Input
                  type="text"
                  placeholder="Custom URI"
                  value={customTokenURI}
                  onChange={(e) => setCustomTokenURI(e.target.value)}
                />
                <Button onClick={handleSetTokenURI}>Set URI</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle>License Settings</CardTitle>
            </div>
            <CardDescription>
              Configure course license parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>License Base URI</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="https://yourdomain.com/api/nft/license/"
                  value={licenseBaseURI}
                  onChange={(e) => setLicenseBaseURI(e.target.value)}
                />
                <Button onClick={handleSetLicenseURI}>Update</Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Platform Fee Percentage (basis points, max 5000 = 50%)
              </Label>
              <div className="text-xs text-muted-foreground mb-2">
                Current: {contractData.platformFeePercentage || "Loading..."} (
                {(
                  parseInt(contractData.platformFeePercentage || "0") / 100
                ).toFixed(2)}
                %)
              </div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="1000 = 10%"
                  value={platformFeePercent}
                  onChange={(e) => setPlatformFeePercent(e.target.value)}
                />
                <Button onClick={handleSetPlatformFeePercentage}>Update</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>User Management</CardTitle>
            </div>
            <CardDescription>Blacklist or unblacklist users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>User Address</Label>
              <Input
                type="text"
                placeholder="0x..."
                value={blacklistAddress}
                onChange={(e) => setBlacklistAddress(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={handleBlacklistUser} variant="destructive">
                  Blacklist User
                </Button>
                <Button onClick={handleUnblacklistUser} variant="outline">
                  Unblacklist User
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle>Certificate Management</CardTitle>
            </div>
            <CardDescription>Revoke certificates with reason</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Token ID to Revoke</Label>
              <Input
                type="text"
                placeholder="Token ID"
                value={revokeTokenId}
                onChange={(e) => setRevokeTokenId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Revocation Reason</Label>
              <Input
                type="text"
                placeholder="Reason for revocation"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
              />
            </div>
            <Button onClick={handleRevokeCertificate} variant="destructive">
              Revoke Certificate
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Pause className="h-5 w-5" />
              <CardTitle>Emergency Controls</CardTitle>
            </div>
            <CardDescription>
              Pause or unpause certificate contract operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={handlePauseContract}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Pause className="h-4 w-4" />
                Pause Contract
              </Button>
              <Button
                onClick={handleUnpauseContract}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Unpause Contract
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>Contract Information</CardTitle>
            </div>
            <CardDescription>
              Deployed contract addresses and network details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Certificate Manager</p>
                <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                  {CONTRACT_ADDRESSES.CERTIFICATE_MANAGER}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Course Factory</p>
                <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                  {CONTRACT_ADDRESSES.COURSE_FACTORY}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Course License</p>
                <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                  {CONTRACT_ADDRESSES.COURSE_LICENSE}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Progress Tracker</p>
                <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                  {CONTRACT_ADDRESSES.PROGRESS_TRACKER}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Network</p>
                <p className="text-xs font-mono bg-muted p-2 rounded">
                  Manta Pacific Testnet ({chain.id})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
