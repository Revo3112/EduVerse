import { BigInt, BigDecimal, Bytes, log } from "@graphprotocol/graph-ts";
import {
  SectionStarted,
  SectionCompleted,
  CourseCompleted,
  ProgressReset,
} from "../../generated/ProgressTracker/ProgressTracker";
import { CourseFactory } from "../../generated/CourseFactory/CourseFactory";
import {
  Course,
  Enrollment,
  UserProfile,
  CourseSection,
} from "../../generated/schema";
import { Address } from "@graphprotocol/graph-ts";

// ============================================================================
// CONSTANTS
// ============================================================================

const ZERO_BI = BigInt.fromI32(0);
const ONE_BI = BigInt.fromI32(1);
const ZERO_BD = BigDecimal.fromString("0");
const ONE_HUNDRED_BD = BigDecimal.fromString("100");

// Contract addresses (must match deployment)
const COURSE_FACTORY_ADDRESS = "0x44661459e3c092358559d8459e585EA201D04231";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate completion percentage
 */
function calculateCompletionPercentage(
  completed: BigInt,
  total: BigInt,
): BigInt {
  if (total.equals(ZERO_BI)) {
    return ZERO_BI;
  }
  return completed.times(BigInt.fromI32(100)).div(total);
}

/**
 * Calculate completion rate as BigDecimal
 */
function calculateCompletionRate(completed: BigInt, total: BigInt): BigDecimal {
  if (total.equals(ZERO_BI)) {
    return ZERO_BD;
  }
  return completed
    .toBigDecimal()
    .div(total.toBigDecimal())
    .times(ONE_HUNDRED_BD);
}

/**
 * Get total sections for a course from CourseFactory contract
 */
function getCourseSectionsCount(courseId: BigInt): BigInt {
  let courseFactoryContract = CourseFactory.bind(
    Address.fromString(COURSE_FACTORY_ADDRESS),
  );

  // Call getCourseSections to get all sections
  let sectionsResult = courseFactoryContract.try_getCourseSections(courseId);

  if (sectionsResult.reverted) {
    return ZERO_BI;
  }

  return BigInt.fromI32(sectionsResult.value.length);
}

/**
 * Find enrollment by student and courseId
 * Since we need to find enrollment by student + course, not by tokenId
 */
function findEnrollment(student: Bytes, courseId: BigInt): Enrollment | null {
  // Unfortunately, we need to load by ID (tokenId)
  // The best approach is to query or maintain a mapping
  // For now, we'll return null and handle this in the event handler
  // In production, consider adding a composite ID mapping
  return null;
}

/**
 * Get or load UserProfile
 */
function getOrLoadUserProfile(address: Bytes): UserProfile | null {
  let id = address.toHexString().toLowerCase();
  return UserProfile.load(id);
}

/**
 * Determine enrollment status
 */
function determineEnrollmentStatus(
  isExpired: boolean,
  isCompleted: boolean,
): string {
  if (isCompleted) {
    return "COMPLETED";
  }
  if (isExpired) {
    return "EXPIRED";
  }
  return "ACTIVE";
}

// ============================================================================
// PROGRESS TRACKING EVENT HANDLERS
// ============================================================================

/**
 * Handler for SectionStarted event
 * Tracks when a student starts watching a section
 * Updates lastActivityAt for tracking engagement
 * ✅ UPDATED: Now tracks section analytics (startedCount, dropoffRate)
 */
export function handleSectionStarted(event: SectionStarted): void {
  let studentAddress = event.params.student;
  let courseId = event.params.courseId;
  let sectionId = event.params.sectionId;

  // Update UserProfile activity timestamp
  let student = getOrLoadUserProfile(studentAddress);
  if (student != null) {
    student.lastActivityAt = event.block.timestamp;
    student.updatedAt = event.block.timestamp;
    student.lastTxHash = event.transaction.hash;
    student.save();
  }

  // ✅ NEW: Track section analytics
  let compositeSectionId = courseId.toString() + "-" + sectionId.toString();
  let section = CourseSection.load(compositeSectionId);

  if (section != null && !section.isDeleted) {
    section.startedCount = section.startedCount.plus(ONE_BI);

    // Calculate dropoff rate: (started - completed) / started
    if (section.startedCount.gt(ZERO_BI)) {
      let notCompleted = section.startedCount.minus(section.completedCount);
      section.dropoffRate = notCompleted
        .toBigDecimal()
        .div(section.startedCount.toBigDecimal())
        .times(ONE_HUNDRED_BD);
    } else {
      section.dropoffRate = ZERO_BD;
    }

    section.save();

    log.info(
      "Section {} started by student {} - Started: {}, Completed: {}, Dropoff: {}%",
      [
        compositeSectionId,
        studentAddress.toHexString(),
        section.startedCount.toString(),
        section.completedCount.toString(),
        section.dropoffRate.toString(),
      ],
    );
  }
}

/**
 * Handler for SectionCompleted event
 * Updates enrollment completion progress and user statistics
 * ✅ UPDATED: Now tracks section analytics (completedCount, dropoffRate)
 */
export function handleSectionCompleted(event: SectionCompleted): void {
  let studentAddress = event.params.student;
  let courseId = event.params.courseId;
  let sectionId = event.params.sectionId;

  // Get total sections in course
  let totalSections = getCourseSectionsCount(courseId);

  // Load or find enrollment
  // Note: In production, you'd want a better way to find enrollment by student+course
  // For now, we update all enrollments for this course (should be only one per student)

  // Update student's UserProfile
  let student = getOrLoadUserProfile(studentAddress);
  if (student != null) {
    student.totalSectionsCompleted =
      student.totalSectionsCompleted.plus(ONE_BI);
    student.lastActivityAt = event.block.timestamp;
    student.updatedAt = event.block.timestamp;
    student.lastTxHash = event.transaction.hash;
    student.save();
  }

  // ✅ NEW: Track section analytics
  let compositeSectionId = courseId.toString() + "-" + sectionId.toString();
  let section = CourseSection.load(compositeSectionId);

  if (section != null && !section.isDeleted) {
    section.completedCount = section.completedCount.plus(ONE_BI);

    // Calculate dropoff rate: (started - completed) / started
    if (section.startedCount.gt(ZERO_BI)) {
      let notCompleted = section.startedCount.minus(section.completedCount);
      section.dropoffRate = notCompleted
        .toBigDecimal()
        .div(section.startedCount.toBigDecimal())
        .times(ONE_HUNDRED_BD);
    } else {
      section.dropoffRate = ZERO_BD;
    }

    section.save();

    log.info(
      "Section {} completed by student {} - Started: {}, Completed: {}, Dropoff: {}%",
      [
        compositeSectionId,
        studentAddress.toHexString(),
        section.startedCount.toString(),
        section.completedCount.toString(),
        section.dropoffRate.toString(),
      ],
    );
  }

  // Note: To properly update Enrollment, we need to iterate through user's enrollments
  // or maintain a mapping. This is a limitation of the current schema design.
  // Alternative: Use event.transaction.from or add a mapping in the schema

  // For the comprehensive solution, you'd query enrollments:
  // let enrollments = student.enrollments.load();
  // Then find the one matching courseId and update it
}

/**
 * Handler for CourseCompleted event
 * Marks course as completed and updates all relevant statistics
 * This is the most important event for completion tracking
 */
export function handleCourseCompleted(event: CourseCompleted): void {
  let studentAddress = event.params.student;
  let courseId = event.params.courseId;
  let courseIdStr = courseId.toString();

  // Update Course statistics
  let course = Course.load(courseIdStr);
  if (course != null) {
    course.completedStudents = course.completedStudents.plus(ONE_BI);

    // Recalculate completion rate
    if (!course.totalEnrollments.equals(ZERO_BI)) {
      course.completionRate = calculateCompletionRate(
        course.completedStudents,
        course.totalEnrollments,
      );
    }

    course.updatedAt = event.block.timestamp;
    course.save();
  }

  // Update student's UserProfile
  let student = getOrLoadUserProfile(studentAddress);
  if (student != null) {
    student.coursesCompleted = student.coursesCompleted.plus(ONE_BI);
    student.completionsThisMonth = student.completionsThisMonth.plus(ONE_BI);
    student.lastActivityAt = event.block.timestamp;
    student.updatedAt = event.block.timestamp;
    student.lastTxHash = event.transaction.hash;
    student.save();
  }

  // Update all enrollments for this student-course combination
  // Note: This is a workaround for the lack of composite key lookup
  // In production, consider adding a derived field or mapping

  // Since we can't efficiently query enrollments by student+course in AssemblyScript,
  // we need to use a different approach:
  // 1. Maintain a mapping in the License contract events (enrollmentId)
  // 2. Or iterate through user's enrollments (expensive)
  // 3. Or use a composite ID pattern

  // For this implementation, we'll document that enrollment updates
  // should be done through the license tokenId when available

  // Alternative: Store a mapping of student+courseId -> enrollmentId
  // This would require modifying the LicenseMinted handler to store this mapping
}

/**
 * Handler for ProgressReset event
 * Resets course completion status (emergency admin function)
 * Decrements completion counters
 */
export function handleProgressReset(event: ProgressReset): void {
  let studentAddress = event.params.student;
  let courseId = event.params.courseId;
  let courseIdStr = courseId.toString();

  // Update Course statistics (decrement completed students)
  let course = Course.load(courseIdStr);
  if (course != null) {
    // Only decrement if there were completed students
    if (course.completedStudents.gt(ZERO_BI)) {
      course.completedStudents = course.completedStudents.minus(ONE_BI);

      // Recalculate completion rate
      if (!course.totalEnrollments.equals(ZERO_BI)) {
        course.completionRate = calculateCompletionRate(
          course.completedStudents,
          course.totalEnrollments,
        );
      }
    }

    course.updatedAt = event.block.timestamp;
    course.save();
  }

  // Update student's UserProfile (decrement completed courses)
  let student = getOrLoadUserProfile(studentAddress);
  if (student != null) {
    if (student.coursesCompleted.gt(ZERO_BI)) {
      student.coursesCompleted = student.coursesCompleted.minus(ONE_BI);
    }
    student.lastActivityAt = event.block.timestamp;
    student.updatedAt = event.block.timestamp;
    student.lastTxHash = event.transaction.hash;
    student.save();
  }

  // Reset enrollment completion status
  // Similar challenge as above - need to find enrollment by student+course
  // Document that this should be called with the enrollment tokenId if available
}

// ============================================================================
// NOTES ON IMPLEMENTATION
// ============================================================================
//
// **Enrollment Lookup Challenge:**
// The main challenge in this implementation is efficiently finding Enrollment
// entities by student address + courseId combination.
//
// **Solutions:**
// 1. **Current Approach**: Update Course and UserProfile only
//    - Pros: Simple, efficient, no additional storage
//    - Cons: Enrollment completion tracking less granular
//
// 2. **Enhanced Approach** (recommended for production):
//    - Add a mapping entity: StudentCourseEnrollment
//      type StudentCourseEnrollment @entity {
//        id: ID! # student-courseId composite
//        enrollment: Enrollment!
//      }
//    - Create this mapping in handleLicenseMinted
//    - Use it here to quickly find enrollment
//
// 3. **Alternative**: Use derived field queries
//    - Load all enrollments for student
//    - Filter by courseId
//    - More expensive but works without schema changes
//
// **For MVP with 3-entity constraint:**
// The current implementation prioritizes Course and UserProfile accuracy.
// Enrollment-level progress can be updated via:
// - Certificate minting (triggers completion update)
// - License renewal (opportunity to sync progress)
// - Periodic sync jobs (off-chain)
//
// ============================================================================

// ============================================================================
// END OF FILE
// ============================================================================
