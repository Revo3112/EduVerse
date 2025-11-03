/**
 * ============================================================================
 * USE MY LEARNING HOOK - INTEGRATED WITH GOLDSKY + THIRDWEB
 * ============================================================================
 * Custom React hook untuk halaman My Learning dengan integrasi lengkap:
 * - READ: Goldsky indexer untuk data enrollments, progress, certificates
 * - WRITE: Thirdweb untuk certificate minting, rating, license renewal
 *
 * Mengikuti arsitektur:
 * - Goldsky: Fast reads, cached data, accurate aggregations
 * - Thirdweb: Write operations, real-time contract calls
 * ============================================================================
 */

import { useState, useEffect, useCallback } from "react";
import {
  getMyCourses,
  getUserStats,
  getUserCertificates,
  checkEnrollmentStatus,
  getEnrollmentDetail,
  refreshUserData,
  type EnrollmentData,
  type UserStatsData,
  type CertificateData,
} from "@/services/goldsky-mylearning.service";

// Re-export EnrollmentData for use in components
export type { EnrollmentData };
import { useActiveAccount } from "thirdweb/react";
import { useCertificate } from "./useCertificateBlockchain";
import { useSubmitRating } from "./useRating";
import { useLicense } from "./useLicense";
import toast from "react-hot-toast";

// ============================================================================
// TYPES
// ============================================================================

export interface MyCoursesData {
  enrollments: EnrollmentData[];
  userStats: UserStatsData;
  certificates: CertificateData[];
}

export interface UseMyCoursesGoldskyReturn {
  // Data
  data: MyCoursesData | null;
  enrollments: EnrollmentData[];
  userStats: UserStatsData | null;
  certificates: CertificateData[];

  // States
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isRefetching: boolean;

  // Actions
  refetch: () => Promise<void>;
  refresh: () => void;
}

export interface UseEnrollmentStatusReturn {
  isEnrolled: boolean;
  enrollment: EnrollmentData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// MAIN HOOK: useMyCoursesGoldsky
// ============================================================================

/**
 * Hook utama untuk fetch semua course data user dari Goldsky
 *
 * @param studentAddress - Wallet address user (0x...)
 * @param options - Configuration options
 * @returns MyCoursesData dengan loading/error states
 *
 * @example
 * ```tsx
 * function MyCoursePage() {
 *   const address = useActiveAccount()?.address;
 *   const { enrollments, userStats, isLoading, error, refetch } = useMyCoursesGoldsky(address);
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} onRetry={refetch} />;
 *
 *   return (
 *     <div>
 *       <h1>My Courses ({enrollments.length})</h1>
 *       {enrollments.map(enrollment => (
 *         <CourseCard key={enrollment.id} enrollment={enrollment} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMyCoursesGoldsky(
  studentAddress: string | undefined,
  options: {
    enabled?: boolean;
    refetchInterval?: number; // Auto refetch interval in ms
    onSuccess?: (data: MyCoursesData) => void;
    onError?: (error: unknown) => void;
  } = {}
): UseMyCoursesGoldskyReturn {
  const { enabled = true, refetchInterval, onSuccess, onError } = options;

  // States
  const [data, setData] = useState<MyCoursesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch function
  const fetchData = useCallback(
    async (isRefetch = false) => {
      if (!studentAddress || !enabled) {
        setIsLoading(false);
        return;
      }

      try {
        if (isRefetch) {
          setIsRefetching(true);
        } else {
          setIsLoading(true);
        }
        setIsError(false);
        setError(null);

        const result = await getMyCourses(studentAddress);

        setData(result);
        setIsError(false);
        setError(null);

        if (onSuccess) {
          onSuccess(result);
        }
      } catch (err: unknown) {
        console.error("Error fetching my courses from Goldsky:", err);
        setIsError(true);
        setError(
          err instanceof Error ? err : new Error("Unknown error occurred")
        );

        if (onError) {
          onError(err);
        }
      } finally {
        setIsLoading(false);
        setIsRefetching(false);
      }
    },
    [studentAddress, enabled, onSuccess, onError]
  );

  // Initial fetch
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Auto refetch interval
  useEffect(() => {
    if (!refetchInterval || !enabled || !studentAddress) return;

    const intervalId = setInterval(() => {
      fetchData(true);
    }, refetchInterval);

    return () => clearInterval(intervalId);
  }, [refetchInterval, enabled, studentAddress, fetchData]);

  // Refetch function
  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Refresh function (clear cache + refetch)
  const refresh = useCallback(() => {
    if (studentAddress) {
      refreshUserData(studentAddress);
      fetchData(true);
    }
  }, [studentAddress, fetchData]);

  return {
    data,
    enrollments: data?.enrollments || [],
    userStats: data?.userStats || null,
    certificates: data?.certificates || [],
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
    refresh,
  };
}

// ============================================================================
// HOOK: useEnrollmentStatus
// ============================================================================

/**
 * Check if user is enrolled in specific course
 *
 * @param studentAddress - Wallet address user
 * @param courseId - Course ID to check
 * @returns Enrollment status with loading/error states
 *
 * @example
 * ```tsx
 * function CourseDetailPage({ courseId }: { courseId: string }) {
 *   const address = useActiveAccount()?.address;
 *   const { isEnrolled, enrollment, isLoading } = useEnrollmentStatus(address, courseId);
 *
 *   if (isLoading) return <Skeleton />;
 *
 *   return (
 *     <div>
 *       {isEnrolled ? (
 *         <EnrolledView enrollment={enrollment} />
 *       ) : (
 *         <EnrollButton courseId={courseId} />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useEnrollmentStatus(
  studentAddress: string | undefined,
  courseId: string | undefined
): UseEnrollmentStatusReturn {
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!studentAddress || !courseId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);

      const result = await checkEnrollmentStatus(studentAddress, courseId);

      setIsEnrolled(result.isEnrolled);
      setEnrollment(result.enrollment);
      setIsError(false);
      setError(null);
    } catch (err: unknown) {
      console.error("Error checking enrollment status:", err);
      setIsError(true);
      setError(
        err instanceof Error ? err : new Error("Unknown error occurred")
      );
      setIsEnrolled(false);
      setEnrollment(null);
    } finally {
      setIsLoading(false);
    }
  }, [studentAddress, courseId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const refetch = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  return {
    isEnrolled,
    enrollment,
    isLoading,
    isError,
    error,
    refetch,
  };
}

// ============================================================================
// HOOK: useEnrollmentDetail
// ============================================================================

/**
 * Get detailed enrollment data by enrollment ID
 *
 * @param enrollmentId - Enrollment ID (NFT token ID)
 * @returns Enrollment detail with loading/error states
 */
export function useEnrollmentDetail(enrollmentId: string | undefined): {
  enrollment: EnrollmentData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!enrollmentId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);

      const result = await getEnrollmentDetail(enrollmentId);

      setEnrollment(result);
      setIsError(false);
      setError(null);
    } catch (err: unknown) {
      console.error("Error fetching enrollment detail:", err);
      setIsError(true);
      setError(
        err instanceof Error ? err : new Error("Unknown error occurred")
      );
      setEnrollment(null);
    } finally {
      setIsLoading(false);
    }
  }, [enrollmentId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const refetch = useCallback(async () => {
    await fetchDetail();
  }, [fetchDetail]);

  return {
    enrollment,
    isLoading,
    isError,
    error,
    refetch,
  };
}

// ============================================================================
// HOOK: useUserCertificates
// ============================================================================

/**
 * Get user's certificates from Goldsky
 *
 * @param studentAddress - Wallet address user
 * @returns Certificates with loading/error states
 */
export function useUserCertificates(studentAddress: string | undefined): {
  certificates: CertificateData[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCertificates = useCallback(async () => {
    if (!studentAddress) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);

      const result = await getUserCertificates(studentAddress);

      setCertificates(result);
      setIsError(false);
      setError(null);
    } catch (err: unknown) {
      console.error("Error fetching user certificates:", err);
      setIsError(true);
      setError(
        err instanceof Error ? err : new Error("Unknown error occurred")
      );
      setCertificates([]);
    } finally {
      setIsLoading(false);
    }
  }, [studentAddress]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const refetch = useCallback(async () => {
    await fetchCertificates();
  }, [fetchCertificates]);

  return {
    certificates,
    isLoading,
    isError,
    error,
    refetch,
  };
}

// ============================================================================
// HOOK: useUserStats
// ============================================================================

/**
 * Get user statistics from Goldsky
 *
 * @param studentAddress - Wallet address user
 * @returns User stats with loading/error states
 */
export function useUserStats(studentAddress: string | undefined): {
  stats: UserStatsData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    if (!studentAddress) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);

      const result = await getUserStats(studentAddress);

      setStats(result);
      setIsError(false);
      setError(null);
    } catch (err: unknown) {
      console.error("Error fetching user stats:", err);
      setIsError(true);
      setError(
        err instanceof Error ? err : new Error("Unknown error occurred")
      );
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [studentAddress]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const refetch = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    isError,
    error,
    refetch,
  };
}

// ============================================================================
// HOOK: useMyLearningActions (INTEGRATED WRITE OPERATIONS)
// ============================================================================

/**
 * Hook untuk semua write operations di My Learning page
 * Mengintegrasikan certificate, rating, dan license renewal
 *
 * @returns Actions untuk certificate, rating, dan license operations
 *
 * @example
 * ```tsx
 * function MyLearningPage() {
 *   const address = useActiveAccount()?.address;
 *   const { enrollments, refetch } = useMyCoursesGoldsky(address);
 *   const actions = useMyLearningActions();
 *
 *   const handleGetCertificate = async (courseId: bigint) => {
 *     await actions.mintOrUpdateCertificate(courseId);
 *     await refetch(); // Refresh Goldsky data
 *   };
 *
 *   return <CourseList enrollments={enrollments} onGetCertificate={handleGetCertificate} />;
 * }
 * ```
 */
export function useMyLearningActions() {
  const account = useActiveAccount();

  // Certificate hook
  const {
    mintOrUpdateCertificate,
    addMultipleCourses,
    isMinting,
    isUpdating,
    isAdding,
    loading: certificateLoading,
    error: certificateError,
  } = useCertificate();

  // Rating hook
  const {
    submitRating,
    deleteRating,
    isSubmitting: isRatingSubmitting,
    isDeleting: isRatingDeleting,
    error: ratingError,
  } = useSubmitRating();

  // License hook - we'll use it per-course basis

  /**
   * Mint or update certificate untuk completed course
   * Note: recipientName, ipfsCID, and baseRoute will be handled by the certificate modal
   * This is a simplified wrapper for use in the learning page
   */
  const handleCertificateAction = useCallback(
    async (
      courseId: bigint,
      recipientName: string,
      ipfsCID: string,
      baseRoute: string
    ) => {
      if (!account?.address) {
        toast.error("Please connect your wallet");
        throw new Error("No wallet connected");
      }

      try {
        await mintOrUpdateCertificate(
          courseId,
          recipientName,
          ipfsCID,
          baseRoute
        );
        toast.success("Certificate minted successfully!");
        return true;
      } catch (error) {
        console.error("Certificate mint error:", error);
        const errorMsg =
          error instanceof Error ? error.message : "Failed to mint certificate";
        toast.error(errorMsg);
        throw error;
      }
    },
    [account, mintOrUpdateCertificate]
  );

  /**
   * Add multiple courses to existing certificate
   */
  const handleAddCoursesToCertificate = useCallback(
    async (courseIds: readonly bigint[], ipfsCID: string) => {
      if (!account?.address) {
        toast.error("Please connect your wallet");
        throw new Error("No wallet connected");
      }

      try {
        await addMultipleCourses(Array.from(courseIds), ipfsCID);
        toast.success(`${courseIds.length} courses added to certificate!`);
        return true;
      } catch (error) {
        console.error("Add courses error:", error);
        const errorMsg =
          error instanceof Error ? error.message : "Failed to add courses";
        toast.error(errorMsg);
        throw error;
      }
    },
    [account, addMultipleCourses]
  );

  /**
   * Submit rating untuk course
   */
  const handleSubmitRating = useCallback(
    async (courseId: bigint, rating: number) => {
      if (!account?.address) {
        toast.error("Please connect your wallet");
        throw new Error("No wallet connected");
      }

      try {
        await submitRating(courseId, rating);
        // Toast sudah ditangani oleh useRating hook
        return true;
      } catch (error) {
        console.error("Rating submission error:", error);
        throw error;
      }
    },
    [account, submitRating]
  );

  /**
   * Delete rating untuk course
   */
  const handleDeleteRating = useCallback(
    async (courseId: bigint) => {
      if (!account?.address) {
        toast.error("Please connect your wallet");
        throw new Error("No wallet connected");
      }

      try {
        await deleteRating(courseId);
        // Toast sudah ditangani oleh useRating hook
        return true;
      } catch (error) {
        console.error("Rating deletion error:", error);
        throw error;
      }
    },
    [account, deleteRating]
  );

  return {
    // Certificate actions
    mintOrUpdateCertificate: handleCertificateAction,
    addCoursesToCertificate: handleAddCoursesToCertificate,
    isMintingCertificate: isMinting,
    isUpdatingCertificate: isUpdating,
    isAddingCourses: isAdding,
    certificateLoading,
    certificateError,

    // Rating actions
    submitRating: handleSubmitRating,
    deleteRating: handleDeleteRating,
    isSubmittingRating: isRatingSubmitting,
    isDeletingRating: isRatingDeleting,
    ratingError,

    // Utility
    isConnected: !!account?.address,
    walletAddress: account?.address,
  };
}

// ============================================================================
// HOOK: useLicenseRenewal (PER-COURSE LICENSE MANAGEMENT)
// ============================================================================

/**
 * Hook untuk license renewal per course
 *
 * @param courseId - Course ID yang akan direnew
 * @returns License status dan renewal function
 *
 * @example
 * ```tsx
 * function CourseCard({ enrollment }) {
 *   const { isExpired, renewLicense, isRenewing } = useLicenseRenewal(enrollment.courseId);
 *
 *   return (
 *     <div>
 *       {isExpired && (
 *         <Button onClick={() => renewLicense(1)} loading={isRenewing}>
 *           Renew License (1 month)
 *         </Button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLicenseRenewal(courseId: bigint) {
  const {
    hasLicense,
    isValid,
    isExpired,
    isExpiringSoon,
    license,
    status,
    timeRemaining,
    expiryDate,
    expiryFormatted,
    priceInfo,
    recommendedDuration,
    renewLicense,
    refreshStatus,
    loading,
    isRenewing,
    error,
  } = useLicense(courseId);

  /**
   * Renew license with user feedback
   */
  const handleRenewLicense = useCallback(
    async (durationMonths: number) => {
      try {
        await renewLicense(durationMonths);
        toast.success(`License renewed for ${durationMonths} month(s)!`);
        await refreshStatus();
        return true;
      } catch (error) {
        console.error("License renewal error:", error);
        const errorMsg =
          error instanceof Error ? error.message : "Failed to renew license";
        toast.error(errorMsg);
        throw error;
      }
    },
    [renewLicense, refreshStatus]
  );

  return {
    // License status
    hasLicense,
    isValid,
    isExpired,
    isExpiringSoon,
    license,
    status,
    timeRemaining,
    expiryDate,
    expiryFormatted,

    // Price info
    priceInfo,
    recommendedDuration,

    // Actions
    renewLicense: handleRenewLicense,
    refreshStatus,

    // States
    loading,
    isRenewing,
    error,
  };
}

// ============================================================================
// HOOK: useMyLearningComplete (ALL-IN-ONE HOOK)
// ============================================================================

/**
 * Complete hook yang menggabungkan semua functionality untuk My Learning page
 * Includes: data fetching, certificate, rating, license renewal
 *
 * @param studentAddress - User wallet address
 * @returns Complete My Learning data dan actions
 *
 * @example
 * ```tsx
 * function MyLearningPage() {
 *   const account = useActiveAccount();
 *   const {
 *     enrollments,
 *     userStats,
 *     certificates,
 *     isLoading,
 *     actions,
 *     refetch,
 *   } = useMyLearningComplete(account?.address);
 *
 *   const handleRateAndCertify = async (courseId: bigint) => {
 *     await actions.submitRating(courseId, 5);
 *     await actions.mintOrUpdateCertificate(courseId, "John Doe");
 *     await refetch();
 *   };
 *
 *   return <MyLearningUI data={enrollments} onAction={handleRateAndCertify} />;
 * }
 * ```
 */
export function useMyLearningComplete(studentAddress: string | undefined) {
  // Fetch data from Goldsky
  const {
    data,
    enrollments,
    userStats,
    certificates,
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
    refresh,
  } = useMyCoursesGoldsky(studentAddress, {
    enabled: !!studentAddress,
  });

  // Get write actions
  const actions = useMyLearningActions();

  /**
   * Combined refetch: refresh Goldsky data only
   * Certificate data refreshes automatically via blockchain events
   */
  const refetchAll = useCallback(async () => {
    await refetch();
  }, [refetch]);

  /**
   * Handle certificate mint with auto-refresh
   * Note: This is typically called from the certificate modal which provides all params
   */
  const mintCertificateWithRefresh = useCallback(
    async (
      courseId: bigint,
      recipientName: string,
      ipfsCID: string,
      baseRoute: string
    ) => {
      await actions.mintOrUpdateCertificate(
        courseId,
        recipientName,
        ipfsCID,
        baseRoute
      );
      await refetchAll();
    },
    [actions, refetchAll]
  );

  /**
   * Handle rating submission with auto-refresh
   */
  const submitRatingWithRefresh = useCallback(
    async (courseId: bigint, rating: number) => {
      await actions.submitRating(courseId, rating);
      await refetchAll();
    },
    [actions, refetchAll]
  );

  return {
    // Data
    data,
    enrollments,
    userStats,
    certificates,

    // States
    isLoading,
    isError,
    error,
    isRefetching,

    // Actions
    actions: {
      ...actions,
      mintCertificateWithRefresh,
      submitRatingWithRefresh,
    },

    // Refetch
    refetch,
    refetchAll,
    refresh,

    // Wallet info
    isConnected: actions.isConnected,
    walletAddress: actions.walletAddress,
  };
}
