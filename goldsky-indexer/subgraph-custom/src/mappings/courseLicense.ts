import {
  BigInt,
  BigDecimal,
  Bytes,
  Address,
  log,
} from "@graphprotocol/graph-ts";
import {
  LicenseMinted,
  LicenseRenewed,
  LicenseExpired,
  RevenueRecorded,
  BaseURIUpdated,
  PlatformFeePercentageUpdated,
  PlatformWalletUpdated,
} from "../../generated/CourseLicense/CourseLicense";
import {
  Enrollment,
  Course,
  UserProfile,
  StudentCourseEnrollment,
  TeacherStudent,
  ContractConfigState,
  AdminConfigEvent,
} from "../../generated/schema";

import {
  updateNetworkStats,
  incrementPlatformCounter,
  addPlatformRevenue,
  updateAverageCoursePrice,
} from "./helpers/networkStatsHelper";
import { createActivityEvent } from "./helpers/activityEventHelper";

// ============================================================================
// CONSTANTS
// ============================================================================

const ZERO_BI = BigInt.fromI32(0);
const ONE_BI = BigInt.fromI32(1);
const ZERO_BD = BigDecimal.fromString("0");
const WEI_TO_ETH = BigDecimal.fromString("1000000000000000000");
const PLATFORM_FEE_PERCENTAGE = BigInt.fromI32(10);
const BASIS_POINTS = BigInt.fromI32(100);
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const COURSE_LICENSE_NAME = "CourseLicense";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert Wei (BigInt) to ETH (BigDecimal)
 */
function weiToEth(wei: BigInt): BigDecimal {
  return wei.toBigDecimal().div(WEI_TO_ETH);
}

function getOrCreateContractConfig(
  contractAddress: Address,
): ContractConfigState {
  let id = contractAddress.toHexString().toLowerCase();
  let config = ContractConfigState.load(id);

  if (!config) {
    config = new ContractConfigState(id);
    config.contractAddress = Bytes.fromHexString(contractAddress.toHexString());
    config.contractType = COURSE_LICENSE_NAME;
    config.contractName = COURSE_LICENSE_NAME;
    config.platformFeePercentage = ZERO_BI;
    config.platformWallet = Bytes.fromHexString(ZERO_ADDRESS);
    config.licenseURI = "";
    config.licenseBaseURI = "";
    config.isPaused = false;
    config.lastUpdated = ZERO_BI;
    config.lastUpdateBlock = ZERO_BI;
    config.lastUpdateTxHash = Bytes.fromHexString(ZERO_ADDRESS);
  }

  return config;
}

function createAdminConfigEvent(
  eventId: string,
  adminAddress: Bytes,
  eventType: string,
  configKey: string,
  oldValue: string,
  newValue: string,
  contractName: string,
  description: string,
  timestamp: BigInt,
  blockNumber: BigInt,
  txHash: Bytes,
): void {
  let adminEvent = new AdminConfigEvent(eventId);

  adminEvent.admin = adminAddress;
  adminEvent.type = eventType;
  adminEvent.configKey = configKey;
  adminEvent.oldValue = oldValue;
  adminEvent.newValue = newValue;
  adminEvent.affectedContract = contractName;
  adminEvent.description = description;
  adminEvent.timestamp = timestamp;
  adminEvent.blockNumber = blockNumber;
  adminEvent.transactionHash = txHash;

  adminEvent.save();
}

// ============================================================================

/**
 * Calculate platform fee (2% of price)
 */
function calculatePlatformFee(price: BigInt): BigInt {
  return price.times(PLATFORM_FEE_PERCENTAGE).div(BASIS_POINTS);
}

/**
 * Calculate creator revenue (98% of price)
 */
function calculateCreatorRevenue(price: BigInt): BigInt {
  let platformFee = calculatePlatformFee(price);
  return price.minus(platformFee);
}

/**
 * Load or create UserProfile entity
 */
function getOrCreateUserProfile(
  address: Bytes,
  timestamp: BigInt,
  txHash: Bytes,
  blockNumber: BigInt,
): UserProfile {
  let id = address.toHexString().toLowerCase();
  let profile = UserProfile.load(id);
  let isNewUser = profile == null;

  if (isNewUser) {
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

    // User counter will be incremented when enrollment is created
  }

  return profile as UserProfile;
}

/**
 * Determine enrollment status based on expiry and completion
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

/**
 * Calculate completion rate for course
 */
function calculateCompletionRate(completed: BigInt, total: BigInt): BigDecimal {
  if (total.equals(ZERO_BI)) {
    return ZERO_BD;
  }
  return completed
    .toBigDecimal()
    .div(total.toBigDecimal())
    .times(BigDecimal.fromString("100"));
}

// ============================================================================
// LICENSE LIFECYCLE EVENT HANDLERS
// ============================================================================

/**
 * Handler for LicenseMinted event
 * Creates new Enrollment entity and updates Course + UserProfile statistics
 */
export function handleLicenseMinted(event: LicenseMinted): void {
  let enrollmentId = event.params.tokenId.toString();
  let courseId = event.params.courseId.toString();
  let studentAddress = event.params.student;

  // Create Enrollment entity
  let enrollment = new Enrollment(enrollmentId);

  // Core identity
  enrollment.student = studentAddress;
  enrollment.courseId = event.params.courseId;

  // License details
  enrollment.durationMonths = event.params.durationMonths;
  enrollment.licenseExpiry = event.params.expiryTimestamp;
  enrollment.isActive = true;
  enrollment.status = "ACTIVE";

  // Payment & revenue
  enrollment.pricePaid = event.params.pricePaid;
  enrollment.pricePaidEth = weiToEth(event.params.pricePaid);
  enrollment.platformFee = calculatePlatformFee(event.params.pricePaid);
  enrollment.creatorRevenue = calculateCreatorRevenue(event.params.pricePaid);

  // Renewal tracking
  enrollment.totalRenewals = ZERO_BI;
  enrollment.lastRenewedAt = ZERO_BI;
  enrollment.totalSpent = event.params.pricePaid;
  enrollment.totalSpentEth = weiToEth(event.params.pricePaid);

  // Progress & completion
  enrollment.isCompleted = false;
  enrollment.completionDate = ZERO_BI;
  enrollment.completionPercentage = ZERO_BI;
  enrollment.sectionsCompleted = ZERO_BI;

  // Certificate integration
  enrollment.hasCertificate = false;
  enrollment.certificateTokenId = ZERO_BI;
  enrollment.certificateAddedAt = ZERO_BI;
  enrollment.certificatePrice = ZERO_BI;

  // Timestamps
  enrollment.purchasedAt = event.block.timestamp;
  enrollment.lastActivityAt = event.block.timestamp;

  // Transaction references
  enrollment.mintTxHash = event.transaction.hash;
  enrollment.lastTxHash = event.transaction.hash;
  enrollment.blockNumber = event.block.number;

  // Set course reference
  enrollment.course = courseId;

  // Create/update UserProfile for student
  let userProfile = getOrCreateUserProfile(
    studentAddress,
    event.block.timestamp,
    event.transaction.hash,
    event.block.number,
  );

  enrollment.userProfile = userProfile.id;
  enrollment.save();

  // Create StudentCourseEnrollment entity for O(1) lookups
  let scEnrollmentId =
    studentAddress.toHexString() + "-" + event.params.courseId.toString();
  let scEnrollment = new StudentCourseEnrollment(scEnrollmentId);
  scEnrollment.student = studentAddress;
  scEnrollment.studentProfile = userProfile.id;
  scEnrollment.courseId = event.params.courseId;
  scEnrollment.course = courseId;
  scEnrollment.enrollment = enrollmentId;
  scEnrollment.enrollmentId = event.params.tokenId;
  scEnrollment.createdAt = event.block.timestamp;
  scEnrollment.txHash = event.transaction.hash;
  scEnrollment.blockNumber = event.block.number;
  scEnrollment.save();

  // Update Course statistics
  let course = Course.load(courseId);
  if (course != null) {
    course.totalEnrollments = course.totalEnrollments.plus(ONE_BI);
    course.activeEnrollments = course.activeEnrollments.plus(ONE_BI);
    course.totalRevenue = course.totalRevenue.plus(event.params.pricePaid);
    course.totalRevenueEth = weiToEth(course.totalRevenue);
    course.updatedAt = event.block.timestamp;
    course.save();

    // Update creator's UserProfile revenue and track unique students
    let creator = UserProfile.load(course.creator.toHexString().toLowerCase());
    if (creator != null) {
      let creatorRevenue = calculateCreatorRevenue(event.params.pricePaid);
      creator.totalRevenue = creator.totalRevenue.plus(creatorRevenue);
      creator.totalRevenueEth = weiToEth(creator.totalRevenue);
      creator.lastActivityAt = event.block.timestamp;
      creator.updatedAt = event.block.timestamp;

      // Track unique student relationship
      let teacherStudentId =
        course.creator.toHexString().toLowerCase() +
        "-" +
        studentAddress.toHexString().toLowerCase();
      let teacherStudent = TeacherStudent.load(teacherStudentId);

      if (teacherStudent == null) {
        // New unique student - create relationship and increment counter
        teacherStudent = new TeacherStudent(teacherStudentId);
        teacherStudent.teacher = course.creator;
        teacherStudent.teacherProfile = creator.id;
        teacherStudent.student = studentAddress;
        teacherStudent.studentProfile = userProfile.id;
        teacherStudent.firstEnrollmentDate = event.block.timestamp;
        teacherStudent.lastActivityDate = event.block.timestamp;
        teacherStudent.totalCoursesBought = ZERO_BI;
        teacherStudent.totalSpent = ZERO_BI;
        teacherStudent.totalSpentEth = ZERO_BD;
        teacherStudent.createdTxHash = event.transaction.hash;
        teacherStudent.lastTxHash = event.transaction.hash;
        teacherStudent.blockNumber = event.block.number;

        // Increment unique students count
        creator.totalStudents = creator.totalStudents.plus(ONE_BI);
      }

      // Update teacher-student relationship stats
      teacherStudent.totalCoursesBought =
        teacherStudent.totalCoursesBought.plus(ONE_BI);
      teacherStudent.totalSpent = teacherStudent.totalSpent.plus(
        event.params.pricePaid,
      );
      teacherStudent.totalSpentEth = weiToEth(teacherStudent.totalSpent);
      teacherStudent.lastActivityDate = event.block.timestamp;
      teacherStudent.lastTxHash = event.transaction.hash;
      teacherStudent.save();

      creator.save();
    }
  }

  // Update student's UserProfile
  userProfile.coursesEnrolled = userProfile.coursesEnrolled.plus(ONE_BI);
  userProfile.activeEnrollments = userProfile.activeEnrollments.plus(ONE_BI);
  userProfile.totalSpentOnCourses = userProfile.totalSpentOnCourses.plus(
    event.params.pricePaid,
  );
  userProfile.totalSpentOnCoursesEth = weiToEth(
    userProfile.totalSpentOnCourses,
  );
  userProfile.totalSpent = userProfile.totalSpent.plus(event.params.pricePaid);
  userProfile.totalSpentEth = weiToEth(userProfile.totalSpent);

  // Set first enrollment timestamp if not set
  if (userProfile.firstEnrollmentAt.equals(ZERO_BI)) {
    userProfile.firstEnrollmentAt = event.block.timestamp;
  }

  // Update growth metrics
  userProfile.enrollmentsThisMonth =
    userProfile.enrollmentsThisMonth.plus(ONE_BI);

  userProfile.lastActivityAt = event.block.timestamp;
  userProfile.updatedAt = event.block.timestamp;
  userProfile.lastTxHash = event.transaction.hash;
  userProfile.save();

  // Track network stats
  updateNetworkStats(event, "LICENSE_MINTED");
  incrementPlatformCounter("ENROLLMENT", event);

  // Track platform revenue
  addPlatformRevenue(
    event.params.pricePaid,
    weiToEth(event.params.pricePaid),
    enrollment.platformFee,
    weiToEth(enrollment.platformFee),
    enrollment.creatorRevenue,
    weiToEth(enrollment.creatorRevenue),
    event,
  );

  updateAverageCoursePrice(event);

  // Create activity event
  let courseForEvent = Course.load(courseId.toString());
  let courseName =
    courseForEvent != null ? courseForEvent.title : "Course #" + courseId;
  createActivityEvent(
    event,
    "LICENSE_MINTED",
    studentAddress,
    "Enrolled in " + courseName,
    courseId.toString(),
    enrollmentId.toString(),
    null,
    null,
  );

  log.info(
    "ActivityEvent created for LicenseMinted - Student: {}, CourseId: {}, EnrollmentId: {}",
    [
      studentAddress.toHexString(),
      courseId.toString(),
      enrollmentId.toString(),
    ],
  );
}

/**
 * Handler for LicenseRenewed event
 * Updates existing Enrollment with renewal data and payment tracking
 */
export function handleLicenseRenewed(event: LicenseRenewed): void {
  let enrollmentId = event.params.tokenId.toString();
  let enrollment = Enrollment.load(enrollmentId);

  if (enrollment != null) {
    // Update license details
    enrollment.durationMonths = event.params.durationMonths;
    enrollment.licenseExpiry = event.params.expiryTimestamp;
    enrollment.isActive = true;
    enrollment.status = determineEnrollmentStatus(
      false,
      enrollment.isCompleted,
    );

    // Update renewal tracking
    enrollment.totalRenewals = enrollment.totalRenewals.plus(ONE_BI);
    enrollment.lastRenewedAt = event.block.timestamp;
    enrollment.totalSpent = enrollment.totalSpent.plus(event.params.pricePaid);
    enrollment.totalSpentEth = weiToEth(enrollment.totalSpent);

    // Update timestamps
    enrollment.lastActivityAt = event.block.timestamp;
    enrollment.lastTxHash = event.transaction.hash;

    enrollment.save();

    // Update Course revenue
    let course = Course.load(enrollment.courseId.toString());
    if (course != null) {
      course.totalRevenue = course.totalRevenue.plus(event.params.pricePaid);
      course.totalRevenueEth = weiToEth(course.totalRevenue);
      course.updatedAt = event.block.timestamp;
      course.save();

      // Update creator's revenue
      let creator = UserProfile.load(
        course.creator.toHexString().toLowerCase(),
      );
      if (creator != null) {
        let creatorRevenue = calculateCreatorRevenue(event.params.pricePaid);
        creator.totalRevenue = creator.totalRevenue.plus(creatorRevenue);
        creator.totalRevenueEth = weiToEth(creator.totalRevenue);
        creator.revenueThisMonth =
          creator.revenueThisMonth.plus(creatorRevenue);
        creator.revenueThisMonthEth = weiToEth(creator.revenueThisMonth);
        creator.lastActivityAt = event.block.timestamp;
        creator.updatedAt = event.block.timestamp;
        creator.save();
      }
    }

    // Update student's spending statistics
    let student = UserProfile.load(
      enrollment.student.toHexString().toLowerCase(),
    );
    if (student != null) {
      student.totalSpentOnCourses = student.totalSpentOnCourses.plus(
        event.params.pricePaid,
      );
      student.totalSpentOnCoursesEth = weiToEth(student.totalSpentOnCourses);
      student.totalSpent = student.totalSpent.plus(event.params.pricePaid);
      student.totalSpentEth = weiToEth(student.totalSpent);
      student.lastActivityAt = event.block.timestamp;
      student.updatedAt = event.block.timestamp;
      student.lastTxHash = event.transaction.hash;
      student.save();
    }
  }

  // Track network stats
  updateNetworkStats(event, "LICENSE_RENEWED");

  // Track platform revenue for renewal
  let platformFee = calculatePlatformFee(event.params.pricePaid);
  let creatorRevenue = calculateCreatorRevenue(event.params.pricePaid);
  addPlatformRevenue(
    event.params.pricePaid,
    weiToEth(event.params.pricePaid),
    platformFee,
    weiToEth(platformFee),
    creatorRevenue,
    weiToEth(creatorRevenue),
    event,
  );

  updateAverageCoursePrice(event);

  // Create activity event
  let enrollmentEntity = Enrollment.load(enrollmentId);
  if (enrollmentEntity != null) {
    let courseForRenewal = Course.load(enrollmentEntity.courseId.toString());
    let courseName =
      courseForRenewal != null
        ? courseForRenewal.title
        : "Course #" + enrollmentEntity.courseId.toString();
    createActivityEvent(
      event,
      "LICENSE_RENEWED",
      event.params.student,
      "Renewed license for " + courseName,
      enrollmentEntity.courseId.toString(),
      enrollmentId,
      null,
      null,
    );
  }
}

/**
 * Handler for LicenseExpired event
 * Marks enrollment as expired and updates Course activeEnrollments count
 */
export function handleLicenseExpired(event: LicenseExpired): void {
  let enrollmentId = event.params.tokenId.toString();
  let enrollment = Enrollment.load(enrollmentId);

  if (enrollment != null) {
    // Mark as expired
    enrollment.isActive = false;
    enrollment.status = determineEnrollmentStatus(true, enrollment.isCompleted);
    enrollment.lastActivityAt = event.block.timestamp;
    enrollment.save();

    // Update Course active enrollments count
    let course = Course.load(enrollment.courseId.toString());
    if (course != null) {
      course.activeEnrollments = course.activeEnrollments.minus(ONE_BI);
      course.updatedAt = event.block.timestamp;
      course.save();
    }

    // Update student's active enrollments count
    let student = UserProfile.load(
      enrollment.student.toHexString().toLowerCase(),
    );
    if (student != null) {
      student.activeEnrollments = student.activeEnrollments.minus(ONE_BI);
      student.lastActivityAt = event.block.timestamp;
      student.updatedAt = event.block.timestamp;
      student.save();
    }
  }

  // Track network stats
  updateNetworkStats(event, "LICENSE_EXPIRED");

  // Create activity event
  let course = Course.load(event.params.courseId.toString());
  let courseName =
    course != null
      ? course.title
      : "Course #" + event.params.courseId.toString();
  createActivityEvent(
    event,
    "LICENSE_EXPIRED",
    event.params.student,
    "License expired for " + courseName,
    event.params.courseId.toString(),
    enrollmentId,
    null,
    null,
  );
}

// ============================================================================
// REVENUE ANALYTICS EVENT HANDLERS
// ============================================================================

/**
 * Handler for RevenueRecorded event
 * Tracks revenue for analytics and reporting purposes
 * This is supplementary to the revenue tracking in mint/renew handlers
 */
export function handleRevenueRecorded(event: RevenueRecorded): void {
  let courseId = event.params.courseId.toString();
  let course = Course.load(courseId);

  if (course != null) {
    // Revenue is already updated in mint/renew handlers
    // This event is primarily for analytics and audit trail
    course.updatedAt = event.block.timestamp;
    course.save();

    // Update creator's monthly revenue tracking
    let creator = UserProfile.load(
      event.params.creator.toHexString().toLowerCase(),
    );
    if (creator != null) {
      // Monthly revenue tracking for growth metrics
      let creatorRevenue = calculateCreatorRevenue(event.params.amount);
      creator.revenueThisMonth = creator.revenueThisMonth.plus(creatorRevenue);
      creator.revenueThisMonthEth = weiToEth(creator.revenueThisMonth);
      creator.lastActivityAt = event.block.timestamp;
      creator.updatedAt = event.block.timestamp;
      creator.save();
    }
  }

  // Track network stats
  updateNetworkStats(event, "REVENUE_RECORDED");

  // Create activity event
  let courseForRevenue = Course.load(courseId);
  let courseName =
    courseForRevenue != null ? courseForRevenue.title : "Course #" + courseId;
  let creatorProfile =
    courseForRevenue != null
      ? UserProfile.load(courseForRevenue.creator.toHexString().toLowerCase())
      : null;
  if (creatorProfile != null) {
    createActivityEvent(
      event,
      "REVENUE_RECORDED",
      creatorProfile.address,
      "Revenue recorded for " + courseName,
      courseId.toString(),
      null,
      null,
      null,
    );

    log.info(
      "ActivityEvent created for RevenueRecorded - Creator: {}, CourseId: {}, Amount: {}",
      [
        event.params.creator.toHexString(),
        courseId.toString(),
        event.params.amount.toString(),
      ],
    );
  }
}

// ============================================================================
// ADMIN CONFIGURATION EVENT HANDLERS
// ============================================================================

export function handleBaseURIUpdated(event: BaseURIUpdated): void {
  let config = getOrCreateContractConfig(event.address);
  let oldURI = "";
  if (config.licenseBaseURI) {
    oldURI = config.licenseBaseURI as string;
  }

  config.licenseBaseURI = event.params.newBaseURI;
  config.lastUpdated = event.block.timestamp;
  config.lastUpdateBlock = event.block.number;
  config.lastUpdateTxHash = event.transaction.hash;
  config.save();

  let description = "Updated license base URI";

  let eventId =
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  createAdminConfigEvent(
    eventId,
    event.transaction.from,
    "URI_UPDATE",
    "licenseBaseURI",
    oldURI,
    event.params.newBaseURI,
    COURSE_LICENSE_NAME,
    description,
    event.block.timestamp,
    event.block.number,
    event.transaction.hash,
  );

  updateNetworkStats(event, "CONFIG_UPDATE");

  log.info("License base URI updated: {}", [event.params.newBaseURI]);
}

export function handlePlatformFeePercentageUpdated(
  event: PlatformFeePercentageUpdated,
): void {
  let config = getOrCreateContractConfig(event.address);
  let oldPercentageValue = ZERO_BI;

  if (config.platformFeePercentage) {
    oldPercentageValue = config.platformFeePercentage as BigInt;
  }

  config.platformFeePercentage = event.params.newPercentage;
  config.lastUpdated = event.block.timestamp;
  config.lastUpdateBlock = event.block.number;
  config.lastUpdateTxHash = event.transaction.hash;
  config.save();

  let description =
    "Updated platform fee percentage from " +
    oldPercentageValue.toString() +
    " to " +
    event.params.newPercentage.toString();

  let eventId =
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  createAdminConfigEvent(
    eventId,
    event.transaction.from,
    "FEE_UPDATE",
    "platformFeePercentage",
    oldPercentageValue.toString(),
    event.params.newPercentage.toString(),
    COURSE_LICENSE_NAME,
    description,
    event.block.timestamp,
    event.block.number,
    event.transaction.hash,
  );

  updateNetworkStats(event, "CONFIG_UPDATE");

  log.info("Platform fee percentage updated: {}", [
    event.params.newPercentage.toString(),
  ]);
}

export function handlePlatformWalletUpdatedLicense(
  event: PlatformWalletUpdated,
): void {
  let config = getOrCreateContractConfig(event.address);
  let oldWalletValue = ZERO_ADDRESS;
  if (config.platformWallet) {
    oldWalletValue = (config.platformWallet as Bytes).toHexString();
  }

  config.platformWallet = event.params.newWallet;
  config.lastUpdated = event.block.timestamp;
  config.lastUpdateBlock = event.block.number;
  config.lastUpdateTxHash = event.transaction.hash;
  config.save();

  let description =
    "Updated platform wallet from " +
    oldWalletValue +
    " to " +
    event.params.newWallet.toHexString();

  let eventId =
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  createAdminConfigEvent(
    eventId,
    event.transaction.from,
    "WALLET_UPDATE",
    "platformWallet",
    oldWalletValue,
    event.params.newWallet.toHexString(),
    COURSE_LICENSE_NAME,
    description,
    event.block.timestamp,
    event.block.number,
    event.transaction.hash,
  );

  updateNetworkStats(event, "CONFIG_UPDATE");

  log.info("Platform wallet updated to: {}", [
    event.params.newWallet.toHexString(),
  ]);
}

// ============================================================================
// END OF FILE
// ============================================================================
