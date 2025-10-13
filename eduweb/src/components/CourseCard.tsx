import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Rating, RatingButton } from "@/components/ui/rating";
import { useCourseRating } from "@/hooks/useRating";
import { getSignedUrlCached } from "@/lib/ipfs-helpers";
import { Course, getCategoryName, getDifficultyName, weiToEth } from "@/lib/mock-data";
import { formatRatingDisplay } from "@/lib/rating-utils";
import { BookOpen, Clock, ImageIcon, Loader2, Star, User } from "lucide-react";
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

// Lazy load EnrollModal to improve initial page load
const EnrollModal = dynamic(() => import("@/components/EnrollModal"), {
  ssr: false,
  loading: () => null
});

/**
 * CourseCard Component
 *
 * A reusable component to display course information in a card format.
 * Built with Shadcn UI components following the design system.
 *
 * @param course - Course object containing all course details from CourseFactory contract
 */

interface CourseCardProps {
  course: Course;
  onEnroll?: (courseId: bigint, duration: number) => void;
}

// Memoized helper functions
const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatDate = (timestamp: bigint): string => {
  return new Date(Number(timestamp) * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
};

const getDifficultyBadgeVariant = (difficulty: number) => {
  switch (difficulty) {
    case 0: return { variant: 'default' as const, className: 'bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-500' };
    case 1: return { variant: 'default' as const, className: 'bg-amber-500 text-white hover:bg-amber-600 border-amber-500' };
    case 2: return { variant: 'default' as const, className: 'bg-rose-500 text-white hover:bg-rose-600 border-rose-500' };
    default: return { variant: 'outline' as const, className: '' };
  }
};

const getCategoryColor = (categoryName: string): string => {
  const colors: Record<string, string> = {
    Programming: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    Design: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    Business: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    Marketing: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    DataScience: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    Finance: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    Technology: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300'
  };
  return colors[categoryName] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
};

export const CourseCard = memo<CourseCardProps>(({ course, onEnroll }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailLoading, setThumbnailLoading] = useState(true);
  const [thumbnailError, setThumbnailError] = useState(false);

  // Fetch course rating data
  const { data: ratingData, isLoading: isRatingLoading } = useCourseRating(course.id);

  // Fetch signed URL for thumbnail
  useEffect(() => {
    async function fetchThumbnailUrl() {
      // HARDCODED CID untuk development - belum connect ke backend
      const HARDCODED_THUMBNAIL_CID = 'bafybeia53xes6gxywrtwekknabt3hgt4leytd3rxh3v3vwl5aru6k6v2ku';

      // Gunakan hardcoded CID atau fallback ke course.thumbnailCID jika ada
      const cidToUse = HARDCODED_THUMBNAIL_CID || course.thumbnailCID;

      if (!cidToUse) {
        setThumbnailLoading(false);
        return;
      }

      try {
        setThumbnailLoading(true);
        setThumbnailError(false);
        const result = await getSignedUrlCached(cidToUse, 3600); // 1 hour expiry with cache
        setThumbnailUrl(result.signedUrl);
      } catch (error) {
        console.error('Failed to load thumbnail:', error);
        setThumbnailError(true);
      } finally {
        setThumbnailLoading(false);
      }
    }

    fetchThumbnailUrl();
  }, [course.thumbnailCID]);

  // Memoize expensive calculations
  const courseData = useMemo(() => ({
    categoryName: getCategoryName(course.category),
    difficultyName: getDifficultyName(course.difficulty),
    priceInEth: weiToEth(course.pricePerMonth),
    formattedCreator: formatAddress(course.creatorName),
    formattedDate: formatDate(course.createdAt),
    difficultyStyle: getDifficultyBadgeVariant(course.difficulty),
  }), [course.category, course.difficulty, course.pricePerMonth, course.creatorName, course.createdAt]);

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

  const handleModalEnroll = useCallback((courseId: bigint, duration: number) => {
    if (onEnroll) {
      onEnroll(courseId, duration);
    }
    setIsModalOpen(false);
  }, [onEnroll]);

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
              <p className="text-sm font-medium opacity-75">{course.title}</p>
              <p className="text-xs opacity-60 mt-1">IPFS: {course.thumbnailCID.slice(0, 12)}...</p>
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
              onError={() => setThumbnailError(true)}
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
          <Badge
            className={`${categoryColorClass} border-0 shadow-sm`}
          >
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
            <User className="h-4 w-4" />
            <span>by {course.creatorName}</span>
          </div>

          {/* Course Metadata */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              {isRatingLoading ? (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-gray-300 animate-pulse" />
                  <span className="animate-pulse">Loading...</span>
                </div>
              ) : ratingData && ratingData.totalRatings > 0 ? (
                <div className="flex items-center gap-1">
                  <Rating value={ratingData.averageRating} readOnly className="gap-0">
                    {Array.from({ length: 5 }, (_, i) => (
                      <RatingButton key={i} size={16} />
                    ))}
                  </Rating>
                  <span className="ml-1">
                    {formatRatingDisplay(ratingData.averageRating, true, ratingData.totalRatings)}
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
              <span>Created {formatDate(course.createdAt)}</span>
            </div>
          </div>

          {/* Spacer to push bottom content down */}
          <div className="flex-grow" />

          {/* Course Status Indicator - Remove ID Display */}
          <div className="flex justify-start items-center text-xs mb-3">
            <Badge variant={course.isActive ? "default" : "secondary"} className="text-xs">
              {course.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>

          {/* Price and Enroll Button - Always at Bottom with Edge Alignment */}
          <div className="flex items-center justify-between pt-3 border-t mt-auto w-full">
            <div className="text-left flex-shrink-0">
              <div className="text-lg font-bold text-primary">
                {courseData.priceInEth} ETH
              </div>
              <div className="text-xs text-muted-foreground">
                per month
              </div>
            </div>

            <Button
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white flex-shrink-0 ml-4"
              onClick={handleEnrollClick}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Enroll
            </Button>
          </div>
        </div>
      </div>

      {/* Course Enrollment Modal - Only render when open */}
      {isModalOpen && (
        <EnrollModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          course={course}
          onEnroll={handleModalEnroll}
        />
      )}
    </Card>
  );
});

CourseCard.displayName = 'CourseCard';

export default CourseCard;
