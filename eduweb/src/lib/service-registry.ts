/**
 * SERVICE REGISTRY - DEPENDENCY VERIFICATION
 *
 * Central registry for all services used across Learning pages
 * Verifies all required services are properly configured and available
 */

// ============================================================================
// CORE SERVICES
// ============================================================================

export const CORE_SERVICES = {
  // Thirdweb SDK
  thirdweb: {
    client: "@/app/client",
    contracts: "@/lib/contracts",
    hooks: "thirdweb/react",
  },

  // Goldsky GraphQL
  goldsky: {
    client: "@/lib/graphql-client",
    queries: "@/lib/graphql-queries",
    myLearningService: "@/services/goldsky-mylearning.service",
  },

  // Livepeer Video
  livepeer: {
    serverAction: "@/app/actions/livepeer",
    source: "@/lib/livepeer-source",
    helpers: "@/lib/livepeer-helpers",
    playbackService: "@/services/livepeer-playback.service",
    uploadService: "@/services/livepeer-upload.service",
  },

  // Pinata IPFS (Legacy)
  pinata: {
    config: "@/lib/pinata",
    helpers: "@/lib/ipfs-helpers",
    uploadService: "@/services/pinata-upload.service",
    signedUrlApi: "/api/ipfs/signed-url/[cid]",
  },

  // Thirdweb IPFS (Modern)
  thirdwebIpfs: {
    upload: "@/lib/ipfs-upload-FINAL",
  },
} as const;

// ============================================================================
// PAGE-SPECIFIC SERVICE DEPENDENCIES
// ============================================================================

export const PAGE_SERVICES = {
  // /learning - My Learning page
  learning: {
    required: [
      "thirdweb.client",
      "thirdweb.hooks",
      "goldsky.client",
      "goldsky.queries",
      "goldsky.myLearningService",
      "pinata.helpers",
      "pinata.signedUrlApi",
    ],
    graphqlQueries: [
      "GET_USER_LEARNING_COURSES",
      "GET_USER_STATS",
      "GET_USER_CERTIFICATES",
    ],
    components: [
      "@/components/ThumbnailImage",
      "@/components/RatingModal",
      "@/components/GetCertificateModal",
      "@/components/RenewLicenseModal",
    ],
    contracts: ["courseFactory", "courseLicense", "certificateManager"],
  },

  // /learning/course-details - Course Details page
  courseDetails: {
    required: [
      "thirdweb.client",
      "thirdweb.contracts",
      "thirdweb.hooks",
      "goldsky.client",
      "goldsky.queries",
      "pinata.helpers",
    ],
    graphqlQueries: ["GET_COURSE_DETAILS", "GET_ENROLLMENT_BY_STUDENT_COURSE"],
    components: ["@/components/ThumbnailImage"],
    contracts: ["progressTracker", "courseLicense"],
    thirdwebMethods: [
      "useReadContract - getCourseSectionsProgress",
      "useSendTransaction - startSection",
      "useSendTransaction - completeSection",
    ],
  },

  // /learning/section - Section Learning page
  section: {
    required: [
      "thirdweb.client",
      "thirdweb.contracts",
      "thirdweb.hooks",
      "goldsky.client",
      "goldsky.queries",
      "livepeer.serverAction",
      "livepeer.helpers",
      "pinata.helpers",
    ],
    graphqlQueries: ["GET_SECTION_DETAILS", "GET_ENROLLMENT_BY_STUDENT_COURSE"],
    components: [
      "@/components/HybridVideoPlayer",
      "@/components/LivepeerPlayerView",
      "@/components/LegacyVideoPlayer",
    ],
    contracts: ["progressTracker"],
    thirdwebMethods: [
      "useReadContract - getCourseSectionsProgress",
      "useSendTransaction - startSection",
      "useSendTransaction - completeSection",
    ],
    livepeerFlow: [
      "HybridVideoPlayer detects format via isLivepeerPlaybackId()",
      "LivepeerPlayerView fetches via getLivepeerSource()",
      "Server action calls livepeer.playback.get()",
      "getSrc() transforms to Src[] for Player",
    ],
  },
} as const;

// ============================================================================
// ENVIRONMENT VARIABLES VERIFICATION
// ============================================================================

export const REQUIRED_ENV_VARS = {
  // Thirdweb
  NEXT_PUBLIC_THIRDWEB_CLIENT_ID: {
    scope: "client",
    required: true,
    description: "Thirdweb client ID for SDK initialization",
  },
  THIRDWEB_SECRET_KEY: {
    scope: "server",
    required: true,
    description: "Thirdweb secret key for server-side IPFS uploads",
  },

  // Smart Contracts
  NEXT_PUBLIC_COURSE_FACTORY_ADDRESS: {
    scope: "client",
    required: true,
    description: "CourseFactory contract address",
  },
  NEXT_PUBLIC_COURSE_LICENSE_ADDRESS: {
    scope: "client",
    required: true,
    description: "CourseLicense contract address",
  },
  NEXT_PUBLIC_PROGRESS_TRACKER_ADDRESS: {
    scope: "client",
    required: true,
    description: "ProgressTracker contract address",
  },
  NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS: {
    scope: "client",
    required: true,
    description: "CertificateManager contract address",
  },

  // Goldsky
  NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT: {
    scope: "client",
    required: true,
    description: "Goldsky subgraph GraphQL endpoint",
  },

  // Livepeer
  LIVEPEER_API_KEY: {
    scope: "server",
    required: true,
    description: "Livepeer API key for video operations",
  },

  // Pinata
  PINATA_JWT: {
    scope: "server",
    required: true,
    description: "Pinata JWT token for IPFS uploads",
  },
  PINATA_GATEWAY: {
    scope: "server",
    required: true,
    description: "Pinata gateway domain for signed URLs",
  },
  PINATA_SIGNED_URL_EXPIRY: {
    scope: "server",
    required: false,
    description: "Signed URL expiry for thumbnails (default: 3600)",
  },
  PINATA_VIDEO_SIGNED_URL_EXPIRY: {
    scope: "server",
    required: false,
    description: "Signed URL expiry for videos (default: 7200)",
  },

  // Network
  NEXT_PUBLIC_CHAIN_ID: {
    scope: "client",
    required: false,
    description: "Blockchain network chain ID (default: 11155111 - Sepolia)",
  },
} as const;

// ============================================================================
// API ROUTES
// ============================================================================

export const API_ROUTES = {
  ipfs: {
    signedUrl: "/api/ipfs/signed-url/[cid]",
    refreshSignedUrl: "/api/ipfs/refresh-signed-url",
  },
  course: {
    // Add course API routes if any
  },
  livepeer: {
    // Livepeer uses server action instead of API route
    serverAction: "@/app/actions/livepeer",
  },
  metadata: {
    // Add metadata API routes if any
  },
  progress: {
    // Progress tracked on-chain via ProgressTracker contract
  },
} as const;

// ============================================================================
// CONTRACT METHODS MAPPING
// ============================================================================

export const CONTRACT_METHODS = {
  progressTracker: {
    read: [
      "getCourseSectionsProgress(address, uint256) returns (bool[])",
      "getCourseProgressPercentage(address, uint256) returns (uint256)",
      "isSectionCompleted(address, uint256, uint256) returns (bool)",
      "isCourseCompleted(address, uint256) returns (bool)",
    ],
    write: [
      "startSection(uint256, uint256)",
      "completeSection(uint256, uint256)",
    ],
  },

  courseLicense: {
    read: [
      "hasValidLicense(address, uint256) returns (bool)",
      "getLicense(address, uint256) returns (License)",
    ],
    write: ["renewLicense(uint256, uint256) payable"],
  },

  courseFactory: {
    read: [
      "getCourse(uint256) returns (Course)",
      "getCourseRating(uint256) returns (uint256, uint256)",
    ],
    write: ["submitRating(uint256, uint256)"],
  },

  certificateManager: {
    read: [
      "getCertificate(uint256) returns (Certificate)",
      "hasCertificate(address) returns (bool)",
    ],
    write: [
      "mintCertificate(string, string)",
      "addCourseToCertificate(uint256)",
    ],
  },
} as const;

// ============================================================================
// GRAPHQL QUERY VERIFICATION
// ============================================================================

export const GRAPHQL_QUERIES = {
  // Learning page
  GET_USER_LEARNING_COURSES: {
    file: "@/lib/graphql-queries",
    entities: ["licenses", "sectionProgresses", "courseCompletions"],
    requiredFields: ["courseId", "isActive", "licenseExpiry"],
  },

  // Course Details page
  GET_COURSE_DETAILS: {
    file: "@/lib/graphql-queries",
    entities: ["course", "sections"],
    requiredFields: ["id", "title", "sections.contentCID", "sections.orderId"],
  },

  GET_ENROLLMENT_BY_STUDENT_COURSE: {
    file: "@/lib/graphql-queries",
    entities: ["studentCourseEnrollment"],
    requiredFields: ["isActive", "licenseExpiry", "status"],
  },

  // Section page
  GET_SECTION_DETAILS: {
    file: "@/lib/graphql-queries",
    entities: ["course", "courseSection"],
    requiredFields: [
      "course.sections",
      "section.contentCID",
      "section.duration",
    ],
  },
} as const;

// ============================================================================
// VIDEO PLAYBACK SERVICES
// ============================================================================

export const VIDEO_SERVICES = {
  // Livepeer (Modern)
  livepeer: {
    detection: "isLivepeerPlaybackId() - 16 char lowercase hex",
    component: "LivepeerPlayerView",
    dataFlow: [
      "1. HybridVideoPlayer receives contentCID",
      "2. isLivepeerPlaybackId() checks format",
      "3. LivepeerPlayerView fetches via getLivepeerSource()",
      "4. Server action: livepeer.playback.get(playbackId)",
      "5. getSrc() transforms to Src[] array",
      "6. Player.Root renders with controls",
    ],
    features: [
      "Quality selector (360p, 720p, 1080p, Auto)",
      "HLS adaptive streaming",
      "MP4 static renditions",
      "WebRTC low-latency (optional)",
      "Thumbnail previews",
    ],
  },

  // Pinata IPFS (Legacy)
  pinata: {
    detection: "IPFS CID - Qm... or bafy... prefix",
    component: "LegacyVideoPlayer",
    dataFlow: [
      "1. HybridVideoPlayer receives contentCID",
      "2. isLivepeerPlaybackId() returns false",
      "3. LegacyVideoPlayer fetches signed URL",
      "4. getSignedUrlForCID() calls Pinata API",
      "5. Signed URL cached for 50 min",
      "6. Custom video player renders",
    ],
    features: [
      "Custom controls",
      "Progress tracking",
      "Chapter markers",
      "Skip forward/backward",
      "Signed URL auto-refresh",
    ],
  },
} as const;

// ============================================================================
// THUMBNAIL SERVICES
// ============================================================================

export const THUMBNAIL_SERVICES = {
  component: "ThumbnailImage",
  hook: "useThumbnailUrl",
  caching: {
    apiRoute: "/api/ipfs/signed-url/[cid]",
    cacheDuration: "50 minutes",
    strategy: "stale-while-revalidate",
  },
  dataFlow: [
    "1. ThumbnailImage receives thumbnailCID",
    "2. useThumbnailUrl fetches signed URL",
    "3. getSignedUrlCached() calls cached API route",
    "4. API route checks Next.js Data Cache",
    "5. Cache hit: <10ms response",
    "6. Cache miss: Pinata API call (~200-500ms)",
    "7. Next.js Image component renders with signed URL",
  ],
} as const;

// ============================================================================
// SERVICE VERIFICATION FUNCTIONS
// ============================================================================

export function verifyEnvironmentVariables(): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];

  Object.entries(REQUIRED_ENV_VARS).forEach(([key, config]) => {
    const value = process.env[key];

    if (config.required && !value) {
      missing.push(`${key} - ${config.description}`);
    }

    if (!config.required && !value) {
      warnings.push(`${key} - ${config.description} (optional, using default)`);
    }
  });

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

export function getServiceDependencies(page: keyof typeof PAGE_SERVICES) {
  return PAGE_SERVICES[page];
}

export function getAllRequiredServices() {
  const allServices = new Set<string>();

  Object.values(PAGE_SERVICES).forEach((page) => {
    page.required.forEach((service) => allServices.add(service));
  });

  return Array.from(allServices);
}

// ============================================================================
// EXPORTS
// ============================================================================

export type ServiceName = keyof typeof CORE_SERVICES;
export type PageName = keyof typeof PAGE_SERVICES;
export type EnvVarName = keyof typeof REQUIRED_ENV_VARS;
