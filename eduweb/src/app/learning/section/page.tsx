"use client";

import { HybridVideoPlayer } from "@/components/HybridVideoPlayer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  EnrichedCourseSection,
  ExtendedCourse,
  License,
  MOCK_USER_ADDRESS,
  mockDB,
  SectionProgress,
} from "@/lib/mock-data";

/* ---------- helpers ---------- */
const fmtDuration = (sec: bigint) => {
  const s = Number(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};

/* ---------- main page ---------- */
function SectionLearningContent() {
  const search = useSearchParams();
  const router = useRouter();

  const courseId = useMemo(() => {
    const id = search.get("courseId");
    const n = parseInt(id || "1", 10);
    return !isNaN(n) && n > 0 ? BigInt(n) : BigInt(1);
  }, [search]);

  const sectionId = useMemo(() => {
    const id = search.get("sectionId");
    const n = parseInt(id || "0", 10);
    return !isNaN(n) && n >= 0 ? BigInt(n) : BigInt(0);
  }, [search]);

  const [course, setCourse] = useState<ExtendedCourse | null>(null);
  const [section, setSection] = useState<EnrichedCourseSection | null>(null);
  const [progress, setProgress] = useState<SectionProgress | null>(null);
  const [license, setLicense] = useState<License | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [watch, setWatch] = useState(0);

  useEffect(() => {
    (async () => {
      await new Promise((r) => setTimeout(r, 1000));
      const c = mockDB.getCourse(courseId);
      if (c) {
        setCourse(c);
        setSection(c.sections.find((s) => s.orderId === sectionId) || null);
        setProgress(c.userProgress.find((p) => p.sectionId === sectionId) || null);
        setLicense(mockDB.getLicenseForUser(courseId, MOCK_USER_ADDRESS));
      }
      setLoading(false);
    })();
  }, [courseId, sectionId]);

  const { percentage, completedCount } = useMemo(() => {
    if (!course) return { percentage: 0, completedCount: 0 };
    const done = course.userProgress.filter((p) => p.completed).length;
    return { percentage: course.totalSections ? (done / course.totalSections) * 100 : 0, completedCount: done };
  }, [course]);

  const nav = useMemo(() => {
    if (!course || !section) return { cur: 0, tot: 0, prev: null, next: null };
    const list = course.sections.sort((a, b) => Number(a.orderId - b.orderId));
    const idx = list.findIndex((s) => s.orderId === section.orderId);
    return {
      cur: idx + 1,
      tot: list.length,
      prev: list[idx - 1] || null,
      next: list[idx + 1] || null,
    };
  }, [course, section]);

  const go = (id: bigint) => router.push(`/learning/section?courseId=${courseId}&sectionId=${id}`);

  const complete = async () => {
    if (completing || !course) return;
    setCompleting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setProgress({
      courseId,
      sectionId,
      completed: true,
      completedAt: BigInt(Math.floor(Date.now() / 1000)),
    });
    setDone(true);
    setCompleting(false);
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin mb-4" />
        <p>Loading section…</p>
      </div>
    );

  if (!course || !section)
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Course or Section not found.</AlertDescription>
        </Alert>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <div className="xl:col-span-3">
            <HybridVideoPlayer section={section} progress={progress} onProgressUpdate={setWatch} />
            <div className="bg-card rounded-xl shadow-sm border p-6 mt-6">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> Section {Number(section.orderId) + 1}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {fmtDuration(section.duration)}
                </Badge>
                {progress?.completed && (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" /> Completed
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold mb-4">{section.title}</h1>
              <p className="text-muted-foreground leading-relaxed mb-6">{section.description}</p>
              {!progress?.completed && (
                <Button onClick={complete} disabled={completing} className="bg-green-600 hover:bg-green-700">
                  {completing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Processing…
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" /> Complete Section
                    </>
                  )}
                </Button>
              )}
            </div>
            <div className="bg-gradient-to-r from-primary/5 to-purple/5 rounded-lg p-6 mt-6 border border-primary/20">
              <div className="flex items-center justify-center mb-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">Section {nav.cur} of {nav.tot}</div>
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
                    <div className="text-xs text-muted-foreground mb-1">Previous</div>
                    <div className="text-sm font-medium truncate">{nav.prev?.title || "No previous section"}</div>
                  </div>
                </Button>
                <Button
                  onClick={() => nav.next && go(nav.next.orderId)}
                  disabled={!nav.next}
                  variant="outline"
                  className="h-auto p-4 flex items-center gap-3 justify-end hover:bg-background/80 hover:border-primary/40 disabled:opacity-50"
                >
                  <div className="min-w-0 flex-1 text-right">
                    <div className="text-xs text-muted-foreground mb-1">Next</div>
                    <div className="text-sm font-medium truncate">{nav.next?.title || "No next section"}</div>
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
                  <div className="text-2xl font-bold text-primary mb-2">{percentage.toFixed(0)}%</div>
                  <Progress value={percentage} className="mb-2" />
                  <div className="text-sm text-muted-foreground">{completedCount} of {course.totalSections} sections</div>
                </div>
              </CardContent>
            </Card>
            {license && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" /> License
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={license.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>{license.isActive ? "Active" : "Expired"}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span>{Number(license.durationLicense)} month(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires</span>
                    <span>{new Date(Number(license.expiryTimestamp) * 1000).toLocaleDateString()}</span>
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
                  <div className="text-muted-foreground mb-1">IPFS Content</div>
                  <code className="bg-muted px-2 py-1 rounded text-xs break-all">{section.contentCID}</code>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Duration</div>
                  <div>{fmtDuration(section.duration)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Video Size</div>
                  <div>{section.videoMetadata.estimatedSize} MB</div>
                </div>
              </CardContent>
            </Card>
            <Button onClick={() => router.push(`/learning/course-details?courseId=${courseId}`)} variant="outline" className="w-full flex items-center gap-2 hover:bg-primary/10 text-sm font-medium">
              <ArrowLeft className="h-4 w-4" /> Back to Course Detail
            </Button>
          </div>
        </div>
      </div>
      {done && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-8 max-w-md mx-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Section Completed!</h3>
            <p className="text-muted-foreground mb-6">Congratulations! You&apos;ve completed &quot;{section.title}&quot;. Your progress has been saved.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDone(false)} className="flex-1">
                Continue Learning
              </Button>
              <Button onClick={() => {
                setDone(false);
                if (nav.next) {
                  go(nav.next.orderId);
                }
              }} className="flex-1">
                Next Section
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Loading component for Suspense fallback
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

// Main page component with Suspense wrapper
export default function SectionLearningPage() {
  return (
    <Suspense fallback={<SectionLearningLoading />}>
      <SectionLearningContent />
    </Suspense>
  );
}
