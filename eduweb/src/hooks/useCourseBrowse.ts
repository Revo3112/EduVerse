/**
 * ============================================================================
 * USE COURSE BROWSE HOOK
 * ============================================================================
 * Custom React hook untuk browse courses dari Goldsky indexer dengan
 * automatic filtering, sorting, search, dan integrasi dengan useEthPrice.
 * ============================================================================
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getAllCourses,
  applyFilters,
  applySorting,
  refreshCoursesData,
  type CourseBrowseData,
  type CourseFilters,
  type CourseSortOptions,
} from "@/services/goldsky-courses.service";
import { useEthPrice } from "@/hooks/useEthPrice";

// ============================================================================
// TYPES
// ============================================================================

export interface UseCourseBrowseOptions {
  enabled?: boolean;
  category?: number | null;
  difficulty?: number | null;
  searchTerm?: string;
  minRating?: number;
  maxPrice?: number; // in ETH
  sortBy?: "newest" | "enrollments" | "rating" | "price";
  sortDirection?: "asc" | "desc";
  refetchInterval?: number; // Auto refetch interval in ms
  onSuccess?: (courses: CourseBrowseData[]) => void;
  onError?: (error: unknown) => void;
}

export interface UseCourseBrowseReturn {
  // Raw data
  courses: CourseBrowseData[];

  // Filtered & sorted data
  filteredCourses: CourseBrowseData[];

  // Count info
  totalCourses: number;
  filteredCount: number;

  // Loading states
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  error: Error | null;

  // ETH price info
  ethToIDR: number;
  isPriceLoading: boolean;

  // Actions
  refetch: () => Promise<void>;
  refresh: () => void;

  // Filter/sort helpers
  setCategory: (category: number | null) => void;
  setDifficulty: (difficulty: number | null) => void;
  setSearchTerm: (term: string) => void;
  setSortBy: (sortBy: "newest" | "enrollments" | "rating" | "price") => void;
  setSortDirection: (direction: "asc" | "desc") => void;
  clearFilters: () => void;
}

// ============================================================================
// MAIN HOOK: useCourseBrowse
// ============================================================================

/**
 * Hook utama untuk browse courses dari Goldsky dengan filtering dan sorting
 *
 * @param options - Configuration options
 * @returns Course data dengan filtering, sorting, dan helper functions
 *
 * @example
 * ```tsx
 * function CoursesPage() {
 *   const {
 *     filteredCourses,
 *     isLoading,
 *     setCategory,
 *     setSearchTerm,
 *     ethToIDR
 *   } = useCourseBrowse({
 *     sortBy: 'newest',
 *     refetchInterval: 120000 // 2 minutes
 *   });
 *
 *   if (isLoading) return <LoadingSpinner />;
 *
 *   return (
 *     <div>
 *       <SearchBar onChange={setSearchTerm} />
 *       <CategoryFilter onChange={setCategory} />
 *       {filteredCourses.map(course => (
 *         <CourseCard key={course.id} course={course} ethToIDR={ethToIDR} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCourseBrowse(
  options: UseCourseBrowseOptions = {}
): UseCourseBrowseReturn {
  const {
    enabled = true,
    category: initialCategory = null,
    difficulty: initialDifficulty = null,
    searchTerm: initialSearchTerm = "",
    minRating,
    maxPrice,
    sortBy: initialSortBy = "newest",
    sortDirection: initialSortDirection = "desc",
    refetchInterval,
    onSuccess,
    onError,
  } = options;

  // Get ETH price for price conversion
  const {
    ethToIDR,
    isLoading: isPriceLoading,
  } = useEthPrice();

  // State
  const [courses, setCourses] = useState<CourseBrowseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Filter & sort state
  const [category, setCategory] = useState<number | null>(initialCategory);
  const [difficulty, setDifficulty] = useState<number | null>(initialDifficulty);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [sortBy, setSortBy] = useState<"newest" | "enrollments" | "rating" | "price">(
    initialSortBy
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    initialSortDirection
  );

  // ============================================================================
  // FETCH FUNCTION
  // ============================================================================

  const fetchCourses = useCallback(
    async (isRefetch = false) => {
      if (!enabled) {
        setIsLoading(false);
        return;
      }

      try {
        if (isRefetch) {
          setIsRefetching(true);
        } else {
          setIsLoading(true);
        }
        setIsError(false);
        setError(null);

        console.log("[useCourseBrowse] Fetching courses from Goldsky...");

        // Fetch from Goldsky with ETH price for conversion
        const fetchedCourses = await getAllCourses({
          first: 100,
          skip: 0,
          ethToIDR: ethToIDR || undefined,
        });

        console.log(`[useCourseBrowse] Fetched ${fetchedCourses.length} courses`);

        setCourses(fetchedCourses);
        setIsError(false);
        setError(null);

        if (onSuccess) {
          onSuccess(fetchedCourses);
        }
      } catch (err: unknown) {
        console.error("[useCourseBrowse] Error fetching courses:", err);
        setIsError(true);
        setError(
          err instanceof Error ? err : new Error("Failed to fetch courses")
        );

        if (onError) {
          onError(err);
        }
      } finally {
        setIsLoading(false);
        setIsRefetching(false);
      }
    },
    [enabled, ethToIDR, onSuccess, onError]
  );

  // ============================================================================
  // INITIAL FETCH
  // ============================================================================

  useEffect(() => {
    fetchCourses(false);
  }, [fetchCourses]);

  // ============================================================================
  // AUTO REFETCH INTERVAL
  // ============================================================================

  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const intervalId = setInterval(() => {
      console.log("[useCourseBrowse] Auto-refetch triggered");
      fetchCourses(true);
    }, refetchInterval);

    return () => clearInterval(intervalId);
  }, [refetchInterval, enabled, fetchCourses]);

  // ============================================================================
  // REFETCH & REFRESH FUNCTIONS
  // ============================================================================

  const refetch = useCallback(async () => {
    await fetchCourses(true);
  }, [fetchCourses]);

  const refresh = useCallback(() => {
    console.log("[useCourseBrowse] Manual refresh - clearing cache");
    refreshCoursesData();
    fetchCourses(true);
  }, [fetchCourses]);

  // ============================================================================
  // CLEAR FILTERS
  // ============================================================================

  const clearFilters = useCallback(() => {
    setCategory(null);
    setDifficulty(null);
    setSearchTerm("");
  }, []);

  // ============================================================================
  // APPLY FILTERS & SORTING (Memoized)
  // ============================================================================

  const filteredCourses = useMemo(() => {
    if (courses.length === 0) return [];

    console.log("[useCourseBrowse] Applying filters and sorting...");

    // Build filter object
    const filters: CourseFilters = {
      category: category !== null ? category : undefined,
      difficulty: difficulty !== null ? difficulty : undefined,
      searchTerm: searchTerm || undefined,
      minRating,
      maxPrice,
    };

    // Apply filters
    let filtered = applyFilters(courses, filters);

    console.log(`[useCourseBrowse] Filtered: ${courses.length} → ${filtered.length} courses`);

    // Apply sorting
    const sortOptions: CourseSortOptions = {
      sortBy,
      sortDirection,
    };

    filtered = applySorting(filtered, sortOptions);

    console.log(`[useCourseBrowse] Sorted by ${sortBy} (${sortDirection})`);

    return filtered;
  }, [
    courses,
    category,
    difficulty,
    searchTerm,
    minRating,
    maxPrice,
    sortBy,
    sortDirection,
  ]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Data
    courses,
    filteredCourses,

    // Count info
    totalCourses: courses.length,
    filteredCount: filteredCourses.length,

    // Loading states
    isLoading,
    isRefetching,
    isError,
    error,

    // ETH price
    ethToIDR,
    isPriceLoading,

    // Actions
    refetch,
    refresh,

    // Filter/sort setters
    setCategory,
    setDifficulty,
    setSearchTerm,
    setSortBy,
    setSortDirection,
    clearFilters,
  };
}

// ============================================================================
// COMPANION HOOK: useCourseBrowseSimple
// ============================================================================

/**
 * Simplified hook tanpa filter management (untuk simple list)
 *
 * @example
 * ```tsx
 * function SimpleCourseList() {
 *   const { courses, isLoading } = useCourseBrowseSimple();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return courses.map(course => <CourseCard key={course.id} course={course} />);
 * }
 * ```
 */
export function useCourseBrowseSimple() {
  const { courses, isLoading, isError, error, refetch } = useCourseBrowse({
    enabled: true,
  });

  return {
    courses,
    isLoading,
    isError,
    error,
    refetch,
  };
}

// ============================================================================
// COMPANION HOOK: useCourseDetail
// ============================================================================

/**
 * Hook untuk single course detail (dari browse context)
 *
 * @example
 * ```tsx
 * function CourseDetailPage({ courseId }: { courseId: string }) {
 *   const { course, isLoading } = useCourseDetail(courseId);
 *
 *   if (isLoading) return <Spinner />;
 *   if (!course) return <NotFound />;
 *
 *   return <CourseDetail course={course} />;
 * }
 * ```
 */
export function useCourseDetail(courseId: string | undefined) {
  const { courses, isLoading } = useCourseBrowse({
    enabled: !!courseId,
  });

  const course = useMemo(() => {
    if (!courseId || courses.length === 0) return null;
    return courses.find((c) => c.id === courseId) || null;
  }, [courseId, courses]);

  return {
    course,
    isLoading,
  };
}
