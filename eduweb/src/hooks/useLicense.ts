/**
 * @fileoverview useLicense Hook
 * @description React hook for license management and status checking
 * @author EduVerse Platform
 * @date 2025-10-19
 *
 * This hook provides real-time license status and transaction functions:
 * - Reads license status from blockchain
 * - Prepares and sends purchase/renewal transactions
 * - Auto-refreshes status after transactions
 * - Handles loading and error states
 *
 * Usage:
 * ```typescript
 * const {
 *   hasLicense,
 *   isValid,
 *   isExpired,
 *   license,
 *   purchaseLicense,
 *   renewLicense,
 *   refreshStatus,
 *   loading,
 *   error
 * } = useLicense(courseId);
 * ```
 */

"use client";

import {
    calculateLicensePrice,
    formatLicenseExpiry,
    getLicenseStatus,
    getRecommendedRenewalDuration,
    isLicenseExpiringSoon,
    preparePurchaseLicenseTransaction,
    prepareRenewLicenseTransaction,
    type License,
    type LicensePriceInfo,
    type LicenseStatus,
} from "@/services/license.service";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";

// ============================================================================
// HOOK RETURN TYPE
// ============================================================================

export interface UseLicenseReturn {
  // License Status
  hasLicense: boolean;
  isValid: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  license: License | null;
  status: LicenseStatus | null;
  timeRemaining: number | null;
  expiryDate: Date | null;
  expiryFormatted: string | null;

  // Price Information
  priceInfo: LicensePriceInfo | null;
  recommendedDuration: number;

  // Transaction Functions
  purchaseLicense: (durationMonths: number) => Promise<void>;
  renewLicense: (durationMonths: number) => Promise<void>;
  refreshStatus: () => Promise<void>;

  // Loading States
  loading: boolean;
  isPurchasing: boolean;
  isRenewing: boolean;
  isPriceLoading: boolean;
  isTransactionPending: boolean;

  // Errors
  error: string | null;
  priceError: string | null;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for managing course license status and transactions
 *
 * @param courseId - Course ID to check license for
 * @param options - Optional configuration
 * @returns License status and transaction functions
 *
 * @example
 * ```typescript
 * function CourseAccessGuard({ courseId, children }) {
 *   const { isValid, isExpiringSoon, purchaseLicense, renewLicense, loading } = useLicense(courseId);
 *
 *   if (loading) return <Spinner />;
 *
 *   if (!isValid) {
 *     return (
 *       <PurchasePrompt
 *         onPurchase={() => purchaseLicense(3)}
 *       />
 *     );
 *   }
 *
 *   if (isExpiringSoon) {
 *     return (
 *       <>
 *         <RenewalBanner onRenew={() => renewLicense(3)} />
 *         {children}
 *       </>
 *     );
 *   }
 *
 *   return children;
 * }
 * ```
 */
export function useLicense(
  courseId: bigint,
  options: {
    autoRefresh?: boolean; // Auto-refresh status every N seconds
    refreshInterval?: number; // Refresh interval in ms (default: 30000)
  } = {}
): UseLicenseReturn {
  const {
    autoRefresh = false,
    refreshInterval = 30000,
  } = options;

  const account = useActiveAccount();

  // State
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [priceInfo, setPriceInfo] = useState<LicensePriceInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Thirdweb transaction hook
  const {
    mutate: sendTransaction,
    isPending: isTransactionPending,
    data: transactionResult,
  } = useSendTransaction();

  // Transaction-specific loading states
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);

  // ============================================================================
  // FETCH LICENSE STATUS
  // ============================================================================

  const fetchLicenseStatus = useCallback(async () => {
    if (!account?.address) {
      setStatus({
        hasLicense: false,
        isValid: false,
        isExpired: false,
        license: null,
        timeRemaining: null,
        expiryDate: null,
      });
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const licenseStatus = await getLicenseStatus(account.address, courseId);
      setStatus(licenseStatus);
    } catch (err) {
      console.error("[useLicense] Error fetching status:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch license status");
    } finally {
      setLoading(false);
    }
  }, [account?.address, courseId]);

  // Initial fetch
  useEffect(() => {
    fetchLicenseStatus();
  }, [fetchLicenseStatus]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchLicenseStatus();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchLicenseStatus]);

  /**
   * Handle transaction results with toast notifications
   */
  useEffect(() => {
    if (transactionResult) {
      const txHash = transactionResult.transactionHash;
      const explorerUrl = `https://pacific-explorer.manta.network/tx/${txHash}`;

      toast.success(
        `License transaction successful! View on Explorer: ${explorerUrl}`,
        {
          duration: 6000,
          style: {
            maxWidth: '500px',
          },
        }
      );

      // Refresh license status after successful transaction
      fetchLicenseStatus();
    }
  }, [transactionResult, fetchLicenseStatus]);

  // ============================================================================
  // FETCH PRICE INFORMATION
  // ============================================================================

  const fetchPriceInfo = useCallback(
    async (durationMonths: number) => {
      setIsPriceLoading(true);
      setPriceError(null);

      try {
        const price = await calculateLicensePrice(courseId, durationMonths);
        setPriceInfo(price);
        return price;
      } catch (err) {
        console.error("[useLicense] Error calculating price:", err);
        const errorMsg =
          err instanceof Error ? err.message : "Failed to calculate price";
        setPriceError(errorMsg);
        throw err;
      } finally {
        setIsPriceLoading(false);
      }
    },
    [courseId]
  );

  // ============================================================================
  // PURCHASE LICENSE
  // ============================================================================

  const purchaseLicense = useCallback(
    async (durationMonths: number) => {
      if (!account?.address) {
        const errorMsg = "Please connect your wallet first";
        setError(errorMsg);
        toast.error(errorMsg);
        console.error("[useLicense]", errorMsg);
        return;
      }

      setIsPurchasing(true);
      setError(null);

      const loadingToast = toast.loading(`Purchasing ${durationMonths} month license...`);

      try {
        // Calculate price
        const price = await fetchPriceInfo(durationMonths);

        console.log(
          `[useLicense] Purchasing ${durationMonths} month license for ${price.priceInEth} ETH`
        );

        // Prepare transaction
        const transaction = await preparePurchaseLicenseTransaction(
          courseId,
          durationMonths,
          price.totalPrice
        );

        // Send transaction
        sendTransaction(transaction, {
          onSuccess: async () => {
            console.log(
              `[useLicense] License purchased! ${durationMonths} months`
            );

            // Refresh status after successful purchase
            await fetchLicenseStatus();
            toast.dismiss(loadingToast);
          },
          onError: (error) => {
            console.error("[useLicense] Purchase error:", error);
            const errorMsg =
              error instanceof Error ? error.message : "Transaction failed";
            setError(errorMsg);
            toast.dismiss(loadingToast);
            toast.error(errorMsg);
          },
        });
      } catch (err) {
        console.error("[useLicense] Purchase preparation error:", err);
        const errorMsg =
          err instanceof Error ? err.message : "Failed to prepare purchase";
        setError(errorMsg);
        toast.dismiss(loadingToast);
        toast.error(errorMsg);
      } finally {
        setIsPurchasing(false);
      }
    },
    [account, courseId, fetchPriceInfo, fetchLicenseStatus, sendTransaction]
  );

  // ============================================================================
  // RENEW LICENSE
  // ============================================================================

  const renewLicense = useCallback(
    async (durationMonths: number) => {
      if (!account?.address) {
        const errorMsg = "Please connect your wallet first";
        setError(errorMsg);
        toast.error(errorMsg);
        console.error("[useLicense]", errorMsg);
        return;
      }

      setIsRenewing(true);
      setError(null);

      const loadingToast = toast.loading(`Renewing license for ${durationMonths} months...`);

      try {
        // Calculate price
        const price = await fetchPriceInfo(durationMonths);

        console.log(
          `[useLicense] Renewing for ${durationMonths} months at ${price.priceInEth} ETH`
        );

        // Prepare transaction
        const transaction = await prepareRenewLicenseTransaction(
          courseId,
          durationMonths,
          price.totalPrice
        );

        // Send transaction
        sendTransaction(transaction, {
          onSuccess: async () => {
            console.log(
              `[useLicense] License renewed! ${durationMonths} months`
            );

            // Refresh status after successful renewal
            await fetchLicenseStatus();
            toast.dismiss(loadingToast);
          },
          onError: (error) => {
            console.error("[useLicense] Renewal error:", error);
            const errorMsg =
              error instanceof Error ? error.message : "Transaction failed";
            setError(errorMsg);
            toast.dismiss(loadingToast);
            toast.error(errorMsg);
          },
        });
      } catch (err) {
        console.error("[useLicense] Renewal preparation error:", err);
        const errorMsg =
          err instanceof Error ? err.message : "Failed to prepare renewal";
        setError(errorMsg);
        toast.dismiss(loadingToast);
        toast.error(errorMsg);
      } finally {
        setIsRenewing(false);
      }
    },
    [account, courseId, fetchPriceInfo, fetchLicenseStatus, sendTransaction]
  );

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const hasLicense = status?.hasLicense ?? false;
  const isValid = status?.isValid ?? false;
  const isExpired = status?.isExpired ?? false;
  const license = status?.license ?? null;
  const timeRemaining = status?.timeRemaining ?? null;
  const expiryDate = status?.expiryDate ?? null;

  const expiryFormatted = license
    ? formatLicenseExpiry(license.expiryTimestamp, "relative")
    : null;

  const isExpiringSoon = license
    ? isLicenseExpiringSoon(license.expiryTimestamp, 7)
    : false;

  const recommendedDuration = getRecommendedRenewalDuration(license);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Status
    hasLicense,
    isValid,
    isExpired,
    isExpiringSoon,
    license,
    status,
    timeRemaining,
    expiryDate,
    expiryFormatted,

    // Price
    priceInfo,
    recommendedDuration,

    // Transactions
    purchaseLicense,
    renewLicense,
    refreshStatus: fetchLicenseStatus,

    // Loading
    loading,
    isPurchasing,
    isRenewing,
    isPriceLoading,
    isTransactionPending,

    // Errors
    error,
    priceError,
  };
}

// ============================================================================
// COMPANION HOOKS
// ============================================================================

/**
 * Simplified hook for read-only license status checking
 * Use this when you don't need purchase/renewal functions
 *
 * @example
 * ```typescript
 * function CourseCard({ courseId }) {
 *   const { hasAccess } = useLicenseStatus(courseId);
 *   return (
 *     <Card>
 *       {hasAccess ? <UnlockIcon /> : <LockIcon />}
 *     </Card>
 *   );
 * }
 * ```
 */
export function useLicenseStatus(courseId: bigint) {
  const { hasLicense, isValid, isExpired, license, loading, error } = useLicense(
    courseId
  );

  return {
    hasAccess: isValid,
    hasLicense,
    isExpired,
    license,
    loading,
    error,
  };
}

/**
 * Hook for checking license status across multiple courses
 * Useful for "My Courses" dashboard
 *
 * @example
 * ```typescript
 * function MyCourses() {
 *   const courseIds = [1n, 2n, 3n];
 *   const { licenses, loading } = useMultipleLicenses(courseIds);
 *
 *   return licenses.map(({ courseId, isValid, expiryDate }) => (
 *     <CourseCard key={courseId} hasAccess={isValid} expiresAt={expiryDate} />
 *   ));
 * }
 * ```
 */
export function useMultipleLicenses(courseIds: bigint[]) {
  const account = useActiveAccount();
  const [licenses, setLicenses] = useState<LicenseStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!account?.address || courseIds.length === 0) {
      setLicenses([]);
      setLoading(false);
      return;
    }

    const fetchAllLicenses = async () => {
      setLoading(true);
      setError(null);

      try {
        const statusPromises = courseIds.map((courseId) =>
          getLicenseStatus(account.address, courseId)
        );

        const results = await Promise.all(statusPromises);
        setLicenses(results);
      } catch (err) {
        console.error("[useMultipleLicenses] Error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch licenses"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAllLicenses();
  }, [account?.address, courseIds]);

  return {
    licenses,
    loading,
    error,
  };
}
