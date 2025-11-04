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
import { useActiveAccount, useReadContract } from "thirdweb/react";

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

  const contractAddresses = {
    CourseFactory: process.env.NEXT_PUBLIC_COURSE_FACTORY_ADDRESS!,
    CourseLicense: process.env.NEXT_PUBLIC_COURSE_LICENSE_ADDRESS!,
    ProgressTracker: process.env.NEXT_PUBLIC_PROGRESS_TRACKER_ADDRESS!,
    CertificateManager: process.env.NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS!,
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
    } catch {
      toast.error("Failed to copy address");
    }
  };

  const courseId = useMemo(() => {
    const id = searchParams.get("id");
    const parsed = parseInt(id || "1", 10);
    return !isNaN(parsed) && parsed > 0 ? BigInt(parsed) : BigInt(1);
  }, [searchParams]);

  const { data: sectionCompletions } = useReadContract({
    contract: progressTracker,
    method:
      "function getCourseSectionsProgress(address student, uint256 courseId) view returns (bool[] progress)",
    params: [address || "0x0", courseId] as const,
    queryOptions: {
      enabled: !!address && !!enrollmentData?.isActive,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const courseResponse = await executeQuery<{ course: CourseData }>(
          GET_COURSE_DETAILS,
          { courseId: courseId.toString() }
        );

        if (!courseResponse.course) {
          setError(`Course with ID ${courseId} not found.`);
          return;
        }

        setCourseData(courseResponse.course);

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
      } catch {
        setError("Failed to fetch course data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, address]);

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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "Intermediate":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      case "Advanced":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
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
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-5xl animate-pulse space-y-6">
          <div className="space-y-3">
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
          <div className="h-48 bg-muted rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error || !courseData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <ContentContainer>
          <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error || "Course not found"}</AlertDescription>
          </Alert>
          <div className="text-center mt-6">
            <Button variant="outline" onClick={() => router.push("/learning")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Courses
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
    <div className="min-h-screen bg-background">
      <ContentContainer>
        <div className="max-w-5xl mx-auto space-y-6 py-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/learning")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Courses
            </Button>
            <Badge variant="outline" className="gap-2">
              <BookOpen className="h-3 w-3" />
              Course #{courseId.toString()}
            </Badge>
          </div>

          {!address && (
            <Alert>
              <Wallet className="h-4 w-4" />
              <AlertTitle>Connect Wallet</AlertTitle>
              <AlertDescription>
                Connect your wallet to enroll and track progress.
              </AlertDescription>
            </Alert>
          )}

          {address && !isEnrolled && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Not Enrolled</AlertTitle>
              <AlertDescription>
                You need to purchase this course to access the content.
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => router.push(`/explore?courseId=${courseId}`)}
                >
                  Enroll Now
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {isExpired && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>License Expired</AlertTitle>
              <AlertDescription>
                Your license has expired. Renew to continue learning.
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => router.push(`/learning`)}
                >
                  Renew License
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardContent className="p-6">
              <div className="grid lg:grid-cols-[1fr_240px] gap-6">
                <div className="space-y-4">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight mb-2">
                      {courseData.title}
                    </h1>
                    <p className="text-muted-foreground leading-relaxed">
                      {courseData.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="gap-1.5">
                      <User className="h-3 w-3" />
                      {courseData.creatorName}
                    </Badge>
                    <Badge variant="outline" className="gap-1.5">
                      <Globe className="h-3 w-3" />
                      {courseData.category}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`gap-1.5 ${getDifficultyColor(
                        courseData.difficulty
                      )}`}
                    >
                      <Shield className="h-3 w-3" />
                      {courseData.difficulty}
                    </Badge>
                    <Badge variant="outline" className="gap-1.5">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      {parseFloat(courseData.averageRating).toFixed(1)} (
                      {courseData.totalRatings})
                    </Badge>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-xl font-bold">
                        {courseData.sections.length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Sections
                      </div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-xl font-bold">
                        {courseData.totalEnrollments}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Students
                      </div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-xl font-bold">
                        {parseFloat(courseData.completionRate).toFixed(0)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Completion
                      </div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-xl font-bold">
                        {courseData.priceInEth} ETH
                      </div>
                      <div className="text-xs text-muted-foreground">Price</div>
                    </div>
                  </div>
                </div>

                {courseData.thumbnailCID && (
                  <div className="relative aspect-video lg:aspect-[4/3] rounded-lg overflow-hidden border">
                    <ThumbnailImage
                      cid={courseData.thumbnailCID}
                      alt={courseData.title}
                      fallback={
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <BookOpen className="h-10 w-10 text-muted-foreground" />
                        </div>
                      }
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {isEnrolled && isLicenseActive && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
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
                  <Progress value={progressPercentage} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right">
                    {progressPercentage.toFixed(1)}% Complete
                  </p>
                </div>

                {isCourseCompleted && (
                  <Alert className="border-green-500/20 bg-green-500/10">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertTitle className="text-green-700 dark:text-green-400">
                      Course Completed!
                    </AlertTitle>
                    <AlertDescription className="text-green-600/90 dark:text-green-400/90">
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Video className="h-5 w-5" />
                Course Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sectionsWithStatus.map((section, index) => {
                  const isLocked = section.status === "locked";
                  const isCompleted = section.status === "completed";
                  const canStart =
                    section.status === "in_progress" && isLicenseActive;

                  return (
                    <div
                      key={section.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        isCompleted
                          ? "bg-green-500/5 border-green-500/20"
                          : isLocked
                          ? "bg-muted/30 border-border opacity-60"
                          : "bg-card border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${
                              isCompleted
                                ? "bg-green-500 text-white"
                                : isLocked
                                ? "bg-muted text-muted-foreground"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {isCompleted ? (
                              <Check className="h-4 w-4" />
                            ) : isLocked ? (
                              <Lock className="h-4 w-4" />
                            ) : (
                              <span>{index + 1}</span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">
                              {section.title}
                            </h3>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
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

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isCompleted && (
                            <Badge
                              variant="outline"
                              className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                            >
                              Completed
                            </Badge>
                          )}

                          {isLocked && (
                            <Badge
                              variant="outline"
                              className="bg-muted text-muted-foreground"
                            >
                              Locked
                            </Badge>
                          )}

                          {canStart && !isCompleted && (
                            <>
                              <Badge
                                variant="outline"
                                className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                              >
                                Ongoing
                              </Badge>
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                Smart Contracts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {Object.entries(contractAddresses).map(([name, address]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
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
    <div className="min-h-screen bg-background flex items-center justify-center">
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
