import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

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

// Global subscribers for state changes
const subscribers = new Set<() => void>();

const notifySubscribers = () => {
  subscribers.forEach(callback => callback());
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

export function useEthPrice(): UseEthPriceReturn {
  const isMountedRef = useRef(true);
  const [, forceUpdate] = useState({});

  const triggerRerender = useCallback(() => {
    if (isMountedRef.current) {
      forceUpdate({});
    }
  }, []);

  const returnValue = useMemo((): UseEthPriceReturn => {
    const refetch = () => {
      if (!fetchPromise) {
        fetchPromise = fetchEthPriceGlobal();
      }
    };

    return {
      ethToIDR: globalCachedData?.ethToIDR || 0,
      isLoading: globalCachedData?.isLoading || false,
      error: globalCachedData?.error || null,
      lastUpdated: globalCachedData?.timestamp ? new Date(globalCachedData.timestamp) : null,
      refetch,
    };
  }, [globalCachedData?.ethToIDR, globalCachedData?.isLoading, globalCachedData?.error, globalCachedData?.timestamp]);

  useEffect(() => {
    subscribers.add(triggerRerender);

    if (!globalCachedData || Date.now() - globalCachedData.timestamp > CACHE_DURATION) {
      if (!fetchPromise) {
        fetchPromise = fetchEthPriceGlobal();
      }
    }

    return () => {
      isMountedRef.current = false;
      subscribers.delete(triggerRerender);
    };
  }, [triggerRerender]);

  return returnValue;
}
