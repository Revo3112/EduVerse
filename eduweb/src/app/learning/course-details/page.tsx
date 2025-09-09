"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  PlayCircle,
  CheckCircle,
  Lock,
  Globe,
  User,
  Calendar,
  Clock,
  Trophy,
  AlertCircle,
  RefreshCw,
  Star,
  Award,
  Shield,
  Wallet,
  BookOpen,
  Video,
  FileText,
  ChevronRight,
  ArrowLeft,
  Timer,
  Copy,
  Check
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// 🚀 SMART CONTRACT COMPATIBLE INTERFACES
// Exact match with CourseFactory.sol structs

enum CourseCategory {
  Technology = 0,
  Business = 1,
  Arts = 2,
  Science = 3,
  HealthAndFitness = 4,
  PersonalDevelopment = 5
}

enum CourseDifficulty {
  Beginner = 0,
  Intermediate = 1,
  Advanced = 2
}

interface CourseData {
  id: number; // Maps to courseId from CourseFactory
  title: string; // Maps to title from CourseFactory
  description: string; // Maps to description from CourseFactory
  creator: string; // Maps to creator address from CourseFactory
  creatorName: string; // Friendly name for display
  thumbnailCID: string; // Maps to ipfsMetadata from CourseFactory
  category: CourseCategory; // Maps to category from CourseFactory
  difficulty: CourseDifficulty; // Maps to difficulty from CourseFactory
  pricePerMonth: number; // Maps to pricePerMonth from CourseFactory (in wei)
  createdAt: number; // Maps to createdAt timestamp from CourseFactory
  totalSections: number; // Calculated from CourseSections
  completedSections: number; // From ProgressTracker
  progressPercentage: number; // Calculated progress
  userProgress: UserSectionProgress[]; // From ProgressTracker
}

interface CourseSectionData {
  id: number; // Maps to sectionId
  courseId: number; // Maps to courseId
  title: string; // Maps to sectionTitle
  contentCID: string; // Maps to ipfsContentCID
  duration: number; // Maps to duration (in seconds)
  orderId: number; // Maps to orderId for sequencing
}

interface UserSectionProgress {
  courseId: number;
  sectionId: number;
  completed: boolean;
  completedAt: number; // Timestamp when completed
}

type SectionStatus = 'completed' | 'in_progress' | 'locked';

interface SectionWithStatus extends CourseSectionData {
  status: SectionStatus;
}

/**
 * 🧩 MockEduVerseDatabase - Realistic Web3 Educational Data Simulator
 *
 * Simulates data that would come from smart contracts:
 * - CourseFactory: Course creation and metadata
 * - CourseLicense: ERC1155 license ownership
 * - ProgressTracker: Student progress tracking
 * - CertificateManager: NFT certificate issuance
 *
 * This mock ensures the UI perfectly matches real blockchain data structures.
 */
class MockEduVerseDatabase {
  private courses: CourseData[] = [];
  private sections: CourseSectionData[] = [];
  private userProgress: UserSectionProgress[] = [];

  constructor() {
    this.initializeCourses();
    this.initializeSections();
    this.initializeUserProgress();
  }

  /**
   * Initialize realistic course data matching smart contract structure
   */
  private initializeCourses() {
    this.courses = [
      {
        id: 1,
        title: "Blockchain Fundamentals & Web3 Development",
        description: "Master blockchain technology from basics to advanced Web3 development. Learn smart contracts, DeFi protocols, and build decentralized applications with hands-on projects.",
        creator: "0x742d35Cc8d2c0c2c21a7e7e2b6C3b3b3e3b3b3b3",
        creatorName: "Dr. Alex Chen",
        thumbnailCID: "QmThumbnailBlockchainFundamentals2024",
        category: CourseCategory.Technology,
        difficulty: CourseDifficulty.Beginner,
        pricePerMonth: 2000000000000000, // 0.002 ETH in wei
        createdAt: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60), // 30 days ago
        totalSections: 10,
        completedSections: 4,
        progressPercentage: 40,
        userProgress: [] // Will be populated by initializeUserProgress
      },
      {
        id: 2,
        title: "Advanced Smart Contract Security & Auditing",
        description: "Deep dive into smart contract security patterns, common vulnerabilities, and professional auditing techniques. Learn to identify and prevent critical security flaws in DeFi protocols.",
        creator: "0x2C8b5b3C8D2E2c4a5b6C7d8E9f10A11b12C13D14",
        creatorName: "Sarah Martinez",
        thumbnailCID: "QmThumbnailSmartContractSecurity2024",
        category: CourseCategory.Technology,
        difficulty: CourseDifficulty.Advanced,
        pricePerMonth: 2000000000000000, // 0.002 ETH in wei
        createdAt: Math.floor(Date.now() / 1000) - (15 * 24 * 60 * 60), // 15 days ago
        totalSections: 8,
        completedSections: 6,
        progressPercentage: 75,
        userProgress: [] // Will be populated
      },
      {
        id: 3,
        title: "DeFi Protocol Design & Implementation",
        description: "Build your own DeFi protocol from concept to deployment. Master liquidity pools, yield farming, governance tokens, and create sustainable tokenomics for your protocol.",
        creator: "0x8E9f10A11b12C13D145E6F17G18H19I20J21K22L",
        creatorName: "Michael Torres",
        thumbnailCID: "QmThumbnailDeFiProtocolDesign2024",
        category: CourseCategory.Technology,
        difficulty: CourseDifficulty.Intermediate,
        pricePerMonth: 2000000000000000, // 0.002 ETH in wei
        createdAt: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60), // 7 days ago
        totalSections: 8,
        completedSections: 2,
        progressPercentage: 25,
        userProgress: [] // Will be populated
      }
    ];
  }

  /**
   * Initialize course sections matching smart contract section structure
   */
  private initializeSections() {
    // Course 1 - Blockchain Fundamentals (10 sections)
    const course1Sections: CourseSectionData[] = [
      { id: 0, courseId: 1, title: "Introduction to Blockchain Technology", contentCID: "QmBlockchainIntroductionBasics2024", duration: 1800, orderId: 0 },
      { id: 1, courseId: 1, title: "Understanding Cryptographic Hash Functions", contentCID: "QmCryptographicHashFunctions2024", duration: 2100, orderId: 1 },
      { id: 2, courseId: 1, title: "Digital Signatures and Public Key Cryptography", contentCID: "QmDigitalSignaturesPublicKey2024", duration: 1950, orderId: 2 },
      { id: 3, courseId: 1, title: "Merkle Trees and Data Structures", contentCID: "QmMerkleTreesDataStructures2024", duration: 1650, orderId: 3 },
      { id: 4, courseId: 1, title: "Consensus Mechanisms: PoW vs PoS", contentCID: "QmConsensusProofOfWorkStake2024", duration: 2250, orderId: 4 },
      { id: 5, courseId: 1, title: "Ethereum Virtual Machine Deep Dive", contentCID: "QmEVMVirtualMachineDeepDive2024", duration: 2400, orderId: 5 },
      { id: 6, courseId: 1, title: "Smart Contract Development with Solidity", contentCID: "QmSoliditySmartContractDev2024", duration: 3000, orderId: 6 },
      { id: 7, courseId: 1, title: "Web3.js and Contract Interaction", contentCID: "QmWeb3ContractInteraction2024", duration: 2700, orderId: 7 },
      { id: 8, courseId: 1, title: "Building Your First DApp", contentCID: "QmBuildingFirstDApp2024", duration: 3600, orderId: 8 },
      { id: 9, courseId: 1, title: "Testing and Deployment Strategies", contentCID: "QmTestingDeploymentStrategies2024", duration: 2850, orderId: 9 }
    ];

    // Course 2 - Smart Contract Security (8 sections)
    const course2Sections: CourseSectionData[] = [
      { id: 10, courseId: 2, title: "Security Threat Landscape Overview", contentCID: "QmSecurityThreatLandscape2024", duration: 1500, orderId: 0 },
      { id: 11, courseId: 2, title: "Reentrancy Attacks and Prevention", contentCID: "QmReentrancyAttacksPrevention2024", duration: 1800, orderId: 1 },
      { id: 12, courseId: 2, title: "Integer Overflow and Underflow", contentCID: "QmIntegerOverflowUnderflow2024", duration: 1350, orderId: 2 },
      { id: 13, courseId: 2, title: "Access Control Vulnerabilities", contentCID: "QmAccessControlVulnerabilities2024", duration: 1650, orderId: 3 },
      { id: 14, courseId: 2, title: "Flash Loan Attacks Analysis", contentCID: "QmFlashLoanAttacksAnalysis2024", duration: 2100, orderId: 4 },
      { id: 15, courseId: 2, title: "Formal Verification Techniques", contentCID: "QmFormalVerificationTechniques2024", duration: 2400, orderId: 5 },
      { id: 16, courseId: 2, title: "Professional Audit Methodology", contentCID: "QmProfessionalAuditMethodology2024", duration: 1950, orderId: 6 },
      { id: 17, courseId: 2, title: "Security Tools and Best Practices", contentCID: "QmSecurityToolsBestPractices2024", duration: 1800, orderId: 7 }
    ];

    // Course 3 - DeFi Protocol Design (8 sections)
    const course3Sections: CourseSectionData[] = [
      { id: 18, courseId: 3, title: "DeFi Ecosystem Architecture", contentCID: "QmDeFiEcosystemArchitecture2024", duration: 1650, orderId: 0 },
      { id: 19, courseId: 3, title: "Automated Market Makers (AMMs)", contentCID: "QmAutomatedMarketMakers2024", duration: 2100, orderId: 1 },
      { id: 20, courseId: 3, title: "Liquidity Pools and Impermanent Loss", contentCID: "QmLiquidityPoolsImpermanentLoss2024", duration: 1950, orderId: 2 },
      { id: 21, courseId: 3, title: "Yield Farming Strategies", contentCID: "QmYieldFarmingStrategies2024", duration: 1800, orderId: 3 },
      { id: 22, courseId: 3, title: "Governance Token Economics", contentCID: "QmGovernanceTokenEconomics2024", duration: 2250, orderId: 4 },
      { id: 23, courseId: 3, title: "Protocol Risk Management", contentCID: "QmProtocolRiskManagement2024", duration: 1650, orderId: 5 },
      { id: 24, courseId: 3, title: "Conversion Rate Optimization", contentCID: "QmConversionRateOptimizationCRO24", duration: 1500, orderId: 6 },
      { id: 25, courseId: 3, title: "Growth Hacking Strategies", contentCID: "QmGrowthHackingStrategiesStartups", duration: 1750, orderId: 7 }
    ];

    this.sections = [...course1Sections, ...course2Sections, ...course3Sections];
  }

  /**
   * Initialize realistic user progress
   */
  private initializeUserProgress() {
    const userAddress = "0x1234567890abcdef1234567890abcdef12345678";
    const userProgress: UserSectionProgress[] = [];

    // Course 1: 4 sections completed (40%)
    for (let i = 0; i < 4; i++) {
      userProgress.push({
        courseId: 1,
        sectionId: i,
        completed: true,
        completedAt: Math.floor(Date.now() / 1000) - (4 - i) * 86400
      });
    }

    // Course 2: 6 sections completed (75%)
    for (let i = 10; i < 16; i++) {
      userProgress.push({
        courseId: 2,
        sectionId: i,
        completed: true,
        completedAt: Math.floor(Date.now() / 1000) - (16 - i) * 86400
      });
    }

    // Course 3: 2 sections completed (25%)
    for (let i = 18; i < 20; i++) {
      userProgress.push({
        courseId: 3,
        sectionId: i,
        completed: true,
        completedAt: Math.floor(Date.now() / 1000) - (20 - i) * 86400
      });
    }

    this.userProgress = userProgress;

    // Update courses with progress data
    this.courses = this.courses.map(course => ({
      ...course,
      userProgress: userProgress.filter(p => p.courseId === course.id)
    }));
  }

  /**
   * Get course by ID - simulates CourseFactory.getCourse()
   */
  getCourse(courseId: number): CourseData | null {
    return this.courses.find(course => course.id === courseId) || null;
  }

  /**
   * Get course sections - simulates CourseFactory.getCourseSections()
   */
  getCourseSections(courseId: number): CourseSectionData[] {
    return this.sections.filter(section => section.courseId === courseId)
      .sort((a, b) => a.orderId - b.orderId);
  }

  /**
   * Get user progress for course - simulates ProgressTracker.getUserProgress()
   */
  getUserProgress(courseId: number, userAddress: string): UserSectionProgress[] {
    return this.userProgress.filter(progress => progress.courseId === courseId);
  }
}

// 🎯 Initialize the mock database
const mockDB = new MockEduVerseDatabase();

// 🛠️ Utility Functions

const formatPrice = (priceInWei: number): string => {
  const priceInEth = priceInWei / 1000000000000000000; // Convert wei to ETH
  return `${priceInEth.toFixed(3)} ETH`;
};

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
};

const getCategoryLabel = (category: CourseCategory): string => {
  return CourseCategory[category] || 'Unknown';
};

const getDifficultyLabel = (difficulty: CourseDifficulty): string => {
  return CourseDifficulty[difficulty] || 'Unknown';
};

// 🎨 Main Course Details Component

export default function CourseDetailsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string>('');

  // Contract addresses for copy functionality
  const contractAddresses = {
    CourseFactory: "0x58052b96b05fFbE5ED31C376E7762b0F6051e15A",
    CourseLicense: "0x32b235fDabbcF4575aF259179e30a228b1aC72a9",
    ProgressTracker: "0x6e3B6FbE90Ae4fca8Ff5eB207A61193ef204FA18",
    CertificateManager: "0x857e484cd949888736d71C0EfC7D981897Df3e61"
  };

  // Copy to clipboard function with robust fallbacks
  const copyToClipboard = async (address: string, contractName: string) => {
    try {
      // Method 1: Try modern Clipboard API (requires HTTPS/secure context)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(address);
        setCopiedAddress(contractName);
        setTimeout(() => setCopiedAddress(''), 2000);
        return;
      }

      // Method 2: Fallback to execCommand (works in HTTP/older browsers)
      const textArea = document.createElement('textarea');
      textArea.value = address;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);

      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        setCopiedAddress(contractName);
        setTimeout(() => setCopiedAddress(''), 2000);
      } else {
        // Method 3: Final fallback - show alert with address to copy manually
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);

        if (isMobile) {
          // Mobile: Show prompt (allows easier selection on some devices)
          const result = prompt(`Copy this ${contractName} address:`, address);
          if (result !== null) {
            setCopiedAddress(contractName);
            setTimeout(() => setCopiedAddress(''), 2000);
          }
        } else {
          // Desktop: Show alert with copy instructions
          alert(`Please copy this ${contractName} address manually:\n\n${address}\n\nThe address has been displayed above for easy selection.`);
          // Show success feedback anyway since we provided the address
          setCopiedAddress(contractName);
          setTimeout(() => setCopiedAddress(''), 2000);
        }
      }
    } catch (error) {
      console.error('All clipboard methods failed:', error);
      // Ultimate fallback: show the address in alert
      alert(`Copy failed. Please copy this ${contractName} address manually:\n\n${address}`);
      // Still show success feedback to indicate the address was displayed
      setCopiedAddress(contractName);
      setTimeout(() => setCopiedAddress(''), 2000);
    }
  };

  // Get course ID from URL parameters
  const courseId = useMemo(() => {
    const id = searchParams.get('id');
    const parsed = parseInt(id || '1', 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : 1;
  }, [searchParams]);

  // Fetch course data - simulates blockchain calls
  const fetchCourseData = async () => {
    try {
      setLoading(true);
      setError('');

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Simulate CourseFactory.getCourse() call
      const course = mockDB.getCourse(courseId);

      if (!course) {
        setError(`Course ID ${courseId} not found. Available courses: 1, 2, 3`);
        return;
      }

      setCourseData(course);
    } catch (err) {
      setError('Failed to fetch course data from blockchain');
      console.error('Course fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  // Get course sections with progress status
  const sectionsWithStatus = useMemo((): SectionWithStatus[] => {
    if (!courseData) return [];

    const sections = mockDB.getCourseSections(courseData.id);
    const userProgress = courseData.userProgress;

    return sections.map(section => {
      const progress = userProgress.find(p => p.sectionId === section.id);
      let status: SectionStatus = 'locked';

      if (progress?.completed) {
        status = 'completed';
      } else if (section.orderId === 0 ||
                 userProgress.some(p => p.sectionId === section.id - 1 && p.completed)) {
        status = 'in_progress';
      }

      return { ...section, status };
    });
  }, [courseData]);

  const getSectionIcon = (status: SectionStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress': return <PlayCircle className="h-5 w-5 text-blue-600" />;
      case 'locked': return <Lock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getSectionTextColor = (status: SectionStatus) => {
    switch (status) {
      case 'completed': return 'text-green-700';
      case 'in_progress': return 'text-blue-700';
      case 'locked': return 'text-gray-500';
    }
  };

  const getDifficultyColor = (difficulty: CourseDifficulty) => {
    switch (difficulty) {
      case CourseDifficulty.Beginner: return 'bg-green-100 text-green-800 border-green-200';
      case CourseDifficulty.Intermediate: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case CourseDifficulty.Advanced: return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !courseData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="container mx-auto px-6 max-w-7xl">
          <Alert variant="destructive" className="max-w-md mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Course Loading Error</AlertTitle>
            <AlertDescription>
              {error || 'Course not found'}
            </AlertDescription>
          </Alert>

          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Button onClick={fetchCourseData} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>

            <div className="flex gap-2">
              <span className="text-sm text-muted-foreground self-center">Or try these courses:</span>
              {[1, 2, 3].map(id => (
                <Button
                  key={id}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newUrl = new URL(window.location.origin + window.location.pathname);
                    newUrl.searchParams.set('id', id.toString());
                    window.history.pushState({}, '', newUrl.toString());
                    window.location.reload();
                  }}
                >
                  Course {id}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
        <div className="container mx-auto px-6 py-12 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Course Info */}
            <div className="lg:col-span-2">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {getCategoryLabel(courseData.category)}
                </Badge>
                <Badge variant="outline" className={`${getDifficultyColor(courseData.difficulty)}`}>
                  {getDifficultyLabel(courseData.difficulty)}
                </Badge>
              </div>

              <h1 className="text-4xl font-bold mb-4 text-foreground leading-tight">
                {courseData.title}
              </h1>

              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                {courseData.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{courseData.creatorName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{new Date(courseData.createdAt * 1000).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{courseData.totalSections} sections</span>
                </div>
              </div>

              {/* Progress Section */}
              <div className="bg-card rounded-lg p-6 shadow-sm border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Your Progress</h3>
                  <span className="text-2xl font-bold text-primary">
                    {courseData.progressPercentage.toFixed(0)}%
                  </span>
                </div>
                <Progress value={courseData.progressPercentage} className="mb-3" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{courseData.completedSections} of {courseData.totalSections} completed</span>
                  <span>{courseData.totalSections - courseData.completedSections} remaining</span>
                </div>
              </div>
            </div>

            {/* Pricing & Actions */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                {/* Back to My Learning Button */}
                <div className="bg-card rounded-xl p-4 shadow-sm border">
                  <Button
                    onClick={() => router.push('/learning')}
                    variant="outline"
                    className="w-full flex items-center gap-2 hover:bg-primary/10 transition-all duration-200"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to My Learning
                  </Button>
                </div>

                {/* Pricing Card */}
                <div className="bg-card rounded-xl p-6 shadow-lg border sticky top-6">
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {formatPrice(courseData.pricePerMonth)}
                  </div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>

                {/* Web3 Benefits */}
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span>Blockchain-verified certificates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-blue-500" />
                    <span>NFT completion rewards</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span>Decentralized progress tracking</span>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="container mx-auto px-6 py-12 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
              <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-primary/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <BookOpen className="h-6 w-6 text-primary" />
                      Course Content
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      {courseData.totalSections} sections • {sectionsWithStatus.filter(s => s.status === 'completed').length} completed • {sectionsWithStatus.filter(s => s.status === 'in_progress').length} in progress
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {courseData.progressPercentage.toFixed(0)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Complete</div>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-border">
                {sectionsWithStatus.map((section, index) => {
                  const sectionProgress = courseData.userProgress.find(p => p.sectionId === section.id);
                  const isNextSection = !sectionProgress?.completed && section.status === 'in_progress';

                  return (
                    <div
                      key={`${section.courseId}-${section.id}`}
                      className={`group relative transition-all duration-200 ${
                        section.status === 'locked'
                          ? 'opacity-60 cursor-not-allowed'
                          : 'hover:bg-accent/30 cursor-pointer hover:shadow-sm'
                      } ${isNextSection ? 'bg-gradient-to-r from-primary/5 to-primary/10 border-l-4 border-l-primary' : ''}`}
                      onClick={() => section.status !== 'locked' && router.push(`/learning/course-details/section?courseId=${courseData.id}&sectionId=${section.id}`)}
                    >
                      <div className="p-6">
                        <div className="flex items-start gap-4">
                          {/* Section Number & Status */}
                          <div className="flex-shrink-0">
                            <div className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200 ${
                              section.status === 'completed'
                                ? 'bg-green-100 border-green-500 text-green-700'
                                : section.status === 'in_progress'
                                ? 'bg-primary/10 border-primary text-primary'
                                : 'bg-gray-100 border-gray-300 text-gray-500'
                            }`}>
                              {section.status === 'completed' ? (
                                <CheckCircle className="h-6 w-6" />
                              ) : section.status === 'in_progress' ? (
                                <PlayCircle className="h-6 w-6" />
                              ) : (
                                <Lock className="h-6 w-6" />
                              )}
                              <div className="absolute -top-1 -right-1 text-xs font-bold bg-background border rounded-full w-6 h-6 flex items-center justify-center">
                                {section.orderId + 1}
                              </div>
                            </div>
                          </div>

                          {/* Section Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0 pr-4">
                                {/* Section Title - Larger and more prominent */}
                                <h3 className={`text-xl font-bold mb-3 transition-colors leading-tight ${
                                  section.status === 'completed' ? 'text-green-700' :
                                  section.status === 'in_progress' ? 'text-primary' :
                                  'text-gray-500'
                                }`}>
                                  {section.title}
                                </h3>

                                {/* Completion Details - Better positioned */}
                                {sectionProgress && sectionProgress.completed && (
                                  <div className="flex items-center gap-2 text-sm text-green-600 mb-3">
                                    <Trophy className="h-4 w-4" />
                                    <span>Completed on {new Date(sectionProgress.completedAt * 1000).toLocaleDateString()}</span>
                                  </div>
                                )}

                                {/* Section Metadata - Improved typography */}
                                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <Video className="h-4 w-4" />
                                    <span className="font-medium">{formatDuration(section.duration)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                      {section.contentCID.slice(0, 8)}...{section.contentCID.slice(-4)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Status Badges & Action Area - Moved to right side */}
                              <div className="flex-shrink-0 flex items-start gap-3">
                                {/* Status Badges */}
                                <div className="flex flex-col gap-2 items-end">
                                  {isNextSection && (
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30 shadow-sm">
                                      Continue Learning
                                    </span>
                                  )}
                                  {section.status === 'completed' && (
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200 shadow-sm">
                                      ✅ Completed
                                    </span>
                                  )}
                                </div>

                                {/* Action Icons */}
                                <div className="flex items-center gap-2 mt-1">
                                  {section.status !== 'locked' && (
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                  )}
                                  {section.status === 'in_progress' && !sectionProgress?.completed && (
                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Progress Indicator */}
                            {section.status === 'in_progress' && !sectionProgress?.completed && (
                              <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-primary font-medium">Ready to start</span>
                                  <div className="flex items-center gap-1 text-primary/80">
                                    <Timer className="h-4 w-4" />
                                    <span>{formatDuration(section.duration)} remaining</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Completion Details */}
                            {sectionProgress?.completed && (
                              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-green-700 font-medium">
                                    🎉 Great job! Section completed
                                  </span>
                                  <span className="text-green-600">
                                    {Math.floor((Date.now() / 1000 - sectionProgress.completedAt) / 86400)} days ago
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Hover Effect Overlay */}
                      {section.status !== 'locked' && (
                        <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/20 rounded-lg transition-all duration-200 pointer-events-none" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Course Progress Summary */}
              <div className="p-6 bg-muted/30 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-muted-foreground">
                        {sectionsWithStatus.filter(s => s.status === 'completed').length} Completed
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-primary rounded-full"></div>
                      <span className="text-sm text-muted-foreground">
                        {sectionsWithStatus.filter(s => s.status === 'in_progress').length} Available
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <span className="text-sm text-muted-foreground">
                        {sectionsWithStatus.filter(s => s.status === 'locked').length} Locked
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Keep going! {courseData.totalSections - courseData.completedSections} sections to go
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Course Stats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Course Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Sections</span>
                    <span className="font-semibold">{courseData.totalSections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Completed</span>
                    <span className="font-semibold text-green-600">{courseData.completedSections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Remaining</span>
                    <span className="font-semibold">{courseData.totalSections - courseData.completedSections}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Progress</span>
                    <span className="font-bold text-primary">{courseData.progressPercentage.toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>

              {/* Web3 Features */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Smart Contracts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Contract Addresses */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Wallet className="h-4 w-4" />
                      Contract Addresses
                    </div>
                    <div className="space-y-2 text-xs">
                      {Object.entries(contractAddresses).map(([name, address]) => (
                        <div key={name} className="group flex justify-between items-center p-3 bg-muted/50 rounded-lg border hover:bg-muted/70 transition-all duration-200">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground mb-1">{name}</div>
                            <code className="text-xs text-muted-foreground font-mono">
                              {address.slice(0, 8)}...{address.slice(-6)}
                            </code>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            onClick={() => copyToClipboard(address, name)}
                          >
                            {copiedAddress === name ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          {copiedAddress === name && (
                            <div className="absolute right-2 -top-8 bg-primary text-primary-foreground text-xs px-2 py-1 rounded shadow-lg">
                              Copied!
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Web3 Benefits */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">
                      Blockchain Benefits
                    </div>
                    <div className="flex items-start gap-3">
                      <Award className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium">NFT Certificate</div>
                        <div className="text-xs text-muted-foreground">
                          Earn blockchain-verified certificate
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Trophy className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium">Progress Ownership</div>
                        <div className="text-xs text-muted-foreground">
                          Your progress stored on blockchain
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Star className="h-4 w-4 text-purple-500 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium">Creator Royalties</div>
                        <div className="text-xs text-muted-foreground">
                          Support creators directly
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
