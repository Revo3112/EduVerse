"use client";

import { useState, useEffect, useCallback } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import {
  Course,
  LearningCourseData,
  LearningProgress,
  UseLearningDataReturn,
  CourseCategory,
  CourseDifficulty,
} from '@/types/learning';

/**
 * Custom hook to fetch user's learning data from EduVerse smart contracts
 * Integrates with CourseFactory, CourseLicense, ProgressTracker, and CertificateManager
 *
 * @returns Learning data with courses, progress, and loading states
 */
export function useLearningData(): UseLearningDataReturn {
  const account = useActiveAccount();
  const [courses, setCourses] = useState<LearningCourseData[]>([]);
  const [progress, setProgress] = useState<LearningProgress>({
    totalEnrolledCourses: 0,
    completedCourses: 0,
    inProgressCourses: 0,
    totalSectionsCompleted: 0,
    totalLearningTime: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Mock data for demonstration - Replace with actual contract calls
   */
  const generateMockLearningData = useCallback((): LearningCourseData[] => {
    if (!account?.address) return [];

    return [
      {
        course: {
          id: BigInt(1),
          title: "Advanced React Development",
          description: "Master modern React patterns, hooks, and performance optimization techniques",
          thumbnailCID: "QmXxGTaVKRA7EdB7KvXyAH2F7J5G2h4Q4K9Q6VZ8dMnJ2F",
          creator: "0x1234567890123456789012345678901234567890",
          creatorName: "React Master",
          isActive: true,
          category: CourseCategory.Programming,
          difficulty: CourseDifficulty.Advanced,
          pricePerMonth: BigInt("20000000000000000"), // 0.02 ETH
          createdAt: BigInt(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        },
        license: {
          courseId: BigInt(1),
          student: account.address,
          durationLicense: BigInt(3), // 3 months
          expiryTimestamp: BigInt(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
          isActive: true,
        },
        progressPercentage: 75,
        isCompleted: false,
        completedSections: 15,
        totalSections: 20,
        hasCertificate: false,
        lastAccessedAt: BigInt(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        course: {
          id: BigInt(2),
          title: "Smart Contract Development",
          description: "Complete guide to Solidity programming and DeFi protocols",
          thumbnailCID: "QmYyKVCRA7EdB7KvXyAH2F7J5G2h4Q4K9Q6VZ8dMnJ2G",
          creator: "0x2345678901234567890123456789012345678901",
          creatorName: "Blockchain Expert",
          isActive: true,
          category: CourseCategory.Programming,
          difficulty: CourseDifficulty.Intermediate,
          pricePerMonth: BigInt("30000000000000000"), // 0.03 ETH
          createdAt: BigInt(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
        },
        license: {
          courseId: BigInt(2),
          student: account.address,
          durationLicense: BigInt(6), // 6 months
          expiryTimestamp: BigInt(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days from now
          isActive: true,
        },
        progressPercentage: 100,
        isCompleted: true,
        completedSections: 25,
        totalSections: 25,
        hasCertificate: true,
        lastAccessedAt: BigInt(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
      {
        course: {
          id: BigInt(3),
          title: "UI/UX Design Fundamentals",
          description: "Learn the principles of user interface and user experience design",
          thumbnailCID: "QmZzLVCRA7EdB7KvXyAH2F7J5G2h4Q4K9Q6VZ8dMnJ2H",
          creator: "0x3456789012345678901234567890123456789012",
          creatorName: "Design Guru",
          isActive: true,
          category: CourseCategory.Design,
          difficulty: CourseDifficulty.Beginner,
          pricePerMonth: BigInt("15000000000000000"), // 0.015 ETH
          createdAt: BigInt(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        },
        license: {
          courseId: BigInt(3),
          student: account.address,
          durationLicense: BigInt(2), // 2 months
          expiryTimestamp: BigInt(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          isActive: true,
        },
        progressPercentage: 40,
        isCompleted: false,
        completedSections: 6,
        totalSections: 15,
        hasCertificate: false,
        lastAccessedAt: BigInt(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
    ];
  }, [account?.address]);

  /**
   * Fetches all learning data for the connected user
   * TODO: Replace mock data with actual smart contract calls
   */
  const fetchLearningData = useCallback(async () => {
    if (!account?.address) {
      setCourses([]);
      setProgress({
        totalEnrolledCourses: 0,
        completedCourses: 0,
        inProgressCourses: 0,
        totalSectionsCompleted: 0,
        totalLearningTime: 0,
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockData = generateMockLearningData();
      setCourses(mockData);

      const completedCount = mockData.filter(course => course.isCompleted).length;
      const totalSections = mockData.reduce((sum, course) => sum + course.completedSections, 0);

      setProgress({
        totalEnrolledCourses: mockData.length,
        completedCourses: completedCount,
        inProgressCourses: mockData.length - completedCount,
        totalSectionsCompleted: totalSections,
        totalLearningTime: totalSections * 1800, // Estimate 30 minutes per section
      });

    } catch (err) {
      console.error('Error fetching learning data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch learning data');
    } finally {
      setIsLoading(false);
    }
  }, [account?.address, generateMockLearningData]);

  // Fetch data when account changes
  useEffect(() => {
    fetchLearningData();
  }, [fetchLearningData]);

  // Separate courses into in-progress and completed
  const inProgressCourses = courses.filter(course => !course.isCompleted);
  const completedCourses = courses.filter(course => course.isCompleted);

  return {
    courses,
    progress,
    inProgressCourses,
    completedCourses,
    isLoading,
    error,
    refetch: fetchLearningData,
  };
}
