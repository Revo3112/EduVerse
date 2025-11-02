"use client";

import { useState, useEffect } from "react";
import { AlertCircle, RefreshCw, X, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { waitForReceipt } from "thirdweb";
import { client } from "@/app/client";
import { mantaPacificTestnet } from "@/lib";
import { prepareBatchAddSectionsTransaction } from "@/services/courseContract.service";

interface PartialUploadData {
  courseId: string;
  successfulBatches: number[];
  failedBatches: number[];
  totalBatches: number;
  timestamp: number;
}

interface FormData {
  title: string;
  description: string;
  thumbnailFile: File | null;
  thumbnailPreview: string;
  creatorName: string;
  pricePerMonth: string;
  category: string;
  difficulty: string;
  sections: Array<{
    id: string;
    title: string;
    duration: number;
    file: File | null;
  }>;
  partialUpload?: PartialUploadData;
}

export function PartialUploadRetry() {
  const [partialDraft, setPartialDraft] = useState<FormData | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryProgress, setRetryProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const activeAccount = useActiveAccount();
  const { mutate: sendTransaction } = useSendTransaction();

  useEffect(() => {
    const loadPartialDraft = () => {
      try {
        const stored = localStorage.getItem("course_draft_partial");
        if (stored) {
          const draft = JSON.parse(stored) as FormData;
          if (draft.partialUpload) {
            setPartialDraft(draft);
          }
        }
      } catch (error) {
        console.error("[PartialUploadRetry] Failed to load draft:", error);
      }
    };

    loadPartialDraft();
  }, []);

  const handleRetry = async () => {
    if (!partialDraft?.partialUpload || !activeAccount) {
      toast.error("Cannot retry", {
        description: "Missing partial upload data or wallet connection",
      });
      return;
    }

    setIsRetrying(true);
    const { courseId, failedBatches, totalBatches } =
      partialDraft.partialUpload;

    try {
      toast.info("Retrying failed batches...", {
        description: `Retrying ${failedBatches.length} failed batch(es)`,
      });

      const BATCH_SIZE = 50;
      const allSections = partialDraft.sections
        .filter((s) => s.file !== null)
        .map((s) => ({
          title: s.title,
          contentCID: "",
          duration: s.duration,
        }));

      const retriedBatches: number[] = [];
      const stillFailed: number[] = [];

      for (let i = 0; i < failedBatches.length; i++) {
        const batchNumber = failedBatches[i];
        const batchIndex = batchNumber - 1;

        setRetryProgress({ current: i + 1, total: failedBatches.length });

        const startIdx = batchIndex * BATCH_SIZE;
        const endIdx = Math.min(startIdx + BATCH_SIZE, allSections.length);
        const batch = allSections.slice(startIdx, endIdx);

        console.log(
          `[Retry] Processing batch ${batchNumber} (${batch.length} sections)`
        );

        toast.info(`Retrying batch ${batchNumber}...`, {
          description: `${batch.length} sections`,
        });

        try {
          const batchTransaction = prepareBatchAddSectionsTransaction({
            courseId: BigInt(courseId),
            sections: batch,
          });

          const batchResult = await new Promise<{
            transactionHash: `0x${string}`;
          }>((resolve, reject) => {
            sendTransaction(batchTransaction, {
              onSuccess: (result) => resolve(result),
              onError: (error) => reject(error),
            });
          });

          const receipt = await waitForReceipt({
            client,
            chain: mantaPacificTestnet,
            transactionHash: batchResult.transactionHash,
          });

          if (receipt.status !== "success") {
            throw new Error(
              `Batch ${batchNumber} transaction reverted on-chain`
            );
          }

          console.log(`[Retry] ✅ Batch ${batchNumber} successful`);
          retriedBatches.push(batchNumber);

          toast.success(`Batch ${batchNumber} uploaded!`, {
            description: `${batch.length} sections added`,
          });
        } catch (batchError) {
          console.error(`[Retry] ❌ Batch ${batchNumber} failed:`, batchError);
          stillFailed.push(batchNumber);

          toast.error(`Batch ${batchNumber} failed again`, {
            description:
              batchError instanceof Error
                ? batchError.message
                : "Transaction failed",
          });
        }
      }

      if (stillFailed.length === 0) {
        localStorage.removeItem("course_draft_partial");
        setPartialDraft(null);
        toast.success("All batches uploaded successfully! 🎉", {
          description: `Course ${courseId} is now complete`,
          duration: 5000,
        });
      } else {
        const updatedDraft = {
          ...partialDraft,
          partialUpload: {
            ...partialDraft.partialUpload,
            successfulBatches: [
              ...partialDraft.partialUpload.successfulBatches,
              ...retriedBatches,
            ],
            failedBatches: stillFailed,
            timestamp: Date.now(),
          },
        };

        localStorage.setItem(
          "course_draft_partial",
          JSON.stringify(updatedDraft)
        );
        setPartialDraft(updatedDraft);

        toast.warning("Some batches still failed", {
          description: `${retriedBatches.length} succeeded, ${stillFailed.length} failed. You can retry again.`,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("[Retry] Fatal error:", error);
      toast.error("Retry failed", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsRetrying(false);
      setRetryProgress(null);
    }
  };

  const handleDismiss = () => {
    if (
      confirm(
        "Are you sure you want to dismiss this? Your partial upload will be lost."
      )
    ) {
      localStorage.removeItem("course_draft_partial");
      setPartialDraft(null);
      toast.info("Partial upload dismissed");
    }
  };

  if (!partialDraft?.partialUpload) {
    return null;
  }

  const { successfulBatches, failedBatches, totalBatches, timestamp } =
    partialDraft.partialUpload;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="bg-card border-2 border-orange-500 rounded-xl shadow-2xl p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-card-foreground mb-2">
              Partial Upload Detected
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Course created but some section batches failed to upload
            </p>

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Course ID:</span>
                <span className="font-mono font-medium text-foreground">
                  {partialDraft.partialUpload.courseId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Progress:</span>
                <span className="font-medium text-foreground">
                  {successfulBatches.length}/{totalBatches} batches
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Failed:</span>
                <span className="font-medium text-orange-600">
                  {failedBatches.join(", ")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Time:</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(timestamp).toLocaleString()}
                </span>
              </div>
            </div>

            {retryProgress && (
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Retrying...</span>
                  <span className="font-medium text-foreground">
                    {retryProgress.current}/{retryProgress.total}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-300"
                    style={{
                      width: `${
                        (retryProgress.current / retryProgress.total) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleRetry}
                disabled={isRetrying || !activeAccount}
                className="flex-1 py-2 px-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex items-center justify-center gap-2"
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Retry Failed
                  </>
                )}
              </button>
              <button
                onClick={handleDismiss}
                disabled={isRetrying}
                className="py-2 px-3 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 hover:text-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!activeAccount && (
              <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Connect wallet to retry
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
