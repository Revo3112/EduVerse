"use client"

import { PageContainer } from '@/components/PageContainer'
import { ThumbnailImage } from '@/components/ThumbnailImage'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Award, BookOpen, Calendar, CheckCircle, Clock, QrCode, Shield, Trophy } from 'lucide-react'
import React, { useCallback, useState } from 'react'

// ==================== IMPORT SMART CONTRACT TYPES ====================
// Import from mock-data.ts which matches smart contracts exactly (uses bigint)
import {
  Certificate as BlockchainCertificate,
  CourseCategory,
  CourseDifficulty,
  getCategoryName,
  getDifficultyName
} from '@/lib/mock-data'

/**
 * ==================== BLOCKCHAIN INTEGRATION GUIDE ====================
 *
 * This page is READY for blockchain integration with certificate-blockchain.service.ts
 *
 * CURRENT STATE:
 * ✅ Types imported from mock-data.ts (matches smart contracts with bigint)
 * ✅ Conversion helpers ready (convertBlockchainCertificate)
 * ✅ UI components support both mock and real data
 * ⏳ Using mock data until blockchain/Goldsky integration
 *
 * INTEGRATION STEPS:
 * 1. Import service: import { getUserCertificateId, getCertificateDetails } from '@/services/certificate-blockchain.service'
 * 2. Add wallet hook: const account = useActiveAccount()
 * 3. Load certificate: const cert = await getCertificateDetails(tokenId)
 * 4. Convert to UI: const uiCert = convertBlockchainCertificate(cert, enrichedCourses)
 * 5. Render: <CertificateCard certificate={uiCert} />
 *
 * REQUIRES GOLDSKY FOR:
 * - Enriched course data (titles, thumbnails, creator info)
 * - initialMintPrice from first payment event
 * - completedCourses array with full course details
 *
 * WITHOUT GOLDSKY (Basic Integration):
 * - Can show certificate with course IDs only
 * - Must manually fetch course details for each ID
 * - Limited UX but functional
 *
 * =======================================================================
 */

// ==================== UI TYPES ====================
// For display purposes, we convert bigint to number/string for UI rendering

/**
 * @interface Certificate
 * @description UI-friendly certificate type with bigint converted to number for display
 * @note For blockchain integration, use BlockchainCertificate type from service
 */
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
  completedCourses: CourseInCertificate[]
  initialMintPrice: number
}

/**
 * @interface CourseInCertificate
 * @description Enriched course data from CourseFactory + ProgressTracker + CertificateManager events
 * @note This requires Goldsky indexer to combine data from multiple contracts
 */
interface CourseInCertificate {
  courseId: number
  title: string
  description: string
  thumbnailCID: string
  category: CourseCategory
  difficulty: CourseDifficulty
  creator: {
    address: string
    name: string
    avatar: string
  }
  completedAt: number
  addedToCertificateAt: number
  pricePaid: number
  isFirstCourse: boolean
}

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

const formatMantaPrice = (wei: number): string => (wei / 1e18).toFixed(4) + ' MANTA'
const formatDate = (timestamp: number): string => new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

// ==================== BLOCKCHAIN CONVERSION HELPERS ====================
/**
 * Helper functions to convert blockchain BigInt data to UI-friendly types
 * Use these when integrating with certificate-blockchain.service.ts
 */

/**
 * Convert blockchain certificate (bigint) to UI certificate (number)
 * @param blockchainCert Certificate from smart contract with bigint types
 * @param enrichedCourses Enriched course data from Goldsky (optional)
 * @returns UI-friendly certificate with number types
 */
const convertBlockchainCertificate = (
  blockchainCert: BlockchainCertificate,
  enrichedCourses?: CourseInCertificate[]
): Certificate => ({
  tokenId: Number(blockchainCert.tokenId),
  platformName: blockchainCert.platformName,
  recipientName: blockchainCert.recipientName,
  recipientAddress: blockchainCert.recipientAddress,
  lifetimeFlag: blockchainCert.lifetimeFlag,
  isValid: blockchainCert.isValid,
  ipfsCID: blockchainCert.ipfsCID,
  baseRoute: blockchainCert.baseRoute,
  issuedAt: Number(blockchainCert.issuedAt) * 1000, // Convert to milliseconds
  lastUpdated: Number(blockchainCert.lastUpdated) * 1000,
  totalCoursesCompleted: Number(blockchainCert.totalCoursesCompleted),
  paymentReceiptHash: blockchainCert.paymentReceiptHash,
  completedCourses: enrichedCourses || [], // Requires Goldsky to enrich
  initialMintPrice: 0 // TODO: Get from first payment event via Goldsky
});

/**
 * Format BigInt wei amount to MANTA display string
 * @param wei Amount in wei (bigint)
 * @returns Formatted string like "0.0010 MANTA"
 */
const formatMantaPriceFromBigInt = (wei: bigint): string => {
  const eth = Number(wei) / 1e18;
  return eth.toFixed(4) + ' MANTA';
};

/**
 * Format BigInt timestamp to human-readable date
 * @param timestamp Unix timestamp in seconds (bigint)
 * @returns Formatted date string
 */
const formatDateFromBigInt = (timestamp: bigint): string => {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// ==================== MOCK DATA ====================
const mockCertificate: Certificate = {
  tokenId: 1,
  platformName: "EduVerse Academy",
  recipientName: "Alex Johnson",
  recipientAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
  lifetimeFlag: true,
  isValid: true,
  ipfsCID: "bafybeia53xes6gxywrtwekknabt3hgt4leytd3rxh3v3vwl5aru6k6v2ku",
  baseRoute: "https://eduverse.com/verify/cert",
  issuedAt: 1726761600000,
  lastUpdated: 1728844800000,
  totalCoursesCompleted: 3,
  paymentReceiptHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  initialMintPrice: 1000000000000000,
  completedCourses: [
    {
      courseId: 101,
      title: "Blockchain Development Fundamentals",
      description: "Master the fundamentals of blockchain technology, smart contract development, and decentralized application (dApp) creation.",
      thumbnailCID: "bafybeia53xes6gxywrtwekknabt3hgt4leytd3rxh3v3vwl5aru6k6v2ku",
      category: CourseCategory.Technology,
      difficulty: CourseDifficulty.Intermediate,
      creator: { address: "0x1234567890123456789012345678901234567890", name: "Dr. Blockchain", avatar: "https://i.pravatar.cc/32?u=blockchain" },
      completedAt: 1726761600000,
      addedToCertificateAt: 1726761600000,
      pricePaid: 1000000000000000,
      isFirstCourse: true
    },
    {
      courseId: 102,
      title: "React & TypeScript Mastery",
      description: "Deep dive into modern React development with TypeScript. Learn advanced patterns and performance optimization.",
      thumbnailCID: "bafybeia53xes6gxywrtwekknabt3hgt4leytd3rxh3v3vwl5aru6k6v2ku",
      category: CourseCategory.Programming,
      difficulty: CourseDifficulty.Advanced,
      creator: { address: "0x2345678901234567890123456789012345678901", name: "Sarah React", avatar: "https://i.pravatar.cc/32?u=sarah" },
      completedAt: 1727625600000,
      addedToCertificateAt: 1727712000000,
      pricePaid: 100000000000000,
      isFirstCourse: false
    },
    {
      courseId: 103,
      title: "UI/UX Design Principles",
      description: "Learn modern UI/UX design principles, user research methods, and prototyping.",
      thumbnailCID: "bafybeia53xes6gxywrtwekknabt3hgt4leytd3rxh3v3vwl5aru6k6v2ku",
      category: CourseCategory.Design,
      difficulty: CourseDifficulty.Beginner,
      creator: { address: "0x3456789012345678901234567890123456789012", name: "Alex Designer", avatar: "https://i.pravatar.cc/32?u=alex" },
      completedAt: 1728758400000,
      addedToCertificateAt: 1728844800000,
      pricePaid: 100000000000000,
      isFirstCourse: false
    }
  ]
}

//================================================================//
// *** CERTIFICATE CARD COMPONENT *** //
//================================================================//
interface CertificateCardProps {
  certificate: Certificate
  onCourseClick: (course: CourseInCertificate) => void
}

const CertificateCard: React.FC<CertificateCardProps> = ({ certificate, onCourseClick }) => {
  return (
    <Card className="bg-card border-border shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-8 h-8 text-yellow-500" />
              <div>
                <h2 className="text-2xl font-bold text-foreground">{certificate.platformName}</h2>
                <p className="text-sm text-muted-foreground">Digital Learning Certificate</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700/50">
                <Shield className="w-3 h-3 mr-1" />
                {certificate.lifetimeFlag ? 'Lifetime Valid' : 'Limited'}
              </Badge>
              <Badge variant="outline" className="text-xs">Token #{certificate.tokenId}</Badge>
              {certificate.isValid ? (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700/50">Active</Badge>
              ) : (
                <Badge variant="destructive">Revoked</Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-24 h-24 bg-white dark:bg-gray-800 p-2 rounded-lg border-2 border-border flex items-center justify-center">
              <QrCode className="w-20 h-20 text-foreground" />
            </div>
            <p className="text-xs text-muted-foreground text-center">Scan to verify</p>
          </div>
        </div>

        <div className="relative w-full h-64 rounded-lg overflow-hidden bg-muted mb-6">
          <ThumbnailImage
            cid={certificate.ipfsCID}
            alt={`${certificate.recipientName} Certificate`}
            fallback={
              <div className="w-full h-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                <Award className="w-16 h-16 text-white/70" />
              </div>
            }
          />
        </div>

        <div className="bg-secondary p-4 rounded-lg mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Recipient Name</p>
              <p className="font-semibold text-foreground">{certificate.recipientName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
              <p className="font-mono text-xs text-foreground">
                {certificate.recipientAddress.substring(0, 6)}...{certificate.recipientAddress.substring(38)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />Issued On
              </p>
              <p className="text-sm text-foreground">{formatDate(certificate.issuedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />Last Updated
              </p>
              <p className="text-sm text-foreground">{formatDate(certificate.lastUpdated)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="font-semibold text-green-700 dark:text-green-300">
              {certificate.totalCoursesCompleted} {certificate.totalCoursesCompleted === 1 ? 'Course' : 'Courses'} Completed
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Initial Mint Price</p>
            <p className="text-sm font-semibold text-foreground">{formatMantaPrice(certificate.initialMintPrice)}</p>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3 text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5" />Courses in Certificate
          </h3>
          <div className="space-y-3">
            {certificate.completedCourses.map((course) => (
              <Card
                key={course.courseId}
                onClick={() => onCourseClick(course)}
                className="bg-secondary border-border hover:border-muted-foreground cursor-pointer transition-all"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {course.isFirstCourse && (
                          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 text-xs">First Course</Badge>
                        )}
                        <Badge variant="outline" className={getCategoryColor(getCategoryName(course.category))}>
                          {getCategoryName(course.category)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{getDifficultyName(course.difficulty)}</span>
                      </div>
                      <h4 className="font-semibold text-foreground mb-1">{course.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Avatar className="w-4 h-4">
                          <AvatarImage src={course.creator.avatar} />
                          <AvatarFallback>{course.creator.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>By {course.creator.name}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          Completed: {formatDate(course.completedAt)}
                        </div>
                        <span className="text-muted-foreground">•</span>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Trophy className="w-3 h-3 text-yellow-500" />
                          Added: {formatDate(course.addedToCertificateAt)}
                        </div>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-semibold text-foreground">{formatMantaPrice(course.pricePaid)}</span>
                      </div>
                    </div>
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-muted">
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
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

//================================================================//
// *** EMPTY STATE COMPONENT *** //
//================================================================//
const NoCertificateState: React.FC = () => {
  return (
    <Card className="bg-card border-border shadow-md">
      <CardContent className="p-12 text-center">
        <Award className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold text-foreground mb-2">No Certificate Yet</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Complete your first course and mint your lifetime certificate to start building your learning journey!
        </p>
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
          One Certificate Per User • Grows With You
        </Badge>
      </CardContent>
    </Card>
  )
}

export default function CertificatePage() {
  const [selectedCourse, setSelectedCourse] = useState<CourseInCertificate | null>(null);
  const userCertificate = mockCertificate;

  const handleCourseClick = useCallback((course: CourseInCertificate) => {
    setSelectedCourse(course);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setSelectedCourse(null);
  }, []);

  return (
    <>
      <PageContainer maxWidth="xl" className="space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">My Certificate</h1>
          <p className="text-muted-foreground">Your lifetime digital learning certificate that grows with your achievements.</p>
        </div>

        {/* Certificate Content */}
        {userCertificate ? (
          <CertificateCard certificate={userCertificate} onCourseClick={handleCourseClick} />
        ) : (
          <NoCertificateState />
        )}
      </PageContainer>

      <Sheet open={!!selectedCourse} onOpenChange={(isOpen) => !isOpen && handleDrawerClose()}>
        <SheetContent className="w-full sm:max-w-lg bg-background border-l border-border text-foreground p-0">
          {selectedCourse && (
            <>
              <SheetHeader className="p-6 border-b border-border">
                <SheetTitle className="text-foreground text-xl">{selectedCourse.title}</SheetTitle>
                <SheetDescription className="text-muted-foreground">
                  {getCategoryName(selectedCourse.category)} • {getDifficultyName(selectedCourse.difficulty)}
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
                    <div>
                      <p className="text-sm font-medium text-foreground">{selectedCourse.creator.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {selectedCourse.creator.address.substring(0, 6)}...{selectedCourse.creator.address.substring(38)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-secondary rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Course Completed</span>
                      <span className="text-sm font-semibold text-foreground">{formatDate(selectedCourse.completedAt)}</span>
                    </div>
                  </div>
                  <div className="p-3 bg-secondary rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Added to Certificate</span>
                      <span className="text-sm font-semibold text-foreground">{formatDate(selectedCourse.addedToCertificateAt)}</span>
                    </div>
                  </div>
                  <div className="p-3 bg-secondary rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Price Paid</span>
                      <span className="text-sm font-semibold text-foreground">{formatMantaPrice(selectedCourse.pricePaid)}</span>
                    </div>
                  </div>
                  {selectedCourse.isFirstCourse ? (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                          This was your first course - Certificate minted! (10% platform fee)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                            Added to existing certificate (2% platform fee)
                          </span>
                        </div>
                      </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
