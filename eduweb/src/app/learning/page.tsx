"use client";

import { Award, BookOpen, Calendar, Clock, PlayCircle, Star, TrendingUp, Trophy, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { ContentContainer } from "@/components/PageContainer";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Import rating components
import { RatingModal } from '@/components/RatingModal';

// Import certificate modal
import { GetCertificateModal } from '@/components/GetCertificateModal';

// Import renewal modal
import RenewLicenseModal from '@/components/RenewLicenseModal';

// Import data dan tipe dari file mock-data
import {
  Course,
  getCategoryName,
  getDifficultyName,
  mockCourses,
  mockDB,
  mockUserCertificate
} from '@/lib/mock-data';

/**
 * Halaman "My Learning" yang sepenuhnya digerakkan oleh data mock.
 * UI tetap sama, hanya sumber datanya yang diubah menjadi dinamis.
 */
export default function LearningPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'in-progress' | 'history'>('in-progress');

  // Rating Modal State
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [selectedCourseForRating, setSelectedCourseForRating] = useState<Course | null>(null);

  // Certificate Modal State
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [selectedCourseForCertificate, setSelectedCourseForCertificate] = useState<{
    id: bigint;
    title: string;
    price: bigint;
  } | null>(null);

  // Renewal Modal State
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [selectedCourseForRenewal, setSelectedCourseForRenewal] = useState<{
    id: number;
    title: string;
    creatorName: string;
    pricePerMonth: bigint;
  } | null>(null);

  // Mock user address - in production, this would come from wallet connection
  const mockUserAddress = mockUserCertificate.recipientAddress;

  // =================================================================
  // LOGIKA PENGOLAHAN DATA MOCK
  // =================================================================

  const learningData = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    let totalSectionsCompleted = 0;
    let totalLearningTimeSeconds = 0;

    const processedCourses = mockCourses.map(course => {
      const license = mockDB.getLicenseForUser(course.id, mockUserCertificate.recipientAddress);
      const completedSections = course.userProgress.filter(p => p.completed).length;
      const progress = course.totalSections > 0 ? Math.round((completedSections / course.totalSections) * 100) : 0;
      const isCompleted = progress === 100;
      const isLicenseActive = license ? Number(license.expiryTimestamp) > now && license.isActive : false;

      // Hitung total waktu belajar dari sesi yang selesai
      const timeSpentSeconds = course.userProgress
        .filter(p => p.completed)
        .reduce((acc, progressItem) => {
          const section = course.sections.find(s => s.orderId === progressItem.sectionId);
          return acc + (section ? Number(section.duration) : 0);
        }, 0);

      totalSectionsCompleted += completedSections;
      totalLearningTimeSeconds += timeSpentSeconds;

      // Tentukan sesi berikutnya
      const lastCompletedOrder = Math.max(-1, ...course.userProgress.filter(p => p.completed).map(p => Number(p.sectionId)));
      const nextSection = course.sections.find(s => Number(s.orderId) === lastCompletedOrder + 1);

      return {
        id: Number(course.id),
        title: course.title,
        thumbnailCID: course.thumbnailCID,
        instructor: course.creatorName,
        progress: progress,
        totalSections: course.totalSections,
        completedSections: completedSections,
        nextSection: nextSection ? nextSection.title : "Course Completed",
        status: isCompleted ? "Completed" : (isLicenseActive ? "In Progress" : "License Expired"),
        timeSpent: timeSpentSeconds,
        category: getCategoryName(course.category),
        difficulty: getDifficultyName(course.difficulty),
        enrolledDate: new Date(Number(course.createdAt) * 1000).toISOString(),
        completedDate: isCompleted ? new Date(Number(course.userProgress.reduce((max, p) => p.completedAt > max ? p.completedAt : max, BigInt(0))) * 1000).toISOString() : null,
        certificateId: (isCompleted && mockUserCertificate.completedCourses.includes(course.id)) ? `CERT-${mockUserCertificate.tokenId}` : null,
        expiredDate: license && !isLicenseActive ? new Date(Number(license.expiryTimestamp) * 1000).toISOString() : null,
      };
    });

    const inProgressCourses = processedCourses.filter(c => c.status === "In Progress");
    const historyCourses = processedCourses.filter(c => c.status === "Completed" || c.status === "License Expired");
    const completedCoursesCount = processedCourses.filter(c => c.status === "Completed").length;

    return {
      stats: {
        totalEnrolledCourses: mockCourses.length,
        completedCourses: completedCoursesCount,
        inProgressCourses: inProgressCourses.length,
        totalSectionsCompleted: totalSectionsCompleted,
        totalLearningTime: totalLearningTimeSeconds,
      },
      inProgressCourses,
      historyCourses,
    };
  }, []);

  // =================================================================
  // HELPER & HANDLER FUNCTIONS
  // =================================================================

  const handleContinueLearning = (courseId: number) => {
    const license = mockDB.getLicenseForUser(BigInt(courseId), mockUserAddress);
    const course = mockCourses.find(c => c.id === BigInt(courseId));

    if (!license || !course) return;

    const now = Math.floor(Date.now() / 1000);
    const isLicenseActive = Number(license.expiryTimestamp) > now && license.isActive;

    if (isLicenseActive) {
    // License masih aktif - navigasi langsung ke course details
      router.push(`/learning/course-details?id=${courseId}`);
    } else {
      // License expired - tampilkan renewal modal (SCENARIO 2)
      setSelectedCourseForRenewal({
        id: courseId,
        title: course.title,
        creatorName: course.creatorName,
        pricePerMonth: course.pricePerMonth
      });
      setIsRenewalModalOpen(true);
    }
  };

  const handleViewCertificate = () => {
    // Arahkan ke halaman detail sertifikat tunggal pengguna
    router.push(`/certificates/${mockUserCertificate.tokenId}`);
  };

  // Rating Modal Handlers
  const handleOpenRatingModal = (courseId: number) => {
    const originalCourse = mockCourses.find(course => Number(course.id) === courseId);
    if (originalCourse) {
      setSelectedCourseForRating(originalCourse);
      setIsRatingModalOpen(true);
    }
  };

  const handleCloseRatingModal = () => {
    setIsRatingModalOpen(false);
    setSelectedCourseForRating(null);
  };

  const handleRatingSubmitted = () => {
    // In production, this would trigger a refetch of course ratings
    console.log('Rating submitted successfully');
  };

  // Certificate Modal Handlers
  const handleOpenCertificateModal = (courseId: number) => {
    const originalCourse = mockCourses.find(course => Number(course.id) === courseId);
    if (originalCourse) {
      setSelectedCourseForCertificate({
        id: originalCourse.id,
        title: originalCourse.title,
        price: BigInt(100000000000000), // 0.0001 ETH (0.1 Matic on Polygon)
      });
      setIsCertificateModalOpen(true);
    }
  };

  const handleCloseCertificateModal = () => {
    setIsCertificateModalOpen(false);
    setSelectedCourseForCertificate(null);
  };

  const handleCertificateSuccess = () => {
    // In production, this would trigger a refetch of certificates
    console.log('Certificate minted successfully');
    // Could also refresh learning data to show updated certificate status
  };

  // Renewal Modal Handlers
  const handleRenewLicense = async (courseId: number, duration: number) => {
    try {
      // TODO: Implement actual blockchain renewal logic
      // This should call CourseLicense.mintLicense() with payment
      console.log('Renewing license for course:', courseId, 'Duration:', duration, 'months');

      // Simulate renewal success
      alert(`License renewed successfully for ${duration} month(s)!`);

      // After successful renewal, navigate to course details
      router.push(`/learning/course-details?id=${courseId}`);
    } catch (error) {
      console.error('Renewal failed:', error);
      alert('Failed to renew license. Please try again.');
    }
  };

  const handleCloseRenewalModal = () => {
    setIsRenewalModalOpen(false);
    setSelectedCourseForRenewal(null);
  };

  const formatLearningTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // =================================================================
  // RENDER COMPONENT
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
            <div className="text-2xl font-bold">{learningData.stats.totalEnrolledCourses}</div>
            <p className="text-xs text-muted-foreground">
              Keep going!
            </p>
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
            <div className="text-2xl font-bold">{learningData.stats.completedCourses}</div>
            <p className="text-xs text-muted-foreground">
              Great achievement!
            </p>
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
            <div className="text-2xl font-bold">{learningData.stats.totalSectionsCompleted}</div>
            <p className="text-xs text-muted-foreground">
              Sections completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <span>Total Study Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatLearningTime(learningData.stats.totalLearningTime)}
            </div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>
      </div>
      <Separator />

      {/* Course Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'in-progress' | 'history')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger
            value="in-progress"
            className="flex items-center gap-2 cursor-pointer hover:bg-accent/80 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
          >
            <BookOpen className="w-4 h-4" />
            In Progress ({learningData.inProgressCourses.length})
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="flex items-center gap-2 cursor-pointer hover:bg-accent/80 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
          >
            <Trophy className="w-4 h-4" />
            History ({learningData.historyCourses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="in-progress" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {learningData.inProgressCourses.map((course) => (
              <Card key={course.id} className="group hover:shadow-lg transition-all duration-300 border border-border bg-card h-full flex flex-col">
                <CardHeader className="space-y-4">
                  <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                    <ThumbnailImage
                      cid={course.thumbnailCID}
                      alt={course.title}
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
                        {course.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {course.difficulty}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-lg leading-tight">{course.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{course.instructor}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress: {course.completedSections}/{course.totalSections} sections</span>
                      <span>{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} className="w-full" />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatLearningTime(course.timeSpent)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Started {formatDate(course.enrolledDate)}</span>
                    </div>
                  </div>
                  <div className="pt-2 mt-auto">
                    <p className="text-sm text-muted-foreground mb-3">
                      Next: {course.nextSection}
                    </p>
                    <div className="space-y-2">
                      <Button
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        onClick={() => handleContinueLearning(course.id)}
                      >
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Continue Learning
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950"
                        onClick={() => handleOpenRatingModal(course.id)}
                      >
                        <Star className="w-4 h-4 mr-2" />
                        Rate Course
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {learningData.historyCourses.map((course) => {
              const originalCourse = mockCourses.find(c => Number(c.id) === course.id);
              const license = originalCourse ? mockDB.getLicenseForUser(originalCourse.id, mockUserAddress) : null;
              const hasLicense = license !== null;
              const isCompleted = course.status === 'Completed';
              const canClaimCertificate = isCompleted && hasLicense && !course.certificateId;

              return (
              <Card key={course.id} className="group hover:shadow-lg transition-all duration-300 border border-border bg-card h-full flex flex-col">
                <CardHeader className="space-y-4">
                  <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                    <ThumbnailImage
                      cid={course.thumbnailCID}
                      alt={course.title}
                      fallback={
                        <div className={`w-full h-full ${course.status === 'Completed'
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                            : 'bg-gradient-to-br from-gray-500 to-gray-600'
                          } flex items-center justify-center`}>
                          {course.status === 'Completed' ? (
                            <Trophy className="w-12 h-12 text-white/70" />
                          ) : (
                            <Clock className="w-12 h-12 text-white/70" />
                          )}
                        </div>
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {course.category}
                      </Badge>
                      <Badge
                        variant={course.status === 'Completed' ? 'default' : 'outline'}
                        className={`text-xs ${
                          course.status === 'Completed'
                          ? 'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white'
                          : 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                        }`}
                      >
                        {course.status}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-lg leading-tight">{course.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{course.instructor}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress: {course.completedSections}/{course.totalSections} sections</span>
                        <span className={course.status === 'Completed' ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-yellow-600 dark:text-yellow-400'}>
                        {course.progress}%
                      </span>
                    </div>
                    <Progress value={course.progress} className="w-full" />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatLearningTime(course.timeSpent)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {course.status === 'Completed'
                          ? `Completed ${formatDate(course.completedDate)}`
                          : `Expired ${formatDate(course.expiredDate)}`
                        }
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 mt-auto">
                    {course.status === 'Completed' ? (
                        <div className="space-y-2">
                          {/* Certificate Status Badge */}
                          {!course.certificateId && (
                            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 mb-3">
                              <p className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                                <Award className="w-4 h-4" />
                                Certificate Available
                              </p>
                            </div>
                          )}

                          {course.certificateId && (
                            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-3">
                              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                <Award className="w-4 h-4" />
                                Certificate ID: {course.certificateId}
                              </p>
                            </div>
                          )}

                          {/* Action Buttons */}
                          {course.certificateId ? (
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => handleViewCertificate()}
                            >
                              <Award className="w-4 h-4 mr-2" />
                              View Certificate
                            </Button>
                          ) : (
                            <Button
                              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                              onClick={() => handleOpenCertificateModal(course.id)}
                            >
                              <Award className="w-4 h-4 mr-2" />
                              Get Certificate
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            className="w-full border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950"
                            onClick={() => handleOpenRatingModal(course.id)}
                          >
                            <Star className="w-4 h-4 mr-2" />
                            Rate Course
                          </Button>
                        </div>
                    ) : (
                      <>
                            <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-3 font-medium">
                          ⚠ License expired - {course.progress}% completed
                        </p>
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            className="w-full border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                            onClick={() => handleContinueLearning(course.id)}
                          >
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Renew & Continue
                          </Button>

                          <Button
                            variant="outline"
                            className="w-full border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950"
                            onClick={() => handleOpenRatingModal(course.id)}
                          >
                            <Star className="w-4 h-4 mr-2" />
                            Rate Course
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Rating Modal */}
      {selectedCourseForRating && (
        <RatingModal
          course={selectedCourseForRating}
          isOpen={isRatingModalOpen}
          onClose={handleCloseRatingModal}
          userAddress={mockUserAddress}
          onRatingSubmitted={handleRatingSubmitted}
        />
      )}

      {/* Certificate Modal */}
      {selectedCourseForCertificate && (
        <GetCertificateModal
          isOpen={isCertificateModalOpen}
          onClose={handleCloseCertificateModal}
          courseId={selectedCourseForCertificate.id}
          courseTitle={selectedCourseForCertificate.title}
          certificatePrice={selectedCourseForCertificate.price}
          onSuccess={handleCertificateSuccess}
        />
      )}

      {/* Renewal Modal */}
      {selectedCourseForRenewal && (
        <RenewLicenseModal
          isOpen={isRenewalModalOpen}
          onClose={handleCloseRenewalModal}
          courseId={selectedCourseForRenewal.id}
          courseTitle={selectedCourseForRenewal.title}
          creatorName={selectedCourseForRenewal.creatorName}
          pricePerMonth={selectedCourseForRenewal.pricePerMonth}
          onRenew={handleRenewLicense}
        />
      )}
    </ContentContainer>
  )
}
