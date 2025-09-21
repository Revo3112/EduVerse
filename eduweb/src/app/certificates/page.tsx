"use client"

import { ContentContainer } from "@/components/PageContainer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
    Award,
    BookOpen,
    Calendar,
    CheckCircle,
    Clock,
    Download,
    ExternalLink,
    Eye,
    FileImage,
    GraduationCap,
    Hash,
    Medal,
    QrCode,
    Share,
    Star,
    Trophy,
    User,
    Wallet
} from "lucide-react"
import { memo, useCallback, useMemo, useState } from "react"

// Types based on CertificateManager smart contract
interface Course {
  id: number
  title: string
  category: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  completedAt: number
  rating: number
  duration: number
  instructor: string
}

interface Certificate {
  tokenId: number
  platformName: string
  recipientName: string
  recipientAddress: string
  lifetimeFlag: boolean
  isValid: boolean
  ipfsCID: string
  baseRoute: string
  issuedAt: number
  lastUpdated: number
  totalCoursesCompleted: number
  paymentReceiptHash: string
  completedCourses: Course[]
}

// Mock certificate data based on ERC-1155 structure
const mockCertificate: Certificate = {
  tokenId: 1,
  platformName: "EduVerse Academy",
  recipientName: "Alex Johnson",
  recipientAddress: "0x742d35Cc6634C0532925a3b8e7C5D7C6d4b7A0f2",
  lifetimeFlag: true,
  isValid: true,
  ipfsCID: "QmX8Y9Z1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T",
  baseRoute: "https://verify.eduverse.com/certificate",
  issuedAt: Date.now() - 180 * 24 * 60 * 60 * 1000, // 6 months ago
  lastUpdated: Date.now() - 7 * 24 * 60 * 60 * 1000,  // 1 week ago
  totalCoursesCompleted: 7,
  paymentReceiptHash: "0xa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
  completedCourses: [
    {
      id: 1,
      title: "Blockchain Fundamentals",
      category: "Technology",
      difficulty: "Beginner",
      completedAt: Date.now() - 170 * 24 * 60 * 60 * 1000,
      rating: 5,
      duration: 8,
      instructor: "Dr. Sarah Chen"
    },
    {
      id: 2,
      title: "Smart Contract Development",
      category: "Programming",
      difficulty: "Intermediate",
      completedAt: Date.now() - 150 * 24 * 60 * 60 * 1000,
      rating: 5,
      duration: 12,
      instructor: "Prof. Michael Rodriguez"
    },
    {
      id: 3,
      title: "DeFi Protocol Design",
      category: "Finance",
      difficulty: "Advanced",
      completedAt: Date.now() - 120 * 24 * 60 * 60 * 1000,
      rating: 4,
      duration: 16,
      instructor: "Dr. Emily Zhang"
    },
    {
      id: 4,
      title: "Web3 Frontend Development",
      category: "Programming",
      difficulty: "Intermediate",
      completedAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
      rating: 5,
      duration: 10,
      instructor: "Alex Thompson"
    },
    {
      id: 5,
      title: "NFT Marketplace Architecture",
      category: "Technology",
      difficulty: "Advanced",
      completedAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
      rating: 5,
      duration: 14,
      instructor: "Maria Garcia"
    },
    {
      id: 6,
      title: "Cryptocurrency Economics",
      category: "Finance",
      difficulty: "Intermediate",
      completedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
      rating: 4,
      duration: 9,
      instructor: "Dr. James Wilson"
    },
    {
      id: 7,
      title: "Decentralized Governance",
      category: "Business",
      difficulty: "Advanced",
      completedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
      rating: 5,
      duration: 11,
      instructor: "Prof. Lisa Anderson"
    }
  ]
}

const CertificateHeader = memo<{ certificate: Certificate }>(({ certificate }) => {
  const formatDate = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }, [])

  const totalHours = useMemo(() => {
    return certificate.completedCourses.reduce((sum, course) => sum + course.duration, 0)
  }, [certificate.completedCourses])

  const averageRating = useMemo(() => {
    const sum = certificate.completedCourses.reduce((total, course) => total + course.rating, 0)
    return (sum / certificate.completedCourses.length).toFixed(1)
  }, [certificate.completedCourses])

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-2">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <GraduationCap className="h-12 w-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-2">
              <Medal className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>

        <CardTitle className="text-2xl font-bold text-center mb-2">
          {certificate.platformName} Certificate
        </CardTitle>

        <div className="flex items-center justify-center space-x-2 mb-4">
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verified
          </Badge>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Trophy className="h-3 w-3 mr-1" />
            Lifetime
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{certificate.totalCoursesCompleted}</div>
            <div className="text-sm text-muted-foreground">Courses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{totalHours}h</div>
            <div className="text-sm text-muted-foreground">Learning</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{averageRating}⭐</div>
            <div className="text-sm text-muted-foreground">Avg Rating</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">#{certificate.tokenId}</div>
            <div className="text-sm text-muted-foreground">Token ID</div>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
})

CertificateHeader.displayName = 'CertificateHeader'

const CourseCard = memo<{ course: Course; index: number }>(({ course, index }) => {
  const formatDate = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }, [])

  const getDifficultyColor = useCallback((difficulty: Course['difficulty']) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'Advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
  }, [])

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
              {index + 1}
            </div>
            <div>
              <CardTitle className="text-lg">{course.title}</CardTitle>
              <CardDescription className="text-sm">
                {course.category} • {course.instructor}
              </CardDescription>
            </div>
          </div>
          <Badge className={getDifficultyColor(course.difficulty)}>
            {course.difficulty}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>Completed {formatDate(course.completedAt)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>{course.duration}h</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn("h-4 w-4",
                  i < course.rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                )}
              />
            ))}
            <span className="text-sm text-muted-foreground ml-1">
              {course.rating}/5
            </span>
          </div>

          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  )
})

CourseCard.displayName = 'CourseCard'

const CertificateDetails = memo<{ certificate: Certificate }>(({ certificate }) => {
  const formatDate = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileImage className="h-5 w-5 mr-2" />
          Certificate Details
        </CardTitle>
        <CardDescription>
          Blockchain-verified educational credentials
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Recipient</label>
            <div className="flex items-center space-x-2 mt-1">
              <User className="h-4 w-4 text-blue-500" />
              <span className="font-mono">{certificate.recipientName}</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Wallet Address</label>
            <div className="flex items-center space-x-2 mt-1">
              <Wallet className="h-4 w-4 text-purple-500" />
              <span className="font-mono text-sm">
                {certificate.recipientAddress.slice(0, 8)}...{certificate.recipientAddress.slice(-6)}
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Issued Date</label>
            <div className="flex items-center space-x-2 mt-1">
              <Calendar className="h-4 w-4 text-green-500" />
              <span>{formatDate(certificate.issuedAt)}</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
            <div className="flex items-center space-x-2 mt-1">
              <Clock className="h-4 w-4 text-orange-500" />
              <span>{formatDate(certificate.lastUpdated)}</span>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-muted-foreground">IPFS Certificate Image</label>
            <div className="flex items-center space-x-2 mt-1">
              <Hash className="h-4 w-4 text-indigo-500" />
              <span className="font-mono text-sm break-all">{certificate.ipfsCID}</span>
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h4 className="font-medium">Verification</h4>
            <p className="text-sm text-muted-foreground">
              Verify this certificate on the blockchain
            </p>
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <QrCode className="h-4 w-4 mr-2" />
              QR Code
            </Button>
            <Button variant="outline" size="sm">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

CertificateDetails.displayName = 'CertificateDetails'

const LearningProgress = memo<{ certificate: Certificate }>(({ certificate }) => {
  const sortedCourses = useMemo(() => {
    return [...certificate.completedCourses].sort((a, b) => a.completedAt - b.completedAt)
  }, [certificate.completedCourses])

  const categoryStats = useMemo(() => {
    const stats = certificate.completedCourses.reduce((acc, course) => {
      acc[course.category] = (acc[course.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(stats).map(([category, count]) => ({
      category,
      count,
      percentage: (count / certificate.totalCoursesCompleted) * 100
    }))
  }, [certificate.completedCourses, certificate.totalCoursesCompleted])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Trophy className="h-5 w-5 mr-2" />
          Learning Journey
        </CardTitle>
        <CardDescription>
          Your educational progress over time
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Category Distribution */}
        <div>
          <h4 className="font-medium mb-3">Subject Expertise</h4>
          <div className="space-y-3">
            {categoryStats.map(({ category, count, percentage }) => (
              <div key={category} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{category}</span>
                  <span>{count} courses ({percentage.toFixed(0)}%)</span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Timeline */}
        <div>
          <h4 className="font-medium mb-3">Completion Timeline</h4>
          <div className="space-y-3">
            {sortedCourses.slice(-5).map((course, index) => (
              <div key={course.id} className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{course.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(course.completedAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline">{course.category}</Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

LearningProgress.displayName = 'LearningProgress'

/**
 * Professional Certificates Page for EduVerse Platform
 *
 * Features the revolutionary "One Certificate Per User" model from CertificateManager:
 * - Single lifetime certificate that grows with learning journey
 * - ERC-1155 token standard for blockchain verification
 * - IPFS-stored certificate images with automatic updates
 * - Course completion tracking and progress analytics
 * - QR code verification system
 * - Professional certificate presentation and sharing
 *
 * Based on CertificateManager smart contract architecture:
 * - Token ID management for unique certificates
 * - Payment receipt verification for course additions
 * - Platform fee structure for certificate services
 * - Integration with CourseFactory and ProgressTracker
 */
export default function CertificatesPage() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)

  return (
    <ContentContainer>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Your Certificate</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Your lifetime learning certificate grows with every course you complete.
            This blockchain-verified credential showcases your educational journey on EduVerse.
          </p>
        </div>

        {/* Certificate Overview */}
        <CertificateHeader certificate={mockCertificate} />

        {/* Main Content Tabs */}
        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="courses">Completed Courses</TabsTrigger>
            <TabsTrigger value="details">Certificate Details</TabsTrigger>
            <TabsTrigger value="progress">Learning Analytics</TabsTrigger>
          </TabsList>

          {/* Completed Courses */}
          <TabsContent value="courses" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Completed Courses ({mockCertificate.totalCoursesCompleted})
              </h2>
              <Badge variant="outline" className="text-green-600 border-green-600">
                All courses verified on blockchain
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockCertificate.completedCourses.map((course, index) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  index={index}
                />
              ))}
            </div>
          </TabsContent>

          {/* Certificate Details */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CertificateDetails certificate={mockCertificate} />

              {/* Certificate Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="h-5 w-5 mr-2" />
                    Certificate Preview
                  </CardTitle>
                  <CardDescription>
                    Your certificate as it appears on IPFS
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-[4/3] bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg flex items-center justify-center border-2 border-dashed border-blue-200 dark:border-blue-800">
                    <div className="text-center">
                      <FileImage className="h-12 w-12 text-blue-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Certificate image stored on IPFS
                      </p>
                      <Button variant="outline" size="sm" className="mt-2">
                        <Eye className="h-4 w-4 mr-2" />
                        View Full Size
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Learning Progress */}
          <TabsContent value="progress" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LearningProgress certificate={mockCertificate} />

              {/* Achievement Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Medal className="h-5 w-5 mr-2" />
                    Achievements
                  </CardTitle>
                  <CardDescription>
                    Learning milestones and accomplishments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                      <BookOpen className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{mockCertificate.totalCoursesCompleted}</div>
                      <div className="text-sm text-muted-foreground">Courses</div>
                    </div>

                    <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                      <Trophy className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold">3</div>
                      <div className="text-sm text-muted-foreground">Categories</div>
                    </div>

                    <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
                      <Star className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold">4.7</div>
                      <div className="text-sm text-muted-foreground">Avg Rating</div>
                    </div>

                    <div className="text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                      <Clock className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold">80h</div>
                      <div className="text-sm text-muted-foreground">Learning</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium">Recent Achievements</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3 p-2 rounded-md bg-muted/50">
                        <Medal className="h-5 w-5 text-yellow-500" />
                        <div>
                          <p className="font-medium text-sm">Advanced Learner</p>
                          <p className="text-xs text-muted-foreground">Completed 5+ advanced courses</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-2 rounded-md bg-muted/50">
                        <Star className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium text-sm">Top Performer</p>
                          <p className="text-xs text-muted-foreground">Maintained 4.5+ average rating</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ContentContainer>
  )
}
