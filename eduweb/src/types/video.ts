export interface Chapter {
  title: string;
  startTime: number;
  endTime: number;
}

export interface EnrichedCourseSection {
  id: bigint;
  courseId: bigint;
  contentCID: string;
  orderId: bigint;
  title: string;
  description: string;
  duration: bigint;
  videoMetadata: {
    thumbnailCID: string;
    qualityOptions: never[];
    subtitleLanguages: never[];
    chapters: Chapter[];
    estimatedSize: number;
  };
}

export interface SectionProgress {
  sectionId: bigint;
  student: string;
  startedAt: bigint;
  lastAccessedAt: bigint;
  currentTime: bigint;
  isCompleted: boolean;
  completedAt: bigint;
}
