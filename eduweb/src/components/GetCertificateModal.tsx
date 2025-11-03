"use client";

import { Award, Check, Download, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { keccak256, encodePacked, stringToHex } from "thirdweb/utils";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import { useCertificate } from "@/hooks/useCertificateBlockchain";
import {
  getCertificatePrice,
  getUserCertificateId,
  getCertificateCompletedCourses,
} from "@/services/certificate-blockchain.service";
import { checkCertificateEligibility } from "@/services/goldsky-mylearning.service";

interface GetCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: bigint;
  courseTitle: string;
  certificatePrice: bigint; // Legacy prop, will be overridden by actual fetch
  onSuccess?: () => void;
}

/**
 * GetCertificateModal Component
 *
 * A blockchain-integrated modal for minting/updating certificates.
 * - Fetches actual price from smart contract
 * - Checks existing certificate status
 * - Generates proper payment hash (bytes32 keccak256)
 * - Integrates with CertificateManager via useCertificate hook
 * - Uploads image/metadata to Pinata IPFS
 * - Emits events for Goldsky indexing
 *
 * @param {boolean} isOpen - Controls modal visibility
 * @param {Function} onClose - Callback when modal closes
 * @param {bigint} courseId - Course ID for certificate
 * @param {string} courseTitle - Course title for display
 * @param {bigint} certificatePrice - Legacy prop (overridden by fetch)
 * @param {Function} onSuccess - Callback after successful mint
 */
export function GetCertificateModal({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  onSuccess,
}: GetCertificateModalProps) {
  const account = useActiveAccount();
  const address = account?.address;

  // Use certificate hook for blockchain operations
  const {
    mintOrUpdateCertificate,
    checkEligibility,
    isMinting,
    loading: hookLoading,
  } = useCertificate();

  // State Management
  const [recipientName, setRecipientName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<
    "input" | "generating" | "minting" | "success"
  >("input");
  const [certificateData, setCertificateData] = useState<{
    ipfsCID: string;
    previewUrl: string;
    metadataCID: string;
  } | null>(null);

  // Price and certificate status
  const [actualPrice, setActualPrice] = useState<bigint>(BigInt(0));
  const [priceLoading, setPriceLoading] = useState(true);
  const [existingTokenId, setExistingTokenId] = useState<bigint>(BigInt(0));
  const [existingCourses, setExistingCourses] = useState<bigint[]>([]);
  const [isFirstCertificate, setIsFirstCertificate] = useState(true);

  // Eligibility state
  const [eligible, setEligible] = useState(true);
  const [eligibilityReason, setEligibilityReason] = useState<string | null>(
    null
  );
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  /**
   * Fetch actual certificate price and existing certificate status on mount
   */
  useEffect(() => {
    async function fetchPriceAndStatus() {
      if (!address || !isOpen) {
        setPriceLoading(false);
        setCheckingEligibility(false);
        return;
      }

      try {
        setPriceLoading(true);
        setCheckingEligibility(true);

        // Check eligibility FIRST (before any other operations)
        const eligibilityResult = await checkCertificateEligibility(
          address,
          courseId.toString()
        );
        setEligible(eligibilityResult.eligible);
        setEligibilityReason(eligibilityResult.reason || null);

        if (!eligibilityResult.eligible) {
          console.log("[GetCertificateModal] User not eligible:", {
            reason: eligibilityResult.reason,
            courseId: courseId.toString(),
          });
          // Still fetch price for display, but user cannot proceed
        }

        // Check if user already has a certificate
        const tokenId = await getUserCertificateId(address);
        setExistingTokenId(tokenId);
        setIsFirstCertificate(tokenId === BigInt(0));

        // Get completed courses if certificate exists
        if (tokenId > BigInt(0)) {
          const courses = await getCertificateCompletedCourses(tokenId);
          setExistingCourses(courses);
        } else {
          setExistingCourses([]);
        }

        // Fetch actual price from contract
        const price = await getCertificatePrice(
          courseId,
          tokenId === BigInt(0)
        );
        setActualPrice(price);

        console.log("[GetCertificateModal] Price and status fetched:", {
          courseId: courseId.toString(),
          eligible: eligibilityResult.eligible,
          eligibilityReason: eligibilityResult.reason,
          isFirstCertificate: tokenId === BigInt(0),
          priceWei: price.toString(),
          priceEth: Number(price) / 1e18,
          existingTokenId: tokenId.toString(),
          existingCoursesCount: existingCourses.length,
        });
      } catch (error) {
        console.error(
          "[GetCertificateModal] Error fetching price/status:",
          error
        );
        toast.error("Failed to fetch certificate information");
        setEligible(false);
        setEligibilityReason("Failed to check eligibility. Please try again.");
      } finally {
        setPriceLoading(false);
        setCheckingEligibility(false);
      }
    }

    fetchPriceAndStatus();
  }, [address, courseId, isOpen, checkEligibility, existingCourses.length]);

  // Format price from Wei to ETH
  const formatPrice = (priceWei: bigint): string => {
    const priceEth = Number(priceWei) / 1e18;
    return `${priceEth.toFixed(5)} ETH`;
  };

  /**
   * Generate proper payment hash (bytes32 keccak256)
   * Matches CertificateManager.sol expectation
   */
  const generatePaymentHash = (
    userAddress: string,
    courseId: bigint,
    timestamp: number,
    nonce: string
  ): string => {
    // Generate nonce hash (equivalent to ethers.id which is keccak256 of string)
    const nonceHash = keccak256(stringToHex(nonce));

    // Pack the data using thirdweb's encodePacked
    const packed = encodePacked(
      ["address", "uint256", "uint256", "bytes32"],
      [userAddress as `0x${string}`, courseId, BigInt(timestamp), nonceHash]
    );

    // Return keccak256 hash of packed data
    return keccak256(packed);
  };

  /**
   * Handle certificate generation and blockchain minting
   * Complete flow: validate → generate image → upload IPFS → mint contract
   */
  const handleGenerateCertificate = async () => {
    if (!recipientName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (recipientName.length > 100) {
      toast.error("Name must be 100 characters or less");
      return;
    }

    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    setIsLoading(true);
    setStep("generating");

    try {
      // ==================== STEP 1: GENERATE CERTIFICATE IMAGE & METADATA ====================
      console.log("[GetCertificateModal] Generating certificate...");

      // Prepare request body with blockchain-compatible structure
      const requestBody = {
        // Required fields for certificate generation
        studentName: recipientName.trim(),
        courseName: courseTitle,
        courseId: courseId.toString(),

        // Blockchain fields for metadata/QR
        recipientAddress: address,
        platformName:
          process.env.NEXT_PUBLIC_PLATFORM_NAME || "EduVerse Academy",
        baseRoute:
          typeof window !== "undefined"
            ? `${window.location.origin}/certificates`
            : "http://localhost:3000/certificates",

        // Certificate metadata
        tokenId: existingTokenId.toString(),
        completedCourses:
          existingTokenId > BigInt(0)
            ? existingCourses.map((c) => c.toString())
            : [courseId.toString()],
        isValid: true,
        lifetimeFlag: true,
      };

      console.log(
        "[GetCertificateModal] Sending request to generate-pinata API:",
        {
          ...requestBody,
          recipientAddress: `${requestBody.recipientAddress.slice(
            0,
            6
          )}...${requestBody.recipientAddress.slice(-4)}`,
        }
      );

      // Call Pinata upload API
      const response = await fetch("/api/certificate/generate-pinata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[GetCertificateModal] API Error:", errorData);
        throw new Error(errorData.error || "Failed to generate certificate");
      }

      const data = await response.json();
      console.log("[GetCertificateModal] Certificate generation successful:", {
        cid: data.data?.cid,
        metadataCID: data.data?.metadataCID,
        verificationUrl: data.data?.verificationUrl,
      });

      // Store certificate data
      setCertificateData({
        ipfsCID: data.data.cid, // Plain CID for smart contract
        previewUrl: data.data.signedUrl, // IPFS gateway URL
        metadataCID: data.data.metadataCID || "", // Metadata CID
      });

      setStep("minting");
      toast.success("Certificate generated! Proceeding to blockchain...");

      // ==================== STEP 2: MINT/UPDATE ON BLOCKCHAIN ====================
      console.log("[GetCertificateModal] Minting certificate on blockchain...");

      // Generate payment hash (bytes32 keccak256)
      const paymentHash = generatePaymentHash(
        address as string,
        courseId,
        Date.now(),
        crypto.randomUUID()
      );

      console.log("[GetCertificateModal] Payment hash generated:", {
        hash: paymentHash,
        length: paymentHash.length,
        format: "bytes32",
      });

      // Construct baseRoute for QR code
      const baseRoute =
        typeof window !== "undefined"
          ? `${window.location.origin}/certificates`
          : `${
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }/certificates`;

      // Call blockchain mint/update via hook
      await mintOrUpdateCertificate(
        courseId,
        recipientName.trim(),
        data.data.cid,
        baseRoute
      );

      console.log("[GetCertificateModal] Certificate minted successfully!");

      setStep("success");
      toast.success("Certificate minted successfully! 🎉");

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("[GetCertificateModal] Certificate process error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to process certificate"
      );
      setStep("input");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle download certificate
  const handleDownload = () => {
    if (!certificateData) return;
    window.open(certificateData.previewUrl, "_blank");
    toast.success("Opening certificate...");
  };

  // Reset and close modal
  const handleClose = () => {
    if (!isLoading && !isMinting) {
      setRecipientName("");
      setStep("input");
      setCertificateData(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                Get Your Certificate
              </DialogTitle>
              <DialogDescription>
                {step === "input" &&
                  "Complete your learning journey with a blockchain-verified certificate"}
                {step === "generating" &&
                  "Generating your personalized certificate..."}
                {step === "minting" &&
                  "Minting your certificate on blockchain..."}
                {step === "success" && "Your certificate is ready! 🎉"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Course Information */}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">
              Course
            </h3>
            <p className="font-medium">{courseTitle}</p>
          </div>

          {/* Input Step */}
          {step === "input" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="recipientName" className="text-base">
                  Your Name <span className="text-destructive">*</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  This name will appear on your certificate exactly as entered.
                </p>
                <Input
                  id="recipientName"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Enter your full name"
                  maxLength={100}
                  className="text-lg"
                  autoFocus
                  disabled={priceLoading || hookLoading}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {recipientName.length}/100 characters
                </p>
              </div>

              {/* Eligibility Error Alert */}
              {!eligible && eligibilityReason && !checkingEligibility && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-destructive/20 p-1">
                      <ExternalLink className="h-4 w-4 text-destructive" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-destructive">
                        Not Eligible for Certificate
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {eligibilityReason}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Certificate Fee Breakdown */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Certificate Fee</span>
                  {priceLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading...</span>
                    </div>
                  ) : (
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(actualPrice)}
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                    <span>
                      {isFirstCertificate
                        ? "90% goes to course creator (first certificate mint)"
                        : "Adding course to your existing certificate"}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                    <span>Lifetime valid NFT certificate</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                    <span>Blockchain-verified with QR code</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                    <span>
                      {isFirstCertificate
                        ? "Cumulative learning credential (grows with your courses)"
                        : `Currently includes ${existingCourses.length} course${
                            existingCourses.length > 1 ? "s" : ""
                          }`}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Generating/Minting Step */}
          {(step === "generating" || step === "minting") && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
                <Award className="h-8 w-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium">
                  {step === "generating" &&
                    "Creating your personalized certificate..."}
                  {step === "minting" && "Minting certificate on blockchain..."}
                </p>
                <p className="text-sm text-muted-foreground">
                  {step === "generating" &&
                    "Uploading to IPFS and preparing metadata"}
                  {step === "minting" &&
                    "Confirm the transaction in your wallet"}
                </p>
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === "success" && certificateData && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="p-4 rounded-full bg-green-500/10">
                  <Check className="h-12 w-12 text-green-500" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold">Certificate Minted!</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Your certificate has been successfully minted on the
                    blockchain. You can now view, download, or share it.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(certificateData.previewUrl, "_blank")
                  }
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on IPFS
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "input" && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading || isMinting || priceLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateCertificate}
                disabled={
                  !recipientName.trim() ||
                  isLoading ||
                  isMinting ||
                  priceLoading ||
                  checkingEligibility ||
                  !eligible
                }
                className="min-w-[140px]"
              >
                {isLoading || isMinting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : priceLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Award className="h-4 w-4 mr-2" />
                    Get Certificate
                  </>
                )}
              </Button>
            </>
          )}

          {step === "success" && (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
