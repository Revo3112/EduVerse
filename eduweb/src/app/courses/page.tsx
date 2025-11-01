"use client";

import { CourseCard } from "@/components/CourseCard";
import { ContentContainer } from "@/components/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { BookOpen, Filter, Search, X, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useCourseBrowse } from "@/hooks/useCourseBrowse";
import {
  ALL_CATEGORIES,
  ALL_DIFFICULTIES,
} from "@/services/goldsky-courses.service";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * CoursesPage Component
 *
 * Main page component for browsing Web3 educational courses.
 * Features a search bar, filtering options, and a responsive grid of CourseCard components.
 *
 * ✅ INTEGRATED WITH:
 * - Goldsky GraphQL indexer for real-time course data
 * - Thirdweb for Web3 license purchase (CourseLicense NFT)
 * - IPFS/Pinata for course thumbnails (signed URLs)
 * - Real-time ETH to IDR price conversion
 */

export default function CoursesPage() {
  const [showFilters, setShowFilters] = useState(false);

  // ============================================================================
  // GOLDSKY INTEGRATION - Fetch courses from blockchain indexer
  // ============================================================================
  const {
    filteredCourses,
    totalCourses,
    filteredCount,
    isLoading,
    isRefetching,
    isError,
    error,
    ethToIDR,
    setCategory: setSelectedCategory,
    setDifficulty: setSelectedDifficulty,
    setSearchTerm,
    clearFilters,
    refresh,
  } = useCourseBrowse({
    enabled: true,
    sortBy: "newest",
    sortDirection: "desc",
    refetchInterval: 120000, // Auto-refresh every 2 minutes
  });

  // Track selected filters for UI (derived from hook state)
  const [selectedCategory, _setSelectedCategory] = useState<number | null>(
    null
  );
  const [selectedDifficulty, _setSelectedDifficulty] = useState<number | null>(
    null
  );
  const [searchTerm, _setSearchTerm] = useState("");

  // Wrapper functions to update both UI state and hook
  const handleCategoryChange = (category: number | null) => {
    _setSelectedCategory(category);
    setSelectedCategory(category);
  };

  const handleDifficultyChange = (difficulty: number | null) => {
    _setSelectedDifficulty(difficulty);
    setSelectedDifficulty(difficulty);
  };

  const handleSearchChange = (term: string) => {
    _setSearchTerm(term);
    setSearchTerm(term);
  };

  const handleClearFilters = () => {
    _setSelectedCategory(null);
    _setSelectedDifficulty(null);
    _setSearchTerm("");
    clearFilters();
  };

  // ============================================================================
  // THIRDWEB LICENSE PURCHASE - Handle course enrollment
  // ============================================================================
  const handleEnroll = async (courseId: bigint, duration: number) => {
    console.log(
      `[Courses] Enrolling in course ${courseId} for ${duration} months`
    );

    // Note: License purchase is handled by CourseCard component using useLicense hook
    // This handler is kept for compatibility, actual purchase logic is in CourseCard
    toast.loading(`Course enrollment will be handled by CourseCard component`);
  };

  // Get categories and difficulties from service (contract canonical)
  const availableCategories = ALL_CATEGORIES;
  const availableDifficulties = ALL_DIFFICULTIES;

  return (
    <ContentContainer className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Browse Courses</h1>
        <p className="text-muted-foreground text-lg">
          Discover and enroll in Web3 courses powered by blockchain technology
        </p>
        <div className="text-sm text-muted-foreground">
          Connected to Manta Pacific Testnet •{" "}
          {isLoading ? "..." : totalCourses} courses available
          {!isLoading && ethToIDR > 0 && (
            <span className="ml-2">
              • ETH: Rp{" "}
              {ethToIDR.toLocaleString("id-ID", { maximumFractionDigits: 0 })}
            </span>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses, categories, or descriptions..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button
            variant="outline"
            className="shrink-0"
            onClick={() => setShowFilters(!showFilters)}
            disabled={isLoading}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {(() => {
              const filterCount =
                (selectedCategory !== null ? 1 : 0) +
                (selectedDifficulty !== null ? 1 : 0);
              return (
                filterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 text-xs px-1.5 py-0.5"
                  >
                    {filterCount}
                  </Badge>
                )
              );
            })()}
          </Button>
          <Button
            variant="outline"
            className="shrink-0"
            onClick={refresh}
            disabled={isLoading || isRefetching}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`}
            />
            {isRefetching ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {/* Filter Options - Professional Design with All Categories */}
        {showFilters && (
          <div className="bg-muted/30 rounded-lg p-4 space-y-4">
            {/* Category Filter - Show All 20 Categories */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm">
                Category ({availableCategories.length} categories available)
              </h3>
              <div className="flex flex-wrap gap-1.5">
                <Pill
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    selectedCategory === null ? "ring-2 ring-primary" : ""
                  }`}
                  variant={selectedCategory === null ? "default" : "outline"}
                  onClick={() => handleCategoryChange(null)}
                >
                  All Categories
                </Pill>
                {availableCategories.map(({ id, name }) => (
                  <Pill
                    key={id}
                    className={`cursor-pointer transition-all hover:scale-105 ${
                      selectedCategory === id ? "ring-2 ring-primary" : ""
                    }`}
                    variant={selectedCategory === id ? "default" : "outline"}
                    onClick={() => handleCategoryChange(id)}
                  >
                    {name}
                  </Pill>
                ))}
              </div>
            </div>

            {/* Difficulty Filter */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Difficulty Level</h3>
              <div className="flex flex-wrap gap-1.5">
                <Pill
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    selectedDifficulty === null ? "ring-2 ring-primary" : ""
                  }`}
                  variant={selectedDifficulty === null ? "default" : "outline"}
                  onClick={() => handleDifficultyChange(null)}
                >
                  All Levels
                </Pill>
                {availableDifficulties.map(({ id, name }) => (
                  <Pill
                    key={id}
                    className={`cursor-pointer transition-all hover:scale-105 ${
                      selectedDifficulty === id ? "ring-2 ring-primary" : ""
                    }`}
                    variant={selectedDifficulty === id ? "default" : "outline"}
                    onClick={() => handleDifficultyChange(id)}
                  >
                    {name}
                  </Pill>
                ))}
              </div>
            </div>

            {/* Single Clear All Button - Well Positioned */}
            {(selectedCategory !== null ||
              selectedDifficulty !== null ||
              searchTerm) && (
              <div className="flex justify-center pt-3 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground gap-2"
                  onClick={handleClearFilters}
                >
                  <X className="h-4 w-4" />
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Counter - Streamlined */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">{filteredCount}</span>{" "}
            of{" "}
            <span className="font-medium text-foreground">{totalCourses}</span>{" "}
            courses
          </p>
          {/* Active Filter Summary */}
          {(searchTerm ||
            selectedCategory !== null ||
            selectedDifficulty !== null) && (
            <div className="flex items-center gap-1.5">
              {searchTerm && (
                <Pill variant="secondary" className="text-xs">
                  Search:{" "}
                  {searchTerm.length > 15
                    ? `${searchTerm.slice(0, 15)}...`
                    : searchTerm}
                </Pill>
              )}
              {selectedCategory !== null && (
                <Pill variant="secondary" className="text-xs">
                  {availableCategories.find((c) => c.id === selectedCategory)
                    ?.name || "Unknown"}
                </Pill>
              )}
              {selectedDifficulty !== null && (
                <Pill variant="secondary" className="text-xs">
                  {availableDifficulties.find(
                    (d) => d.id === selectedDifficulty
                  )?.name || "Unknown"}
                </Pill>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Course Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <BookOpen className="h-16 w-16 text-red-500 opacity-50" />
          <h3 className="text-lg font-medium text-red-600">
            Failed to load courses
          </h3>
          <p className="text-muted-foreground text-center max-w-md">
            {error?.message ||
              "An error occurred while fetching courses from Goldsky."}
          </p>
          <Button onClick={refresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onEnroll={handleEnroll}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <BookOpen className="h-16 w-16 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium">No courses found</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Try adjusting your search terms or filters to find the courses
            you&apos;re looking for.
          </p>
          <Button variant="outline" onClick={handleClearFilters}>
            Clear all filters
          </Button>
        </div>
      )}

      {/* Load More Button (placeholder for pagination) */}
      {filteredCourses.length > 0 && (
        <div className="flex justify-center pt-6">
          <Button variant="outline" size="lg" disabled>
            Load More Courses
            <span className="ml-2 text-xs text-muted-foreground">
              (Feature coming soon)
            </span>
          </Button>
        </div>
      )}

      {/* Footer Note */}
      <div className="text-center text-xs text-muted-foreground pt-8 border-t">
        <p>
          ✅ Live data from Goldsky GraphQL indexer • Real-time blockchain data
          <br />
          CourseFactory, CourseLicense, and ProgressTracker contracts on Manta
          Pacific Sepolia Testnet
        </p>
      </div>
    </ContentContainer>
  );
}
