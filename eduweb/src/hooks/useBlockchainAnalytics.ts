/**
 * useBlockchainAnalytics Hook
 *
 * Custom React hook for fetching REAL blockchain data using Thirdweb RPC.
 * Provides real-time gas prices, block info, and transaction data directly
 * from the Manta Pacific blockchain.
 *
 * @author EduVerse Team
 * @version 1.0.0
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  BlockchainAnalytics,
  BlockInfo,
  getCurrentGasPrice,
  getRecentBlocks,
  getBlockchainAnalytics,
  startBlockMonitor,
} from "@/services/blockchain-transactions.service";

// ============================================================================
// TYPES
// ============================================================================

export interface UseBlockchainAnalyticsReturn {
  // Real-time data
  currentBlockNumber: number;
  currentGasPrice: string;
  currentGasPriceGwei: string;
  recentBlocks: BlockInfo[];

  // Contract analytics
  analytics: BlockchainAnalytics | null;

  // Contract-specific stats
  contractStats: {
    courseFactory: {
      transactions: number;
      gasUsed: string;
      gasCostEth: string;
    };
    courseLicense: {
      transactions: number;
      gasUsed: string;
      gasCostEth: string;
    };
    progressTracker: {
      transactions: number;
      gasUsed: string;
      gasCostEth: string;
    };
    certificateManager: {
      transactions: number;
      gasUsed: string;
      gasCostEth: string;
    };
  };

  // Aggregated stats
  totalTransactions: number;
  totalGasUsed: string;
  totalGasCostEth: string;
  averageGasPerTransaction: string;

  // State
  isLoading: boolean;
  isMonitoring: boolean;
  error: Error | null;
  lastUpdated: number | null;

  // Actions
  refresh: () => Promise<void>;
  startMonitoring: () => void;
  stopMonitoring: () => void;
}

export interface UseBlockchainAnalyticsOptions {
  /**
   * Block range to query for historical data
   * @default 10000
   */
  blockRange?: number;

  /**
   * Auto-refresh interval in milliseconds
   * @default 30000 (30 seconds)
   */
  refreshInterval?: number;

  /**
   * Enable automatic polling
   * @default true
   */
  autoRefresh?: boolean;

  /**
   * Fetch data immediately on mount
   * @default true
   */
  fetchOnMount?: boolean;

  /**
   * Enable real-time block monitoring
   * @default false
   */
  enableMonitoring?: boolean;

  /**
   * Block monitor polling interval in ms
   * @default 5000
   */
  monitorInterval?: number;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_OPTIONS: Required<UseBlockchainAnalyticsOptions> = {
  blockRange: 10000,
  refreshInterval: 30000,
  autoRefresh: true,
  fetchOnMount: true,
  enableMonitoring: false,
  monitorInterval: 5000,
  debug: false,
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useBlockchainAnalytics(
  options: UseBlockchainAnalyticsOptions = {}
): UseBlockchainAnalyticsReturn {
  const {
    blockRange,
    refreshInterval,
    autoRefresh,
    fetchOnMount,
    enableMonitoring,
    monitorInterval,
    debug,
  } = { ...DEFAULT_OPTIONS, ...options };

  // State
  const [currentBlockNumber, setCurrentBlockNumber] = useState<number>(0);
  const [currentGasPrice, setCurrentGasPrice] = useState<string>("0");
  const [currentGasPriceGwei, setCurrentGasPriceGwei] = useState<string>("0");
  const [recentBlocks, setRecentBlocks] = useState<BlockInfo[]>([]);
  const [analytics, setAnalytics] = useState<BlockchainAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(fetchOnMount);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Refs for cleanup
  const monitorCleanupRef = useRef<(() => void) | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // FETCH FUNCTIONS
  // ============================================================================

  /**
   * Fetch current gas price and block number
   */
  const fetchGasInfo = useCallback(async () => {
    try {
      const gasInfo = await getCurrentGasPrice();
      setCurrentGasPrice(gasInfo.gasPrice);
      setCurrentGasPriceGwei(gasInfo.gasPriceGwei);
      setCurrentBlockNumber(gasInfo.blockNumber);

      if (debug) {
        console.log("[useBlockchainAnalytics] Gas info updated:", gasInfo);
      }
    } catch (err) {
      if (debug) {
        console.error(
          "[useBlockchainAnalytics] Failed to fetch gas info:",
          err
        );
      }
    }
  }, [debug]);

  /**
   * Fetch comprehensive blockchain analytics
   */
  const fetchAnalytics = useCallback(async () => {
    if (debug) {
      console.log("[useBlockchainAnalytics] Fetching analytics...");
    }

    setIsLoading(true);
    setError(null);

    try {
      const [analyticsData, blocks, gasInfo] = await Promise.all([
        getBlockchainAnalytics(blockRange),
        getRecentBlocks(10),
        getCurrentGasPrice(),
      ]);

      setAnalytics(analyticsData);
      setRecentBlocks(blocks);
      setCurrentBlockNumber(gasInfo.blockNumber);
      setCurrentGasPrice(gasInfo.gasPrice);
      setCurrentGasPriceGwei(gasInfo.gasPriceGwei);
      setLastUpdated(Date.now());

      if (debug) {
        console.log(
          "[useBlockchainAnalytics] Analytics fetched:",
          analyticsData
        );
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error(
        "[useBlockchainAnalytics] Failed to fetch analytics:",
        error
      );
    } finally {
      setIsLoading(false);
    }
  }, [blockRange, debug]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    if (debug) {
      console.log("[useBlockchainAnalytics] Manual refresh triggered");
    }
    await fetchAnalytics();
  }, [fetchAnalytics, debug]);

  // ============================================================================
  // MONITORING FUNCTIONS
  // ============================================================================

  /**
   * Start real-time block monitoring
   */
  const startMonitoringFn = useCallback(() => {
    if (isMonitoring) {
      if (debug) {
        console.log("[useBlockchainAnalytics] Already monitoring");
      }
      return;
    }

    if (debug) {
      console.log("[useBlockchainAnalytics] Starting block monitor...");
    }

    const cleanup = startBlockMonitor(
      {
        onNewBlock: (block) => {
          if (debug) {
            console.log("[useBlockchainAnalytics] New block:", block.number);
          }
          setCurrentBlockNumber(block.number);
          setRecentBlocks((prev) => {
            const updated = [block, ...prev.slice(0, 9)];
            return updated;
          });
        },
        onError: (err) => {
          console.error("[useBlockchainAnalytics] Monitor error:", err);
        },
      },
      monitorInterval
    );

    monitorCleanupRef.current = cleanup;
    setIsMonitoring(true);
  }, [isMonitoring, monitorInterval, debug]);

  /**
   * Stop real-time block monitoring
   */
  const stopMonitoringFn = useCallback(() => {
    if (monitorCleanupRef.current) {
      if (debug) {
        console.log("[useBlockchainAnalytics] Stopping block monitor...");
      }
      monitorCleanupRef.current();
      monitorCleanupRef.current = null;
      setIsMonitoring(false);
    }
  }, [debug]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const contractStats = {
    courseFactory: {
      transactions:
        analytics?.contractHistory.courseFactory.transactionCount ?? 0,
      gasUsed: analytics?.contractHistory.courseFactory.totalGasUsed ?? "0",
      gasCostEth:
        analytics?.contractHistory.courseFactory.totalGasCostEth ?? "0",
    },
    courseLicense: {
      transactions:
        analytics?.contractHistory.courseLicense.transactionCount ?? 0,
      gasUsed: analytics?.contractHistory.courseLicense.totalGasUsed ?? "0",
      gasCostEth:
        analytics?.contractHistory.courseLicense.totalGasCostEth ?? "0",
    },
    progressTracker: {
      transactions:
        analytics?.contractHistory.progressTracker.transactionCount ?? 0,
      gasUsed: analytics?.contractHistory.progressTracker.totalGasUsed ?? "0",
      gasCostEth:
        analytics?.contractHistory.progressTracker.totalGasCostEth ?? "0",
    },
    certificateManager: {
      transactions:
        analytics?.contractHistory.certificateManager.transactionCount ?? 0,
      gasUsed:
        analytics?.contractHistory.certificateManager.totalGasUsed ?? "0",
      gasCostEth:
        analytics?.contractHistory.certificateManager.totalGasCostEth ?? "0",
    },
  };

  const totalTransactions = analytics?.totalTransactions ?? 0;
  const totalGasUsed = analytics?.totalGasUsed ?? "0";
  const totalGasCostEth = analytics?.totalGasCostEth ?? "0";
  const averageGasPerTransaction = analytics?.averageGasPerTransaction ?? "0";

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initial fetch on mount
  useEffect(() => {
    if (fetchOnMount) {
      fetchAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) {
      return;
    }

    if (debug) {
      console.log(
        `[useBlockchainAnalytics] Auto-refresh enabled (interval: ${refreshInterval}ms)`
      );
    }

    refreshIntervalRef.current = setInterval(() => {
      if (debug) {
        console.log("[useBlockchainAnalytics] Auto-refresh triggered");
      }
      fetchGasInfo(); // Light update for gas/block
    }, refreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchGasInfo, debug]);

  // Enable monitoring on mount if requested
  useEffect(() => {
    if (enableMonitoring) {
      startMonitoringFn();
    }

    return () => {
      stopMonitoringFn();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableMonitoring]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Real-time data
    currentBlockNumber,
    currentGasPrice,
    currentGasPriceGwei,
    recentBlocks,

    // Contract analytics
    analytics,

    // Contract-specific stats
    contractStats,

    // Aggregated stats
    totalTransactions,
    totalGasUsed,
    totalGasCostEth,
    averageGasPerTransaction,

    // State
    isLoading,
    isMonitoring,
    error,
    lastUpdated,

    // Actions
    refresh,
    startMonitoring: startMonitoringFn,
    stopMonitoring: stopMonitoringFn,
  };
}

// ============================================================================
// LIGHTWEIGHT HOOK - Just gas price and block number
// ============================================================================

export interface UseGasPriceReturn {
  gasPrice: string;
  gasPriceGwei: string;
  blockNumber: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useGasPrice(
  refreshInterval: number = 10000
): UseGasPriceReturn {
  const [gasPrice, setGasPrice] = useState<string>("0");
  const [gasPriceGwei, setGasPriceGwei] = useState<string>("0");
  const [blockNumber, setBlockNumber] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGas = useCallback(async () => {
    try {
      const gasInfo = await getCurrentGasPrice();
      setGasPrice(gasInfo.gasPrice);
      setGasPriceGwei(gasInfo.gasPriceGwei);
      setBlockNumber(gasInfo.blockNumber);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGas();
    const interval = setInterval(fetchGas, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchGas, refreshInterval]);

  return {
    gasPrice,
    gasPriceGwei,
    blockNumber,
    isLoading,
    error,
    refresh: fetchGas,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default useBlockchainAnalytics;
