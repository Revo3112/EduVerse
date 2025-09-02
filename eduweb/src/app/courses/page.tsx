"use client";

import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pill } from "@/components/ui/pill";
import { Search, Filter, BookOpen, X } from "lucide-react";
import { CourseCard } from "@/components/CourseCard";
import {
  mockCourses,
  Course,
  CourseCategory,
  CourseDifficulty,
  getCategoryName,
  getDifficultyName
} from "@/lib/mock-data";

/**
 * CoursesPage Component
 *
 * Main page component for browsing Web3 educational courses.
 * Features a search bar, filtering options, and a responsive grid of CourseCard components.
 *
 * Uses mock data that mirrors the structure of CourseFactory and CourseLicense smart contracts
 * deployed on Manta Pacific Testnet (chainId: 3441006).
 */

export default function CoursesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CourseCategory | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<CourseDifficulty | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter courses based on search term, category, and difficulty
  const filteredCourses = mockCourses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getCategoryName(course.category).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === null || course.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === null || course.difficulty === selectedDifficulty;

    return matchesSearch && matchesCategory && matchesDifficulty && course.isActive;
  });

  // Handle course enrollment (placeholder function)
  const handleEnroll = (courseId: bigint) => {
    console.log(`Enrolling in course with ID: ${courseId}`);
    // In a real implementation, this would interact with the CourseLicense contract
    // to mint a license NFT for the student
  };

  // Get all unique categories from the enum for filter options
  const availableCategories = Object.entries(CourseCategory)
    .filter(([key, value]) => typeof value === 'number')
    .map(([key, value]) => ({ name: key, value: value as CourseCategory }));

  // Get all difficulty levels for filter options
  const availableDifficulties = Object.entries(CourseDifficulty)
    .filter(([key, value]) => typeof value === 'number')
    .map(([key, value]) => ({ name: key, value: value as CourseDifficulty }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Browse Courses
        </h1>
        <p className="text-muted-foreground text-lg">
          Discover and enroll in Web3 courses powered by blockchain technology
        </p>
        <div className="text-sm text-muted-foreground">
          Connected to Manta Pacific Testnet • {mockCourses.length} courses available
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
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            className="shrink-0"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {(selectedCategory !== null || selectedDifficulty !== null) && (
              <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0.5">
                {(selectedCategory !== null ? 1 : 0) + (selectedDifficulty !== null ? 1 : 0)}
              </Badge>
            )}
          </Button>
        </div>

        {/* Filter Options - Professional Design with All Categories */}
        {showFilters && (
          <div className="bg-muted/30 rounded-lg p-4 space-y-4">
            {/* Category Filter - Show All 20 Categories */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Category ({availableCategories.length} categories available)</h3>
              <div className="flex flex-wrap gap-1.5">
                <Pill
                  className={`cursor-pointer transition-all hover:scale-105 ${selectedCategory === null ? 'ring-2 ring-primary' : ''}`}
                  variant={selectedCategory === null ? "default" : "outline"}
                  onClick={() => setSelectedCategory(null)}
                >
                  All Categories
                </Pill>
                {availableCategories.map(({ name, value }) => (
                  <Pill
                    key={name}
                    className={`cursor-pointer transition-all hover:scale-105 ${selectedCategory === value ? 'ring-2 ring-primary' : ''}`}
                    variant={selectedCategory === value ? "default" : "outline"}
                    onClick={() => setSelectedCategory(value)}
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
                  className={`cursor-pointer transition-all hover:scale-105 ${selectedDifficulty === null ? 'ring-2 ring-primary' : ''}`}
                  variant={selectedDifficulty === null ? "default" : "outline"}
                  onClick={() => setSelectedDifficulty(null)}
                >
                  All Levels
                </Pill>
                {availableDifficulties.map(({ name, value }) => (
                  <Pill
                    key={name}
                    className={`cursor-pointer transition-all hover:scale-105 ${selectedDifficulty === value ? 'ring-2 ring-primary' : ''}`}
                    variant={selectedDifficulty === value ? "default" : "outline"}
                    onClick={() => setSelectedDifficulty(value)}
                  >
                    {name}
                  </Pill>
                ))}
              </div>
            </div>

            {/* Single Clear All Button - Well Positioned */}
            {(selectedCategory !== null || selectedDifficulty !== null || searchTerm) && (
              <div className="flex justify-center pt-3 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground gap-2"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory(null);
                    setSelectedDifficulty(null);
                  }}
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
            Showing <span className="font-medium text-foreground">{filteredCourses.length}</span> of <span className="font-medium text-foreground">{mockCourses.length}</span> courses
          </p>
          {/* Active Filter Summary */}
          {(searchTerm || selectedCategory !== null || selectedDifficulty !== null) && (
            <div className="flex items-center gap-1.5">
              {searchTerm && (
                <Pill variant="secondary" className="text-xs">
                  Search: {searchTerm.length > 15 ? `${searchTerm.slice(0, 15)}...` : searchTerm}
                </Pill>
              )}
              {selectedCategory !== null && (
                <Pill variant="secondary" className="text-xs">
                  {getCategoryName(selectedCategory)}
                </Pill>
              )}
              {selectedDifficulty !== null && (
                <Pill variant="secondary" className="text-xs">
                  {getDifficultyName(selectedDifficulty)}
                </Pill>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Course Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id.toString()}
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
            Try adjusting your search terms or filters to find the courses you&apos;re looking for.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory(null);
              setSelectedDifficulty(null);
            }}
          >
            Clear all filters
          </Button>
        </div>
      )}

      {/* Load More Button (placeholder for pagination) */}
      {filteredCourses.length > 0 && (
        <div className="flex justify-center pt-6">
          <Button variant="outline" size="lg" disabled>
            Load More Courses
            <span className="ml-2 text-xs text-muted-foreground">(Feature coming soon)</span>
          </Button>
        </div>
      )}

      {/* Footer Note */}
      <div className="text-center text-xs text-muted-foreground pt-8 border-t">
        <p>
          * This UI demonstrates course data structures from CourseFactory and CourseLicense smart contracts.
          <br />
          In production, data would be fetched directly from Manta Pacific Testnet blockchain.
        </p>
      </div>
    </div>
  );
}
