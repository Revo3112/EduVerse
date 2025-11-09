"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useActiveAccount } from "thirdweb/react";
import {
  checkEligibilityForCertificate,
  getCertificatePrice,
  getUserCertificateId,
  getCertificateCompletedCourses,
} from "@/services/certificate-blockchain.service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Award, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useCertificate } from "@/hooks/useCertificate";

interface GetCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: bigint;
  courseTitle: string;
  onSuccess?: () => void;
}

export function GetCertificateModal({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  onSuccess,
}: GetCertificateModalProps) {
  const account = useActiveAccount();
  const address = account?.address;

  const { mintOrUpdateCertificate } = useCertificate();

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

  const [progressState, setProgressState] = useState<{
    current: number;
    total: number;
    message: string;
  }>({
    current: 0,
    total: 3,
    message: "",
  });

  const [actualPrice, setActualPrice] = useState<bigint>(BigInt(0));
  const [priceLoading, setPriceLoading] = useState(true);
  const [existingTokenId, setExistingTokenId] = useState<bigint>(BigInt(0));
  const [existingCourses, setExistingCourses] = useState<bigint[]>([]);
  const [isFirstCertificate, setIsFirstCertificate] = useState(true);
  const [courseAlreadyInCertificate, setCourseAlreadyInCertificate] =
    useState(false);

  const [eligible, setEligible] = useState(true);
  const [eligibilityReason, setEligibilityReason] = useState<string | null>(
    null
  );
  const [checkingEligibility, setCheckingEligibility] = useState(true);

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

        const eligibilityResult = await checkEligibilityForCertificate(
          address,
          courseId
        );
        setEligible(eligibilityResult.eligible);
        setEligibilityReason(eligibilityResult.reason || null);

        const tokenId = await getUserCertificateId(address);
        setExistingTokenId(tokenId);
        const hasExistingCert = tokenId > BigInt(0);
        setIsFirstCertificate(!hasExistingCert);

        if (hasExistingCert) {
          const courses = await getCertificateCompletedCourses(tokenId);
          setExistingCourses(courses);

          const alreadyAdded = courses.some(
            (c) => c.toString() === courseId.toString()
          );
          setCourseAlreadyInCertificate(alreadyAdded);
        }

        const price = await getCertificatePrice(courseId, !hasExistingCert);
        setActualPrice(price);
      } catch (error) {
        console.error(
          "[GetCertificateModal] Error fetching price/status:",
          error
        );
        toast.error("Failed to load certificate status");
      } finally {
        setPriceLoading(false);
        setCheckingEligibility(false);
      }
    }

    fetchPriceAndStatus();
  }, [address, courseId, isOpen]);

  const formatPrice = (priceWei: bigint): string => {
    const priceEth = Number(priceWei) / 1e18;
    return `${priceEth.toFixed(5)} MANTA`;
  };

  const handleMintOrUpdate = async () => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (isFirstCertificate && !recipientName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (recipientName.length > 100) {
      toast.error("Name must be 100 characters or less");
      return;
    }

    setIsLoading(true);
    setStep("generating");
    setProgressState({
      current: 1,
      total: 3,
      message: "Generating certificate image...",
    });

    console.log("[GetCertificateModal] 🎨 Starting certificate generation...");

    try {
      const requestBody = {
        studentName: isFirstCertificate ? recipientName.trim() : "Update",
        courseName: courseTitle,
        courseId: courseId.toString(),
        recipientAddress: address,
        platformName:
          process.env.NEXT_PUBLIC_PLATFORM_NAME || "EduVerse Academy",
        baseRoute: `${process.env.NEXT_PUBLIC_APP_URL}/certificates`,
        tokenId: isFirstCertificate ? "0" : existingTokenId.toString(),
        completedCourses: isFirstCertificate
          ? [courseId.toString()]
          : [...existingCourses.map((c) => c.toString()), courseId.toString()],
        isValid: true,
        lifetimeFlag: true,
      };

      const response = await fetch("/api/certificate/generate-pinata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate certificate");
      }

      console.log("[GetCertificateModal] ✅ Certificate image generated");
      setProgressState({
        current: 2,
        total: 3,
        message: "Uploading to IPFS...",
      });

      const data = await response.json();
      console.log(
        "[GetCertificateModal] ✅ IPFS upload complete, CID:",
        data.data.cid
      );

      // Validate CID format
      const cid = data.data.cid;
      const cidV0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
      const cidV1Regex = /^(bafy|bafk|bafz|baf2)[a-z0-9]{52,}$/i;
      const isValidCID = cidV0Regex.test(cid) || cidV1Regex.test(cid);

      if (!isValidCID) {
        console.error("[GetCertificateModal] ❌ INVALID CID FORMAT:", cid);
        throw new Error(`Invalid IPFS CID format received: ${cid}`);
      }

      if (!cid || cid.trim() === "" || cid === "pending") {
        console.error("[GetCertificateModal] ❌ CID is empty or invalid:", cid);
        throw new Error("Certificate CID is missing or invalid");
      }

      console.log("[GetCertificateModal] ✅ CID validation passed");
      console.log(
        "[GetCertificateModal] Public URL:",
        data.data.imageUrl || data.data.signedUrl
      );
      console.log("[GetCertificateModal] Network:", data.data.network);

      setCertificateData({
        ipfsCID: data.data.cid,
        previewUrl: data.data.imageUrl || data.data.signedUrl,
        metadataCID: data.data.metadataCID || "",
      });

      setStep("minting");
      setProgressState({
        current: 3,
        total: 3,
        message: "Minting on blockchain...",
      });

      console.log(
        "[GetCertificateModal] 🔗 Starting blockchain transaction..."
      );

      toast.success(
        isFirstCertificate
          ? "Certificate generated! Minting on blockchain..."
          : "Adding course to certificate..."
      );

      const baseRoute = `${process.env.NEXT_PUBLIC_APP_URL}/certificates`;

      console.log(
        "[GetCertificateModal] Calling mintOrUpdateCertificate with:"
      );
      console.log("  - Course ID:", courseId.toString());
      console.log(
        "  - Recipient:",
        isFirstCertificate ? recipientName.trim() : "Update"
      );
      console.log("  - CID:", data.data.cid);
      console.log("  - Base Route:", baseRoute);

      await mintOrUpdateCertificate(
        courseId,
        isFirstCertificate ? recipientName.trim() : "Update",
        data.data.cid,
        baseRoute
      );

      console.log("[GetCertificateModal] ✅ Blockchain transaction confirmed!");
      console.log(
        "[GetCertificateModal] ✅ CID stored in blockchain:",
        data.data.cid
      );
      console.log(
        "[GetCertificateModal] ✅ Certificate accessible at:",
        `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${data.data.cid}`
      );
      setStep("success");
      toast.success(
        isFirstCertificate
          ? "Certificate minted successfully! 🎉"
          : "Course added to certificate! 🎉"
      );

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("[GetCertificateModal] ❌ Process error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to process certificate"
      );
      setStep("input");
      setProgressState({ current: 0, total: 3, message: "" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setStep("input");
      setRecipientName("");
      setCertificateData(null);
      setProgressState({ current: 0, total: 3, message: "" });
      onClose();
    }
  };

  const renderContent = () => {
    if (checkingEligibility || priceLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Checking eligibility...
          </p>
        </div>
      );
    }

    if (!eligible) {
      return (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <div className="text-center space-y-2">
            <p className="font-medium text-destructive">Not Eligible</p>
            <p className="text-sm text-muted-foreground">
              {eligibilityReason || "You are not eligible for this certificate"}
            </p>
          </div>
        </div>
      );
    }

    if (courseAlreadyInCertificate) {
      return (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
          <div className="text-center space-y-2">
            <p className="font-medium">Already Added</p>
            <p className="text-sm text-muted-foreground">
              This course is already in your certificate
            </p>
          </div>
        </div>
      );
    }

    switch (step) {
      case "input":
        return (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {isFirstCertificate
                    ? "First Certificate"
                    : "Add to Existing Certificate"}
                </p>
                <p className="text-sm text-muted-foreground">{courseTitle}</p>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm">Price:</span>
                  <span className="font-medium">
                    {formatPrice(actualPrice)}
                  </span>
                </div>
              </div>
            </div>

            {isFirstCertificate && (
              <div className="space-y-2">
                <Label htmlFor="recipientName">Your Full Name</Label>
                <Input
                  id="recipientName"
                  placeholder="Enter your name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  maxLength={100}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  This name will appear on your certificate
                </p>
              </div>
            )}

            <Button
              onClick={handleMintOrUpdate}
              disabled={
                isLoading || (isFirstCertificate && !recipientName.trim())
              }
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Award className="mr-2 h-4 w-4" />
                  {isFirstCertificate
                    ? `Get Certificate (${formatPrice(actualPrice)})`
                    : `Add Course (${formatPrice(actualPrice)})`}
                </>
              )}
            </Button>
          </div>
        );

      case "generating":
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">
                Step {progressState.current} of {progressState.total}
              </p>
              <p className="text-sm text-muted-foreground">
                {progressState.message}
              </p>
            </div>
            <div className="w-full max-w-xs bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    (progressState.current / progressState.total) * 100
                  }%`,
                }}
              />
            </div>
          </div>
        );

      case "minting":
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">
                Step {progressState.current} of {progressState.total}
              </p>
              <p className="text-sm text-muted-foreground">
                {progressState.message}
              </p>
            </div>
            <div className="w-full max-w-xs bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    (progressState.current / progressState.total) * 100
                  }%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Please confirm the transaction in your wallet
            </p>
          </div>
        );

      case "success":
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <div className="text-center space-y-2">
              <p className="font-medium">Success!</p>
              <p className="text-sm text-muted-foreground">
                {isFirstCertificate
                  ? "Your certificate has been minted"
                  : "Course added to your certificate"}
              </p>
            </div>
            {certificateData && (
              <a
                href={certificateData.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                View Certificate
              </a>
            )}
            <Button onClick={handleClose} className="mt-4">
              Close
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            {isFirstCertificate
              ? "Get Certificate"
              : "Add Course to Certificate"}
          </DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
