import { useState, useEffect, useCallback, useMemo, useRef, useReducer } from 'react';

interface UseEthPriceReturn {
  ethToIDR: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => void;
}

const ETH_PRICE_API_URL = '/api/eth-price';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Global cache shared across all hook instances
let globalCachedData: {
  ethToIDR: number;
  timestamp: number;
  isLoading: boolean;
  error: string | null;
} | null = null;

// Global promise to prevent multiple simultaneous API calls
let fetchPromise: Promise<void> | null = null;

// Global subscribers for state changes with improved callback tracking
const subscribers = new Set<(data: GlobalCacheData) => void>();

const notifySubscribers = () => {
  subscribers.forEach(callback => {
    try {
      callback(globalCachedData);
    } catch (error) {
      console.error('Error in subscriber callback:', error);
    }
  });
};

const fetchEthPriceGlobal = async (): Promise<void> => {
  try {
    // Check if data is still fresh
    if (globalCachedData && Date.now() - globalCachedData.timestamp < CACHE_DURATION) {
      return;
    }

    // Set loading state
    globalCachedData = {
      ethToIDR: globalCachedData?.ethToIDR || 0,
      timestamp: globalCachedData?.timestamp || 0,
      isLoading: true,
      error: null,
    };
    notifySubscribers();

    const response = await fetch(ETH_PRICE_API_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`API ${response.status}: ${response.statusText}`);
    }

    const apiResponse = await response.json();

    if (!apiResponse.success) {
      throw new Error(apiResponse.error || 'API returned unsuccessful response');
    }

    const data = apiResponse.data;
    if (!data.ethereum || !data.ethereum.idr) {
      throw new Error('Invalid response format from ETH price API');
    }

    const now = Date.now();
    globalCachedData = {
      ethToIDR: data.ethereum.idr,
      timestamp: now,
      isLoading: false,
      error: null,
    };

    // Ensure all subscribers are notified of the successful update
    notifySubscribers();
  } catch (err) {
    console.error('Error fetching ETH price:', err);

    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch ETH price';

    globalCachedData = {
      ethToIDR: globalCachedData?.ethToIDR || 0,
      timestamp: globalCachedData?.timestamp || 0,
      isLoading: false,
      error: errorMessage,
    };

    notifySubscribers();
  } finally {
    fetchPromise = null;
  }
};

// Reducer for reliable re-rendering
type EthPriceState = {
  ethToIDR: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  updateCount: number; // Force re-render trigger
};

type GlobalCacheData = {
  ethToIDR: number;
  timestamp: number;
  isLoading: boolean;
  error: string | null;
} | null;

type EthPriceAction =
  | { type: 'UPDATE_FROM_GLOBAL'; data: GlobalCacheData }
  | { type: 'FORCE_UPDATE' };

const ethPriceReducer = (state: EthPriceState, action: EthPriceAction): EthPriceState => {
  switch (action.type) {
    case 'UPDATE_FROM_GLOBAL':
      const data = action.data;
      const newState = {
        ethToIDR: data?.ethToIDR || 0,
        isLoading: data?.isLoading || false,
        error: data?.error || null,
        lastUpdated: data?.timestamp ? new Date(data.timestamp) : null,
        updateCount: state.updateCount + 1,
      };

      return newState;

    case 'FORCE_UPDATE':
      return {
        ...state,
        updateCount: state.updateCount + 1,
      };
    default:
      return state;
  }
};

export function useEthPrice(): UseEthPriceReturn {
  const isMountedRef = useRef(true);

  // Use useReducer for reliable state updates
  const [state, dispatch] = useReducer(ethPriceReducer, {
    ethToIDR: globalCachedData?.ethToIDR || 0,
    isLoading: globalCachedData?.isLoading || false,
    error: globalCachedData?.error || null,
    lastUpdated: globalCachedData?.timestamp ? new Date(globalCachedData.timestamp) : null,
    updateCount: 0,
  });

  // Subscriber callback that dispatches updates
  const handleGlobalUpdate = useCallback((data: GlobalCacheData) => {
    // Always dispatch updates - let reducer handle state changes
    dispatch({ type: 'UPDATE_FROM_GLOBAL', data });
  }, []);

  // Refetch function
  const refetch = useCallback(() => {
    if (!fetchPromise) {
      fetchPromise = fetchEthPriceGlobal();
    }
  }, []);

  useEffect(() => {
    // Ensure mounted state is set correctly
    isMountedRef.current = true;

    // Subscribe to global state changes
    subscribers.add(handleGlobalUpdate);

    // Initial data sync if global data exists
    if (globalCachedData) {
      dispatch({ type: 'UPDATE_FROM_GLOBAL', data: globalCachedData });
    }

    // Fetch if no data or data is stale
    const shouldFetch = !globalCachedData || Date.now() - globalCachedData.timestamp > CACHE_DURATION;

    if (shouldFetch && !fetchPromise) {
      fetchPromise = fetchEthPriceGlobal();
    }

    return () => {
      // Delay unmount flag to allow final updates to process
      setTimeout(() => {
        isMountedRef.current = false;
      }, 100);
      subscribers.delete(handleGlobalUpdate);
    };
  }, [handleGlobalUpdate]);

  // Return memoized result to prevent unnecessary re-renders of parent components
  return useMemo((): UseEthPriceReturn => ({
    ethToIDR: state.ethToIDR,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    refetch,
  }), [state.ethToIDR, state.isLoading, state.error, state.lastUpdated, refetch]);
}
