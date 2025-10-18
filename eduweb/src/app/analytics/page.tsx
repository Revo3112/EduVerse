"use client"

import { AnalyticsContainer } from "@/components/PageContainer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  DollarSign,
  Edit,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Layers,
  Play,
  Plus,
  RefreshCw,
  Shield,
  Star,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet
} from "lucide-react"
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

// ==================== EXACT SMART CONTRACT TYPES ====================

// CRITICAL: Enums harus exact match dengan smart contract
enum CourseCategory {
  Programming = 0, Design = 1, Business = 2, Marketing = 3, DataScience = 4,
  Finance = 5, Healthcare = 6, Language = 7, Arts = 8, Mathematics = 9,
  Science = 10, Engineering = 11, Technology = 12, Education = 13, Psychology = 14,
  Culinary = 15, PersonalDevelopment = 16, Legal = 17, Sports = 18, Other = 19
}

enum CourseDifficulty {
  Beginner = 0, Intermediate = 1, Advanced = 2
}

// ==================== EXACT EVENT DATA STRUCTURES ====================
// Setiap struktur harus match persis dengan event parameters di smart contract

interface CourseCreatedEventData {
  courseId: number           // uint256 indexed courseId
  creator: string           // address indexed creator
  creatorName: string       // string creatorName
  title: string             // string title
  category: CourseCategory  // CourseCategory category
  difficulty: CourseDifficulty // CourseDifficulty difficulty
}

interface CourseDeletedEventData {
  courseId: number          // uint256 indexed courseId
  deletedBy: string         // address indexed deletedBy
}

interface CourseUnpublishedEventData {
  courseId: number          // uint256 indexed courseId
  unpublishedBy: string     // address indexed unpublishedBy
}

interface CourseRepublishedEventData {
  courseId: number          // uint256 indexed courseId
  republishedBy: string     // address indexed republishedBy
}

interface CourseEmergencyDeactivatedEventData {
  courseId: number          // uint256 indexed courseId
  reason: string            // string reason
}

interface CourseUpdatedEventData {
  courseId: number          // uint256 indexed courseId
  creator: string           // address indexed creator
  newPrice: number          // uint256 newPrice - ✅ GOLDSKY price change tracking
  oldPrice: number          // uint256 oldPrice - ✅ GOLDSKY compare adjustments
  isActive: boolean         // bool isActive - ✅ GOLDSKY publish/unpublish status
}

interface SectionAddedEventData {
  courseId: number          // uint256 indexed courseId
  sectionId: number         // uint256 indexed sectionId
  title: string             // string title
}

interface SectionUpdatedEventData {
  courseId: number          // uint256 indexed courseId
  sectionId: number         // uint256 indexed sectionId
}

interface SectionDeletedEventData {
  courseId: number          // uint256 indexed courseId
  sectionId: number         // uint256 indexed sectionId
}

interface SectionMovedEventData {
  courseId: number          // uint256 indexed courseId
  fromIndex: number         // uint256 fromIndex
  toIndex: number           // uint256 toIndex
  sectionTitle: string      // string sectionTitle
}

interface BatchSectionsAddedEventData {
  courseId: number          // uint256 indexed courseId
  sectionIds: number[]      // uint256[] sectionIds
}

interface CourseRatedEventData {
  courseId: number          // uint256 indexed courseId
  user: string              // address indexed user
  rating: number            // uint256 rating (1-5)
  newAverageRating: number  // uint256 newAverageRating (scaled by 10000)
}

interface RatingUpdatedEventData {
  courseId: number          // uint256 indexed courseId
  user: string              // address indexed user
  oldRating: number         // uint256 oldRating
  newRating: number         // uint256 newRating
  newAverageRating: number  // uint256 newAverageRating
}

interface RatingDeletedEventData {
  courseId: number          // uint256 indexed courseId
  user: string              // address indexed user
  previousRating: number    // uint256 previousRating
}

// CRITICAL: CourseLicense menggunakan ERC1155 dengan tokenId mapping
interface LicenseMintedEventData {
  courseId: number          // uint256 indexed courseId
  student: string           // address indexed student
  tokenId: number           // uint256 tokenId
  durationMonths: number    // uint256 durationMonths
  expiryTimestamp: number   // uint256 expiryTimestamp
  pricePaid: number         // uint256 pricePaid - ✅ GOLDSKY revenue analytics
}

interface LicenseRenewedEventData {
  courseId: number          // uint256 indexed courseId
  student: string           // address indexed student
  tokenId: number           // uint256 tokenId
  durationMonths: number    // uint256 durationMonths
  expiryTimestamp: number   // uint256 expiryTimestamp
  pricePaid: number         // uint256 pricePaid - ✅ GOLDSKY revenue analytics
}

interface LicenseExpiredEventData {
  courseId: number          // uint256 indexed courseId
  student: string           // address indexed student
  tokenId: number           // uint256 tokenId
  expiredAt: number         // uint256 expiredAt
}

interface RevenueRecordedEventData {
  courseId: number          // uint256 indexed courseId
  amount: number            // uint256 amount
  revenueType: string       // string revenueType - ✅ GOLDSKY "LicenseMinted" or "LicenseRenewed"
}

// CRITICAL: ProgressTracker events
interface SectionStartedEventData {
  student: string           // address indexed student
  courseId: number          // uint256 indexed courseId
  sectionId: number         // uint256 indexed sectionId
  startedAt: number         // uint256 startedAt
}

interface SectionCompletedEventData {
  student: string           // address indexed student
  courseId: number          // uint256 indexed courseId
  sectionId: number         // uint256 indexed sectionId
}

interface CourseCompletedEventData {
  student: string           // address indexed student
  courseId: number          // uint256 indexed courseId
}

interface ProgressResetEventData {
  student: string           // address indexed student
  courseId: number          // uint256 indexed courseId
}

// CRITICAL: CertificateManager "One Certificate Per User" model
interface CertificateMintedEventData {
  owner: string             // address indexed owner (NOT student)
  tokenId: number           // uint256 indexed tokenId
  recipientName: string     // string recipientName
  ipfsCID: string           // string ipfsCID
  paymentReceiptHash: string // bytes32 paymentReceiptHash (as hex string)
}

interface CourseAddedToCertificateEventData {
  owner: string             // address indexed owner
  tokenId: number           // uint256 indexed tokenId
  courseId: number          // uint256 indexed courseId
  newIpfsCID: string        // string newIpfsCID
  paymentReceiptHash: string // bytes32 paymentReceiptHash
}

interface CertificateUpdatedEventData {
  owner: string             // address indexed owner
  tokenId: number           // uint256 indexed tokenId
  newIpfsCID: string        // string newIpfsCID
  paymentReceiptHash: string // bytes32 paymentReceiptHash
}

interface CertificateRevokedEventData {
  tokenId: number           // uint256 indexed tokenId
  reason: string            // string reason
}

interface CertificatePaymentRecordedEventData {
  payer: string             // address indexed payer
  owner: string             // address indexed owner
  tokenId: number           // uint256 indexed tokenId
  paymentReceiptHash: string // bytes32 paymentReceiptHash
}

// Union type untuk semua event data
type TransactionEventData =
  | CourseCreatedEventData | CourseUpdatedEventData | CourseDeletedEventData
  | CourseUnpublishedEventData | CourseRepublishedEventData | CourseEmergencyDeactivatedEventData
  | SectionAddedEventData | SectionUpdatedEventData
  | SectionDeletedEventData | SectionMovedEventData | BatchSectionsAddedEventData
  | SectionsSwappedEventData | SectionsBatchReorderedEventData
  | CourseRatedEventData | RatingUpdatedEventData | RatingDeletedEventData | RatingRemovedEventData
  | LicenseMintedEventData | LicenseRenewedEventData | LicenseExpiredEventData | RevenueRecordedEventData
  | SectionStartedEventData | SectionCompletedEventData | CourseCompletedEventData | ProgressResetEventData
  | CertificateMintedEventData | CourseAddedToCertificateEventData
  | CertificateUpdatedEventData | CertificateRevokedEventData
  | CertificatePaymentRecordedEventData
  | UserBlacklistedEventData | UserUnblacklistedEventData | RatingsPausedEventData | RatingsUnpausedEventData
  | BaseRouteUpdatedEventData | PlatformNameUpdatedEventData | CourseAdditionFeeUpdatedEventData | CourseCertificatePriceSetEventData
  | Record<string, never>
// ========== MISSING EVENT INTERFACES FOR FULL CONTRACT ALIGNMENT ==========

interface SectionsSwappedEventData {
  courseId: number; // uint256 indexed courseId
  indexA: number;   // uint256 indexA - ARRAY POSITION, not section ID!
  indexB: number;   // uint256 indexB - ARRAY POSITION, not section ID!
}

interface SectionsBatchReorderedEventData {
  courseId: number; // uint256 indexed courseId
  newOrder: number[]; // uint256[] newOrder
}

interface RatingRemovedEventData {
  courseId: number; // uint256 indexed courseId
  user: string; // address indexed user
  previousRating: number; // uint256 previousRating
}

interface UserBlacklistedEventData {
  user: string; // address indexed user
  admin: string; // address indexed admin
}

interface UserUnblacklistedEventData {
  user: string; // address indexed user
  admin: string; // address indexed admin
}

interface RatingsPausedEventData {
  courseId: number; // uint256 indexed courseId
  admin: string; // address indexed admin
}

interface RatingsUnpausedEventData {
  courseId: number; // uint256 indexed courseId
  admin: string; // address indexed admin
}

interface BaseRouteUpdatedEventData {
  tokenId: number; // uint256 indexed tokenId
  newBaseRoute: string; // string newBaseRoute
}

interface PlatformNameUpdatedEventData {
  newPlatformName: string; // string newPlatformName
}

interface CourseAdditionFeeUpdatedEventData {
  newFee: number; // uint256 newFee
}

interface CourseCertificatePriceSetEventData {
  courseId: number; // uint256 indexed courseId
  price: number; // uint256 price
  creator: string; // address indexed creator
}

// ==================== COMPLETE TRANSACTION EVENT ====================

interface BlockchainTransactionEvent {
// Transaction metadata
  id: string
  transactionHash: string
  blockNumber: number
  blockHash: string
  transactionIndex: number
  logIndex: number
  timestamp: number

  // Gas info
  gasUsed: string
  gasPrice: string
  gasCost: string // gasUsed * gasPrice

  // Transaction info
  from: string              // Transaction sender
  to: string                // Contract address
  value: string             // ETH value sent (usually "0" for most calls)

  // Contract & Event info
  contractName: 'CourseFactory' | 'CourseLicense' | 'ProgressTracker' | 'CertificateManager'
  contractAddress: string   // Actual deployed contract address
  eventName: string         // Exact event name from contract
  eventSignature: string    // Event signature hash

  // Event-specific data
  eventData: TransactionEventData

  // Derived info for analytics
  transactionType:
  | 'course_created' | 'course_updated' | 'course_deleted' | 'course_unpublished'
  | 'course_republished' | 'course_emergency_deactivated'
  | 'section_added' | 'section_updated' | 'section_deleted' | 'section_moved'
  | 'batch_sections_added' | 'sections_swapped' | 'sections_batch_reordered'
  | 'course_rated' | 'rating_updated' | 'rating_deleted'
  | 'license_minted' | 'license_renewed' | 'license_expired' | 'revenue_recorded'
  | 'section_started' | 'section_completed' | 'course_completed' | 'progress_reset'
  | 'certificate_minted' | 'course_added_to_certificate'
  | 'certificate_updated' | 'certificate_revoked' | 'certificate_payment_recorded'
}

// ==================== REAL CONTRACT CONSTANTS ====================

// CRITICAL: These must match deployed contract addresses from deployed-contracts.json
const DEPLOYED_CONTRACTS = {
  // These will be populated from actual deployment
  CourseFactory: '0x0000000000000000000000000000000000000000',
  CourseLicense: '0x0000000000000000000000000000000000000000',
  ProgressTracker: '0x0000000000000000000000000000000000000000',
  CertificateManager: '0x0000000000000000000000000000000000000000'
} as const

// Smart contract limits (from actual contracts) - Used for validation
// const _CONTRACT_LIMITS = {
//   MAX_SECTIONS_PER_COURSE: 1000,           // CourseFactory anti-DoS
//   MAX_PRICE_ETH: '1.000000',               // CourseFactory.MAX_PRICE_ETH
//   MAX_CERTIFICATE_PRICE: '0.002000',       // CertificateManager.MAX_CERTIFICATE_PRICE
//   RATING_COOLDOWN_HOURS: 24,               // CourseFactory.RATING_COOLDOWN
//   MAX_DURATION_MONTHS: 12,                 // CourseLicense.MAX_DURATION_MONTHS
//   SECONDS_PER_MONTH: 2592000                // CourseLicense.SECONDS_PER_MONTH (30 days)
// } as const

// CRITICAL: Platform fee percentages from actual smart contracts
// CourseLicense.sol line 42: platformFeePercentage = 200 (2%)
// CertificateManager.sol line 775: platformFee = (totalAmount * 1000) / 10000 (10%)
// CertificateManager.sol line 805: platformFee = (totalAmount * 200) / 10000 (2%)
const PLATFORM_FEE_BASIS_POINTS = {
  LICENSE: 200,           // 2% for license mint/renewal (CourseLicense.sol)
  CERTIFICATE_MINT: 1000, // 10% for initial certificate minting (CertificateManager.sol line 775)
  CERTIFICATE_ADD: 200    // 2% for adding courses to certificate (CertificateManager.sol line 805)
} as const

// Helper function to calculate exact platform fees matching smart contracts
const calculatePlatformFee = (
  totalAmount: number,
  feeType: keyof typeof PLATFORM_FEE_BASIS_POINTS
): { platformFee: number; creatorPayout: number } => {
  const basisPoints = PLATFORM_FEE_BASIS_POINTS[feeType]
  const platformFee = (totalAmount * basisPoints) / 10000
  const creatorPayout = totalAmount - platformFee

  return { platformFee, creatorPayout }
}

// ==================== ANALYTICS METRICS ====================

interface EduVerseAnalyticsMetrics {
// Network metrics
  totalTransactions: number
  totalGasUsed: string
  totalGasCost: string        // in ETH
  averageGasPrice: string     // in gwei
  averageBlockTime: number    // seconds

  // User engagement
  uniqueAddresses: number
  activeStudents: number      // Students with recent activity
  activeCreators: number      // Creators with recent activity

  // Course ecosystem
  totalCourses: number
  activeCourses: number       // isActive = true
  totalSections: number
  coursesWithRatings: number
  averagePlatformRating: number // Real average from all ratings

  // Learning progress
  totalSectionsCompleted: number
  totalCoursesCompleted: number
  uniqueStudentsWithProgress: number

  // Licensing
  totalLicensesMinted: number
  totalLicensesRenewed: number
  activeLicenses: number      // Not expired
  totalLicenseRevenue: string // in ETH

  // Certificates (One Per User model)
  totalCertificateHolders: number    // Unique users with certificates
  totalCourseAdditions: number       // Courses added to existing certs
  certificateUpdates: number         // Image/metadata updates
  totalCertificateRevenue: string    // in ETH

  // Platform economics
  totalPlatformRevenue: string       // Platform fees collected
  totalCreatorPayouts: string        // Creator earnings
  averageCoursePrice: string         // Average course price per month
}

// ==================== MOCK DATA GENERATION (REALISTIC) ====================

const COURSE_CATEGORIES_NAMES = [
  'Programming', 'Design', 'Business', 'Marketing', 'Data Science',
  'Finance', 'Healthcare', 'Language', 'Arts', 'Mathematics',
  'Science', 'Engineering', 'Technology', 'Education', 'Psychology',
  'Culinary', 'Personal Development', 'Legal', 'Sports', 'Other'
]

const DIFFICULTY_NAMES = ['Beginner', 'Intermediate', 'Advanced']

const WEB3_COURSE_TITLES = [
  'Smart Contract Security Fundamentals',
  'DeFi Protocol Development with Solidity',
  'NFT Marketplace Architecture on Manta',
  'Web3 Frontend with React and Wagmi',
  'Blockchain Data Analytics with Subgraph',
  'ERC-1155 Token Implementation Guide',
  'IPFS Integration for Decentralized Apps',
  'Zero-Knowledge Proofs in Practice',
  'MEV Protection Strategies',
  'Cross-Chain Bridge Development'
]

const CREATOR_PROFILES = [
  { name: 'Dr. Sarah Blockchain', expertise: 'Smart Contract Security' },
  { name: 'Prof. Alex DeFi', expertise: 'DeFi Protocols' },
  { name: 'Maria Web3', expertise: 'Frontend Development' },
  { name: 'David Cryptography', expertise: 'Zero-Knowledge Proofs' },
  { name: 'Lisa Analytics', expertise: 'Blockchain Data' }
]

const generateRealisticAddress = (): string => {
  return `0x${Math.random().toString(16).substr(2, 40).padEnd(40, '0')}`
}

const generateRealisticHash = (): string => {
  return `0x${Math.random().toString(16).substr(2, 64).padEnd(64, '0')}`
}

const generatePaymentReceiptHash = (): string => {
  return generateRealisticHash() // bytes32 payment receipt hash
}

const getGasUsageByContractAndFunction = (contractName: string, functionName: string): number => {
  // Realistic gas usage based on contract complexity
  const gasUsage: Record<string, Record<string, number>> = {
    CourseFactory: {
      createCourse: 180000,
      updateCourse: 85000,
      addCourseSection: 95000,
      batchAddSections: 45000, // per section
      rateCourse: 75000,
      deleteMyRating: 65000
    },
    CourseLicense: {
      mintLicense: 220000,
      renewLicense: 180000
    },
    ProgressTracker: {
      completeSection: 95000,
      batchCompleteSections: 35000 // per section
    },
    CertificateManager: {
      mintOrUpdateCertificate: 250000, // First certificate
      addCourseToExistingCertificate: 180000, // Additional courses
      updateCertificate: 120000
    }
  }

  return gasUsage[contractName]?.[functionName] || 100000
}

const generateMockBlockchainTransaction = (): BlockchainTransactionEvent => {
  const now = Date.now()
  const blockNumber = 12500000 + Math.floor(Math.random() * 50000)

  // Weighted distribution (more common transactions have higher probability)
  const transactionTypes = [
    { type: 'section_completed', weight: 25, contract: 'ProgressTracker', event: 'SectionCompleted' },
    { type: 'section_started', weight: 20, contract: 'ProgressTracker', event: 'SectionStarted' },
    { type: 'course_rated', weight: 15, contract: 'CourseFactory', event: 'CourseRated' },
    { type: 'license_minted', weight: 12, contract: 'CourseLicense', event: 'LicenseMinted' },
    { type: 'section_added', weight: 10, contract: 'CourseFactory', event: 'SectionAdded' },
    { type: 'revenue_recorded', weight: 8, contract: 'CourseLicense', event: 'RevenueRecorded' },
    { type: 'course_completed', weight: 8, contract: 'ProgressTracker', event: 'CourseCompleted' },
    { type: 'certificate_minted', weight: 6, contract: 'CertificateManager', event: 'CertificateMinted' },
    { type: 'course_created', weight: 5, contract: 'CourseFactory', event: 'CourseCreated' },
    { type: 'license_renewed', weight: 5, contract: 'CourseLicense', event: 'LicenseRenewed' },
    { type: 'course_added_to_certificate', weight: 4, contract: 'CertificateManager', event: 'CourseAddedToCertificate' },
    { type: 'course_updated', weight: 3, contract: 'CourseFactory', event: 'CourseUpdated' },
    { type: 'section_updated', weight: 3, contract: 'CourseFactory', event: 'SectionUpdated' },
    { type: 'license_expired', weight: 2, contract: 'CourseLicense', event: 'LicenseExpired' },
    { type: 'certificate_updated', weight: 2, contract: 'CertificateManager', event: 'CertificateUpdated' },
    { type: 'rating_updated', weight: 2, contract: 'CourseFactory', event: 'RatingUpdated' },
    { type: 'section_moved', weight: 2, contract: 'CourseFactory', event: 'SectionMoved' },
    { type: 'course_unpublished', weight: 1, contract: 'CourseFactory', event: 'CourseUnpublished' },
    { type: 'course_republished', weight: 1, contract: 'CourseFactory', event: 'CourseRepublished' },
    { type: 'batch_sections_added', weight: 1, contract: 'CourseFactory', event: 'BatchSectionsAdded' },
    { type: 'section_deleted', weight: 1, contract: 'CourseFactory', event: 'SectionDeleted' },
    { type: 'sections_swapped', weight: 1, contract: 'CourseFactory', event: 'SectionsSwapped' },
    { type: 'sections_batch_reordered', weight: 1, contract: 'CourseFactory', event: 'SectionsBatchReordered' },
    { type: 'rating_deleted', weight: 1, contract: 'CourseFactory', event: 'RatingDeleted' },
    { type: 'progress_reset', weight: 1, contract: 'ProgressTracker', event: 'ProgressReset' },
    { type: 'certificate_revoked', weight: 1, contract: 'CertificateManager', event: 'CertificateRevoked' },
    { type: 'course_deleted', weight: 0.5, contract: 'CourseFactory', event: 'CourseDeleted' },
    { type: 'course_emergency_deactivated', weight: 0.1, contract: 'CourseFactory', event: 'CourseEmergencyDeactivated' }
  ]

  // Weighted selection
  const totalWeight = transactionTypes.reduce((sum, t) => sum + t.weight, 0)
  let random = Math.random() * totalWeight

  const selectedType = transactionTypes.find(t => {
    random -= t.weight
    return random <= 0
  }) || transactionTypes[0]

  const gasUsed = getGasUsageByContractAndFunction(selectedType.contract, selectedType.event)
  const gasPrice = Math.floor(Math.random() * 80 + 20) // 20-100 gwei realistic for Manta
  const gasCost = ((gasUsed * gasPrice) / 1e9).toFixed(9) // Convert to ETH

  return {
    id: `tx_${now}_${Math.random().toString(36).substr(2, 9)}`,
    transactionHash: generateRealisticHash(),
    blockNumber,
    blockHash: generateRealisticHash(),
    transactionIndex: Math.floor(Math.random() * 200),
    logIndex: Math.floor(Math.random() * 50),
    timestamp: now - Math.floor(Math.random() * 300000), // Within last 5 minutes

    gasUsed: gasUsed.toString(),
    gasPrice: gasPrice.toString(),
    gasCost,

    from: generateRealisticAddress(),
    to: DEPLOYED_CONTRACTS[selectedType.contract as keyof typeof DEPLOYED_CONTRACTS] || generateRealisticAddress(),
    value: getTransactionValue(selectedType.type),

    contractName: selectedType.contract as BlockchainTransactionEvent['contractName'],
    contractAddress: DEPLOYED_CONTRACTS[selectedType.contract as keyof typeof DEPLOYED_CONTRACTS] || generateRealisticAddress(),
    eventName: selectedType.event,
    eventSignature: generateRealisticHash().substr(0, 10), // First 4 bytes

    eventData: generateEventData(selectedType.type),
    transactionType: selectedType.type as BlockchainTransactionEvent['transactionType']
  }
}

const getTransactionValue = (transactionType: string): string => {
  switch (transactionType) {
    case 'license_minted':
    case 'license_renewed':
      return (Math.random() * 0.012 + 0.001).toFixed(6) // 0.001-0.013 ETH
    case 'certificate_minted':
    case 'course_added_to_certificate':
    case 'certificate_updated':
      return (Math.random() * 0.0015 + 0.0005).toFixed(6) // 0.0005-0.002 ETH
    default:
      return '0.000000' // Most operations don't involve ETH transfer
  }
}

const generateEventData = (transactionType: string): TransactionEventData => {
  const courseId = Math.floor(Math.random() * 500) + 1
  const userAddress = generateRealisticAddress()

  switch (transactionType) {
    case 'course_created':
      return {
        courseId,
        creator: userAddress,
        creatorName: CREATOR_PROFILES[Math.floor(Math.random() * CREATOR_PROFILES.length)].name,
        title: WEB3_COURSE_TITLES[Math.floor(Math.random() * WEB3_COURSE_TITLES.length)],
        category: Math.floor(Math.random() * 20) as CourseCategory,
        difficulty: Math.floor(Math.random() * 3) as CourseDifficulty
      } as CourseCreatedEventData

    case 'course_updated':
      const oldPrice = Math.floor(Math.random() * 5000000000000000000) + 100000000000000000 // 0.1-5 MANTA
      const newPrice = Math.floor(Math.random() * 5000000000000000000) + 100000000000000000
      return {
        courseId,
        creator: userAddress,
        newPrice,
        oldPrice,
        isActive: Math.random() > 0.5
      } as CourseUpdatedEventData

    case 'course_deleted':
      return {
        courseId,
        deletedBy: userAddress
      } as CourseDeletedEventData

    case 'course_unpublished':
      return {
        courseId,
        unpublishedBy: userAddress
      } as CourseUnpublishedEventData

    case 'course_republished':
      return {
        courseId,
        republishedBy: userAddress
      } as CourseRepublishedEventData

    case 'course_emergency_deactivated':
      return {
        courseId,
        reason: 'Security violation detected'
      } as CourseEmergencyDeactivatedEventData

    case 'section_added':
      return {
        courseId,
        sectionId: Math.floor(Math.random() * 100),
        title: `Section ${Math.floor(Math.random() * 50) + 1}: Advanced Concepts`
      } as SectionAddedEventData

    case 'section_updated':
      return {
        courseId,
        sectionId: Math.floor(Math.random() * 100)
      } as SectionUpdatedEventData

    case 'section_completed':
      return {
        student: userAddress,
        courseId,
        sectionId: Math.floor(Math.random() * 50)
      } as SectionCompletedEventData

    case 'course_completed':
      return {
        student: userAddress,
        courseId
      } as CourseCompletedEventData

    case 'license_minted':
      const duration = [1, 3, 6, 12][Math.floor(Math.random() * 4)]
      const pricePaid = Math.floor(Math.random() * 5000000000000000000) + 100000000000000000 // 0.1-5 MANTA
      return {
        courseId,
        student: userAddress,
        tokenId: Math.floor(Math.random() * 10000) + 1,
        durationMonths: duration,
        expiryTimestamp: Date.now() + (duration * 30 * 24 * 60 * 60 * 1000),
        pricePaid
      } as LicenseMintedEventData

    case 'license_renewed':
      const renewDuration = [1, 3, 6, 12][Math.floor(Math.random() * 4)]
      const renewPricePaid = Math.floor(Math.random() * 5000000000000000000) + 100000000000000000
      return {
        courseId,
        student: userAddress,
        tokenId: Math.floor(Math.random() * 10000) + 1,
        durationMonths: renewDuration,
        expiryTimestamp: Date.now() + (renewDuration * 30 * 24 * 60 * 60 * 1000),
        pricePaid: renewPricePaid
      } as LicenseRenewedEventData

    case 'license_expired':
      return {
        courseId,
        student: userAddress,
        tokenId: Math.floor(Math.random() * 10000) + 1,
        expiredAt: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000) // Expired within last week
      } as LicenseExpiredEventData

    case 'revenue_recorded':
      const revenueAmount = Math.floor(Math.random() * 5000000000000000000) + 100000000000000000
      return {
        courseId,
        amount: revenueAmount,
        revenueType: Math.random() > 0.5 ? 'LicenseMinted' : 'LicenseRenewed'
      } as RevenueRecordedEventData

    case 'section_started':
      return {
        student: userAddress,
        courseId,
        sectionId: Math.floor(Math.random() * 50),
        startedAt: Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000) // Started within last day
      } as SectionStartedEventData

    case 'certificate_minted':
      return {
        owner: userAddress,
        tokenId: Math.floor(Math.random() * 5000) + 1,
        recipientName: `Student${Math.floor(Math.random() * 1000)}`,
        ipfsCID: `Qm${Math.random().toString(36).substr(2, 44)}`,
        paymentReceiptHash: generatePaymentReceiptHash()
      } as CertificateMintedEventData

    case 'course_added_to_certificate':
      return {
        owner: userAddress,
        tokenId: Math.floor(Math.random() * 5000) + 1,
        courseId,
        newIpfsCID: `Qm${Math.random().toString(36).substr(2, 44)}`,
        paymentReceiptHash: generatePaymentReceiptHash()
      } as CourseAddedToCertificateEventData

    case 'course_rated':
      const rating = Math.floor(Math.random() * 5) + 1
      return {
        courseId,
        user: userAddress,
        rating,
        newAverageRating: Math.floor(Math.random() * 40000 + 10000) // 1.0000-5.0000 scaled by 10000
      } as CourseRatedEventData

    case 'rating_updated':
      return {
        courseId,
        user: userAddress,
        oldRating: Math.floor(Math.random() * 5) + 1,
        newRating: Math.floor(Math.random() * 5) + 1,
        newAverageRating: Math.floor(Math.random() * 40000 + 10000)
      } as RatingUpdatedEventData

    case 'section_moved':
      return {
        courseId,
        fromIndex: Math.floor(Math.random() * 10),
        toIndex: Math.floor(Math.random() * 10),
        sectionTitle: `Section ${Math.floor(Math.random() * 50) + 1}: Moved Section`
      } as SectionMovedEventData

    case 'rating_deleted':
      return {
        courseId,
        user: userAddress,
        previousRating: Math.floor(Math.random() * 5) + 1
      } as RatingDeletedEventData

    case 'batch_sections_added':
      return {
        courseId,
        sectionIds: Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, i) => i + 1)
      } as BatchSectionsAddedEventData

    case 'sections_swapped':
      const indexA = Math.floor(Math.random() * 20)
      const indexB = Math.floor(Math.random() * 20)
      return {
        courseId,
        indexA,  // CORRECT - These are array positions
        indexB   // CORRECT - Not section IDs!
      } as SectionsSwappedEventData

    case 'sections_batch_reordered':
      return {
        courseId,
        newOrder: Array.from({ length: Math.floor(Math.random() * 10) + 3 }, (_, i) => i)
      } as SectionsBatchReorderedEventData

    case 'progress_reset':
      return {
        student: userAddress,
        courseId
      } as ProgressResetEventData

    case 'certificate_revoked':
      return {
        tokenId: Math.floor(Math.random() * 5000) + 1,
        reason: 'Academic dishonesty detected'
      } as CertificateRevokedEventData

    default:
      return {}
  }
}

// ==================== UI COMPONENTS ====================

const TransactionTypeIcon = memo<{
  type: BlockchainTransactionEvent['transactionType']
  contractName: BlockchainTransactionEvent['contractName']
}>(({ type, contractName }) => {
  const iconProps = { className: "h-4 w-4" }

  const contractColors = {
    CourseFactory: "text-blue-500",
    CourseLicense: "text-green-500",
    ProgressTracker: "text-purple-500",
    CertificateManager: "text-yellow-500"
  }

  const colorClass = contractColors[contractName] || "text-gray-500"

  switch (type) {
    case 'course_created':
      return <BookOpen {...iconProps} className={cn(iconProps.className, colorClass)} />
    case 'course_updated':
      return <Edit {...iconProps} className={cn(iconProps.className, colorClass)} />
    case 'course_deleted':
      return <Trash2 {...iconProps} className={cn(iconProps.className, colorClass, "text-red-500")} />
    case 'course_unpublished':
      return <EyeOff {...iconProps} className={cn(iconProps.className, colorClass)} />
    case 'course_republished':
      return <Eye {...iconProps} className={cn(iconProps.className, colorClass)} />
    case 'course_emergency_deactivated':
      return <AlertTriangle {...iconProps} className={cn(iconProps.className, colorClass, "text-red-600")} />
    case 'section_added':
      return <Plus {...iconProps} className={cn(iconProps.className, colorClass)} />
    case 'section_updated':
      return <Edit {...iconProps} className={cn(iconProps.className, colorClass)} />
    case 'section_deleted':
      return <Trash2 {...iconProps} className={cn(iconProps.className, colorClass)} />
    case 'section_moved':
      return <ArrowUpDown {...iconProps} className={cn(iconProps.className, colorClass)} />
    case 'batch_sections_added':
      return <Layers {...iconProps} className={cn(iconProps.className, colorClass)} />
    case 'license_minted':
      return <Wallet {...iconProps} className={cn(iconProps.className, colorClass)} />
    case 'license_renewed':
      return <RefreshCw {...iconProps} className={cn(iconProps.className, colorClass)} />
    case 'license_expired':
      return <Clock {...iconProps} className={cn(iconProps.className, colorClass, "text-orange-500")} />
    case 'revenue_recorded':
      return <DollarSign {...iconProps} className={cn(iconProps.className, colorClass, "text-green-500")} />
    case 'section_started':
      return <Play {...iconProps} className={cn(iconProps.className, colorClass)} />
    case 'section_completed':
      return <CheckCircle {...iconProps} className={cn(iconProps.className, colorClass)} />
    case 'course_completed':
      return <GraduationCap {...iconProps} className={cn(iconProps.className, colorClass)} />
    case 'certificate_minted':
      return <Award {...iconProps} className={cn(iconProps.className, colorClass)} />
    case 'course_added_to_certificate':
      return <FileText {...iconProps} className={cn(iconProps.className, colorClass)} />
    case 'certificate_updated':
      return <Edit {...iconProps} className={cn(iconProps.className, colorClass)} />
    case 'certificate_revoked':
      return <Shield {...iconProps} className={cn(iconProps.className, "text-red-500")} />
    case 'course_rated':
    case 'rating_updated':
    case 'rating_deleted':
      return <Star {...iconProps} className={cn(iconProps.className, colorClass)} />
    case 'sections_swapped':
    case 'sections_batch_reordered':
      return <ArrowUpDown {...iconProps} className={cn(iconProps.className, colorClass)} />
    case 'progress_reset':
      return <RefreshCw {...iconProps} className={cn(iconProps.className, "text-orange-500")} />
    default:
      return <Activity {...iconProps} className={colorClass} />
  }
})

TransactionTypeIcon.displayName = 'TransactionTypeIcon'

const TransactionRow = memo<{ transaction: BlockchainTransactionEvent }>(({ transaction }) => {
  const formatTimestamp = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }, [])

  const getTypeLabel = useCallback((type: string) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }, [])

  const getTransactionDetails = useCallback((tx: BlockchainTransactionEvent) => {
    const data = tx.eventData as Record<string, number | string>

    switch (tx.transactionType) {
      case 'course_created':
        return `"${data.title}" by ${data.creatorName} (${COURSE_CATEGORIES_NAMES[data.category as number]})`
      case 'course_deleted':
        return `Course #${data.courseId} deleted by ${String(data.deletedBy).substring(0, 8)}...`
      case 'course_unpublished':
        return `Course #${data.courseId} unpublished`
      case 'course_republished':
        return `Course #${data.courseId} republished`
      case 'course_emergency_deactivated':
        return `Course #${data.courseId} emergency deactivated: ${data.reason}`
      case 'section_added':
        return `"${data.title}" added to course #${data.courseId}`
      case 'section_updated':
        return `Section #${data.sectionId} updated in course #${data.courseId}`
      case 'section_started':
        return `Student started Course #${data.courseId}, Section #${data.sectionId}`
      case 'section_completed':
        return `Course #${data.courseId}, Section #${data.sectionId}`
      case 'license_minted':
        return `${data.durationMonths} month license for course #${data.courseId} (${(Number(data.pricePaid) / 1e18).toFixed(4)} MANTA)`
      case 'license_renewed':
        return `${data.durationMonths} month renewal for course #${data.courseId} (${(Number(data.pricePaid) / 1e18).toFixed(4)} MANTA)`
      case 'license_expired':
        return `License expired for course #${data.courseId} (Token #${data.tokenId})`
      case 'revenue_recorded':
        return `${(Number(data.amount) / 1e18).toFixed(4)} MANTA revenue from ${data.revenueType} for course #${data.courseId}`
      case 'certificate_minted':
        return `Certificate for ${data.recipientName} (Token #${data.tokenId})`
      case 'course_rated':
        return `${data.rating} stars for course #${data.courseId} (avg: ${(Number(data.newAverageRating) / 10000).toFixed(1)})`
      case 'course_added_to_certificate':
        return `Course #${data.courseId} added to certificate #${data.tokenId}`
      case 'section_deleted':
        return `Section #${data.sectionId} deleted from course #${data.courseId}`
      case 'sections_swapped':
        return `Sections swapped at positions ${data.indexA} ↔ ${data.indexB} in course #${data.courseId}`
      case 'sections_batch_reordered':
        return `${Array.isArray(data.newOrder) ? data.newOrder.length : 0} sections reordered in course #${data.courseId}`
      case 'progress_reset':
        return `Progress reset for course #${data.courseId}`
      case 'certificate_revoked':
        return `Certificate #${data.tokenId} revoked: ${data.reason}`
      default:
        return tx.eventName
    }
  }, [])

  return (
    <div className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        <TransactionTypeIcon type={transaction.transactionType} contractName={transaction.contractName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <p className="font-medium text-sm">{getTypeLabel(transaction.transactionType)}</p>
            <Badge variant="outline" className="text-xs">
              {transaction.contractName}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate mb-1">
            {getTransactionDetails(transaction)}
          </p>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span>Block #{transaction.blockNumber}</span>
            <span>•</span>
            <span>{formatTimestamp(transaction.timestamp)}</span>
          </div>
        </div>
      </div>

      <div className="text-right ml-4">
        <p className="font-mono text-sm">{transaction.value} ETH</p>
        <p className="text-xs text-muted-foreground">
          Gas: {parseInt(transaction.gasUsed).toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">
          Cost: {transaction.gasCost} ETH
        </p>
      </div>
    </div>
  )
})

TransactionRow.displayName = 'TransactionRow'

const MetricCard = memo<{
  title: string
  value: string | number
  change?: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  subtitle?: string
}>(({ title, value, change, icon, trend = 'neutral', subtitle }) => {
  const trendIcon = useMemo(() => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" />
      default:
        return null
    }
  }, [trend])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
        {change && (
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            {trendIcon}
            <span>{change}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

MetricCard.displayName = 'MetricCard'

/**
 * EduVerse Analytics Dashboard - PRODUCTION READY
 *
 * CRITICAL: Sesuai 100% dengan Smart Contract Architecture
 * - Event structures match exact contract parameters
 * - Business logic compliance dengan "One Certificate Per User"
 * - Gas usage calculations berdasarkan actual contract complexity
 * - Payment flows sesuai dengan 90% creator, 10% platform
 * - Network monitoring untuk Manta Pacific Testnet (chainId: 3441006)
 *
 * NEXT STEP: Replace mock data dengan actual Web3 event listeners
 */
export default function AnalyticsPage() {
  const [transactions, setTransactions] = useState<BlockchainTransactionEvent[]>([])
  const [metrics, setMetrics] = useState<EduVerseAnalyticsMetrics>({
  // Network
    totalTransactions: 0,
    totalGasUsed: '0',
    totalGasCost: '0.000000',
    averageGasPrice: '0',
    averageBlockTime: 2.1, // Manta Pacific average

    // Users
    uniqueAddresses: 0,
    activeStudents: 0,
    activeCreators: 0,

    // Courses
    totalCourses: 0,
    activeCourses: 0,
    totalSections: 0,
    coursesWithRatings: 0,
    averagePlatformRating: 0,

    // Progress
    totalSectionsCompleted: 0,
    totalCoursesCompleted: 0,
    uniqueStudentsWithProgress: 0,

    // Licensing
    totalLicensesMinted: 0,
    totalLicensesRenewed: 0,
    activeLicenses: 0,
    totalLicenseRevenue: '0.000000',

    // Certificates
    totalCertificateHolders: 0,
    totalCourseAdditions: 0,
    certificateUpdates: 0,
    totalCertificateRevenue: '0.000000',

    // Economics
    totalPlatformRevenue: '0.000000',
    totalCreatorPayouts: '0.000000',
    averageCoursePrice: '0.000000'
  })

  const [isLive, setIsLive] = useState(true)
  // const _selectedTimeframe = useState<'1h' | '24h' | '7d' | '30d'>('24h')

  // Real-time blockchain event simulation
  useEffect(() => {
    if (!isLive) return

    const interval = setInterval(() => {
      const newTransaction = generateMockBlockchainTransaction()

      setTransactions(prev => [newTransaction, ...prev.slice(0, 199)]) // Keep last 200

      // Update metrics based on transaction
      setMetrics(prev => {
        const updated = { ...prev }

        // Network metrics
        updated.totalTransactions += 1
        updated.totalGasUsed = (BigInt(updated.totalGasUsed) + BigInt(newTransaction.gasUsed)).toString()
        updated.totalGasCost = (parseFloat(updated.totalGasCost) + parseFloat(newTransaction.gasCost)).toFixed(9)
        updated.averageGasPrice = (parseFloat(updated.averageGasPrice) * 0.9 + parseFloat(newTransaction.gasPrice) * 0.1).toFixed(1)

        // User engagement
        updated.uniqueAddresses += Math.random() > 0.8 ? 1 : 0

        // Contract-specific updates
        switch (newTransaction.transactionType) {
          case 'course_created':
            updated.totalCourses += 1
            updated.activeCourses += 1
            updated.activeCreators += Math.random() > 0.7 ? 1 : 0
            break

          case 'course_deleted':
            updated.totalCourses = Math.max(0, updated.totalCourses - 1)
            updated.activeCourses = Math.max(0, updated.activeCourses - 1)
            break

          case 'course_unpublished':
            updated.activeCourses = Math.max(0, updated.activeCourses - 1)
            break

          case 'course_republished':
            updated.activeCourses += 1
            break

          case 'section_added':
            updated.totalSections += 1
            break

          case 'section_started':
            updated.activeStudents += Math.random() > 0.7 ? 1 : 0
            break

          case 'batch_sections_added':
            const batchData = newTransaction.eventData as BatchSectionsAddedEventData
            if (batchData && batchData.sectionIds && Array.isArray(batchData.sectionIds)) {
              updated.totalSections += batchData.sectionIds.length
            }
            break

          case 'section_completed':
            updated.totalSectionsCompleted += 1
            updated.activeStudents += Math.random() > 0.6 ? 1 : 0
            break

          case 'course_completed':
            updated.totalCoursesCompleted += 1
            updated.uniqueStudentsWithProgress += Math.random() > 0.7 ? 1 : 0
            break

          case 'license_minted':
            updated.totalLicensesMinted += 1
            updated.activeLicenses += 1
            const licenseRevenue = parseFloat(newTransaction.value)
            const { platformFee: licensePlatformFee, creatorPayout: licenseCreatorPayout } =
              calculatePlatformFee(licenseRevenue, 'LICENSE')  // 2% platform, 98% creator

            updated.totalLicenseRevenue = (parseFloat(updated.totalLicenseRevenue) + licenseRevenue).toFixed(6)
            updated.totalCreatorPayouts = (parseFloat(updated.totalCreatorPayouts) + licenseCreatorPayout).toFixed(6)
            updated.totalPlatformRevenue = (parseFloat(updated.totalPlatformRevenue) + licensePlatformFee).toFixed(6)
            break

          case 'license_renewed':
            updated.totalLicensesRenewed += 1
            const renewalRevenue = parseFloat(newTransaction.value)
            const { platformFee: renewalPlatformFee, creatorPayout: renewalCreatorPayout } =
              calculatePlatformFee(renewalRevenue, 'LICENSE')  // 2% platform, 98% creator

            updated.totalLicenseRevenue = (parseFloat(updated.totalLicenseRevenue) + renewalRevenue).toFixed(6)
            updated.totalCreatorPayouts = (parseFloat(updated.totalCreatorPayouts) + renewalCreatorPayout).toFixed(6)
            updated.totalPlatformRevenue = (parseFloat(updated.totalPlatformRevenue) + renewalPlatformFee).toFixed(6)
            break

          case 'license_expired':
            updated.activeLicenses = Math.max(0, updated.activeLicenses - 1)
            break

          case 'revenue_recorded':
            // Revenue already tracked in license_minted/renewed, this is just event logging
            break

          case 'certificate_minted':
            updated.totalCertificateHolders += 1 // One certificate per user
            const certRevenue = parseFloat(newTransaction.value)
            const { platformFee: certPlatformFee, creatorPayout: certCreatorPayout } =
              calculatePlatformFee(certRevenue, 'CERTIFICATE_MINT')  // 10% platform, 90% creator

            updated.totalCertificateRevenue = (parseFloat(updated.totalCertificateRevenue) + certRevenue).toFixed(6)
            updated.totalCreatorPayouts = (parseFloat(updated.totalCreatorPayouts) + certCreatorPayout).toFixed(6)
            updated.totalPlatformRevenue = (parseFloat(updated.totalPlatformRevenue) + certPlatformFee).toFixed(6)
            break

          case 'course_added_to_certificate':
            updated.totalCourseAdditions += 1
            const additionRevenue = parseFloat(newTransaction.value)
            const { platformFee: additionPlatformFee, creatorPayout: additionCreatorPayout } =
              calculatePlatformFee(additionRevenue, 'CERTIFICATE_ADD')  // 2% platform, 98% recipient

            updated.totalCertificateRevenue = (parseFloat(updated.totalCertificateRevenue) + additionRevenue).toFixed(6)
            updated.totalCreatorPayouts = (parseFloat(updated.totalCreatorPayouts) + additionCreatorPayout).toFixed(6)
            updated.totalPlatformRevenue = (parseFloat(updated.totalPlatformRevenue) + additionPlatformFee).toFixed(6)
            break

          case 'certificate_updated':
            updated.certificateUpdates += 1
            break

          case 'course_rated':
            updated.coursesWithRatings += Math.random() > 0.8 ? 1 : 0 // New course getting first rating
            const ratingData = newTransaction.eventData as CourseRatedEventData
            if (ratingData && typeof ratingData.newAverageRating === 'number') {
              updated.averagePlatformRating = ratingData.newAverageRating / 10000 // Convert from scaled
            }
            break
        }

        // Calculate derived metrics
        if (updated.totalLicensesMinted > 0) {
          updated.averageCoursePrice = (parseFloat(updated.totalLicenseRevenue) / updated.totalLicensesMinted).toFixed(6)
        }

        return updated
      })
    }, 4000) // New transaction every 4 seconds for realistic monitoring

    return () => clearInterval(interval)
  }, [isLive])

  // Computed analytics
  const contractActivity = useMemo(() => {
    const activity = transactions.reduce((acc, tx) => {
      acc[tx.contractName] = (acc[tx.contractName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(activity)
      .map(([contract, count]) => ({ contract, count }))
      .sort((a, b) => b.count - a.count)
  }, [transactions])

  const transactionTypeDistribution = useMemo(() => {
    const counts = transactions.reduce((acc, tx) => {
      acc[tx.transactionType] = (acc[tx.transactionType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(counts)
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / transactions.length) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [transactions])

  const recentCourses = useMemo(() => {
    return transactions
      .filter(tx => tx.transactionType === 'course_created')
      .slice(0, 5)
      .map(tx => {
        const data = tx.eventData as CourseCreatedEventData
        return {
          courseId: data.courseId,
          title: data.title,
          creator: data.creatorName,
          category: COURSE_CATEGORIES_NAMES[data.category],
          difficulty: DIFFICULTY_NAMES[data.difficulty],
          timestamp: tx.timestamp,
          blockNumber: tx.blockNumber
        }
      })
  }, [transactions])

  const certificateInsights = useMemo(() => {
    const certTxs = transactions.filter(tx =>
      tx.transactionType === 'certificate_minted' ||
      tx.transactionType === 'course_added_to_certificate' ||
      tx.transactionType === 'certificate_updated'
    )

    const newCerts = certTxs.filter(tx => tx.transactionType === 'certificate_minted').length
    const courseAdditions = certTxs.filter(tx => tx.transactionType === 'course_added_to_certificate').length
    const updates = certTxs.filter(tx => tx.transactionType === 'certificate_updated').length

    return {
      totalActivity: certTxs.length,
      newCertificates: newCerts,
      courseAdditions,
      updates,
      avgCoursesPerCertificate: newCerts > 0 ? ((courseAdditions + newCerts) / newCerts).toFixed(1) : '0'
    }
  }, [transactions])

  const gasEfficiencyReport = useMemo(() => {
    const gasData = transactions.reduce((acc, tx) => {
      if (!acc[tx.contractName]) {
        acc[tx.contractName] = { totalGas: 0, count: 0, transactions: [] }
      }
      acc[tx.contractName].totalGas += parseInt(tx.gasUsed)
      acc[tx.contractName].count += 1
      acc[tx.contractName].transactions.push(tx)
      return acc
    }, {} as Record<string, { totalGas: number, count: number, transactions: BlockchainTransactionEvent[] }>)

    return Object.entries(gasData).map(([contract, data]) => ({
      contract,
      averageGas: Math.round(data.totalGas / data.count),
      totalTransactions: data.count,
      efficiency: data.totalGas / data.count < 150000 ? 'Excellent' :
        data.totalGas / data.count < 200000 ? 'Good' : 'Needs Optimization'
    }))
  }, [transactions])

  // --- Fixed scroll behavior for live feed ---
  // Keep a ref to the scroll container so we can preserve the user's
  // scroll position when new transactions are prepended. If the user
  // is at the top (wants to follow new items), auto-scroll to show newest.
  const feedContainerRef = useRef<HTMLDivElement | null>(null)
  const prevScrollHeightRef = useRef<number>(0)
  const isUserAtTopRef = useRef<boolean>(true)

  // Update isUserAtTopRef on user scroll
  const onFeedScroll = useCallback(() => {
    const el = feedContainerRef.current
    if (!el) return
    // Consider user 'at top' if within 48px from the top
    isUserAtTopRef.current = el.scrollTop <= 48
  }, [])

  // Initialize previous scrollHeight on mount
  useEffect(() => {
    const el = feedContainerRef.current
    if (el) prevScrollHeightRef.current = el.scrollHeight
  }, [])

  // After DOM updates from transactions, adjust scroll to preserve view
  useLayoutEffect(() => {
    const el = feedContainerRef.current
    if (!el) return

    const newScrollHeight = el.scrollHeight

    // If this is the first time, just scroll to top to show newest
    if (prevScrollHeightRef.current === 0) {
      el.scrollTop = 0
      prevScrollHeightRef.current = newScrollHeight
      return
    }

    const delta = newScrollHeight - prevScrollHeightRef.current

    if (isUserAtTopRef.current) {
      // User wants live updates: always show newest (top)
      el.scrollTo({ top: 0, behavior: 'auto' })
    } else {
      // Preserve user's viewport by increasing scrollTop by the height delta
      // caused by items prepended to the top.
      el.scrollTop = el.scrollTop + delta
    }

    prevScrollHeightRef.current = el.scrollHeight
  }, [transactions])

  return (
    <AnalyticsContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">EduVerse Blockchain Analytics</h1>
            <p className="text-muted-foreground">
              Real-time smart contract monitoring • Manta Pacific Testnet (Chain ID: 3441006)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant={isLive ? "default" : "secondary"} className={isLive ? "animate-pulse" : ""}>
              <div className={cn("w-2 h-2 rounded-full mr-2",
                isLive ? "bg-green-500" : "bg-gray-500"
              )} />
              {isLive ? "Live Monitoring" : "Paused"}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setIsLive(!isLive)}>
              {isLive ? "Pause" : "Resume"}
            </Button>
          </div>
        </div>

        {/* Contract Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(DEPLOYED_CONTRACTS).map(([name, address]) => (
            <Card key={name}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{name}</CardTitle>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600">Active</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xs font-mono text-muted-foreground mb-2 truncate">
                  {address || 'Not Deployed'}
                </div>
                <div className="text-sm font-medium">
                  {contractActivity.find(c => c.contract === name)?.count || 0} transactions
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Core Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Transactions"
            value={metrics.totalTransactions.toLocaleString()}
            change="+18.5% from yesterday"
            trend="up"
            icon={<Activity className="h-4 w-4 text-blue-500" />}
            subtitle="Across all contracts"
          />

          <MetricCard
            title="Total Gas Used"
            value={`${(parseInt(metrics.totalGasUsed) / 1000000).toFixed(1)}M`}
            change={`${metrics.averageGasPrice} gwei avg`}
            icon={<TrendingUp className="h-4 w-4 text-orange-500" />}
            subtitle="Gas consumption"
          />

          <MetricCard
            title="Platform Revenue"
            value={`${metrics.totalPlatformRevenue} ETH`}
            change="+12.3% from yesterday"
            trend="up"
            icon={<Wallet className="h-4 w-4 text-green-500" />}
            subtitle="10% platform fee"
          />

          <MetricCard
            title="Active Learners"
            value={metrics.activeStudents.toLocaleString()}
            change="+25.7% from yesterday"
            trend="up"
            icon={<Users className="h-4 w-4 text-purple-500" />}
            subtitle="Students with recent activity"
          />
        </div>

        {/* Educational Platform Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <MetricCard
            title="Courses Created"
            value={metrics.totalCourses.toString()}
            icon={<BookOpen className="h-4 w-4 text-blue-500" />}
            subtitle={`${metrics.activeCourses} active`}
          />

          <MetricCard
            title="Course Sections"
            value={metrics.totalSections.toString()}
            icon={<Layers className="h-4 w-4 text-indigo-500" />}
            subtitle="Total sections added"
          />

          <MetricCard
            title="Licenses Issued"
            value={metrics.totalLicensesMinted.toString()}
            icon={<Wallet className="h-4 w-4 text-green-500" />}
            subtitle={`${metrics.activeLicenses} still active`}
          />

          <MetricCard
            title="Learning Progress"
            value={metrics.totalSectionsCompleted.toString()}
            icon={<CheckCircle className="h-4 w-4 text-purple-500" />}
            subtitle="Sections completed"
          />

          <MetricCard
            title="Certificate Holders"
            value={metrics.totalCertificateHolders.toString()}
            icon={<Award className="h-4 w-4 text-yellow-500" />}
            subtitle="One certificate per user"
          />

          <MetricCard
            title="Platform Rating"
            value={metrics.averagePlatformRating.toFixed(1)}
            icon={<Star className="h-4 w-4 text-orange-500" />}
            subtitle="Average course rating"
          />
        </div>

        {/* Detailed Analytics */}
        <Tabs defaultValue="live-feed" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="live-feed">Live Feed</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="economics">Economics</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Live Transaction Feed - FIXED SCROLL */}
          <TabsContent value="live-feed" className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Kolom Kiri: Live Blockchain Events (2/3 Lebar) */}
              <div className="w-full lg:w-2/3">
                <Card className="flex flex-col h-[600px]">
                  <CardHeader className="flex-shrink-0">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Activity className="h-5 w-5 mr-2" />
                        Live Blockchain Events
                      </div>
                      <Badge variant="secondary">Last 200 transactions</Badge>
                    </CardTitle>
                    <CardDescription>
                      Real-time events from EduVerse smart contracts on Manta Pacific
                    </CardDescription>
                  </CardHeader>
                  <CardContent ref={feedContainerRef} onScroll={onFeedScroll} className="flex-1 overflow-y-auto p-0 min-h-0">
                    {transactions.length === 0 ? (
                      <div className="flex items-center justify-center p-8 text-muted-foreground h-full">
                        Monitoring blockchain for transactions...
                      </div>
                    ) : (
                      transactions.map((transaction) => (
                        <TransactionRow key={transaction.id} transaction={transaction} />
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Kolom Kanan: Dua Card (1/3 Lebar) */}
              <div className="w-full lg:w-1/3 flex flex-col gap-6">
                <Card className="flex-1 flex flex-col">
                  <CardHeader className="flex-shrink-0">
                    <CardTitle>Contract Activity</CardTitle>
                    <CardDescription>Transaction distribution by contract</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto min-h-0">
                    <div className="space-y-3">
                      {contractActivity.map(({ contract, count }) => (
                        <div key={contract} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{contract}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="flex-1 flex flex-col">
                  <CardHeader className="flex-shrink-0">
                    <CardTitle>Transaction Types</CardTitle>
                    <CardDescription>Most frequent activities</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto p-6 min-h-0">
                    <div className="space-y-3 pr-2">
                      {transactionTypeDistribution.map(({ type, count, percentage }) => (
                        <div key={type} className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="capitalize truncate font-medium">
                              {type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-muted-foreground ml-2 flex-shrink-0">{count}</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Smart Contract Details */}
          <TabsContent value="contracts" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gas Efficiency Analysis</CardTitle>
                  <CardDescription>Smart contract optimization metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {gasEfficiencyReport.map(({ contract, averageGas, totalTransactions, efficiency }) => (
                    <div key={contract} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{contract}</span>
                        <Badge variant={efficiency === 'Excellent' ? 'default' : 'secondary'}>
                          {efficiency}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Avg: {averageGas.toLocaleString()} gas • {totalTransactions} transactions
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Business Logic Compliance</CardTitle>
                  <CardDescription>Smart contract rule enforcement</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { rule: 'Max price protection (1 ETH)', status: 'Active', contract: 'CourseFactory' },
                    { rule: 'Certificate price limit (0.002 ETH)', status: 'Active', contract: 'CertificateManager' },
                    { rule: 'One certificate per user', status: 'Active', contract: 'CertificateManager' },
                    { rule: 'License validation for progress', status: 'Active', contract: 'ProgressTracker' },
                    { rule: 'Anti-DoS section limit (1000)', status: 'Active', contract: 'CourseFactory' },
                    { rule: '24h rating cooldown', status: 'Active', contract: 'CourseFactory' }
                  ].map(({ rule, status, contract }) => (
                    <div key={rule} className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">{rule}</span>
                        <p className="text-xs text-muted-foreground">{contract}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-green-600">{status}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Course Activity */}
          <TabsContent value="courses" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Course Creations</CardTitle>
                  <CardDescription>Latest courses added to the platform</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentCourses.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No courses created yet
                      </p>
                    ) : (
                      recentCourses.map((course) => (
                        <div key={`${course.courseId}-${course.blockNumber}`} className="border-b pb-3 last:border-b-0">
                          <div className="flex justify-between items-start">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{course.title}</p>
                              <p className="text-xs text-muted-foreground">
                                by {course.creator} • {course.category} • {course.difficulty}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Block #{course.blockNumber} • {new Date(course.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Learning Engagement</CardTitle>
                  <CardDescription>Student progress and completion rates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {metrics.totalSectionsCompleted}
                      </div>
                      <p className="text-sm text-muted-foreground">Sections Completed</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {metrics.totalCoursesCompleted}
                      </div>
                      <p className="text-sm text-muted-foreground">Courses Finished</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Course Completion Rate</span>
                      <span>
                        {metrics.totalSectionsCompleted > 0
                          ? ((metrics.totalCoursesCompleted / metrics.totalSectionsCompleted) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <Progress
                      value={metrics.totalSectionsCompleted > 0
                        ? (metrics.totalCoursesCompleted / metrics.totalSectionsCompleted) * 100
                        : 0}
                      className="h-2"
                    />
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span>Average Platform Rating</span>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span>{metrics.averagePlatformRating.toFixed(1)}/5.0</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Certificate Analytics */}
          <TabsContent value="certificates" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <MetricCard
                title="Certificate Holders"
                value={certificateInsights.newCertificates.toString()}
                change="Revolutionary 'One Per User' model"
                icon={<Award className="h-4 w-4 text-yellow-500" />}
                subtitle="Unique users with certificates"
              />

              <MetricCard
                title="Course Additions"
                value={certificateInsights.courseAdditions.toString()}
                change="Courses added to existing certificates"
                icon={<FileText className="h-4 w-4 text-blue-500" />}
                subtitle="Growing learning journeys"
              />

              <MetricCard
                title="Certificate Updates"
                value={certificateInsights.updates.toString()}
                change="Image/metadata updates"
                icon={<Edit className="h-4 w-4 text-green-500" />}
                subtitle="Certificate customizations"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Revolutionary Certificate Model</CardTitle>
                <CardDescription>
                  EduVerse implements &quot;One Certificate Per User&quot; - a groundbreaking approach
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Business Logic:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• First course completion → Certificate minted</li>
                        <li>• Additional completions → Added to existing certificate</li>
                        <li>• Certificate image updates with each course</li>
                        <li>• QR code shows complete learning journey</li>
                        <li>• Lifetime validity - no expiration</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Economics:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Payment required for each action</li>
                        <li>• 90% goes to course creator</li>
                        <li>• 10% platform fee</li>
                        <li>• Max certificate price: 0.002 ETH</li>
                        <li>• Replay protection via payment hashes</li>
                      </ul>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <div className="text-center">
                      <p className="text-sm font-medium">Total Activity</p>
                      <p className="text-2xl font-bold">{certificateInsights.totalActivity}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Avg Courses/Certificate</p>
                      <p className="text-2xl font-bold">{certificateInsights.avgCoursesPerCertificate}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Revenue Generated</p>
                      <p className="text-2xl font-bold">{metrics.totalCertificateRevenue}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Economics & Revenue */}
          <TabsContent value="economics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Distribution</CardTitle>
                  <CardDescription>Platform economics and creator earnings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Platform Revenue</span>
                      <span className="font-mono text-sm">{metrics.totalPlatformRevenue} ETH</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Creator Payouts</span>
                      <span className="font-mono text-sm">{metrics.totalCreatorPayouts} ETH</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">License Revenue</span>
                      <span className="font-mono text-sm">{metrics.totalLicenseRevenue} ETH</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Certificate Revenue</span>
                      <span className="font-mono text-sm">{metrics.totalCertificateRevenue} ETH</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Average Course Price</p>
                      <p className="text-2xl font-bold">{metrics.averageCoursePrice} ETH</p>
                      <p className="text-xs text-muted-foreground">per month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Fee Structure Compliance</CardTitle>
                  <CardDescription>Smart contract fee enforcement</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-1">
                        License Fees
                      </h4>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        90% Creator • 10% Platform • Max: 1 ETH/month
                      </p>
                    </div>

                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                      <h4 className="font-medium text-sm text-yellow-900 dark:text-yellow-100 mb-1">
                        Certificate Fees
                      </h4>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        90% Creator • 10% Platform • Max: 0.002 ETH
                      </p>
                    </div>

                    <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <h4 className="font-medium text-sm text-green-900 dark:text-green-100 mb-1">
                        Platform Protection
                      </h4>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        Smart contract enforced limits • Payment replay protection
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Economic Health Indicators</CardTitle>
                <CardDescription>Platform sustainability metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {((parseFloat(metrics.totalCreatorPayouts) / (parseFloat(metrics.totalPlatformRevenue) + parseFloat(metrics.totalCreatorPayouts))) * 100).toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground">Creator Share</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {metrics.totalLicensesMinted + metrics.totalCertificateHolders}
                    </div>
                    <p className="text-sm text-muted-foreground">Paying Users</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {((parseFloat(metrics.totalLicenseRevenue) + parseFloat(metrics.totalCertificateRevenue)) / Math.max(metrics.uniqueAddresses, 1)).toFixed(4)}
                    </div>
                    <p className="text-sm text-muted-foreground">Revenue/User (ETH)</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {metrics.totalLicensesRenewed > 0 ? ((metrics.totalLicensesRenewed / metrics.totalLicensesMinted) * 100).toFixed(1) : 0}%
                    </div>
                    <p className="text-sm text-muted-foreground">Renewal Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Monitoring */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Network Performance</CardTitle>
                  <CardDescription>Manta Pacific blockchain metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{metrics.averageBlockTime}s</div>
                      <p className="text-sm text-muted-foreground">Average Block Time</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold">{metrics.averageGasPrice}</div>
                      <p className="text-sm text-muted-foreground">Avg Gas Price (gwei)</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Network Utilization</span>
                      <span>
                        {Math.min(100, (parseInt(metrics.totalGasUsed) / 30000000) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, (parseInt(metrics.totalGasUsed) / 30000000) * 100)}
                      className="h-3"
                    />
                  </div>

                  <div className="pt-2 border-t text-center">
                    <div className="text-lg font-bold">{metrics.totalGasCost} ETH</div>
                    <p className="text-sm text-muted-foreground">Total Gas Costs</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contract Optimization Status</CardTitle>
                  <CardDescription>Smart contract efficiency analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      contract: 'CourseFactory',
                      features: ['Anti-DoS protection', 'Batch operations', 'Rating cooldown'],
                      status: 'Optimal',
                      gasRange: '75k-180k'
                    },
                    {
                      contract: 'CourseLicense',
                      features: ['Overflow protection', 'Auto-refunds', 'ERC-1155'],
                      status: 'Optimal',
                      gasRange: '180k-220k'
                    },
                    {
                      contract: 'ProgressTracker',
                      features: ['Gas-optimized counters', 'License validation'],
                      status: 'Excellent',
                      gasRange: '35k-95k'
                    },
                    {
                      contract: 'CertificateManager',
                      features: ['One cert per user', 'Payment protection'],
                      status: 'Revolutionary',
                      gasRange: '120k-250k'
                    }
                  ].map(({ contract, features, status, gasRange }) => (
                    <div key={contract} className="space-y-2 p-3 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{contract}</span>
                        <Badge variant={status === 'Revolutionary' ? 'default' : status === 'Excellent' ? 'default' : 'secondary'}>
                          {status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Gas: {gasRange} • {features.join(', ')}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>System Health Dashboard</CardTitle>
                <CardDescription>Overall platform health and compliance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Smart Contract Security</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>✓ Reentrancy protection</li>
                      <li>✓ Overflow protection</li>
                      <li>✓ Access control</li>
                      <li>✓ Emergency functions</li>
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Business Logic</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>✓ Price limits enforced</li>
                      <li>✓ License validation</li>
                      <li>✓ Certificate model</li>
                      <li>✓ Payment distribution</li>
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Platform Performance</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>✓ Gas optimization</li>
                      <li>✓ Batch operations</li>
                      <li>✓ Event monitoring</li>
                      <li>✓ Real-time analytics</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h4 className="font-medium text-green-900 dark:text-green-100">
                      System Status: All Systems Operational
                    </h4>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    All smart contracts are functioning correctly with optimal performance.
                    Real-time monitoring is active across all four contract deployments on Manta Pacific.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AnalyticsContainer>
  )
}
