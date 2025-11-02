"use client";

import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  CheckCircle,
  Copy,
  Eye,
  FileText,
  Globe,
  Lock,
  PlayCircle,
  RefreshCw,
  Shield,
  Star,
  Timer,
  Trophy,
  User,
  Video,
  Wallet,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  useActiveAccount,
  useReadContract,
  useSendTransaction,
} from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { toast } from "sonner";

import { ContentContainer } from "@/components/PageContainer";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { progressTracker } from "@/lib/contracts";
import { executeQuery } from "@/lib/graphql-client";
import { GET_COURSE_DETAILS } from "@/lib/graphql-queries";

// GraphQL query for enrollment
const GET_ENROLLMENT_BY_STUDENT_COURSE = `
  query GetEnrollmentByStudentAndCourse($enrollmentId: ID!) {
    studentCourseEnrollment(id: $enrollmentId) {
      id
      student
      courseId
      enrollment {
        id
        durationMonths
        licenseExpiry
        isActive
        status
        pricePaid
        pricePaidEth
        purchasedAt
        isCompleted
        completionDate
        sectionsCompleted
      }
    }
  }
`;

type SectionStatus = "completed" | "in_progress" | "locked";

interface CourseSection {
  id: string;
  sectionId: string;
  title: string;
  contentCID: string;
  duration: string;
  orderId: string;
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
  activeEnrollments: number;
  totalRevenue: string;
  averageRating: string;
  totalRatings: number;
  completionRate: string;
  sectionsCount: number;
  createdAt: string;
  updatedAt: string;
  sections: CourseSection[];
}

interface EnrollmentData {
  id: string;
  durationMonths: string;
  licenseExpiry: string;
  isActive: boolean;
  status: string;
  pricePaid: string;
  pricePaidEth: string;
  purchasedAt: string;
  isCompleted: boolean;
  completionDate: string;
  sectionsCompleted: string;
}

interface SectionWithStatus extends CourseSection {
  status: SectionStatus;
}

function CourseDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const account = useActiveAccount();
  const address = account?.address;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(
    null
  );
  const [copiedAddress, setCopiedAddress] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const contractAddresses = {
    CourseFactory: "0x8596917Af32Ab154Ab4F48efD32Ef516D4110E72",
    CourseLicense: "0xcEcB4D9A2c051086530D614de4cF4D0f03eDd578",
    ProgressTracker: "0xf2D64246dB5E99a72e1F24e2629D590cF25b8cC2",
    CertificateManager: "0xC7a6EA3B185328A61B30c209e98c1EeC817acFf5",
  };

  const copyToClipboard = async (address: string, contractName: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(address);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = address;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedAddress(contractName);
      setTimeout(() => setCopiedAddress(""), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      alert(`Failed to copy. Please copy manually: ${address}`);
    }
  };

  const courseId = useMemo(() => {
    const id = searchParams.get("id");
    const parsed = parseInt(id || "1", 10);
    return !isNaN(parsed) && parsed > 0 ? BigInt(parsed) : BigInt(1);
  }, [searchParams]);

  // Read section completions from ProgressTracker contract
  const { data: sectionCompletions, refetch: refetchCompletions } =
    useReadContract({
      contract: progressTracker,
      method:
        "function getCourseSectionsProgress(address student, uint256 courseId) view returns (bool[] progress)",
      params: [address || "0x0", courseId] as const,
      queryOptions: {
        enabled: !!address && !!enrollmentData?.isActive,
      },
    });

  // Transaction hooks
  const { mutate: sendTransaction, isPending: isSending } =
    useSendTransaction();

  // Fetch course and enrollment data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch course from Goldsky
        const courseResponse = await executeQuery<{ course: CourseData }>(
          GET_COURSE_DETAILS,
          { courseId: courseId.toString() }
        );

        if (!courseResponse.course) {
          setError(`Course with ID ${courseId} not found.`);
          return;
        }

        setCourseData(courseResponse.course);

        // Fetch enrollment if wallet connected
        if (address) {
          const enrollmentId = `${address.toLowerCase()}-${courseId}`;
          const enrollmentResponse = await executeQuery<{
            studentCourseEnrollment: {
              enrollment: EnrollmentData;
            } | null;
          }>(GET_ENROLLMENT_BY_STUDENT_COURSE, { enrollmentId });

          if (enrollmentResponse.studentCourseEnrollment) {
            setEnrollmentData(
              enrollmentResponse.studentCourseEnrollment.enrollment
            );
          } else {
            setEnrollmentData(null);
          }
        }
      } catch (err) {
        setError("Failed to fetch course data. Please try again.");
        console.error("Course fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, address, refreshTrigger]);

  // Process sections with status
  const sectionsWithStatus = useMemo((): SectionWithStatus[] => {
    if (!courseData) return [];

    const completions = (sectionCompletions as boolean[]) || [];

    return courseData.sections.map((section, index) => {
      const isCompleted = completions[index] || false;
      const isFirstSection = index === 0;
      const prevSectionCompleted = index > 0 ? completions[index - 1] : true;

      let status: SectionStatus = "locked";

      if (isCompleted) {
        status = "completed";
      } else if (isFirstSection || prevSectionCompleted) {
        status = "in_progress";
      }

      return { ...section, status };
    });
  }, [courseData, sectionCompletions]);

  const { progressPercentage, completedSectionsCount } = useMemo(() => {
    if (!courseData)
      return { progressPercentage: 0, completedSectionsCount: 0 };

    const completions = (sectionCompletions as boolean[]) || [];
    const completedCount = completions.filter(Boolean).length;
    const percentage =
      courseData.sections.length > 0
        ? (completedCount / courseData.sections.length) * 100
        : 0;

    return {
      progressPercentage: percentage,
      completedSectionsCount: completedCount,
    };
  }, [courseData, sectionCompletions]);

  // Transaction handlers
  const handleStartSection = async (sectionId: string) => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      const tx = prepareContractCall({
        contract: progressTracker,
        method: "function startSection(uint256 courseId, uint256 sectionId)",
        params: [courseId, BigInt(sectionId)],
      });

      sendTransaction(tx, {
        onSuccess: () => {
          toast.success("Section started!");
          setTimeout(() => {
            refetchCompletions();
          }, 2000);
        },
        onError: (error) => {
          toast.error("Failed to start section");
          console.error(error);
        },
      });
    } catch (error) {
      toast.error("Failed to prepare transaction");
      console.error(error);
    }
  };

  const handleCompleteSection = async (sectionId: string) => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      const tx = prepareContractCall({
        contract: progressTracker,
        method: "function completeSection(uint256 courseId, uint256 sectionId)",
        params: [courseId, BigInt(sectionId)],
      });

      sendTransaction(tx, {
        onSuccess: () => {
          toast.success("Section completed! 🎉");
          setTimeout(() => {
            refetchCompletions();
            setRefreshTrigger((prev) => prev + 1);
          }, 2000);
        },
        onError: (error) => {
          toast.error("Failed to complete section");
          console.error(error);
        },
      });
    } catch (error) {
      toast.error("Failed to prepare transaction");
      console.error(error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-green-100 text-green-800 border-green-200";
      case "Intermediate":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Advanced":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDuration = (seconds: string): string => {
    const secs = parseInt(seconds);
    if (isNaN(secs)) return "0m";
    const minutes = Math.floor(secs / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-6">
        <div className="w-full max-w-7xl animate-pulse space-y-8">
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error || !courseData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-6">
        <ContentContainer>
          <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error || "Course not found"}</AlertDescription>
          </Alert>
          <div className="text-center mt-6">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
          </div>
        </ContentContainer>
      </div>
    );
  }

  const isEnrolled = !!enrollmentData;
  const isLicenseActive = enrollmentData?.isActive || false;
  const isExpired = enrollmentData && !isLicenseActive;
  const isCourseCompleted = enrollmentData?.isCompleted || false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <ContentContainer>
        <div className="max-w-7xl mx-auto space-y-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Badge variant="outline" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Course ID: {courseId.toString()}
            </Badge>
          </div>

          {/* Wallet Alert */}
          {!address && (
            <Alert>
              <Wallet className="h-5 w-5" />
              <AlertTitle>Connect Wallet</AlertTitle>
              <AlertDescription>
                Connect your wallet to enroll and track progress.
              </AlertDescription>
            </Alert>
          )}

          {/* Enrollment Status */}
          {address && !isEnrolled && (
            <Alert>
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>Not Enrolled</AlertTitle>
              <AlertDescription>
                You need to purchase this course to access the content.
                <Button
                  className="mt-4"
                  onClick={() => router.push(`/explore?courseId=${courseId}`)}
                >
                  Enroll Now
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {isExpired && (
            <Alert variant="destructive">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>License Expired</AlertTitle>
              <AlertDescription>
                Your license has expired. Renew to continue learning.
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push(`/learning`)}
                >
                  Renew License
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Course Header */}
          <Card className="border-2">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-[1fr,300px] gap-8">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-3xl font-bold mb-2">
                        {courseData.title}
                      </h1>
                      <p className="text-muted-foreground text-lg">
                        {courseData.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Badge variant="outline" className="gap-2">
                      <User className="h-3 w-3" />
                      {courseData.creatorName}
                    </Badge>
                    <Badge variant="outline" className="gap-2">
                      <Globe className="h-3 w-3" />
                      {courseData.category}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`gap-2 ${getDifficultyColor(
                        courseData.difficulty
                      )}`}
                    >
                      <Shield className="h-3 w-3" />
                      {courseData.difficulty}
                    </Badge>
                    <Badge variant="outline" className="gap-2">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {parseFloat(courseData.averageRating).toFixed(1)} (
                      {courseData.totalRatings})
                    </Badge>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-secondary/50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {courseData.sections.length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Sections
                      </div>
                    </div>
                    <div className="text-center p-3 bg-secondary/50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {courseData.totalEnrollments}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Students
                      </div>
                    </div>
                    <div className="text-center p-3 bg-secondary/50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {parseFloat(courseData.completionRate).toFixed(0)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Completion
                      </div>
                    </div>
                    <div className="text-center p-3 bg-secondary/50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {courseData.priceInEth} ETH
                      </div>
                      <div className="text-xs text-muted-foreground">Price</div>
                    </div>
                  </div>
                </div>

                {courseData.thumbnailCID && (
                  <div className="relative aspect-video rounded-lg overflow-hidden border-2">
                    <ThumbnailImage
                      cid={courseData.thumbnailCID}
                      alt={courseData.title}
                      fallback={
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-white/70" />
                        </div>
                      }
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress Card */}
          {isEnrolled && isLicenseActive && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Your Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Completed Sections
                    </span>
                    <span className="font-semibold">
                      {completedSectionsCount} / {courseData.sections.length}
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-3" />
                  <p className="text-xs text-muted-foreground text-right">
                    {progressPercentage.toFixed(1)}% Complete
                  </p>
                </div>

                {isCourseCompleted && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <AlertTitle className="text-green-800">
                      Course Completed!
                    </AlertTitle>
                    <AlertDescription className="text-green-700">
                      Congratulations! You can now add this to your certificate.
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => router.push("/certificates")}
                      >
                        <Award className="mr-2 h-4 w-4" />
                        Get Certificate
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Course Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sectionsWithStatus.map((section, index) => {
                  const isLocked = section.status === "locked";
                  const isCompleted = section.status === "completed";
                  const canStart =
                    section.status === "in_progress" && isLicenseActive;

                  return (
                    <div
                      key={section.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isCompleted
                          ? "bg-green-50 border-green-200"
                          : isLocked
                          ? "bg-gray-50 border-gray-200 opacity-60"
                          : "bg-white border-primary/20 hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div
                            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                              isCompleted
                                ? "bg-green-500 text-white"
                                : isLocked
                                ? "bg-gray-300 text-gray-500"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {isCompleted ? (
                              <Check className="h-5 w-5" />
                            ) : isLocked ? (
                              <Lock className="h-5 w-5" />
                            ) : (
                              <span className="font-semibold">{index + 1}</span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base truncate">
                              {section.title}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Timer className="h-3 w-3" />
                                {formatDuration(section.duration)}
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                Section {section.orderId}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isCompleted && (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200"
                            >
                              Completed
                            </Badge>
                          )}

                          {isLocked && (
                            <Badge
                              variant="outline"
                              className="bg-gray-50 text-gray-500"
                            >
                              Locked
                            </Badge>
                          )}

                          {canStart && !isCompleted && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  router.push(
                                    `/learning/section?courseId=${courseId}&sectionId=${section.orderId}`
                                  )
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Watch
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleStartSection(section.sectionId)
                                }
                                disabled={isSending}
                              >
                                <PlayCircle className="mr-2 h-4 w-4" />
                                Start
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleCompleteSection(section.sectionId)
                                }
                                disabled={isSending}
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Complete
                              </Button>
                            </>
                          )}

                          {isCompleted && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                router.push(
                                  `/learning/section?courseId=${courseId}&sectionId=${section.orderId}`
                                )
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Review
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Contract Addresses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Smart Contracts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {Object.entries(contractAddresses).map(([name, address]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="font-medium text-sm">{name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-muted-foreground font-mono">
                        {address.slice(0, 6)}...{address.slice(-4)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(address, name)}
                        className="h-8 w-8 p-0"
                      >
                        {copiedAddress === name ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ContentContainer>
    </div>
  );
}

function CourseDetailsLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Loading course details...</p>
      </div>
    </div>
  );
}

export default function CourseDetailsPage() {
  return (
    <Suspense fallback={<CourseDetailsLoading />}>
      <CourseDetailsContent />
    </Suspense>
  );
}
