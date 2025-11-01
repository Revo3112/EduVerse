"use client";

import { HybridVideoPlayer } from "@/components/HybridVideoPlayer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  RefreshCw,
  Shield,
  Trophy,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  useActiveAccount,
  useReadContract,
  useSendTransaction,
} from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { toast } from "sonner";

import { executeQuery } from "@/lib/graphql-client";
import {
  GET_SECTION_DETAILS,
  GET_ENROLLMENT_BY_STUDENT_COURSE,
} from "@/lib/graphql-queries";
import { progressTracker } from "@/lib/contracts";
import { EnrichedCourseSection } from "@/lib/mock-data";

interface CourseSection {
  id: string;
  sectionId: string;
  title: string;
  contentCID: string;
  description: string;
  duration: string;
  orderId: string;
  createdAt: string;
}

interface CourseData {
  id: string;
  title: string;
  description: string;
  thumbnailCID: string;
  creator: string;
  creatorName: string;
  category: string;
  difficulty: string;
  priceInEth: string;
  sectionsCount: number;
  totalEnrollments: number;
  averageRating: string;
  totalRatings: number;
  createdAt: string;
  sections: CourseSection[];
}

interface EnrollmentData {
  id: string;
  durationMonths: string;
  licenseExpiry: string;
  isActive: boolean;
  status: string;
  pricePaid: string;
  pricePaidEth: string;
  purchasedAt: string;
  isCompleted: boolean;
  completionDate: string;
  sectionsCompleted: string;
}

interface SectionProgress {
  courseId: bigint;
  sectionId: bigint;
  completed: boolean;
  completedAt: bigint;
}

const fmtDuration = (sec: string | bigint) => {
  const s = typeof sec === "string" ? parseInt(sec, 10) : Number(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};

function SectionLearningContent() {
  const search = useSearchParams();
  const router = useRouter();
  const account = useActiveAccount();

  const courseId = useMemo(() => {
    const id = search.get("courseId");
    return id || "1";
  }, [search]);

  const sectionId = useMemo(() => {
    const id = search.get("sectionId");
    return id || "0";
  }, [search]);

  const [course, setCourse] = useState<CourseData | null>(null);
  const [section, setSection] = useState<CourseSection | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { mutate: sendTransaction, isPending: isSending } =
    useSendTransaction();

  const studentAddress = account?.address?.toLowerCase() || "";

  const { data: progressData, refetch: refetchProgress } = useReadContract({
    contract: progressTracker,
    method:
      "function getCourseSectionsProgress(address student, uint256 courseId) view returns (bool[] progress)",
    params: [studentAddress as `0x${string}`, BigInt(courseId)],
    queryOptions: {
      enabled: !!studentAddress && !!courseId,
    },
  });

  useEffect(() => {
    (async () => {
      if (!courseId) return;

      setLoading(true);
      try {
        const sectionGlobalId = `${courseId}-${sectionId}`;

        const result = (await executeQuery(GET_SECTION_DETAILS, {
          courseId,
          sectionId: sectionGlobalId,
        })) as { course?: CourseData };

        if (result.course) {
          setCourse(result.course);
          const foundSection = result.course.sections.find(
            (s: CourseSection) => s.orderId === sectionId
          );
          setSection(foundSection || null);
        }

        if (studentAddress) {
          const enrollmentId = `${studentAddress}-${courseId}`;
          const enrollmentResult = (await executeQuery(
            GET_ENROLLMENT_BY_STUDENT_COURSE,
            { enrollmentId }
          )) as { studentCourseEnrollment?: { enrollment: EnrollmentData } };

          if (enrollmentResult.studentCourseEnrollment?.enrollment) {
            setEnrollment(enrollmentResult.studentCourseEnrollment.enrollment);
          }
        }
      } catch (error) {
        console.error("[Section Page] Error fetching data:", error);
        toast.error("Failed to load section data");
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, sectionId, studentAddress, refreshTrigger]);

  const sectionProgress = useMemo(() => {
    if (!progressData || !section) return null;
    const idx = parseInt(section.orderId, 10);
    const completed = progressData[idx] || false;
    return {
      courseId: BigInt(courseId),
      sectionId: BigInt(sectionId),
      completed,
      completedAt: BigInt(0),
    } as SectionProgress;
  }, [progressData, section, courseId, sectionId]);

  const { percentage, completedCount } = useMemo(() => {
    if (!course || !progressData) return { percentage: 0, completedCount: 0 };
    const done = progressData.filter((c: boolean) => c).length;
    return {
      percentage: course.sectionsCount
        ? (done / course.sectionsCount) * 100
        : 0,
      completedCount: done,
    };
  }, [course, progressData]);

  const nav = useMemo(() => {
    if (!course || !section) return { cur: 0, tot: 0, prev: null, next: null };
    const list = course.sections.sort(
      (a, b) => parseInt(a.orderId, 10) - parseInt(b.orderId, 10)
    );
    const idx = list.findIndex((s) => s.orderId === section.orderId);
    return {
      cur: idx + 1,
      tot: list.length,
      prev: list[idx - 1] || null,
      next: list[idx + 1] || null,
    };
  }, [course, section]);

  const go = (orderId: string) =>
    router.push(`/learning/section?courseId=${courseId}&sectionId=${orderId}`);

  const handleStartSection = async () => {
    if (!studentAddress) {
      toast.error("Please connect your wallet");
      return;
    }
    if (isSending) return;

    try {
      const transaction = prepareContractCall({
        contract: progressTracker,
        method: "function startSection(uint256 courseId, uint256 sectionId)",
        params: [BigInt(courseId), BigInt(sectionId)],
      });

      sendTransaction(transaction, {
        onSuccess: () => {
          toast.success("Section started successfully");
          refetchProgress();
          setRefreshTrigger((t) => t + 1);
        },
        onError: (error) => {
          console.error("[Start Section] Error:", error);
          toast.error("Failed to start section");
        },
      });
    } catch (error) {
      console.error("[Start Section] Error:", error);
      toast.error("Failed to prepare transaction");
    }
  };

  const handleCompleteSection = async () => {
    if (!studentAddress) {
      toast.error("Please connect your wallet");
      return;
    }
    if (isSending) return;

    try {
      const transaction = prepareContractCall({
        contract: progressTracker,
        method: "function completeSection(uint256 courseId, uint256 sectionId)",
        params: [BigInt(courseId), BigInt(sectionId)],
      });

      sendTransaction(transaction, {
        onSuccess: () => {
          toast.success("Section completed! 🎉");
          refetchProgress();
          setRefreshTrigger((t) => t + 1);
        },
        onError: (error) => {
          console.error("[Complete Section] Error:", error);
          toast.error("Failed to complete section");
        },
      });
    } catch (error) {
      console.error("[Complete Section] Error:", error);
      toast.error("Failed to prepare transaction");
    }
  };

  const enrichedSection: EnrichedCourseSection | null = useMemo(() => {
    if (!section) return null;
    return {
      id: BigInt(section.sectionId),
      courseId: BigInt(courseId),
      contentCID: section.contentCID,
      orderId: BigInt(section.orderId),
      title: section.title,
      description: section.description || "",
      duration: BigInt(section.duration || "0"),
      videoMetadata: {
        thumbnailCID: "",
        qualityOptions: [],
        subtitleLanguages: [],
        chapters: [],
        estimatedSize: 0,
      },
    } as EnrichedCourseSection;
  }, [section, courseId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mb-4 mx-auto" />
          <p>Loading section…</p>
        </div>
      </div>
    );
  }

  if (!course || !section) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Course or Section not found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connect Wallet</AlertTitle>
          <AlertDescription>
            Please connect your wallet to access course content.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!enrollment || !enrollment.isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You need an active license to access this course content.
            <Button
              className="mt-4 w-full"
              onClick={() =>
                router.push(`/learning/course-details?id=${courseId}`)
              }
            >
              View Course Details
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <div className="xl:col-span-3">
            {enrichedSection && (
              <HybridVideoPlayer
                section={enrichedSection}
                progress={sectionProgress}
                onProgressUpdate={() => {}}
              />
            )}
            <div className="bg-card rounded-xl shadow-sm border p-6 mt-6">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> Section{" "}
                  {parseInt(section.orderId, 10) + 1}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {fmtDuration(section.duration)}
                </Badge>
                {sectionProgress?.completed && (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" /> Completed
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold mb-4">{section.title}</h1>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {section.description || "No description available."}
              </p>
              <div className="flex gap-3">
                {!sectionProgress?.completed && (
                  <>
                    <Button
                      onClick={handleStartSection}
                      disabled={isSending}
                      variant="outline"
                    >
                      {isSending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />{" "}
                          Processing…
                        </>
                      ) : (
                        "Mark as Started"
                      )}
                    </Button>
                    <Button
                      onClick={handleCompleteSection}
                      disabled={isSending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />{" "}
                          Processing…
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" /> Complete
                          Section
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="bg-gradient-to-r from-primary/5 to-purple/5 rounded-lg p-6 mt-6 border border-primary/20">
              <div className="flex items-center justify-center mb-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Section {nav.cur} of {nav.tot}
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="text-sm font-medium">{course.title}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => nav.prev && go(nav.prev.orderId)}
                  disabled={!nav.prev}
                  variant="outline"
                  className="h-auto p-4 flex items-center gap-3 justify-start hover:bg-background/80 hover:border-primary/40 disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="text-xs text-muted-foreground mb-1">
                      Previous
                    </div>
                    <div className="text-sm font-medium truncate">
                      {nav.prev?.title || "No previous section"}
                    </div>
                  </div>
                </Button>
                <Button
                  onClick={() => nav.next && go(nav.next.orderId)}
                  disabled={!nav.next}
                  variant="outline"
                  className="h-auto p-4 flex items-center gap-3 justify-end hover:bg-background/80 hover:border-primary/40 disabled:opacity-50"
                >
                  <div className="min-w-0 flex-1 text-right">
                    <div className="text-xs text-muted-foreground mb-1">
                      Next
                    </div>
                    <div className="text-sm font-medium truncate">
                      {nav.next?.title || "No next section"}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
          <div className="xl:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" /> Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-2">
                    {percentage.toFixed(0)}%
                  </div>
                  <Progress value={percentage} className="mb-2" />
                  <div className="text-sm text-muted-foreground">
                    {completedCount} of {course.sectionsCount} sections
                  </div>
                </div>
              </CardContent>
            </Card>
            {enrollment && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" /> License
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge
                      className={
                        enrollment.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {enrollment.isActive ? "Active" : "Expired"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span>{enrollment.durationMonths} month(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires</span>
                    <span>
                      {new Date(
                        parseInt(enrollment.licenseExpiry, 10) * 1000
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Video Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">Content ID</div>
                  <code className="bg-muted px-2 py-1 rounded text-xs break-all">
                    {section.contentCID}
                  </code>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Duration</div>
                  <div>{fmtDuration(section.duration)}</div>
                </div>
              </CardContent>
            </Card>
            <Button
              onClick={() =>
                router.push(`/learning/course-details?id=${courseId}`)
              }
              variant="outline"
              className="w-full flex items-center gap-2 hover:bg-primary/10 text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Course Detail
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLearningLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <CheckCircle className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-400" />
          <p className="text-muted-foreground">Loading section...</p>
        </div>
      </div>
    </div>
  );
}

export default function SectionLearningPage() {
  return (
    <Suspense fallback={<SectionLearningLoading />}>
      <SectionLearningContent />
    </Suspense>
  );
}
