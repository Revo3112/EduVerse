/**
 * Hook for fetching paginated transaction history
 * Provides efficient data fetching with caching and background updates
 */

import { useQuery } from "@tanstack/react-query";
import {
  getTransactionHistory,
  TransactionRecord,
} from "@/services/network-analytics.service";

interface UseTransactionHistoryParams {
  pageSize?: number;
  page?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

interface UseTransactionHistoryReturn {
  transactions: TransactionRecord[];
  isLoading: boolean;
  error: Error | null;
  hasIndexingErrors: boolean;
  latestBlock: {
    number: string;
    timestamp: string;
  } | null;
  pagination: {
    currentPage: number;
    pageSize: number;
    hasMore: boolean;
  };
  refetch: () => Promise<void>;
}

export function useTransactionHistory({
  pageSize = 50,
  page = 1,
  orderBy = "timestamp",
  orderDirection = "desc",
}: UseTransactionHistoryParams = {}): UseTransactionHistoryReturn {
  const skip = (page - 1) * pageSize;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["transactionHistory", pageSize, page, orderBy, orderDirection],
    queryFn: () =>
      getTransactionHistory({
        first: pageSize,
        skip,
        orderBy,
        orderDirection,
      }),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes (formerly cacheTime)
    retry: (failureCount, error: unknown) => {
      // Don't retry on 4xx errors except rate limits
      const err = error as { status?: number };
      if (
        err.status &&
        err.status >= 400 &&
        err.status < 500 &&
        err.status !== 429
      ) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) =>
      Math.min(1000 * Math.pow(2, attemptIndex), 30000),
  });

  return {
    transactions: data?.transactionRecords || [],
    isLoading,
    error: error as Error | null,
    hasIndexingErrors: data?._meta.hasIndexingErrors || false,
    latestBlock: data?._meta.block || null,
    pagination: {
      currentPage: page,
      pageSize,
      // If we got fewer records than requested, we're at the end
      hasMore: data ? data.transactionRecords.length === pageSize : false,
    },
    refetch: async () => {
      await refetch();
    },
  };
}

// ============================================================================
// Example Usage
// ============================================================================
/*
function TransactionList() {
  const [page, setPage] = useState(1);
  const {
    transactions,
    isLoading,
    error,
    pagination,
    hasIndexingErrors
  } = useTransactionHistory({
    page,
    pageSize: 50
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (hasIndexingErrors) {
    console.warn('Subgraph has indexing errors');
  }

  return (
    <div>
      <table>
        <tbody>
          {transactions.map(tx => (
            <tr key={tx.hash}>
              <td>{tx.hash}</td>
              <td>{tx.eventType}</td>
              ...
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span>Page {pagination.currentPage}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={!pagination.hasMore}
        >
          Next
        </button>
      </div>
    </div>
  );
}
*/
