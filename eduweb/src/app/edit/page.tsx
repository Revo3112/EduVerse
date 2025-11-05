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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { prepareUpdateCourseTransaction } from "@/services/courseContract.service";
import { executeQuery } from "@/lib/graphql-client";
import { GET_COURSE_DETAILS } from "@/lib/graphql-queries";
import { ArrowLeft, Loader2, Save, AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import Image from "next/image";

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
  sectionsCount: string;
  totalEnrollments: string;
  activeEnrollments: string;
  totalRevenue: string;
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
const MIN_PRICE_ETH = 0.000001;

const CONTRACT_LIMITS = {
  TITLE_MAX: 200,
  DESCRIPTION_MAX: 2000,
  CREATOR_NAME_MAX: 100,
  MAX_PRICE_ETH: 1,
};

function EditCourseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeAccount = useActiveAccount();
  const { mutate: sendTransaction, isPending: isSending } =
    useSendTransaction();

  const [loading, setLoading] = useState(true);
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

    loadCourseData();
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
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File too large (max 5MB)");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Invalid file type");
        return;
      }
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
        setHasChanges(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadThumbnail = async (): Promise<string> => {
    if (!thumbnailFile) {
      return formData.thumbnailCID;
    }

    setUploadingThumbnail(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", thumbnailFile);

      const response = await fetch("/api/upload-thumbnail", {
        method: "POST",
        body: formDataUpload,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      return data.cid;
    } catch {
      throw new Error("Failed to upload thumbnail");
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.length > CONTRACT_LIMITS.TITLE_MAX) {
      newErrors.title = `Title too long (max ${CONTRACT_LIMITS.TITLE_MAX} chars)`;
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.length > CONTRACT_LIMITS.DESCRIPTION_MAX) {
      newErrors.description = `Description too long (max ${CONTRACT_LIMITS.DESCRIPTION_MAX} chars)`;
    }

    if (!formData.creatorName.trim()) {
      newErrors.creatorName = "Creator name is required";
    } else if (formData.creatorName.length > CONTRACT_LIMITS.CREATOR_NAME_MAX) {
      newErrors.creatorName = `Creator name too long (max ${CONTRACT_LIMITS.CREATOR_NAME_MAX} chars)`;
    }

    if (!formData.category) {
      newErrors.category = "Category is required";
    }

    if (!formData.difficulty) {
      newErrors.difficulty = "Difficulty is required";
    }

    const price = parseFloat(formData.pricePerMonth);
    if (isNaN(price) || price <= 0) {
      newErrors.pricePerMonth = "Price must be greater than 0";
    } else if (price > CONTRACT_LIMITS.MAX_PRICE_ETH) {
      newErrors.pricePerMonth = `Price too high (max ${CONTRACT_LIMITS.MAX_PRICE_ETH} ETH)`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 space-y-6">
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
      <div className="container max-w-4xl mx-auto py-8">
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
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Course</h1>
            <p className="text-muted-foreground">
              Update your course information
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
    </div>
  );
}

function EditCourseLoading() {
  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
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

export default function EditCoursePage() {
  return (
    <Suspense fallback={<EditCourseLoading />}>
      <EditCourseContent />
    </Suspense>
  );
}
