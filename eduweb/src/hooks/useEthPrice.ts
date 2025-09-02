import { useState, useEffect, useCallback } from 'react';

interface UseEthPriceReturn {
  ethToIDR: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => void;
}

const ETH_PRICE_API_URL = '/api/eth-price';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const RETRY_DELAY = 2000; // 2 seconds

// Client-side cache (server has its own cache)
let cachedData: {
  ethToIDR: number;
  timestamp: number;
} | null = null;

export function useEthPrice(): UseEthPriceReturn {
  const [ethToIDR, setEthToIDR] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchEthPrice = useCallback(async (retryCount = 0) => {
    try {
      // Check cache first
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        setEthToIDR(cachedData.ethToIDR);
        setLastUpdated(new Date(cachedData.timestamp));
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(ETH_PRICE_API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API ${response.status}: ${response.statusText}`);
      }

      const apiResponse = await response.json();

      // Handle API response format
      if (!apiResponse.success) {
        throw new Error(apiResponse.error || 'API returned unsuccessful response');
      }

      const data = apiResponse.data;
      if (!data.ethereum || !data.ethereum.idr) {
        throw new Error('Invalid response format from ETH price API');
      }

      const price = data.ethereum.idr;
      const now = Date.now();

      // Update cache
      cachedData = {
        ethToIDR: price,
        timestamp: now,
      };

      setEthToIDR(price);
      setLastUpdated(new Date(now));
      setError(null);
    } catch (err) {
      console.error('Error fetching ETH price:', err);

      let errorMessage = 'Failed to fetch ETH price';

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'Request timeout';
        } else if (err.message.includes('NetworkError') || err.message.includes('fetch')) {
          errorMessage = 'Network connection error';
        } else {
          errorMessage = err.message;
        }
      }

      // Retry logic for network errors
      if (retryCount < 2 && (errorMessage.includes('Network') || errorMessage.includes('timeout'))) {
        setTimeout(() => {
          fetchEthPrice(retryCount + 1);
        }, RETRY_DELAY * (retryCount + 1)); // Exponential backoff
        return;
      }

      setError(errorMessage);

      // Use cached data if available, even if expired
      if (cachedData) {
        setEthToIDR(cachedData.ethToIDR);
        setLastUpdated(new Date(cachedData.timestamp));
        setError(`Using cached data: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    // Invalidate cache and fetch fresh data
    cachedData = null;
    fetchEthPrice();
  }, [fetchEthPrice]);

  useEffect(() => {
    fetchEthPrice();

    // Set up periodic refresh every 5 minutes
    const intervalId = setInterval(() => {
      fetchEthPrice();
    }, CACHE_DURATION);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchEthPrice]);

  return {
    ethToIDR,
    isLoading,
    error,
    lastUpdated,
    refetch,
  };
}
