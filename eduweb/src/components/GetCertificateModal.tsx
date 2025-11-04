"use client";

import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Award, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useCertificate } from "@/hooks/useCertificate";
import {
  getCertificatePrice,
  getUserCertificateId,
  getCertificateCompletedCourses,
  checkEligibilityForCertificate as checkCertificateEligibility,
} from "@/services/certificate-blockchain.service";

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

  const { mintOrUpdateCertificate, isMinting } = useCertificate();

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

        const eligibilityResult = await checkCertificateEligibility(
          address,
          courseId
        );
        setEligible(eligibilityResult.eligible);
        setEligibilityReason(eligibilityResult.reason || null);

        if (!eligibilityResult.eligible) {
          console.log("[GetCertificateModal] User not eligible:", {
            reason: eligibilityResult.reason,
            courseId: courseId.toString(),
          });
        }

        const tokenId = await getUserCertificateId(address);
        setExistingTokenId(tokenId);
        const hasExistingCert = tokenId > BigInt(0);
        setIsFirstCertificate(!hasExistingCert);

        let completedCoursesArray: bigint[] = [];
        if (hasExistingCert) {
          const courses = await getCertificateCompletedCourses(tokenId);
          setExistingCourses(courses);
          completedCoursesArray = courses;

          const alreadyAdded = courses.some(
            (c) => c.toString() === courseId.toString()
          );
          setCourseAlreadyInCertificate(alreadyAdded);
        } else {
          setExistingCourses([]);
          setCourseAlreadyInCertificate(false);
        }

        const price = await getCertificatePrice(courseId, !hasExistingCert);
        setActualPrice(price);

        console.log("[GetCertificateModal] Status:", {
          courseId: courseId.toString(),
          eligible: eligibilityResult.eligible,
          hasExistingCert,
          isFirstMint: !hasExistingCert,
          courseAlreadyAdded: hasExistingCert
            ? completedCoursesArray.some(
                (c) => c.toString() === courseId.toString()
              )
            : false,
          priceWei: price.toString(),
          priceEth: Number(price) / 1e18,
          existingTokenId: tokenId.toString(),
          existingCoursesCount: hasExistingCert
            ? completedCoursesArray.length
            : 0,
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
  }, [address, courseId, isOpen]);

  const formatPrice = (priceWei: bigint): string => {
    const priceEth = Number(priceWei) / 1e18;
    return `${priceEth.toFixed(5)} MANTA`;
  };

  const handleGenerateCertificate = async () => {
    if (!isFirstCertificate) {
      toast.error("You already have a certificate. Adding course directly...");
      await handleAddCourseToCertificate();
      return;
    }

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
      console.log(
        "[GetCertificateModal] First mint - Generating certificate..."
      );

      const requestBody = {
        studentName: recipientName.trim(),
        courseName: courseTitle,
        courseId: courseId.toString(),
        recipientAddress: address,
        platformName:
          process.env.NEXT_PUBLIC_PLATFORM_NAME || "EduVerse Academy",
        baseRoute:
          typeof window !== "undefined"
            ? `${window.location.origin}/certificates`
            : "http://localhost:3000/certificates",
        tokenId: "0",
        completedCourses: [courseId.toString()],
        isValid: true,
        lifetimeFlag: true,
      };

      console.log(
        "[GetCertificateModal] Sending request to generate-pinata API"
      );

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
      console.log("[GetCertificateModal] Certificate generated:", {
        cid: data.data?.cid,
      });

      setCertificateData({
        ipfsCID: data.data.cid,
        previewUrl: data.data.signedUrl,
        metadataCID: data.data.metadataCID || "",
      });

      setStep("minting");
      toast.success("Certificate generated! Minting on blockchain...");

      console.log("[GetCertificateModal] Minting certificate on blockchain...");

      const baseRoute =
        typeof window !== "undefined"
          ? `${window.location.origin}/certificates`
          : `${
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }/certificates`;

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

  const handleAddCourseToCertificate = async () => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (existingTokenId === BigInt(0)) {
      toast.error("No existing certificate found");
      return;
    }

    setIsLoading(true);
    setStep("generating");

    try {
      console.log(
        "[GetCertificateModal] Adding course to existing certificate..."
      );

      const response = await fetch("/api/certificate/generate-pinata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentName: "Update",
          courseName: courseTitle,
          courseId: courseId.toString(),
          recipientAddress: address,
          platformName:
            process.env.NEXT_PUBLIC_PLATFORM_NAME || "EduVerse Academy",
          baseRoute:
            typeof window !== "undefined"
              ? `${window.location.origin}/certificates`
              : "http://localhost:3000/certificates",
          tokenId: existingTokenId.toString(),
          completedCourses: [
            ...existingCourses.map((c) => c.toString()),
            courseId.toString(),
          ],
          isValid: true,
          lifetimeFlag: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update certificate");
      }

      const data = await response.json();

      setStep("minting");
      toast.success("Adding course to certificate...");

      const baseRoute =
        typeof window !== "undefined"
          ? `${window.location.origin}/certificates`
          : `${
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }/certificates`;

      await mintOrUpdateCertificate(
        courseId,
        "Update",
        data.data.cid,
        baseRoute
      );

      setStep("success");
      toast.success("Course added to certificate! 🎉");

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("[GetCertificateModal] Add course error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to add course to certificate"
      );
      setStep("input");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setStep("input");
      setRecipientName("");
      setCertificateData(null);
      onClose();
    }
  };

  const renderContent = () => {
    if (checkingEligibility || priceLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
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
            <h3 className="font-semibold text-lg">Not Eligible</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {eligibilityReason ||
                "You are not eligible to get a certificate for this course."}
            </p>
          </div>
          <Button onClick={handleClose} variant="outline" className="mt-4">
            Close
          </Button>
        </div>
      );
    }

    if (courseAlreadyInCertificate) {
      return (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-lg">Already Added</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              This course is already in your certificate.
            </p>
          </div>
          <Button onClick={handleClose} variant="outline" className="mt-4">
            Close
          </Button>
        </div>
      );
    }

    if (step === "generating") {
      return (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Generating certificate image...
          </p>
        </div>
      );
    }

    if (step === "minting") {
      return (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Minting certificate on blockchain...
          </p>
          <p className="text-xs text-muted-foreground">
            Please confirm the transaction in your wallet
          </p>
        </div>
      );
    }

    if (step === "success") {
      return (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-lg">Success!</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {isFirstCertificate
                ? "Your certificate has been minted successfully with your first completed course!"
                : "Course has been added to your certificate!"}
            </p>
          </div>
          {certificateData && (
            <Button onClick={handleClose} className="mt-4">
              View Certificate
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Award className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">{courseTitle}</p>
              <p className="text-xs text-muted-foreground">
                Course #{courseId.toString()}
              </p>
            </div>
          </div>

          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Certificate Type</span>
              <span className="text-sm text-primary font-semibold">
                {isFirstCertificate ? "First Certificate" : "Add Course"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Price</span>
              <span className="text-sm font-semibold">
                {formatPrice(actualPrice)}
              </span>
            </div>
            {!isFirstCertificate && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Current Courses</span>
                <span className="text-sm text-muted-foreground">
                  {existingCourses.length} completed
                </span>
              </div>
            )}
          </div>

          {isFirstCertificate && (
            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient Name *</Label>
              <Input
                id="recipientName"
                placeholder="Enter your full name"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                maxLength={100}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                This name will be displayed on your certificate
              </p>
            </div>
          )}

          {!isFirstCertificate && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                This course will be automatically added to your existing
                certificate (Token #{existingTokenId.toString()})
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={
              isFirstCertificate
                ? handleGenerateCertificate
                : handleAddCourseToCertificate
            }
            disabled={
              isLoading ||
              (isFirstCertificate && !recipientName.trim()) ||
              isMinting
            }
            className="flex-1"
          >
            {isLoading || isMinting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : isFirstCertificate ? (
              <>
                <Award className="w-4 h-4 mr-2" />
                Mint Certificate
              </>
            ) : (
              <>
                <Award className="w-4 h-4 mr-2" />
                Add to Certificate
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            {isFirstCertificate ? "Get Certificate" : "Add to Certificate"}
          </DialogTitle>
          <DialogDescription>
            {isFirstCertificate
              ? "Create your lifetime blockchain certificate by adding your first completed course"
              : "Add this completed course to your existing certificate"}
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
