import { BigDecimal, BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import {
  BaseRouteUpdated,
  CertificateMinted,
  CertificatePaymentRecorded,
  CertificateRevoked,
  CertificateUpdated,
  CourseAddedToCertificate,
  CourseAdditionFeeUpdated,
  CourseCertificatePriceSet,
  DefaultBaseRouteUpdated,
  PlatformNameUpdated,
} from "../../generated/CertificateManager/CertificateManager";
import {
  Certificate,
  CertificateCourse,
  Course,
  CourseAddedToCertificateEvent,
  Enrollment,
  PlatformStats,
  UserProfile,
} from "../../generated/schema";

// ============================================================================
// CONSTANTS
// ============================================================================

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_BIGINT = BigInt.fromI32(0);
const ZERO_BIGDECIMAL = BigDecimal.fromString("0");
const ONE_BIGINT = BigInt.fromI32(1);
const WEI_TO_ETH = BigDecimal.fromString("1000000000000000000");

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function weiToEth(wei: BigInt): BigDecimal {
  return wei.toBigDecimal().div(WEI_TO_ETH);
}

function getOrCreateUserProfile(address: Bytes): UserProfile {
  let profile = UserProfile.load(address.toHexString());

  if (profile == null) {
    profile = new UserProfile(address.toHexString());
    profile.address = address;

    // Initialize all fields (same as courseFactory.ts)
    profile.coursesEnrolled = ZERO_BIGINT;
    profile.coursesCompleted = ZERO_BIGINT;
    profile.activeEnrollments = ZERO_BIGINT;
    profile.totalSpentOnCourses = ZERO_BIGINT;
    profile.totalSpentOnCoursesEth = ZERO_BIGDECIMAL;
    profile.totalSpentOnCertificates = ZERO_BIGINT;
    profile.totalSpentOnCertificatesEth = ZERO_BIGDECIMAL;
    profile.totalSpent = ZERO_BIGINT;
    profile.totalSpentEth = ZERO_BIGDECIMAL;
    profile.coursesCreated = ZERO_BIGINT;
    profile.activeCoursesCreated = ZERO_BIGINT;
    profile.deletedCoursesCreated = ZERO_BIGINT;
    profile.totalStudents = ZERO_BIGINT;
    profile.totalRevenue = ZERO_BIGINT;
    profile.totalRevenueEth = ZERO_BIGDECIMAL;
    profile.averageRating = ZERO_BIGDECIMAL;
    profile.totalRatingsReceived = ZERO_BIGINT;
    profile.hasCertificate = false;
    profile.certificateTokenId = ZERO_BIGINT;
    profile.certificateName = "";
    profile.totalCoursesInCertificate = ZERO_BIGINT;
    profile.certificateMintedAt = ZERO_BIGINT;
    profile.certificateLastUpdated = ZERO_BIGINT;
    profile.totalSectionsCompleted = ZERO_BIGINT;
    profile.lastActivityAt = ZERO_BIGINT;
    profile.firstEnrollmentAt = ZERO_BIGINT;
    profile.firstCourseCreatedAt = ZERO_BIGINT;
    profile.enrollmentsThisMonth = ZERO_BIGINT;
    profile.completionsThisMonth = ZERO_BIGINT;
    profile.revenueThisMonth = ZERO_BIGINT;
    profile.revenueThisMonthEth = ZERO_BIGDECIMAL;
    profile.createdAt = ZERO_BIGINT;
    profile.updatedAt = ZERO_BIGINT;
    profile.firstTxHash = Bytes.fromHexString(ZERO_ADDRESS);
    profile.lastTxHash = Bytes.fromHexString(ZERO_ADDRESS);
    profile.blockNumber = ZERO_BIGINT;
    profile.isBlacklisted = false;
    profile.blacklistedAt = ZERO_BIGINT;
    profile.blacklistedBy = Bytes.fromHexString(ZERO_ADDRESS);
  }

  return profile;
}

// ============================================================================
// EVENT HANDLERS - CERTIFICATE LIFECYCLE
// ============================================================================

/**
 * Handle CertificateMinted event
 * ✅ CRITICAL FIX: Creates Certificate entity
 *
 * Frontend Use Case:
 * - Certificate page needs to query: certificate.completedCourses
 * - Previously had to manually join enrollments (slow for 50+ courses)
 * - Now efficient query: { certificate(id: "1") { completedCourses { course { title } } } }
 *
 * Best Practice: Use @derivedFrom for one-to-many relationships
 * Reference: https://thegraph.com/docs/en/subgraphs/best-practices/derivedfrom/
 */
export function handleCertificateMinted(event: CertificateMinted): void {
  let tokenId = event.params.tokenId;
  let certificateId = tokenId.toString();

  // Create Certificate entity
  let certificate = new Certificate(certificateId);
  certificate.tokenId = tokenId;
  certificate.owner = event.params.owner.toHexString();
  certificate.recipientAddress = event.params.owner; // ✅ FIX: Add direct address field for queries
  certificate.recipientName = event.params.recipientName;
  certificate.isValid = true;
  certificate.totalCourses = ZERO_BIGINT; // Will be incremented when courses added
  certificate.totalRevenue = ZERO_BIGINT; // Initialize revenue tracking
  certificate.totalRevenueEth = ZERO_BIGDECIMAL; // Initialize ETH value

  // Initialize new fields for QR code routing
  certificate.platformName = "EduVerse"; // Default platform name
  // NOTE: baseRoute should be set by frontend when calling mintOrUpdateCertificate
  // If not provided in event, will be empty and can be updated later via updateBaseRoute
  certificate.baseRoute = ""; // Will be set from contract's defaultBaseRoute or frontend call
  certificate.ipfsCID = event.params.ipfsCID;
  certificate.paymentReceiptHash = event.params.paymentReceiptHash;

  certificate.createdAt = event.block.timestamp;
  certificate.lastUpdated = event.block.timestamp;
  certificate.mintTxHash = event.transaction.hash;
  certificate.blockNumber = event.block.number;
  certificate.save();

  // Update UserProfile
  let profile = getOrCreateUserProfile(event.params.owner);
  profile.hasCertificate = true;
  profile.certificateTokenId = tokenId;
  profile.certificateName = event.params.recipientName;
  profile.certificateMintedAt = event.block.timestamp;
  profile.certificateLastUpdated = event.block.timestamp;
  profile.totalCoursesInCertificate = ZERO_BIGINT;

  // Track spending on certificates (first mint fee)
  let mintPrice = event.params.pricePaid;
  profile.totalSpentOnCertificates =
    profile.totalSpentOnCertificates.plus(mintPrice);
  profile.totalSpentOnCertificatesEth = weiToEth(
    profile.totalSpentOnCertificates,
  );
  profile.totalSpent = profile.totalSpent.plus(mintPrice);
  profile.totalSpentEth = weiToEth(profile.totalSpent);

  profile.updatedAt = event.block.timestamp;
  profile.lastTxHash = event.transaction.hash;
  profile.lastActivityAt = event.block.timestamp;
  profile.save();

  log.info("[Certificate] Minted tokenId: {} for owner: {}", [
    certificateId,
    event.params.owner.toHexString(),
  ]);
}

/**
 * Handle CourseAddedToCertificate event
 * ✅ CRITICAL FIX: Creates CertificateCourse junction entity
 *
 * Business Logic:
 * - First course added to certificate: 10% platform fee (isFirstCourse = true)
 * - Additional courses: 2% platform fee (isFirstCourse = false)
 *
 * Frontend Query Example:
 * ```
 * query {
 *   certificate(id: "1") {
 *     completedCourses {
 *       course {
 *         title
 *         thumbnailCID
 *       }
 *       addedAt
 *       pricePaid
 *       isFirstCourse  # Shows if this was first (10% fee) or not (2%)
 *     }
 *   }
 * }
 * ```
 */
export function handleCourseAddedToCertificate(
  event: CourseAddedToCertificate,
): void {
  let tokenId = event.params.tokenId;
  let courseId = event.params.courseId;
  let certificateId = tokenId.toString();
  let owner = event.params.owner;

  // Load or create Certificate entity
  let certificate = Certificate.load(certificateId);
  if (certificate == null) {
    // Edge case: Certificate not minted yet (shouldn't happen, but defensive coding)
    certificate = new Certificate(certificateId);
    certificate.tokenId = tokenId;
    certificate.owner = owner.toHexString();
    certificate.recipientAddress = owner; // ✅ FIX: Add direct address field for queries
    certificate.recipientName = "Unknown"; // Will be updated by CertificateMinted
    certificate.isValid = true;
    certificate.totalCourses = ZERO_BIGINT;
    certificate.totalRevenue = ZERO_BIGINT;
    certificate.totalRevenueEth = ZERO_BIGDECIMAL;
    certificate.platformName = "EduVerse";
    // NOTE: baseRoute inherited from existing certificate or set by contract
    certificate.baseRoute = ""; // Will be set from contract's defaultBaseRoute
    certificate.ipfsCID = event.params.newIpfsCID;
    certificate.paymentReceiptHash = event.params.paymentReceiptHash;
    certificate.createdAt = event.block.timestamp;
    certificate.lastUpdated = event.block.timestamp;
    certificate.mintTxHash = event.transaction.hash;
    certificate.blockNumber = event.block.number;
  }

  // Determine if this is the first course (10% fee) or not (2% fee)
  let isFirstCourse = certificate.totalCourses.equals(ZERO_BIGINT);

  // Create CertificateCourse junction entity
  let certCourseId = certificateId + "-" + courseId.toString();
  let certCourse = new CertificateCourse(certCourseId);
  certCourse.certificate = certificateId;
  certCourse.course = courseId.toString();

  // Link to Enrollment for payment/completion data
  // Enrollment ID format: "studentAddress-courseId"
  let enrollmentId = owner.toHexString() + "-" + courseId.toString();
  certCourse.enrollment = enrollmentId;

  certCourse.addedAt = event.block.timestamp;
  certCourse.pricePaid = event.params.pricePaid;
  certCourse.pricePaidEth = weiToEth(event.params.pricePaid);
  certCourse.isFirstCourse = isFirstCourse;
  certCourse.txHash = event.transaction.hash;
  certCourse.blockNumber = event.block.number;
  certCourse.save();

  // ✅ FRONTEND FIX: Create CourseAddedToCertificateEvent entity
  let eventId =
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let courseEvent = new CourseAddedToCertificateEvent(eventId);
  courseEvent.tokenId = tokenId;
  courseEvent.certificate = certificateId;
  courseEvent.courseId = courseId;
  courseEvent.course = courseId.toString();
  courseEvent.student = owner;
  courseEvent.userProfile = owner.toHexString();
  courseEvent.pricePaid = event.params.pricePaid;
  courseEvent.pricePaidEth = weiToEth(event.params.pricePaid);
  courseEvent.blockTimestamp = event.block.timestamp;
  courseEvent.blockNumber = event.block.number;
  courseEvent.transactionHash = event.transaction.hash;
  courseEvent.save();

  // Update Certificate entity
  certificate.totalCourses = certificate.totalCourses.plus(ONE_BIGINT);
  certificate.lastUpdated = event.block.timestamp;
  certificate.ipfsCID = event.params.newIpfsCID; // Update certificate image
  certificate.save();

  // Update UserProfile
  let profile = getOrCreateUserProfile(owner);
  profile.totalCoursesInCertificate =
    profile.totalCoursesInCertificate.plus(ONE_BIGINT);
  profile.certificateLastUpdated = event.block.timestamp;

  // Track spending on adding courses to certificate
  let addPrice = event.params.pricePaid;
  profile.totalSpentOnCertificates =
    profile.totalSpentOnCertificates.plus(addPrice);
  profile.totalSpentOnCertificatesEth = weiToEth(
    profile.totalSpentOnCertificates,
  );
  profile.totalSpent = profile.totalSpent.plus(addPrice);
  profile.totalSpentEth = weiToEth(profile.totalSpent);

  profile.updatedAt = event.block.timestamp;
  profile.lastActivityAt = event.block.timestamp;
  profile.save();

  // Update Enrollment entity to link certificate
  let enrollment = Enrollment.load(enrollmentId);
  if (enrollment != null) {
    enrollment.hasCertificate = true;
    enrollment.certificateTokenId = tokenId;
    enrollment.certificateAddedAt = event.block.timestamp;
    enrollment.certificatePrice = addPrice;
    enrollment.certificate = certificateId; // Link to Certificate entity
    enrollment.save();
  }

  // Update Course creator revenue (90% or 98% goes to creator)
  let course = Course.load(courseId.toString());
  if (course != null) {
    // Calculate creator revenue based on platform fee
    // First course: 10% platform fee → 90% to creator
    // Additional: 2% platform fee → 98% to creator
    let platformFeePercent = isFirstCourse ? 1000 : 200; // 10% or 2% (scaled by 10000)
    let platformFee = addPrice
      .times(BigInt.fromI32(platformFeePercent))
      .div(BigInt.fromI32(10000));
    let creatorRevenue = addPrice.minus(platformFee);

    course.totalRevenue = course.totalRevenue.plus(creatorRevenue);
    course.totalRevenueEth = weiToEth(course.totalRevenue);
    course.save();

    // Update creator's UserProfile revenue
    let creator = UserProfile.load(course.creator.toHexString());
    if (creator != null) {
      creator.totalRevenue = creator.totalRevenue.plus(creatorRevenue);
      creator.totalRevenueEth = weiToEth(creator.totalRevenue);

      // Track revenue this month (simplified: just add to counter)
      creator.revenueThisMonth = creator.revenueThisMonth.plus(creatorRevenue);
      creator.revenueThisMonthEth = weiToEth(creator.revenueThisMonth);
      creator.save();
    }
  }
}

/**
 * Handle CertificateUpdated event
 * Updates certificate metadata (IPFS CID)
 */
export function handleCertificateUpdated(event: CertificateUpdated): void {
  let certificateId = event.params.tokenId.toString();
  let certificate = Certificate.load(certificateId);

  if (certificate != null) {
    certificate.ipfsCID = event.params.newIpfsCID;
    certificate.paymentReceiptHash = event.params.paymentReceiptHash;
    certificate.lastUpdated = event.block.timestamp;
    certificate.save();

    // Update UserProfile
    let profile = UserProfile.load(certificate.owner);
    if (profile != null) {
      profile.certificateLastUpdated = event.block.timestamp;
      profile.save();
    }
  }
}

/**
 * Handle CertificateRevoked event
 * Marks certificate as invalid (soft delete - preserves history)
 * ✅ FIXED: Updated signature to match contract
 */
export function handleCertificateRevoked(event: CertificateRevoked): void {
  let certificateId = event.params.tokenId.toString();
  let certificate = Certificate.load(certificateId);

  if (certificate != null) {
    certificate.isValid = false;
    certificate.lastUpdated = event.block.timestamp;
    certificate.save();

    log.info("Certificate revoked: {} - Reason: {}", [
      certificateId,
      event.params.reason,
    ]);
  }
}

/**
 * Handle CertificatePaymentRecorded event
 * Records payment receipt hash for certificate transactions
 * Note: This event only records the payment receipt hash, not amounts
 */
export function handleCertificatePaymentRecorded(
  event: CertificatePaymentRecorded,
): void {
  let certificateId = event.params.tokenId.toString();
  let certificate = Certificate.load(certificateId);

  if (!certificate) {
    log.error("CertificatePaymentRecorded: Certificate not found: {}", [
      certificateId,
    ]);
    return;
  }

  // Update certificate payment receipt hash
  certificate.paymentReceiptHash = event.params.paymentReceiptHash;
  certificate.lastUpdated = event.block.timestamp;
  certificate.save();

  log.info("[Certificate] Payment recorded for tokenId: {} by payer: {}", [
    certificateId,
    event.params.payer.toHexString(),
  ]);
}

// ============================================================================
// NEW EVENT HANDLERS - CERTIFICATE CONFIGURATION
// ============================================================================

/**
 * Handle BaseRouteUpdated event
 * Updates the base route for a specific certificate's QR code
 * ✅ NEW: Required for certificate QR code routing
 */
export function handleBaseRouteUpdated(event: BaseRouteUpdated): void {
  let certificateId = event.params.tokenId.toString();
  let certificate = Certificate.load(certificateId);

  if (certificate != null) {
    certificate.baseRoute = event.params.newBaseRoute;
    certificate.lastUpdated = event.block.timestamp;
    certificate.save();

    log.info("BaseRoute updated for certificate {}: {}", [
      certificateId,
      event.params.newBaseRoute,
    ]);
  }
}

/**
 * Handle DefaultBaseRouteUpdated event
 * Updates the default base route for all new certificates
 * ✅ NEW: Platform-wide QR code configuration
 */
export function handleDefaultBaseRouteUpdated(
  event: DefaultBaseRouteUpdated,
): void {
  // Update platform stats with new default
  let stats = PlatformStats.load("platform");
  if (!stats) {
    stats = new PlatformStats("platform");
    stats.totalUsers = ZERO_BIGINT;
    stats.totalCourses = ZERO_BIGINT;
    stats.totalEnrollments = ZERO_BIGINT;
    stats.totalCertificates = ZERO_BIGINT;
    stats.totalRevenue = ZERO_BIGINT;
    stats.totalRevenueEth = ZERO_BIGDECIMAL;
    stats.platformFees = ZERO_BIGINT;
    stats.platformFeesEth = ZERO_BIGDECIMAL;
    stats.creatorRevenue = ZERO_BIGINT;
    stats.creatorRevenueEth = ZERO_BIGDECIMAL;
    stats.averageCoursePrice = ZERO_BIGDECIMAL;
    stats.averageCompletionRate = ZERO_BIGDECIMAL;
    stats.averageRating = ZERO_BIGDECIMAL;
    stats.dailyActiveUsers = ZERO_BIGINT;
    stats.monthlyActiveUsers = ZERO_BIGINT;
    stats.lastUpdateTimestamp = event.block.timestamp;
    stats.lastUpdateBlock = event.block.number;
  }

  stats.lastUpdateTimestamp = event.block.timestamp;
  stats.lastUpdateBlock = event.block.number;
  stats.save();

  log.info("Default base route updated: {}", [event.params.newBaseRoute]);
}

/**
 * Handle PlatformNameUpdated event
 * Updates the platform name displayed on certificates
 * ✅ NEW: Branding configuration
 */
export function handlePlatformNameUpdated(event: PlatformNameUpdated): void {
  // Update platform stats
  let stats = PlatformStats.load("platform");
  if (!stats) {
    stats = new PlatformStats("platform");
    stats.totalUsers = ZERO_BIGINT;
    stats.totalCourses = ZERO_BIGINT;
    stats.totalEnrollments = ZERO_BIGINT;
    stats.totalCertificates = ZERO_BIGINT;
    stats.totalRevenue = ZERO_BIGINT;
    stats.totalRevenueEth = ZERO_BIGDECIMAL;
    stats.platformFees = ZERO_BIGINT;
    stats.platformFeesEth = ZERO_BIGDECIMAL;
    stats.creatorRevenue = ZERO_BIGINT;
    stats.creatorRevenueEth = ZERO_BIGDECIMAL;
    stats.averageCoursePrice = ZERO_BIGDECIMAL;
    stats.averageCompletionRate = ZERO_BIGDECIMAL;
    stats.averageRating = ZERO_BIGDECIMAL;
    stats.dailyActiveUsers = ZERO_BIGINT;
    stats.monthlyActiveUsers = ZERO_BIGINT;
    stats.lastUpdateTimestamp = event.block.timestamp;
    stats.lastUpdateBlock = event.block.number;
  }

  stats.lastUpdateTimestamp = event.block.timestamp;
  stats.lastUpdateBlock = event.block.number;
  stats.save();

  log.info("Platform name updated: {}", [event.params.newPlatformName]);
}

/**
 * Handle CourseAdditionFeeUpdated event
 * Updates the fee for adding courses to certificates
 * ✅ NEW: Pricing configuration
 */
export function handleCourseAdditionFeeUpdated(
  event: CourseAdditionFeeUpdated,
): void {
  let stats = PlatformStats.load("platform");
  if (!stats) {
    stats = new PlatformStats("platform");
    stats.totalUsers = ZERO_BIGINT;
    stats.totalCourses = ZERO_BIGINT;
    stats.totalEnrollments = ZERO_BIGINT;
    stats.totalCertificates = ZERO_BIGINT;
    stats.totalRevenue = ZERO_BIGINT;
    stats.totalRevenueEth = ZERO_BIGDECIMAL;
    stats.platformFees = ZERO_BIGINT;
    stats.platformFeesEth = ZERO_BIGDECIMAL;
    stats.creatorRevenue = ZERO_BIGINT;
    stats.creatorRevenueEth = ZERO_BIGDECIMAL;
    stats.averageCoursePrice = ZERO_BIGDECIMAL;
    stats.averageCompletionRate = ZERO_BIGDECIMAL;
    stats.averageRating = ZERO_BIGDECIMAL;
    stats.dailyActiveUsers = ZERO_BIGINT;
    stats.monthlyActiveUsers = ZERO_BIGINT;
    stats.lastUpdateTimestamp = event.block.timestamp;
    stats.lastUpdateBlock = event.block.number;
  }

  stats.lastUpdateTimestamp = event.block.timestamp;
  stats.lastUpdateBlock = event.block.number;
  stats.save();

  log.info("Course addition fee updated: {}", [event.params.newFee.toString()]);
}

/**
 * Handle CourseCertificatePriceSet event
 * Updates the certificate price for a specific course
 * ✅ NEW: Per-course pricing configuration
 */
export function handleCourseCertificatePriceSet(
  event: CourseCertificatePriceSet,
): void {
  let courseId = event.params.courseId.toString();
  let course = Course.load(courseId);

  if (course != null) {
    course.certificatePrice = event.params.price;
    course.certificatePriceEth = weiToEth(event.params.price);
    course.save();

    log.info("Certificate price set for course {}: {}", [
      courseId,
      event.params.price.toString(),
    ]);
  }
}
