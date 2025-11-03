import { BigInt, BigDecimal, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { ActivityEvent, UserProfile } from "../../../generated/schema";

const ZERO_BI = BigInt.fromI32(0);
const ZERO_BD = BigDecimal.fromString("0");

export function createActivityEvent(
  event: ethereum.Event,
  eventType: string,
  userAddress: Bytes,
  description: string,
  courseId: string | null = null,
  enrollmentId: string | null = null,
  certificateId: string | null = null,
  metadata: string | null = null,
): void {
  let activityId =
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString();

  let userId = userAddress.toHexString().toLowerCase();
  let user = UserProfile.load(userId);

  if (user == null) {
    user = new UserProfile(userId);
    user.address = userAddress;

    user.coursesEnrolled = ZERO_BI;
    user.coursesCompleted = ZERO_BI;
    user.activeEnrollments = ZERO_BI;
    user.totalSpentOnCourses = ZERO_BI;
    user.totalSpentOnCoursesEth = ZERO_BD;
    user.totalSpentOnCertificates = ZERO_BI;
    user.totalSpentOnCertificatesEth = ZERO_BD;
    user.totalSpent = ZERO_BI;
    user.totalSpentEth = ZERO_BD;

    user.coursesCreated = ZERO_BI;
    user.activeCoursesCreated = ZERO_BI;
    user.deletedCoursesCreated = ZERO_BI;
    user.totalStudents = ZERO_BI;
    user.totalRevenue = ZERO_BI;
    user.totalRevenueEth = ZERO_BD;
    user.averageRating = ZERO_BD;
    user.totalRatingsReceived = ZERO_BI;

    user.hasCertificate = false;
    user.certificateTokenId = ZERO_BI;
    user.certificateName = "";
    user.totalCoursesInCertificate = ZERO_BI;
    user.certificateMintedAt = ZERO_BI;
    user.certificateLastUpdated = ZERO_BI;

    user.totalSectionsCompleted = ZERO_BI;
    user.lastActivityAt = event.block.timestamp;
    user.firstEnrollmentAt = ZERO_BI;
    user.firstCourseCreatedAt = ZERO_BI;

    user.enrollmentsThisMonth = ZERO_BI;
    user.completionsThisMonth = ZERO_BI;
    user.revenueThisMonth = ZERO_BI;
    user.revenueThisMonthEth = ZERO_BD;

    user.isBlacklisted = false;
    user.blacklistedAt = ZERO_BI;
    user.blacklistedBy = Bytes.fromHexString(
      "0x0000000000000000000000000000000000000000",
    );

    user.createdAt = event.block.timestamp;
    user.updatedAt = event.block.timestamp;

    user.firstTxHash = event.transaction.hash;
    user.lastTxHash = event.transaction.hash;
    user.blockNumber = event.block.number;

    user.save();
  }

  let activity = new ActivityEvent(activityId);

  activity.user = userId;
  activity.type = eventType;
  activity.timestamp = event.block.timestamp;
  activity.blockNumber = event.block.number;
  activity.transactionHash = event.transaction.hash;
  activity.description = description;

  if (courseId != null) {
    activity.course = courseId;
  }

  if (enrollmentId != null) {
    activity.enrollment = enrollmentId;
  }

  if (certificateId != null) {
    activity.certificate = certificateId;
  }

  if (metadata != null) {
    activity.metadata = metadata;
  }

  activity.save();
}
