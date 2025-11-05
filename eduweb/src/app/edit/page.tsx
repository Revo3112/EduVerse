"use client";

import { useState, useEffect, Suspense } from "react";
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
  CheckCircle,
  Clock,
} from "lucide-react";
import { executeQuery } from "@/lib/graphql-client";
import { GET_COURSE_DETAILS } from "@/lib/graphql-queries";
import {
  prepareUpdateCourseTransaction,
  prepareAddSectionTransaction,
  prepareUpdateSectionTransaction,
  prepareDeleteSectionTransaction,
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
}

interface PendingChanges {
  sectionsToAdd: SectionFormData[];
  sectionsToUpdate: Map<string, SectionFormData>;
  sectionsToDelete: Set<string>;
  reorderNeeded: boolean;
}

interface AssetInfo {
  assetId: string;
  status: "uploading" | "processing" | "ready" | "failed";
  sectionId: string;
  cid?: string;
  error?: string;
}

const COURSE_CATEGORIES = [
  { value: "Programming", label: "Programming", icon: "💻" },
  { value: "Design", label: "Design", icon: "🎨" },
  { value: "Business", label: "Business", icon: "💼" },
  { value: "Marketing", label: "Marketing", icon: "📢" },
  { value: "Data Science", label: "Data Science", icon: "📊" },
  { value: "Finance", label: "Finance", icon: "💰" },
  { value: "Healthcare", label: "Healthcare", icon: "🏥" },
  { value: "Language", label: "Language", icon: "🗣️" },
  { value: "Arts", label: "Arts", icon: "🎭" },
  { value: "Mathematics", label: "Mathematics", icon: "🔢" },
  { value: "Science", label: "Science", icon: "🔬" },
  { value: "Engineering", label: "Engineering", icon: "⚙️" },
  { value: "Technology", label: "Technology", icon: "🖥️" },
  { value: "Education", label: "Education", icon: "📚" },
  { value: "Psychology", label: "Psychology", icon: "🧠" },
  { value: "Culinary", label: "Culinary", icon: "🍳" },
  { value: "Personal Development", label: "Personal Development", icon: "🌱" },
  { value: "Legal", label: "Legal", icon: "⚖️" },
  { value: "Sports", label: "Sports", icon: "⚽" },
  { value: "Other", label: "Other", icon: "📦" },
];

const COURSE_DIFFICULTIES = [
  { value: "Beginner", label: "Beginner", icon: "🌱" },
  { value: "Intermediate", label: "Intermediate", icon: "📈" },
  { value: "Advanced", label: "Advanced", icon: "🚀" },
];

const MAX_PRICE_ETH = 1.0;
const MIN_PRICE_ETH = 0.000001;

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
  const [courseData, setCourseData] = useState<CourseData | null>(null);
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
  const [uploadingAssets, setUploadingAssets] = useState<
    Map<string, AssetInfo>
  >(new Map());

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
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  const { thumbnailUrl: originalThumbnailUrl, loading: thumbnailUrlLoading } =
    useThumbnailUrl(formData.thumbnailCID || undefined, 3600);

  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionFormData, setSectionFormData] = useState<SectionFormData>({
    title: "",
    duration: 300,
  });
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  useEffect(() => {
    if (activeAccount?.address) {
      loadCourseData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, activeAccount?.address]);

  useEffect(() => {
    const processingAssets = Array.from(uploadingAssets.values()).filter(
      (asset) => asset.status === "processing"
    );

    if (processingAssets.length === 0) return;

    const pollInterval = setInterval(async () => {
      for (const asset of processingAssets) {
        try {
          const response = await fetch(`/api/livepeer/asset/${asset.assetId}`);
          if (response.ok) {
            const data = await response.json();

            if (data.storage?.ipfs?.cid) {
              setUploadingAssets((prev) => {
                const updated = new Map(prev);
                updated.set(asset.sectionId, {
                  ...asset,
                  status: "ready",
                  cid: data.storage.ipfs.cid,
                });
                return updated;
              });
              toast.success(`Video ready for section`);
            } else if (data.status?.phase === "failed") {
              setUploadingAssets((prev) => {
                const updated = new Map(prev);
                updated.set(asset.sectionId, {
                  ...asset,
                  status: "failed",
                  error: "Processing failed",
                });
                return updated;
              });
              toast.error("Video processing failed");
            }
          }
        } catch (error) {
          console.error("Poll asset error:", error);
        }
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [uploadingAssets]);

  useEffect(() => {
    const processingAssets = Array.from(uploadingAssets.values()).filter(
      (asset) => asset.status === "processing"
    );

    if (processingAssets.length === 0) return;

    const pollInterval = setInterval(async () => {
      for (const asset of processingAssets) {
        try {
          const response = await fetch(`/api/livepeer/asset/${asset.assetId}`);
          if (response.ok) {
            const data = await response.json();

            if (data.storage?.ipfs?.cid) {
              setUploadingAssets((prev) => {
                const updated = new Map(prev);
                updated.set(asset.sectionId, {
                  ...asset,
                  status: "ready",
                  cid: data.storage.ipfs.cid,
                });
                return updated;
              });
              toast.success(`Video ready for section`);
            } else if (data.status?.phase === "failed") {
              setUploadingAssets((prev) => {
                const updated = new Map(prev);
                updated.set(asset.sectionId, {
                  ...asset,
                  status: "failed",
                  error: "Processing failed",
                });
                return updated;
              });
              toast.error("Video processing failed");
            }
          }
        } catch (error) {
          console.error("Poll asset error:", error);
        }
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [uploadingAssets]);

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
        { courseId }
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
        toast.error("Unauthorized");
        router.push("/myCourse");
        return;
      }

      setIsAuthorized(true);
      setCourseData(course);
      setSections(course.sections || []);
      setDraftSections(course.sections || []);
      setPendingChanges({
        sectionsToAdd: [],
        sectionsToUpdate: new Map(),
        sectionsToDelete: new Set(),
        reorderNeeded: false,
      });
      setHasSectionChanges(false);

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

  function handleInputChange<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) {
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

    const processingAssets = Array.from(uploadingAssets.values()).filter(
      (asset) => asset.status === "uploading" || asset.status === "processing"
    );

    if (processingAssets.length > 0) {
      toast.error("Please wait for video processing to complete", {
        description: `${processingAssets.length} video(s) still processing`,
      });
      return;
    }

    const failedAssets = Array.from(uploadingAssets.values()).filter(
      (asset) => asset.status === "failed"
    );

    if (failedAssets.length > 0) {
      toast.error("Some videos failed to process", {
        description: "Please re-upload failed videos",
      });
      return;
    }

    try {
      let thumbnailCID = formData.thumbnailCID;

      if (thumbnailFile) {
        toast.info("Uploading thumbnail...");
        thumbnailCID = await uploadThumbnail();
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
    const { sectionsToAdd, sectionsToUpdate, sectionsToDelete } =
      pendingChanges;

    let completedOperations = 0;
    const totalOperations =
      sectionsToAdd.length + sectionsToUpdate.size + sectionsToDelete.size;

    if (sectionsToDelete.size > 0) {
      for (const sectionId of sectionsToDelete) {
        const transaction = prepareDeleteSectionTransaction({
          courseId: BigInt(courseId!),
          sectionId: BigInt(sectionId),
        });

        sendTransaction(transaction, {
          onSuccess: () => {
            completedOperations++;
            toast.success(
              `Section deleted (${completedOperations}/${totalOperations})`
            );
            if (completedOperations === totalOperations) {
              finalizeSectionCommit();
            }
          },
          onError: (error) => {
            toast.error("Failed to delete section", {
              description: error.message,
            });
          },
        });

        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (sectionsToUpdate.size > 0) {
      for (const [sectionId, sectionData] of sectionsToUpdate) {
        const section = sections.find((s) => s.id === sectionId);
        if (!section) continue;

        const asset = uploadingAssets.get(sectionId);
        const finalCID = asset?.cid || sectionData.contentCID;

        if (!finalCID) {
          toast.error(`Section ${sectionData.title} missing video CID`);
          continue;
        }

        const transaction = prepareUpdateSectionTransaction({
          courseId: BigInt(courseId!),
          sectionId: BigInt(section.sectionId),
          title: sectionData.title,
          contentCID: finalCID,
          duration: sectionData.duration,
        });

        sendTransaction(transaction, {
          onSuccess: () => {
            completedOperations++;
            toast.success(
              `Section updated (${completedOperations}/${totalOperations})`
            );
            if (completedOperations === totalOperations) {
              finalizeSectionCommit();
            }
          },
          onError: (error) => {
            toast.error("Failed to update section", {
              description: error.message,
            });
          },
        });

        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (sectionsToAdd.length > 0) {
      for (let i = 0; i < sectionsToAdd.length; i++) {
        const sectionData = sectionsToAdd[i];
        const draftSection = draftSections.find(
          (d) =>
            d.isNew && draftSections.filter((s) => s.isNew).indexOf(d) === i
        );

        const asset = draftSection
          ? uploadingAssets.get(draftSection.id)
          : undefined;
        const finalCID = asset?.cid || sectionData.contentCID;

        if (!finalCID) {
          toast.error(`Section ${sectionData.title} missing video CID`);
          continue;
        }

        const transaction = prepareAddSectionTransaction({
          courseId: BigInt(courseId!),
          title: sectionData.title,
          contentCID: finalCID,
          duration: sectionData.duration,
        });

        sendTransaction(transaction, {
          onSuccess: () => {
            completedOperations++;
            toast.success(
              `Section added (${completedOperations}/${totalOperations})`
            );
            if (completedOperations === totalOperations) {
              finalizeSectionCommit();
            }
          },
          onError: (error) => {
            toast.error("Failed to add section", {
              description: error.message,
            });
          },
        });

        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (totalOperations === 0) {
      finalizeSectionCommit();
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
    setVideoUploadProgress(0);
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
    setVideoUploadProgress(0);
    setSectionDialogOpen(true);
  }

  function handleVideoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("video/")) {
        toast.error("Please select a video file");
        return;
      }
      setVideoFile(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        setSectionFormData((prev) => ({
          ...prev,
          duration: Math.round(video.duration),
        }));
      };
      video.src = URL.createObjectURL(file);
    }
  }

  async function uploadVideoToLivepeer(
    file: File,
    sectionId: string
  ): Promise<string> {
    setUploadingVideo(true);
    setVideoUploadProgress(0);

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

      return new Promise((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: tusEndpoint,
          retryDelays: [0, 3000, 6000, 12000, 24000],
          metadata: {
            filename: file.name,
            filetype: file.type,
          },
          onError: (error) => {
            console.error("Upload failed:", error);
            setUploadingVideo(false);
            reject(error);
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const percentage = (bytesUploaded / bytesTotal) * 100;
            setVideoUploadProgress(Math.round(percentage));
          },
          onSuccess: () => {
            setUploadingVideo(false);
            setVideoUploadProgress(0);

            setUploadingAssets((prev) => {
              const updated = new Map(prev);
              updated.set(sectionId, {
                assetId: asset.id,
                status: "processing",
                sectionId,
              });
              return updated;
            });

            toast.info("Video uploaded. Processing in background...");
            resolve(asset.id);
          },
        });

        upload.start();
      });
    } catch (error) {
      setUploadingVideo(false);
      setVideoUploadProgress(0);
      throw error;
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
      let contentCID = sectionFormData.contentCID;

      if (videoFile) {
        const tempSectionId = editingSectionId || `temp-${Date.now()}`;
        toast.info("Uploading video...");
        contentCID = await uploadVideoToLivepeer(videoFile, tempSectionId);
      }

      if (editingSectionId) {
        const draftSection = draftSections.find(
          (s) => s.id === editingSectionId
        );
        if (draftSection) {
          setDraftSections((prev) =>
            prev.map((s) =>
              s.id === editingSectionId
                ? {
                    ...s,
                    title: sectionFormData.title.trim(),
                    contentCID: contentCID || s.contentCID,
                    duration: sectionFormData.duration,
                    isModified: !s.isNew,
                  }
                : s
            )
          );

          if (!draftSection.isNew) {
            setPendingChanges((prev) => {
              const updated = new Map(prev.sectionsToUpdate);
              updated.set(editingSectionId, {
                title: sectionFormData.title.trim(),
                contentCID: contentCID || sectionFormData.contentCID,
                duration: sectionFormData.duration,
              });
              return { ...prev, sectionsToUpdate: updated };
            });
          } else {
            setPendingChanges((prev) => {
              const updatedToAdd = prev.sectionsToAdd.map((s, idx) => {
                if (
                  draftSections.filter((d) => d.isNew).indexOf(draftSection) ===
                  idx
                ) {
                  return {
                    title: sectionFormData.title.trim(),
                    contentCID: contentCID || sectionFormData.contentCID,
                    duration: sectionFormData.duration,
                  };
                }
                return s;
              });
              return { ...prev, sectionsToAdd: updatedToAdd };
            });
          }

          setHasSectionChanges(true);
          toast.success("Section updated (draft)");
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
          contentCID: contentCID || "",
          duration: sectionFormData.duration,
          orderId: draftSections.length,
          createdAt: new Date().toISOString(),
          isNew: true,
          isDraft: true,
        };

        setDraftSections((prev) => [...prev, newDraftSection]);

        setPendingChanges((prev) => ({
          ...prev,
          sectionsToAdd: [
            ...prev.sectionsToAdd,
            {
              title: sectionFormData.title.trim(),
              contentCID: contentCID || "",
              duration: sectionFormData.duration,
            },
          ],
        }));

        setHasSectionChanges(true);
        toast.success("Section added (draft)");
      }

      setSectionDialogOpen(false);
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
      setDraftSections((prev) => prev.filter((s) => s.id !== section.id));
      setPendingChanges((prev) => ({
        ...prev,
        sectionsToAdd: prev.sectionsToAdd.filter(
          (_, idx) =>
            idx !==
            draftSections
              .filter((s) => s.isNew)
              .findIndex((s) => s.id === section.id)
        ),
      }));
    } else {
      setDraftSections((prev) =>
        prev.map((s) => (s.id === section.id ? { ...s, isDeleted: true } : s))
      );
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
    if (fromIndex === toIndex) return;

    const visibleSections = draftSections.filter((s) => !s.isDeleted);
    const reordered = [...visibleSections];
    const [movedSection] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedSection);

    setDraftSections((prev) => {
      const deleted = prev.filter((s) => s.isDeleted);
      const reorderedWithOrderId = reordered.map((s, idx) => ({
        ...s,
        orderId: idx,
      }));
      return [...reorderedWithOrderId, ...deleted];
    });

    setPendingChanges((prev) => ({
      ...prev,
      reorderNeeded: true,
    }));

    setHasSectionChanges(true);
    toast.success("Section reordered (draft)");
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthorized || !courseData) {
    return (
      <div className="container max-w-6xl mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You are not authorized to edit this course
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Course</h1>
            <p className="text-muted-foreground">
              Update course information and manage sections
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {courseData.totalEnrollments} students
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Course Title *{" "}
                <span className="text-xs text-muted-foreground">
                  ({formData.title.length}/{CONTRACT_LIMITS.TITLE_MAX})
                </span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="e.g., Complete Web Development Bootcamp"
                maxLength={CONTRACT_LIMITS.TITLE_MAX}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description *{" "}
                <span className="text-xs text-muted-foreground">
                  ({formData.description.length}/
                  {CONTRACT_LIMITS.DESCRIPTION_MAX})
                </span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Detailed course description..."
                rows={6}
                maxLength={CONTRACT_LIMITS.DESCRIPTION_MAX}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="creatorName">
                Creator Name *{" "}
                <span className="text-xs text-muted-foreground">
                  ({formData.creatorName.length}/
                  {CONTRACT_LIMITS.CREATOR_NAME_MAX})
                </span>
              </Label>
              <Input
                id="creatorName"
                value={formData.creatorName}
                onChange={(e) =>
                  handleInputChange("creatorName", e.target.value)
                }
                placeholder="Your name or organization"
                maxLength={CONTRACT_LIMITS.CREATOR_NAME_MAX}
              />
              {errors.creatorName && (
                <p className="text-sm text-red-500">{errors.creatorName}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    handleInputChange("category", value)
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-red-500">{errors.category}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty *</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) =>
                    handleInputChange("difficulty", value)
                  }
                >
                  <SelectTrigger id="difficulty">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSE_DIFFICULTIES.map((diff) => (
                      <SelectItem key={diff.value} value={diff.value}>
                        {diff.icon} {diff.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.difficulty && (
                  <p className="text-sm text-red-500">{errors.difficulty}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thumbnail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {thumbnailPreview || originalThumbnailUrl ? (
              <div className="relative group">
                <Image
                  src={thumbnailPreview || originalThumbnailUrl || ""}
                  alt="Thumbnail"
                  width={400}
                  height={192}
                  className="w-full h-48 object-cover rounded-xl"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                  <label className="px-4 py-2 bg-white text-slate-800 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      className="hidden"
                    />
                    Change
                  </label>
                  {thumbnailPreview && (
                    <button
                      type="button"
                      onClick={removeThumbnail}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ) : thumbnailUrlLoading ? (
              <div className="flex items-center justify-center h-48 border-2 border-dashed border-border rounded-xl">
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className="hidden"
                />
                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                <span className="text-sm font-medium text-foreground">
                  Click to upload thumbnail
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  PNG, JPG up to 5MB
                </span>
              </label>
            )}
            {uploadingThumbnail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading thumbnail...
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing & Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="price">Monthly Price (ETH) *</Label>
              <Input
                id="price"
                type="number"
                step="0.000001"
                min="0.000001"
                max={MAX_PRICE_ETH}
                value={formData.pricePerMonth}
                onChange={(e) =>
                  handleInputChange("pricePerMonth", e.target.value)
                }
                placeholder="0.01"
              />
              {errors.pricePerMonth && (
                <p className="text-sm text-red-500">{errors.pricePerMonth}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Min: {MIN_PRICE_ETH} ETH, Max: {MAX_PRICE_ETH} ETH
              </p>
            </div>

            <div className="flex items-center space-x-2 py-4 border-t">
              <input
                type="checkbox"
                id="active"
                checked={formData.isActive}
                onChange={(e) =>
                  handleInputChange("isActive", e.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="active" className="cursor-pointer">
                Course is active and visible to students
              </Label>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Course Sections</CardTitle>
              <CardDescription>
                Manage your course content (
                {draftSections.filter((s) => !s.isDeleted).length}/
                {CONTRACT_LIMITS.MAX_SECTIONS})
              </CardDescription>
            </div>
            <Button
              onClick={openAddSectionDialog}
              disabled={
                draftSections.filter((s) => !s.isDeleted).length >=
                CONTRACT_LIMITS.MAX_SECTIONS
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Section
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {draftSections.filter((s) => !s.isDeleted).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sections yet. Add your first section to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {draftSections
                .filter((s) => !s.isDeleted)
                .map((section, index) => (
                  <div
                    key={section.id}
                    className={`flex items-center gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors ${
                      section.isNew
                        ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                        : section.isModified
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                        : ""
                    }`}
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-muted-foreground">
                          {index + 1}.
                        </span>
                        <h4 className="font-semibold truncate">
                          {section.title}
                        </h4>
                        {section.isNew && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-500 text-white rounded">
                            NEW
                          </span>
                        )}
                        {section.isModified && (
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
                        {uploadingAssets.has(section.id) ? (
                          <span className="flex items-center gap-1">
                            {uploadingAssets.get(section.id)?.status ===
                            "processing" ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                                <span className="text-blue-500">
                                  Processing...
                                </span>
                              </>
                            ) : uploadingAssets.get(section.id)?.status ===
                              "ready" ? (
                              <>
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <span className="text-green-500">Ready</span>
                              </>
                            ) : uploadingAssets.get(section.id)?.status ===
                              "failed" ? (
                              <>
                                <AlertCircle className="h-3 w-3 text-red-500" />
                                <span className="text-red-500">Failed</span>
                              </>
                            ) : (
                              <>
                                <Upload className="h-3 w-3 text-amber-500" />
                                <span className="text-amber-500">
                                  Uploading...
                                </span>
                              </>
                            )}
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
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveSection(index, index - 1)}
                          disabled={isSending}
                        >
                          ↑
                        </Button>
                      )}
                      {index <
                        draftSections.filter((s) => !s.isDeleted).length -
                          1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveSection(index, index + 1)}
                          disabled={isSending}
                        >
                          ↓
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditSectionDialog(section)}
                        disabled={isSending}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSection(section)}
                        disabled={isSending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between border-t pt-6">
        <Button type="button" variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <div className="flex items-center gap-3">
          {hasSectionChanges && (
            <span className="text-sm text-amber-600 dark:text-amber-400">
              {pendingChanges.sectionsToAdd.length} to add,{" "}
              {pendingChanges.sectionsToUpdate.size} to update,{" "}
              {pendingChanges.sectionsToDelete.size} to delete
            </span>
          )}
          <Button
            onClick={handleSubmit}
            disabled={
              isSending ||
              (!hasChanges && !hasSectionChanges) ||
              Array.from(uploadingAssets.values()).some(
                (a) => a.status === "uploading" || a.status === "processing"
              )
            }
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Update Course {hasSectionChanges && "& Commit Sections"}
              </>
            )}
          </Button>
        </div>
      </div>

      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSectionId ? "Edit Section" : "Add Section"}
            </DialogTitle>
            <DialogDescription>
              {editingSectionId
                ? "Update section details and video"
                : "Add a new section to your course"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sectionTitle">
                Section Title *{" "}
                <span className="text-xs text-muted-foreground">
                  ({sectionFormData.title.length}/
                  {CONTRACT_LIMITS.SECTION_TITLE_MAX})
                </span>
              </Label>
              <Input
                id="sectionTitle"
                value={sectionFormData.title}
                onChange={(e) =>
                  setSectionFormData((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="e.g., Introduction to Variables"
                maxLength={CONTRACT_LIMITS.SECTION_TITLE_MAX}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (seconds) *</Label>
              <Input
                id="duration"
                type="number"
                min={CONTRACT_LIMITS.SECTION_DURATION_MIN}
                max={CONTRACT_LIMITS.SECTION_DURATION_MAX}
                value={sectionFormData.duration}
                onChange={(e) =>
                  setSectionFormData((prev) => ({
                    ...prev,
                    duration: parseInt(e.target.value) || 60,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {formatDuration(sectionFormData.duration)} (
                {CONTRACT_LIMITS.SECTION_DURATION_MIN}-
                {CONTRACT_LIMITS.SECTION_DURATION_MAX}s)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="videoFile">
                Video File {!editingSectionId && "*"}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="videoFile"
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileChange}
                />
                {videoFile && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
              {editingSectionId && sectionFormData.contentCID && (
                <p className="text-xs text-muted-foreground">
                  Current: {sectionFormData.contentCID.slice(0, 12)}... (Upload
                  new video to replace)
                </p>
              )}
            </div>

            {uploadingVideo && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading video...</span>
                  <span>{videoUploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${videoUploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {Array.from(uploadingAssets.values()).some(
              (a) => a.status === "processing"
            ) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing video (this may take a few minutes)...
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSectionDialogOpen(false)}
              disabled={uploadingVideo || isSending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSectionSubmit}
              disabled={
                uploadingVideo || isSending || !sectionFormData.title.trim()
              }
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {editingSectionId ? "Update Section" : "Add Section"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditCourseLoading() {
  return (
    <div className="container max-w-6xl mx-auto py-8">
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function EditCoursePage() {
  return (
    <Suspense fallback={<EditCourseLoading />}>
      <EditCourseContent />
    </Suspense>
  );
}
