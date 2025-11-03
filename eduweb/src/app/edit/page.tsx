"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  getCourseDetails,
  enumToCategory,
  enumToDifficulty,
} from "@/services/courseContract.service";
import { prepareUpdateCourseTransaction } from "@/services/courseContract.service";
import { ArrowLeft, Loader2, Save, X, AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { waitForReceipt } from "thirdweb";
import Image from "next/image";

interface CourseData {
  title: string;
  description: string;
  thumbnailCID: string;
  creator: string;
  creatorName: string;
  pricePerMonth: bigint;
  category: string;
  difficulty: string;
  isActive: boolean;
  totalRevenue: bigint;
  createdAt: bigint;
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

const COURSE_CATEGORIES = [
  { value: "Programming", label: "Programming", icon: "💻" },
  { value: "Design", label: "Design", icon: "🎨" },
  { value: "Business", label: "Business", icon: "💼" },
  { value: "Marketing", label: "Marketing", icon: "📱" },
  { value: "DataScience", label: "Data Science", icon: "📊" },
  { value: "Finance", label: "Finance", icon: "💰" },
  { value: "Healthcare", label: "Healthcare", icon: "⚕️" },
  { value: "Language", label: "Language", icon: "🗣️" },
  { value: "Arts", label: "Arts", icon: "🎭" },
  { value: "Mathematics", label: "Mathematics", icon: "🔢" },
  { value: "Science", label: "Science", icon: "🔬" },
  { value: "Engineering", label: "Engineering", icon: "⚙️" },
  { value: "Technology", label: "Technology", icon: "📱" },
  { value: "Education", label: "Education", icon: "📚" },
  { value: "Psychology", label: "Psychology", icon: "🧠" },
  { value: "Culinary", label: "Culinary", icon: "🍳" },
  { value: "PersonalDevelopment", label: "Personal Development", icon: "🌱" },
  { value: "Legal", label: "Legal", icon: "⚖️" },
  { value: "Sports", label: "Sports", icon: "⚽" },
  { value: "Other", label: "Other", icon: "📦" },
];

const COURSE_DIFFICULTIES = [
  { value: "Beginner", label: "Beginner", icon: "🌱" },
  { value: "Intermediate", label: "Intermediate", icon: "🌿" },
  { value: "Advanced", label: "Advanced", icon: "🌳" },
];

const MAX_PRICE_ETH = 1.0;

export default function EditCoursePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeAccount = useActiveAccount();
  const { mutate: sendTransaction } = useSendTransaction();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    thumbnailCID: "",
    creatorName: "",
    pricePerMonth: "",
    category: "",
    difficulty: "",
    isActive: true,
  });

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const courseId = searchParams.get("courseId");

  useEffect(() => {
    async function loadCourseData() {
      if (!courseId) {
        toast.error("Missing course ID", {
          description: "No course ID provided in URL",
        });
        router.push("/myCourse");
        return;
      }

      try {
        setLoading(true);

        const course = await getCourseDetails(BigInt(courseId));

        if (!course) {
          toast.error("Course not found", {
            description: "The requested course does not exist",
          });
          router.push("/myCourse");
          return;
        }

        if (
          activeAccount?.address &&
          course.creator.toLowerCase() === activeAccount.address.toLowerCase()
        ) {
          setIsAuthorized(true);

          const priceInEth = (Number(course.pricePerMonth) / 1e18).toFixed(6);
          const categoryStr = enumToCategory(course.category);
          const difficultyStr = enumToDifficulty(course.difficulty);

          setCourseData({
            title: course.title,
            description: course.description,
            thumbnailCID: course.thumbnailCID,
            creator: course.creator,
            creatorName: course.creatorName,
            pricePerMonth: course.pricePerMonth,
            category: categoryStr,
            difficulty: difficultyStr,
            isActive: course.isActive,
            totalRevenue: course.totalRevenue,
            createdAt: course.createdAt,
          });

          setFormData({
            title: course.title,
            description: course.description,
            thumbnailCID: course.thumbnailCID,
            creatorName: course.creatorName,
            pricePerMonth: priceInEth,
            category: categoryStr,
            difficulty: difficultyStr,
            isActive: course.isActive,
          });
        } else {
          toast.error("Unauthorized", {
            description: "You are not authorized to edit this course",
          });
          router.push("/myCourse");
          return;
        }
      } catch (error) {
        console.error("Failed to load course:", error);
        toast.error("Failed to load course", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        router.push("/myCourse");
      } finally {
        setLoading(false);
      }
    }

    if (activeAccount?.address) {
      loadCourseData();
    }
  }, [courseId, activeAccount?.address, router]);

  const handleInputChange = (
    field: keyof FormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file type", {
        description: "Please select an image file",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Maximum file size is 10MB",
      });
      return;
    }

    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
    setHasChanges(true);
  };

  const uploadThumbnailToPinata = async (): Promise<string | null> => {
    if (!thumbnailFile) return null;

    try {
      setUploadingThumbnail(true);

      const formData = new FormData();
      formData.append("file", thumbnailFile);

      const response = await fetch("/api/upload/pinata", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();
      return data.cid;
    } catch (error) {
      console.error("Thumbnail upload failed:", error);
      toast.error("Failed to upload thumbnail", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.length > 200) {
      newErrors.title = "Title must be less than 200 characters";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.length > 1000) {
      newErrors.description = "Description must be less than 1000 characters";
    }

    if (!formData.creatorName.trim()) {
      newErrors.creatorName = "Creator name is required";
    } else if (formData.creatorName.length > 100) {
      newErrors.creatorName = "Creator name must be less than 100 characters";
    }

    const price = parseFloat(formData.pricePerMonth);
    if (isNaN(price) || price <= 0) {
      newErrors.pricePerMonth = "Price must be greater than 0";
    } else if (price > MAX_PRICE_ETH) {
      newErrors.pricePerMonth = `Price cannot exceed ${MAX_PRICE_ETH} ETH`;
    }

    if (!formData.category) {
      newErrors.category = "Category is required";
    }

    if (!formData.difficulty) {
      newErrors.difficulty = "Difficulty is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Validation failed", {
        description: "Please fix the errors in the form",
      });
      return;
    }

    if (!hasChanges) {
      toast.info("No changes detected", {
        description: "Make changes before saving",
      });
      return;
    }

    try {
      setSaving(true);

      let thumbnailCID = formData.thumbnailCID;

      if (thumbnailFile) {
        toast.info("Uploading thumbnail...");
        const uploadedCID = await uploadThumbnailToPinata();
        if (!uploadedCID) {
          throw new Error("Failed to upload thumbnail");
        }
        thumbnailCID = uploadedCID;
        toast.success("Thumbnail uploaded successfully");
      }

      toast.info("Preparing transaction...");

      const transaction = prepareUpdateCourseTransaction({
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

      toast.info("Sending transaction...");

      sendTransaction(transaction, {
        onSuccess: async (result) => {
          toast.info("Waiting for confirmation...");

          try {
            const receipt = await waitForReceipt(result);

            if (receipt.status === "success") {
              toast.success("Course updated successfully!", {
                description: "Your changes have been saved to the blockchain",
              });

              setHasChanges(false);
              setThumbnailFile(null);
              setThumbnailPreview(null);

              setTimeout(() => {
                router.push("/myCourse");
              }, 1500);
            } else {
              throw new Error("Transaction failed");
            }
          } catch (error) {
            console.error("Receipt error:", error);
            toast.error("Transaction failed", {
              description:
                error instanceof Error ? error.message : "Unknown error",
            });
          }
        },
        onError: (error) => {
          console.error("Transaction error:", error);
          toast.error("Transaction failed", {
            description: error.message || "Failed to update course",
          });
        },
      });
    } catch (error) {
      console.error("Update course error:", error);
      toast.error("Failed to update course", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading course data...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized || !courseData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push("/myCourse")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Courses
          </Button>

          <div>
            <h1 className="text-3xl font-bold text-foreground">Edit Course</h1>
            <p className="text-muted-foreground mt-2">
              Update your course details and settings
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Course Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="title">
                  Course Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="e.g., Complete Web3 Development Course"
                  maxLength={200}
                  className={errors.title ? "border-red-500" : ""}
                />
                {errors.title && (
                  <p className="text-sm text-red-500 mt-1">{errors.title}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  {formData.title.length}/200 characters
                </p>
              </div>

              <div>
                <Label htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Describe what students will learn in this course..."
                  rows={5}
                  maxLength={1000}
                  className={errors.description ? "border-red-500" : ""}
                />
                {errors.description && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.description}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  {formData.description.length}/1000 characters
                </p>
              </div>

              <div>
                <Label htmlFor="creatorName">
                  Instructor Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="creatorName"
                  value={formData.creatorName}
                  onChange={(e) =>
                    handleInputChange("creatorName", e.target.value)
                  }
                  placeholder="Your name as it will appear to students"
                  maxLength={100}
                  className={errors.creatorName ? "border-red-500" : ""}
                />
                {errors.creatorName && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.creatorName}
                  </p>
                )}
              </div>

              <div>
                <Label>
                  Course Thumbnail <span className="text-red-500">*</span>
                </Label>
                <div className="mt-2">
                  {(thumbnailPreview || formData.thumbnailCID) && (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-4 border">
                      <Image
                        src={
                          thumbnailPreview ||
                          `https://copper-far-firefly-220.mypinata.cloud/ipfs/${formData.thumbnailCID}`
                        }
                        alt="Thumbnail preview"
                        fill
                        className="object-cover"
                      />
                      {thumbnailPreview && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setThumbnailFile(null);
                            setThumbnailPreview(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
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
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload a new thumbnail to replace the current one (max 10MB)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="category">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      handleInputChange("category", value)
                    }
                  >
                    <SelectTrigger
                      className={errors.category ? "border-red-500" : ""}
                    >
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
                    <p className="text-sm text-red-500 mt-1">
                      {errors.category}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="difficulty">
                    Difficulty <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value) =>
                      handleInputChange("difficulty", value)
                    }
                  >
                    <SelectTrigger
                      className={errors.difficulty ? "border-red-500" : ""}
                    >
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
                    <p className="text-sm text-red-500 mt-1">
                      {errors.difficulty}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="pricePerMonth">
                  Price per Month (ETH) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pricePerMonth"
                  type="number"
                  step="0.000001"
                  min="0.000001"
                  max={MAX_PRICE_ETH}
                  value={formData.pricePerMonth}
                  onChange={(e) =>
                    handleInputChange("pricePerMonth", e.target.value)
                  }
                  placeholder="0.01"
                  className={errors.pricePerMonth ? "border-red-500" : ""}
                />
                {errors.pricePerMonth && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.pricePerMonth}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  Maximum: {MAX_PRICE_ETH} ETH
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    handleInputChange("isActive", e.target.checked)
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Course is active (visible to students)
                </Label>
              </div>
            </CardContent>
          </Card>

          <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 mb-6">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">
                  Section Management
                </h4>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                  To add, edit, or delete course sections, please use the
                  section management interface from the course details page.
                  This page focuses on updating course metadata and settings.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/myCourse")}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !hasChanges}
              className="flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
