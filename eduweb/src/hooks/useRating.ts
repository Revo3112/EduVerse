/**
 * Web3 hooks for EduVerse course rating system
 * Handles interaction with CourseFactory smart contract for rating functionality
 *
 * ✅ INTEGRATED WITH:
 * - Thirdweb SDK for contract interactions
 * - Goldsky GraphQL for read-optimized rating data
 * - CourseFactory contract on Manta Pacific Sepolia
 */

import {
  CourseRatingData,
  RatingError,
  contractRatingToDisplay,
  displayRatingToContract,
  getRatingErrorMessage,
  getRemainingCooldown,
} from "@/lib/rating-utils";
import { useCallback, useEffect, useState } from "react";
import { useReadContract } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { useSendTransaction } from "thirdweb/react";
import { useActiveAccount } from "thirdweb/react";
import { courseFactory } from "@/lib/contracts";
import toast from "react-hot-toast";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface GetCourseRatingResult {
  totalRatings: bigint;
  averageRating: bigint;
  ratingSum: bigint;
}

// ============================================================================
// HOOK: useCourseRating
// ============================================================================

/**
 * Hook to fetch course rating data from the smart contract
 * @param courseId - The course ID to fetch rating for
 * @returns Course rating data and loading state
 *
 * NOTE: For browse/list views, prefer using Goldsky data (CourseBrowseData.averageRating)
 * This hook is for detailed views or when contract data is explicitly needed
 */
export function useCourseRating(courseId: bigint | undefined) {
  const [data, setData] = useState<CourseRatingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Read course rating from contract
  const {
    data: contractData,
    isLoading,
    isError,
    error: contractError,
    refetch,
  } = useReadContract({
    contract: courseFactory,
    method:
      "function getCourseRating(uint256 courseId) view returns (uint256 totalRatings, uint256 averageRating, uint256 ratingSum)",
    params: [courseId ?? BigInt(0)] as const,
  });

  useEffect(() => {
    if (isError) {
      const errorMessage = getRatingErrorMessage(
        contractError?.message || "Failed to fetch course rating"
      );
      setError(errorMessage);
      setData(null);
      return;
    }

    if (contractData && courseId !== undefined) {
      const result = contractData as unknown as GetCourseRatingResult;

      // Convert contract scale to display scale
      const ratingData: CourseRatingData = {
        totalRatings: Number(result.totalRatings),
        averageRating: contractRatingToDisplay(Number(result.averageRating)),
        ratingSum: Number(result.ratingSum),
        averageRatingRaw: Number(result.averageRating),
      };

      setData(ratingData);
      setError(null);
    }
  }, [contractData, isError, contractError, courseId]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

// ============================================================================
// HOOK: useUserRating
// ============================================================================

/**
 * Hook to fetch user's rating for a specific course
 * @param courseId - The course ID
 * @param userAddress - The user's wallet address (optional, uses active account if not provided)
 * @returns User's rating and loading state
 */
export function useUserRating(
  courseId: bigint | undefined,
  userAddress?: string
) {
  const activeAccount = useActiveAccount();
  const effectiveAddress = userAddress || activeAccount?.address;

  const [rating, setRating] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Read user rating from contract
  const {
    data: contractRating,
    isLoading,
    isError,
    error: contractError,
    refetch,
  } = useReadContract({
    contract: courseFactory,
    method:
      "function getUserRating(uint256 courseId, address user) view returns (uint256 rating)",
    params: [
      courseId ?? BigInt(0),
      effectiveAddress ?? "0x0000000000000000000000000000000000000000",
    ] as const,
  });

  useEffect(() => {
    if (isError) {
      const errorMessage = getRatingErrorMessage(
        contractError?.message || "Failed to fetch user rating"
      );
      setError(errorMessage);
      setRating(0);
      return;
    }

    if (
      contractRating !== undefined &&
      courseId !== undefined &&
      effectiveAddress
    ) {
      // Contract returns 1-5 for user rating (not scaled)
      setRating(Number(contractRating));
      setError(null);
    }
  }, [contractRating, isError, contractError, courseId, effectiveAddress]);

  return {
    rating,
    isLoading,
    error,
    refetch,
  };
}

// ============================================================================
// HOOK: useSubmitRating
// ============================================================================

/**
 * Hook to submit a rating for a course
 * @returns Functions to submit and delete ratings
 */
export function useSubmitRating() {
  const { mutate: sendTransaction, isPending } = useSendTransaction();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeAccount = useActiveAccount();

  const submitRating = useCallback(
    async (
      courseId: bigint,
      rating: number
    ): Promise<{ success: boolean; transactionHash?: string }> => {
      if (!activeAccount) {
        const errorMsg = "Please connect your wallet to rate this course";
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      // Validate rating value (1-5)
      if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        const errorMsg = RatingError.INVALID_RATING;
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      setIsSubmitting(true);
      setError(null);

      return new Promise((resolve, reject) => {
        try {
          const contractRating = displayRatingToContract(rating);

          const transaction = prepareContractCall({
            contract: courseFactory,
            method: "function rateCourse(uint256 courseId, uint256 rating)",
            params: [courseId, BigInt(contractRating)],
          });

          sendTransaction(transaction, {
            onSuccess: (result) => {
              setIsSubmitting(false);
              toast.success(`Rating submitted: ${rating} stars!`);
              resolve({
                success: true,
                transactionHash: result.transactionHash,
              });
            },
            onError: (err) => {
              setIsSubmitting(false);
              const errorMessage = getRatingErrorMessage(err.message);
              setError(errorMessage);
              toast.error(errorMessage);
              reject(new Error(errorMessage));
            },
          });
        } catch (err) {
          setIsSubmitting(false);
          const errorMessage = getRatingErrorMessage(
            (err as Error).message || "Failed to submit rating"
          );
          setError(errorMessage);
          toast.error(errorMessage);
          reject(new Error(errorMessage));
        }
      });
    },
    [activeAccount, sendTransaction]
  );

  const deleteRating = useCallback(
    async (
      courseId: bigint
    ): Promise<{ success: boolean; transactionHash?: string }> => {
      if (!activeAccount) {
        const errorMsg = "Please connect your wallet to delete rating";
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      setIsDeleting(true);
      setError(null);

      return new Promise((resolve, reject) => {
        try {
          const transaction = prepareContractCall({
            contract: courseFactory,
            method: "function deleteMyRating(uint256 courseId)",
            params: [courseId],
          });

          sendTransaction(transaction, {
            onSuccess: (result) => {
              setIsDeleting(false);
              toast.success("Rating deleted successfully");
              resolve({
                success: true,
                transactionHash: result.transactionHash,
              });
            },
            onError: (err) => {
              setIsDeleting(false);
              const errorMessage = getRatingErrorMessage(err.message);
              setError(errorMessage);
              toast.error(errorMessage);
              reject(new Error(errorMessage));
            },
          });
        } catch (err) {
          setIsDeleting(false);
          const errorMessage = getRatingErrorMessage(
            (err as Error).message || "Failed to delete rating"
          );
          setError(errorMessage);
          toast.error(errorMessage);
          reject(new Error(errorMessage));
        }
      });
    },
    [activeAccount, sendTransaction]
  );

  return {
    submitRating,
    deleteRating,
    isSubmitting: isSubmitting || isPending,
    isDeleting: isDeleting || isPending,
    error,
  };
}

// ============================================================================
// HOOK: useCanRate
// ============================================================================

/**
 * Hook to check if user can rate a course
 * @param courseId - The course ID
 * @param userAddress - The user's wallet address (optional)
 * @param creatorAddress - The course creator's address
 * @returns Whether user can rate and reason if they can't
 */
export function useCanRate(
  courseId: bigint | undefined,
  userAddress: string | undefined,
  creatorAddress: string | undefined
) {
  const activeAccount = useActiveAccount();
  const effectiveAddress = userAddress || activeAccount?.address;

  const [canRate, setCanRate] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  // Check if user is blacklisted
  const { data: isBlacklisted, isLoading: isLoadingBlacklist } =
    useReadContract({
      contract: courseFactory,
      method: "function userBlacklisted(address) view returns (bool)",
      params: [
        effectiveAddress ?? "0x0000000000000000000000000000000000000000",
      ] as const,
    });

  // Check if ratings are disabled for this course
  const { data: ratingsDisabled, isLoading: isLoadingRatingsStatus } =
    useReadContract({
      contract: courseFactory,
      method: "function ratingsDisabled(uint256) view returns (bool)",
      params: [courseId ?? BigInt(0)] as const,
    });

  useEffect(() => {
    // Wait for all checks to complete
    if (isLoadingBlacklist || isLoadingRatingsStatus) {
      return;
    }

    // Check wallet connection
    if (!effectiveAddress) {
      setCanRate(false);
      setReason("Please connect your wallet to rate");
      return;
    }

    // Check if course ID is valid
    if (!courseId || !creatorAddress) {
      setCanRate(false);
      setReason("Missing required information");
      return;
    }

    // Check if user is the course creator
    if (effectiveAddress.toLowerCase() === creatorAddress.toLowerCase()) {
      setCanRate(false);
      setReason(RatingError.USER_IS_CREATOR);
      return;
    }

    // Check if user is blacklisted
    if (isBlacklisted) {
      setCanRate(false);
      setReason(RatingError.USER_BLACKLISTED);
      return;
    }

    // Check if ratings are disabled for this course
    if (ratingsDisabled) {
      setCanRate(false);
      setReason(RatingError.RATINGS_DISABLED);
      return;
    }

    // All checks passed
    setCanRate(true);
    setReason(null);
  }, [
    courseId,
    effectiveAddress,
    creatorAddress,
    isBlacklisted,
    ratingsDisabled,
    isLoadingBlacklist,
    isLoadingRatingsStatus,
  ]);

  return {
    canRate,
    reason,
    isLoading: isLoadingBlacklist || isLoadingRatingsStatus,
  };
}

// ============================================================================
// HOOK: useRatingCooldown
// ============================================================================

/**
 * Hook to check rating cooldown status
 * @param courseId - The course ID
 * @param userAddress - The user's wallet address (optional)
 * @returns Cooldown information
 */
export function useRatingCooldown(
  courseId: bigint | undefined,
  userAddress?: string
) {
  const activeAccount = useActiveAccount();
  const effectiveAddress = userAddress || activeAccount?.address;

  const [isInCooldown, setIsInCooldown] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Read cooldown constant
  const { data: cooldownPeriod } = useReadContract({
    contract: courseFactory,
    method: "function RATING_COOLDOWN() view returns (uint256)",
    params: [],
  });

  // Read last rating time for this user and course
  const {
    data: lastRatingTime,
    isLoading,
    refetch,
  } = useReadContract({
    contract: courseFactory,
    method: "function lastRatingTime(address, uint256) view returns (uint256)",
    params: [
      effectiveAddress ?? "0x0000000000000000000000000000000000000000",
      courseId ?? BigInt(0),
    ] as const,
  });

  useEffect(() => {
    if (
      lastRatingTime === undefined ||
      cooldownPeriod === undefined ||
      !effectiveAddress ||
      courseId === undefined
    ) {
      setIsInCooldown(false);
      setRemainingSeconds(0);
      return;
    }

    const lastTime = Number(lastRatingTime);
    const cooldown = Number(cooldownPeriod);

    // Calculate remaining cooldown
    const remaining = getRemainingCooldown(lastTime, cooldown);

    setIsInCooldown(remaining > 0);
    setRemainingSeconds(remaining);

    // Set up interval to update remaining time
    if (remaining > 0) {
      const interval = setInterval(() => {
        const newRemaining = getRemainingCooldown(lastTime, cooldown);
        if (newRemaining <= 0) {
          setIsInCooldown(false);
          setRemainingSeconds(0);
          clearInterval(interval);
        } else {
          setRemainingSeconds(newRemaining);
        }
      }, 1000); // Update every second

      return () => clearInterval(interval);
    }
  }, [lastRatingTime, cooldownPeriod, courseId, effectiveAddress]);

  return {
    isInCooldown,
    remainingSeconds,
    isLoading,
    refetch,
  };
}

// ============================================================================
// END OF FILE
// ============================================================================
