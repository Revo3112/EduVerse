import { NextRequest, NextResponse } from 'next/server';

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=idr';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let cachedData: {
  ethToIDR: number;
  timestamp: number;
} | null = null;

export async function GET(request: NextRequest) {
  try {
    // Check cache first
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: {
          ethereum: {
            idr: cachedData.ethToIDR
          }
        },
        cached: true,
        lastUpdated: new Date(cachedData.timestamp).toISOString()
      });
    }

    // Fetch from CoinGecko API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(COINGECKO_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'EduVerse-Web3-Platform/1.0'
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`CoinGecko API responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.ethereum || typeof data.ethereum.idr !== 'number') {
      throw new Error('Invalid response format from CoinGecko API');
    }

    // Update cache
    const now = Date.now();
    cachedData = {
      ethToIDR: data.ethereum.idr,
      timestamp: now,
    };

    return NextResponse.json({
      success: true,
      data: data,
      cached: false,
      lastUpdated: new Date(now).toISOString()
    });

  } catch (error) {
    console.error('Error in eth-price API route:', error);

    // Return cached data if available, even if expired
    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: {
          ethereum: {
            idr: cachedData.ethToIDR
          }
        },
        cached: true,
        error: 'Using cached data due to API error',
        lastUpdated: new Date(cachedData.timestamp).toISOString()
      });
    }

    // If no cached data available, return error
    let errorMessage = 'Failed to fetch ETH price';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout while fetching ETH price';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        data: null
      },
      { status: 500 }
    );
  }
}
