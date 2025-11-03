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

import { RatingModal } from "@/components/RatingModal";
import { GetCertificateModal } from "@/components/GetCertificateModal";
import RenewLicenseModal from "@/components/RenewLicenseModal";

import {
  useMyLearningComplete,
  type EnrollmentData,
} from "@/hooks/useMyLearning";

export default function LearningPage() {
  const router = useRouter();
  const account = useActiveAccount();

  const {
    enrollments,
    userStats,
    isLoading,
    isError,
    error,
    actions,
    refetchAll,
  } = useMyLearningComplete(account?.address);

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

  const handleContinueLearning = (enrollment: EnrollmentData) => {
    const now = Math.floor(Date.now() / 1000);
    const isLicenseValid =
      Number(enrollment.expiryDate) > now && enrollment.isActive;

    if (isLicenseValid) {
      router.push(`/learning/course-details?id=${enrollment.courseId}`);
    } else {
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

  if (!account) {
    return (
      <ContentContainer>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <User className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground max-w-md">
            Please connect your wallet to view your learning progress and
            enrolled courses.
          </p>
        </div>
      </ContentContainer>
    );
  }

  if (isLoading) {
    return (
      <ContentContainer>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </ContentContainer>
    );
  }

  if (isError) {
    return (
      <ContentContainer>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error?.message ||
              "Failed to load learning data. Please try again."}
          </AlertDescription>
        </Alert>
      </ContentContainer>
    );
  }

  return (
    <ContentContainer>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">My Learning</h1>
            <p className="text-muted-foreground mt-2">
              Track your progress and continue your learning journey
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Courses
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userStats?.activeEnrollments || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently enrolled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completed Courses
              </CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userStats?.coursesCompleted || 0}
              </div>
              <p className="text-xs text-muted-foreground">Total completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Sections Completed
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userStats?.totalSectionsCompleted || 0}
              </div>
              <p className="text-xs text-muted-foreground">Learning progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Certificates
              </CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userStats?.hasCertificate ? 1 : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {userStats?.hasCertificate ? (
                  <Button
                    variant="link"
                    className="p-0 h-auto text-xs"
                    onClick={handleViewCertificate}
                  >
                    View Certificate
                  </Button>
                ) : (
                  "No certificate yet"
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "in-progress" | "history")}
        >
          <TabsList>
            <TabsTrigger value="in-progress">
              In Progress ({processedData.inProgress.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              History ({processedData.history.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="in-progress" className="mt-6">
            {processedData.inProgress.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No active courses yet. Browse courses to start learning!
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
                        <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                          {enrollment.course.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {enrollment.course.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={getStatusBadgeVariant(enrollment.status)}
                          >
                            {enrollment.status}
                          </Badge>
                          <Badge variant="outline">
                            {enrollment.course.category}
                          </Badge>
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
                          <span className="font-medium">
                            {enrollment.completionPercentage}%
                          </span>
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
                          {enrollment.completionPercentage === 0
                            ? "Start Learning"
                            : "Continue Learning"}
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
                        <h3 className="font-semibold text-lg line-clamp-2">
                          {enrollment.course.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {enrollment.course.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={getStatusBadgeVariant(enrollment.status)}
                          >
                            {enrollment.status}
                          </Badge>
                          {enrollment.hasCertificate && (
                            <Badge variant="secondary">
                              <Award className="w-3 h-3 mr-1" />
                              Certified
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Completion</span>
                          <span className="font-medium">
                            {enrollment.completionPercentage}%
                          </span>
                        </div>
                        <Progress
                          value={enrollment.completionPercentage}
                          className="w-full"
                        />
                      </div>

                      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Enrolled {formatDate(enrollment.purchasedAt)}
                          </span>
                        </div>
                        {enrollment.completionDate && (
                          <div className="flex items-center gap-1">
                            <Trophy className="w-4 h-4" />
                            <span>
                              Completed {formatDate(enrollment.completionDate)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1" />

                      <div className="flex flex-col gap-2">
                        {enrollment.status === "EXPIRED" && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedEnrollmentForRenewal(enrollment);
                              setIsRenewalModalOpen(true);
                            }}
                          >
                            Renew License
                          </Button>
                        )}

                        {enrollment.isCompleted && (
                          <Button
                            variant="outline"
                            onClick={() =>
                              router.push(
                                `/learning/course-details?id=${enrollment.courseId}`
                              )
                            }
                          >
                            View Course
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
      </div>

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

      {selectedEnrollmentForRenewal && (
        <RenewLicenseModal
          isOpen={isRenewalModalOpen}
          onClose={handleCloseRenewalModal}
          courseId={Number(selectedEnrollmentForRenewal.courseId)}
          courseTitle={selectedEnrollmentForRenewal.course.title}
          creatorName={selectedEnrollmentForRenewal.course.creatorName}
          pricePerMonth={BigInt(
            Math.floor(selectedEnrollmentForRenewal.course.pricePerMonth * 1e18)
          )}
          onRenew={handleRenewalSuccess}
        />
      )}
    </ContentContainer>
  );
}
