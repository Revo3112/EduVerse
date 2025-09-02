import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Star, Clock, User } from "lucide-react";
import { Course, getCategoryName, getDifficultyName, weiToEth } from "@/lib/mock-data";
import EnrollModal from "@/components/EnrollModal";

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

export function CourseCard({ course, onEnroll }: CourseCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Convert creator address for display (show first 6 and last 4 characters)
  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format date from Unix timestamp
  const formatDate = (timestamp: bigint): string => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const handleEnrollClick = () => {
    setIsModalOpen(true);
  };

  const handleModalEnroll = (courseId: bigint, duration: number) => {
    if (onEnroll) {
      onEnroll(courseId, duration);
    }
    setIsModalOpen(false);
  };

  // Get difficulty badge variant based on level with distinct colors and proper contrast
  const getDifficultyBadgeVariant = (difficulty: number) => {
    switch (difficulty) {
      case 0: return { variant: 'default' as const, className: 'bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-500' }; // Beginner - Green (welcoming, approachable)
      case 1: return { variant: 'default' as const, className: 'bg-amber-500 text-white hover:bg-amber-600 border-amber-500' }; // Intermediate - Amber (caution, learning)
      case 2: return { variant: 'default' as const, className: 'bg-rose-500 text-white hover:bg-rose-600 border-rose-500' }; // Advanced - Rose (challenging, expert)
      default: return { variant: 'outline' as const, className: '' };
    }
  };

  // Get category color for styling
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

  const categoryName = getCategoryName(course.category);
  const difficultyName = getDifficultyName(course.difficulty);
  const priceInEth = weiToEth(course.pricePerMonth);
  const difficultyStyle = getDifficultyBadgeVariant(course.difficulty);

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-300 border-0 shadow-md h-full flex flex-col overflow-hidden p-0">
      {/* IPFS Course Image - Truly Full Width with Zero Gap */}
      <div className="relative h-48 w-full bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium opacity-75">{course.title}</p>
            <p className="text-xs opacity-60 mt-1">IPFS: {course.thumbnailCID.slice(0, 12)}...</p>
          </div>
        </div>
        {/* Category and Difficulty Badges - Overlay on Image */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <Badge
            className={`${getCategoryColor(categoryName)} border-0 shadow-sm`}
          >
            {categoryName}
          </Badge>
          <Badge
            variant={difficultyStyle.variant}
            className={`text-xs shadow-sm ${difficultyStyle.className}`}
          >
            {difficultyName}
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
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span>4.8</span>
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
                {priceInEth} ETH
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

      {/* Course Enrollment Modal */}
      <EnrollModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        course={course}
        onEnroll={handleModalEnroll}
      />
    </Card>
  );
}

export default CourseCard;
