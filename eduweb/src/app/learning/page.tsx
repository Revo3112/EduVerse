"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Trophy, TrendingUp, Clock, PlayCircle, CheckCircle, Award, Calendar, User } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

/**
 * Static Learning Page - UI Mockup
 * Clean interface without external dependencies for development
 */
export default function LearningPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'in-progress' | 'history'>('in-progress');

  // Handle course actions
  const handleContinueLearning = (courseId: number) => {
    router.push(`/learning/course-details?id=${courseId}`);
  };

  const handleViewCertificate = (courseId: number) => {
    router.push(`/certificates/${courseId}`);
  };

  // Format learning time
  const formatLearningTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  // Format date consistently for SSR/client hydration
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  };

  // Static learning statistics
  const learningStats = {
    totalEnrolledCourses: 5,
    completedCourses: 2,
    inProgressCourses: 3,
    totalSectionsCompleted: 84,
    totalLearningTime: 147600, // 41 hours in seconds
  };

  // In-progress courses data
  const inProgressCourses = [
    {
      id: 1,
      title: "Advanced Solidity Development",
      instructor: "Prof. Bob Wilson",
      progress: 75,
      totalSections: 12,
      completedSections: 9,
      nextSection: "Gas Optimization Techniques",
      status: "In Progress",
      timeSpent: "28 hours",
      category: "Smart Contracts",
      difficulty: "Advanced",
      enrolledDate: "2024-08-15",
    },
    {
      id: 2,
      title: "DeFi Protocol Design",
      instructor: "Sarah Chen",
      progress: 45,
      totalSections: 10,
      completedSections: 4,
      nextSection: "Liquidity Pool Implementation",
      status: "In Progress",
      timeSpent: "18 hours",
      category: "DeFi",
      difficulty: "Intermediate",
      enrolledDate: "2024-08-20",
    },
    {
      id: 3,
      title: "React Native Mobile Development",
      instructor: "Alex Rodriguez",
      progress: 30,
      totalSections: 15,
      completedSections: 4,
      nextSection: "Navigation Patterns",
      status: "In Progress",
      timeSpent: "12 hours",
      category: "Mobile Development",
      difficulty: "Intermediate",
      enrolledDate: "2024-09-01",
    }
  ];

  // History courses data (completed + expired licenses)
  const historyCourses = [
    // Completed courses with certificates
    {
      id: 4,
      title: "Blockchain Fundamentals",
      instructor: "Dr. Alice Johnson",
      progress: 100,
      totalSections: 8,
      completedSections: 8,
      nextSection: null,
      status: "Completed",
      timeSpent: "16 hours",
      category: "Blockchain",
      difficulty: "Beginner",
      enrolledDate: "2024-07-10",
      completedDate: "2024-07-25",
      certificateId: "CERT-001-2024"
    },
    {
      id: 5,
      title: "Smart Contract Security",
      instructor: "Michael Zhang",
      progress: 100,
      totalSections: 6,
      completedSections: 6,
      nextSection: null,
      status: "Completed",
      timeSpent: "14 hours",
      category: "Security",
      difficulty: "Advanced",
      enrolledDate: "2024-07-20",
      completedDate: "2024-08-05",
      certificateId: "CERT-002-2024"
    },
    // Expired license courses
    {
      id: 6,
      title: "NFT Marketplace Development",
      instructor: "Emma Thompson",
      progress: 65,
      totalSections: 12,
      completedSections: 8,
      nextSection: null,
      status: "License Expired",
      timeSpent: "22 hours",
      category: "NFT",
      difficulty: "Intermediate",
      enrolledDate: "2024-06-01",
      expiredDate: "2024-08-30"
    },
    {
      id: 7,
      title: "Layer 2 Scaling Solutions",
      instructor: "David Kim",
      progress: 25,
      totalSections: 10,
      completedSections: 2,
      nextSection: null,
      status: "License Expired",
      timeSpent: "8 hours",
      category: "Blockchain",
      difficulty: "Advanced",
      enrolledDate: "2024-05-15",
      expiredDate: "2024-08-15"
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">My Learning</h1>
          <p className="text-muted-foreground">
            Track your progress and continue your Web3 education journey
          </p>
        </div>
      </div>

      {/* Learning Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Enrolled Courses</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{learningStats.totalEnrolledCourses}</div>
            <p className="text-xs text-muted-foreground">
              Keep going!
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-yellow-600" />
              <span>Courses Completed</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{learningStats.completedCourses}</div>
            <p className="text-xs text-muted-foreground">
              Great achievement!
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span>Sections Done</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{learningStats.totalSectionsCompleted}</div>
            <p className="text-xs text-muted-foreground">
              Sections completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <span>Total Study Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatLearningTime(learningStats.totalLearningTime)}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>
      <Separator />

      {/* Course Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'in-progress' | 'history')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger
            value="in-progress"
            className="flex items-center gap-2 cursor-pointer hover:bg-accent/80 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
          >
            <BookOpen className="w-4 h-4" />
            In Progress ({inProgressCourses.length})
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="flex items-center gap-2 cursor-pointer hover:bg-accent/80 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
          >
            <Trophy className="w-4 h-4" />
            History ({historyCourses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="in-progress" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inProgressCourses.map((course) => (
              <Card key={course.id} className="group hover:shadow-lg transition-all duration-300 border border-border bg-card h-full flex flex-col">
                <CardHeader className="space-y-4">
                  {/* Course Thumbnail Placeholder */}
                  <div className="relative aspect-video w-full overflow-hidden rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-white/70" />
                  </div>

                  {/* Course Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {course.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {course.difficulty}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-lg leading-tight">{course.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{course.instructor}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col space-y-4">
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress: {course.completedSections}/{course.totalSections} sections</span>
                      <span>{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} className="w-full" />
                  </div>

                  {/* Course Details */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{course.timeSpent}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Started {formatDate(course.enrolledDate)}</span>
                    </div>
                  </div>

                  {/* Next Section - Auto push to bottom */}
                  <div className="pt-2 mt-auto">
                    <p className="text-sm text-muted-foreground mb-3">
                      Next: {course.nextSection}
                    </p>
                    <Button
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      onClick={() => handleContinueLearning(course.id)}
                    >
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Continue Learning
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {historyCourses.map((course) => (
              <Card key={course.id} className="group hover:shadow-lg transition-all duration-300 border border-border bg-card h-full flex flex-col">
                <CardHeader className="space-y-4">
                  {/* Course Thumbnail Placeholder */}
                  <div className={`relative aspect-video w-full overflow-hidden rounded-md ${
                    course.status === 'Completed'
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                      : 'bg-gradient-to-br from-gray-500 to-gray-600'
                  } flex items-center justify-center`}>
                    {course.status === 'Completed' ? (
                      <Trophy className="w-12 h-12 text-white/70" />
                    ) : (
                      <Clock className="w-12 h-12 text-white/70" />
                    )}
                  </div>

                  {/* Course Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {course.category}
                      </Badge>
                      <Badge
                        variant={course.status === 'Completed' ? 'default' : 'outline'}
                        className={`text-xs ${
                          course.status === 'Completed'
                            ? 'bg-green-500 hover:bg-green-600'
                            : 'border-yellow-500 text-yellow-600'
                        }`}
                      >
                        {course.status}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-lg leading-tight">{course.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{course.instructor}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col space-y-4">
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress: {course.completedSections}/{course.totalSections} sections</span>
                      <span className={course.status === 'Completed' ? 'text-green-600 font-semibold' : 'text-yellow-600'}>
                        {course.progress}%
                      </span>
                    </div>
                    <Progress value={course.progress} className="w-full" />
                  </div>

                  {/* Course Details */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{course.timeSpent}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {course.status === 'Completed'
                          ? `Completed ${formatDate(course.completedDate!)}`
                          : `Expired ${formatDate(course.expiredDate!)}`
                        }
                      </span>
                    </div>
                  </div>

                  {/* Status and Action - Auto push to bottom */}
                  <div className="pt-2 mt-auto">
                    {course.status === 'Completed' ? (
                      <>
                        <p className="text-sm text-green-600 mb-3 font-medium">
                          ✓ Certificate earned: {course.certificateId}
                        </p>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handleViewCertificate(course.id)}
                        >
                          <Award className="w-4 h-4 mr-2" />
                          View Certificate
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-yellow-600 mb-3 font-medium">
                          ⚠ License expired - {course.progress}% completed
                        </p>
                        <Button
                          variant="outline"
                          className="w-full border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                          onClick={() => handleContinueLearning(course.id)}
                        >
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Renew & Continue
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
