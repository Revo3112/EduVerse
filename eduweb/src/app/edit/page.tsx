"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { waitForReceipt } from "thirdweb";
import { client } from "@/app/client";
import { mantaPacificTestnet } from "@/lib/chains";
import Image from "next/image";
import { useThumbnailUrl } from "@/hooks/useThumbnailUrl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  GripVertical,
  Video,
  Upload,
  Clock,
  CheckCircle,
  FileCheck,
} from "lucide-react";
import { executeQuery } from "@/lib/graphql-client";
import { GET_COURSE_DETAILS } from "@/lib/graphql-queries";
import {
  prepareUpdateCourseTransaction,
  prepareAddSectionTransaction,
  prepareUpdateSectionTransaction,
  prepareDeleteSectionTransaction,
  prepareBatchReorderSectionsTransaction,
} from "@/services/courseContract.service";
import * as tus from "tus-js-client";

interface CourseSection {
  id: string;
  sectionId: string;
  title: string;
  contentCID: string;
  duration: number;
  orderId: number;
  createdAt: string;
}

interface CourseData {
  id: string;
  title: string;
  description: string;
  thumbnailCID: string;
  creator: string;
  creatorName: string;
  category: string;
  difficulty: string;
  priceInEth: string;
  isActive: boolean;
  totalEnrollments: number;
  sectionsCount: number;
  sections: CourseSection[];
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  title: string;
  description: string;
  thumbnailCID: string;
  creatorName: string;
  pricePerMonth: string;
  category: string;
  difficulty: string;
  isActive: boolean;
}

interface SectionFormData {
  title: string;
  duration: number;
  contentCID?: string;
}

interface DraftSection extends CourseSection {
  isDraft?: boolean;
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;
  originalOrderId?: number;
  assetId?: string;
  videoFileName?: string;
  videoFile?: File;
}

interface PendingChanges {
  sectionsToAdd: SectionFormData[];
  sectionsToUpdate: Map<string, SectionFormData>;
  sectionsToDelete: Set<string>;
  reorderNeeded: boolean;
}

interface ProgressState {
  isOpen: boolean;
  stage:
    | "idle"
    | "uploading-thumbnail"
    | "uploading-videos"
    | "updating-metadata"
    | "deleting-sections"
    | "updating-sections"
    | "adding-sections"
    | "reordering-sections"
    | "complete"
    | "error";
  currentOperation: string;
  currentStep: number;
  totalSteps: number;
  videoProgress: {
    current: number;
    total: number;
    fileName?: string;
    uploadProgress?: number;
    processingStatus?: "uploading" | "processing" | "ready" | "getting-cid";
  };
  operationDetails: {
    deleted: number;
    updated: number;
    added: number;
    reordered: boolean;
  };
  error?: string;
}

const COURSE_CATEGORIES = [
  { value: "Programming", label: "Programming", icon: "💻" },
  { value: "Design", label: "Design", icon: "🎨" },
  { value: "Business", label: "Business", icon: "💼" },
  { value: "Marketing", label: "Marketing", icon: "📱" },
  { value: "Photography", label: "Photography", icon: "📷" },
  { value: "Music", label: "Music", icon: "🎵" },
  { value: "Health", label: "Health & Fitness", icon: "💪" },
  { value: "Lifestyle", label: "Lifestyle", icon: "🌟" },
  { value: "Language", label: "Language", icon: "🗣️" },
  { value: "Other", label: "Other", icon: "📚" },
];

const COURSE_DIFFICULTIES = [
  { value: "Beginner", label: "Beginner" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Advanced", label: "Advanced" },
];

const MAX_PRICE_ETH = 1;

const CONTRACT_LIMITS = {
  TITLE_MAX: 200,
  DESCRIPTION_MAX: 1000,
  CREATOR_NAME_MAX: 100,
  SECTION_TITLE_MAX: 200,
  SECTION_DURATION_MIN: 60,
  SECTION_DURATION_MAX: 10800,
  MAX_SECTIONS: 1000,
};

function EditCourseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const activeAccount = useActiveAccount();
  const { mutate: sendTransaction, isPending: isSending } =
    useSendTransaction();

  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [, setCourseData] = useState<CourseData | null>(null);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [draftSections, setDraftSections] = useState<DraftSection[]>([]);
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({
    sectionsToAdd: [],
    sectionsToUpdate: new Map(),
    sectionsToDelete: new Set(),
    reorderNeeded: false,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [hasSectionChanges, setHasSectionChanges] = useState(false);
  const draftSectionsRef = useRef<DraftSection[]>([]);

  const [progressState, setProgressState] = useState<ProgressState>({
    isOpen: false,
    stage: "idle",
    currentOperation: "",
    currentStep: 0,
    totalSteps: 0,
    videoProgress: {
      current: 0,
      total: 0,
    },
    operationDetails: {
      deleted: 0,
      updated: 0,
      added: 0,
      reordered: false,
    },
  });

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    thumbnailCID: "",
    creatorName: "",
    pricePerMonth: "0.01",
    category: "Programming",
    difficulty: "Beginner",
    isActive: true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  );
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [, setUploadingThumbnail] = useState(false);

  const { thumbnailUrl: originalThumbnailUrl } = useThumbnailUrl(
    formData.thumbnailCID || undefined,
    3600
  );

  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionFormData, setSectionFormData] = useState<SectionFormData>({
    title: "",
    duration: 300,
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);

  useEffect(() => {
    if (activeAccount?.address) {
      loadCourseData();
    }
  }, [courseId, activeAccount?.address]);

  async function loadCourseData() {
    if (!courseId) {
      toast.error("Missing course ID");
      router.push("/myCourse");
      return;
    }

    if (!activeAccount?.address) {
      return;
    }

    try {
      setLoading(true);
      const result = await executeQuery<{ course: CourseData }>(
        GET_COURSE_DETAILS,
        {
          courseId: courseId,
        }
      );

      if (!result.course) {
        toast.error("Course not found");
        router.push("/myCourse");
        return;
      }

      const course = result.course;

      if (
        course.creator.toLowerCase() !== activeAccount.address.toLowerCase()
      ) {
        toast.error("Not authorized to edit this course");
        router.push("/myCourse");
        return;
      }

      setIsAuthorized(true);
      setCourseData(course);
      setSections(course.sections || []);
      setDraftSections(course.sections || []);
      draftSectionsRef.current = course.sections || [];

      setFormData({
        title: course.title,
        description: course.description,
        thumbnailCID: course.thumbnailCID,
        creatorName: course.creatorName,
        pricePerMonth: course.priceInEth,
        category: course.category,
        difficulty: course.difficulty,
        isActive: course.isActive,
      });
    } catch (error) {
      console.error("Failed to load course:", error);
      toast.error("Failed to load course");
      router.push("/myCourse");
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(field: keyof FormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image too large (max 5MB)");
        return;
      }
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setHasChanges(true);
    }
  }

  function removeThumbnail() {
    setThumbnailFile(null);
    setThumbnailPreview("");
    setHasChanges(false);
  }

  async function uploadThumbnail(): Promise<string> {
    if (!thumbnailFile) {
      throw new Error("No thumbnail file");
    }

    setUploadingThumbnail(true);
    try {
      const formData = new FormData();
      formData.append("file", thumbnailFile);

      const response = await fetch("/api/upload-thumbnail", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload thumbnail");
      }

      const data = await response.json();
      return data.cid;
    } finally {
      setUploadingThumbnail(false);
    }
  }

  function validateForm(): boolean {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.length > CONTRACT_LIMITS.TITLE_MAX) {
      newErrors.title = `Max ${CONTRACT_LIMITS.TITLE_MAX} characters`;
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.length > CONTRACT_LIMITS.DESCRIPTION_MAX) {
      newErrors.description = `Max ${CONTRACT_LIMITS.DESCRIPTION_MAX} characters`;
    }

    if (!formData.creatorName.trim()) {
      newErrors.creatorName = "Creator name is required";
    } else if (formData.creatorName.length > CONTRACT_LIMITS.CREATOR_NAME_MAX) {
      newErrors.creatorName = `Max ${CONTRACT_LIMITS.CREATOR_NAME_MAX} characters`;
    }

    const price = parseFloat(formData.pricePerMonth);
    if (isNaN(price) || price <= 0) {
      newErrors.pricePerMonth = "Price must be greater than 0";
    } else if (price > MAX_PRICE_ETH) {
      newErrors.pricePerMonth = `Max ${MAX_PRICE_ETH} ETH`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix validation errors");
      return;
    }

    if (!courseId) {
      toast.error("Missing course ID");
      return;
    }

    const sectionsWithVideo = draftSections.filter(
      (s) => s.videoFile && !s.isDeleted
    );
    const sectionsNeedingVideo = draftSections.filter(
      (s) => !s.contentCID && !s.videoFile && !s.isDeleted
    );

    if (sectionsNeedingVideo.length > 0) {
      toast.error("Some sections are missing videos", {
        description: "Please add videos to all sections or remove them",
      });
      return;
    }

    try {
      const totalOps =
        (thumbnailFile ? 1 : 0) +
        (sectionsWithVideo.length > 0 ? 1 : 0) +
        1 +
        (hasSectionChanges
          ? pendingChanges.sectionsToDelete.size +
            pendingChanges.sectionsToUpdate.size +
            pendingChanges.sectionsToAdd.length +
            (pendingChanges.reorderNeeded ? 1 : 0)
          : 0);

      setProgressState({
        isOpen: true,
        stage: thumbnailFile ? "uploading-thumbnail" : "uploading-videos",
        currentOperation: thumbnailFile
          ? "Uploading thumbnail..."
          : "Preparing updates...",
        currentStep: 0,
        totalSteps: totalOps,
        videoProgress: {
          current: 0,
          total: sectionsWithVideo.length,
        },
        operationDetails: {
          deleted: 0,
          updated: 0,
          added: 0,
          reordered: false,
        },
      });

      let thumbnailCID = formData.thumbnailCID;

      if (thumbnailFile) {
        setProgressState((prev) => ({
          ...prev,
          stage: "uploading-thumbnail",
          currentOperation: "Uploading thumbnail to IPFS...",
        }));
        thumbnailCID = await uploadThumbnail();
        setProgressState((prev) => ({
          ...prev,
          currentStep: prev.currentStep + 1,
        }));
      }

      if (sectionsWithVideo.length > 0) {
        setProgressState((prev) => ({
          ...prev,
          stage: "uploading-videos",
          currentOperation: "Uploading section videos...",
        }));
        const videosUploaded = await uploadAllVideosBeforeCommit();
        if (!videosUploaded) {
          setProgressState((prev) => ({
            ...prev,
            stage: "error",
            error: "Failed to upload videos",
          }));
          return;
        }
        setProgressState((prev) => ({
          ...prev,
          currentStep: prev.currentStep + 1,
        }));
      }

      await commitAllChanges(thumbnailCID);
    } catch (error) {
      setProgressState((prev) => ({
        ...prev,
        stage: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      }));
      toast.error("Failed to update", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  async function commitAllChanges(thumbnailCID: string) {
    const activeSections = draftSections.filter((s) => !s.isDeleted);

    if (activeSections.length === 0) {
      toast.error("Cannot save changes", {
        description: "Course must have at least one section",
      });
      setProgressState((prev) => ({
        ...prev,
        stage: "error",
        error: "Course must have at least one section",
      }));
      return;
    }

    setProgressState((prev) => ({
      ...prev,
      stage: "updating-metadata",
      currentOperation: "Updating course metadata on blockchain...",
    }));

    const courseTransaction = prepareUpdateCourseTransaction({
      courseId: BigInt(courseId!),
      metadata: {
        title: formData.title.trim(),
        description: formData.description.trim(),
        thumbnailCID: thumbnailCID,
        creatorName: formData.creatorName.trim(),
        category: formData.category,
        difficulty: formData.difficulty,
      },
      pricePerMonth: formData.pricePerMonth,
      isActive: formData.isActive,
    });

    console.log("[Edit Course] 🔗 Prepared course metadata update transaction");
    console.log("[Edit Course] 📤 Calling sendTransaction()...");

    if (!activeAccount) {
      console.error("[Edit Course] ❌ Wallet not connected!");
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to publish changes",
      });
      setProgressState((prev) => ({
        ...prev,
        stage: "error",
        error: "Wallet connection lost. Please reconnect and try again.",
      }));
      return;
    }

    console.log("[Edit Course] Wallet connected:", activeAccount.address);

    sendTransaction(courseTransaction, {
      onError: (error) => {
        console.error("[Edit Course] ❌ sendTransaction onError called!");
        console.error("[Edit Course] Error details:", error);

        toast.error("Transaction failed", {
          description:
            error instanceof Error
              ? error.message
              : "Failed to send transaction",
        });

        setProgressState((prev) => ({
          ...prev,
          stage: "error",
          error: error instanceof Error ? error.message : "Transaction failed",
        }));
      },
      onSuccess: async (result) => {
        console.log("[Edit Course] ✅ sendTransaction onSuccess called!");
        console.log("[Edit Course] Transaction hash:", result.transactionHash);

        try {
          const receipt = await waitForReceipt({
            client,
            chain: mantaPacificTestnet,
            transactionHash: result.transactionHash,
          });

          if (receipt.status !== "success") {
            throw new Error("Transaction reverted on-chain");
          }

          setProgressState((prev) => ({
            ...prev,
            currentStep: prev.currentStep + 1,
          }));

          if (hasSectionChanges) {
            await commitSectionChanges();
          } else {
            setProgressState((prev) => ({
              ...prev,
              stage: "complete",
              currentOperation: "All changes saved successfully!",
            }));
            setHasChanges(false);
            setTimeout(() => {
              router.push("/myCourse");
            }, 2000);
          }
        } catch (error) {
          setProgressState((prev) => ({
            ...prev,
            stage: "error",
            error:
              error instanceof Error ? error.message : "Transaction failed",
          }));
          toast.error("Transaction failed", {
            description:
              error instanceof Error ? error.message : "Unknown error",
          });
        }
      },
    });
  }

  async function commitSectionChanges() {
    const { sectionsToAdd, sectionsToUpdate, sectionsToDelete, reorderNeeded } =
      pendingChanges;

    const sendTransactionPromise = (
      transaction: any
    ): Promise<{ transactionHash: `0x${string}` }> => {
      return new Promise((resolve, reject) => {
        sendTransaction(transaction, {
          onSuccess: (result) => resolve(result),
          onError: (error) => reject(error),
        });
      });
    };

    try {
      if (sectionsToDelete.size > 0) {
        setProgressState((prev) => ({
          ...prev,
          stage: "deleting-sections",
          currentOperation: `Deleting sections (0/${sectionsToDelete.size})...`,
        }));

        let deleted = 0;
        for (const sectionId of sectionsToDelete) {
          const sectionToDelete = draftSections.find(
            (s) => s.sectionId === sectionId
          );

          if (sectionToDelete?.assetId) {
            await deleteVideoFromLivepeer(sectionToDelete.assetId);
          }

          const deleteTransaction = prepareDeleteSectionTransaction({
            courseId: BigInt(courseId!),
            sectionId: BigInt(sectionId),
          });

          const deleteResult = await sendTransactionPromise(deleteTransaction);

          const deleteReceipt = await waitForReceipt({
            client,
            chain: mantaPacificTestnet,
            transactionHash: deleteResult.transactionHash,
          });

          if (deleteReceipt.status !== "success") {
            throw new Error("Delete transaction reverted on-chain");
          }
          deleted++;

          setProgressState((prev) => ({
            ...prev,
            currentStep: prev.currentStep + 1,
            currentOperation: `Deleting sections (${deleted}/${sectionsToDelete.size})...`,
            operationDetails: {
              ...prev.operationDetails,
              deleted,
            },
          }));

          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (sectionsToUpdate.size > 0) {
        setProgressState((prev) => ({
          ...prev,
          stage: "updating-sections",
          currentOperation: `Updating sections (0/${sectionsToUpdate.size})...`,
        }));

        let updated = 0;
        for (const [sectionId, sectionData] of sectionsToUpdate) {
          const section = sections.find((s) => s.id === sectionId);
          if (!section) continue;

          if (!sectionData.contentCID) {
            toast.error(`Section ${sectionData.title} missing video CID`);
            continue;
          }

          const transaction = prepareUpdateSectionTransaction({
            courseId: BigInt(courseId!),
            sectionId: BigInt(section.sectionId),
            title: sectionData.title,
            contentCID: sectionData.contentCID,
            duration: sectionData.duration,
          });

          const updateResult = await sendTransactionPromise(transaction);

          const updateReceipt = await waitForReceipt({
            client,
            chain: mantaPacificTestnet,
            transactionHash: updateResult.transactionHash,
          });

          if (updateReceipt.status !== "success") {
            throw new Error("Update transaction reverted on-chain");
          }

          updated++;

          setProgressState((prev) => ({
            ...prev,
            currentStep: prev.currentStep + 1,
            currentOperation: `Updating sections (${updated}/${sectionsToUpdate.size})...`,
            operationDetails: {
              ...prev.operationDetails,
              updated,
            },
          }));

          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (sectionsToAdd.length > 0) {
        setProgressState((prev) => ({
          ...prev,
          stage: "adding-sections",
          currentOperation: `Adding sections (0/${sectionsToAdd.length})...`,
        }));

        const deletedNewSections = draftSections.filter(
          (s) => s.isNew && s.isDeleted
        );
        for (const deletedSection of deletedNewSections) {
          if (deletedSection.assetId) {
            await deleteVideoFromLivepeer(deletedSection.assetId);
          }
        }

        let added = 0;
        for (let i = 0; i < sectionsToAdd.length; i++) {
          const sectionData = sectionsToAdd[i];

          if (!sectionData.contentCID) {
            toast.error(`Section ${sectionData.title} missing video CID`);
            continue;
          }

          const transaction = prepareAddSectionTransaction({
            courseId: BigInt(courseId!),
            title: sectionData.title,
            contentCID: sectionData.contentCID,
            duration: sectionData.duration,
          });

          const addResult = await sendTransactionPromise(transaction);

          const addReceipt = await waitForReceipt({
            client,
            chain: mantaPacificTestnet,
            transactionHash: addResult.transactionHash,
          });

          if (addReceipt.status !== "success") {
            throw new Error("Add transaction reverted on-chain");
          }

          added++;

          setProgressState((prev) => ({
            ...prev,
            currentStep: prev.currentStep + 1,
            currentOperation: `Adding sections (${added}/${sectionsToAdd.length})...`,
            operationDetails: {
              ...prev.operationDetails,
              added,
            },
          }));

          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (reorderNeeded) {
        setProgressState((prev) => ({
          ...prev,
          stage: "reordering-sections",
          currentOperation: "Reordering sections...",
        }));

        const visibleSections = draftSections.filter(
          (s) => !s.isDeleted && !s.isNew
        );
        const newOrder = visibleSections.map((s) => BigInt(s.sectionId));

        const reorderTransaction = prepareBatchReorderSectionsTransaction({
          courseId: BigInt(courseId!),
          newOrder: newOrder,
        });

        const reorderResult = await sendTransactionPromise(reorderTransaction);

        const reorderReceipt = await waitForReceipt({
          client,
          chain: mantaPacificTestnet,
          transactionHash: reorderResult.transactionHash,
        });

        if (reorderReceipt.status !== "success") {
          throw new Error("Reorder transaction reverted on-chain");
        }

        setProgressState((prev) => ({
          ...prev,
          currentStep: prev.currentStep + 1,
          operationDetails: {
            ...prev.operationDetails,
            reordered: true,
          },
        }));

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      finalizeSectionCommit();
    } catch (error: any) {
      setProgressState((prev) => ({
        ...prev,
        stage: "error",
        error: error.message || "Unknown error",
      }));
      toast.error("Transaction failed", {
        description: error.message || "Unknown error",
      });
    }
  }

  function finalizeSectionCommit() {
    setProgressState((prev) => ({
      ...prev,
      stage: "complete",
      currentOperation: "All changes saved successfully!",
    }));
    setHasChanges(false);
    setHasSectionChanges(false);
    setTimeout(() => {
      setProgressState((prev) => ({ ...prev, isOpen: false }));
      router.push("/myCourse");
    }, 3000);
  }

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm("Discard changes?")) {
        router.push("/myCourse");
      }
    } else {
      router.push("/myCourse");
    }
  };

  function openAddSectionDialog() {
    setEditingSectionId(null);
    setSectionFormData({
      title: "",
      duration: 300,
    });
    setVideoFile(null);
    setSectionDialogOpen(true);
  }

  function openEditSectionDialog(section: CourseSection) {
    setEditingSectionId(section.id);
    setSectionFormData({
      title: section.title,
      duration: section.duration,
      contentCID: section.contentCID,
    });
    setVideoFile(null);
    setSectionDialogOpen(true);
  }

  function handleVideoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 500 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("Video too large (max 500MB)");
        return;
      }
      setVideoFile(file);
      toast.success("Video selected - will upload on save");
    }
  }

  async function uploadVideoToLivepeer(
    file: File,
    onProgressUpdate?: (status: {
      uploadProgress?: number;
      processingStatus?: "uploading" | "processing" | "ready" | "getting-cid";
    }) => void
  ): Promise<{ assetId: string; cid: string }> {
    try {
      console.log(`[Edit Upload] Starting upload for: ${file.name}`);

      const response = await fetch("/api/livepeer/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          enableIPFS: false,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }

      const data = await response.json();
      const { tusEndpoint, asset } = data;

      console.log(`[Edit Upload] Got TUS endpoint and asset ID: ${asset.id}`);
      console.log(`[Edit Upload] PlaybackId: ${asset.playbackId}`);

      onProgressUpdate?.({ uploadProgress: 0, processingStatus: "uploading" });

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: tusEndpoint,
          retryDelays: [0, 3000, 6000, 12000, 24000],
          metadata: {
            filename: file.name,
            filetype: file.type,
          },
          onError: (error) => {
            console.error("[Edit Upload] TUS upload failed:", error);
            reject(error);
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const percentage = (bytesUploaded / bytesTotal) * 100;
            console.log(`[Edit Upload] Progress: ${Math.round(percentage)}%`);
            onProgressUpdate?.({
              uploadProgress: Math.round(percentage),
              processingStatus: "uploading",
            });
          },
          onSuccess: () => {
            console.log(`[Edit Upload] TUS upload complete`);
            onProgressUpdate?.({
              uploadProgress: 100,
              processingStatus: "ready",
            });
            resolve();
          },
        });

        upload.start();
      });

      const playbackId = asset.playbackId || asset.id;

      console.log(
        `[Edit Upload] ✅ Upload complete, using playbackId: ${playbackId}`
      );
      console.log(`[Edit Upload] Video processing continues in background`);

      return {
        assetId: asset.id,
        cid: playbackId,
      };
    } catch (error) {
      console.error("[Edit Upload] Failed:", error);
      throw error;
    }
  }

  async function uploadAllVideosBeforeCommit(): Promise<boolean> {
    const sectionsWithVideo = draftSections.filter(
      (s) => s.videoFile && !s.isDeleted
    );

    if (sectionsWithVideo.length === 0) {
      return true;
    }

    setProgressState((prev) => ({
      ...prev,
      videoProgress: {
        current: 0,
        total: sectionsWithVideo.length,
      },
    }));

    try {
      for (let i = 0; i < sectionsWithVideo.length; i++) {
        const section = sectionsWithVideo[i];

        setProgressState((prev) => ({
          ...prev,
          currentOperation: `Uploading video ${i + 1}/${
            sectionsWithVideo.length
          }...`,
          videoProgress: {
            current: i,
            total: sectionsWithVideo.length,
            fileName: section.videoFileName || "video",
            uploadProgress: 0,
            processingStatus: "uploading",
          },
        }));

        const { assetId, cid } = await uploadVideoToLivepeer(
          section.videoFile!,
          (status) => {
            setProgressState((prev) => ({
              ...prev,
              videoProgress: {
                ...prev.videoProgress,
                uploadProgress: status.uploadProgress,
                processingStatus: status.processingStatus,
              },
            }));
          }
        );

        setDraftSections((prev) => {
          const updated = prev.map((s) =>
            s.id === section.id
              ? { ...s, contentCID: cid, assetId, videoFile: undefined }
              : s
          );
          draftSectionsRef.current = updated;
          return updated;
        });

        if (section.isNew) {
          setPendingChanges((prev) => {
            const newSections = draftSectionsRef.current.filter((s) => s.isNew);
            const newSectionIndex = newSections.findIndex(
              (s) => s.id === section.id
            );

            if (newSectionIndex === -1) return prev;

            const updatedToAdd = [...prev.sectionsToAdd];
            updatedToAdd[newSectionIndex] = {
              ...updatedToAdd[newSectionIndex],
              contentCID: cid,
            };

            return { ...prev, sectionsToAdd: updatedToAdd };
          });
        } else {
          setPendingChanges((prev) => {
            const updated = new Map(prev.sectionsToUpdate);
            const existing = updated.get(section.sectionId);
            if (existing) {
              updated.set(section.sectionId, {
                ...existing,
                contentCID: cid,
              });
            }
            return { ...prev, sectionsToUpdate: updated };
          });
        }

        setProgressState((prev) => ({
          ...prev,
          videoProgress: {
            ...prev.videoProgress,
            current: i + 1,
            uploadProgress: 100,
            processingStatus: "ready",
          },
        }));
      }

      return true;
    } catch (error) {
      toast.error("Video upload failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  async function deleteVideoFromLivepeer(assetId: string): Promise<void> {
    try {
      console.log(`[Delete Video] Deleting Livepeer asset: ${assetId}`);

      const response = await fetch(`/api/livepeer/asset/${assetId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete video asset");
      }

      console.log(`[Delete Video] Asset deleted successfully: ${assetId}`);
    } catch (error) {
      console.error("[Delete Video] Failed to delete asset:", error);
      toast.error("Failed to delete video from Livepeer", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleSectionSubmit() {
    if (!sectionFormData.title.trim()) {
      toast.error("Section title is required");
      return;
    }

    if (sectionFormData.title.length > CONTRACT_LIMITS.SECTION_TITLE_MAX) {
      toast.error(`Title max ${CONTRACT_LIMITS.SECTION_TITLE_MAX} characters`);
      return;
    }

    if (
      sectionFormData.duration < CONTRACT_LIMITS.SECTION_DURATION_MIN ||
      sectionFormData.duration > CONTRACT_LIMITS.SECTION_DURATION_MAX
    ) {
      toast.error(
        `Duration must be ${CONTRACT_LIMITS.SECTION_DURATION_MIN}-${CONTRACT_LIMITS.SECTION_DURATION_MAX} seconds`
      );
      return;
    }

    try {
      if (editingSectionId) {
        const draftSection = draftSections.find(
          (s) => s.id === editingSectionId
        );
        if (draftSection) {
          setDraftSections((prev) => {
            const updated = prev.map((s) =>
              s.id === editingSectionId
                ? {
                    ...s,
                    title: sectionFormData.title.trim(),
                    contentCID: videoFile
                      ? ""
                      : sectionFormData.contentCID || s.contentCID,
                    duration: sectionFormData.duration,
                    isModified: !s.isNew,
                    videoFile: videoFile || s.videoFile,
                    videoFileName: videoFile ? videoFile.name : s.videoFileName,
                  }
                : s
            );
            draftSectionsRef.current = updated;
            return updated;
          });

          if (!draftSection.isNew) {
            setPendingChanges((prev) => {
              const updated = new Map(prev.sectionsToUpdate);
              updated.set(draftSection.sectionId, {
                title: sectionFormData.title.trim(),
                contentCID: sectionFormData.contentCID || "",
                duration: sectionFormData.duration,
              });
              return { ...prev, sectionsToUpdate: updated };
            });
          } else {
            setPendingChanges((prev) => {
              const newSections = draftSectionsRef.current.filter(
                (s) => s.isNew
              );
              const newSectionIndex = newSections.findIndex(
                (s) => s.id === editingSectionId
              );

              if (newSectionIndex === -1) return prev;

              const updatedToAdd = [...prev.sectionsToAdd];
              updatedToAdd[newSectionIndex] = {
                title: sectionFormData.title.trim(),
                contentCID: sectionFormData.contentCID || "",
                duration: sectionFormData.duration,
              };

              return { ...prev, sectionsToAdd: updatedToAdd };
            });
          }

          setHasSectionChanges(true);
          toast.success(
            videoFile
              ? "Section updated (draft) - video will upload on save"
              : "Section updated (draft)"
          );
        }
      } else {
        if (draftSections.length >= CONTRACT_LIMITS.MAX_SECTIONS) {
          toast.error(
            `Maximum ${CONTRACT_LIMITS.MAX_SECTIONS} sections allowed`
          );
          return;
        }

        const newDraftId = `draft-${Date.now()}`;
        const newDraftSection: DraftSection = {
          id: newDraftId,
          sectionId: "0",
          title: sectionFormData.title.trim(),
          contentCID: "",
          duration: sectionFormData.duration,
          orderId: draftSections.length,
          createdAt: new Date().toISOString(),
          isNew: true,
          isDraft: true,
          videoFile: videoFile || undefined,
          videoFileName: videoFile ? videoFile.name : undefined,
        };

        setDraftSections((prev) => {
          const updated = [...prev, newDraftSection];
          draftSectionsRef.current = updated;
          return updated;
        });

        setPendingChanges((prev) => ({
          ...prev,
          sectionsToAdd: [
            ...prev.sectionsToAdd,
            {
              title: sectionFormData.title.trim(),
              contentCID: "",
              duration: sectionFormData.duration,
            },
          ],
        }));

        setHasSectionChanges(true);
        toast.success(
          videoFile
            ? "Section added (draft) - video will upload on save"
            : "Section added (draft)"
        );
      }

      setSectionDialogOpen(false);
      setVideoFile(null);
    } catch (error) {
      toast.error("Operation failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function handleDeleteSection(section: DraftSection) {
    const activeSections = draftSections.filter((s) => !s.isDeleted);

    if (activeSections.length <= 1) {
      toast.error("Cannot delete last section", {
        description: "Course must have at least one section",
      });
      return;
    }

    if (!confirm(`Delete "${section.title}"?`)) {
      return;
    }

    if (section.isNew) {
      const newSectionsBefore = draftSectionsRef.current.filter((s) => s.isNew);
      const indexToRemove = newSectionsBefore.findIndex(
        (s) => s.id === section.id
      );

      setDraftSections((prev) => {
        const updated = prev.filter((s) => s.id !== section.id);
        draftSectionsRef.current = updated;
        return updated;
      });

      setPendingChanges((prev) => {
        if (indexToRemove === -1) return prev;

        return {
          ...prev,
          sectionsToAdd: prev.sectionsToAdd.filter(
            (_, idx) => idx !== indexToRemove
          ),
        };
      });
    } else {
      setDraftSections((prev) => {
        const updated = prev.map((s) =>
          s.id === section.id ? { ...s, isDeleted: true } : s
        );
        draftSectionsRef.current = updated;
        return updated;
      });
      setPendingChanges((prev) => {
        const updated = new Set(prev.sectionsToDelete);
        updated.add(section.sectionId);
        return { ...prev, sectionsToDelete: updated };
      });
    }

    setHasSectionChanges(true);
    toast.success("Section marked for deletion (draft)");
  }

  function handleMoveSection(fromIndex: number, toIndex: number) {
    const visibleSections = draftSections.filter((s) => !s.isDeleted);
    if (toIndex < 0 || toIndex >= visibleSections.length) return;

    setDraftSections((prev) => {
      const visible = prev.filter((s) => !s.isDeleted);
      const [movedSection] = visible.splice(fromIndex, 1);
      visible.splice(toIndex, 0, movedSection);

      const reordered = visible.map((s, index) => ({
        ...s,
        orderId: index,
      }));

      const withDeleted = [...reordered, ...prev.filter((s) => s.isDeleted)];

      draftSectionsRef.current = withDeleted;
      return withDeleted;
    });

    setPendingChanges((prev) => ({ ...prev, reorderNeeded: true }));
    setHasSectionChanges(true);
    toast.success("Section reordered (draft)");
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  if (loading) {
    return <EditCourseLoading />;
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-10 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-10 flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="gap-2 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Edit Course
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage and update your course content
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Course Information Card */}
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-5 border-b border-slate-100">
                  <CardTitle className="text-xl font-bold">
                    Course Information
                  </CardTitle>
                  <CardDescription className="text-slate-500 mt-2">
                    Update your course details and metadata
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-8 space-y-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="title" className="text-sm font-semibold">
                      Course Title
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        handleInputChange("title", e.target.value)
                      }
                      placeholder="Enter course title"
                      disabled={isSending}
                      className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all"
                    />
                    {errors.title && (
                      <p className="text-xs font-medium text-red-500 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.title}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <Label
                      htmlFor="description"
                      className="text-sm font-semibold"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                      placeholder="Describe what students will learn"
                      rows={5}
                      disabled={isSending}
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all resize-none"
                    />
                    {errors.description && (
                      <p className="text-xs font-medium text-red-500 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <Label
                      htmlFor="creatorName"
                      className="text-sm font-semibold"
                    >
                      Creator Name
                    </Label>
                    <Input
                      id="creatorName"
                      value={formData.creatorName}
                      onChange={(e) =>
                        handleInputChange("creatorName", e.target.value)
                      }
                      placeholder="Your full name"
                      disabled={isSending}
                      className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all"
                    />
                    {errors.creatorName && (
                      <p className="text-xs font-medium text-red-500 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.creatorName}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2.5">
                      <Label
                        htmlFor="category"
                        className="text-sm font-semibold"
                      >
                        Category
                      </Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          handleInputChange("category", value)
                        }
                        disabled={isSending}
                      >
                        <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-slate-200">
                          {COURSE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              <span className="flex items-center gap-2">
                                {cat.icon} {cat.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2.5">
                      <Label
                        htmlFor="difficulty"
                        className="text-sm font-semibold"
                      >
                        Difficulty Level
                      </Label>
                      <Select
                        value={formData.difficulty}
                        onValueChange={(value) =>
                          handleInputChange("difficulty", value)
                        }
                        disabled={isSending}
                      >
                        <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-slate-200">
                          {COURSE_DIFFICULTIES.map((diff) => (
                            <SelectItem key={diff.value} value={diff.value}>
                              {diff.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="price" className="text-sm font-semibold">
                      Price (ETH per month)
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.001"
                      max={MAX_PRICE_ETH}
                      value={formData.pricePerMonth}
                      onChange={(e) =>
                        handleInputChange("pricePerMonth", e.target.value)
                      }
                      disabled={isSending}
                      className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all"
                    />
                    {errors.pricePerMonth && (
                      <p className="text-xs font-medium text-red-500 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.pricePerMonth}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Course Sections Card */}
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl font-bold">
                      Course Sections
                    </CardTitle>
                    <CardDescription className="text-slate-500 mt-2">
                      {draftSections.filter((s) => !s.isDeleted).length}{" "}
                      section(s)
                      {hasSectionChanges && (
                        <span className="text-amber-600 font-semibold ml-2 inline-block">
                          (
                          {pendingChanges.sectionsToAdd.length > 0 &&
                            `${pendingChanges.sectionsToAdd.length} new`}
                          {pendingChanges.sectionsToUpdate.size > 0 &&
                            `${
                              pendingChanges.sectionsToAdd.length > 0
                                ? ", "
                                : ""
                            }${pendingChanges.sectionsToUpdate.size} modified`}
                          {pendingChanges.sectionsToDelete.size > 0 &&
                            `${
                              pendingChanges.sectionsToAdd.length > 0 ||
                              pendingChanges.sectionsToUpdate.size > 0
                                ? ", "
                                : ""
                            }${pendingChanges.sectionsToDelete.size} removed`}
                          )
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    onClick={openAddSectionDialog}
                    disabled={isSending}
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Section
                  </Button>
                </CardHeader>
                <CardContent className="pt-8">
                  {draftSections.filter((s) => !s.isDeleted).length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                      <Video className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">
                        No sections yet
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Add your first section to get started
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {draftSections
                        .filter((s) => !s.isDeleted)
                        .map((section, index) => (
                          <div
                            key={section.id}
                            className={`flex items-center gap-4 p-5 rounded-xl border transition-all ${
                              section.isNew
                                ? "bg-green-50/50 border-green-200 shadow-sm"
                                : section.isModified
                                ? "bg-amber-50/50 border-amber-200 shadow-sm"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <GripVertical className="h-5 w-5 text-slate-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h4 className="font-semibold text-slate-900 truncate">
                                  {section.title}
                                </h4>
                                <div className="flex gap-2">
                                  {section.isNew && (
                                    <span className="px-2.5 py-1 text-xs font-bold bg-green-500 text-white rounded-full">
                                      NEW
                                    </span>
                                  )}
                                  {section.isModified && !section.isNew && (
                                    <span className="px-2.5 py-1 text-xs font-bold bg-amber-500 text-white rounded-full">
                                      MODIFIED
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-600 flex-wrap">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                                  {formatDuration(section.duration)}
                                </span>
                                {section.videoFile ? (
                                  <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                                    <Upload className="h-3.5 w-3.5" />
                                    Pending upload
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5">
                                    <Video className="h-3.5 w-3.5 text-slate-400" />
                                    {section.contentCID
                                      ? `${section.contentCID.slice(0, 8)}...`
                                      : "No video"}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {index > 0 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleMoveSection(index, index - 1)
                                  }
                                  disabled={isSending}
                                  className="h-8 w-8 p-0 hover:bg-slate-100"
                                >
                                  ↑
                                </Button>
                              )}
                              {index <
                                draftSections.filter((s) => !s.isDeleted)
                                  .length -
                                  1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleMoveSection(index, index + 1)
                                  }
                                  disabled={isSending}
                                  className="h-8 w-8 p-0 hover:bg-slate-100"
                                >
                                  ↓
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openEditSectionDialog(section)}
                                disabled={isSending}
                                className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteSection(section)}
                                disabled={isSending}
                                className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
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
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-8">
              {/* Thumbnail Card */}
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-5 border-b border-slate-100">
                  <CardTitle className="text-lg font-bold">Thumbnail</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {thumbnailPreview || originalThumbnailUrl ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 shadow-sm group">
                      <Image
                        src={thumbnailPreview || originalThumbnailUrl || ""}
                        alt="Thumbnail"
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-3 right-3 gap-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        onClick={removeThumbnail}
                        disabled={isSending}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 hover:bg-slate-50 transition-all cursor-pointer">
                      <Upload className="h-10 w-10 mx-auto mb-3 text-slate-400" />
                      <p className="text-sm font-medium text-slate-700 mb-1">
                        Upload thumbnail
                      </p>
                      <p className="text-xs text-slate-500 mb-4">
                        JPG, PNG or WebP
                      </p>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailChange}
                        disabled={isSending}
                        className="cursor-pointer"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions Card */}
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow sticky top-6">
                <CardHeader className="pb-5 border-b border-slate-100">
                  <CardTitle className="text-lg font-bold">Actions</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  <Button
                    type="submit"
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors gap-2"
                    disabled={isSending || (!hasChanges && !hasSectionChanges)}
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 border-slate-300 hover:bg-slate-50 rounded-lg transition-colors font-semibold"
                    onClick={handleCancel}
                    disabled={isSending}
                  >
                    Cancel
                  </Button>
                </CardContent>
              </Card>

              {/* Alert Card */}
              {(hasChanges || hasSectionChanges) && (
                <Alert className="border-amber-200 bg-amber-50 shadow-sm">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 font-medium">
                    You have unsaved changes. Save them to commit to blockchain.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </form>

        {/* Section Dialog */}
        <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
          <DialogContent className="sm:max-w-md border-slate-200 shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {editingSectionId ? "Edit Section" : "Add Section"}
              </DialogTitle>
              <DialogDescription className="text-slate-600 mt-2">
                {editingSectionId
                  ? "Update section details and video"
                  : "Create a new section for your course"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-2.5">
                <Label
                  htmlFor="section-title"
                  className="text-sm font-semibold"
                >
                  Section Title
                </Label>
                <Input
                  id="section-title"
                  value={sectionFormData.title}
                  onChange={(e) =>
                    setSectionFormData((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="Enter section title"
                  className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2.5">
                <Label
                  htmlFor="section-duration"
                  className="text-sm font-semibold"
                >
                  Duration (seconds)
                </Label>
                <Input
                  id="section-duration"
                  type="number"
                  min={CONTRACT_LIMITS.SECTION_DURATION_MIN}
                  max={CONTRACT_LIMITS.SECTION_DURATION_MAX}
                  value={sectionFormData.duration}
                  onChange={(e) =>
                    setSectionFormData((prev) => ({
                      ...prev,
                      duration: parseInt(e.target.value) || 300,
                    }))
                  }
                  className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  {Math.floor(sectionFormData.duration / 60)} minutes{" "}
                  {sectionFormData.duration % 60} seconds
                </p>
              </div>

              <div className="space-y-2.5">
                <Label
                  htmlFor="section-video"
                  className="text-sm font-semibold"
                >
                  Video File
                </Label>
                <Input
                  id="section-video"
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileChange}
                  className="cursor-pointer h-10"
                />
                {videoFile && (
                  <p className="text-xs font-medium text-green-600 mt-2 flex items-center gap-1.5">
                    <span className="h-4 w-4 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">
                      ✓
                    </span>
                    Selected: {videoFile.name}
                  </p>
                )}
              </div>

              {draftSections.some((s) => s.videoFile && !s.isDeleted) && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600 flex-shrink-0" />
                  <p className="text-xs font-medium text-blue-700">
                    Videos will upload automatically when saving
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-3 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => setSectionDialogOpen(false)}
                disabled={isSending}
                className="border-slate-300 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSectionSubmit}
                disabled={isSending || !sectionFormData.title.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : editingSectionId ? (
                  <>
                    <Edit className="h-4 w-4" />
                    Update Section
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Section
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Progress Dialog */}
        <Dialog
          open={progressState.isOpen}
          onOpenChange={(open) => {
            if (
              !open &&
              (progressState.stage === "complete" ||
                progressState.stage === "error")
            ) {
              setProgressState((prev) => ({ ...prev, isOpen: false }));
            }
          }}
        >
          <DialogContent
            className="sm:max-w-[600px]"
            onInteractOutside={(e) => {
              if (
                progressState.stage !== "complete" &&
                progressState.stage !== "error"
              ) {
                e.preventDefault();
              }
            }}
          >
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                  {progressState.stage === "complete" ? (
                    <CheckCircle className="h-6 w-6 text-white" />
                  ) : progressState.stage === "error" ? (
                    <AlertCircle className="h-6 w-6 text-white" />
                  ) : (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  )}
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold">
                    {progressState.stage === "complete"
                      ? "Update Complete!"
                      : progressState.stage === "error"
                      ? "Update Failed"
                      : "Updating Course"}
                  </DialogTitle>
                  <DialogDescription className="text-sm">
                    {progressState.stage === "complete"
                      ? "All changes have been saved successfully"
                      : progressState.stage === "error"
                      ? "An error occurred during the update"
                      : "Processing your changes - Do not close this window"}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Overall Progress */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {progressState.stage === "uploading-thumbnail" && (
                      <Upload className="h-5 w-5 text-blue-600 animate-pulse" />
                    )}
                    {progressState.stage === "uploading-videos" && (
                      <Video className="h-5 w-5 text-purple-600 animate-pulse" />
                    )}
                    {progressState.stage === "updating-metadata" && (
                      <FileCheck className="h-5 w-5 text-blue-600 animate-pulse" />
                    )}
                    {(progressState.stage === "deleting-sections" ||
                      progressState.stage === "updating-sections" ||
                      progressState.stage === "adding-sections" ||
                      progressState.stage === "reordering-sections") && (
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    )}
                    {progressState.stage === "complete" && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {progressState.stage === "error" && (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {progressState.currentOperation}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-blue-600">
                    {progressState.totalSteps > 0
                      ? `${progressState.currentStep}/${progressState.totalSteps}`
                      : ""}
                  </span>
                </div>

                {progressState.totalSteps > 0 && (
                  <Progress
                    value={
                      (progressState.currentStep / progressState.totalSteps) *
                      100
                    }
                    className="h-2"
                  />
                )}
              </div>

              {/* Video Progress */}
              {progressState.stage === "uploading-videos" &&
                progressState.videoProgress.total > 0 && (
                  <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                        Video Upload Progress
                      </span>
                    </div>

                    {progressState.videoProgress.fileName && (
                      <div className="text-xs text-purple-700 dark:text-purple-300">
                        <p className="mb-1 truncate font-medium">
                          {progressState.videoProgress.fileName}
                        </p>
                      </div>
                    )}

                    {/* Processing Status */}
                    {progressState.videoProgress.processingStatus && (
                      <div className="flex items-center gap-2 text-xs">
                        {progressState.videoProgress.processingStatus ===
                          "uploading" && (
                          <>
                            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                            <span className="text-purple-700 dark:text-purple-300">
                              Uploading to Livepeer...{" "}
                              {progressState.videoProgress.uploadProgress || 0}%
                            </span>
                          </>
                        )}
                        {progressState.videoProgress.processingStatus ===
                          "processing" && (
                          <>
                            <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
                            <span className="text-purple-700 dark:text-purple-300">
                              Processing video... This may take a few minutes
                            </span>
                          </>
                        )}
                        {progressState.videoProgress.processingStatus ===
                          "getting-cid" && (
                          <>
                            <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
                            <span className="text-purple-700 dark:text-purple-300">
                              Finalizing IPFS storage...
                            </span>
                          </>
                        )}
                        {progressState.videoProgress.processingStatus ===
                          "ready" && (
                          <>
                            <div className="h-2 w-2 bg-green-500 rounded-full" />
                            <span className="text-purple-700 dark:text-purple-300">
                              Video ready!
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Upload Progress Bar */}
                    {progressState.videoProgress.uploadProgress !== undefined &&
                      progressState.videoProgress.processingStatus ===
                        "uploading" && (
                        <div className="space-y-1">
                          <Progress
                            value={progressState.videoProgress.uploadProgress}
                            className="h-1.5"
                          />
                        </div>
                      )}

                    {/* Overall Video Count */}
                    <div className="text-xs text-purple-700 dark:text-purple-300 pt-1 border-t border-purple-200 dark:border-purple-800">
                      <p>
                        {progressState.videoProgress.current} of{" "}
                        {progressState.videoProgress.total} videos uploaded
                      </p>
                    </div>
                  </div>
                )}

              {/* Operation Details */}
              {(progressState.operationDetails.deleted > 0 ||
                progressState.operationDetails.updated > 0 ||
                progressState.operationDetails.added > 0 ||
                progressState.operationDetails.reordered) && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Changes Applied
                  </h4>
                  <div className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
                    {progressState.operationDetails.deleted > 0 && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3" />
                        <span>
                          {progressState.operationDetails.deleted} section(s)
                          deleted
                        </span>
                      </div>
                    )}
                    {progressState.operationDetails.updated > 0 && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3" />
                        <span>
                          {progressState.operationDetails.updated} section(s)
                          updated
                        </span>
                      </div>
                    )}
                    {progressState.operationDetails.added > 0 && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3" />
                        <span>
                          {progressState.operationDetails.added} section(s)
                          added
                        </span>
                      </div>
                    )}
                    {progressState.operationDetails.reordered && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3" />
                        <span>Sections reordered</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {progressState.stage === "error" && progressState.error && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-red-900 dark:text-red-100">
                        Update Failed
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        {progressState.error}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {progressState.stage === "complete" && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-green-900 dark:text-green-100">
                        All Changes Saved
                      </h4>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Your course has been updated successfully. Redirecting
                        to your courses...
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction Stages */}
              {progressState.stage !== "idle" &&
                progressState.stage !== "complete" &&
                progressState.stage !== "error" && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      Update Stages
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div
                        className={`flex items-center gap-2 ${
                          progressState.stage === "uploading-thumbnail"
                            ? "text-blue-600 font-semibold"
                            : progressState.currentStep > 0
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {progressState.currentStep > 0 ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        <span>Upload thumbnail</span>
                      </div>
                      {progressState.videoProgress.total > 0 && (
                        <div
                          className={`flex items-center gap-2 ${
                            progressState.stage === "uploading-videos"
                              ? "text-blue-600 font-semibold"
                              : progressState.videoProgress.current ===
                                progressState.videoProgress.total
                              ? "text-green-600"
                              : "text-muted-foreground"
                          }`}
                        >
                          {progressState.videoProgress.current ===
                          progressState.videoProgress.total ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          <span>Upload videos</span>
                        </div>
                      )}
                      <div
                        className={`flex items-center gap-2 ${
                          progressState.stage === "updating-metadata"
                            ? "text-blue-600 font-semibold"
                            : progressState.stage === "deleting-sections" ||
                              progressState.stage === "updating-sections" ||
                              progressState.stage === "adding-sections" ||
                              progressState.stage === "reordering-sections"
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {progressState.stage === "deleting-sections" ||
                        progressState.stage === "updating-sections" ||
                        progressState.stage === "adding-sections" ||
                        progressState.stage === "reordering-sections" ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        <span>Update course metadata</span>
                      </div>
                      {(progressState.stage === "deleting-sections" ||
                        progressState.stage === "updating-sections" ||
                        progressState.stage === "adding-sections" ||
                        progressState.stage === "reordering-sections") && (
                        <div className="flex items-center gap-2 text-blue-600 font-semibold">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Update sections on blockchain</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function EditCourseLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-10 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-10 w-64 rounded-lg" />
            <Skeleton className="h-4 w-48 rounded-lg" />
          </div>
        </div>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
          <div className="space-y-8">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-40 rounded-xl sticky top-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

function EditCoursePage() {
  return (
    <Suspense fallback={<EditCourseLoading />}>
      <EditCourseContent />
    </Suspense>
  );
}

export default EditCoursePage;
