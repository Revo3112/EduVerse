"use client";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Rating, RatingButton } from "@/components/ui/rating";
import {
  useCanRate,
  useRatingCooldown,
  useSubmitRating,
  useUserRating,
} from "@/hooks/useRating";
import { formatCooldownTime, formatRatingDisplay } from "@/lib/rating-utils";
import { AlertCircle, Clock, Loader2, Star, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Course {
  id: bigint;
  title: string;
  description: string;
  thumbnailCID: string;
  creator: `0x${string}`;
  creatorName: string;
  category: string;
  difficulty: string;
  pricePerMonth: bigint;
  totalSections: number;
  totalDuration: bigint;
  totalEnrollments: bigint;
  activeEnrollments: bigint;
  completedStudents: bigint;
  totalRevenue: bigint;
  averageRating: number;
  totalRatings: number;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: bigint;
  updatedAt: bigint;
}

interface RatingModalProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  userAddress?: string;
  onRatingSubmitted?: () => void;
}

export const RatingModal = ({
  course,
  isOpen,
  onClose,
  userAddress,
  onRatingSubmitted,
}: RatingModalProps) => {
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const { submitRating, deleteRating, isSubmitting, isDeleting, error } =
    useSubmitRating();
  const { rating: currentUserRating, refetch: refetchUserRating } =
    useUserRating(course.id, userAddress);
  const { canRate, reason: cantRateReason } = useCanRate(
    course.id,
    userAddress,
    course.creator
  );
  const { isInCooldown, remainingSeconds } = useRatingCooldown(
    course.id,
    userAddress
  );

  useEffect(() => {
    if (currentUserRating > 0) {
      setSelectedRating(currentUserRating);
    }
  }, [currentUserRating]);

  const handleSubmit = useCallback(async () => {
    if (selectedRating === 0) return;

    try {
      await submitRating(course.id, selectedRating);
      await refetchUserRating();
      onRatingSubmitted?.();
      onClose();
    } catch (err) {
      console.error("Rating submission failed:", err);
    }
  }, [
    selectedRating,
    course.id,
    submitRating,
    refetchUserRating,
    onRatingSubmitted,
    onClose,
  ]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteRating(course.id);
      await refetchUserRating();
      setSelectedRating(0);
      setShowConfirmDelete(false);
      onRatingSubmitted?.();
      onClose();
    } catch (err) {
      console.error("Rating deletion failed:", err);
    }
  }, [course.id, deleteRating, refetchUserRating, onRatingSubmitted, onClose]);

  const handleClose = useCallback(() => {
    setSelectedRating(currentUserRating);
    setShowConfirmDelete(false);
    onClose();
  }, [currentUserRating, onClose]);

  const hasChanges = selectedRating !== currentUserRating;
  const hasCurrentRating = currentUserRating > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Rate This Course
          </DialogTitle>
          <DialogDescription>
            Share your experience with this course to help other learners
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold text-lg mb-2 line-clamp-2">
              {course.title}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {course.category}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {course.difficulty}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              by {course.creatorName}
            </p>
          </div>

          {!canRate ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <div>
                <p className="font-medium">Cannot rate this course</p>
                <p className="text-sm text-muted-foreground">
                  {cantRateReason}
                </p>
              </div>
            </Alert>
          ) : (
            <div className="space-y-4">
              {hasCurrentRating && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Your current rating:{" "}
                    {formatRatingDisplay(currentUserRating)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Rating value={currentUserRating} readOnly>
                      {Array.from({ length: 5 }, (_, i) => (
                        <RatingButton key={i} size={20} />
                      ))}
                    </Rating>
                  </div>
                </div>
              )}

              {hasCurrentRating && isInCooldown && (
                <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                  <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <div>
                    <p className="font-medium text-orange-900 dark:text-orange-100">
                      Rating Cooldown Active
                    </p>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      You can update your rating in{" "}
                      {formatCooldownTime(remainingSeconds)}
                    </p>
                  </div>
                </Alert>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {hasCurrentRating
                    ? "Update your rating:"
                    : "Rate this course:"}
                </label>
                <div className="flex items-center gap-2">
                  <Rating
                    value={selectedRating}
                    onValueChange={setSelectedRating}
                  >
                    {Array.from({ length: 5 }, (_, i) => (
                      <RatingButton key={i} size={32} />
                    ))}
                  </Rating>
                  {selectedRating > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {selectedRating} star{selectedRating !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Error</p>
                    <p className="text-sm">{error}</p>
                  </div>
                </Alert>
              )}
            </div>
          )}

          {showConfirmDelete && (
            <Alert>
              <Trash2 className="h-4 w-4" />
              <div>
                <p className="font-medium">Delete Rating</p>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete your rating? This action
                  cannot be undone.
                </p>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting && (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    )}
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {hasCurrentRating && canRate && !showConfirmDelete && (
            <Button
              variant="outline"
              onClick={() => setShowConfirmDelete(true)}
              disabled={isSubmitting || isDeleting}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Rating
            </Button>
          )}

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting || isDeleting}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>

            {canRate && (
              <Button
                onClick={handleSubmit}
                disabled={
                  selectedRating === 0 ||
                  !hasChanges ||
                  isSubmitting ||
                  isDeleting ||
                  (hasCurrentRating && isInCooldown)
                }
                className="flex-1 sm:flex-none"
              >
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {hasCurrentRating ? "Update Rating" : "Submit Rating"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
