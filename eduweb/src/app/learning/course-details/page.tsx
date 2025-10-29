"use client";

import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle,
  ChevronRight,
  Copy,
  FileText,
  Globe,
  Lock,
  PlayCircle,
  RefreshCw,
  Shield,
  Star,
  Timer,
  Trophy,
  User,
  Video,
  Wallet,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { ContentContainer } from "@/components/PageContainer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

// 🚀 [PENYESUAIAN] Impor helper yang relevan saja. `formatPriceInIDR` sudah dihapus.
import {
  EnrichedCourseSection,
  ExtendedCourse,
  formatDuration,
  getCategoryName,
  getDifficultyName,
  mockDB,
} from "@/lib/mock-data";

// Tipe lokal untuk menggabungkan data sesi dengan statusnya di UI
type SectionStatus = "completed" | "in_progress" | "locked";
interface SectionWithStatus extends EnrichedCourseSection {
  status: SectionStatus;
}

/**
 * Halaman Detail Kursus yang sepenuhnya digerakkan oleh data mock terpusat.
 * UI tidak berubah, hanya lapisan datanya yang di-refactor dan diperbaiki.
 */
function CourseDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [courseData, setCourseData] = useState<ExtendedCourse | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string>("");

  // Alamat kontrak untuk fungsionalitas 'copy' di UI
  const contractAddresses = {
    CourseFactory: "0x44661459e3c092358559d8459e585EA201D04231",
    CourseLicense: "0x3aad55E0E88C4594643fEFA837caFAe1723403C8",
    ProgressTracker: "0xaB2adB0F4D800971Ee095e2bC26f9d4AdBeDe930",
    CertificateManager: "0x0a7750524B826E09a27B98564E98AF77fe78f600",
  };

  // Fungsi copy ke clipboard (dipertahankan dari kode asli)
  const copyToClipboard = async (address: string, contractName: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(address);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = address;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedAddress(contractName);
      setTimeout(() => setCopiedAddress(""), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      alert(`Failed to copy. Please copy manually: ${address}`);
    }
  };

  // Ambil ID kursus dari parameter URL
  const courseId = useMemo(() => {
    const id = searchParams.get("id");
    const parsed = parseInt(id || "1", 10);
    return !isNaN(parsed) && parsed > 0 ? BigInt(parsed) : BigInt(1);
  }, [searchParams]);

  // Ambil data kursus dari mockDB
  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        setLoading(true);
        setError("");
        // Simulasi loading jaringan agar terasa nyata
        await new Promise((resolve) => setTimeout(resolve, 500));

        const course = mockDB.getCourse(courseId);

        if (!course) {
          setError(
            `Course with ID ${courseId} not found. Available course IDs: 1, 2, 3.`
          );
        } else {
          setCourseData(course);
        }
      } catch (err) {
        setError("An unexpected error occurred while fetching course data.");
        console.error("Course fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [courseId]);

  // Proses data sesi untuk menentukan statusnya
  const sectionsWithStatus = useMemo((): SectionWithStatus[] => {
    if (!courseData) return [];
    const { sections, userProgress } = courseData;

    return sections.map((section) => {
      const progress = userProgress.find(
        (p) => p.sectionId === section.orderId
      );
      let status: SectionStatus = "locked";

      const isCompleted = progress?.completed ?? false;
      const isFirstSection = section.orderId === BigInt(0);
      const prevSectionCompleted = userProgress.some(
        (p) => p.sectionId === section.orderId - BigInt(1) && p.completed
      );

      if (isCompleted) {
        status = "completed";
      } else if (isFirstSection || prevSectionCompleted) {
        status = "in_progress";
      }

      return { ...section, status };
    });
  }, [courseData]);

  // Kalkulasi data progres untuk ditampilkan di UI
  const { progressPercentage, completedSectionsCount } = useMemo(() => {
    if (!courseData)
      return { progressPercentage: 0, completedSectionsCount: 0 };
    const completedCount = courseData.userProgress.filter(
      (p) => p.completed
    ).length;
    const percentage =
      courseData.totalSections > 0
        ? (completedCount / courseData.totalSections) * 100
        : 0;
    return {
      progressPercentage: percentage,
      completedSectionsCount: completedCount,
    };
  }, [courseData]);

  // Helper UI untuk warna badge kesulitan
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-green-100 text-green-800 border-green-200";
      case "Intermediate":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Advanced":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-6">
        <div className="w-full max-w-7xl animate-pulse space-y-8">
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error || !courseData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-6">
        <div className="container mx-auto max-w-7xl text-center">
          <Alert variant="destructive" className="max-w-md mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Course Loading Error</AlertTitle>
            <AlertDescription>
              {error || "The requested course could not be found."}
            </AlertDescription>
          </Alert>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" /> Try Again
            </Button>
            <Button
              onClick={() => router.push("/learning")}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Courses
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
        <ContentContainer>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {getCategoryName(courseData.category)}
                </Badge>
                <Badge
                  variant="outline"
                  className={`${getDifficultyColor(
                    getDifficultyName(courseData.difficulty)
                  )}`}
                >
                  {getDifficultyName(courseData.difficulty)}
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
                  <span className="text-sm font-medium">
                    {courseData.creatorName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {new Date(
                      Number(courseData.createdAt) * 1000
                    ).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {courseData.totalSections} sections
                  </span>
                </div>
              </div>
              <div className="bg-card rounded-lg p-6 shadow-sm border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Your Progress</h3>
                  <span className="text-2xl font-bold text-primary">
                    {progressPercentage.toFixed(0)}%
                  </span>
                </div>
                <Progress value={progressPercentage} className="mb-3" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {completedSectionsCount} of {courseData.totalSections}{" "}
                    completed
                  </span>
                  <span>
                    {courseData.totalSections - completedSectionsCount}{" "}
                    remaining
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="space-y-6">
                <div className="bg-card rounded-xl p-6 shadow-lg border sticky top-6">
                  <Button
                    onClick={() => router.push("/learning")}
                    variant="outline"
                    className="w-full flex items-center gap-2 hover:bg-primary/10"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back to My Learning
                  </Button>

                  <Separator className="my-6" />

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
        </ContentContainer>
      </div>

      <ContentContainer>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
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
                      {courseData.totalSections} sections •{" "}
                      {completedSectionsCount} completed •{" "}
                      {
                        sectionsWithStatus.filter(
                          (s) => s.status === "in_progress"
                        ).length
                      }{" "}
                      in progress
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {progressPercentage.toFixed(0)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Complete
                    </div>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-border">
                {sectionsWithStatus.map((section) => {
                  const sectionProgress = courseData.userProgress.find(
                    (p) => p.sectionId === section.orderId
                  );
                  const isNextSection =
                    !sectionProgress?.completed &&
                    section.status === "in_progress";

                  return (
                    <div
                      key={Number(section.id)}
                      className={`group relative transition-all duration-200 ${
                        section.status === "locked"
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:bg-accent/30 cursor-pointer hover:shadow-sm"
                      } ${
                        isNextSection
                          ? "bg-gradient-to-r from-primary/5 to-primary/10 border-l-4 border-l-primary"
                          : ""
                      }`}
                      onClick={() => {
                        if (section.status !== "locked") {
                          router.push(
                            `/learning/section?courseId=${courseData.id}&sectionId=${section.orderId}`
                          );
                        }
                      }}
                    >
                      <div className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div
                              className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200 ${
                                section.status === "completed"
                                  ? "bg-green-100 border-green-500 text-green-700"
                                  : section.status === "in_progress"
                                  ? "bg-primary/10 border-primary text-primary"
                                  : "bg-gray-100 border-gray-300 text-gray-500"
                              }`}
                            >
                              {section.status === "completed" ? (
                                <CheckCircle className="h-6 w-6" />
                              ) : section.status === "in_progress" ? (
                                <PlayCircle className="h-6 w-6" />
                              ) : (
                                <Lock className="h-6 w-6" />
                              )}
                              <div className="absolute -top-1 -right-1 text-xs font-bold bg-background border rounded-full w-6 h-6 flex items-center justify-center">
                                {Number(section.orderId) + 1}
                              </div>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0 pr-4">
                                <h3
                                  className={`text-xl font-bold mb-3 transition-colors leading-tight ${
                                    section.status === "completed"
                                      ? "text-green-700"
                                      : section.status === "in_progress"
                                      ? "text-primary"
                                      : "text-gray-500"
                                  }`}
                                >
                                  {section.title}
                                </h3>
                                {sectionProgress?.completed && (
                                  <div className="flex items-center gap-2 text-sm text-green-600 mb-3">
                                    <Trophy className="h-4 w-4" />
                                    <span>
                                      Completed on{" "}
                                      {new Date(
                                        Number(sectionProgress.completedAt) *
                                          1000
                                      ).toLocaleDateString("id-ID")}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <Video className="h-4 w-4" />
                                    <span className="font-medium">
                                      {formatDuration(section.duration)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                      {section.contentCID.slice(0, 8)}...
                                      {section.contentCID.slice(-4)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex-shrink-0 flex items-start gap-3">
                                <div className="flex flex-col gap-2 items-end">
                                  {isNextSection && (
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30 shadow-sm">
                                      Continue Learning
                                    </span>
                                  )}
                                  {section.status === "completed" && (
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200 shadow-sm">
                                      ✅ Completed
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  {section.status !== "locked" && (
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                  )}
                                  {isNextSection && (
                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isNextSection && (
                              <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-primary font-medium">
                                    Ready to start
                                  </span>
                                  <div className="flex items-center gap-1 text-primary/80">
                                    <Timer className="h-4 w-4" />
                                    <span>
                                      {formatDuration(section.duration)}{" "}
                                      remaining
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                            {sectionProgress?.completed && (
                              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-green-700 font-medium">
                                    🎉 Great job! Section completed
                                  </span>
                                  <span className="text-green-600">
                                    {Math.floor(
                                      (Date.now() / 1000 -
                                        Number(sectionProgress.completedAt)) /
                                        86400
                                    )}{" "}
                                    days ago
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {section.status !== "locked" && (
                        <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/20 rounded-lg transition-all duration-200 pointer-events-none" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="p-6 bg-muted/30 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-muted-foreground">
                        {
                          sectionsWithStatus.filter(
                            (s) => s.status === "completed"
                          ).length
                        }{" "}
                        Completed
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-primary rounded-full"></div>
                      <span className="text-sm text-muted-foreground">
                        {
                          sectionsWithStatus.filter(
                            (s) => s.status === "in_progress"
                          ).length
                        }{" "}
                        Available
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <span className="text-sm text-muted-foreground">
                        {
                          sectionsWithStatus.filter(
                            (s) => s.status === "locked"
                          ).length
                        }{" "}
                        Locked
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Keep going!{" "}
                    {courseData.totalSections - completedSectionsCount} sections
                    to go
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="space-y-6 sticky top-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Course Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Sections
                    </span>
                    <span className="font-semibold">
                      {courseData.totalSections}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Completed
                    </span>
                    <span className="font-semibold text-green-600">
                      {completedSectionsCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Remaining
                    </span>
                    <span className="font-semibold">
                      {courseData.totalSections - completedSectionsCount}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Progress
                    </span>
                    <span className="font-bold text-primary">
                      {progressPercentage.toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" /> Smart Contracts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 relative">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Wallet className="h-4 w-4" />
                      Contract Addresses
                    </div>
                    <div className="space-y-2 text-xs">
                      {Object.entries(contractAddresses).map(
                        ([name, address]) => (
                          <div
                            key={name}
                            className="group relative flex justify-between items-center p-3 bg-muted/50 rounded-lg border hover:bg-muted/70 transition-all duration-200"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-foreground mb-1">
                                {name}
                              </div>
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
                        )
                      )}
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">
                      Blockchain Benefits
                    </div>
                    <div className="flex items-start gap-3">
                      <Award className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium">
                          NFT Certificate
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Earn blockchain-verified certificate
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Trophy className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium">
                          Progress Ownership
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Your progress stored on blockchain
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Star className="h-4 w-4 text-purple-500 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium">
                          Creator Royalties
                        </div>
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
      </ContentContainer>
    </div>
  );
}

// Loading component for Suspense fallback
function CourseDetailsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-400" />
          <p className="text-muted-foreground">Loading course details...</p>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense wrapper
export default function CourseDetailsPage() {
  return (
    <Suspense fallback={<CourseDetailsLoading />}>
      <CourseDetailsContent />
    </Suspense>
  );
}
