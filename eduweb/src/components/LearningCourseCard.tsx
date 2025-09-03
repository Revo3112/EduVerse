"use client";

import Image from 'next/image';
import { Award, BookOpen, Calendar, Clock, User } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { LearningCourseData, CATEGORY_NAMES, DIFFICULTY_NAMES, CourseStatus } from '@/types/learning';

interface LearningCourseCardProps {
  courseData: LearningCourseData;
  onContinueLearning?: (courseId: bigint) => void;
  onViewCertificate?: (courseId: bigint) => void;
}

/**
 * Native JavaScript implementation of formatDistanceToNow
 * Replaces date-fns to reduce bundle size and improve performance
 */
function formatDistanceToNow(date: Date, options?: { addSuffix?: boolean }): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 }
  ];

  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count > 0) {
      const suffix = options?.addSuffix ? ' ago' : '';
      return `${count} ${interval.label}${count !== 1 ? 's' : ''}${suffix}`;
    }
  }

  return options?.addSuffix ? 'just now' : '0 seconds';
}

/**
 * Learning Course Card Component
 * Displays individual course information with progress, status, and actions
 * Follows shadcn/ui design patterns with responsive layout
 */
export function LearningCourseCard({
  courseData,
  onContinueLearning,
  onViewCertificate
}: LearningCourseCardProps) {
  const { course, progressPercentage, isCompleted, completedSections, totalSections, hasCertificate } = courseData;

  // Determine course status for badge display
  const getStatusBadge = (): { variant: "default" | "secondary" | "destructive" | "outline", text: string } => {
    if (isCompleted) {
      return { variant: "default", text: "Completed" };
    } else if (progressPercentage > 0) {
      return { variant: "secondary", text: "In Progress" };
    } else {
      return { variant: "outline", text: "Not Started" };
    }
  };

  const statusBadge = getStatusBadge();

  // Format course creation date
  const createdDate = new Date(Number(course.createdAt));
  const timeAgo = formatDistanceToNow(createdDate, { addSuffix: true });

  // Format price display (convert from wei to ETH)
  const priceInEth = Number(course.pricePerMonth) / 1e18;

  // Generate IPFS URL for thumbnail (using a public gateway)
  const thumbnailUrl = `https://ipfs.io/ipfs/${course.thumbnailCID}`;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border border-border bg-card">
      <CardHeader className="space-y-4">
        {/* Course Thumbnail */}
        <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
          <Image
            src={thumbnailUrl}
            alt={course.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              // Fallback to placeholder if IPFS image fails to load
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,' + btoa(`
                <svg width="400" height="225" xmlns="http://www.w3.org/2000/svg">
                  <rect width="400" height="225" fill="#f3f4f6"/>
                  <text x="200" y="112" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="16">
                    Course Thumbnail
                  </text>
                </svg>
              `);
            }}
          />

          {/* Course Status Badge */}
          <div className="absolute top-3 right-3">
            <Badge variant={statusBadge.variant} className="shadow-md">
              {statusBadge.text}
            </Badge>
          </div>

          {/* Certificate Badge */}
          {hasCertificate && (
            <div className="absolute top-3 left-3">
              <Badge variant="default" className="bg-green-600 hover:bg-green-700 shadow-md">
                <Award className="w-3 h-3 mr-1" />
                Certified
              </Badge>
            </div>
          )}
        </div>

        {/* Course Title and Meta Info */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg leading-tight line-clamp-2 text-card-foreground">
              {course.title}
            </h3>
            <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              {priceInEth} ETH/mo
            </div>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">
            {course.description}
          </p>

          {/* Category and Difficulty Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {CATEGORY_NAMES[course.category]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {DIFFICULTY_NAMES[course.difficulty]}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {completedSections}/{totalSections} sections ({progressPercentage}%)
            </span>
          </div>
          <Progress
            value={progressPercentage}
            className="h-2"
            aria-label={`Course progress: ${progressPercentage}%`}
          />
        </div>

        {/* Course Creator Info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Avatar className="w-6 h-6">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
              {course.creatorName.charAt(0)}
            </div>
          </Avatar>
          <span>by {course.creatorName}</span>
        </div>

        {/* Meta Information */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Created {timeAgo}</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            <span>{totalSections} sections</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {isCompleted ? (
            <>
              {hasCertificate && (
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => onViewCertificate?.(course.id)}
                >
                  <Award className="w-4 h-4 mr-2" />
                  View Certificate
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className={hasCertificate ? "flex-1" : "w-full"}
                onClick={() => onContinueLearning?.(course.id)}
              >
                Review Course
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="w-full"
              onClick={() => onContinueLearning?.(course.id)}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              {progressPercentage > 0 ? 'Continue Learning' : 'Start Learning'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
