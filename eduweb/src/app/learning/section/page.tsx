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
import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// Import data dan tipe dari file mock terpusat
import {
  mockDB,
  ExtendedCourse,
  EnrichedCourseSection,
  SectionProgress,
  License,
  LicenseStatus,
  MOCK_USER_ADDRESS,
} from "@/lib/mock-data";


// Tipe status untuk UI, tetap di sini karena spesifik untuk logika komponen
type SectionStatus = 'completed' | 'available' | 'locked';

// Enhanced Video Player Component (Tidak ada perubahan di sini, hanya tipe props yang disesuaikan)
interface VideoPlayerProps {
  section: EnrichedCourseSection;
  progress: SectionProgress | null;
  onProgressUpdate: (position: number) => void;
}

function VideoPlayer({ section, progress, onProgressUpdate }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // Dihapus inisialisasi dari progress
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Video URL dari data mock (tetap sama untuk demo)
  const videoUrl = `https://copper-far-firefly-220.mypinata.cloud/ipfs/${section.contentCID}`;

  // Initialize video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      setIsLoading(false);
      setDuration(video.duration);
      // Logika untuk memulai dari posisi terakhir ditonton (jika ada)
      // Sayangnya, mock SectionProgress tidak punya 'lastPosition', kita asumsikan 0
      // Jika Anda ingin menambahkan 'lastPosition', tambahkan di mock-data.ts
      video.currentTime = 0; // Mulai dari awal
      setCurrentTime(0);
    };

    const handleTimeUpdate = () => {
      const time = Math.floor(video.currentTime);
      setCurrentTime(time);
      onProgressUpdate(time);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [onProgressUpdate, section.contentCID]);

  // Handle play/pause
  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  // Handle seek
  const handleSeek = (newTime: number) => {
    const video = videoRef.current;
    if (!video) return;

    const clampedTime = Math.max(0, Math.min(newTime, duration));
    video.currentTime = clampedTime;
    setCurrentTime(clampedTime);
  };

  // Handle volume change
  const handleVolumeChange = (newVolume: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  // Handle mute toggle
  const handleMuteToggle = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  // Handle fullscreen
  const handleFullscreen = async () => {
    const player = playerRef.current;
    if (!player) return;

    try {
      if (!isFullscreen) {
        if (player.requestFullscreen) {
          await player.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-hide controls
  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeout) clearTimeout(controlsTimeout);

    const timeout = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);

    setControlsTimeout(timeout);
  };

  // Handle mouse movement
  const handleMouseMove = () => {
    showControlsTemporarily();
  };

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    handleSeek(newTime);
  };

  // Format time helper
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={playerRef}
      className={`relative bg-black rounded-lg overflow-hidden shadow-lg ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Element */}
      <div className={`relative ${isFullscreen ? 'h-full' : 'aspect-video'}`}>
        <video
          ref={videoRef}
          src={videoUrl}
          className={`w-full ${isFullscreen ? 'h-full' : 'h-full'} object-cover`}
          preload="metadata"
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-center text-white">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p className="text-sm">Loading video...</p>
            </div>
          </div>
        )}

        {/* Play Button Overlay */}
        {!isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onClick={handlePlayPause}
          >
            <Button
              size="lg"
              variant="ghost"
              className={`h-20 w-20 rounded-full bg-black bg-opacity-30 hover:bg-opacity-50 text-white transition-opacity ${isPlaying && !showControls ? 'opacity-0' : 'opacity-100'}`}
            >
              {isPlaying ? (
                <Pause className="h-10 w-10" />
              ) : (
                <Play className="h-10 w-10 ml-1" />
              )}
            </Button>
          </div>
        )}

        {/* Controls Overlay */}
        {showControls && !isLoading && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4">
            {/* Progress Bar */}
            <div className="mb-4">
              <div
                className="h-2 bg-white bg-opacity-30 rounded cursor-pointer relative group"
                onClick={handleProgressClick}
              >
                <div
                  className="h-full bg-red-500 rounded transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
                <div
                  className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg cursor-pointer group-hover:scale-110 transition-transform"
                  style={{ left: `${progressPercentage}%`, marginLeft: '-8px' }}
                />
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <Button size="sm" variant="ghost" onClick={handlePlayPause} className="text-white hover:bg-white hover:bg-opacity-20 p-2">
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleSeek(currentTime - 10)} className="text-white hover:bg-white hover:bg-opacity-20 p-2">
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleSeek(currentTime + 10)} className="text-white hover:bg-white hover:bg-opacity-20 p-2">
                  <SkipForward className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={handleMuteToggle} className="text-white hover:bg-white hover:bg-opacity-20 p-2">
                    {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                  <div className="w-20 relative">
                    <input type="range" min="0" max="1" step="0.1" value={isMuted ? 0 : volume} onChange={(e) => handleVolumeChange(parseFloat(e.target.value))} className="w-full h-1 bg-white bg-opacity-30 rounded appearance-none cursor-pointer slider" />
                  </div>
                </div>
                <div className="text-sm font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={handleFullscreen} className="text-white hover:bg-white hover:bg-opacity-20 p-2">
                  {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chapter Navigation */}
      {showControls && section.videoMetadata.chapters.length > 0 && !isFullscreen && (
        <div className="bg-gray-900 text-white p-4 border-t border-gray-700">
          <div className="text-sm text-gray-300 mb-2">Chapters</div>
          <div className="flex flex-wrap gap-2">
            {section.videoMetadata.chapters.map((chapter, index) => (
              <Button key={index} size="sm" variant="outline" onClick={() => handleSeek(chapter.startTime)} className="text-xs bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700">
                {chapter.title}
              </Button>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          background: #ef4444;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid white;
        }

        .slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: #ef4444;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid white;
        }
      `}</style>
    </div>
  );
}


// Utility functions (disesuaikan untuk menerima `bigint`)
const formatDuration = (seconds: bigint): string => {
    const numSeconds = Number(seconds);
    const minutes = Math.floor(numSeconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
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


// Main Component
export default function SectionLearningPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [courseData, setCourseData] = useState<ExtendedCourse | null>(null);
  const [sectionData, setSectionData] = useState<EnrichedCourseSection | null>(null);
  const [sectionProgress, setSectionProgress] = useState<SectionProgress | null>(null);
  const [userLicense, setUserLicense] = useState<License | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompletingSection, setIsCompletingSection] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [watchTime, setWatchTime] = useState(0); // State untuk melacak waktu tonton lokal

  // Get course and section IDs from URL parameters
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

  // Initialize data from the centralized mock database
  useEffect(() => {
    const loadData = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

      const course = mockDB.getCourse(BigInt(courseId));
      if (course) {
        setCourseData(course);

        const section = course.sections.find(s => s.orderId === BigInt(sectionId));
        setSectionData(section || null);

        const progress = course.userProgress.find(p => p.sectionId === BigInt(sectionId));
        setSectionProgress(progress || null);

        const license = mockDB.getLicenseForUser(BigInt(courseId), MOCK_USER_ADDRESS);
        setUserLicense(license);
      }

      setLoading(false);
    };

    loadData();
  }, [courseId, sectionId]);

  // Calculate progress percentage dynamically
  const progressInfo = useMemo(() => {
    if (!courseData) return { percentage: 0, completedCount: 0 };

    const completedCount = courseData.userProgress.filter(p => p.completed).length;
    const totalSections = courseData.totalSections;
    const percentage = totalSections > 0 ? (completedCount / totalSections) * 100 : 0;

    return { percentage, completedCount };
  }, [courseData]);

  // Calculate current section index and navigation info
  const navigationInfo = useMemo(() => {
    if (!courseData || !sectionData) return { currentIndex: 0, totalSections: 0, canGoPrevious: false, canGoNext: false, previousSection: null, nextSection: null };

    const sections = courseData.sections.sort((a, b) => Number(a.orderId) - Number(b.orderId));
    const currentIndex = sections.findIndex(s => s.orderId === sectionData.orderId);
    const totalSections = sections.length;

    const canGoPrevious = currentIndex > 0;
    const canGoNext = currentIndex < totalSections - 1;

    const previousSection = canGoPrevious ? sections[currentIndex - 1] : null;
    const nextSection = canGoNext ? sections[currentIndex + 1] : null;

    return {
      currentIndex: currentIndex + 1, // Display as 1-based
      totalSections,
      canGoPrevious,
      canGoNext,
      previousSection,
      nextSection
    };
  }, [courseData, sectionData]);

  const handleProgressUpdate = (position: number) => {
    // Di aplikasi nyata, ini bisa di-debounce dan dikirim ke backend/blockchain
    // Untuk mock, kita hanya update state lokal untuk UI
    setWatchTime(position);
  };

  const handleSectionNavigation = (targetSectionId: number) => {
    router.push(`/learning/section?courseId=${courseId}&sectionId=${targetSectionId}`);
  };

  const handleCompleteSection = async () => {
    if (isCompletingSection || !courseData) return;

    setIsCompletingSection(true);
    try {
      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update local state to reflect completion
      setSectionProgress({
        courseId: BigInt(courseId),
        sectionId: BigInt(sectionId),
        completed: true,
        completedAt: BigInt(Math.floor(Date.now() / 1000)),
      });
      setShowCompletionModal(true);

    } catch (error) {
      console.error('Failed to complete section:', error);
    } finally {
      setIsCompletingSection(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading section...</p>
        </div>
      </div>
    );
  }

  if (!courseData || !sectionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Course or Section not found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Video Section */}
          <div className="xl:col-span-3">
            <VideoPlayer
              section={sectionData}
              progress={sectionProgress}
              onProgressUpdate={handleProgressUpdate}
            />

            {/* Section Info */}
            <div className="bg-card rounded-xl shadow-sm border p-6 mt-6">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  Section {Number(sectionData.orderId) + 1}
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

              <h1 className="text-3xl font-bold mb-4">{sectionData.title}</h1>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {sectionData.description}
              </p>

              {!sectionProgress?.completed && (
                <Button
                  onClick={handleCompleteSection}
                  disabled={isCompletingSection}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isCompletingSection ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Section
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Section Navigation */}
            <div className="bg-gradient-to-r from-primary/5 to-purple/5 rounded-lg p-6 mt-6 border border-primary/20">
              <div className="flex items-center justify-center mb-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Section {navigationInfo.currentIndex} of {navigationInfo.totalSections}
                  </div>
                  <div className="h-4 w-px bg-border"></div>
                  <div className="text-sm font-medium">
                    {courseData?.title}
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="grid grid-cols-2 gap-4">
                {/* Previous Button */}
                <Button
                  onClick={() => navigationInfo.previousSection && handleSectionNavigation(Number(navigationInfo.previousSection.orderId))}
                  disabled={!navigationInfo.canGoPrevious}
                  variant="outline"
                  className="h-auto p-4 flex items-center gap-3 justify-start hover:bg-background/80 hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5 flex-shrink-0" />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="text-xs text-muted-foreground mb-1">Previous</div>
                    <div className="text-sm font-medium truncate">
                      {navigationInfo.previousSection?.title || "No previous section"}
                    </div>
                  </div>
                </Button>

                {/* Next Button */}
                <Button
                  onClick={() => navigationInfo.nextSection && handleSectionNavigation(Number(navigationInfo.nextSection.orderId))}
                  disabled={!navigationInfo.canGoNext}
                  variant="outline"
                  className="h-auto p-4 flex items-center gap-3 justify-end hover:bg-background/80 hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="min-w-0 flex-1 text-right">
                    <div className="text-xs text-muted-foreground mb-1">Next</div>
                    <div className="text-sm font-medium truncate">
                      {navigationInfo.nextSection?.title || "No next section"}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 flex-shrink-0" />
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-1">
            <div className="space-y-6">
              {/* Progress Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-2">{progressInfo.percentage.toFixed(0)}%</div>
                    <Progress value={progressInfo.percentage} className="mb-2" />
                    <div className="text-sm text-muted-foreground">{progressInfo.completedCount} of {courseData.totalSections} sections</div>
                  </div>
                </CardContent>
              </Card>

              {/* License Card */}
              {userLicense && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      License
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge className={`${userLicense.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                           {userLicense.isActive ? 'Active' : 'Expired'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Duration</span>
                        <span className="text-sm">{Number(userLicense.durationLicense)} month(s)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Expires</span>
                        <span className="text-sm">
                          {new Date(Number(userLicense.expiryTimestamp) * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Technical Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Video Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">IPFS Content</div>
                    <code className="bg-muted px-2 py-1 rounded text-xs break-all">
                      {sectionData.contentCID}
                    </code>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Duration</div>
                    <div>{formatDuration(sectionData.duration)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Video Size</div>
                    <div>{sectionData.videoMetadata.estimatedSize}MB</div>
                  </div>
                </CardContent>
              </Card>

              {/* Back Navigation */}
                <Button
                  onClick={() => router.push(`/learning/course-details?courseId=${courseId}`)}
                  variant="outline"
                  className="w-full flex items-center gap-2 hover:bg-primary/10 text-sm font-medium"
                >
                  <ArrowLeft className="h-4  w-4" />
                   Back to Course Detail
                </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-8 max-w-md mx-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Section Completed!</h3>
            <p className="text-muted-foreground mb-6">
              Congratulations! You've completed "{sectionData.title}".
              Your progress has been saved.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCompletionModal(false)}
                className="flex-1"
              >
                Continue Learning
              </Button>
              <Button
                onClick={() => setShowCompletionModal(false)}
                className="flex-1"
              >
                Next Section
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
