import {
  BigInt,
  BigDecimal,
  Bytes,
  store,
  log,
  ethereum,
} from "@graphprotocol/graph-ts";
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
  CourseFactory,
} from "../../generated/CourseFactory/CourseFactory";
import {
  Course,
  UserProfile,
  CourseSection,
  Enrollment,
  StudentCourseEnrollment,
} from "../../generated/schema";
import {
  updateNetworkStats,
  incrementPlatformCounter,
} from "./helpers/networkStatsHelper";
import { createActivityEvent } from "./helpers/activityEventHelper";

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
function getOrCreateUserProfile(
  address: Bytes,
  event: ethereum.Event,
): UserProfile {
  let id = address.toHexString().toLowerCase();
  let profile = UserProfile.load(id);
  let isNewUser = profile == null;

  if (isNewUser) {
    profile = new UserProfile(id);
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

    incrementPlatformCounter("USER", event);
  }

  return profile as UserProfile;
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

  // Course Metadata - Read from contract since event doesn't emit all fields
  let courseFactoryContract = CourseFactory.bind(event.address);
  let courseResult = courseFactoryContract.try_getCourse(event.params.courseId);

  course.title = event.params.title;

  if (!courseResult.reverted) {
    let courseData = courseResult.value;
    course.description = courseData.description;
    course.thumbnailCID = courseData.thumbnailCID;
    course.price = courseData.pricePerMonth;
    course.priceInEth = weiToEth(courseData.pricePerMonth);
    course.isActive = courseData.isActive;
  } else {
    // Fallback if contract call fails
    course.description = "";
    course.thumbnailCID = "";
    course.price = ZERO_BIGINT;
    course.priceInEth = ZERO_BIGDECIMAL;
    course.isActive = true;
  }

  course.category = getCategoryString(event.params.category);
  course.difficulty = getDifficultyString(event.params.difficulty);

  // Get sections count separately
  let sectionsResult = courseFactoryContract.try_getCourseSections(
    event.params.courseId,
  );
  if (!sectionsResult.reverted) {
    course.sectionsCount = BigInt.fromI32(sectionsResult.value.length);
  } else {
    course.sectionsCount = ZERO_BIGINT;
  }

  // Status
  course.isDeleted = false;

  // Content Structure - sectionsCount set above from contract call
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
  let creator = getOrCreateUserProfile(event.params.creator, event);
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

  // Track network stats
  updateNetworkStats(event, "COURSE_CREATED");
  // Track platform counters
  incrementPlatformCounter("COURSE", event);

  createActivityEvent(
    event,
    "COURSE_CREATED",
    course.creator,
    "Created course: " + course.title,
    courseId,
    null,
    null,
    null,
  );

  log.info(
    "ActivityEvent created for CourseCreated - Creator: {}, CourseId: {}, Title: {}",
    [course.creator.toHexString(), courseId, course.title],
  );
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

    // Track network stats
    updateNetworkStats(event, "COURSE_UPDATED");

    createActivityEvent(
      event,
      "COURSE_UPDATED",
      course.creator,
      "Updated course: " + course.title,
      event.params.courseId.toString(),
      null,
      null,
      null,
    );

    log.info(
      "ActivityEvent created for CourseUpdated - Creator: {}, CourseId: {}",
      [course.creator.toHexString(), event.params.courseId.toString()],
    );
  }
}

/**
 * Handle CourseDeleted event
 * Soft delete: preserves data but marks as deleted
 */
export function handleCourseDeleted(event: CourseDeleted): void {
  let courseId = event.params.courseId.toString();
  let course = Course.load(courseId);

  if (course != null) {
    // Mark course as deleted
    course.isDeleted = true;
    course.isActive = false;
    course.updatedAt = event.block.timestamp;
    course.save();

    // CRITICAL: Mark all sections as deleted to match smart contract behavior
    // Smart contract does: delete courseSections[courseId]
    // So we must mark all CourseSection entities as isDeleted = true
    let maxSections = course.sectionsCount.toI32();
    for (let i = 0; i < maxSections; i++) {
      let sectionId = BigInt.fromI32(i);
      let compositeSectionId = courseId + "-" + sectionId.toString();
      let section = CourseSection.load(compositeSectionId);

      if (section != null && !section.isDeleted) {
        section.isDeleted = true;
        section.save();
      }
    }

    // Update creator stats
    let creator = getOrCreateUserProfile(course.creator, event);
    if (creator != null) {
      creator.deletedCoursesCreated =
        creator.deletedCoursesCreated.plus(ONE_BIGINT);
      creator.activeCoursesCreated =
        creator.activeCoursesCreated.minus(ONE_BIGINT);
      creator.save();
    }
  }

  // Track network stats
  updateNetworkStats(event, "COURSE_DELETED");

  // Create activity event
  if (course != null) {
    createActivityEvent(
      event,
      "COURSE_DELETED",
      event.params.creator,
      "Deleted course: " + course.title,
      courseId,
      null,
      null,
      null,
    );
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

    let creator = UserProfile.load(course.creator.toHexString().toLowerCase());
    if (creator && creator.activeCoursesCreated.gt(ZERO_BIGINT)) {
      creator.activeCoursesCreated =
        creator.activeCoursesCreated.minus(ONE_BIGINT);
      creator.updatedAt = event.block.timestamp;
      creator.lastTxHash = event.transaction.hash;
      creator.save();
    }
  }

  // Track network stats
  updateNetworkStats(event, "COURSE_UNPUBLISHED");

  // Create activity event
  if (course != null) {
    createActivityEvent(
      event,
      "COURSE_UNPUBLISHED",
      course.creator,
      "Unpublished course: " + course.title,
      event.params.courseId.toString(),
      null,
      null,
      null,
    );
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

    let creator = UserProfile.load(course.creator.toHexString().toLowerCase());
    if (creator) {
      creator.activeCoursesCreated =
        creator.activeCoursesCreated.plus(ONE_BIGINT);
      creator.updatedAt = event.block.timestamp;
      creator.lastTxHash = event.transaction.hash;
      creator.save();
    }
  }

  // Track network stats
  updateNetworkStats(event, "COURSE_REPUBLISHED");

  // Create activity event
  if (course != null) {
    createActivityEvent(
      event,
      "COURSE_REPUBLISHED",
      course.creator,
      "Republished course: " + course.title,
      event.params.courseId.toString(),
      null,
      null,
      null,
    );
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
    let newSectionsCount = course.sectionsCount.plus(ONE_BIGINT);
    course.sectionsCount = newSectionsCount;
    course.totalDuration = course.totalDuration.plus(event.params.duration);
    course.updatedAt = event.block.timestamp;
    course.save();

    // Recalculate completion percentage for all enrollments of this course
    // When a section is added, students who completed X out of Y sections
    // should now show X out of (Y+1) sections (percentage will decrease)
    recalculateEnrollmentCompletionsOnAdd(courseId, newSectionsCount, event);

    // Track network stats
    updateNetworkStats(event, "SECTION_ADDED");

    // Create activity event
    let course_ref = Course.load(courseId.toString());
    if (course_ref != null) {
      createActivityEvent(
        event,
        "SECTION_ADDED",
        course_ref.creator,
        "Added section: " + section.title,
        courseId.toString(),
        null,
        null,
        null,
      );

      log.info(
        "ActivityEvent created for SectionAdded - Creator: {}, CourseId: {}, SectionId: {}",
        [
          course_ref.creator.toHexString(),
          courseId.toString(),
          sectionId.toString(),
        ],
      );
    }
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

      let newSectionsCount = course.sectionsCount.minus(ONE_BIGINT);

      // Update course metadata
      course.sectionsCount = newSectionsCount;
      course.totalDuration = course.totalDuration.minus(deletedDuration);
      course.updatedAt = event.block.timestamp;
      course.save();

      // CRITICAL: Recalculate completion percentage for all enrollments of this course
      // Iterate through potential enrollment IDs to update completion percentages
      recalculateEnrollmentCompletions(courseId, newSectionsCount, event);
    }
  }

  // Track network stats
  updateNetworkStats(event, "SECTION_DELETED");
}

/**
 * Helper function to recalculate completion percentages for all enrollments of a course
 * Called after section deletion to update student progress accurately
 */
function recalculateEnrollmentCompletions(
  courseId: string,
  newTotalSections: BigInt,
  event: SectionDeleted,
): void {
  if (newTotalSections.equals(ZERO_BIGINT)) {
    log.warning(
      "Cannot recalculate enrollments for course {} - no sections remaining",
      [courseId],
    );
    return;
  }

  log.info(
    "Recalculating completion percentages for course {} with new section count {}",
    [courseId, newTotalSections.toString()],
  );

  // Iterate through potential enrollment NFT token IDs
  // Enrollment IDs are sequential BigInts starting from 1
  // We check up to a reasonable limit (10000 enrollments)
  let maxEnrollmentsToCheck = 10000;
  let updatedCount = 0;

  for (let i = 1; i <= maxEnrollmentsToCheck; i++) {
    let enrollmentId = BigInt.fromI32(i).toString();
    let enrollment = Enrollment.load(enrollmentId);

    if (enrollment != null && enrollment.courseId.toString() == courseId) {
      // Recalculate completion percentage with new total sections
      let sectionsCompleted = enrollment.sectionsCompleted;

      // If student completed more sections than currently exist, cap it
      if (sectionsCompleted.gt(newTotalSections)) {
        sectionsCompleted = newTotalSections;
        enrollment.sectionsCompleted = newTotalSections;
      }

      // Calculate new percentage
      let newPercentage = sectionsCompleted
        .times(BigInt.fromI32(100))
        .div(newTotalSections);
      let oldPercentage = enrollment.completionPercentage;

      enrollment.completionPercentage = newPercentage;

      // Check if course is now complete (100%)
      if (
        newPercentage.equals(BigInt.fromI32(100)) &&
        !enrollment.isCompleted
      ) {
        enrollment.isCompleted = true;
        enrollment.completionDate = event.block.timestamp;
        enrollment.status = "COMPLETED";
      }

      enrollment.lastActivityAt = event.block.timestamp;
      enrollment.lastTxHash = event.transaction.hash;
      enrollment.save();

      updatedCount++;

      log.info(
        "Updated enrollment {} for course {} - Sections: {}/{}, Percentage: {}% -> {}%",
        [
          enrollmentId,
          courseId,
          sectionsCompleted.toString(),
          newTotalSections.toString(),
          oldPercentage.toString(),
          newPercentage.toString(),
        ],
      );
    }

    // Early exit if we've checked enough empty slots
    if (enrollment == null && i > 100 && updatedCount == 0) {
      break;
    }
  }

  log.info("Recalculated {} enrollments for course {}", [
    BigInt.fromI32(updatedCount).toString(),
    courseId,
  ]);
}

/**
 * Helper function to recalculate completion percentages when sections are added
 * Called after section addition to update student progress accurately
 */
function recalculateEnrollmentCompletionsOnAdd(
  courseId: string,
  newTotalSections: BigInt,
  event: SectionAdded,
): void {
  if (newTotalSections.equals(ZERO_BIGINT)) {
    return;
  }

  log.info(
    "Recalculating completion percentages after section added for course {} with new section count {}",
    [courseId, newTotalSections.toString()],
  );

  let maxEnrollmentsToCheck = 10000;
  let updatedCount = 0;

  for (let i = 1; i <= maxEnrollmentsToCheck; i++) {
    let enrollmentId = BigInt.fromI32(i).toString();
    let enrollment = Enrollment.load(enrollmentId);

    if (enrollment != null && enrollment.courseId.toString() == courseId) {
      let sectionsCompleted = enrollment.sectionsCompleted;

      // Recalculate percentage with new total sections
      let newPercentage = sectionsCompleted
        .times(BigInt.fromI32(100))
        .div(newTotalSections);
      let oldPercentage = enrollment.completionPercentage;

      enrollment.completionPercentage = newPercentage;

      // If was completed but now has new section, mark as incomplete
      if (enrollment.isCompleted && newPercentage.lt(BigInt.fromI32(100))) {
        enrollment.isCompleted = false;
        enrollment.completionDate = ZERO_BIGINT;
        enrollment.status = "ACTIVE";
      }

      enrollment.lastActivityAt = event.block.timestamp;
      enrollment.lastTxHash = event.transaction.hash;
      enrollment.save();

      updatedCount++;

      log.info(
        "Updated enrollment {} for course {} after section add - Sections: {}/{}, Percentage: {}% -> {}%",
        [
          enrollmentId,
          courseId,
          sectionsCompleted.toString(),
          newTotalSections.toString(),
          oldPercentage.toString(),
          newPercentage.toString(),
        ],
      );
    }

    if (enrollment == null && i > 100 && updatedCount == 0) {
      break;
    }
  }

  log.info("Recalculated {} enrollments after section add for course {}", [
    BigInt.fromI32(updatedCount).toString(),
    courseId,
  ]);
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

  // Track network stats
  updateNetworkStats(event, "SECTION_UPDATED");
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

  // Track network stats
  updateNetworkStats(event, "SECTIONS_SWAPPED");
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

  // Track network stats
  updateNetworkStats(event, "BATCH_SECTIONS_ADDED");
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
    let creator = getOrCreateUserProfile(course.creator, event);
    if (creator != null) {
      creator.totalRatingsReceived =
        creator.totalRatingsReceived.plus(ONE_BIGINT);

      // Note: Creator's averageRating cannot be accurately calculated here
      // because we cannot efficiently query all courses by creator in AssemblyScript.
      // This field should be calculated off-chain or via aggregation queries.
      // We leave it unchanged to avoid incorrect values.

      creator.updatedAt = event.block.timestamp;
      creator.lastTxHash = event.transaction.hash;
      creator.save();
    }
  }

  // Track network stats
  updateNetworkStats(event, "COURSE_RATED");

  // Create activity event
  if (course != null) {
    createActivityEvent(
      event,
      "COURSE_RATED",
      event.params.user,
      "Rated course: " + course.title,
      event.params.courseId.toString(),
      null,
      null,
      null,
    );

    log.info(
      "ActivityEvent created for CourseRated - User: {}, CourseId: {}, Rating: {}",
      [
        event.params.user.toHexString(),
        event.params.courseId.toString(),
        event.params.rating.toString(),
      ],
    );
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

  // Track network stats
  updateNetworkStats(event, "RATING_UPDATED");

  // Create activity event
  if (course != null) {
    createActivityEvent(
      event,
      "RATING_UPDATED",
      event.params.user,
      "Updated rating for: " + course.title,
      event.params.courseId.toString(),
      null,
      null,
      null,
    );
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

  // Track network stats
  updateNetworkStats(event, "RATING_DELETED");
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

  // Track network stats
  updateNetworkStats(event, "RATING_REMOVED");
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

  // Track network stats
  updateNetworkStats(event, "RATINGS_PAUSED");
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

  // Track network stats
  updateNetworkStats(event, "RATINGS_UNPAUSED");
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
  let profile = getOrCreateUserProfile(event.params.user, event);

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

  // Track network stats
  updateNetworkStats(event, "USER_BLACKLISTED");
}

/**
 * Handle UserUnblacklisted event
 * Admin removes blacklist from a user
 * ✅ NEW: Required for moderation system
 */
export function handleUserUnblacklisted(event: UserUnblacklisted): void {
  let profile = getOrCreateUserProfile(event.params.user, event);

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

  // Track network stats
  updateNetworkStats(event, "USER_UNBLACKLISTED");
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

  // Track network stats
  updateNetworkStats(event, "COURSE_EMERGENCY_DEACTIVATED");
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

  // Track network stats
  updateNetworkStats(event, "SECTION_MOVED");
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

  // Track network stats
  updateNetworkStats(event, "SECTIONS_BATCH_REORDERED");
}
