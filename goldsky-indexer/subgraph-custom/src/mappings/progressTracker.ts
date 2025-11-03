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
  StudentCourseEnrollment,
} from "../../generated/schema";
import { Address } from "@graphprotocol/graph-ts";
import { updateNetworkStats } from "./helpers/networkStatsHelper";
import { createActivityEvent } from "./helpers/activityEventHelper";

// ============================================================================
// CONSTANTS
// ============================================================================

const ZERO_BI = BigInt.fromI32(0);
const ONE_BI = BigInt.fromI32(1);
const ZERO_BD = BigDecimal.fromString("0");
const ONE_HUNDRED_BD = BigDecimal.fromString("100");

// Contract addresses (must match deployment)
const COURSE_FACTORY_ADDRESS = "0x8596917Af32Ab154Ab4F48efD32Ef516D4110E72";

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
 * Get or create UserProfile
 * Pattern copied from courseLicense.ts to prevent null references
 */
function getOrCreateUserProfile(
  address: Bytes,
  timestamp: BigInt,
  txHash: Bytes,
  blockNumber: BigInt,
): UserProfile {
  let id = address.toHexString().toLowerCase();
  let profile = UserProfile.load(id);

  if (!profile) {
    profile = new UserProfile(id);
    profile.address = address;

    // Initialize student statistics
    profile.coursesEnrolled = ZERO_BI;
    profile.coursesCompleted = ZERO_BI;
    profile.activeEnrollments = ZERO_BI;
    profile.totalSpentOnCourses = ZERO_BI;
    profile.totalSpentOnCoursesEth = ZERO_BD;
    profile.totalSpentOnCertificates = ZERO_BI;
    profile.totalSpentOnCertificatesEth = ZERO_BD;
    profile.totalSpent = ZERO_BI;
    profile.totalSpentEth = ZERO_BD;

    // Initialize instructor statistics
    profile.coursesCreated = ZERO_BI;
    profile.activeCoursesCreated = ZERO_BI;
    profile.deletedCoursesCreated = ZERO_BI;
    profile.totalStudents = ZERO_BI;
    profile.totalRevenue = ZERO_BI;
    profile.totalRevenueEth = ZERO_BD;
    profile.averageRating = ZERO_BD;
    profile.totalRatingsReceived = ZERO_BI;

    // Initialize certificate data
    profile.hasCertificate = false;
    profile.certificateTokenId = ZERO_BI;
    profile.certificateName = "";
    profile.totalCoursesInCertificate = ZERO_BI;
    profile.certificateMintedAt = ZERO_BI;
    profile.certificateLastUpdated = ZERO_BI;

    // Initialize activity tracking
    profile.totalSectionsCompleted = ZERO_BI;
    profile.lastActivityAt = timestamp;
    profile.firstEnrollmentAt = ZERO_BI;
    profile.firstCourseCreatedAt = ZERO_BI;

    // Initialize growth metrics
    profile.enrollmentsThisMonth = ZERO_BI;
    profile.completionsThisMonth = ZERO_BI;
    profile.revenueThisMonth = ZERO_BI;
    profile.revenueThisMonthEth = ZERO_BD;

    // Initialize moderation status
    profile.isBlacklisted = false;
    profile.blacklistedAt = ZERO_BI;
    profile.blacklistedBy = Bytes.fromHexString(
      "0x0000000000000000000000000000000000000000",
    );

    // Timestamps
    profile.createdAt = timestamp;
    profile.updatedAt = timestamp;

    // Transaction references
    profile.firstTxHash = txHash;
    profile.lastTxHash = txHash;
    profile.blockNumber = blockNumber;
  }

  return profile as UserProfile;
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

  let student = getOrCreateUserProfile(
    studentAddress,
    event.block.timestamp,
    event.transaction.hash,
    event.block.number,
  );
  student.lastActivityAt = event.block.timestamp;
  student.updatedAt = event.block.timestamp;
  student.lastTxHash = event.transaction.hash;
  student.save();

  let compositeSectionId = courseId.toString() + "-" + sectionId.toString();
  let section = CourseSection.load(compositeSectionId);

  if (section != null && !section.isDeleted) {
    section.startedCount = section.startedCount.plus(ONE_BI);

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

  updateNetworkStats(event, "SECTION_STARTED");

  let course = Course.load(courseId.toString());
  let courseName =
    course != null ? course.title : "Course #" + courseId.toString();

  createActivityEvent(
    event,
    "SECTION_STARTED",
    studentAddress,
    "Started section in " + courseName,
    courseId.toString(),
    null,
    null,
    null,
  );

  log.info(
    "ActivityEvent created for SectionStarted - Student: {}, Course: {}",
    [studentAddress.toHexString(), courseId.toString()],
  );
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

  let totalSections = getCourseSectionsCount(courseId);

  let student = getOrCreateUserProfile(
    studentAddress,
    event.block.timestamp,
    event.transaction.hash,
    event.block.number,
  );
  student.totalSectionsCompleted = student.totalSectionsCompleted.plus(ONE_BI);
  student.lastActivityAt = event.block.timestamp;
  student.updatedAt = event.block.timestamp;
  student.lastTxHash = event.transaction.hash;
  student.save();

  let compositeSectionId = courseId.toString() + "-" + sectionId.toString();
  let section = CourseSection.load(compositeSectionId);

  if (section != null && !section.isDeleted) {
    section.completedCount = section.completedCount.plus(ONE_BI);

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

  let scEnrollmentId =
    studentAddress.toHexString().toLowerCase() + "-" + courseId.toString();
  let scEnrollment = StudentCourseEnrollment.load(scEnrollmentId);

  if (scEnrollment != null) {
    let enrollmentId = scEnrollment.enrollmentId.toString();
    let enrollment = Enrollment.load(enrollmentId);

    if (enrollment != null) {
      enrollment.sectionsCompleted = enrollment.sectionsCompleted.plus(ONE_BI);

      if (!totalSections.equals(ZERO_BI)) {
        enrollment.completionPercentage = calculateCompletionPercentage(
          enrollment.sectionsCompleted,
          totalSections,
        );
      }

      enrollment.lastActivityAt = event.block.timestamp;
      enrollment.lastTxHash = event.transaction.hash;
      enrollment.save();

      log.info("Enrollment {} updated - Sections: {}/{}, Percentage: {}%", [
        enrollmentId,
        enrollment.sectionsCompleted.toString(),
        totalSections.toString(),
        enrollment.completionPercentage.toString(),
      ]);
    } else {
      log.warning("Enrollment not found: {}", [enrollmentId]);
    }
  } else {
    log.warning("StudentCourseEnrollment not found: {}", [scEnrollmentId]);
  }

  updateNetworkStats(event, "SECTION_COMPLETED");

  let course = Course.load(courseId.toString());
  let courseName =
    course != null ? course.title : "Course #" + courseId.toString();
  let scEnrollmentId2 =
    studentAddress.toHexString().toLowerCase() + "-" + courseId.toString();
  let scEnrollment2 = StudentCourseEnrollment.load(scEnrollmentId2);
  let enrollmentIdStr =
    scEnrollment2 != null ? scEnrollment2.enrollmentId.toString() : "";

  createActivityEvent(
    event,
    "SECTION_COMPLETED",
    studentAddress,
    "Completed section in " + courseName,
    courseId.toString(),
    enrollmentIdStr != null && enrollmentIdStr != "" ? enrollmentIdStr : null,
    null,
    null,
  );

  log.info(
    "ActivityEvent created for SectionCompleted - Student: {}, Course: {}, Enrollment: {}",
    [
      studentAddress.toHexString(),
      courseId.toString(),
      enrollmentIdStr != null ? enrollmentIdStr : "",
    ],
  );
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

  let course = Course.load(courseIdStr);
  if (course != null) {
    course.completedStudents = course.completedStudents.plus(ONE_BI);

    if (!course.totalEnrollments.equals(ZERO_BI)) {
      course.completionRate = calculateCompletionRate(
        course.completedStudents,
        course.totalEnrollments,
      );
    }

    course.updatedAt = event.block.timestamp;
    course.save();
  }

  let student = getOrCreateUserProfile(
    studentAddress,
    event.block.timestamp,
    event.transaction.hash,
    event.block.number,
  );
  student.coursesCompleted = student.coursesCompleted.plus(ONE_BI);
  student.completionsThisMonth = student.completionsThisMonth.plus(ONE_BI);
  student.lastActivityAt = event.block.timestamp;
  student.updatedAt = event.block.timestamp;
  student.lastTxHash = event.transaction.hash;
  student.save();

  let scEnrollmentId =
    studentAddress.toHexString().toLowerCase() + "-" + courseId.toString();
  let scEnrollment = StudentCourseEnrollment.load(scEnrollmentId);

  if (scEnrollment != null) {
    let enrollmentId = scEnrollment.enrollmentId.toString();
    let enrollment = Enrollment.load(enrollmentId);

    if (enrollment != null) {
      enrollment.isCompleted = true;
      enrollment.completionDate = event.block.timestamp;
      enrollment.completionPercentage = BigInt.fromI32(100);
      enrollment.status = "COMPLETED";
      enrollment.lastActivityAt = event.block.timestamp;
      enrollment.lastTxHash = event.transaction.hash;
      enrollment.save();

      log.info("Enrollment {} marked as completed at {}", [
        enrollmentId,
        event.block.timestamp.toString(),
      ]);
    } else {
      log.warning("Enrollment not found: {}", [enrollmentId]);
    }
  } else {
    log.warning("StudentCourseEnrollment not found: {}", [scEnrollmentId]);
  }

  updateNetworkStats(event, "COURSE_COMPLETED");

  let courseForCompleted = Course.load(courseIdStr);
  let courseName =
    courseForCompleted != null
      ? courseForCompleted.title
      : "Course #" + courseIdStr;
  let scEnrollmentId2 =
    studentAddress.toHexString().toLowerCase() + "-" + courseId.toString();
  let scEnrollment2 = StudentCourseEnrollment.load(scEnrollmentId2);
  let enrollmentIdStr =
    scEnrollment2 != null ? scEnrollment2.enrollmentId.toString() : "";

  createActivityEvent(
    event,
    "COURSE_COMPLETED",
    studentAddress,
    "Completed course: " + courseName,
    courseIdStr,
    enrollmentIdStr != null && enrollmentIdStr != "" ? enrollmentIdStr : null,
    null,
    null,
  );

  log.info(
    "ActivityEvent created for CourseCompleted - Student: {}, Course: {}, Enrollment: {}",
    [
      studentAddress.toHexString(),
      courseIdStr,
      enrollmentIdStr != null ? enrollmentIdStr : "",
    ],
  );
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

  let course = Course.load(courseIdStr);
  if (course != null) {
    if (course.completedStudents.gt(ZERO_BI)) {
      course.completedStudents = course.completedStudents.minus(ONE_BI);

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

  let student = getOrCreateUserProfile(
    studentAddress,
    event.block.timestamp,
    event.transaction.hash,
    event.block.number,
  );
  if (student.coursesCompleted.gt(ZERO_BI)) {
    student.coursesCompleted = student.coursesCompleted.minus(ONE_BI);
  }
  student.lastActivityAt = event.block.timestamp;
  student.updatedAt = event.block.timestamp;
  student.lastTxHash = event.transaction.hash;
  student.save();

  let scEnrollmentId =
    studentAddress.toHexString().toLowerCase() + "-" + courseId.toString();
  let scEnrollment = StudentCourseEnrollment.load(scEnrollmentId);

  if (scEnrollment != null) {
    let enrollmentId = scEnrollment.enrollmentId.toString();
    let enrollment = Enrollment.load(enrollmentId);

    if (enrollment != null) {
      enrollment.isCompleted = false;
      enrollment.completionDate = ZERO_BI;
      enrollment.completionPercentage = ZERO_BI;
      enrollment.sectionsCompleted = ZERO_BI;
      enrollment.status = determineEnrollmentStatus(false, false);
      enrollment.lastActivityAt = event.block.timestamp;
      enrollment.lastTxHash = event.transaction.hash;
      enrollment.save();

      log.info("Enrollment {} progress reset", [enrollmentId]);
    } else {
      log.warning("Enrollment not found: {}", [enrollmentId]);
    }
  } else {
    log.warning("StudentCourseEnrollment not found: {}", [scEnrollmentId]);
  }

  updateNetworkStats(event, "PROGRESS_RESET");

  let courseForReset = Course.load(courseIdStr);
  let courseName =
    courseForReset != null ? courseForReset.title : "Course #" + courseIdStr;

  createActivityEvent(
    event,
    "PROGRESS_RESET",
    studentAddress,
    "Progress reset for " + courseName,
    courseIdStr,
    null,
    null,
    null,
  );

  log.info(
    "ActivityEvent created for ProgressReset - Student: {}, Course: {}",
    [studentAddress.toHexString(), courseIdStr],
  );
}
