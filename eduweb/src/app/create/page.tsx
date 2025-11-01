"use client";

import {
  CourseUploadProgress,
  UploadStage,
  type FileUploadStatus,
} from "@/components/CourseUploadProgress";
import { FormContainer } from "@/components/PageContainer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  draftStorage,
  type DraftFormData,
  type DraftSection,
} from "@/lib/draftStorage";
import {
  prepareCreateCourseTransaction,
  prepareBatchAddSectionsTransaction,
} from "@/services/courseContract.service";
import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  DollarSign,
  Eye,
  FileCheck,
  GripVertical,
  Image as ImageIcon,
  Info,
  Loader2,
  PlusCircle,
  Save,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { getContract, waitForReceipt, readContract } from "thirdweb";
import { client } from "@/app/client";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import { mantaPacificTestnet } from "@/lib/chains";

// Type definitions - Updated to work with storage service
interface FormData {
  title: string;
  description: string;
  thumbnailFile: File | null;
  thumbnailPreview: string | null;
  thumbnailFileId?: string;
  creatorName: string; // Instructor name - REQUIRED for smart contract
  pricePerMonth: string;
  category: string;
  difficulty: string;
  learningObjectives: string[];
  requirements: string[];
  tags: string[];
}

interface Section {
  id: string;
  title: string;
  file: File | null;
  filePreview: string | null;
  fileId?: string; // Reference to stored file
  duration: number;
  description: string;
  uploadStatus?: string;
}

interface NewSection {
  title: string;
  file: File | null;
  filePreview: string | null;
  fileId?: string; // Reference to stored file
  duration: number;
  description: string;
}

interface FileConfig {
  accept: string;
  maxSize: number;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
}

// ✅ Only support image type for thumbnail uploads (Pinata)
const THUMBNAIL_CONFIG: FileConfig = {
  accept: "image/*",
  maxSize: 10 * 1024 * 1024, // 10MB
  icon: ImageIcon,
  color: "text-purple-600 bg-purple-50",
};

interface UploadProgress {
  [key: string]: number;
}

// Mock useEthPrice hook
const useEthPrice = () => ({
  ethToIDR: 71500000,
  isLoading: false,
  error: null,
  lastUpdated: new Date(),
  refetch: () => {},
});

// Course categories from smart contract
const COURSE_CATEGORIES = [
  {
    value: "Programming",
    label: "Programming",
    icon: "💻",
    color: "bg-blue-500",
  },
  { value: "Design", label: "Design", icon: "🎨", color: "bg-purple-500" },
  { value: "Business", label: "Business", icon: "💼", color: "bg-green-500" },
  { value: "Marketing", label: "Marketing", icon: "📱", color: "bg-pink-500" },
  {
    value: "DataScience",
    label: "Data Science",
    icon: "📊",
    color: "bg-indigo-500",
  },
  { value: "Finance", label: "Finance", icon: "💰", color: "bg-yellow-500" },
  { value: "Healthcare", label: "Healthcare", icon: "⚕️", color: "bg-red-500" },
  { value: "Language", label: "Language", icon: "🗣️", color: "bg-teal-500" },
  { value: "Arts", label: "Arts", icon: "🎭", color: "bg-orange-500" },
  {
    value: "Mathematics",
    label: "Mathematics",
    icon: "🔢",
    color: "bg-cyan-500",
  },
  { value: "Science", label: "Science", icon: "🔬", color: "bg-emerald-500" },
  {
    value: "Engineering",
    label: "Engineering",
    icon: "⚙️",
    color: "bg-slate-500",
  },
  {
    value: "Technology",
    label: "Technology",
    icon: "🖥️",
    color: "bg-violet-500",
  },
  {
    value: "Education",
    label: "Education",
    icon: "📚",
    color: "bg-amber-500",
  },
  {
    value: "Psychology",
    label: "Psychology",
    icon: "🧠",
    color: "bg-fuchsia-500",
  },
  { value: "Culinary", label: "Culinary", icon: "🍳", color: "bg-rose-500" },
  {
    value: "PersonalDevelopment",
    label: "Personal Development",
    icon: "🌟",
    color: "bg-lime-500",
  },
  { value: "Legal", label: "Legal", icon: "⚖️", color: "bg-gray-500" },
  { value: "Sports", label: "Sports", icon: "⚽", color: "bg-sky-500" },
  { value: "Other", label: "Other", icon: "📦", color: "bg-neutral-500" },
];

const DIFFICULTY_LEVELS = [
  {
    value: "Beginner",
    label: "Beginner",
    description: "No prior experience needed",
    color: "text-green-600 bg-green-50 border-green-200",
    icon: "🌱",
  },
  {
    value: "Intermediate",
    label: "Intermediate",
    description: "Some knowledge required",
    color: "text-yellow-600 bg-yellow-50 border-yellow-200",
    icon: "🚀",
  },
  {
    value: "Advanced",
    label: "Advanced",
    description: "Expert level content",
    color: "text-red-600 bg-red-50 border-red-200",
    icon: "🔥",
  },
];

// File type configurations
// ✅ Only video type supported - matches smart contract requirements
// Smart contract stores Livepeer playback IDs as section.contentCID
const FILE_CONFIGS: Record<"video", FileConfig> = {
  video: {
    accept: "video/*",
    maxSize: 500 * 1024 * 1024, // 500MB
    icon: Video,
    color: "text-blue-600 bg-blue-50",
  },
};

export default function CreateCoursePage() {
  const { ethToIDR } = useEthPrice();

  // Thirdweb hooks
  const activeAccount = useActiveAccount();
  const { mutate: sendTransaction, isPending: isSendingTx } =
    useSendTransaction();

  const [activeStep] = useState<number>(0);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isAddingSections, setIsAddingSections] = useState<boolean>(false);
  const [uploadProgress] = useState<UploadProgress>({});
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const extractVideoDuration = useCallback(
    async (file: File): Promise<number> => {
      console.log("[Duration] Starting extraction for:", file.name);

      return new Promise<number>((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";

        const cleanup = () => {
          if (video.src) {
            URL.revokeObjectURL(video.src);
          }
        };

        const timeout = setTimeout(() => {
          cleanup();
          console.warn("[Duration] Timeout after 5s, using default");
          resolve(300);
        }, 5000);

        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          const duration = video.duration;
          cleanup();

          console.log("[Duration] Raw duration:", duration);

          if (!isFinite(duration) || isNaN(duration) || duration < 0) {
            console.warn("[Duration] Invalid duration, using default");
            resolve(300);
            return;
          }

          const durationInSeconds = Math.floor(duration);
          console.log("[Duration] Rounded duration:", durationInSeconds);

          if (durationInSeconds < 60) {
            console.warn("[Duration] Too short (<60s), using default");
            resolve(300);
            return;
          }

          if (durationInSeconds > 10800) {
            console.warn("[Duration] Too long (>3h), capping at 10800s");
            resolve(10800);
            return;
          }

          console.log(
            "[Duration] ✅ Valid duration detected:",
            durationInSeconds
          );
          resolve(durationInSeconds);
        };

        video.onerror = (e) => {
          clearTimeout(timeout);
          cleanup();
          console.error("[Duration] Video error:", e);
          resolve(300);
        };

        video.src = URL.createObjectURL(file);
      });
    },
    []
  );

  // Upload progress modal states
  const [uploadStage, setUploadStage] = useState<UploadStage>(UploadStage.IDLE);
  const [thumbnailUploadStatus, setThumbnailUploadStatus] = useState<
    FileUploadStatus | undefined
  >();
  const [videoUploadStatuses, setVideoUploadStatuses] = useState<
    FileUploadStatus[]
  >([]);
  const [currentVideoIndex] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | undefined>();

  // Draft storage states
  const [isDraftSupported, setIsDraftSupported] = useState<boolean>(false);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState<boolean>(true);
  const [draftSaveStatus, setDraftSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Form data state with proper typing
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    thumbnailFile: null,
    thumbnailPreview: null,
    creatorName: "",
    pricePerMonth: "0.01",
    category: "",
    difficulty: "",
    learningObjectives: ["", "", ""],
    requirements: [""],
    tags: [],
  });

  // Sections state with proper typing
  const [sections, setSections] = useState<Section[]>([]);
  const [newSection, setNewSection] = useState<NewSection>({
    title: "",
    file: null,
    filePreview: null,
    fileId: undefined,
    duration: 300,
    description: "",
  });
  const [isDurationAutoDetected, setIsDurationAutoDetected] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draggedSection, setDraggedSection] = useState<number | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // Auto-save and load from draft storage
  useEffect(() => {
    const initializeDraftStorage = async () => {
      try {
        setIsLoadingDraft(true);

        // Check if draft storage is supported
        const supported = await draftStorage.isSupported();
        setIsDraftSupported(supported);

        if (!supported) {
          console.warn("Draft storage not supported in this browser");
          setIsLoadingDraft(false);
          return;
        }

        // Load existing draft
        const draftData = await draftStorage.loadDraftData();
        if (draftData) {
          // Restore form data
          setFormData((prev) => ({
            ...prev,
            ...draftData.formData,
            // Don't restore file objects, only the IDs
            thumbnailFile: null,
            thumbnailPreview: null,
          }));

          // Restore sections (without file objects)
          const restoredSections: Section[] = draftData.sections.map(
            (section) => ({
              ...section,
              file: null,
              filePreview: null,
            })
          );
          setSections(restoredSections);

          // Load thumbnail file and preview if exists
          if (draftData.formData.thumbnailFileId) {
            const thumbnailFile = await draftStorage.getFile(
              draftData.formData.thumbnailFileId
            );
            const thumbnailUrl = await draftStorage.createFilePreviewUrl(
              draftData.formData.thumbnailFileId
            );
            if (thumbnailFile && thumbnailUrl) {
              setFormData((prev) => ({
                ...prev,
                thumbnailFile: thumbnailFile,
                thumbnailPreview: thumbnailUrl,
                thumbnailFileId: draftData.formData.thumbnailFileId,
              }));
              console.log("[Draft] Restored thumbnail file from storage");
            }
          }

          // Load section files and previews
          for (let i = 0; i < restoredSections.length; i++) {
            const section = restoredSections[i];
            if (section.fileId) {
              const file = await draftStorage.getFile(section.fileId);
              const fileUrl = await draftStorage.createFilePreviewUrl(
                section.fileId
              );
              if (file && fileUrl) {
                setSections((prev) =>
                  prev.map((s) =>
                    s.id === section.id
                      ? { ...s, file: file, filePreview: fileUrl }
                      : s
                  )
                );
                console.log(`[Draft] Restored section file: ${section.title}`);
              }
            }
          }

          setLastSavedAt(new Date(draftData.lastModified));
        }

        // Cleanup any orphaned files
        await draftStorage.cleanupOrphanedFiles();
      } catch (error) {
        console.error("Failed to initialize draft storage:", error);
      } finally {
        setIsLoadingDraft(false);
      }
    };

    initializeDraftStorage();
  }, []);

  // Handle thumbnail upload with file storage
  const handleThumbnailUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > THUMBNAIL_CONFIG.maxSize) {
        setErrors((prev) => ({
          ...prev,
          thumbnail: `Image must be less than ${
            THUMBNAIL_CONFIG.maxSize / (1024 * 1024)
          }MB`,
        }));
        return;
      }

      try {
        // Create preview immediately
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData((prev) => ({
            ...prev,
            thumbnailFile: file,
            thumbnailPreview: reader.result as string,
          }));
        };
        reader.readAsDataURL(file);

        // Store file if draft storage is supported
        if (isDraftSupported) {
          // Delete old thumbnail file if exists
          if (formData.thumbnailFileId) {
            await draftStorage.deleteFile(formData.thumbnailFileId);
          }

          // Store new file
          const fileId = await draftStorage.storeFile(file);
          setFormData((prev) => ({
            ...prev,
            thumbnailFileId: fileId,
          }));
        }

        setErrors((prev) => ({ ...prev, thumbnail: "" }));
      } catch (error) {
        console.error("Failed to store thumbnail:", error);
        setErrors((prev) => ({
          ...prev,
          thumbnail: "Failed to save thumbnail",
        }));
      }
    },
    [isDraftSupported, formData.thumbnailFileId]
  );

  const handleSectionFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const config = FILE_CONFIGS["video"];
      if (file.size > config.maxSize) {
        alert(`File must be less than ${config.maxSize / (1024 * 1024)}MB`);
        return;
      }

      console.log("[Upload] Processing file:", file.name, file.size, "bytes");

      try {
        console.log("[Upload] Step 1: Creating preview...");
        const preview = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        console.log("[Upload] Step 1: ✅ Preview created");

        console.log("[Upload] Step 2: Extracting duration...");
        const detectedDuration = await extractVideoDuration(file);
        console.log(
          "[Upload] Step 2: ✅ Duration extracted:",
          detectedDuration
        );

        console.log("[Upload] Step 3: Updating state...");
        setNewSection((prev) => ({
          ...prev,
          file: file,
          filePreview: preview,
          duration: detectedDuration,
        }));
        console.log("[Upload] Step 3: ✅ State updated");

        if (detectedDuration !== 300) {
          setIsDurationAutoDetected(true);
          toast.success("Video duration detected", {
            description: `Duration: ${Math.floor(detectedDuration / 60)}m ${
              detectedDuration % 60
            }s`,
          });
        } else {
          setIsDurationAutoDetected(false);
          toast.info("Using default duration", {
            description: "Could not detect video duration (5m default)",
          });
        }

        if (isDraftSupported) {
          draftStorage
            .storeFile(file)
            .then((fileId) => {
              setNewSection((prev) => ({ ...prev, fileId }));
            })
            .catch((err) => {
              console.error("[Draft Storage] Failed to store file:", err);
            });
        }
      } catch (error) {
        console.error("[Upload] Failed to process file:", error);
        alert("Failed to upload file. Please try again.");
      }
    },
    [isDraftSupported, extractVideoDuration]
  );

  // Add section with file management
  const addSection = useCallback(async () => {
    if (!newSection.title.trim() || !newSection.file) {
      alert("Please provide both title and file for the section");
      return;
    }

    const section: Section = {
      ...newSection,
      id: Date.now().toString(),
      uploadStatus: "pending",
      fileId: newSection.fileId, // Carry over the file ID if stored
    };

    setSections((prev) => [...prev, section]);

    // Reset new section form
    setNewSection({
      title: "",
      file: null,
      filePreview: null,
      duration: 300,
      description: "",
      fileId: undefined,
    });
    setIsDurationAutoDetected(false);
  }, [newSection]);

  // Handle thumbnail removal with file cleanup
  const removeThumbnail = useCallback(async () => {
    try {
      // Delete stored file if exists
      if (formData.thumbnailFileId && isDraftSupported) {
        try {
          await draftStorage.deleteFile(formData.thumbnailFileId);
        } catch (error) {
          console.error("Failed to delete thumbnail file:", error);
        }
      }

      // Update form data
      const updatedFormData = {
        ...formData,
        thumbnailFile: null,
        thumbnailPreview: null,
        thumbnailFileId: undefined,
      };
      setFormData(updatedFormData);

      // Immediately save the updated state to draft storage
      if (isDraftSupported) {
        try {
          setIsSavingDraft(true);
          setDraftSaveStatus("saving");

          // Prepare draft form data
          const draftFormData: DraftFormData = {
            title: updatedFormData.title,
            description: updatedFormData.description,
            creatorName: updatedFormData.creatorName,
            pricePerMonth: updatedFormData.pricePerMonth,
            category: updatedFormData.category,
            difficulty: updatedFormData.difficulty,
            learningObjectives: updatedFormData.learningObjectives,
            requirements: updatedFormData.requirements,
            tags: updatedFormData.tags,
            thumbnailFileId: undefined, // Explicitly set to undefined
            sectionFileIds: sections
              .map((s) => s.fileId)
              .filter(Boolean) as string[],
          };

          // Prepare sections data
          const draftSections: DraftSection[] = sections.map((section) => ({
            id: section.id,
            title: section.title,
            fileId: section.fileId,
            duration: section.duration,
            description: section.description,
          }));

          await draftStorage.saveDraftData(draftFormData, draftSections);

          setDraftSaveStatus("saved");
          setLastSavedAt(new Date());

          // Reset status after a delay
          setTimeout(() => setDraftSaveStatus("idle"), 2000);
        } catch (error) {
          console.error("Failed to save draft after thumbnail removal:", error);
          setDraftSaveStatus("error");
          setTimeout(() => setDraftSaveStatus("idle"), 3000);
        } finally {
          setIsSavingDraft(false);
        }
      }
    } catch (error) {
      console.error("Error removing thumbnail:", error);
    }
  }, [formData, isDraftSupported, sections]);

  // Delete section with file cleanup
  const deleteSection = useCallback(
    async (sectionId: string) => {
      try {
        const section = sections.find((s) => s.id === sectionId);

        // Delete associated file if exists
        if (section?.fileId && isDraftSupported) {
          try {
            await draftStorage.deleteFile(section.fileId);
          } catch (error) {
            console.error("Failed to delete section file:", error);
          }
        }

        // Update sections state
        const updatedSections = sections.filter((s) => s.id !== sectionId);
        setSections(updatedSections);

        // Immediately save the updated state to draft storage
        if (isDraftSupported) {
          try {
            setIsSavingDraft(true);
            setDraftSaveStatus("saving");

            // Prepare draft form data
            const draftFormData: DraftFormData = {
              title: formData.title,
              description: formData.description,
              creatorName: formData.creatorName,
              pricePerMonth: formData.pricePerMonth,
              category: formData.category,
              difficulty: formData.difficulty,
              learningObjectives: formData.learningObjectives,
              requirements: formData.requirements,
              tags: formData.tags,
              thumbnailFileId: formData.thumbnailFileId,
              sectionFileIds: updatedSections
                .map((s) => s.fileId)
                .filter(Boolean) as string[],
            };

            // Prepare sections data
            const draftSections: DraftSection[] = updatedSections.map(
              (section) => ({
                id: section.id,
                title: section.title,
                fileId: section.fileId,
                duration: section.duration,
                description: section.description,
              })
            );

            await draftStorage.saveDraftData(draftFormData, draftSections);

            setDraftSaveStatus("saved");
            setLastSavedAt(new Date());

            // Reset status after a delay
            setTimeout(() => setDraftSaveStatus("idle"), 2000);
          } catch (error) {
            console.error("Failed to save draft after deletion:", error);
            setDraftSaveStatus("error");
            setTimeout(() => setDraftSaveStatus("idle"), 3000);
          } finally {
            setIsSavingDraft(false);
          }
        }
      } catch (error) {
        console.error("Error deleting section:", error);
      }
    },
    [sections, isDraftSupported, formData]
  );

  // Clear draft and all associated files
  const clearDraft = useCallback(async () => {
    if (!isDraftSupported) {
      // Fallback to simple state reset
      setFormData({
        title: "",
        description: "",
        thumbnailFile: null,
        thumbnailPreview: null,
        creatorName: "",
        pricePerMonth: "0.01",
        category: "",
        difficulty: "",
        learningObjectives: ["", "", ""],
        requirements: [""],
        tags: [],
      });
      setSections([]);
      return;
    }

    try {
      await draftStorage.clearDraft();

      // Reset form state
      setFormData({
        title: "",
        description: "",
        thumbnailFile: null,
        thumbnailPreview: null,
        creatorName: "",
        pricePerMonth: "0.01",
        category: "",
        difficulty: "",
        learningObjectives: ["", "", ""],
        requirements: [""],
        tags: [],
      });
      setSections([]);
      setLastSavedAt(null);
    } catch (error) {
      console.error("Failed to clear draft:", error);
      alert("Failed to clear draft");
    }
  }, [isDraftSupported]);

  // Manual save draft
  const manualSaveDraft = useCallback(async () => {
    if (!isDraftSupported) {
      alert("Draft storage not supported in this browser");
      return;
    }

    try {
      setIsSavingDraft(true);
      setDraftSaveStatus("saving");

      const draftFormData: DraftFormData = {
        title: formData.title,
        description: formData.description,
        creatorName: formData.creatorName,
        pricePerMonth: formData.pricePerMonth,
        category: formData.category,
        difficulty: formData.difficulty,
        learningObjectives: formData.learningObjectives,
        requirements: formData.requirements,
        tags: formData.tags,
        thumbnailFileId: formData.thumbnailFileId,
        sectionFileIds: sections
          .map((s) => s.fileId)
          .filter(Boolean) as string[],
      };

      const draftSections: DraftSection[] = sections.map((section) => ({
        id: section.id,
        title: section.title,
        fileId: section.fileId,
        duration: section.duration,
        description: section.description,
      }));

      await draftStorage.saveDraftData(draftFormData, draftSections);

      setDraftSaveStatus("saved");
      setLastSavedAt(new Date());
      alert("Draft saved successfully!");

      setTimeout(() => setDraftSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Failed to save draft:", error);
      setDraftSaveStatus("error");
      alert("Failed to save draft");
      setTimeout(() => setDraftSaveStatus("idle"), 3000);
    } finally {
      setIsSavingDraft(false);
    }
  }, [formData, sections, isDraftSupported]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedSection(index);
    setIsDraggingOver(true);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedSection === null) return;

    if (draggedSection !== index) {
      const newSections = [...sections];
      const draggedItem = newSections[draggedSection];
      newSections.splice(draggedSection, 1);
      newSections.splice(index, 0, draggedItem);
      setSections(newSections);
      setDraggedSection(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedSection(null);
    setIsDraggingOver(false);
  };

  /**
   * Upload course assets to IPFS via Hybrid API (OPTION A)
   *
   * Architecture:
   * - Thumbnail → Pinata IPFS (for course cards, certificates)
   * - Videos → Livepeer with IPFS storage (for playback + transcoding)
   *
   * Flow:
   * 1. Upload thumbnail to Pinata via backend
   * 2. Request TUS endpoints from backend for each video
   * 3. Upload videos DIRECTLY to Livepeer using tus-js-client (frontend)
   * 4. Poll backend until all videos are processed
   * 5. Enable IPFS storage on each asset
   *
   * Smart Contract Storage:
   * - thumbnailCID: Pinata IPFS CID (Qm... or bafy...)
   * - section.contentCID: Livepeer playback ID (16-char hex like "abc123def456")
   *
   * Playback Detection:
   * - HybridVideoPlayer checks contentCID format
   * - 16-char hex → LivepeerPlayerView (modern player with quality selector)
   * - IPFS CID → LegacyVideoPlayer (backward compatibility for old Pinata videos)
   *
   * Returns plain CIDs compatible with smart contract storage
   */
  const uploadCourseAssetsToIPFS = async (): Promise<{
    thumbnailCID: string;
    videoCIDs: { sectionId: string; cid: string; filename: string }[];
  }> => {
    try {
      // Step 1: Validate thumbnail exists
      if (!formData.thumbnailFile) {
        throw new Error("Thumbnail is required for publishing");
      }

      // Initialize upload statuses
      setUploadStage(UploadStage.UPLOADING_THUMBNAIL);
      setThumbnailUploadStatus({
        filename: formData.thumbnailFile.name,
        progress: 0,
        status: "uploading",
      });

      const courseId = `draft-${Date.now()}`;
      const videoSections = sections.filter((s) => s.file !== null);

      // Initialize upload statuses
      const initialVideoStatuses: FileUploadStatus[] = videoSections.map(
        (section) => ({
          filename: section.file?.name || section.title,
          progress: 0,
          status: "pending",
        })
      );
      setVideoUploadStatuses(initialVideoStatuses);

      // Step 2: Request TUS endpoints from backend
      console.log("[Create Course] Requesting TUS endpoints...");
      const uploadFormData = new FormData();
      uploadFormData.append("courseId", courseId);
      uploadFormData.append("thumbnail", formData.thumbnailFile);
      uploadFormData.append(
        "videoMetadata",
        JSON.stringify(
          videoSections.map((section) => ({
            filename: section.file?.name || "video.mp4",
            size: section.file?.size || 0,
            type: section.file?.type || "video/mp4",
            sectionId: section.id,
          }))
        )
      );

      const setupResponse = await fetch("/api/course/upload-assets-hybrid", {
        method: "POST",
        body: uploadFormData,
      });

      if (!setupResponse.ok) {
        const errorData = await setupResponse.json();
        throw new Error(errorData.error || "Failed to setup uploads");
      }

      const setupResult = await setupResponse.json();
      console.log("[Create Course] Setup successful:", setupResult);

      // Update thumbnail status
      setThumbnailUploadStatus({
        filename: formData.thumbnailFile.name,
        progress: 100,
        status: "completed",
        cid: setupResult.thumbnailCID,
      });

      // Step 3: Upload videos directly to Livepeer using TUS
      setUploadStage(UploadStage.UPLOADING_VIDEOS);
      console.log(
        "[Create Course] Uploading videos directly to Livepeer via TUS..."
      );

      const tusModule = await import("tus-js-client");
      const Upload =
        (tusModule as { default?: { Upload: unknown }; Upload?: unknown })
          .default ||
        (tusModule as { Upload?: unknown }).Upload ||
        tusModule;
      const videoResults: Array<{
        sectionId: string;
        cid: string;
        assetId: string;
        filename: string;
      }> = [];

      for (let i = 0; i < videoSections.length; i++) {
        const section = videoSections[i];
        const tusEndpoint = setupResult.tusEndpoints[i];

        if (!section.file) continue;

        console.log(
          `[Create Course] Uploading video ${i + 1}/${videoSections.length}: ${
            section.file.name
          }`
        );

        await new Promise<void>((resolve, reject) => {
          const UploadConstructor = Upload as new (
            file: File,
            options: {
              endpoint: string;
              metadata: Record<string, string>;
              uploadSize: number;
              onError: (error: Error) => void;
              onProgress: (bytesUploaded: number, bytesTotal: number) => void;
              onSuccess: () => void;
            }
          ) => { start: () => void };

          const upload = new UploadConstructor(section.file as File, {
            endpoint: tusEndpoint.tusEndpoint,
            metadata: {
              filename: section.file?.name || "video.mp4",
              filetype: section.file?.type || "video/mp4",
            },
            uploadSize: section.file?.size || 0,
            onError: (error: Error) => {
              console.error(`[Create Course] TUS upload error:`, error);
              setVideoUploadStatuses((prev) =>
                prev.map((status, idx) =>
                  idx === i
                    ? { ...status, status: "error", error: error.message }
                    : status
                )
              );
              reject(error);
            },
            onProgress: (bytesUploaded: number, bytesTotal: number) => {
              const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
              setVideoUploadStatuses((prev) =>
                prev.map((status, idx) =>
                  idx === i
                    ? { ...status, progress: percentage, status: "uploading" }
                    : status
                )
              );
            },
            onSuccess: () => {
              console.log(
                `[Create Course] ✅ Video ${i + 1} uploaded successfully`
              );
              setVideoUploadStatuses((prev) =>
                prev.map((status, idx) =>
                  idx === i
                    ? {
                        ...status,
                        progress: 100,
                        status: "completed",
                        cid: tusEndpoint.playbackId,
                      }
                    : status
                )
              );
              videoResults.push({
                sectionId: section.id,
                cid: tusEndpoint.playbackId,
                assetId: tusEndpoint.assetId,
                filename: section.file?.name || "video.mp4",
              });
              resolve();
            },
          });

          upload.start();
        });
      }

      console.log("[Create Course] ✅ All videos uploaded via TUS");
      console.log(
        "[Create Course] Using pre-detected durations from local video files"
      );
      console.log(
        "[Create Course] contentCID = Livepeer playback ID (16-char hex)"
      );

      const videoCIDs = videoResults.map((result) => ({
        sectionId: result.sectionId,
        cid: result.cid,
        filename: result.filename,
      }));

      setUploadStage(UploadStage.FINALIZING);

      return {
        thumbnailCID: setupResult.thumbnailCID,
        videoCIDs,
      };
    } catch (error) {
      console.error("IPFS upload error:", error);
      setUploadStage(UploadStage.ERROR);
      setUploadError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
      throw error;
    }
  };

  // Publish course with real IPFS upload
  const publishCourse = async () => {
    setIsPublishing(true);
    setUploadStage(UploadStage.UPLOADING_THUMBNAIL);
    setUploadError(undefined);

    try {
      // Validate required fields
      if (
        !formData.title ||
        !formData.description ||
        !formData.thumbnailFile ||
        !formData.creatorName
      ) {
        toast.error("Missing required fields", {
          description:
            "Please fill in title, description, instructor name, and upload a thumbnail",
        });
        return;
      }

      if (sections.length === 0) {
        toast.error("No content sections", {
          description: "Please add at least one content section",
        });
        return;
      }

      // Upload assets to IPFS
      toast.info("Uploading course assets...", {
        description: "Please wait while we upload your course to IPFS",
      });

      const { thumbnailCID, videoCIDs } = await uploadCourseAssetsToIPFS();

      // Mark upload as complete - but keep modal open for blockchain publishing
      console.log("✅ Course assets uploaded successfully!");
      console.log("Thumbnail CID:", thumbnailCID);
      console.log("Video CIDs:", videoCIDs);

      // ✅ Prepare course data matching smart contract ABI
      // CourseFactory.createCourse(title, description, thumbnailCID, creatorName, pricePerMonth, category, difficulty)
      // CourseFactory.batchAddSections(courseId, SectionData[]) where SectionData = (title, contentCID, duration)

      // Filter only sections that have video files
      const videoSections = sections.filter((s) => s.file !== null);

      const courseData = {
        title: formData.title,
        description: formData.description,
        thumbnailCID, // Pinata IPFS CID (for course thumbnail display)
        creatorName: formData.creatorName, // Instructor name - REQUIRED by smart contract
        pricePerMonth: formData.pricePerMonth,
        category: formData.category,
        difficulty: formData.difficulty,
        sections: videoSections.map((section) => {
          const videoCID = videoCIDs.find((v) => v.sectionId === section.id);
          if (!videoCID?.cid) {
            throw new Error(
              `Video CID not found for section "${section.title}". Upload may have failed.`
            );
          }
          return {
            title: section.title,
            contentCID: videoCID.cid,
            duration: section.duration,
          };
        }),
      };

      console.log("✅ Course data prepared for blockchain:", courseData);
      console.log("   - Instructor:", courseData.creatorName);
      console.log("   - Price:", courseData.pricePerMonth, "ETH");
      console.log("   - Sections:", courseData.sections.length, "videos");

      // Step 2: Publish to blockchain
      toast.info("Publishing to blockchain...", {
        description: "Please confirm the transaction in your wallet",
      });

      // Check wallet connection
      if (!activeAccount) {
        toast.error("Wallet not connected", {
          description: "Please connect your wallet to publish",
        });
        return;
      }

      // Prepare blockchain transaction
      try {
        // Step 2.1: Create course on blockchain
        const createCourseTransaction = prepareCreateCourseTransaction({
          metadata: {
            title: formData.title,
            description: formData.description,
            thumbnailCID,
            creatorName: formData.creatorName,
            category: formData.category,
            difficulty: formData.difficulty,
          },
          sections: courseData.sections,
          pricePerMonth: formData.pricePerMonth,
        });

        // Send transaction using Thirdweb
        sendTransaction(createCourseTransaction, {
          onSuccess: async (result) => {
            console.log("✅ Course created on blockchain!");
            console.log("Transaction hash:", result.transactionHash);

            setUploadStage(UploadStage.FINALIZING);
            toast.info("Course created! Extracting course ID...", {
              description: "This may take a few seconds",
            });

            // Step 2.2: Extract courseId from CourseCreated event
            try {
              console.log("[Create Course] Waiting for transaction receipt...");

              await waitForReceipt({
                client,
                chain: mantaPacificTestnet,
                transactionHash: result.transactionHash,
              });

              console.log("[Create Course] Transaction confirmed!");

              const courseFactoryContract = getContract({
                client,
                chain: mantaPacificTestnet,
                address: CONTRACT_ADDRESSES.COURSE_FACTORY,
              });

              let courseId: bigint;

              console.log("[Create Course] Getting course ID from contract...");

              try {
                courseId = await readContract({
                  contract: courseFactoryContract,
                  method: "function getTotalCourses() view returns (uint256)",
                  params: [],
                });

                console.log(
                  "[Create Course] ✅ Course ID extracted:",
                  courseId.toString()
                );
              } catch (error) {
                console.error(
                  "[Create Course] Failed to get course ID:",
                  error
                );
                throw new Error("Failed to retrieve course ID from contract");
              }

              toast.success("Course created successfully!", {
                description: `Course ID: ${courseId.toString()}`,
              });

              // Step 2.3: Add sections to blockchain in batches
              if (courseData.sections.length > 0) {
                setIsAddingSections(true);
                toast.info("Adding course sections...", {
                  description: `Adding ${courseData.sections.length} sections to blockchain`,
                });

                console.log(
                  "[Create Course] Adding sections to course ID:",
                  courseId.toString()
                );

                // Split sections into batches of 50 (smart contract limit)
                const BATCH_SIZE = 50;
                const batches: (typeof courseData.sections)[] = [];

                for (
                  let i = 0;
                  i < courseData.sections.length;
                  i += BATCH_SIZE
                ) {
                  batches.push(courseData.sections.slice(i, i + BATCH_SIZE));
                }

                console.log(
                  `[Create Course] Splitting ${courseData.sections.length} sections into ${batches.length} batches`
                );

                // Process batches sequentially
                for (let i = 0; i < batches.length; i++) {
                  const batch = batches[i];
                  const batchNumber = i + 1;

                  console.log(
                    `[Create Course] Processing batch ${batchNumber}/${batches.length} (${batch.length} sections)`
                  );

                  toast.info(
                    `Adding sections batch ${batchNumber}/${batches.length}...`,
                    {
                      description: `Adding ${batch.length} sections`,
                    }
                  );

                  // Prepare batch add sections transaction
                  const batchTransaction = prepareBatchAddSectionsTransaction({
                    courseId: courseId,
                    sections: batch.map((section) => ({
                      title: section.title,
                      contentCID: section.contentCID,
                      duration: section.duration,
                    })),
                  });

                  // Send batch transaction
                  await new Promise<void>((resolve, reject) => {
                    sendTransaction(batchTransaction, {
                      onSuccess: (batchResult) => {
                        console.log(
                          `[Create Course] ✅ Batch ${batchNumber}/${batches.length} added successfully`
                        );
                        console.log(
                          `[Create Course] Transaction hash:`,
                          batchResult.transactionHash
                        );
                        resolve();
                      },
                      onError: (batchError) => {
                        console.error(
                          `[Create Course] ❌ Batch ${batchNumber}/${batches.length} failed:`,
                          batchError
                        );
                        reject(batchError);
                      },
                    });
                  });

                  // Small delay between batches to avoid nonce issues
                  if (i < batches.length - 1) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                  }
                }

                console.log(
                  "[Create Course] ✅ All sections added successfully!"
                );
                setIsAddingSections(false);
                toast.success("All sections added!", {
                  description: `${courseData.sections.length} sections added to blockchain`,
                });
              }

              // Mark as complete
              setUploadStage(UploadStage.COMPLETE);

              // Clear draft after successful upload
              await clearDraft();

              toast.success("Course published successfully! 🎉", {
                description: "Your course is now live on the blockchain",
                duration: 5000,
              });
            } catch (sectionError) {
              console.error(
                "[Create Course] Failed to add sections:",
                sectionError
              );

              // Course is created but sections failed
              toast.error("Course created, but sections failed", {
                description:
                  sectionError instanceof Error
                    ? sectionError.message
                    : "Sections were not added to the course",
                duration: 7000,
              });

              // Still clear draft since course was created
              await clearDraft();
            }
          },
          onError: (error) => {
            console.error("Blockchain publishing failed:", error);
            toast.error("Failed to publish course", {
              description: error.message || "Please try again",
            });
            setUploadStage(UploadStage.ERROR);
            setUploadError(error.message || "Transaction failed");
            setIsPublishing(false);
          },
        });
      } catch (error) {
        console.error("Failed to prepare transaction:", error);
        toast.error("Failed to prepare transaction", {
          description:
            error instanceof Error ? error.message : "Please try again",
        });
        setUploadStage(UploadStage.ERROR);
        setUploadError(
          error instanceof Error
            ? error.message
            : "Failed to prepare transaction"
        );
        return;
      }
    } catch (error) {
      console.error("Publishing failed:", error);
      toast.error("Failed to publish course", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
      setUploadStage(UploadStage.ERROR);
      setUploadError(
        error instanceof Error ? error.message : "Publishing failed"
      );
    } finally {
      // Keep publishing state true until modal is manually closed
      // The modal's onClose handler will reset isPublishing
      console.log(
        "[Create Course] Publish flow completed. Stage:",
        uploadStage
      );
    }
  };

  // Format file size
  // const _formatFileSize = (bytes: number): string => {
  //   if (bytes < 1024) return bytes + ' B';
  //   if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  //   return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  // };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const totalDuration = sections.reduce((acc, s) => acc + s.duration, 0);
  const priceInIDR = parseFloat(formData.pricePerMonth) * ethToIDR;

  const steps = ["Course Info", "Content", "Pricing", "Review"];

  // Show loading screen while initializing draft storage
  if (isLoadingDraft) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Loading Draft...
          </h2>
          <p className="text-muted-foreground">
            Initializing storage and loading your saved work
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border">
        <FormContainer>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Create Course
                </h1>
                <p className="text-sm text-muted-foreground">
                  Share your knowledge with the world
                </p>
              </div>
            </div>

            {/* Draft Save Status */}
            <div className="flex items-center gap-2">
              {draftSaveStatus === "saving" && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
              {draftSaveStatus === "saved" && lastSavedAt && (
                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Saved {new Date(lastSavedAt).toLocaleTimeString()}
                </span>
              )}
              {draftSaveStatus === "error" && (
                <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Save failed
                </span>
              )}
            </div>

            {/* Progress Steps */}
            <div className="hidden lg:flex items-center gap-2">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-center">
                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      idx === activeStep
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                        : idx < activeStep
                        ? "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === activeStep
                          ? "bg-blue-600 text-white dark:bg-blue-500"
                          : idx < activeStep
                          ? "bg-green-600 text-white dark:bg-green-500"
                          : "bg-muted-foreground/20 text-muted-foreground"
                      }`}
                    >
                      {idx < activeStep ? "✓" : idx + 1}
                    </div>
                    <span className="font-medium">{step}</span>
                  </div>
                  {idx < steps.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </FormContainer>
      </div>

      <FormContainer>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Information Card */}
            {/* FIXED: Removed padding from Card and added rounded-t-xl to CardHeader */}
            <Card className="p-0">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border-b border-border p-0 rounded-t-xl">
                <div className="p-6">
                  <CardTitle className="text-xl font-bold text-card-foreground flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Course Information
                  </CardTitle>
                  <CardDescription>
                    Basic details about your course
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Title Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Course Title *
                  </label>
                  <input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="e.g., Complete Web Development Bootcamp 2025"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all text-foreground placeholder:text-muted-foreground"
                    maxLength={200}
                  />
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      Make it searchable and descriptive
                    </span>
                    <span
                      className={`${
                        formData.title.length > 180
                          ? "text-orange-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formData.title.length}/200
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Course Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Describe what students will learn, prerequisites, and outcomes..."
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all resize-none text-foreground placeholder:text-muted-foreground"
                    maxLength={2000}
                  />
                  <div className="text-xs text-right">
                    <span
                      className={`${
                        formData.description.length > 1800
                          ? "text-orange-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formData.description.length}/2000
                    </span>
                  </div>
                </div>

                {/* Thumbnail Upload */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Course Thumbnail *
                  </label>
                  <div className="relative">
                    {formData.thumbnailPreview ? (
                      <div className="relative group">
                        <Image
                          src={formData.thumbnailPreview}
                          alt="Thumbnail"
                          width={400}
                          height={192}
                          className="w-full h-48 object-cover rounded-xl"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                          <label className="px-4 py-2 bg-white text-slate-800 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleThumbnailUpload}
                              className="hidden"
                            />
                            Change
                          </label>
                          <button
                            onClick={removeThumbnail}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailUpload}
                          className="hidden"
                        />
                        <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                        <span className="text-sm font-medium text-foreground">
                          Click to upload thumbnail
                        </span>
                        <span className="text-xs text-muted-foreground mt-1">
                          PNG, JPG up to 10MB
                        </span>
                      </label>
                    )}
                    {errors.thumbnail && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.thumbnail}
                      </p>
                    )}
                  </div>
                </div>

                {/* Category & Difficulty */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-foreground">
                      Category *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {COURSE_CATEGORIES.slice(0, 9).map((cat) => (
                        <button
                          key={cat.value}
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              category: cat.value,
                            }))
                          }
                          className={`p-3 rounded-xl border-2 transition-all ${
                            formData.category === cat.value
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/50 dark:border-blue-400"
                              : "border-border hover:border-muted-foreground/50 bg-card"
                          }`}
                        >
                          <div className="text-2xl mb-1">{cat.icon}</div>
                          <div className="text-xs font-medium text-foreground">
                            {cat.label}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-foreground">
                      Difficulty Level *
                    </label>
                    <div className="space-y-2">
                      {DIFFICULTY_LEVELS.map((level) => (
                        <button
                          key={level.value}
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              difficulty: level.value,
                            }))
                          }
                          className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                            formData.difficulty === level.value
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/50 dark:border-blue-400"
                              : "border-border hover:border-muted-foreground/50 bg-card"
                          }`}
                        >
                          <span className="text-2xl">{level.icon}</span>
                          <div className="flex-1 text-left">
                            <div className="font-medium text-foreground">
                              {level.label}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {level.description}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Course Content Card */}
            {/* FIXED: Removed padding from Card and added rounded-t-xl to CardHeader */}
            <Card className="p-0">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 border-b border-border p-0 rounded-t-xl">
                <div className="p-6">
                  <CardTitle className="text-xl font-bold text-card-foreground flex items-center gap-2">
                    <Video className="h-5 w-5 text-green-600 dark:text-green-400" />
                    Course Content
                  </CardTitle>
                  <CardDescription>
                    Add videos, documents, and quizzes
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Sections List */}
                {sections.length > 0 && (
                  <div
                    className={`space-y-3 ${
                      isDraggingOver
                        ? "bg-blue-50/50 dark:bg-blue-950/20 rounded-xl p-2 border-2 border-dashed border-blue-400"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-foreground">
                        {sections.length} Section
                        {sections.length !== 1 ? "s" : ""} •{" "}
                        {formatDuration(totalDuration)}
                      </span>
                    </div>

                    {sections.map((section, index) => (
                      <div
                        key={section.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`group flex items-center gap-3 p-4 bg-muted/50 rounded-xl border border-border hover:border-muted-foreground/50 transition-all cursor-move ${
                          draggedSection === index ? "opacity-50" : ""
                        }`}
                      >
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                        <span className="flex items-center justify-center w-8 h-8 bg-card rounded-lg text-sm font-bold text-foreground">
                          {index + 1}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div
                              className={`p-1.5 rounded-lg ${FILE_CONFIGS["video"].color}`}
                            >
                              {React.createElement(FILE_CONFIGS["video"].icon, {
                                className: "h-4 w-4",
                              })}
                            </div>
                            <p className="font-medium text-foreground truncate">
                              {section.title}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {section.file?.name || "File uploaded"} •{" "}
                            {formatDuration(section.duration)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteSection(section.id)}
                            className="p-2 text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Section */}
                <div className="border-2 border-dashed border-border rounded-xl p-6 space-y-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <PlusCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Add New Section
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      value={newSection.title}
                      onChange={(e) =>
                        setNewSection((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="Section title"
                      className="px-4 py-2 rounded-lg border border-border bg-background focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all text-foreground placeholder:text-muted-foreground"
                    />

                    {/* ✅ Only video type supported - type selector removed */}
                    <div className="px-4 py-2 rounded-lg border border-border bg-muted/50 text-muted-foreground flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      <span className="text-sm">Video Content Only</span>
                    </div>
                  </div>

                  {/* ✅ Description field removed - not used in smart contract */}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* File Upload */}
                    <div>
                      {newSection.file ? (
                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/50 rounded-lg">
                          <FileCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium text-green-800 dark:text-green-200 truncate flex-1">
                            {newSection.file.name}
                          </span>
                          <button
                            onClick={() => {
                              setNewSection((prev) => ({
                                ...prev,
                                file: null,
                                filePreview: null,
                                duration: 300,
                              }));
                              setIsDurationAutoDetected(false);
                            }}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all">
                          <input
                            type="file"
                            accept={FILE_CONFIGS["video"].accept}
                            onChange={handleSectionFileUpload}
                            className="hidden"
                          />
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">
                            Upload video
                          </span>
                        </label>
                      )}
                    </div>

                    {/* Duration Input */}
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          value={newSection.duration}
                          onChange={(e) => {
                            if (!isDurationAutoDetected) {
                              setNewSection((prev) => ({
                                ...prev,
                                duration: parseInt(e.target.value) || 60,
                              }));
                            }
                          }}
                          readOnly={isDurationAutoDetected}
                          min="60"
                          max="10800"
                          placeholder="Duration (seconds)"
                          className={`w-full px-4 py-2 rounded-lg border border-border focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all text-foreground placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            isDurationAutoDetected
                              ? "bg-green-50 dark:bg-green-950/30 border-green-500 cursor-not-allowed"
                              : "bg-background"
                          }`}
                        />
                        {isDurationAutoDetected && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">Auto</span>
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDuration(newSection.duration)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={addSection}
                    disabled={!newSection.title || !newSection.file}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="h-5 w-5" />
                    Add Section
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Card */}
            {/* FIXED: Removed padding from Card and added rounded-t-xl to CardHeader */}
            <Card className="p-0">
              <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/50 dark:to-orange-950/50 border-b border-border p-0 rounded-t-xl">
                <div className="p-6">
                  <CardTitle className="text-xl font-bold text-card-foreground flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    Pricing & Creator Info
                  </CardTitle>
                  <CardDescription>
                    Set your course price and creator details
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Creator Name *
                  </label>
                  <input
                    value={formData.creatorName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        creatorName: e.target.value,
                      }))
                    }
                    placeholder="Your name or brand"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all text-foreground placeholder:text-muted-foreground"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Monthly Subscription Price (ETH) *
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                        <span className="text-white font-bold text-xs">
                          ETH
                        </span>
                      </div>
                    </div>
                    <input
                      type="number"
                      value={formData.pricePerMonth}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          pricePerMonth: e.target.value,
                        }))
                      }
                      step="0.001"
                      min="0.001"
                      max="1"
                      className="w-full pl-16 pr-4 py-3 text-lg font-semibold rounded-xl border border-border bg-background focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all text-foreground"
                    />
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Equivalent in IDR:
                      </span>
                      <span className="text-lg font-bold text-foreground">
                        {priceInIDR.toLocaleString("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          minimumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                      <span className="text-sm text-muted-foreground">
                        Platform Fee (2%):
                      </span>
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">
                        -
                        {(parseFloat(formData.pricePerMonth) * 0.02).toFixed(6)}{" "}
                        ETH
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-semibold text-foreground">
                        Your Earnings:
                      </span>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        {(parseFloat(formData.pricePerMonth) * 0.98).toFixed(6)}{" "}
                        ETH
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  Course Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">
                      Sections
                    </span>
                    <span className="font-semibold text-foreground">
                      {sections.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">
                      Total Duration
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatDuration(totalDuration)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">
                      Category
                    </span>
                    <span className="font-semibold text-foreground">
                      {COURSE_CATEGORIES.find(
                        (c) => c.value === formData.category
                      )?.label || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">
                      Difficulty
                    </span>
                    <span className="font-semibold text-foreground">
                      {formData.difficulty || "-"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Publishing Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
                  <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Publishing Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <button
                    onClick={manualSaveDraft}
                    disabled={!isDraftSupported || isSavingDraft}
                    className="w-full py-3 bg-muted text-muted-foreground font-medium rounded-xl hover:bg-muted/80 hover:text-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSavingDraft ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Draft
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowPreview(true)}
                    className="w-full py-3 bg-card text-foreground font-medium rounded-xl border-2 border-border hover:border-muted-foreground/50 transition-all flex items-center justify-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Preview Course
                  </button>

                  {(!formData.title ||
                    !formData.description ||
                    !formData.thumbnailFile ||
                    !formData.creatorName ||
                    !formData.category ||
                    !formData.difficulty ||
                    sections.length === 0) && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/30 border-2 border-red-500 rounded-xl">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                            Please complete the following required fields:
                          </h4>
                          <ul className="space-y-1 text-sm text-red-800 dark:text-red-200">
                            {!formData.title && (
                              <li className="flex items-center gap-2">
                                <span className="text-red-600">✗</span> Course
                                Title
                              </li>
                            )}
                            {!formData.description && (
                              <li className="flex items-center gap-2">
                                <span className="text-red-600">✗</span> Course
                                Description
                              </li>
                            )}
                            {!formData.thumbnailFile && (
                              <li className="flex items-center gap-2">
                                <span className="text-red-600">✗</span>{" "}
                                Thumbnail Image
                              </li>
                            )}
                            {!formData.creatorName && (
                              <li className="flex items-center gap-2">
                                <span className="text-red-600">✗</span> Creator
                                Name
                              </li>
                            )}
                            {!formData.category && (
                              <li className="flex items-center gap-2">
                                <span className="text-red-600">✗</span> Course
                                Category
                              </li>
                            )}
                            {!formData.difficulty && (
                              <li className="flex items-center gap-2">
                                <span className="text-red-600">✗</span>{" "}
                                Difficulty Level
                              </li>
                            )}
                            {sections.length === 0 && (
                              <li className="flex items-center gap-2">
                                <span className="text-red-600">✗</span> At least
                                one section
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      console.log("[Publish] Button clicked");
                      console.log("[Publish] Validation status:", {
                        isPublishing,
                        isSendingTx,
                        title: formData.title,
                        description: formData.description,
                        thumbnailFile: !!formData.thumbnailFile,
                        creatorName: formData.creatorName,
                        sectionsCount: sections.length,
                        category: formData.category,
                        difficulty: formData.difficulty,
                        pricePerMonth: formData.pricePerMonth,
                      });
                      publishCourse();
                    }}
                    disabled={
                      isPublishing ||
                      isSendingTx ||
                      !formData.title ||
                      !formData.description ||
                      !formData.thumbnailFile ||
                      !formData.creatorName ||
                      !formData.category ||
                      !formData.difficulty ||
                      sections.length === 0
                    }
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isPublishing || isSendingTx ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        Publish to Blockchain
                      </>
                    )}
                  </button>
                </div>

                {/* Upload Progress */}
                {(isPublishing || uploadStage !== UploadStage.IDLE) &&
                  Object.keys(uploadProgress).length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">
                        Upload Progress
                      </h4>
                      {Object.entries(uploadProgress).map(([key, progress]) => (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              {key === "thumbnail"
                                ? "Thumbnail"
                                : `Section ${key.replace("section_", "")}`}
                            </span>
                            <span className="text-foreground font-medium">
                              {Math.round(progress)}%
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                {/* Publishing Status */}
                {uploadStage !== UploadStage.IDLE && (
                  <div className="mt-4 space-y-3">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        {uploadStage === UploadStage.UPLOADING_THUMBNAIL && (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground"></div>
                            <span>Uploading thumbnail...</span>
                          </>
                        )}
                        {uploadStage === UploadStage.UPLOADING_VIDEOS && (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground"></div>
                            <span>Uploading videos to Livepeer...</span>
                          </>
                        )}
                        {uploadStage === UploadStage.FINALIZING && (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground"></div>
                            <span>
                              {isAddingSections
                                ? "Adding sections to blockchain..."
                                : "Publishing course to blockchain..."}
                            </span>
                          </>
                        )}
                        {uploadStage === UploadStage.COMPLETE && (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-green-600 font-medium">
                              Course published successfully!
                            </span>
                          </>
                        )}
                        {uploadStage === UploadStage.ERROR && (
                          <>
                            <X className="h-4 w-4 text-red-600" />
                            <span className="text-red-600 font-medium">
                              Publishing failed
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Video Upload Progress */}
                    {videoUploadStatuses.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">
                          Video Upload Progress (
                          {
                            videoUploadStatuses.filter(
                              (v) => v.status === "completed"
                            ).length
                          }
                          /{videoUploadStatuses.length})
                        </h4>
                        {videoUploadStatuses.map((video, idx) => (
                          <div
                            key={video.filename || idx}
                            className="p-3 bg-card rounded-lg border"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Video className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium truncate max-w-[200px]">
                                  {video.filename || `Video ${idx + 1}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {video.status === "pending" && (
                                  <span className="text-xs text-muted-foreground">
                                    Waiting...
                                  </span>
                                )}
                                {video.status === "uploading" && (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                    <span className="text-xs text-blue-600 font-medium">
                                      {video.progress}%
                                    </span>
                                  </>
                                )}
                                {video.status === "completed" && (
                                  <>
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                    <span className="text-xs text-green-600 font-medium">
                                      Done
                                    </span>
                                  </>
                                )}
                                {video.status === "error" && (
                                  <>
                                    <X className="h-3 w-3 text-red-600" />
                                    <span className="text-xs text-red-600 font-medium">
                                      Failed
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            {video.status === "uploading" && (
                              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                                  style={{ width: `${video.progress}%` }}
                                />
                              </div>
                            )}
                            {video.status === "error" && video.error && (
                              <p className="text-xs text-red-600 mt-1">
                                {video.error}
                              </p>
                            )}
                            {video.status === "completed" && video.cid && (
                              <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                                CID: {video.cid}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Help Card */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Smart Contract Limits
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2"></div>
                  <span>Max 1000 sections per course</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2"></div>
                  <span>Section duration: 1 min - 3 hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2"></div>
                  <span>Max price: 1 ETH per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2"></div>
                  <span>Files stored on IPFS</span>
                </li>
              </ul>
            </div>

            {/* Draft Storage Info */}
            {isDraftSupported && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 rounded-2xl p-6 border border-green-200 dark:border-green-800">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  Enhanced Draft Storage
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2"></div>
                    <span>Large files supported (up to 500MB)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2"></div>
                    <span>Auto-save every second</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2"></div>
                    <span>Works offline</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2"></div>
                    <span>Automatic cleanup</span>
                  </li>
                </ul>
                {lastSavedAt && (
                  <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Last saved: {lastSavedAt.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {!isDraftSupported && (
              <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/50 dark:to-red-950/50 rounded-2xl p-6 border border-orange-200 dark:border-orange-800">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  Limited Storage
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your browser doesn&apos;t support enhanced storage. Draft
                  saving is disabled for large files. Consider using a modern
                  browser for the best experience.
                </p>
              </div>
            )}
          </div>
        </div>
      </FormContainer>

      {/* Course Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-border">
            <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">
                Course Preview
              </h2>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {formData.thumbnailPreview && (
                <Image
                  src={formData.thumbnailPreview}
                  alt="Course thumbnail"
                  width={400}
                  height={256}
                  className="w-full h-64 object-cover rounded-xl mb-6"
                />
              )}

              <h1 className="text-3xl font-bold text-foreground mb-2">
                {formData.title || "Untitled Course"}
              </h1>

              <p className="text-muted-foreground mb-6">
                {formData.description || "No description provided"}
              </p>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    By {formData.creatorName || "Unknown"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {formatDuration(totalDuration)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {formData.pricePerMonth} ETH/month
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">
                  Course Content
                </h3>
                {sections.map((section, idx) => (
                  <div
                    key={section.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <span className="font-bold text-muted-foreground">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {section.title}
                      </p>
                      {section.description && (
                        <p className="text-sm text-muted-foreground">
                          {section.description}
                        </p>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(section.duration)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress Modal */}
      <CourseUploadProgress
        isOpen={isPublishing}
        stage={uploadStage}
        thumbnailStatus={thumbnailUploadStatus}
        videoStatuses={videoUploadStatuses}
        currentVideoIndex={currentVideoIndex}
        totalVideos={sections.filter((s) => s.file !== null).length}
        onClose={() => {
          if (
            uploadStage === UploadStage.COMPLETE ||
            uploadStage === UploadStage.ERROR
          ) {
            setUploadStage(UploadStage.IDLE);
            setIsPublishing(false);
            setIsAddingSections(false);
          }
        }}
        error={uploadError}
      />
    </div>
  );
}
