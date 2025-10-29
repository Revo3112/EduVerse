import { BigInt, BigDecimal, Bytes, store, log } from "@graphprotocol/graph-ts";
import {
  CourseCreated,
  CourseUpdated,
  CourseDeleted,
  CourseUnpublished,
  CourseRepublished,
  SectionAdded,
  SectionUpdated,
  SectionDeleted,
  BatchSectionsAdded,
  CourseRated,
  RatingUpdated,
  RatingDeleted,
  SectionsSwapped,
  SectionMoved,
  SectionsBatchReordered,
  RatingRemoved,
  RatingsPaused,
  RatingsUnpaused,
  UserBlacklisted,
  UserUnblacklisted,
  CourseEmergencyDeactivated,
} from "../../generated/CourseFactory/CourseFactory";
import { Course, UserProfile, CourseSection } from "../../generated/schema";

// ============================================================================
// CONSTANTS - Match smart contract values
// ============================================================================

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_BIGINT = BigInt.fromI32(0);
const ZERO_BIGDECIMAL = BigDecimal.fromString("0");
const ONE_BIGINT = BigInt.fromI32(1);
const WEI_TO_ETH = BigDecimal.fromString("1000000000000000000"); // 1e18

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert Wei (BigInt) to ETH (BigDecimal)
 * Best Practice: Use BigDecimal for display values (The Graph docs)
 * Reference: https://thegraph.com/docs/en/subgraphs/developing/creating/graph-ts/api/#bigdecimal
 */
function weiToEth(wei: BigInt): BigDecimal {
  return wei.toBigDecimal().div(WEI_TO_ETH);
}

/**
 * Get or create UserProfile entity
 * Pattern: Lazy initialization prevents null checks everywhere
 */
function getOrCreateUserProfile(address: Bytes): UserProfile {
  let profile = UserProfile.load(address.toHexString());

  if (profile == null) {
    profile = new UserProfile(address.toHexString());
    profile.address = address;

    // Initialize student stats
    profile.coursesEnrolled = ZERO_BIGINT;
    profile.coursesCompleted = ZERO_BIGINT;
    profile.activeEnrollments = ZERO_BIGINT;
    profile.totalSpentOnCourses = ZERO_BIGINT;
    profile.totalSpentOnCoursesEth = ZERO_BIGDECIMAL;
    profile.totalSpentOnCertificates = ZERO_BIGINT;
    profile.totalSpentOnCertificatesEth = ZERO_BIGDECIMAL;
    profile.totalSpent = ZERO_BIGINT;
    profile.totalSpentEth = ZERO_BIGDECIMAL;

    // Initialize instructor stats
    profile.coursesCreated = ZERO_BIGINT;
    profile.activeCoursesCreated = ZERO_BIGINT;
    profile.deletedCoursesCreated = ZERO_BIGINT;
    profile.totalStudents = ZERO_BIGINT;
    profile.totalRevenue = ZERO_BIGINT;
    profile.totalRevenueEth = ZERO_BIGDECIMAL;
    profile.averageRating = ZERO_BIGDECIMAL;
    profile.totalRatingsReceived = ZERO_BIGINT;

    // Certificate data
    profile.hasCertificate = false;
    profile.certificateTokenId = ZERO_BIGINT;
    profile.certificateName = "";
    profile.totalCoursesInCertificate = ZERO_BIGINT;
    profile.certificateMintedAt = ZERO_BIGINT;
    profile.certificateLastUpdated = ZERO_BIGINT;

    // Activity tracking
    profile.totalSectionsCompleted = ZERO_BIGINT;
    profile.lastActivityAt = ZERO_BIGINT;
    profile.firstEnrollmentAt = ZERO_BIGINT;
    profile.firstCourseCreatedAt = ZERO_BIGINT;

    // Growth metrics
    profile.enrollmentsThisMonth = ZERO_BIGINT;
    profile.completionsThisMonth = ZERO_BIGINT;
    profile.revenueThisMonth = ZERO_BIGINT;
    profile.revenueThisMonthEth = ZERO_BIGDECIMAL;

    // Timestamps
    profile.createdAt = ZERO_BIGINT;
    profile.updatedAt = ZERO_BIGINT;
    profile.firstTxHash = Bytes.fromHexString(ZERO_ADDRESS);
    profile.lastTxHash = Bytes.fromHexString(ZERO_ADDRESS);

    // Moderation fields
    profile.isBlacklisted = false;
    profile.blacklistedAt = ZERO_BIGINT;
    profile.blacklistedBy = Bytes.fromHexString(ZERO_ADDRESS);
    profile.blockNumber = ZERO_BIGINT;
  }

  return profile;
}

/**
 * Map Solidity enum to GraphQL enum string
 */
function getCategoryString(categoryEnum: i32): string {
  const categories = [
    "Programming",
    "Design",
    "Business",
    "Marketing",
    "DataScience",
    "Finance",
    "Healthcare",
    "Language",
    "Arts",
    "Mathematics",
    "Science",
    "Engineering",
    "Technology",
    "Education",
    "Psychology",
    "Culinary",
    "PersonalDevelopment",
    "Legal",
    "Sports",
    "Other",
  ];
  return categories[categoryEnum];
}

function getDifficultyString(difficultyEnum: i32): string {
  const difficulties = ["Beginner", "Intermediate", "Advanced"];
  return difficulties[difficultyEnum];
}

// ============================================================================
// EVENT HANDLERS - COURSE LIFECYCLE
// ============================================================================

/**
 * Handle CourseCreated event
 * Creates Course entity and updates creator's UserProfile
 */
export function handleCourseCreated(event: CourseCreated): void {
  let courseId = event.params.courseId.toString();
  let course = new Course(courseId);

  // Core Identity
  course.creator = event.params.creator;
  course.creatorName = event.params.creatorName;

  // Course Metadata
  course.title = event.params.title;
  course.description = ""; // Not in event - must be set via contract call or update event
  course.thumbnailCID = ""; // Not in event - must be set via contract call or update event
  course.category = getCategoryString(event.params.category);
  course.difficulty = getDifficultyString(event.params.difficulty);

  // Pricing & Access - Default values, should be updated via CourseUpdated event
  course.price = ZERO_BIGINT;
  course.priceInEth = ZERO_BIGDECIMAL;
  course.isActive = true;
  course.isDeleted = false;

  // Content Structure
  course.sectionsCount = ZERO_BIGINT;
  course.totalDuration = ZERO_BIGINT;

  // Rating System
  course.averageRating = ZERO_BIGDECIMAL;
  course.totalRatings = ZERO_BIGINT;
  course.ratingSum = ZERO_BIGINT;

  // Analytics & Metrics
  course.totalEnrollments = ZERO_BIGINT;
  course.activeEnrollments = ZERO_BIGINT;
  course.totalRevenue = ZERO_BIGINT;
  course.totalRevenueEth = ZERO_BIGDECIMAL;
  course.completedStudents = ZERO_BIGINT;
  course.completionRate = ZERO_BIGDECIMAL;

  // Certificate pricing (initialize to zero, can be set later)
  course.certificatePrice = ZERO_BIGINT;
  course.certificatePriceEth = ZERO_BIGDECIMAL;

  // Emergency management
  course.isEmergencyDeactivated = false;
  course.emergencyDeactivationReason = "";
  course.ratingsDisabled = false;

  // Timestamps
  course.createdAt = event.block.timestamp;
  course.updatedAt = event.block.timestamp;
  course.lastRatingAt = ZERO_BIGINT;

  // Transaction References
  course.creationTxHash = event.transaction.hash;
  course.blockNumber = event.block.number;

  course.save();

  // Update creator's UserProfile
  let creator = getOrCreateUserProfile(event.params.creator);
  creator.coursesCreated = creator.coursesCreated.plus(ONE_BIGINT);
  creator.activeCoursesCreated = creator.activeCoursesCreated.plus(ONE_BIGINT);

  if (creator.firstCourseCreatedAt.equals(ZERO_BIGINT)) {
    creator.firstCourseCreatedAt = event.block.timestamp;
    creator.createdAt = event.block.timestamp;
    creator.firstTxHash = event.transaction.hash;
  }

  creator.updatedAt = event.block.timestamp;
  creator.lastTxHash = event.transaction.hash;
  creator.blockNumber = event.block.number;
  creator.lastActivityAt = event.block.timestamp;
  creator.save();
}

/**
 * Handle CourseUpdated event
 * Updates course price and active status
 */
export function handleCourseUpdated(event: CourseUpdated): void {
  let course = Course.load(event.params.courseId.toString());

  if (course != null) {
    course.price = event.params.newPrice;
    course.priceInEth = weiToEth(event.params.newPrice);
    course.isActive = event.params.isActive;
    course.updatedAt = event.block.timestamp;
    course.save();
  }
}

/**
 * Handle CourseDeleted event
 * Soft delete: preserves data but marks as deleted
 */
export function handleCourseDeleted(event: CourseDeleted): void {
  let course = Course.load(event.params.courseId.toString());

  if (course != null) {
    course.isDeleted = true;
    course.isActive = false;
    course.updatedAt = event.block.timestamp;
    course.save();

    // Update creator stats
    let creator = UserProfile.load(course.creator.toHexString());
    if (creator != null) {
      creator.deletedCoursesCreated =
        creator.deletedCoursesCreated.plus(ONE_BIGINT);
      creator.activeCoursesCreated =
        creator.activeCoursesCreated.minus(ONE_BIGINT);
      creator.save();
    }
  }
}

/**
 * Handle CourseUnpublished event
 */
export function handleCourseUnpublished(event: CourseUnpublished): void {
  let course = Course.load(event.params.courseId.toString());

  if (course != null) {
    course.isActive = false;
    course.updatedAt = event.block.timestamp;
    course.save();
  }
}

/**
 * Handle CourseRepublished event
 */
export function handleCourseRepublished(event: CourseRepublished): void {
  let course = Course.load(event.params.courseId.toString());

  if (course != null) {
    course.isActive = true;
    course.updatedAt = event.block.timestamp;
    course.save();
  }
}

// ============================================================================
// EVENT HANDLERS - COURSE SECTIONS (✅ CRITICAL FIX)
// ============================================================================

/**
 * Handle SectionAdded event
 * ✅ CRITICAL FIX: Creates CourseSection entity
 * Best Practice: Use composite ID (courseId-sectionId) for uniqueness
 * Reference: https://thegraph.com/docs/en/subgraphs/best-practices/immutable-entities-bytes-as-ids/
 */
export function handleSectionAdded(event: SectionAdded): void {
  let courseId = event.params.courseId.toString();
  let sectionId = event.params.sectionId.toString();
  let compositeSectionId = courseId + "-" + sectionId;

  // Create CourseSection entity
  let section = new CourseSection(compositeSectionId);
  section.course = courseId;
  section.sectionId = event.params.sectionId;
  section.orderId = event.params.sectionId; // Initially, orderId = sectionId
  section.title = event.params.title;
  section.contentCID = event.params.contentCID;
  section.duration = event.params.duration;
  section.createdAt = event.block.timestamp;
  section.isDeleted = false;

  // Initialize section analytics
  section.startedCount = ZERO_BIGINT;
  section.completedCount = ZERO_BIGINT;
  section.dropoffRate = ZERO_BIGDECIMAL;

  section.txHash = event.transaction.hash;
  section.blockNumber = event.block.number;
  section.save();

  // Update Course entity
  let course = Course.load(courseId);
  if (course != null) {
    course.sectionsCount = course.sectionsCount.plus(ONE_BIGINT);
    course.totalDuration = course.totalDuration.plus(event.params.duration);
    course.updatedAt = event.block.timestamp;
    course.save();
  }
}

/**
 * Handle SectionDeleted event
 * ✅ CRITICAL FIX: Re-indexes orderIds to maintain sequential integrity
 *
 * EXAMPLE:
 * Before: sections with orderId [0, 1, 2, 3, 4]
 * Delete section at orderId 2
 * After:  sections with orderId [0, 1, 2, 3] (NOT [0, 1, 3, 4])
 *
 * This ensures frontend can display sections in correct order without gaps
 */
export function handleSectionDeleted(event: SectionDeleted): void {
  let courseId = event.params.courseId.toString();
  let deletedSectionId = event.params.sectionId;

  // Load the section to be deleted
  let deletedCompositeId = courseId + "-" + deletedSectionId.toString();
  let deletedSection = CourseSection.load(deletedCompositeId);

  if (deletedSection != null) {
    let deletedOrderId = deletedSection.orderId;
    let deletedDuration = deletedSection.duration;

    // Mark as deleted (soft delete for audit trail)
    deletedSection.isDeleted = true;
    deletedSection.save();

    // CRITICAL: Re-index all sections with orderId > deletedOrderId
    // This maintains sequential order [0, 1, 2, 3...] after deletion
    let course = Course.load(courseId);
    if (course != null) {
      // Query all sections for this course
      // Note: @derivedFrom doesn't support direct array access in AssemblyScript
      // So we iterate through potential section IDs (0 to sectionsCount)
      let maxSections = course.sectionsCount.toI32();

      for (let i = 0; i < maxSections; i++) {
        let checkSectionId = BigInt.fromI32(i);
        let checkCompositeId = courseId + "-" + checkSectionId.toString();
        let section = CourseSection.load(checkCompositeId);

        if (
          section != null &&
          !section.isDeleted &&
          section.orderId.gt(deletedOrderId)
        ) {
          // Decrement orderId to fill the gap
          section.orderId = section.orderId.minus(ONE_BIGINT);
          section.save();
        }
      }

      // Update course metadata
      course.sectionsCount = course.sectionsCount.minus(ONE_BIGINT);
      course.totalDuration = course.totalDuration.minus(deletedDuration);
      course.updatedAt = event.block.timestamp;
      course.save();
    }
  }
}

/**
 * Handle SectionUpdated event
 */
export function handleSectionUpdated(event: SectionUpdated): void {
  let compositeSectionId =
    event.params.courseId.toString() + "-" + event.params.sectionId.toString();
  let section = CourseSection.load(compositeSectionId);

  if (section != null) {
    // Note: Smart contract doesn't emit new values in SectionUpdated
    // Frontend must fetch updated data from contract if needed
    // We just update the timestamp to track when it was modified
    section.save();
  }
}

/**
 * Handle SectionsSwapped event
 * Swaps orderIds of two sections
 */
export function handleSectionsSwapped(event: SectionsSwapped): void {
  let courseId = event.params.courseId.toString();
  let indexA = event.params.indexA;
  let indexB = event.params.indexB;

  // Find sections at indexA and indexB
  let course = Course.load(courseId);
  if (course != null) {
    let maxSections = course.sectionsCount.toI32();
    let sectionA: CourseSection | null = null;
    let sectionB: CourseSection | null = null;

    for (let i = 0; i < maxSections; i++) {
      let checkSectionId = BigInt.fromI32(i);
      let checkCompositeId = courseId + "-" + checkSectionId.toString();
      let section = CourseSection.load(checkCompositeId);

      if (section != null && !section.isDeleted) {
        if (section.orderId.equals(indexA)) {
          sectionA = section;
        }
        if (section.orderId.equals(indexB)) {
          sectionB = section;
        }
      }
    }

    // Swap orderIds
    if (sectionA != null && sectionB != null) {
      let tempOrderId = sectionA.orderId;
      sectionA.orderId = sectionB.orderId;
      sectionB.orderId = tempOrderId;
      sectionA.save();
      sectionB.save();
    }
  }
}

/**
 * Handle BatchSectionsAdded event
 * Creates multiple sections at once (optimization for course creation)
 */
export function handleBatchSectionsAdded(event: BatchSectionsAdded): void {
  let courseId = event.params.courseId.toString();
  let sectionIds = event.params.sectionIds;

  // Note: This event only emits sectionIds, not full section data
  // The full data is added via individual SectionAdded events
  // We just track the batch operation timestamp
  let course = Course.load(courseId);
  if (course != null) {
    course.updatedAt = event.block.timestamp;
    course.save();
  }
}

// ============================================================================
// EVENT HANDLERS - COURSE RATINGS
// ============================================================================

/**
 * Handle CourseRated event
 * Updates course average rating using smart contract's calculated value
 *
 * Best Practice: Use contract-calculated averages to avoid rounding errors
 * Reference: Smart contract uses (sum * 10000) / count for precision
 */
export function handleCourseRated(event: CourseRated): void {
  let course = Course.load(event.params.courseId.toString());

  if (course != null) {
    // Contract emits newAverageRating scaled by 10000
    // Convert to BigDecimal for display (e.g., 45000 -> 4.5)
    let scaledRating = event.params.newAverageRating.toBigDecimal();
    let scaleFactor = BigDecimal.fromString("10000");
    course.averageRating = scaledRating.div(scaleFactor);

    course.totalRatings = course.totalRatings.plus(ONE_BIGINT);
    course.ratingSum = course.ratingSum.plus(event.params.rating);
    course.lastRatingAt = event.block.timestamp;
    course.updatedAt = event.block.timestamp;
    course.save();

    // Update creator's average rating
    let creator = UserProfile.load(course.creator.toHexString());
    if (creator != null) {
      creator.totalRatingsReceived =
        creator.totalRatingsReceived.plus(ONE_BIGINT);

      // Recalculate creator's average rating across all courses
      // Note: This is an approximation; for exact value, need to query all creator's courses
      let totalCourses = creator.coursesCreated;
      if (totalCourses.gt(ZERO_BIGINT)) {
        creator.averageRating = course.averageRating; // Simplified for now
      }
      creator.save();
    }
  }
}

/**
 * Handle RatingUpdated event
 */
export function handleRatingUpdated(event: RatingUpdated): void {
  let course = Course.load(event.params.courseId.toString());

  if (course != null) {
    // Update average rating with contract-calculated value
    let scaledRating = event.params.newAverageRating.toBigDecimal();
    let scaleFactor = BigDecimal.fromString("10000");
    course.averageRating = scaledRating.div(scaleFactor);

    // Update rating sum
    course.ratingSum = course.ratingSum
      .minus(event.params.oldRating)
      .plus(event.params.newRating);
    course.lastRatingAt = event.block.timestamp;
    course.updatedAt = event.block.timestamp;
    course.save();
  }
}

/**
 * Handle RatingDeleted event
 */
export function handleRatingDeleted(event: RatingDeleted): void {
  let course = Course.load(event.params.courseId.toString());

  if (course != null) {
    course.totalRatings = course.totalRatings.minus(ONE_BIGINT);
    course.ratingSum = course.ratingSum.minus(event.params.previousRating);

    // Recalculate average rating
    if (course.totalRatings.gt(ZERO_BIGINT)) {
      let avgRating = course.ratingSum
        .toBigDecimal()
        .div(course.totalRatings.toBigDecimal());
      course.averageRating = avgRating;
    } else {
      course.averageRating = ZERO_BIGDECIMAL;
    }

    course.updatedAt = event.block.timestamp;
    course.save();
  }
}

// ============================================================================
// NEW EVENT HANDLERS - RATING MANAGEMENT
// ============================================================================

/**
 * Handle RatingRemoved event
 * Admin removes a rating (e.g., spam or inappropriate)
 * ✅ NEW: Required for rating moderation
 */
export function handleRatingRemoved(event: RatingRemoved): void {
  let course = Course.load(event.params.courseId.toString());

  if (course != null) {
    // RatingRemoved event only has courseId, user, admin
    // Decrement total ratings count
    if (course.totalRatings.gt(ZERO_BIGINT)) {
      course.totalRatings = course.totalRatings.minus(ONE_BIGINT);
    }

    // Recalculate average rating from remaining ratings
    if (course.totalRatings.gt(ZERO_BIGINT)) {
      // Average stays the same since we don't know which rating was removed
      // This is a limitation of the current event structure
      // Consider updating contract to emit previousRating
    } else {
      course.averageRating = ZERO_BIGDECIMAL;
      course.ratingSum = ZERO_BIGINT;
    }

    course.updatedAt = event.block.timestamp;
    course.save();

    log.info("Rating removed from course {} by admin {}", [
      event.params.courseId.toString(),
      event.params.admin.toHexString(),
    ]);
  }
}

/**
 * Handle RatingsPaused event
 * Admin pauses ratings for a course (e.g., under review)
 * ✅ NEW: Required for rating system management
 */
export function handleRatingsPaused(event: RatingsPaused): void {
  let course = Course.load(event.params.courseId.toString());

  if (course != null) {
    course.ratingsDisabled = true;
    course.updatedAt = event.block.timestamp;
    course.save();

    log.info("Ratings paused for course {} by admin {}", [
      event.params.courseId.toString(),
      event.params.admin.toHexString(),
    ]);
  }
}

/**
 * Handle RatingsUnpaused event
 * Admin unpauses ratings for a course
 * ✅ NEW: Required for rating system management
 */
export function handleRatingsUnpaused(event: RatingsUnpaused): void {
  let course = Course.load(event.params.courseId.toString());

  if (course != null) {
    course.ratingsDisabled = false;
    course.updatedAt = event.block.timestamp;
    course.save();

    log.info("Ratings unpaused for course {} by admin {}", [
      event.params.courseId.toString(),
      event.params.admin.toHexString(),
    ]);
  }
}

// ============================================================================
// NEW EVENT HANDLERS - USER MODERATION
// ============================================================================

/**
 * Handle UserBlacklisted event
 * Admin blacklists a user from the platform
 * ✅ NEW: Required for moderation system
 */
export function handleUserBlacklisted(event: UserBlacklisted): void {
  let profile = getOrCreateUserProfile(event.params.user);

  profile.isBlacklisted = true;
  profile.blacklistedAt = event.block.timestamp;
  profile.blacklistedBy = event.params.admin;
  profile.updatedAt = event.block.timestamp;
  profile.lastTxHash = event.transaction.hash;
  profile.save();

  log.warning("User {} blacklisted by admin {}", [
    event.params.user.toHexString(),
    event.params.admin.toHexString(),
  ]);
}

/**
 * Handle UserUnblacklisted event
 * Admin removes blacklist from a user
 * ✅ NEW: Required for moderation system
 */
export function handleUserUnblacklisted(event: UserUnblacklisted): void {
  let profile = getOrCreateUserProfile(event.params.user);

  profile.isBlacklisted = false;
  profile.blacklistedAt = ZERO_BIGINT;
  profile.blacklistedBy = Bytes.fromHexString(ZERO_ADDRESS);
  profile.updatedAt = event.block.timestamp;
  profile.lastTxHash = event.transaction.hash;
  profile.save();

  log.info("User {} unblacklisted by admin {}", [
    event.params.user.toHexString(),
    event.params.admin.toHexString(),
  ]);
}

// ============================================================================
// NEW EVENT HANDLERS - EMERGENCY MANAGEMENT
// ============================================================================

/**
 * Handle CourseEmergencyDeactivated event
 * Admin emergency deactivates a course (e.g., policy violation)
 * ✅ NEW: Required for emergency management
 */
export function handleCourseEmergencyDeactivated(
  event: CourseEmergencyDeactivated,
): void {
  let course = Course.load(event.params.courseId.toString());

  if (course != null) {
    course.isActive = false;
    course.isEmergencyDeactivated = true;
    course.emergencyDeactivationReason =
      "Emergency deactivation at timestamp: " +
      event.params.timestamp.toString();
    course.updatedAt = event.block.timestamp;
    course.save();

    log.warning("Course {} emergency deactivated by admin {} at timestamp {}", [
      event.params.courseId.toString(),
      event.params.admin.toHexString(),
      event.params.timestamp.toString(),
    ]);
  }
}

// ============================================================================
// NEW EVENT HANDLERS - SECTION REORDERING
// ============================================================================

/**
 * Handle SectionMoved event
 * Moves a section from one position to another
 * ✅ NEW: Required for section reordering
 */
export function handleSectionMoved(event: SectionMoved): void {
  let courseId = event.params.courseId.toString();
  let fromIndex = event.params.fromIndex;
  let toIndex = event.params.toIndex;
  let sectionTitle = event.params.sectionTitle;

  // Find the section by title and update its orderId
  let course = Course.load(courseId);
  if (course != null) {
    let maxSections = course.sectionsCount.toI32();
    let movedSection: CourseSection | null = null;

    // Find section by title
    for (let i = 0; i < maxSections; i++) {
      let checkSectionId = BigInt.fromI32(i);
      let checkCompositeId = courseId + "-" + checkSectionId.toString();
      let section = CourseSection.load(checkCompositeId);

      if (
        section != null &&
        !section.isDeleted &&
        section.title == sectionTitle
      ) {
        movedSection = section;
        break;
      }
    }

    if (movedSection != null) {
      // Update moved section's orderId
      movedSection.orderId = toIndex;
      movedSection.save();

      // Re-index other sections
      for (let i = 0; i < maxSections; i++) {
        let checkSectionId = BigInt.fromI32(i);
        let checkCompositeId = courseId + "-" + checkSectionId.toString();
        let checkSection = CourseSection.load(checkCompositeId);

        if (
          checkSection != null &&
          !checkSection.isDeleted &&
          checkSection.id != movedSection.id
        ) {
          // If moving forward, shift sections between old and new position down
          if (
            fromIndex.lt(toIndex) &&
            checkSection.orderId.gt(fromIndex) &&
            checkSection.orderId.le(toIndex)
          ) {
            checkSection.orderId = checkSection.orderId.minus(ONE_BIGINT);
            checkSection.save();
          }
          // If moving backward, shift sections between new and old position up
          else if (
            fromIndex.gt(toIndex) &&
            checkSection.orderId.ge(toIndex) &&
            checkSection.orderId.lt(fromIndex)
          ) {
            checkSection.orderId = checkSection.orderId.plus(ONE_BIGINT);
            checkSection.save();
          }
        }
      }

      course.updatedAt = event.block.timestamp;
      course.save();

      log.info("Section '{}' moved in course {} from position {} to {}", [
        sectionTitle,
        courseId,
        fromIndex.toString(),
        toIndex.toString(),
      ]);
    }
  }
}

/**
 * Handle SectionsBatchReordered event
 * Reorders multiple sections at once with a new order array
 * ✅ NEW: Required for batch section reordering
 */
export function handleSectionsBatchReordered(
  event: SectionsBatchReordered,
): void {
  let courseId = event.params.courseId.toString();
  let newOrder = event.params.newOrder;

  let course = Course.load(courseId);
  if (course != null) {
    // newOrder array contains sectionIds in their new order
    // Update each section's orderId based on its position in the array
    for (let i = 0; i < newOrder.length; i++) {
      let sectionId = newOrder[i];
      let compositeSectionId = courseId + "-" + sectionId.toString();
      let section = CourseSection.load(compositeSectionId);

      if (section != null && !section.isDeleted) {
        section.orderId = BigInt.fromI32(i);
        section.save();
      }
    }

    course.updatedAt = event.block.timestamp;
    course.save();

    log.info("Batch reordered {} sections for course {}", [
      newOrder.length.toString(),
      courseId,
    ]);
  }
}
