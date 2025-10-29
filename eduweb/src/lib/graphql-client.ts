/**
 * GraphQL Client Configuration for Goldsky Subgraph
 *
 * Uses graphql-request for lightweight, promise-based GraphQL queries
 * Connects to Goldsky-indexed EduVerse blockchain data
 *
 * @module graphql-client
 */

import { GraphQLClient } from "graphql-request";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Goldsky GraphQL endpoint from environment variables
 * Format: https://api.goldsky.com/api/public/project_{projectId}/subgraphs/{subgraphName}/{version}/gn
 */
const GOLDSKY_ENDPOINT = process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT || "";

/**
 * Validate endpoint configuration
 */
if (!GOLDSKY_ENDPOINT && typeof window !== "undefined") {
  console.warn(
    "[GraphQL Client] NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT not configured"
  );
}

// ============================================================================
// CLIENT INSTANCE
// ============================================================================

/**
 * Configured GraphQL client instance
 *
 * Features:
 * - Automatic request/response handling
 * - Type-safe queries with TypeScript
 * - Error handling with detailed messages
 */
export const graphqlClient = new GraphQLClient(GOLDSKY_ENDPOINT, {
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Execute a GraphQL query with error handling
 *
 * @template T - Expected response data type
 * @param query - GraphQL query string
 * @param variables - Query variables
 * @returns Promise with typed response data
 *
 * @example
 * ```typescript
 * const data = await executeQuery<{ user: User }>(
 *   gql`query GetUser($id: ID!) { user(id: $id) { id name } }`,
 *   { id: '0x123...' }
 * );
 * ```
 */
export async function executeQuery<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!GOLDSKY_ENDPOINT) {
    throw new Error(
      "Goldsky endpoint not configured. Please set NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT environment variable."
    );
  }

  try {
    const data = await graphqlClient.request<T>(query, variables);
    return data;
  } catch (error: unknown) {
    // Enhanced error logging for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[GraphQL Client] Query failed:", {
      query: query.substring(0, 100) + "...", // First 100 chars
      variables,
      error: errorMessage,
    });

    // Re-throw with user-friendly message
    if (error && typeof error === "object" && "response" in error) {
      const errorResponse = error.response as {
        errors?: Array<{ message: string }>;
      };
      if (errorResponse.errors) {
        const errorMessages = errorResponse.errors
          .map((e) => e.message)
          .join(", ");
        throw new Error(`GraphQL Error: ${errorMessages}`);
      }
    }

    if (error instanceof Error) {
      throw new Error(`Failed to fetch data: ${error.message}`);
    }

    throw new Error(`Failed to fetch data: ${String(error)}`);
  }
}

/**
 * Check if Goldsky endpoint is configured
 *
 * @returns True if endpoint is available
 */
export function isGraphQLConfigured(): boolean {
  return !!GOLDSKY_ENDPOINT;
}

/**
 * Get the configured Goldsky endpoint URL
 *
 * @returns Goldsky endpoint URL or empty string if not configured
 */
export function getGraphQLEndpoint(): string {
  return GOLDSKY_ENDPOINT;
}

// ============================================================================
// TYPE HELPERS
// ============================================================================

/**
 * Helper type for pagination parameters
 */
export interface PaginationParams {
  first?: number;
  skip?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

/**
 * Helper type for filter parameters
 */
export interface FilterParams {
  where?: Record<string, unknown>;
}

/**
 * Combined query parameters for common patterns
 */
export interface QueryParams extends PaginationParams, FilterParams {}

// ============================================================================
// EXPORTS
// ============================================================================

export default graphqlClient;
