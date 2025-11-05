"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import Image from "next/image";
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
  prepareMoveSectionTransaction,
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
  assetId?: string;
  contentCID?: string;
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
  DESCRIPTION_MAX: 2000,
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
  const [hasChanges, setHasChanges] = useState(false);

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

  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionFormData, setSectionFormData] = useState<SectionFormData>({
    title: "",
    duration: 300,
  });
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [processingAsset, setProcessingAsset] = useState(false);

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

      if (course.thumbnailCID) {
        setThumbnailPreview(
          `https://gateway.pinata.cloud/ipfs/${course.thumbnailCID}`
        );
      }
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

  async function uploadThumbnail(): Promise<string> {
    if (!thumbnailFile) {
      throw new Error("No thumbnail file");
    }

    setUploadingThumbnail(true);
    try {
      const formData = new FormData();
      formData.append("file", thumbnailFile);

      const response = await fetch("/api/ipfs/signed-url", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
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

    try {
      let thumbnailCID = formData.thumbnailCID;

      if (thumbnailFile) {
        toast.info("Uploading thumbnail...");
        thumbnailCID = await uploadThumbnail();
      }

      const transaction = prepareUpdateCourseTransaction({
        courseId: BigInt(courseId),
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

      sendTransaction(transaction, {
        onSuccess: () => {
          toast.success("Course updated successfully");
          setHasChanges(false);
          setTimeout(() => {
            router.push("/myCourse");
          }, 1500);
        },
        onError: (error) => {
          toast.error("Failed to update course", {
            description: error.message,
          });
        },
      });
    } catch (error) {
      toast.error("Failed to prepare update", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

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

  async function uploadVideoToLivepeer(file: File): Promise<string> {
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
            reject(error);
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const percentage = (bytesUploaded / bytesTotal) * 100;
            setVideoUploadProgress(Math.round(percentage));
          },
          onSuccess: async () => {
            setUploadingVideo(false);
            setProcessingAsset(true);
            toast.info("Video uploaded. Processing...");

            let attempts = 0;
            const maxAttempts = 60;

            while (attempts < maxAttempts) {
              await new Promise((res) => setTimeout(res, 3000));
              attempts++;

              try {
                const assetResponse = await fetch(
                  `/api/livepeer/asset/${asset.id}`
                );
                if (assetResponse.ok) {
                  const assetData = await assetResponse.json();

                  if (assetData.storage?.ipfs?.cid) {
                    setProcessingAsset(false);
                    toast.success("Video ready!");
                    resolve(assetData.storage.ipfs.cid);
                    return;
                  }

                  if (assetData.status?.phase === "failed") {
                    throw new Error("Video processing failed");
                  }
                }
              } catch (err) {
                console.error("Check asset error:", err);
              }
            }

            throw new Error("Video processing timeout");
          },
        });

        upload.start();
      });
    } catch (error) {
      setUploadingVideo(false);
      setProcessingAsset(false);
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
        toast.info("Uploading video...");
        contentCID = await uploadVideoToLivepeer(videoFile);
      }

      if (!contentCID) {
        toast.error("Video is required");
        return;
      }

      if (editingSectionId) {
        const section = sections.find((s) => s.id === editingSectionId);
        if (!section) {
          toast.error("Section not found");
          return;
        }

        const transaction = prepareUpdateSectionTransaction({
          courseId: BigInt(courseId!),
          sectionId: BigInt(section.sectionId),
          title: sectionFormData.title.trim(),
          contentCID: contentCID,
          duration: sectionFormData.duration,
        });

        sendTransaction(transaction, {
          onSuccess: () => {
            toast.success("Section updated");
            setSectionDialogOpen(false);
            setTimeout(() => loadCourseData(), 2000);
          },
          onError: (error) => {
            toast.error("Failed to update section", {
              description: error.message,
            });
          },
        });
      } else {
        if (sections.length >= CONTRACT_LIMITS.MAX_SECTIONS) {
          toast.error(
            `Maximum ${CONTRACT_LIMITS.MAX_SECTIONS} sections allowed`
          );
          return;
        }

        const transaction = prepareAddSectionTransaction({
          courseId: BigInt(courseId!),
          title: sectionFormData.title.trim(),
          contentCID: contentCID,
          duration: sectionFormData.duration,
        });

        sendTransaction(transaction, {
          onSuccess: () => {
            toast.success("Section added");
            setSectionDialogOpen(false);
            setTimeout(() => loadCourseData(), 2000);
          },
          onError: (error) => {
            toast.error("Failed to add section", {
              description: error.message,
            });
          },
        });
      }
    } catch (error) {
      toast.error("Operation failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function handleDeleteSection(section: CourseSection) {
    if (!confirm(`Delete "${section.title}"?`)) {
      return;
    }

    const transaction = prepareDeleteSectionTransaction({
      courseId: BigInt(courseId!),
      sectionId: BigInt(section.sectionId),
    });

    sendTransaction(transaction, {
      onSuccess: () => {
        toast.success("Section deleted");
        setTimeout(() => loadCourseData(), 2000);
      },
      onError: (error) => {
        toast.error("Failed to delete section", {
          description: error.message,
        });
      },
    });
  }

  function handleMoveSection(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;

    const transaction = prepareMoveSectionTransaction({
      courseId: BigInt(courseId!),
      fromIndex: BigInt(fromIndex),
      toIndex: BigInt(toIndex),
    });

    sendTransaction(transaction, {
      onSuccess: () => {
        toast.success("Section moved");
        setTimeout(() => loadCourseData(), 2000);
      },
      onError: (error) => {
        toast.error("Failed to move section", {
          description: error.message,
        });
      },
    });
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
            <Skeleton className="h-10 w-full" />
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
            {thumbnailPreview && (
              <div className="relative w-full h-64 rounded-lg overflow-hidden border">
                <Image
                  src={thumbnailPreview}
                  alt="Thumbnail preview"
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="flex-1"
              />
              {uploadingThumbnail && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Max 5MB. Recommended: 1200x630px
            </p>
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

        <div className="flex items-center justify-between border-t pt-6">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSending || !hasChanges}>
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Update Course
              </>
            )}
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Course Sections</CardTitle>
              <CardDescription>
                Manage your course content ({sections.length}/
                {CONTRACT_LIMITS.MAX_SECTIONS})
              </CardDescription>
            </div>
            <Button
              onClick={openAddSectionDialog}
              disabled={sections.length >= CONTRACT_LIMITS.MAX_SECTIONS}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Section
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sections yet. Add your first section to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sections.map((section, index) => (
                <div
                  key={section.id}
                  className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
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
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(section.duration)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Video className="h-3 w-3" />
                        {section.contentCID.slice(0, 8)}...
                      </span>
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
                    {index < sections.length - 1 && (
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

            {processingAsset && (
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
              disabled={uploadingVideo || processingAsset || isSending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSectionSubmit}
              disabled={
                uploadingVideo ||
                processingAsset ||
                isSending ||
                !sectionFormData.title.trim() ||
                (!editingSectionId && !videoFile)
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
