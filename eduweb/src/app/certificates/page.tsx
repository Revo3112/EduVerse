"use client"

import { ThumbnailImage } from '@/components/ThumbnailImage'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { BookOpen, CheckCircle, Trophy } from 'lucide-react'
import React, { useCallback, useState } from 'react'

// Course Section Interface - matches ProgressTracker contract
interface CourseSection {
  id: number
  title: string
  completed: boolean
  completedAt?: string
}

// Course Category enum - matches CourseFactory contract
enum CourseCategory {
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

// Course Difficulty enum - matches CourseFactory contract
enum CourseDifficulty {
  Beginner = 0,
  Intermediate = 1,
  Advanced = 2
}

// Completed Course Interface - matches smart contract data structure
interface CompletedCourse {
  id: number
  courseId: number
  title: string
  description: string
  thumbnailCID: string
  isCompleted: boolean
  completedAt: string
  completedDate: string
  completedDay: string
  category: CourseCategory
  difficulty: CourseDifficulty
  creator: {
    name: string
    avatar: string
  }
  sections: CourseSection[]
  totalSections: number
  completedSections: number
}

// Mock Data for Completed Courses - matches smart contract structure
const mockCompletedCourses: CompletedCourse[] = [
  {
    id: 1,
    courseId: 101,
    title: "Blockchain Development Fundamentals",
    description: "Master the fundamentals of blockchain technology, smart contract development, and decentralized application (dApp) creation. Learn Solidity programming, Web3 integration, and best practices for secure smart contract development.",
    thumbnailCID: "bafybeia53xes6gxywrtwekknabt3hgt4leytd3rxh3v3vwl5aru6k6v2ku",
    isCompleted: true,
    completedAt: "2024-09-19T20:00:00Z",
    completedDate: "Sep 19",
    completedDay: "Friday",
    category: CourseCategory.Technology,
    difficulty: CourseDifficulty.Intermediate,
    creator: {
      name: "Dr. Blockchain",
      avatar: "https://i.pravatar.cc/32?u=blockchain"
    },
    sections: [
      { id: 1, title: "Introduction to Blockchain", completed: true, completedAt: "2024-09-15T10:00:00Z" },
      { id: 2, title: "Smart Contract Basics", completed: true, completedAt: "2024-09-16T14:00:00Z" },
      { id: 3, title: "Solidity Programming", completed: true, completedAt: "2024-09-17T16:00:00Z" },
      { id: 4, title: "Web3 Integration", completed: true, completedAt: "2024-09-18T18:00:00Z" },
      { id: 5, title: "Security Best Practices", completed: true, completedAt: "2024-09-19T20:00:00Z" }
    ],
    totalSections: 5,
    completedSections: 5
  },
  {
    id: 2,
    courseId: 102,
    title: "React & TypeScript Mastery",
    description: "Deep dive into modern React development with TypeScript. Learn advanced patterns, performance optimization, testing strategies, and build production-ready applications with confidence.",
    thumbnailCID: "bafybeia53xes6gxywrtwekknabt3hgt4leytd3rxh3v3vwl5aru6k6v2ku",
    isCompleted: true,
    completedAt: "2024-09-13T14:00:00Z",
    completedDate: "Sep 13",
    completedDay: "Saturday",
    category: CourseCategory.Programming,
    difficulty: CourseDifficulty.Advanced,
    creator: {
      name: "Sarah React",
      avatar: "https://i.pravatar.cc/32?u=sarah"
    },
    sections: [
      { id: 1, title: "TypeScript Fundamentals", completed: true, completedAt: "2024-09-10T09:00:00Z" },
      { id: 2, title: "Advanced React Patterns", completed: true, completedAt: "2024-09-11T11:00:00Z" },
      { id: 3, title: "State Management", completed: true, completedAt: "2024-09-12T13:00:00Z" },
      { id: 4, title: "Performance Optimization", completed: true, completedAt: "2024-09-13T14:00:00Z" }
    ],
    totalSections: 4,
    completedSections: 4
  },
  {
    id: 3,
    courseId: 103,
    title: "UI/UX Design Principles",
    description: "Learn modern UI/UX design principles, user research methods, prototyping, and create engaging user experiences. Master design tools and develop a strong design thinking mindset.",
    thumbnailCID: "bafybeia53xes6gxywrtwekknabt3hgt4leytd3rxh3v3vwl5aru6k6v2ku",
    isCompleted: true,
    completedAt: "2024-09-12T20:00:00Z",
    completedDate: "Sep 12",
    completedDay: "Friday",
    category: CourseCategory.Design,
    difficulty: CourseDifficulty.Beginner,
    creator: {
      name: "Alex Designer",
      avatar: "https://i.pravatar.cc/32?u=alex"
    },
    sections: [
      { id: 1, title: "Design Fundamentals", completed: true, completedAt: "2024-09-08T10:00:00Z" },
      { id: 2, title: "User Research", completed: true, completedAt: "2024-09-09T12:00:00Z" },
      { id: 3, title: "Prototyping", completed: true, completedAt: "2024-09-10T15:00:00Z" },
      { id: 4, title: "Design Systems", completed: true, completedAt: "2024-09-11T17:00:00Z" },
      { id: 5, title: "Usability Testing", completed: true, completedAt: "2024-09-12T20:00:00Z" }
    ],
    totalSections: 5,
    completedSections: 5
  }
]

// Helper function to get category name
const getCategoryName = (category: CourseCategory): string => {
  return CourseCategory[category]
}

// Helper function to get difficulty name
const getDifficultyName = (difficulty: CourseDifficulty): string => {
  return CourseDifficulty[difficulty]
}

// Helper function to get category color that supports light/dark mode
const getCategoryColor = (categoryName: string): string => {
  const colors: Record<string, string> = {
    Programming: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    Design: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    Business: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    Marketing: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    DataScience: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    Finance: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    Healthcare: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    Language: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    Arts: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300',
    Mathematics: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300',
    Science: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
    Engineering: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    Technology: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
    Education: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300',
    Psychology: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    Culinary: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    PersonalDevelopment: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300',
    Legal: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    Sports: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
  };
  return colors[categoryName] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
}

//================================================================//
// *** TIMELINE ITEM COMPONENT FOR CERTIFICATES *** //
//================================================================//
interface TimelineItemProps {
  course: CompletedCourse
  isLast: boolean
  onClick: () => void
}

const TimelineItem: React.FC<TimelineItemProps> = ({ course, isLast, onClick }) => {
  return (
    // Main structure per row
    <div className="relative flex">
      {/* Column 1: Completion Date */}
      <div className="w-28 flex-shrink-0 text-right pr-8 pt-1">
        <p className="font-semibold text-foreground">{course.completedDate}</p>
        <p className="text-sm text-muted-foreground">{course.completedDay}</p>
      </div>

      {/* Column 2: Timeline Dot and Connecting Line */}
      <div className="relative w-5 flex-shrink-0 flex justify-center">
        {!isLast && (
          <div
            className="absolute w-px top-5 h-full"
            style={{
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundImage: 'linear-gradient(to bottom, #4A5568 4px, transparent 4px)',
              backgroundSize: '1px 12px',
            }}
          />
        )}
        <div className="relative z-10 h-3 w-3 mt-[7px] rounded-full bg-green-500 border-2 border-background" />
      </div>

      {/* Column 3: Certificate Content Card */}
      <div className="flex-1 pb-10 pl-8">
        <Card
          onClick={onClick}
          className="bg-card border-border shadow-md transition-all hover:border-muted-foreground cursor-pointer"
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              {/* Left Column: All text details */}
              <div className="flex-1">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700/50 text-xs font-semibold px-2.5 py-0.5">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Completed
                    </Badge>
                  </div>
                  <h3 className="text-md font-bold text-foreground leading-tight">{course.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="w-4 h-4" />
                    <span>By {course.creator.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Trophy className="w-4 h-4 text-muted-foreground" />
                    <Badge variant="outline" className={getCategoryColor(getCategoryName(course.category))}>
                      {getCategoryName(course.category)}
                    </Badge>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{getDifficultyName(course.difficulty)}</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {course.completedSections}/{course.totalSections} sections completed
                  </div>
                </div>
              </div>

              {/* Right Column: Course Thumbnail */}
              <div className="relative w-24 h-24 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                <ThumbnailImage
                  cid={course.thumbnailCID}
                  alt={course.title}
                  fallback={
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-white/70" />
                    </div>
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Main Page Component
export default function CertificateTimelinePage() {
  const [selectedCourse, setSelectedCourse] = useState<CompletedCourse | null>(null);

  const handleCourseClick = useCallback((course: CompletedCourse) => {
    setSelectedCourse(course);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setSelectedCourse(null);
  }, []);

  return (
    <>
      <div className="bg-background min-h-screen p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Certificates</h1>
            <p className="text-muted-foreground">Your completed courses and earned certificates timeline.</p>
          </div>

          <div className="relative flex flex-col">
            {mockCompletedCourses.map((course, index) => (
              <TimelineItem
                key={course.id}
                course={course}
                isLast={index === mockCompletedCourses.length - 1}
                onClick={() => handleCourseClick(course)}
              />
            ))}
          </div>

        </div>
      </div>

      {/* Drawer for course details */}
      <Sheet open={!!selectedCourse} onOpenChange={(isOpen) => !isOpen && handleDrawerClose()}>
        <SheetContent className="w-full sm:max-w-lg bg-background border-l border-border text-foreground p-0">
          {selectedCourse && (
            <>
              <SheetHeader className="p-6 border-b border-border">
                <SheetTitle className="text-foreground text-xl">{selectedCourse.title}</SheetTitle>
                <SheetDescription className="text-muted-foreground">
                  Completed on {selectedCourse.completedDate} • {getCategoryName(selectedCourse.category)}
                </SheetDescription>
              </SheetHeader>
              <div className="p-6 space-y-6">
                <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted">
                  <ThumbnailImage
                    cid={selectedCourse.thumbnailCID}
                    alt={selectedCourse.title}
                    fallback={
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-white/70" />
                      </div>
                    }
                  />
                </div>

                <div>
                  <h3 className="font-semibold mb-2 text-foreground">About this course</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{selectedCourse.description}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 text-foreground">Instructor</h3>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={selectedCourse.creator.avatar} />
                      <AvatarFallback>{selectedCourse.creator.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">{selectedCourse.creator.name}</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 text-foreground">Completed Sections</h3>
                  <div className="space-y-2">
                    {selectedCourse.sections.map((section) => (
                      <div key={section.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-sm text-foreground">{section.title}</span>
                        </div>
                        {section.completedAt && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(section.completedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                        Course completed with {selectedCourse.completedSections}/{selectedCourse.totalSections} sections
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
