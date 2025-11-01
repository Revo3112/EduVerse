"use client";

import {
  Award,
  BookOpen,
  Calendar,
  PlayCircle,
  Star,
  TrendingUp,
  Trophy,
  User,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useActiveAccount } from "thirdweb/react";

import { ContentContainer } from "@/components/PageContainer";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

// Import modals
import { RatingModal } from "@/components/RatingModal";
import { GetCertificateModal } from "@/components/GetCertificateModal";
import RenewLicenseModal from "@/components/RenewLicenseModal";

// Import integrated hooks
import {
  useMyLearningComplete,
  type EnrollmentData,
} from "@/hooks/useMyLearning";

/**
 * ============================================================================
 * MY LEARNING PAGE - PRODUCTION READY
 * ============================================================================
 *
 * Architecture:
 * - READ: Goldsky GraphQL for fast, cached enrollment data
 * - WRITE: Thirdweb for on-chain transactions (certificate, rating, renewal)
 *
 * Features:
 * ✅ Real-time enrollment data from Goldsky
 * ✅ Certificate minting via CertificateManager contract
 * ✅ Course rating via CourseFactory contract
 * ✅ License renewal via CourseLicense contract
 * ✅ Progress tracking integration
 * ✅ Automatic data refresh after transactions
 *
 * ============================================================================
 */
export default function LearningPage() {
  const router = useRouter();
  const account = useActiveAccount();

  // Fetch all learning data with integrated actions
  const {
    enrollments,
    userStats,
    certificates,
    isLoading,
    isError,
    error,
    actions,
    refetchAll,
  } = useMyLearningComplete(account?.address);

  // UI state for modals
  const [activeTab, setActiveTab] = useState<"in-progress" | "history">(
    "in-progress"
  );
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [selectedEnrollmentForRating, setSelectedEnrollmentForRating] =
    useState<EnrollmentData | null>(null);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [
    selectedEnrollmentForCertificate,
    setSelectedEnrollmentForCertificate,
  ] = useState<EnrollmentData | null>(null);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [selectedEnrollmentForRenewal, setSelectedEnrollmentForRenewal] =
    useState<EnrollmentData | null>(null);

  // =================================================================
  // DATA PROCESSING
  // =================================================================

  const processedData = useMemo(() => {
    if (!enrollments) return { inProgress: [], history: [] };

    const inProgress = enrollments.filter(
      (e) => e.isActive && !e.isCompleted && e.status === "ACTIVE"
    );

    const history = enrollments.filter(
      (e) => e.isCompleted || e.status === "EXPIRED" || e.status === "COMPLETED"
    );

    return { inProgress, history };
  }, [enrollments]);

  // =================================================================
  // HANDLERS
  // =================================================================

  const handleContinueLearning = (enrollment: EnrollmentData) => {
    const now = Math.floor(Date.now() / 1000);
    const isLicenseValid =
      Number(enrollment.expiryDate) > now && enrollment.isActive;

    if (isLicenseValid) {
      // License active - navigate to course details
      router.push(`/learning/course-details?id=${enrollment.courseId}`);
    } else {
      // License expired - show renewal modal
      setSelectedEnrollmentForRenewal(enrollment);
      setIsRenewalModalOpen(true);
    }
  };

  const handleViewCertificate = () => {
    if (
      userStats?.hasCertificate &&
      userStats.certificateTokenId &&
      Number(userStats.certificateTokenId) > 0
    ) {
      router.push(`/certificates/${userStats.certificateTokenId}`);
    }
  };

  // Rating Modal Handlers
  const handleOpenRatingModal = (enrollment: EnrollmentData) => {
    setSelectedEnrollmentForRating(enrollment);
    setIsRatingModalOpen(true);
  };

  const transformCourseDataToCourse = (courseData: {
    id: string;
    title: string;
    description: string;
    thumbnailCID: string;
    creator: string;
    creatorName: string;
    category: string;
    difficulty: string;
    pricePerMonth: number;
    totalSections: number;
    totalDuration: number;
    totalEnrollments: number;
    activeEnrollments: number;
    completedStudents: number;
    totalRevenue: number;
    averageRating: number;
    totalRatings: number;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) => {
    return {
      id: BigInt(courseData.id),
      title: courseData.title,
      description: courseData.description,
      thumbnailCID: courseData.thumbnailCID,
      creator: courseData.creator as `0x${string}`,
      creatorName: courseData.creatorName,
      category: parseInt(courseData.category),
      difficulty: parseInt(courseData.difficulty),
      pricePerMonth: BigInt(Math.floor(courseData.pricePerMonth * 1e18)),
      totalSections: courseData.totalSections,
      totalDuration: BigInt(courseData.totalDuration),
      totalEnrollments: BigInt(courseData.totalEnrollments),
      activeEnrollments: BigInt(courseData.activeEnrollments),
      completedStudents: BigInt(courseData.completedStudents),
      totalRevenue: BigInt(Math.floor(courseData.totalRevenue * 1e18)),
      averageRating: courseData.averageRating,
      totalRatings: courseData.totalRatings,
      isActive: courseData.isActive,
      isDeleted: courseData.isDeleted,
      createdAt: BigInt(Math.floor(courseData.createdAt.getTime() / 1000)),
      updatedAt: BigInt(Math.floor(courseData.updatedAt.getTime() / 1000)),
    };
  };

  const handleCloseRatingModal = () => {
    setIsRatingModalOpen(false);
    setSelectedEnrollmentForRating(null);
  };

  const handleRatingSubmitted = async () => {
    await refetchAll();
  };

  // Certificate Modal Handlers
  const handleOpenCertificateModal = (enrollment: EnrollmentData) => {
    setSelectedEnrollmentForCertificate(enrollment);
    setIsCertificateModalOpen(true);
  };

  const handleCloseCertificateModal = () => {
    setIsCertificateModalOpen(false);
    setSelectedEnrollmentForCertificate(null);
  };

  const handleCertificateSuccess = async () => {
    await refetchAll();
  };

  // Renewal Modal Handlers
  const handleCloseRenewalModal = () => {
    setIsRenewalModalOpen(false);
    setSelectedEnrollmentForRenewal(null);
  };

  const handleRenewalSuccess = async () => {
    await refetchAll();
    setIsRenewalModalOpen(false);
    if (selectedEnrollmentForRenewal) {
      router.push(
        `/learning/course-details?id=${selectedEnrollmentForRenewal.courseId}`
      );
    }
  };

  // =================================================================
  // UTILITY FUNCTIONS
  // =================================================================

  const formatDate = (date: Date | number | null | undefined): string => {
    if (!date) return "";
    const dateObj = date instanceof Date ? date : new Date(Number(date) * 1000);
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadgeVariant = (
    status: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "COMPLETED":
        return "secondary";
      case "EXPIRED":
        return "destructive";
      default:
        return "outline";
    }
  };

  // =================================================================
  // LOADING STATE
  // =================================================================

  if (isLoading) {
    return (
      <ContentContainer className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="aspect-video w-full rounded-md" />
                <Skeleton className="h-6 w-3/4 mt-4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-2 w-full mb-4" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </ContentContainer>
    );
  }

  // =================================================================
  // ERROR STATE
  // =================================================================

  if (isError) {
    return (
      <ContentContainer className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load learning data: {error?.message || "Unknown error"}
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetchAll()}>Retry</Button>
      </ContentContainer>
    );
  }

  // =================================================================
  // WALLET CONNECTION CHECK
  // =================================================================

  if (!account?.address) {
    return (
      <ContentContainer className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please connect your wallet to view your learning progress.
          </AlertDescription>
        </Alert>
      </ContentContainer>
    );
  }

  // =================================================================
  // MAIN RENDER
  // =================================================================

  return (
    <ContentContainer className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">My Learning</h1>
          <p className="text-muted-foreground">
            Track your progress and continue your Web3 education journey
          </p>
        </div>
      </div>

      {/* Learning Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Enrolled Courses</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats?.coursesEnrolled || 0}
            </div>
            <p className="text-xs text-muted-foreground">Keep going!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-yellow-600" />
              <span>Courses Completed</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats?.coursesCompleted || 0}
            </div>
            <p className="text-xs text-muted-foreground">Great achievement!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span>Sections Done</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats?.totalSectionsCompleted || 0}
            </div>
            <p className="text-xs text-muted-foreground">Sections completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <Award className="w-4 h-4 text-purple-600" />
              <span>Certificates</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {certificates?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {userStats?.hasCertificate ? (
                <button
                  onClick={handleViewCertificate}
                  className="text-primary hover:underline"
                >
                  View Certificate
                </button>
              ) : (
                "Complete courses to earn"
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Course Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as "in-progress" | "history")
        }
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="in-progress" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            In Progress ({processedData.inProgress.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            History ({processedData.history.length})
          </TabsTrigger>
        </TabsList>

        {/* In Progress Tab */}
        <TabsContent value="in-progress" className="mt-6">
          {processedData.inProgress.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You don&apos;t have any courses in progress. Browse courses to
                get started!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {processedData.inProgress.map((enrollment) => (
                <Card
                  key={enrollment.id}
                  className="group hover:shadow-lg transition-all duration-300 h-full flex flex-col"
                >
                  <CardHeader className="space-y-4">
                    <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                      <ThumbnailImage
                        cid={enrollment.course.thumbnailCID}
                        alt={enrollment.course.title}
                        fallback={
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <BookOpen className="w-12 h-12 text-white/70" />
                          </div>
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {enrollment.course.category}
                        </Badge>
                        <Badge
                          variant={getStatusBadgeVariant(enrollment.status)}
                          className="text-xs"
                        >
                          {enrollment.status}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-lg leading-tight">
                        {enrollment.course.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{enrollment.course.creatorName}</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>
                          Progress: {enrollment.sectionsCompleted}/
                          {enrollment.totalSections} sections
                        </span>
                        <span>{enrollment.completionPercentage}%</span>
                      </div>
                      <Progress
                        value={enrollment.completionPercentage}
                        className="w-full"
                      />
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Started {formatDate(enrollment.purchasedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1" />

                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => handleContinueLearning(enrollment)}
                      >
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Continue Learning
                      </Button>
                    </div>

                    {enrollment.isCompleted && !enrollment.hasCertificate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenCertificateModal(enrollment)}
                        disabled={actions.isMintingCertificate}
                      >
                        <Award className="w-4 h-4 mr-2" />
                        {actions.isMintingCertificate
                          ? "Minting..."
                          : "Get Certificate"}
                      </Button>
                    )}

                    {enrollment.isCompleted && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRatingModal(enrollment)}
                        disabled={actions.isSubmittingRating}
                      >
                        <Star className="w-4 h-4 mr-2" />
                        {actions.isSubmittingRating
                          ? "Submitting..."
                          : "Rate Course"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          {processedData.history.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No completed or expired courses yet.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {processedData.history.map((enrollment) => (
                <Card
                  key={enrollment.id}
                  className="group hover:shadow-lg transition-all duration-300 h-full flex flex-col"
                >
                  <CardHeader className="space-y-4">
                    <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                      <ThumbnailImage
                        cid={enrollment.course.thumbnailCID}
                        alt={enrollment.course.title}
                        fallback={
                          <div className="w-full h-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
                            <BookOpen className="w-12 h-12 text-white/70" />
                          </div>
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {enrollment.course.category}
                        </Badge>
                        <Badge
                          variant={getStatusBadgeVariant(enrollment.status)}
                          className="text-xs"
                        >
                          {enrollment.status}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-lg leading-tight">
                        {enrollment.course.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{enrollment.course.creatorName}</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col space-y-4">
                    {enrollment.isCompleted && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <Trophy className="w-4 h-4" />
                          <span className="font-medium">
                            Completed on {formatDate(enrollment.completionDate)}
                          </span>
                        </div>
                        {enrollment.hasCertificate && (
                          <div className="flex items-center gap-2 text-sm text-purple-600">
                            <Award className="w-4 h-4" />
                            <span>Certificate Earned</span>
                          </div>
                        )}
                      </div>
                    )}

                    {enrollment.status === "EXPIRED" && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          License expired on {formatDate(enrollment.expiryDate)}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex-1" />

                    <div className="flex flex-col gap-2">
                      {enrollment.status === "EXPIRED" && (
                        <Button
                          variant="default"
                          onClick={() => {
                            setSelectedEnrollmentForRenewal(enrollment);
                            setIsRenewalModalOpen(true);
                          }}
                        >
                          Renew License
                        </Button>
                      )}

                      {enrollment.isCompleted && !enrollment.hasCertificate && (
                        <Button
                          variant="outline"
                          onClick={() => handleOpenCertificateModal(enrollment)}
                          disabled={actions.isMintingCertificate}
                        >
                          <Award className="w-4 h-4 mr-2" />
                          {actions.isMintingCertificate
                            ? "Minting..."
                            : "Get Certificate"}
                        </Button>
                      )}

                      {enrollment.hasCertificate && (
                        <Button
                          variant="outline"
                          onClick={handleViewCertificate}
                        >
                          <Award className="w-4 h-4 mr-2" />
                          View Certificate
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Rating Modal */}
      {selectedEnrollmentForRating && (
        <RatingModal
          isOpen={isRatingModalOpen}
          onClose={handleCloseRatingModal}
          course={transformCourseDataToCourse(
            selectedEnrollmentForRating.course
          )}
          userAddress={account?.address}
          onRatingSubmitted={handleRatingSubmitted}
        />
      )}

      {/* Certificate Modal */}
      {selectedEnrollmentForCertificate && (
        <GetCertificateModal
          isOpen={isCertificateModalOpen}
          onClose={handleCloseCertificateModal}
          courseId={BigInt(selectedEnrollmentForCertificate.courseId)}
          courseTitle={selectedEnrollmentForCertificate.course.title}
          certificatePrice={BigInt(0)}
          onSuccess={handleCertificateSuccess}
        />
      )}

      {/* Renewal Modal */}
      {selectedEnrollmentForRenewal && (
        <RenewLicenseModal
          isOpen={isRenewalModalOpen}
          onClose={handleCloseRenewalModal}
          courseId={Number(selectedEnrollmentForRenewal.courseId)}
          courseTitle={selectedEnrollmentForRenewal.course.title}
          creatorName={selectedEnrollmentForRenewal.course.creatorName}
          pricePerMonth={BigInt(
            selectedEnrollmentForRenewal.course.pricePerMonth
          )}
          onRenew={async () => {
            await handleRenewalSuccess();
          }}
        />
      )}
    </ContentContainer>
  );
}
