/**
 * Pinata Type Definitions
 * Comprehensive TypeScript types for Pinata SDK integration
 *
 * @module pinata-types
 * @description Re-exports official Pinata SDK types and defines application-specific types
 */

// ============================================================================
// RE-EXPORT OFFICIAL PINATA SDK TYPES
// ============================================================================

export type {
    AccessLinkOptions, FileObject,
    JsonBody, PinataMetadata, UploadOptions as PinataSdkUploadOptions, UploadResponse as PinataSdkUploadResponse
} from 'pinata';

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Pinata SDK Configuration
 * @property jwt - JWT token for authentication (internal property name)
 * @property gateway - Gateway domain without protocol (internal property name)
 * @property defaultExpiry - Default expiry for signed URLs in seconds (default: 3600)
 * @property videoExpiry - Expiry for video signed URLs in seconds (default: 7200)
 * @property maxRetries - Maximum number of retry attempts for failed uploads
 */
export interface PinataConfig {
  jwt: string;
  gateway: string;
  defaultExpiry: number;
  videoExpiry: number;
  maxRetries?: number;
}

// ============================================================================
// UPLOAD RESPONSE TYPES
// ============================================================================

/**
 * Pinata Upload Response (matches official SDK structure)
 * @see https://github.com/pinatacloud/pinata
 */
export interface PinataUploadResponse {
  id: string;
  name: string;
  cid: string;
  size: number;
  created_at: string;
  number_of_files: number;
  mime_type: string;
  group_id: string | null;
  keyvalues: Record<string, string>;
}

/**
 * Success response wrapper for uploads
 */
export interface UploadSuccessResponse {
  success: true;
  data: {
    cid: string;
    size: number;
    name: string;
    mimeType: string;
    timestamp?: string; // Optional timestamp
    pinataResponse?: PinataUploadResponse; // Optional full Pinata response
    signedUrl?: string; // Optional signed URL
    expiresAt?: number; // Optional expiry timestamp
    pinataId?: string; // Optional Pinata internal ID
    uploadedAt?: string; // Optional upload timestamp
    network?: 'private' | 'public'; // Optional network type
    duration?: number; // Video duration in seconds (for smart contract & Goldsky indexer)
    [key: string]: unknown; // Allow additional properties for flexibility
  };
}

/**
 * Error codes for upload operations
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'INVALID_DIMENSIONS'
  | 'INVALID_DURATION'
  | 'UPLOAD_FAILED'
  | 'NETWORK_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'UNKNOWN_ERROR'
  | 'UNSUPPORTED_FILE_TYPE';

/**
 * Error response wrapper for uploads
 */
export interface UploadErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
    retryable?: boolean; // Whether the operation can be retried
  };
}

/**
 * Union type for upload responses
 */
export type UploadResponse = UploadSuccessResponse | UploadErrorResponse;

// ============================================================================
// SIGNED URL TYPES
// ============================================================================

/**
 * Options for generating signed URLs
 */
export interface SignedUrlOptions {
  cid: string;
  expires?: number; // Expiry in seconds from now
  fileName?: string;
}

/**
 * Signed URL response
 */
export interface SignedUrlResponse {
  success: boolean;
  signedUrl?: string;
  expiresAt?: number; // Unix timestamp
  expires?: number; // Seconds from now
  error?: string;
}

// ============================================================================
// FILE VALIDATION TYPES
// ============================================================================

/**
 * File validation rules
 */
export interface FileValidationRule {
  maxSize: number; // Bytes
  allowedTypes: string[]; // MIME types
  minWidth?: number; // Pixels (minimum)
  minHeight?: number; // Pixels (minimum)
  maxWidth?: number; // Pixels (maximum)
  maxHeight?: number; // Pixels (maximum)
  exactWidth?: number; // Pixels (exact)
  exactHeight?: number; // Pixels (exact)
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: {
    code: ErrorCode;
    message: string;
  };
  code?: ErrorCode; // Legacy support
}

// ============================================================================
// COURSE ASSET METADATA TYPES
// ============================================================================

/**
 * Metadata for course assets (thumbnails, videos, certificates)
 */
export interface CourseAssetMetadata {
  courseId: string;
  fileType: 'thumbnail' | 'video' | 'certificate' | 'certificate-metadata' | 'course_thumbnail' | 'course_video';
  sectionId?: string;
  courseName?: string;
  uploadedAt?: string;
  originalName?: string;
  platform?: 'web' | 'mobile';
  duration?: number; // Video duration in seconds (for smart contract & Goldsky indexer)
}

/**
 * Private upload options
 */
export interface PrivateUploadOptions {
  file?: File;
  fileName?: string; // Optional, can be derived from file
  name?: string; // Alternative property name for compatibility
  metadata?: CourseAssetMetadata;
  keyvalues?: Record<string, string | number | boolean>;
  groupId?: string;
}

/**
 * JSON upload options
 */
export interface JSONUploadOptions {
  data: object;
  fileName?: string; // Optional, can have default
  name?: string; // Alternative property name
  metadata?: CourseAssetMetadata;
  keyvalues?: Record<string, string | number | boolean>;
  groupId?: string;
}

// ============================================================================
// THUMBNAIL SERVICE TYPES
// ============================================================================

/**
 * Options for thumbnail upload
 */
export interface ThumbnailUploadOptions {
  file: File;
  courseId: string;
  courseName?: string;
  groupId?: string;
}

/**
 * Batch thumbnail upload result
 */
export interface BatchThumbnailResult {
  successful: UploadSuccessResponse[];
  failed: Array<{
    fileName: string;
    error: string;
  }>;
}

// ============================================================================
// VIDEO SERVICE TYPES
// ============================================================================

/**
 * Video upload progress stages
 */
export type UploadStage = 'preparing' | 'uploading' | 'processing' | 'complete' | 'error';

/**
 * Upload progress callback
 */
export interface UploadProgress {
  stage: UploadStage;
  progress?: number; // 0-100 (optional, can use percentage instead)
  percentage?: number; // Alternative name for progress (0-100)
  bytesUploaded?: number;
  uploadedBytes?: number; // Alternative name for bytesUploaded
  totalBytes?: number;
  estimatedTimeRemaining?: number; // seconds
  message?: string;
}

/**
 * Upload progress callback function type
 */
export type UploadProgressCallback = (progress: UploadProgress) => void;

/**
 * Options for video upload
 */
export interface VideoUploadOptions {
  file: File;
  courseId: string;
  sectionId: string;
  courseName?: string;
  sectionTitle?: string;
  onProgress?: (progress: UploadProgress) => void;
  groupId?: string;
}

/**
 * Batch video upload strategy
 */
export type BatchUploadStrategy = 'sequential' | 'parallel';

/**
 * Batch video upload options
 */
export interface BatchVideoUploadOptions {
  videos: Array<{
    file: File;
    sectionId: string;
    sectionTitle?: string;
  }>;
  courseId: string;
  courseName?: string;
  strategy?: BatchUploadStrategy;
  maxConcurrent?: number; // For parallel strategy
  onProgress?: (overall: UploadProgress, individual?: UploadProgress) => void;
  groupId?: string;
}

/**
 * Batch video upload result
 */
export interface BatchVideoResult {
  successful: Array<UploadSuccessResponse & { sectionId: string }>;
  failed: Array<{
    sectionId: string;
    fileName: string;
    error: string;
  }>;
  timing: {
    totalDuration: number;
    averagePerVideo: number;
  };
}

// ============================================================================
// CERTIFICATE SERVICE TYPES
// ============================================================================

/**
 * Certificate data for generation
 * @description Supports both traditional and blockchain-based certificates
 * @blockchain Compatible with CertificateManager.sol ERC-1155 structure
 */
export interface CertificateData {
  // ===== LEGACY FIELDS (for display purposes) =====
  certificateId: string; // Generated ID for internal tracking (e.g., "cert-COURSE-001-timestamp-random")
  studentName: string; // Display name for recipient
  courseName: string; // Primary course name (for single course certificates)
  completionDate: string; // ISO 8601 format (human-readable)
  instructorName: string; // Instructor display name
  courseId: string; // Primary course ID (for single course certificates)
  walletAddress?: string; // DEPRECATED: Use recipientAddress instead
  blockchainTxHash?: string; // Transaction hash when minting on blockchain
  credentialUrl?: string; // Legacy credential verification URL

  // ===== BLOCKCHAIN FIELDS (CertificateManager.sol compatibility) =====
  tokenId?: number; // ERC-1155 token ID from blockchain (uint256)
  recipientAddress?: string; // Blockchain wallet address (address type in Solidity)
  completedCourses?: number[]; // Array of completed course IDs (uint256[] in Solidity)
  issuedAt?: number; // Unix timestamp when certificate was first issued (uint256)
  lastUpdated?: number; // Unix timestamp of last course addition (uint256)
  paymentReceiptHash?: string; // Keccak256 hash of payment receipt (bytes32, stored as hex string)
  platformName?: string; // Platform name (e.g., "EduVerse Academy")
  baseRoute?: string; // QR code base route for verification URL
  isValid?: boolean; // Certificate validity status (can be revoked)
  lifetimeFlag?: boolean; // Always true for lifetime certificates
}

/**
 * Certificate style configuration
 */
export interface CertificateStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  textColor?: string;
  titleFontSize?: number;
  bodyFontSize?: number;
  fontFamily?: string;
}

/**
 * Options for certificate generation and upload
 */
export interface CertificateUploadOptions {
  certificateData?: CertificateData; // Optional for backwards compatibility
  style?: CertificateStyle;
  groupId?: string;
  quality?: number; // Image quality (0-1)
}

/**
 * Alias for backwards compatibility
 */
export type CertificateGenerationOptions = CertificateUploadOptions;

/**
 * Certificate upload result (includes both image and metadata)
 */
export interface CertificateUploadResult {
  success: true;
  data: {
    imageCID: string;
    metadataCID: string;
    imageSignedUrl: string;
    metadataSignedUrl: string;
    certificateId: string;
    timestamp: string;
  };
}

/**
 * Batch certificate result
 */
export interface BatchCertificateResult {
  successful: CertificateUploadResult[];
  failed: Array<{
    certificateId: string;
    error: string;
  }>;
}

// ============================================================================
// API ROUTE TYPES
// ============================================================================

/**
 * Request body for upload-assets-pinata endpoint
 */
export interface UploadAssetsRequest {
  courseId: string;
  thumbnail: File;
  videos: File[];
  sectionIds: string[];
  courseName?: string;
}

/**
 * Response from upload-assets-pinata endpoint
 */
export interface UploadAssetsResponse {
  success: boolean;
  data?: {
    thumbnail: {
      cid: string;
      signedUrl: string;
      expiresAt: number;
    };
    videos: Array<{
      cid: string;
      signedUrl: string;
      expiresAt: number;
      sectionId: string;
      success: boolean;
      error?: string;
    }>;
  };
  error?: string;
  meta?: {
    timing: {
      totalDuration: number;
      thumbnailUpload: number;
      videoUploads: number;
      signedUrlGeneration: number;
    };
    counts: {
      videosTotal: number;
      videosSuccessful: number;
      videosFailed: number;
    };
  };
}

/**
 * Request for signed URL generation
 */
export interface SignedUrlRequest {
  cid?: string;
  cids?: string[];
  expires?: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Helper type to extract success data from response
 */
export type ExtractData<T> = T extends { success: true; data: infer D } ? D : never;

/**
 * Helper type to extract error from response
 */
export type ExtractError<T> = T extends { success: false; error: infer E } ? E : never;

/**
 * Type guard for success response
 */
export function isSuccessResponse(
  response: UploadResponse
): response is UploadSuccessResponse {
  return response.success === true;
}

/**
 * Type guard for error response
 */
export function isErrorResponse(
  response: UploadResponse
): response is UploadErrorResponse {
  return response.success === false;
}
