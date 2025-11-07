"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      let thumbnailCID = formData.thumbnailCID;

      if (thumbnailFile) {
        toast.info("Uploading thumbnail...");
        thumbnailCID = await uploadThumbnail();
      }

      if (sectionsWithVideo.length > 0) {
        const videosUploaded = await uploadAllVideosBeforeCommit();
        if (!videosUploaded) {
          return;
        }
      }

      await commitAllChanges(thumbnailCID);
    } catch (error) {
      toast.error("Failed to update", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  async function commitAllChanges(thumbnailCID: string) {
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

    sendTransaction(courseTransaction, {
      onSuccess: async () => {
        toast.success("Course metadata updated");

        if (hasSectionChanges) {
          await commitSectionChanges();
        } else {
          setHasChanges(false);
          setTimeout(() => {
            router.push("/myCourse");
          }, 1500);
        }
      },
      onError: (error) => {
        toast.error("Failed to update course", {
          description: error.message,
        });
      },
    });
  }

  async function commitSectionChanges() {
    const { sectionsToAdd, sectionsToUpdate, sectionsToDelete, reorderNeeded } =
      pendingChanges;

    const sendTransactionPromise = (transaction: any): Promise<void> => {
      return new Promise((resolve, reject) => {
        sendTransaction(transaction, {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        });
      });
    };

    let completedOperations = 0;
    const totalOperations =
      sectionsToAdd.length +
      sectionsToUpdate.size +
      sectionsToDelete.size +
      (reorderNeeded ? 1 : 0);

    try {
      if (sectionsToDelete.size > 0) {
        for (const sectionId of sectionsToDelete) {
          const sectionToDelete = draftSections.find(
            (s) => s.sectionId === sectionId
          );

          if (sectionToDelete?.assetId) {
            await deleteVideoFromLivepeer(sectionToDelete.assetId);
          }

          const transaction = prepareDeleteSectionTransaction({
            courseId: BigInt(courseId!),
            sectionId: BigInt(sectionId),
          });

          await sendTransactionPromise(transaction);
          completedOperations++;
          toast.success(
            `Section deleted (${completedOperations}/${totalOperations})`
          );

          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (sectionsToUpdate.size > 0) {
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

          await sendTransactionPromise(transaction);
          completedOperations++;
          toast.success(
            `Section updated (${completedOperations}/${totalOperations})`
          );

          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (sectionsToAdd.length > 0) {
        const deletedNewSections = draftSections.filter(
          (s) => s.isNew && s.isDeleted
        );
        for (const deletedSection of deletedNewSections) {
          if (deletedSection.assetId) {
            await deleteVideoFromLivepeer(deletedSection.assetId);
          }
        }

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

          await sendTransactionPromise(transaction);
          completedOperations++;
          toast.success(
            `Section added (${completedOperations}/${totalOperations})`
          );

          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (reorderNeeded) {
        const visibleSections = draftSections.filter(
          (s) => !s.isDeleted && !s.isNew
        );
        const newOrder = visibleSections.map((s) => BigInt(s.sectionId));

        const transaction = prepareBatchReorderSectionsTransaction({
          courseId: BigInt(courseId!),
          newOrder: newOrder,
        });

        await sendTransactionPromise(transaction);
        completedOperations++;
        toast.success(
          `Sections reordered (${completedOperations}/${totalOperations})`
        );

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      finalizeSectionCommit();
    } catch (error: any) {
      toast.error("Transaction failed", {
        description: error.message || "Unknown error",
      });
    }
  }

  function finalizeSectionCommit() {
    toast.success("All changes committed successfully!");
    setHasChanges(false);
    setHasSectionChanges(false);
    setTimeout(() => {
      loadCourseData();
      router.push("/myCourse");
    }, 2000);
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
    file: File
  ): Promise<{ assetId: string; cid: string }> {
    try {
      const response = await fetch("/api/livepeer/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          enableIPFS: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }

      const data = await response.json();
      const { tusEndpoint, asset } = data;

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: tusEndpoint,
          retryDelays: [0, 3000, 6000, 12000, 24000],
          metadata: {
            filename: file.name,
            filetype: file.type,
          },
          onError: (error) => {
            console.error("Upload failed:", error);
            reject(error);
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const percentage = (bytesUploaded / bytesTotal) * 100;
            console.log(`Upload progress: ${Math.round(percentage)}%`);
          },
          onSuccess: () => {
            resolve();
          },
        });

        upload.start();
      });

      console.log(`[Upload] Polling for IPFS CID for asset: ${asset.id}`);
      const maxAttempts = 60;
      const pollInterval = 5000;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const assetResponse = await fetch(`/api/livepeer/asset/${asset.id}`);

        if (!assetResponse.ok) {
          throw new Error("Failed to get asset status");
        }

        const assetData = await assetResponse.json();
        const phase = assetData.status?.phase;

        if (phase === "ready" && assetData.storage?.ipfs?.cid) {
          console.log(
            `[Upload] Video ready with CID: ${assetData.storage.ipfs.cid}`
          );
          return {
            assetId: asset.id,
            cid: assetData.storage.ipfs.cid,
          };
        } else if (phase === "failed") {
          throw new Error("Video processing failed");
        }

        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }
      }

      throw new Error("Video processing timeout");
    } catch (error) {
      console.error("[Upload] Failed:", error);
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

    toast.info(
      `Uploading ${sectionsWithVideo.length} video(s)... This may take a while.`
    );

    try {
      for (let i = 0; i < sectionsWithVideo.length; i++) {
        const section = sectionsWithVideo[i];
        toast.info(
          `Uploading video ${i + 1}/${sectionsWithVideo.length}: ${
            section.videoFileName || "video"
          }`
        );

        const { assetId, cid } = await uploadVideoToLivepeer(
          section.videoFile!
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

        toast.success(
          `Video ${i + 1}/${sectionsWithVideo.length} uploaded successfully`
        );
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Edit Course</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Course Information</CardTitle>
                  <CardDescription>Update your course details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Course Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        handleInputChange("title", e.target.value)
                      }
                      placeholder="Course title"
                      disabled={isSending}
                    />
                    {errors.title && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.title}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                      placeholder="Course description"
                      rows={4}
                      disabled={isSending}
                    />
                    {errors.description && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.description}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="creatorName">Creator Name</Label>
                    <Input
                      id="creatorName"
                      value={formData.creatorName}
                      onChange={(e) =>
                        handleInputChange("creatorName", e.target.value)
                      }
                      placeholder="Your name"
                      disabled={isSending}
                    />
                    {errors.creatorName && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.creatorName}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          handleInputChange("category", value)
                        }
                        disabled={isSending}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COURSE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.icon} {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <Select
                        value={formData.difficulty}
                        onValueChange={(value) =>
                          handleInputChange("difficulty", value)
                        }
                        disabled={isSending}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COURSE_DIFFICULTIES.map((diff) => (
                            <SelectItem key={diff.value} value={diff.value}>
                              {diff.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="price">Price (ETH per month)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.001"
                      min={0.00001}
                      max={MAX_PRICE_ETH}
                      value={formData.pricePerMonth}
                      onChange={(e) =>
                        handleInputChange("pricePerMonth", e.target.value)
                      }
                      disabled={isSending}
                    />
                    {errors.pricePerMonth && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.pricePerMonth}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Course Sections</CardTitle>
                      <CardDescription>
                        {draftSections.filter((s) => !s.isDeleted).length}{" "}
                        section(s)
                        {hasSectionChanges && (
                          <span className="text-amber-600 ml-2">
                            (
                            {pendingChanges.sectionsToAdd.length > 0 &&
                              `${pendingChanges.sectionsToAdd.length} to add`}
                            {pendingChanges.sectionsToUpdate.size > 0 &&
                              `${
                                pendingChanges.sectionsToAdd.length > 0
                                  ? ", "
                                  : ""
                              }${
                                pendingChanges.sectionsToUpdate.size
                              } to update`}
                            {pendingChanges.sectionsToDelete.size > 0 &&
                              `${
                                pendingChanges.sectionsToAdd.length > 0 ||
                                pendingChanges.sectionsToUpdate.size > 0
                                  ? ", "
                                  : ""
                              }${
                                pendingChanges.sectionsToDelete.size
                              } to delete`}
                            )
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      onClick={openAddSectionDialog}
                      disabled={isSending}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Section
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {draftSections.filter((s) => !s.isDeleted).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No sections yet. Add your first section to get started.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {draftSections
                        .filter((s) => !s.isDeleted)
                        .map((section, index) => (
                          <div
                            key={section.id}
                            className={`flex items-center gap-3 p-4 rounded-lg border ${
                              section.isNew
                                ? "bg-green-50 border-green-200"
                                : section.isModified
                                ? "bg-amber-50 border-amber-200"
                                : "bg-white"
                            }`}
                          >
                            <GripVertical className="h-5 w-5 text-gray-400" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{section.title}</h4>
                                {section.isNew && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-green-500 text-white rounded">
                                    NEW
                                  </span>
                                )}
                                {section.isModified && !section.isNew && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-amber-500 text-white rounded">
                                    MODIFIED
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDuration(section.duration)}
                                </span>
                                {section.videoFile ? (
                                  <span className="flex items-center gap-1">
                                    <Upload className="h-3 w-3 text-amber-500" />
                                    <span className="text-amber-500">
                                      Pending upload
                                    </span>
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Video className="h-3 w-3" />
                                    {section.contentCID
                                      ? `${section.contentCID.slice(0, 8)}...`
                                      : "No video"}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {index > 0 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleMoveSection(index, index - 1)
                                  }
                                  disabled={isSending}
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
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleMoveSection(index, index + 1)
                                  }
                                  disabled={isSending}
                                >
                                  ↓
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditSectionDialog(section)}
                                disabled={isSending}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSection(section)}
                                disabled={isSending}
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

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Thumbnail</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {thumbnailPreview || originalThumbnailUrl ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden">
                      <Image
                        src={thumbnailPreview || originalThumbnailUrl || ""}
                        alt="Thumbnail"
                        fill
                        className="object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={removeThumbnail}
                        disabled={isSending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Upload thumbnail
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

              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSending || (!hasChanges && !hasSectionChanges)}
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleCancel}
                    disabled={isSending}
                  >
                    Cancel
                  </Button>
                </CardContent>
              </Card>

              {(hasChanges || hasSectionChanges) && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You have unsaved changes. Click Save to commit them to the
                    blockchain.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </form>

        <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSectionId ? "Edit Section" : "Add Section"}
              </DialogTitle>
              <DialogDescription>
                {editingSectionId
                  ? "Update section details"
                  : "Add a new section to your course"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="section-title">Title</Label>
                <Input
                  id="section-title"
                  value={sectionFormData.title}
                  onChange={(e) =>
                    setSectionFormData((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="Section title"
                />
              </div>

              <div>
                <Label htmlFor="section-duration">Duration (seconds)</Label>
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
                />
              </div>

              <div>
                <Label htmlFor="section-video">Video File</Label>
                <Input
                  id="section-video"
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileChange}
                />
                {videoFile && (
                  <p className="text-sm text-green-600 mt-1">
                    Selected: {videoFile.name} - Will upload on save
                  </p>
                )}
              </div>

              {draftSections.some((s) => s.videoFile && !s.isDeleted) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Videos will upload when you save the course
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSectionDialogOpen(false)}
                disabled={isSending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSectionSubmit}
                disabled={isSending || !sectionFormData.title.trim()}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : editingSectionId ? (
                  "Update"
                ) : (
                  "Add"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function EditCourseLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-64" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-32" />
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
