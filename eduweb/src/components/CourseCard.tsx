import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Rating, RatingButton } from "@/components/ui/rating";
import { useCourseRating } from "@/hooks/useRating";
import { Users, CheckCircle2 } from "lucide-react";

import {
  Course,
  getCategoryName as getMockCategoryName,
  getDifficultyName as getMockDifficultyName,
  weiToEth,
} from "@/lib/mock-data";
import { formatRatingDisplay } from "@/lib/rating-utils";
import { BookOpen, Clock, ImageIcon, Loader2, Star } from "lucide-react";

import Image from "next/image";
import { memo, useCallback, useMemo, useState } from "react";
import type { CourseBrowseData } from "@/services/goldsky-courses.service";
import { useThumbnailUrl } from "@/hooks/useThumbnailUrl";
import { useLicense } from "@/hooks/useLicense";
import EnrollModal from "@/components/EnrollModal";

/**
 * CourseCard Component
 *
 * A reusable component to display course information in a card format.
 * Built with Shadcn UI components following the design system.
 *
 * @param course - Course object containing all course details from CourseFactory contract
 */

// Support both mock data and Goldsky data
type CourseData = Course | CourseBrowseData;

interface CourseCardProps {
  course: CourseData;
  onEnroll?: (courseId: bigint, duration: number) => void;
}

// Type guard to check if course is from Goldsky
function isGoldskyCourse(course: CourseData): course is CourseBrowseData {
  return "categoryName" in course && "difficultyName" in course;
}

// Normalize course data to common format
function normalizeCourse(course: CourseData) {
  if (isGoldskyCourse(course)) {
    return {
      id: BigInt(course.id),
      title: course.title,
      description: course.description,
      thumbnailCID: course.thumbnailCID,
      creator: course.creator,
      creatorName: course.creatorName, // Use creator name from Goldsky
      category: course.category,
      categoryName: course.categoryName,
      difficulty: course.difficulty,
      difficultyName: course.difficultyName,
      priceInEth: course.priceInEth,
      averageRating: course.averageRating,
      totalRatings: course.totalRatings,
      totalEnrollments: course.totalEnrollments,
      sectionsCount: course.sectionsCount,
      totalDuration: course.totalDuration,
      durationFormatted: course.durationFormatted,
      createdAt: BigInt(course.createdAt),
    };
  } else {
    // Mock data format
    return {
      id: course.id,
      title: course.title,
      description: course.description,
      thumbnailCID: course.thumbnailCID || "",
      creator: course.creator,
      creatorName: course.creatorName,
      category: course.category,
      categoryName: getMockCategoryName(course.category),
      difficulty: course.difficulty,
      difficultyName: getMockDifficultyName(course.difficulty),
      priceInEth: weiToEth(course.pricePerMonth).toFixed(4),
      averageRating: 0, // Not available in mock
      totalRatings: 0,
      totalEnrollments: 0,
      sectionsCount: 0,
      totalDuration: 0,
      durationFormatted: "",
      createdAt: course.createdAt,
    };
  }
}

// Memoized helper functions
const formatDate = (timestamp: bigint): string => {
  return new Date(Number(timestamp) * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
};

const getDifficultyBadgeVariant = (difficulty: number) => {
  switch (difficulty) {
    case 0:
      return {
        variant: "default" as const,
        className:
          "bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-500",
      };
    case 1:
      return {
        variant: "default" as const,
        className:
          "bg-amber-500 text-white hover:bg-amber-600 border-amber-500",
      };
    case 2:
      return {
        variant: "default" as const,
        className: "bg-rose-500 text-white hover:bg-rose-600 border-rose-500",
      };
    default:
      return { variant: "outline" as const, className: "" };
  }
};

const getCategoryColor = (categoryName: string): string => {
  const colors: Record<string, string> = {
    Programming:
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    Design:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    Business:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    Marketing:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    DataScience:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    Finance:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    Healthcare: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    Language: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    Arts: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-300",
    Mathematics:
      "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300",
    Science: "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300",
    Engineering:
      "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
    Technology: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
    Education: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300",
    Psychology: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
    Culinary:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    PersonalDevelopment:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    Legal: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300",
    Sports: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    Other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  };
  return (
    colors[categoryName] ||
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  );
};

export const CourseCard = memo<CourseCardProps>(({ course, onEnroll }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Normalize course data
  const normalizedCourse = useMemo(() => normalizeCourse(course), [course]);

  // Use hook for thumbnail URL (optimized with cache)
  const {
    thumbnailUrl,
    loading: thumbnailLoading,
    error: thumbnailError,
  } = useThumbnailUrl(
    normalizedCourse.thumbnailCID,
    3600 // 1 hour expiry
  );

  // Use license hook for enrollment functionality
  const { isValid, purchaseLicense, isPurchasing, isTransactionPending } =
    useLicense(normalizedCourse.id);

  // Fetch course rating data (only if not from Goldsky - Goldsky already has rating)
  const shouldFetchRating = !isGoldskyCourse(course);
  const { data: ratingData, isLoading: isRatingLoading } = useCourseRating(
    shouldFetchRating ? normalizedCourse.id : undefined
  );

  // Use rating from Goldsky if available, otherwise from hook
  const displayRating = isGoldskyCourse(course)
    ? normalizedCourse.averageRating
    : ratingData?.averageRating || 0;

  const displayRatingCount = isGoldskyCourse(course)
    ? normalizedCourse.totalRatings
    : ratingData?.totalRatings || 0;

  // Memoize expensive calculations
  const courseData = useMemo(
    () => ({
      categoryName: normalizedCourse.categoryName,
      difficultyName: normalizedCourse.difficultyName,
      priceInEth: normalizedCourse.priceInEth,
      formattedDate: formatDate(normalizedCourse.createdAt),
      difficultyStyle: getDifficultyBadgeVariant(normalizedCourse.difficulty),
    }),
    [normalizedCourse]
  );

  const categoryColorClass = useMemo(
    () => getCategoryColor(courseData.categoryName),
    [courseData.categoryName]
  );

  const handleEnrollClick = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleModalEnroll = useCallback(
    async (courseId: bigint, duration: number) => {
      await purchaseLicense(duration);
      setIsModalOpen(false);
      if (onEnroll) {
        onEnroll(courseId, duration);
      }
    },
    [purchaseLicense, onEnroll]
  );

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-300 border-0 shadow-md h-full flex flex-col overflow-hidden p-0">
      {/* IPFS Course Image - Truly Full Width with Zero Gap */}
      <div className="relative h-48 w-full bg-gradient-to-br from-primary/10 to-secondary/10 overflow-hidden">
        {thumbnailLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!thumbnailLoading && thumbnailError && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium opacity-75">
                {normalizedCourse.title}
              </p>
              <p className="text-xs opacity-60 mt-1">
                IPFS: {normalizedCourse.thumbnailCID?.slice(0, 12)}...
              </p>
            </div>
          </div>
        )}

        {!thumbnailLoading && !thumbnailError && thumbnailUrl && (
          <div className="relative w-full h-full">
            <Image
              src={thumbnailUrl}
              alt={course.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => {
                // Thumbnail error handled by hook
              }}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={false}
            />
          </div>
        )}

        {!thumbnailLoading && !thumbnailError && !thumbnailUrl && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium opacity-75">{course.title}</p>
              <p className="text-xs opacity-60 mt-1">No thumbnail available</p>
            </div>
          </div>
        )}

        {/* Category and Difficulty Badges - Overlay on Image */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-20">
          <Badge className={`${categoryColorClass} border-0 shadow-sm`}>
            {courseData.categoryName}
          </Badge>
          <Badge
            variant={courseData.difficultyStyle.variant}
            className={`text-xs shadow-sm ${courseData.difficultyStyle.className}`}
          >
            {courseData.difficultyName}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col flex-grow p-6">
        <div className="pb-3">
          <h3 className="text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2 font-semibold">
            {course.title}
          </h3>

          <p className="line-clamp-2 text-sm text-muted-foreground mt-2">
            {course.description}
          </p>
        </div>

        <div className="flex flex-col flex-grow space-y-3">
          {/* Creator Information */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>by {normalizedCourse.creatorName}</span>
          </div>

          {/* Course Metadata */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              {isRatingLoading ? (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-gray-300 animate-pulse" />
                  <span className="animate-pulse">Loading...</span>
                </div>
              ) : displayRatingCount > 0 ? (
                <div className="flex items-center gap-1">
                  <Rating value={displayRating} readOnly className="gap-0">
                    {Array.from({ length: 5 }, (_, i) => (
                      <RatingButton key={i} size={16} />
                    ))}
                  </Rating>
                  <span className="ml-1">
                    {formatRatingDisplay(
                      displayRating,
                      true,
                      displayRatingCount
                    )}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-gray-300" />
                  <span>No ratings yet</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Created {courseData.formattedDate}</span>
            </div>
          </div>

          {/* Spacer to push bottom content down */}
          <div className="flex-grow" />

          {/* Course Status Indicator */}
          <div className="flex justify-start items-center text-xs mb-3">
            {isValid ? (
              <Badge
                variant="default"
                className="text-xs bg-green-500 hover:bg-green-600"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Enrolled
              </Badge>
            ) : (
              <Badge variant="default" className="text-xs">
                Active
              </Badge>
            )}
          </div>

          {/* Price and Enroll Button - Always at Bottom with Edge Alignment */}
          <div className="flex items-center justify-between pt-3 border-t mt-auto w-full">
            <div className="text-left flex-shrink-0">
              <div className="text-lg font-bold text-primary">
                {courseData.priceInEth} ETH
              </div>
              <div className="text-xs text-muted-foreground">per month</div>
            </div>

            <Button
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white flex-shrink-0 ml-4"
              onClick={handleEnrollClick}
              disabled={isPurchasing || isTransactionPending}
            >
              {isPurchasing || isTransactionPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isPurchasing ? "Processing..." : "Confirming..."}
                </>
              ) : isValid ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  View Course
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Enroll
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Course Enrollment Modal - Only render when open */}
      {isModalOpen && (
        <EnrollModal
          course={
            isGoldskyCourse(course)
              ? {
                  id: normalizedCourse.id,
                  title: normalizedCourse.title,
                  description: normalizedCourse.description,
                  creator: normalizedCourse.creator as `0x${string}`,
                  creatorName: normalizedCourse.creatorName,
                  pricePerMonth: BigInt(
                    Math.round(parseFloat(normalizedCourse.priceInEth) * 1e18)
                  ),
                  category: normalizedCourse.category,
                  difficulty: normalizedCourse.difficulty,
                  thumbnailCID: normalizedCourse.thumbnailCID,
                  isActive: true,
                  createdAt: normalizedCourse.createdAt,
                }
              : course
          }
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onEnroll={handleModalEnroll}
        />
      )}
    </Card>
  );
});

CourseCard.displayName = "CourseCard";

export default CourseCard;
