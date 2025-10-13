/**
 * @fileoverview Course Upload Progress Modal
 * @description Sophisticated loading UI for course asset IPFS uploads with real-time status
 * @author EduVerse Platform
 * @date 2025-01-12
 *
 * This component provides a comprehensive user experience during the course publishing
 * workflow. It displays real-time progress for thumbnail and video uploads to IPFS,
 * preventing users from assuming the application has frozen during long upload operations.
 *
 * Features:
 * - Step-by-step progress visualization
 * - Individual file upload status
 * - Animated progress bars
 * - Error handling with retry options
 * - Success confirmation
 *
 * Uses Shadcn UI components for consistent design language
 */

'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle,
  FileCheck,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Upload,
  Video,
} from 'lucide-react';

/**
 * Upload stage enumeration
 */
export enum UploadStage {
  IDLE = 'IDLE',
  UPLOADING_THUMBNAIL = 'UPLOADING_THUMBNAIL',
  UPLOADING_VIDEOS = 'UPLOADING_VIDEOS',
  FINALIZING = 'FINALIZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}

/**
 * Individual file upload status
 */
export interface FileUploadStatus {
  filename: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  cid?: string;
  error?: string;
}

/**
 * Component props
 */
export interface CourseUploadProgressProps {
  isOpen: boolean;
  stage: UploadStage;
  thumbnailStatus?: FileUploadStatus;
  videoStatuses?: FileUploadStatus[];
  currentVideoIndex?: number;
  totalVideos?: number;
  onClose?: () => void;
  error?: string;
}

/**
 * Course Upload Progress Modal Component
 *
 * @example
 * ```tsx
 * <CourseUploadProgress
 *   isOpen={isUploading}
 *   stage={uploadStage}
 *   thumbnailStatus={thumbnailStatus}
 *   videoStatuses={videoStatuses}
 *   currentVideoIndex={currentVideoIndex}
 *   totalVideos={sections.length}
 * />
 * ```
 */
export function CourseUploadProgress({
  isOpen,
  stage,
  thumbnailStatus,
  videoStatuses = [],
  currentVideoIndex = 0,
  totalVideos = 0,
  onClose,
  error,
}: CourseUploadProgressProps) {
  // Calculate overall progress
  const calculateOverallProgress = (): number => {
    if (stage === UploadStage.IDLE) return 0;
    if (stage === UploadStage.COMPLETE) return 100;

    let progress = 0;
    const steps = 2 + (totalVideos > 0 ? 1 : 0); // Thumbnail + Videos + Finalize

    // Thumbnail progress (33% or 50% depending on whether there are videos)
    if (thumbnailStatus) {
      if (thumbnailStatus.status === 'completed') {
        progress += 100 / steps;
      } else if (thumbnailStatus.status === 'uploading') {
        progress += (thumbnailStatus.progress / 100) * (100 / steps);
      }
    }

    // Video progress
    if (totalVideos > 0) {
      const videoProgress = videoStatuses.reduce((sum, video) => {
        if (video.status === 'completed') return sum + 100;
        if (video.status === 'uploading') return sum + video.progress;
        return sum;
      }, 0);

      progress += (videoProgress / totalVideos) * (100 / steps);
    }

    return Math.min(Math.round(progress), 99); // Cap at 99% until fully complete
  };

  const overallProgress = calculateOverallProgress();

  // Get current stage description
  const getStageDescription = (): string => {
    switch (stage) {
      case UploadStage.UPLOADING_THUMBNAIL:
        return 'Uploading course thumbnail to IPFS...';
      case UploadStage.UPLOADING_VIDEOS:
        return `Uploading section videos to IPFS (${currentVideoIndex + 1} of ${totalVideos})...`;
      case UploadStage.FINALIZING:
        return 'Finalizing upload and preparing course data...';
      case UploadStage.COMPLETE:
        return 'Upload completed successfully!';
      case UploadStage.ERROR:
        return 'Upload failed. Please try again.';
      default:
        return 'Preparing upload...';
    }
  };

  // Get stage icon
  const getStageIcon = () => {
    switch (stage) {
      case UploadStage.UPLOADING_THUMBNAIL:
        return <ImageIcon className="h-5 w-5 text-blue-600 animate-pulse" />;
      case UploadStage.UPLOADING_VIDEOS:
        return <Video className="h-5 w-5 text-purple-600 animate-pulse" />;
      case UploadStage.FINALIZING:
        return <FileCheck className="h-5 w-5 text-green-600 animate-pulse" />;
      case UploadStage.COMPLETE:
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case UploadStage.ERROR:
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Upload className="h-5 w-5 text-gray-600 animate-pulse" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={stage === UploadStage.COMPLETE || stage === UploadStage.ERROR ? onClose : undefined}>
      <DialogContent className="sm:max-w-[600px]" onInteractOutside={(e) => {
        // Prevent closing during upload
        if (stage !== UploadStage.COMPLETE && stage !== UploadStage.ERROR) {
          e.preventDefault();
        }
      }}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">
                {stage === UploadStage.COMPLETE ? 'Upload Complete!' : 'Publishing Course'}
              </DialogTitle>
              <DialogDescription className="text-sm">
                Uploading assets to IPFS - Do not close this window
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Overall Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStageIcon()}
                <span className="text-sm font-medium text-foreground">
                  {getStageDescription()}
                </span>
              </div>
              <span className="text-sm font-bold text-blue-600">
                {overallProgress}%
              </span>
            </div>

            <Progress value={overallProgress} className="h-2" />

            {stage === UploadStage.UPLOADING_VIDEOS && totalVideos > 0 && (
              <p className="text-xs text-muted-foreground">
                Processing video {currentVideoIndex + 1} of {totalVideos}
              </p>
            )}
          </div>

          {/* Error Message */}
          {stage === UploadStage.ERROR && error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900 dark:text-red-100">
                    Upload Failed
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Thumbnail Status */}
          {thumbnailStatus && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Course Thumbnail
              </h4>

              <FileUploadItem
                filename={thumbnailStatus.filename}
                progress={thumbnailStatus.progress}
                status={thumbnailStatus.status}
                cid={thumbnailStatus.cid}
                error={thumbnailStatus.error}
              />
            </div>
          )}

          {/* Video Statuses */}
          {videoStatuses.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Video className="h-4 w-4" />
                Section Videos ({videoStatuses.filter(v => v.status === 'completed').length}/{videoStatuses.length})
              </h4>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {videoStatuses.map((video, index) => (
                  <FileUploadItem
                    key={index}
                    filename={video.filename}
                    progress={video.progress}
                    status={video.status}
                    cid={video.cid}
                    error={video.error}
                    index={index + 1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Success Message */}
          {stage === UploadStage.COMPLETE && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-green-900 dark:text-green-100">
                    All Assets Uploaded Successfully
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Your course assets have been securely stored on IPFS. You can now proceed with the blockchain transaction.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Individual File Upload Item Component
 */
interface FileUploadItemProps {
  filename: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  cid?: string;
  error?: string;
  index?: number;
}

function FileUploadItem({
  filename,
  progress,
  status,
  cid,
  error,
  index,
}: FileUploadItemProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  // const _getStatusColor = () => {
  //   switch (status) {
  //     case 'completed':
  //       return 'text-green-600';
  //     case 'uploading':
  //       return 'text-blue-600';
  //     case 'error':
  //       return 'text-red-600';
  //     default:
  //       return 'text-gray-500';
  //   }
  // };

  return (
    <div className={cn(
      'bg-muted/50 rounded-lg p-3 border transition-all',
      status === 'uploading' && 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20',
      status === 'completed' && 'border-green-200 dark:border-green-800',
      status === 'error' && 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
    )}>
      <div className="flex items-center gap-3">
        {getStatusIcon()}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground truncate">
              {index && `${index}. `}{filename}
            </p>
            {status === 'uploading' && (
              <span className="text-xs font-semibold text-blue-600">
                {progress}%
              </span>
            )}
          </div>

          {status === 'uploading' && (
            <Progress value={progress} className="h-1 mt-2" />
          )}

          {status === 'completed' && cid && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              CID: {cid}
            </p>
          )}

          {status === 'error' && error && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
