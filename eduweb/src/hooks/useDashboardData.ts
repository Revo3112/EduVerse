"use client";

import { isGraphQLConfigured } from "@/lib/graphql-client";
import {
  getDashboardStats,
  getUserActivities,
  getUserCreatedCourses,
  getUserEnrollments,
} from "@/services/goldsky.service";
import { useCallback, useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DashboardStats {
  coursesEnrolled: number;
  coursesCreated: number;
  coursesCompleted: number;
  ethEarned: string;
  growth: {
    enrolled: string;
    created: string;
    completed: string;
    earned: string;
  };
}

export interface LearningCourse {
  id: string;
  title: string;
  progress: number;
  status: "In Progress" | "Not Started" | "Completed";
  thumbnailCID: string;
  courseId: string;
  totalSections: number;
  completedSections: number;
  expiryTimestamp: string;
  isActive: boolean;
}

export interface TeachingCourse {
  id: string;
  courseId: string;
  title: string;
  studentCount: number;
  status: "Active" | "Inactive";
  thumbnailCID: string;
  totalRevenue: string;
  activeEnrollments: number;
  averageRating: number;
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  relativeTime: string;
  transactionHash?: string;
}

export interface UseDashboardDataReturn {
  stats: DashboardStats;
  learningCourses: LearningCourse[];
  teachingCourses: TeachingCourse[];
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getRelativeTime(timestamp: string): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - parseInt(timestamp);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)} weeks ago`;
  return `${Math.floor(diff / 2592000)} months ago`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatWeiToEth(wei: string): string {
  try {
    const weiNum = BigInt(wei);
    const ethNum = Number(weiNum) / 1e18;
    return ethNum.toFixed(3);
  } catch {
    return "0.000";
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useDashboardData(): UseDashboardDataReturn {
  const account = useActiveAccount();
  const userAddress = account?.address?.toLowerCase();

  const [stats, setStats] = useState<DashboardStats>({
    coursesEnrolled: 0,
    coursesCreated: 0,
    coursesCompleted: 0,
    ethEarned: "0.000",
    growth: {
      enrolled: "+0%",
      created: "+0%",
      completed: "+0%",
      earned: "+0%",
    },
  });

  const [learningCourses, setLearningCourses] = useState<LearningCourse[]>([]);
  const [teachingCourses, setTeachingCourses] = useState<TeachingCourse[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    if (!userAddress) {
      setIsLoading(false);
      return;
    }

    // Check if GraphQL is configured
    if (!isGraphQLConfigured()) {
      setError(
        "Goldsky GraphQL endpoint not configured. Please set NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT in your environment variables."
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [dashboardData, enrollments, courses, activitiesData] =
        await Promise.all([
          getDashboardStats(userAddress),
          getUserEnrollments(userAddress, 100),
          getUserCreatedCourses(userAddress, 100),
          getUserActivities(userAddress, 20),
        ]);

      // Transform dashboard stats
      const totalEnrollments = dashboardData.enrollments?.length || 0;
      const completedEnrollments =
        dashboardData.enrollments?.filter(
          (e: { status: string }) => e.status === "COMPLETED"
        ).length || 0;
      const totalRevenue =
        dashboardData.courses?.reduce(
          (sum: number, c: { totalRevenueEth: string }) =>
            sum + parseFloat(c.totalRevenueEth || "0"),
          0
        ) || 0;
      setStats({
        coursesEnrolled: totalEnrollments,
        coursesCreated: dashboardData.courses?.length || 0,
        coursesCompleted: completedEnrollments,
        ethEarned: totalRevenue.toFixed(3),
        growth: {
          enrolled: `+${totalEnrollments}`,
          created: `+${dashboardData.courses?.length || 0}`,
          completed: `+${completedEnrollments}`,
          earned: `+${totalRevenue.toFixed(3)}`,
        },
      });

      // Transform learning courses
      const transformedLearningCourses: LearningCourse[] = enrollments.map(
        (enrollment: {
          id: string;
          courseId: string;
          status: string;
          completionPercentage: string;
          sectionsCompleted: string;
          licenseExpiry: string;
          isActive: boolean;
          course: {
            title: string;
            thumbnailCID: string;
            sectionsCount: string;
          };
        }) => ({
          id: enrollment.id,
          title: enrollment.course.title,
          progress: parseInt(enrollment.completionPercentage),
          status:
            enrollment.status === "COMPLETED"
              ? "Completed"
              : parseInt(enrollment.completionPercentage) > 0
              ? "In Progress"
              : "Not Started",
          thumbnailCID: enrollment.course.thumbnailCID,
          courseId: enrollment.courseId,
          totalSections: parseInt(enrollment.course.sectionsCount),
          completedSections: parseInt(enrollment.sectionsCompleted),
          expiryTimestamp: enrollment.licenseExpiry,
          isActive: enrollment.isActive,
        })
      );

      setLearningCourses(transformedLearningCourses);

      // Transform teaching courses - filter only active courses and sort by newest first
      const transformedTeachingCourses: TeachingCourse[] = courses
        .filter(
          (course: { isActive: boolean; isDeleted?: boolean }) =>
            course.isActive === true && course.isDeleted !== true
        )
        .map(
          (course: {
            id: string;
            title: string;
            thumbnailCID: string;
            totalEnrollments: string;
            activeEnrollments: string;
            totalRevenueEth: string;
            averageRating: string;
            isActive: boolean;
          }) => ({
            id: course.id,
            courseId: course.id,
            title: course.title,
            studentCount: parseInt(course.totalEnrollments),
            status: "Active",
            thumbnailCID: course.thumbnailCID,
            totalRevenue: parseFloat(course.totalRevenueEth).toFixed(3),
            activeEnrollments: parseInt(course.activeEnrollments),
            averageRating: parseFloat(course.averageRating),
          })
        );

      setTeachingCourses(transformedTeachingCourses);

      // Transform activities - merge enrollments, progresses, and certificates
      const transformedActivities: Activity[] = [];

      // Add enrollment activities
      if (activitiesData.enrollments) {
        activitiesData.enrollments.forEach(
          (enrollment: {
            id: string;
            courseId: string;
            purchasedAt: string;
            status: string;
            mintTxHash: string;
            course: { title: string };
          }) => {
            transformedActivities.push({
              id: `enrollment-${enrollment.id}`,
              type: "enrollment",
              title: "New Enrollment",
              description: `Enrolled in ${enrollment.course.title}`,
              timestamp: enrollment.purchasedAt,
              relativeTime: getRelativeTime(enrollment.purchasedAt),
              transactionHash: enrollment.mintTxHash,
            });
          }
        );
      }

      // Add activity events
      if (activitiesData.activityEvents) {
        activitiesData.activityEvents.forEach(
          (activity: {
            id: string;
            type: string;
            timestamp: string;
            description: string;
            transactionHash: string;
            course: { title: string } | null;
          }) => {
            transformedActivities.push({
              id: `activity-${activity.id}`,
              type: activity.type.toLowerCase(),
              title: activity.type.replace(/_/g, " "),
              description: activity.description,
              timestamp: activity.timestamp,
              relativeTime: getRelativeTime(activity.timestamp),
              transactionHash: activity.transactionHash,
            });
          }
        );
      }

      // Add certificate activities
      if (activitiesData.certificates) {
        activitiesData.certificates.forEach(
          (certificate: {
            id: string;
            tokenId: string;
            totalCourses: string;
            createdAt: string;
            mintTxHash: string;
          }) => {
            transformedActivities.push({
              id: `certificate-${certificate.id}`,
              type: "certificate_issued",
              title: "Certificate Issued",
              description: `Certificate #${certificate.tokenId} issued for ${certificate.totalCourses} courses`,
              timestamp: certificate.createdAt,
              relativeTime: getRelativeTime(certificate.createdAt),
              transactionHash: certificate.mintTxHash,
            });
          }
        );
      }

      // Sort activities by timestamp (most recent first)
      transformedActivities.sort(
        (a, b) => parseInt(b.timestamp) - parseInt(a.timestamp)
      );

      // Limit to 20 most recent activities
      setActivities(transformedActivities.slice(0, 20));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch dashboard data";
      setError(errorMessage);
      console.error("[useDashboardData] Error:", err);

      // Set empty data on error
      setStats({
        coursesEnrolled: 0,
        coursesCreated: 0,
        coursesCompleted: 0,
        ethEarned: "0.000",
        growth: {
          enrolled: "+0",
          created: "+0",
          completed: "+0",
          earned: "+0.000",
        },
      });
      setLearningCourses([]);
      setTeachingCourses([]);
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    stats,
    learningCourses,
    teachingCourses,
    activities,
    isLoading,
    error,
    refetch: fetchAllData,
  };
}
