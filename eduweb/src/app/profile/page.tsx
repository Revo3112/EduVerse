"use client"

import { ContentContainer } from "@/components/PageContainer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Award,
  BookOpen,
  Calendar,
  ChevronRight,
  Clock,
  Edit,
  ExternalLink,
  GraduationCap,
  Link as LinkIcon,
  MapPin,
  Medal,
  Share,
  Star,
  Trophy,
  User,
  Wallet
} from "lucide-react"
import { memo, useCallback, useMemo } from "react"

// Types for user profile data
interface UserProfile {
  id: string
  username: string
  displayName: string
  bio: string
  avatar: string
  walletAddress: string
  location: string
  website: string
  socialLinks: {
    twitter?: string
    linkedin?: string
    github?: string
  }
  joinedAt: number
  lastActive: number
  verified: boolean
  reputation: number
  level: number
}

interface LearningStats {
  coursesCompleted: number
  totalLearningHours: number
  certificatesEarned: number
  averageRating: number
  currentStreak: number
  longestStreak: number
  skillsAcquired: string[]
}

interface TeachingStats {
  coursesCreated: number
  totalStudents: number
  totalRevenue: string
  averageRating: number
  totalReviews: number
  topCategory: string
}

interface ActivityMetadata {
  courseId?: number
  rating?: number
  certificateId?: number
  [key: string]: string | number | boolean | undefined
}

interface Activity {
  id: string
  type: 'course_completed' | 'course_created' | 'certificate_earned' | 'rating_given' | 'milestone_reached'
  title: string
  description: string
  timestamp: number
  metadata?: ActivityMetadata
}

// Mock profile data
const mockProfile: UserProfile = {
  id: "user_123",
  username: "alextech",
  displayName: "Alex Johnson",
  bio: "Passionate Web3 developer and educator. Building the future of decentralized education. Always learning, always teaching.",
  avatar: "/api/placeholder/120/120",
  walletAddress: "0x742d35Cc6634C0532925a3b8e7C5D7C6d4b7A0f2",
  location: "San Francisco, CA",
  website: "https://alextech.dev",
  socialLinks: {
    twitter: "https://twitter.com/alextech",
    linkedin: "https://linkedin.com/in/alexjohnson",
    github: "https://github.com/alextech"
  },
  joinedAt: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
  lastActive: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
  verified: true,
  reputation: 4850,
  level: 12
}

const mockLearningStats: LearningStats = {
  coursesCompleted: 7,
  totalLearningHours: 80,
  certificatesEarned: 1,
  averageRating: 4.7,
  currentStreak: 15,
  longestStreak: 45,
  skillsAcquired: [
    "Blockchain Development", "Smart Contracts", "DeFi", "NFTs",
    "Web3 Frontend", "Solidity", "React", "Node.js"
  ]
}

const mockTeachingStats: TeachingStats = {
  coursesCreated: 3,
  totalStudents: 1247,
  totalRevenue: "2.45",
  averageRating: 4.8,
  totalReviews: 89,
  topCategory: "Programming"
}

const mockActivities: Activity[] = [
  {
    id: "1",
    type: "course_completed",
    title: "Completed Decentralized Governance",
    description: "Advanced course in blockchain governance mechanisms",
    timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
    metadata: { courseId: 7, rating: 5 }
  },
  {
    id: "2",
    type: "milestone_reached",
    title: "Reached Level 12",
    description: "Unlocked advanced blockchain architect badge",
    timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000
  },
  {
    id: "3",
    type: "course_created",
    title: "Published Web3 Security Fundamentals",
    description: "New course covering smart contract security best practices",
    timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
    metadata: { courseId: 15 }
  },
  {
    id: "4",
    type: "certificate_earned",
    title: "Earned Blockchain Developer Certificate",
    description: "Completed all requirements for advanced certification",
    timestamp: Date.now() - 14 * 24 * 60 * 60 * 1000,
    metadata: { certificateId: 1 }
  }
]

const ProfileHeader = memo<{ profile: UserProfile }>(({ profile }) => {
  const formatDate = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    })
  }, [])

  const getLastActiveText = useCallback((timestamp: number) => {
    const diff = Date.now() - timestamp
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (hours < 1) return "Active now"
    if (hours < 24) return `Active ${hours}h ago`
    return `Active ${days}d ago`
  }, [])

  return (
    <Card className="relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />

      <CardContent className="relative p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-1">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                <User className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            {profile.verified && (
              <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-1">
                <Award className="h-4 w-4 text-white" />
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold">{profile.displayName}</h1>
              <Badge variant="secondary">@{profile.username}</Badge>
              <Badge variant="outline" className="text-purple-600 border-purple-600">
                Level {profile.level}
              </Badge>
            </div>

            <p className="text-muted-foreground mb-4 max-w-2xl">
              {profile.bio}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-blue-500" />
                <span>{profile.location}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-green-500" />
                <span>Joined {formatDate(profile.joinedAt)}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span>{getLastActiveText(profile.lastActive)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <Separator className="my-6" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{profile.reputation.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Reputation</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{mockLearningStats.coursesCompleted}</div>
            <div className="text-sm text-muted-foreground">Courses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{mockTeachingStats.totalStudents.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Students</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{mockLearningStats.averageRating}⭐</div>
            <div className="text-sm text-muted-foreground">Rating</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

ProfileHeader.displayName = 'ProfileHeader'

const LearningOverview = memo<{ stats: LearningStats }>(({ stats }) => {
  const skillProgress = useMemo(() => {
    return stats.skillsAcquired.map(skill => ({
      name: skill,
      level: Math.floor(Math.random() * 100) + 50 // Mock progress
    }))
  }, [stats.skillsAcquired])

  return (
    <div className="space-y-6">
      {/* Learning Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-blue-500" />
              Learning Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Courses Completed</span>
              <span className="font-semibold">{stats.coursesCompleted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Learning Hours</span>
              <span className="font-semibold">{stats.totalLearningHours}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Certificates</span>
              <span className="font-semibold">{stats.certificatesEarned}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Current Streak</span>
              <span className="font-semibold">{stats.currentStreak} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Longest Streak</span>
              <span className="font-semibold">{stats.longestStreak} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Avg Rating</span>
              <span className="font-semibold">{stats.averageRating}⭐</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <GraduationCap className="h-5 w-5 mr-2 text-purple-500" />
              Skills Acquired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-center mb-2">
              {stats.skillsAcquired.length}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Professional skills mastered
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Skills Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Skill Proficiency</CardTitle>
          <CardDescription>Your expertise levels across different technologies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skillProgress.map(({ name, level }) => (
              <div key={name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{name}</span>
                  <span>{level}%</span>
                </div>
                <Progress value={level} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

LearningOverview.displayName = 'LearningOverview'

const TeachingOverview = memo<{ stats: TeachingStats }>(({ stats }) => {
  return (
    <div className="space-y-6">
      {/* Teaching Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Courses Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.coursesCreated}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalStudents.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Revenue Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.totalRevenue} ETH</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Instructor Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.averageRating}⭐</div>
            <p className="text-xs text-muted-foreground">{stats.totalReviews} reviews</p>
          </CardContent>
        </Card>
      </div>

      {/* Course Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Course Performance</CardTitle>
          <CardDescription>Analytics for your published courses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { title: "Blockchain Fundamentals", students: 456, rating: 4.8, revenue: "0.89" },
              { title: "Smart Contract Security", students: 289, rating: 4.9, revenue: "0.67" },
              { title: "DeFi Protocol Design", students: 502, rating: 4.7, revenue: "0.89" }
            ].map((course, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{course.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {course.students} students • {course.rating}⭐ rating
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{course.revenue} ETH</div>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

TeachingOverview.displayName = 'TeachingOverview'

const ActivityFeed = memo<{ activities: Activity[] }>(({ activities }) => {
  const formatDate = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }, [])

  const getActivityIcon = useCallback((type: Activity['type']) => {
    switch (type) {
      case 'course_completed':
        return <BookOpen className="h-4 w-4 text-blue-500" />
      case 'course_created':
        return <GraduationCap className="h-4 w-4 text-green-500" />
      case 'certificate_earned':
        return <Award className="h-4 w-4 text-yellow-500" />
      case 'rating_given':
        return <Star className="h-4 w-4 text-orange-500" />
      case 'milestone_reached':
        return <Trophy className="h-4 w-4 text-purple-500" />
      default:
        return <User className="h-4 w-4 text-gray-500" />
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Your latest learning and teaching activities</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="mt-1">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">{activity.title}</h4>
                <p className="text-sm text-muted-foreground">{activity.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(activity.timestamp)}
                </p>
              </div>
              <Button variant="ghost" size="sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
})

ActivityFeed.displayName = 'ActivityFeed'

const WalletInfo = memo<{ profile: UserProfile }>(({ profile }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Wallet className="h-5 w-5 mr-2" />
          Web3 Identity
        </CardTitle>
        <CardDescription>Blockchain credentials and wallet information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">Wallet Address</label>
          <div className="flex items-center space-x-2 mt-1">
            <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
              {profile.walletAddress.slice(0, 8)}...{profile.walletAddress.slice(-6)}
            </span>
            <Button variant="ghost" size="sm">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">Network</label>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              Manta Pacific Testnet
            </Badge>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">Verification Status</label>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <Award className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="font-medium mb-3">Social Links</h4>
          <div className="space-y-2">
            {profile.website && (
              <div className="flex items-center space-x-2">
                <LinkIcon className="h-4 w-4 text-blue-500" />
                <a href={profile.website} target="_blank" rel="noopener noreferrer"
                   className="text-sm text-blue-600 hover:underline">
                  {profile.website}
                </a>
              </div>
            )}
            {Object.entries(profile.socialLinks).map(([platform, url]) => (
              <div key={platform} className="flex items-center space-x-2">
                <ExternalLink className="h-4 w-4 text-purple-500" />
                <a href={url} target="_blank" rel="noopener noreferrer"
                   className="text-sm text-purple-600 hover:underline capitalize">
                  {platform}
                </a>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

WalletInfo.displayName = 'WalletInfo'

/**
 * Professional User Profile Page for EduVerse Platform
 *
 * Comprehensive profile system featuring:
 * - Web3 identity and wallet integration
 * - Learning progress and achievements tracking
 * - Teaching statistics and course analytics
 * - Social features and reputation system
 * - Activity feed with blockchain transactions
 * - Professional portfolio presentation
 *
 * Integrates with EduVerse smart contracts:
 * - User achievements from ProgressTracker
 * - Course creation data from CourseFactory
 * - Certificate ownership from CertificateManager
 * - License management from CourseLicense
 */
export default function ProfilePage() {
  return (
    <ContentContainer>
      <div className="space-y-6">
        {/* Profile Header */}
        <ProfileHeader profile={mockProfile} />

        {/* Main Profile Content */}
        <Tabs defaultValue="learning" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="learning">Learning</TabsTrigger>
            <TabsTrigger value="teaching">Teaching</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="identity">Web3 Identity</TabsTrigger>
          </TabsList>

          {/* Learning Tab */}
          <TabsContent value="learning">
            <LearningOverview stats={mockLearningStats} />
          </TabsContent>

          {/* Teaching Tab */}
          <TabsContent value="teaching">
            <TeachingOverview stats={mockTeachingStats} />
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ActivityFeed activities={mockActivities} />

              {/* Quick Stats */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Summary</CardTitle>
                    <CardDescription>Your activity this month</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Courses Completed</span>
                      <Badge variant="secondary">2</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Learning Hours</span>
                      <Badge variant="secondary">18h</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">New Skills</span>
                      <Badge variant="secondary">3</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Streak Days</span>
                      <Badge variant="secondary">15</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Goals</CardTitle>
                    <CardDescription>Your learning objectives</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Complete Advanced DeFi Course</span>
                        <span>75%</span>
                      </div>
                      <Progress value={75} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Earn Security Specialist Badge</span>
                        <span>40%</span>
                      </div>
                      <Progress value={40} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Web3 Identity Tab */}
          <TabsContent value="identity" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WalletInfo profile={mockProfile} />

              {/* Blockchain Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Medal className="h-5 w-5 mr-2" />
                    Blockchain Achievements
                  </CardTitle>
                  <CardDescription>On-chain accomplishments and NFTs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                      <Trophy className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <div className="text-lg font-bold">1</div>
                      <div className="text-sm text-muted-foreground">Certificate NFT</div>
                    </div>

                    <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                      <Award className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                      <div className="text-lg font-bold">7</div>
                      <div className="text-sm text-muted-foreground">Course Licenses</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium">Recent Transactions</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                        <span>Certificate Updated</span>
                        <span className="text-muted-foreground">2 days ago</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                        <span>Course License Purchased</span>
                        <span className="text-muted-foreground">1 week ago</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                        <span>Course Rating Submitted</span>
                        <span className="text-muted-foreground">2 weeks ago</span>
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
