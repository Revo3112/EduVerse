/**
 * CoinGecko API utilities for EduVerse
 * Free tier API calls for cryptocurrency price data
 */

import React from 'react';

export interface CoinGeckoPrice {
  ethereum: {
    usd: number;
    idr: number;
  };
}

export interface PriceData {
  ethToUsd: number;
  ethToIdr: number;
  lastUpdated: number;
}

// Cache untuk menghindari too many API calls
let priceCache: PriceData | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

/**
 * Fetch real-time ETH price from CoinGecko API
 * Free tier: 10-30 calls per minute
 * No API key required
 */
export async function fetchEthPrice(): Promise<PriceData> {
  const now = Date.now();

  // Return cached data if still valid
  if (priceCache && (now - lastFetchTime) < CACHE_DURATION) {
    return priceCache;
  }

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd,idr',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: CoinGeckoPrice = await response.json();

    const priceData: PriceData = {
      ethToUsd: data.ethereum.usd,
      ethToIdr: data.ethereum.idr,
      lastUpdated: now,
    };

    // Update cache
    priceCache = priceData;
    lastFetchTime = now;

    return priceData;
  } catch (error) {
    console.error('Failed to fetch ETH price from CoinGecko:', error);

    // Return fallback prices if API fails
    const fallbackPrice: PriceData = {
      ethToUsd: 2500, // Reasonable ETH fallback price
      ethToIdr: 55000000, // ~2500 USD * 22000 IDR/USD
      lastUpdated: now,
    };

    return fallbackPrice;
  }
}

/**
 * Convert Wei to ETH as number (for calculations)
 * Separate from weiToEth string function in mock-data.ts
 */
export function weiToEthNumber(wei: bigint): number {
  return Number(wei) / 1e18;
}

/**
 * Format price in Rupiah
 */
export function formatRupiah(amount: number): string {
  if (typeof amount !== "number" || isNaN(amount)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format price in USD
 */
export function formatUSD(amount: number): string {
  if (typeof amount !== "number" || isNaN(amount)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * React hook for ETH price with auto-refresh
 */
export function useEthPrice() {
  const [priceData, setPriceData] = React.useState<PriceData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const loadPrice = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchEthPrice();

        if (mounted) {
          setPriceData(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch price');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Initial load
    loadPrice();

    // Refresh every 2 minutes
    const refreshInterval = setInterval(loadPrice, 120000);

    return () => {
      mounted = false;
      clearInterval(refreshInterval);
    };
  }, []);

  return { priceData, loading, error, refetch: fetchEthPrice };
}
