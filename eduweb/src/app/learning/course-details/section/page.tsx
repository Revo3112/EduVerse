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
  ChevronLeft,
  Timer,
  Copy,
  Check,
  Home,
  ArrowLeft,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Pause,
  Play,
  Settings,
  Download,
  MessageSquare,
  BookMarked,
  Target,
  Zap,
  Gift
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// 🚀 SMART CONTRACT COMPATIBLE INTERFACES
// Extended from CourseFactory.sol for section-level data

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

enum LicenseStatus {
  Active = 0,
  Expired = 1,
  NotPurchased = 2,
  Suspended = 3
}

interface CourseData {
  id: number;
  title: string;
  description: string;
  creator: string;
  creatorName: string;
  thumbnailCID: string;
  category: CourseCategory;
  difficulty: CourseDifficulty;
  pricePerMonth: number;
  createdAt: number;
  totalSections: number;
  completedSections: number;
  progressPercentage: number;
}

interface CourseSectionData {
  id: number;
  courseId: number;
  title: string;
  description: string; // Extended description for section learning
  contentCID: string;
  duration: number;
  orderId: number;
  videoMetadata: VideoMetadata;
}

interface VideoMetadata {
  thumbnailCID: string;
  qualityOptions: VideoQuality[];
  subtitleLanguages: string[];
  chapters: VideoChapter[];
  estimatedSize: number; // in MB
}

interface VideoQuality {
  resolution: string;
  bitrate: number;
  size: number; // in MB
}

interface VideoChapter {
  title: string;
  startTime: number; // in seconds
  endTime: number;
}

interface UserSectionProgress {
  courseId: number;
  sectionId: number;
  completed: boolean;
  completedAt: number;
  watchTime: number; // in seconds
  lastPosition: number; // in seconds
}

interface UserLicense {
  courseId: number;
  status: LicenseStatus;
  purchasedAt: number;
  expiresAt: number;
  duration: number; // in months
  price: number; // in wei
}

type SectionStatus = 'completed' | 'available' | 'locked';

interface SectionWithStatus extends CourseSectionData {
  status: SectionStatus;
}

/**
 * 🧩 Enhanced MockEduVerseDatabase - Section-Level Learning Simulator
 *
 * Extends the course-details mock to handle section-level operations:
 * - Individual section data with video metadata
 * - License validation and status tracking
 * - Progress updates and completion tracking
 * - Sequential unlocking logic
 * - Certificate eligibility checking
 */
class MockEduVerseSectionDatabase {
  private courses: CourseData[] = [];
  private sections: CourseSectionData[] = [];
  private userProgress: UserSectionProgress[] = [];
  private userLicenses: UserLicense[] = [];

  constructor() {
    this.initializeCourses();
    this.initializeSections();
    this.initializeUserProgress();
    this.initializeLicenses();
  }

  private initializeCourses() {
    this.courses = [
      {
        id: 1,
        title: "Blockchain Fundamentals & Web3 Development",
        description: "Master blockchain technology from basics to advanced Web3 development. Learn smart contracts, DeFi protocols, and build decentralized applications with hands-on projects.",
        creator: "0x742d35Cc8d2c0c2c21a7e7e2b6C3b3b3e3b3b3b3",
        creatorName: "Dr. Alex Chen",
        thumbnailCID: "bafybeic3zml2dfde76qfakovud6wamewoa42z23tgliplke54nrwc5cj2y",
        category: CourseCategory.Technology,
        difficulty: CourseDifficulty.Beginner,
        pricePerMonth: 2000000000000000,
        createdAt: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60),
        totalSections: 10,
        completedSections: 4,
        progressPercentage: 40
      },
      {
        id: 2,
        title: "Advanced Smart Contract Security & Auditing",
        description: "Deep dive into smart contract security patterns, common vulnerabilities, and professional auditing techniques.",
        creator: "0x2C8b5b3C8D2E2c4a5b6C7d8E9f10A11b12C13D14",
        creatorName: "Sarah Martinez",
        thumbnailCID: "bafybeic3zml2dfde76qfakovud6wamewoa42z23tgliplke54nrwc5cj2y",
        category: CourseCategory.Technology,
        difficulty: CourseDifficulty.Advanced,
        pricePerMonth: 2000000000000000,
        createdAt: Math.floor(Date.now() / 1000) - (15 * 24 * 60 * 60),
        totalSections: 8,
        completedSections: 6,
        progressPercentage: 75
      },
      {
        id: 3,
        title: "DeFi Protocol Design & Implementation",
        description: "Build your own DeFi protocol from concept to deployment. Master liquidity pools, yield farming, governance tokens.",
        creator: "0x8E9f10A11b12C13D145E6F17G18H19I20J21K22L",
        creatorName: "Michael Torres",
        thumbnailCID: "bafybeic3zml2dfde76qfakovud6wamewoa42z23tgliplke54nrwc5cj2y",
        category: CourseCategory.Technology,
        difficulty: CourseDifficulty.Intermediate,
        pricePerMonth: 2000000000000000,
        createdAt: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60),
        totalSections: 8,
        completedSections: 2,
        progressPercentage: 25
      }
    ];
  }

  private initializeSections() {
    // Course 1 - Blockchain Fundamentals (10 sections)
    const course1Sections: CourseSectionData[] = [
      {
        id: 0,
        courseId: 1,
        title: "Introduction to Blockchain Technology",
        description: "Welcome to the fascinating world of blockchain technology! In this foundational section, you'll discover what makes blockchain revolutionary and how it's transforming industries worldwide. We'll explore the core concepts that make decentralized systems possible, examine real-world applications, and set the stage for your journey into Web3 development. Perfect for beginners, this section requires no prior technical knowledge.",
        contentCID: "bafybeicmoogk5nmg4uizxyn6i3gh24dc2c7rnpico7ziqoi4llvhqaicli",
        duration: 1800,
        orderId: 0,
        videoMetadata: {
          thumbnailCID: "bafybeic3zml2dfde76qfakovud6wamewoa42z23tgliplke54nrwc5cj2y",
          qualityOptions: [
            { resolution: "1080p", bitrate: 4000, size: 720 },
            { resolution: "720p", bitrate: 2500, size: 450 },
            { resolution: "480p", bitrate: 1000, size: 180 }
          ],
          subtitleLanguages: ["en", "es", "fr", "zh"],
          chapters: [
            { title: "What is Blockchain?", startTime: 0, endTime: 300 },
            { title: "Decentralization Benefits", startTime: 300, endTime: 600 },
            { title: "Real-World Applications", startTime: 600, endTime: 1200 },
            { title: "Getting Started Guide", startTime: 1200, endTime: 1800 }
          ],
          estimatedSize: 720
        }
      },
      {
        id: 1,
        courseId: 1,
        title: "Understanding Cryptographic Hash Functions",
        description: "Dive deep into the mathematical foundations that secure blockchain networks. You'll learn how hash functions work, why they're one-way operations, and how they create the immutable links between blocks. Through interactive examples and visual demonstrations, you'll understand SHA-256, collision resistance, and the avalanche effect. This knowledge is crucial for understanding how blockchain achieves security and integrity.",
        contentCID: "bafybeicmoogk5nmg4uizxyn6i3gh24dc2c7rnpico7ziqoi4llvhqaicli",
        duration: 2100,
        orderId: 1,
        videoMetadata: {
          thumbnailCID: "bafybeic3zml2dfde76qfakovud6wamewoa42z23tgliplke54nrwc5cj2y",
          qualityOptions: [
            { resolution: "1080p", bitrate: 4000, size: 840 },
            { resolution: "720p", bitrate: 2500, size: 525 },
            { resolution: "480p", bitrate: 1000, size: 210 }
          ],
          subtitleLanguages: ["en", "es", "fr"],
          chapters: [
            { title: "Hash Function Basics", startTime: 0, endTime: 420 },
            { title: "SHA-256 Algorithm", startTime: 420, endTime: 840 },
            { title: "Collision Resistance", startTime: 840, endTime: 1260 },
            { title: "Practical Examples", startTime: 1260, endTime: 2100 }
          ],
          estimatedSize: 840
        }
      },
      {
        id: 2,
        courseId: 1,
        title: "Digital Signatures and Public Key Cryptography",
        description: "Master the cryptographic techniques that enable secure, trustless transactions on blockchain networks. You'll explore how public-private key pairs work, understand digital signature algorithms like ECDSA, and learn how these technologies prevent fraud and ensure transaction authenticity. Hands-on exercises will help you generate keys, sign messages, and verify signatures using real tools.",
        contentCID: "bafybeicmoogk5nmg4uizxyn6i3gh24dc2c7rnpico7ziqoi4llvhqaicli",
        duration: 1950,
        orderId: 2,
        videoMetadata: {
          thumbnailCID: "bafybeic3zml2dfde76qfakovud6wamewoa42z23tgliplke54nrwc5cj2y",
          qualityOptions: [
            { resolution: "1080p", bitrate: 4000, size: 780 },
            { resolution: "720p", bitrate: 2500, size: 487 },
            { resolution: "480p", bitrate: 1000, size: 195 }
          ],
          subtitleLanguages: ["en", "es"],
          chapters: [
            { title: "Public Key Cryptography", startTime: 0, endTime: 487 },
            { title: "Digital Signature Process", startTime: 487, endTime: 975 },
            { title: "ECDSA in Bitcoin", startTime: 975, endTime: 1462 },
            { title: "Hands-on Practice", startTime: 1462, endTime: 1950 }
          ],
          estimatedSize: 780
        }
      },
      {
        id: 3,
        courseId: 1,
        title: "Merkle Trees and Data Structures",
        description: "Explore the elegant data structures that make blockchain scalable and efficient. Learn how Merkle trees enable fast verification of large datasets, understand root hashes and proof paths, and discover how these structures are used in Bitcoin, Ethereum, and other blockchains. You'll build your own Merkle tree implementation and understand why they're essential for blockchain architecture.",
        contentCID: "bafybeicmoogk5nmg4uizxyn6i3gh24dc2c7rnpico7ziqoi4llvhqaicli",
        duration: 1650,
        orderId: 3,
        videoMetadata: {
          thumbnailCID: "bafybeic3zml2dfde76qfakovud6wamewoa42z23tgliplke54nrwc5cj2y",
          qualityOptions: [
            { resolution: "1080p", bitrate: 4000, size: 660 },
            { resolution: "720p", bitrate: 2500, size: 412 },
            { resolution: "480p", bitrate: 1000, size: 165 }
          ],
          subtitleLanguages: ["en"],
          chapters: [
            { title: "Binary Tree Basics", startTime: 0, endTime: 412 },
            { title: "Merkle Tree Construction", startTime: 412, endTime: 825 },
            { title: "Proof Verification", startTime: 825, endTime: 1237 },
            { title: "Blockchain Applications", startTime: 1237, endTime: 1650 }
          ],
          estimatedSize: 660
        }
      }
      // Additional sections would be added here...
    ];

    this.sections = course1Sections;
  }

  private initializeUserProgress() {
    const userProgress: UserSectionProgress[] = [
      {
        courseId: 1,
        sectionId: 0,
        completed: true,
        completedAt: Math.floor(Date.now() / 1000) - (4 * 86400),
        watchTime: 1800,
        lastPosition: 1800
      },
      {
        courseId: 1,
        sectionId: 1,
        completed: true,
        completedAt: Math.floor(Date.now() / 1000) - (3 * 86400),
        watchTime: 2100,
        lastPosition: 2100
      },
      {
        courseId: 1,
        sectionId: 2,
        completed: true,
        completedAt: Math.floor(Date.now() / 1000) - (2 * 86400),
        watchTime: 1950,
        lastPosition: 1950
      },
      {
        courseId: 1,
        sectionId: 3,
        completed: true,
        completedAt: Math.floor(Date.now() / 1000) - (1 * 86400),
        watchTime: 1650,
        lastPosition: 1650
      },
      {
        courseId: 1,
        sectionId: 4,
        completed: false,
        completedAt: 0,
        watchTime: 450,
        lastPosition: 450
      }
    ];

    this.userProgress = userProgress;
  }

  private initializeLicenses() {
    const currentTime = Math.floor(Date.now() / 1000);
    this.userLicenses = [
      {
        courseId: 1,
        status: LicenseStatus.Active,
        purchasedAt: currentTime - (15 * 86400), // 15 days ago
        expiresAt: currentTime + (15 * 86400), // 15 days from now
        duration: 1, // 1 month
        price: 2000000000000000
      },
      {
        courseId: 2,
        status: LicenseStatus.Active,
        purchasedAt: currentTime - (10 * 86400),
        expiresAt: currentTime + (80 * 86400), // 3 months total
        duration: 3,
        price: 5500000000000000
      }
    ];
  }

  // API Methods

  getCourse(courseId: number): CourseData | null {
    return this.courses.find(course => course.id === courseId) || null;
  }

  getSection(courseId: number, sectionId: number): CourseSectionData | null {
    return this.sections.find(section =>
      section.courseId === courseId && section.id === sectionId
    ) || null;
  }

  getCourseSections(courseId: number): CourseSectionData[] {
    return this.sections.filter(section => section.courseId === courseId)
      .sort((a, b) => a.orderId - b.orderId);
  }

  getUserProgress(courseId: number, sectionId: number): UserSectionProgress | null {
    return this.userProgress.find(progress =>
      progress.courseId === courseId && progress.sectionId === sectionId
    ) || null;
  }

  getUserLicense(courseId: number): UserLicense | null {
    return this.userLicenses.find(license => license.courseId === courseId) || null;
  }

  getSectionStatus(courseId: number, sectionId: number): SectionStatus {
    const progress = this.getUserProgress(courseId, sectionId);
    if (progress?.completed) return 'completed';

    const section = this.getSection(courseId, sectionId);
    if (!section) return 'locked';

    // First section is always available
    if (section.orderId === 0) return 'available';

    // Check if previous section is completed
    const previousSection = this.sections.find(s =>
      s.courseId === courseId && s.orderId === section.orderId - 1
    );

    if (previousSection) {
      const previousProgress = this.getUserProgress(courseId, previousSection.id);
      return previousProgress?.completed ? 'available' : 'locked';
    }

    return 'locked';
  }

  async markSectionComplete(courseId: number, sectionId: number): Promise<boolean> {
    // Simulate blockchain transaction delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const existingProgress = this.userProgress.find(p =>
      p.courseId === courseId && p.sectionId === sectionId
    );

    if (existingProgress) {
      existingProgress.completed = true;
      existingProgress.completedAt = Math.floor(Date.now() / 1000);
      existingProgress.watchTime = existingProgress.lastPosition;
    } else {
      const section = this.getSection(courseId, sectionId);
      if (section) {
        this.userProgress.push({
          courseId,
          sectionId,
          completed: true,
          completedAt: Math.floor(Date.now() / 1000),
          watchTime: section.duration,
          lastPosition: section.duration
        });
      }
    }

    return true;
  }

  updateWatchProgress(courseId: number, sectionId: number, position: number): void {
    const existingProgress = this.userProgress.find(p =>
      p.courseId === courseId && p.sectionId === sectionId
    );

    if (existingProgress) {
      existingProgress.lastPosition = position;
      existingProgress.watchTime = Math.max(existingProgress.watchTime, position);
    } else {
      this.userProgress.push({
        courseId,
        sectionId,
        completed: false,
        completedAt: 0,
        watchTime: position,
        lastPosition: position
      });
    }
  }

  getNextSection(courseId: number, currentSectionId: number): CourseSectionData | null {
    const currentSection = this.getSection(courseId, currentSectionId);
    if (!currentSection) return null;

    return this.sections.find(section =>
      section.courseId === courseId && section.orderId === currentSection.orderId + 1
    ) || null;
  }

  getPreviousSection(courseId: number, currentSectionId: number): CourseSectionData | null {
    const currentSection = this.getSection(courseId, currentSectionId);
    if (!currentSection) return null;

    return this.sections.find(section =>
      section.courseId === courseId && section.orderId === currentSection.orderId - 1
    ) || null;
  }

  getCourseProgress(courseId: number): { completed: number; total: number; percentage: number } {
    const sections = this.getCourseSections(courseId);
    const completedSections = sections.filter(section =>
      this.getSectionStatus(courseId, section.id) === 'completed'
    );

    return {
      completed: completedSections.length,
      total: sections.length,
      percentage: sections.length > 0 ? (completedSections.length / sections.length) * 100 : 0
    };
  }
}

// 🎯 Initialize the enhanced mock database
const mockDB = new MockEduVerseSectionDatabase();

// 🛠️ Utility Functions

const formatPrice = (priceInWei: number): string => {
  const priceInEth = priceInWei / 1000000000000000000;
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

const formatTimePosition = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getCategoryLabel = (category: CourseCategory): string => {
  return CourseCategory[category] || 'Unknown';
};

const getDifficultyLabel = (difficulty: CourseDifficulty): string => {
  return CourseDifficulty[difficulty] || 'Unknown';
};

const getLicenseStatusLabel = (status: LicenseStatus): string => {
  switch (status) {
    case LicenseStatus.Active: return 'Active';
    case LicenseStatus.Expired: return 'Expired';
    case LicenseStatus.NotPurchased: return 'Not Purchased';
    case LicenseStatus.Suspended: return 'Suspended';
    default: return 'Unknown';
  }
};

// 🎥 Video Player Component

interface VideoPlayerProps {
  section: CourseSectionData;
  progress: UserSectionProgress | null;
  onProgressUpdate: (position: number) => void;
}

function VideoPlayer({ section, progress, onProgressUpdate }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(progress?.lastPosition || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(section.videoMetadata.qualityOptions[1]);
  const [showControls, setShowControls] = useState(true);

  const progressPercentage = (currentTime / section.duration) * 100;

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    onProgressUpdate(newTime);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  // Simulate video playback
  useEffect(() => {
    if (isPlaying && currentTime < section.duration) {
      const interval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 1;
          if (newTime <= section.duration) {
            onProgressUpdate(newTime);
            return newTime;
          }
          setIsPlaying(false);
          return prev;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isPlaying, currentTime, section.duration, onProgressUpdate]);

  return (
    <div className="relative bg-black rounded-lg overflow-hidden shadow-lg">
      {/* Video Display Area */}
      <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        {/* Placeholder Video Content */}
        <div className="text-center text-white p-8">
          <Video className="h-16 w-16 mx-auto mb-4 opacity-70" />
          <h3 className="text-xl font-semibold mb-2">{section.title}</h3>
          <p className="text-gray-300 text-sm mb-4">
            Quality: {selectedQuality.resolution} • {formatDuration(section.duration)}
          </p>
          <div className="text-xs text-gray-400 space-y-1">
            <div>IPFS: {section.contentCID}</div>
            <div>Size: {selectedQuality.size}MB</div>
          </div>
        </div>

        {/* Video Controls Overlay */}
        {showControls && (
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center transition-opacity">
            <Button
              size="lg"
              variant="ghost"
              className="h-16 w-16 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white"
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <Pause className="h-8 w-8" />
              ) : (
                <Play className="h-8 w-8 ml-1" />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="bg-gray-900 text-white p-4">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm mb-2">
            <span>{formatTimePosition(currentTime)}</span>
            <div className="flex-1">
              <Progress value={progressPercentage} className="h-2" />
            </div>
            <span>{formatTimePosition(section.duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePlayPause}
              className="text-white hover:bg-gray-800"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleSeek(Math.max(0, currentTime - 10))}
              className="text-white hover:bg-gray-800"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleSeek(Math.min(section.duration, currentTime + 10))}
              className="text-white hover:bg-gray-800"
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMuted(!isMuted)}
                className="text-white hover:bg-gray-800"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <div className="w-16">
                <Progress value={isMuted ? 0 : volume * 100} className="h-1" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedQuality.resolution}
              onChange={(e) => {
                const quality = section.videoMetadata.qualityOptions.find(
                  q => q.resolution === e.target.value
                );
                if (quality) setSelectedQuality(quality);
              }}
              className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-700"
            >
              {section.videoMetadata.qualityOptions.map(quality => (
                <option key={quality.resolution} value={quality.resolution}>
                  {quality.resolution}
                </option>
              ))}
            </select>

            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-gray-800"
            >
              <Settings className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-white hover:bg-gray-800"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Chapter Navigation */}
        {section.videoMetadata.chapters.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="text-sm text-gray-300 mb-2">Chapters</div>
            <div className="flex flex-wrap gap-2">
              {section.videoMetadata.chapters.map((chapter, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant="outline"
                  onClick={() => handleSeek(chapter.startTime)}
                  className="text-xs bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  {chapter.title}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 🎨 Main Section Learning Component

export default function SectionLearningPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [sectionData, setSectionData] = useState<CourseSectionData | null>(null);
  const [sectionProgress, setSectionProgress] = useState<UserSectionProgress | null>(null);
  const [userLicense, setUserLicense] = useState<UserLicense | null>(null);
  const [isCompletingSection, setIsCompletingSection] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showCourseCompletionModal, setShowCourseCompletionModal] = useState(false);

  // Get URL parameters
  const courseId = useMemo(() => {
    const id = searchParams.get('courseId');
    const parsed = parseInt(id || '1', 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : 1;
  }, [searchParams]);

  const sectionId = useMemo(() => {
    const id = searchParams.get('sectionId');
    const parsed = parseInt(id || '0', 10);
    return !isNaN(parsed) && parsed >= 0 ? parsed : 0;
  }, [searchParams]);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const course = mockDB.getCourse(courseId);
      const section = mockDB.getSection(courseId, sectionId);
      const progress = mockDB.getUserProgress(courseId, sectionId);
      const license = mockDB.getUserLicense(courseId);

      if (!course) {
        setError(`Course ID ${courseId} not found`);
        return;
      }

      if (!section) {
        setError(`Section ID ${sectionId} not found in course ${courseId}`);
        return;
      }

      if (!license || license.status !== LicenseStatus.Active) {
        setError('Active license required to access this content');
        return;
      }

      const sectionStatus = mockDB.getSectionStatus(courseId, sectionId);
      if (sectionStatus === 'locked') {
        setError('This section is locked. Complete previous sections first.');
        return;
      }

      setCourseData(course);
      setSectionData(section);
      setSectionProgress(progress);
      setUserLicense(license);
    } catch (err) {
      setError('Failed to load section data');
      console.error('Section fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [courseId, sectionId]);

  // Handle progress updates
  const handleProgressUpdate = (position: number) => {
    if (sectionData) {
      mockDB.updateWatchProgress(courseId, sectionId, position);

      // Update local state
      setSectionProgress(prev => prev ? {
        ...prev,
        lastPosition: position,
        watchTime: Math.max(prev.watchTime, position)
      } : {
        courseId,
        sectionId,
        completed: false,
        completedAt: 0,
        watchTime: position,
        lastPosition: position
      });
    }
  };

  // Handle section completion
  const handleCompleteSection = async () => {
    if (!sectionData || isCompletingSection) return;

    setIsCompletingSection(true);
    try {
      await mockDB.markSectionComplete(courseId, sectionId);

      // Update local progress
      setSectionProgress(prev => ({
        courseId,
        sectionId,
        completed: true,
        completedAt: Math.floor(Date.now() / 1000),
        watchTime: prev?.watchTime || sectionData.duration,
        lastPosition: sectionData.duration
      }));

      setShowCompletionModal(true);

      // Check if course is completed
      const courseProgress = mockDB.getCourseProgress(courseId);
      if (courseProgress.percentage === 100) {
        setTimeout(() => {
          setShowCompletionModal(false);
          setShowCourseCompletionModal(true);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to complete section:', error);
    } finally {
      setIsCompletingSection(false);
    }
  };

  // Navigation helpers
  const navigateToSection = (targetSectionId: number) => {
    const newUrl = new URL(window.location.origin + window.location.pathname);
    newUrl.searchParams.set('courseId', courseId.toString());
    newUrl.searchParams.set('sectionId', targetSectionId.toString());
    router.push(newUrl.toString());
  };

  const goBackToCourse = () => {
    router.push(`/learning/course-details?id=${courseId}`);
  };

  // Get navigation data
  const nextSection = sectionData ? mockDB.getNextSection(courseId, sectionId) : null;
  const previousSection = sectionData ? mockDB.getPreviousSection(courseId, sectionId) : null;
  const courseProgress = mockDB.getCourseProgress(courseId);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !courseData || !sectionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="container mx-auto px-6 max-w-7xl">
          <Alert variant="destructive" className="max-w-md mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Section Loading Error</AlertTitle>
            <AlertDescription>{error || 'Section not found'}</AlertDescription>
          </Alert>

          <div className="mt-6 flex gap-3 justify-center">
            <Button onClick={fetchData} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button variant="outline" onClick={goBackToCourse}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Course
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Breadcrumb Navigation */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button onClick={() => router.push('/learning')} className="hover:text-foreground transition-colors">
              <Home className="h-4 w-4" />
            </button>
            <ChevronRight className="h-4 w-4" />
            <button onClick={goBackToCourse} className="hover:text-foreground transition-colors">
              Learning
            </button>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium truncate">
              {sectionData.title}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Video Player Section */}
          <div className="xl:col-span-3">
            <div className="mb-6">
              <VideoPlayer
                section={sectionData}
                progress={sectionProgress}
                onProgressUpdate={handleProgressUpdate}
              />
            </div>

            {/* Section Information */}
            <div className="bg-card rounded-xl shadow-sm border p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      Section {sectionData.orderId + 1}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(sectionData.duration)}
                    </Badge>
                    {sectionProgress?.completed && (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-3xl font-bold mb-4 text-foreground leading-tight">
                    {sectionData.title}
                  </h1>
                </div>
              </div>

              <div className="prose prose-gray max-w-none">
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {sectionData.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex items-center gap-4">
                {!sectionProgress?.completed && (
                  <Button
                    onClick={handleCompleteSection}
                    disabled={isCompletingSection}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    {isCompletingSection ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Complete Section
                      </>
                    )}
                  </Button>
                )}

                {sectionProgress?.completed && nextSection && (
                  <Button
                    onClick={() => navigateToSection(nextSection.id)}
                    className="flex items-center gap-2"
                  >
                    Next Section
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}

                <Button variant="outline" onClick={goBackToCourse}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Course
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-1">
            <div className="space-y-6">
              {/* Course Progress */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Course Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary mb-1">
                        {courseProgress.percentage.toFixed(0)}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {courseProgress.completed} of {courseProgress.total} sections
                      </div>
                    </div>
                    <Progress value={courseProgress.percentage} className="h-3" />
                    <div className="text-xs text-muted-foreground text-center">
                      {courseProgress.total - courseProgress.completed} sections remaining
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* License Status */}
              {userLicense && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      License Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge className="bg-green-100 text-green-800">
                          {getLicenseStatusLabel(userLicense.status)}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Expires</span>
                        <span className="text-sm font-medium">
                          {new Date(userLicense.expiresAt * 1000).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Duration</span>
                        <span className="text-sm font-medium">{userLicense.duration} month(s)</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Section Navigation */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Navigation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {previousSection && (
                    <Button
                      variant="outline"
                      onClick={() => navigateToSection(previousSection.id)}
                      className="w-full justify-start"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      {/* Tambahkan kelas flex-1 dan min-w-0 di sini */}
                      <div className="text-left flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground">Previous</div>
                        <div className="truncate">{previousSection.title}</div>
                      </div>
                    </Button>
                  )}

                  {nextSection && (
                    <Button
                      variant="outline"
                      onClick={() => navigateToSection(nextSection.id)}
                      className="w-full justify-start"
                      disabled={mockDB.getSectionStatus(courseId, nextSection.id) === 'locked'}
                    >
                      <ChevronRight className="h-4 w-4 mr-2" />
                      {/* Tambahkan kelas flex-1 dan min-w-0 di sini */}
                      <div className="text-left flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground">Next</div>
                        <div className="truncate">{nextSection.title}</div>
                      </div>
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Technical Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Technical Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">Content ID</div>
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      {sectionData.contentCID}
                    </code>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Duration</div>
                    <div>{formatDuration(sectionData.duration)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Quality Options</div>
                    <div className="space-y-1">
                      {sectionData.videoMetadata.qualityOptions.map(quality => (
                        <div key={quality.resolution} className="text-xs">
                          {quality.resolution} • {quality.size}MB
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Section Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-8 max-w-md mx-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Section Completed!</h3>
            <p className="text-muted-foreground mb-6">
              Great job completing "{sectionData.title}". Your progress has been saved to the blockchain.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCompletionModal(false)}
                className="flex-1"
              >
                Continue Learning
              </Button>
              {nextSection && (
                <Button
                  onClick={() => {
                    setShowCompletionModal(false);
                    navigateToSection(nextSection.id);
                  }}
                  className="flex-1"
                >
                  Next Section
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Course Completion Modal */}
      {showCourseCompletionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-8 max-w-md mx-4 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">🎉 Course Completed!</h3>
            <p className="text-muted-foreground mb-6">
              Congratulations! You've completed all sections of "{courseData.title}".
              You're now eligible to purchase a blockchain certificate.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCourseCompletionModal(false)}
                className="flex-1"
              >
                Continue Learning
              </Button>
              <Button
                onClick={() => {
                  setShowCourseCompletionModal(false);
                  router.push(`/certificates/purchase?courseId=${courseId}`);
                }}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700"
              >
                <Award className="h-4 w-4 mr-2" />
                Get Certificate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
