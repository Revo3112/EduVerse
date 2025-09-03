/**
 * TypeScript interfaces for EduVerse My Learning page
 * Based on smart contract analysis of CourseFactory, CourseLicense, and ProgressTracker
 */

// Course Categories from CourseFactory.sol enum
export enum CourseCategory {
  Programming = 0,
  Design = 1,
  Business = 2,
  Marketing = 3,
  DataScience = 4,
  Finance = 5,
  Healthcare = 6,
  Language = 7,
  Arts = 8,
  Mathematics = 9,
  Science = 10,
  Engineering = 11,
  Technology = 12,
  Education = 13,
  Psychology = 14,
  Culinary = 15,
  PersonalDevelopment = 16,
  Legal = 17,
  Sports = 18,
  Other = 19
}

// Course Difficulty from CourseFactory.sol enum
export enum CourseDifficulty {
  Beginner = 0,
  Intermediate = 1,
  Advanced = 2
}

// Course struct from CourseFactory.sol
export interface Course {
  id: bigint;
  title: string;
  description: string;
  thumbnailCID: string;
  creator: string;
  creatorName: string;
  isActive: boolean;
  category: CourseCategory;
  difficulty: CourseDifficulty;
  pricePerMonth: bigint;
  createdAt: bigint;
}

// License struct from CourseLicense.sol
export interface License {
  courseId: bigint;
  student: string;
  durationLicense: bigint;
  expiryTimestamp: bigint;
  isActive: boolean;
}

// Section progress from ProgressTracker.sol
export interface SectionProgress {
  courseId: bigint;
  sectionId: bigint;
  completed: boolean;
  completedAt: bigint;
}

// Enhanced learning data combining all contract data
export interface LearningCourseData {
  course: Course;
  license: License;
  progressPercentage: number; // 0-100
  isCompleted: boolean;
  completedSections: number;
  totalSections: number;
  hasCertificate: boolean;
  lastAccessedAt?: bigint;
}

// Learning progress summary
export interface LearningProgress {
  totalEnrolledCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  totalSectionsCompleted: number;
  totalLearningTime: number; // in seconds
}

// UI state management interfaces
export interface LearningPageState {
  courses: LearningCourseData[];
  progress: LearningProgress;
  isLoading: boolean;
  error: string | null;
  activeTab: 'in-progress' | 'completed';
}

// Course status for UI display
export type CourseStatus = 'not-started' | 'in-progress' | 'completed' | 'expired';

// Learning hook return type
export interface UseLearningDataReturn {
  courses: LearningCourseData[];
  progress: LearningProgress;
  inProgressCourses: LearningCourseData[];
  completedCourses: LearningCourseData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Category display names mapping
export const CATEGORY_NAMES: Record<CourseCategory, string> = {
  [CourseCategory.Programming]: 'Programming',
  [CourseCategory.Design]: 'Design',
  [CourseCategory.Business]: 'Business',
  [CourseCategory.Marketing]: 'Marketing',
  [CourseCategory.DataScience]: 'Data Science',
  [CourseCategory.Finance]: 'Finance',
  [CourseCategory.Healthcare]: 'Healthcare',
  [CourseCategory.Language]: 'Language',
  [CourseCategory.Arts]: 'Arts',
  [CourseCategory.Mathematics]: 'Mathematics',
  [CourseCategory.Science]: 'Science',
  [CourseCategory.Engineering]: 'Engineering',
  [CourseCategory.Technology]: 'Technology',
  [CourseCategory.Education]: 'Education',
  [CourseCategory.Psychology]: 'Psychology',
  [CourseCategory.Culinary]: 'Culinary',
  [CourseCategory.PersonalDevelopment]: 'Personal Development',
  [CourseCategory.Legal]: 'Legal',
  [CourseCategory.Sports]: 'Sports',
  [CourseCategory.Other]: 'Other'
};

// Difficulty display names mapping
export const DIFFICULTY_NAMES: Record<CourseDifficulty, string> = {
  [CourseDifficulty.Beginner]: 'Beginner',
  [CourseDifficulty.Intermediate]: 'Intermediate',
  [CourseDifficulty.Advanced]: 'Advanced'
};

// Status colors for UI components
export const STATUS_COLORS = {
  'not-started': 'bg-gray-500',
  'in-progress': 'bg-blue-500',
  'completed': 'bg-green-500',
  'expired': 'bg-red-500'
} as const;
