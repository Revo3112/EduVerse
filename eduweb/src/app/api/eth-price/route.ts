import { NextRequest, NextResponse } from 'next/server';

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=idr';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const REQUEST_TIMEOUT = 8000; // 8 seconds (reduced from 10)

// Global cache and request deduplication
let cachedData: {
  ethToIDR: number;
  timestamp: number;
} | null = null;

let ongoingRequest: Promise<any> | null = null;

// Rate limiting tracking
const requestLog = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 10; // Conservative limit

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const requests = requestLog.get(clientId) || [];

  // Clean old requests
  const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
  requestLog.set(clientId, recentRequests);

  return recentRequests.length >= MAX_REQUESTS_PER_MINUTE;
}

function logRequest(clientId: string): void {
  const now = Date.now();
  const requests = requestLog.get(clientId) || [];
  requests.push(now);
  requestLog.set(clientId, requests);
}

export async function GET(request: NextRequest) {
  const clientId = request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'anonymous';

  try {
    // Rate limiting check
    if (isRateLimited(clientId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          data: null,
          retryAfter: 60
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Remaining': '0'
          }
        }
      );
    }

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
        lastUpdated: new Date(cachedData.timestamp).toISOString(),
        cacheExpiresIn: Math.max(0, Math.ceil((CACHE_DURATION - (Date.now() - cachedData.timestamp)) / 1000))
      });
    }

    logRequest(clientId);

    // Request deduplication - reuse ongoing request
    if (ongoingRequest) {
      const result = await ongoingRequest;
      return NextResponse.json(result);
    }

    // Create new request with deduplication
    ongoingRequest = fetchEthPrice();

    try {
      const result = await ongoingRequest;
      return NextResponse.json(result);
    } finally {
      ongoingRequest = null; // Clear ongoing request
    }

  } catch (error) {
    ongoingRequest = null; // Clear on error
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

async function fetchEthPrice() {
  // Fetch from CoinGecko API with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

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

  return {
    success: true,
    data: data,
    cached: false,
    lastUpdated: new Date(now).toISOString(),
    cacheExpiresIn: Math.ceil(CACHE_DURATION / 1000)
  };
}
