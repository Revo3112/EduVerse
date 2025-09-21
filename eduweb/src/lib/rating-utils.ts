/**
 * Rating utility functions for EduVerse course rating system
 * Handles conversion between smart contract scale and display scale
 */

export interface CourseRatingData {
  totalRatings: number;
  averageRating: number; // Display scale (0-5)
  ratingSum: number;
  averageRatingRaw: number; // Contract scale (0-50000)
}

/**
 * Converts smart contract rating scale (0-50000) to display scale (0-5)
 * Contract stores averageRating scaled by 10000 (e.g., 45000 = 4.5 stars)
 * @param contractRating - Rating from smart contract (0-50000)
 * @returns Display rating (0-5)
 */
export function contractRatingToDisplay(contractRating: number): number {
  if (contractRating === 0) return 0;
  return Math.round((contractRating / 10000) * 10) / 10; // Round to 1 decimal place
}

/**
 * Converts display rating scale (1-5) to smart contract scale for submission
 * @param displayRating - Rating from user input (1-5)
 * @returns Contract rating (1-5, no conversion needed for submission)
 */
export function displayRatingToContract(displayRating: number): number {
  // Smart contract rateCourse function expects 1-5 directly
  return Math.round(displayRating);
}

/**
 * Formats rating for display with proper precision
 * @param rating - Rating value (0-5)
 * @param showCount - Whether to show the rating count
 * @param totalRatings - Total number of ratings
 * @returns Formatted rating string
 */
export function formatRatingDisplay(
  rating: number,
  showCount: boolean = false,
  totalRatings: number = 0
): string {
  if (rating === 0) {
    return showCount ? 'No ratings yet' : '0.0';
  }

  const formattedRating = rating.toFixed(1);

  if (showCount && totalRatings > 0) {
    return `${formattedRating} (${totalRatings} rating${totalRatings !== 1 ? 's' : ''})`;
  }

  return formattedRating;
}

/**
 * Validates rating value for submission
 * @param rating - Rating value to validate
 * @returns True if valid (1-5), false otherwise
 */
export function isValidRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

/**
 * Calculates star fill percentage for partial star display
 * @param rating - Rating value (0-5)
 * @param starIndex - Index of the star (0-4)
 * @returns Fill percentage (0-1)
 */
export function getStarFillPercentage(rating: number, starIndex: number): number {
  const starValue = starIndex + 1;

  if (rating >= starValue) {
    return 1; // Full star
  } else if (rating > starIndex) {
    return rating - starIndex; // Partial star
  } else {
    return 0; // Empty star
  }
}

/**
 * Gets appropriate color class for rating display
 * @param rating - Rating value (0-5)
 * @returns Tailwind color class
 */
export function getRatingColorClass(rating: number): string {
  if (rating >= 4.5) return 'text-green-500';
  if (rating >= 4.0) return 'text-yellow-500';
  if (rating >= 3.0) return 'text-orange-500';
  if (rating >= 2.0) return 'text-red-500';
  return 'text-gray-400';
}

/**
 * Error types for rating operations
 */
export enum RatingError {
  INVALID_RATING = 'Invalid rating value. Must be between 1 and 5.',
  COURSE_NOT_FOUND = 'Course not found.',
  USER_IS_CREATOR = 'Course creators cannot rate their own courses.',
  COOLDOWN_ACTIVE = 'You must wait 24 hours between ratings.',
  USER_BLACKLISTED = 'Your account is restricted from rating.',
  RATINGS_DISABLED = 'Ratings are disabled for this course.',
  NETWORK_ERROR = 'Network error. Please try again.',
  TRANSACTION_FAILED = 'Transaction failed. Please try again.',
}

/**
 * Gets user-friendly error message for rating errors
 * @param error - Error type or message
 * @returns User-friendly error message
 */
export function getRatingErrorMessage(error: RatingError | string): string {
  if (Object.values(RatingError).includes(error as RatingError)) {
    return error as string;
  }

  // Handle contract-specific errors
  if (typeof error === 'string') {
    if (error.includes('CreatorCannotRate')) {
      return RatingError.USER_IS_CREATOR;
    }
    if (error.includes('RatingCooldownActive')) {
      return RatingError.COOLDOWN_ACTIVE;
    }
    if (error.includes('UserIsBlacklisted')) {
      return RatingError.USER_BLACKLISTED;
    }
    if (error.includes('RatingsDisabled')) {
      return RatingError.RATINGS_DISABLED;
    }
    if (error.includes('InvalidRating')) {
      return RatingError.INVALID_RATING;
    }
  }

  return RatingError.NETWORK_ERROR;
}
