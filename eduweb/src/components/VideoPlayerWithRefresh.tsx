/**
 * Video Player Component with Auto-Refreshing Signed URLs
 *
 * This example demonstrates how to use the useSignedUrl hook
 * for seamless video playback without URL expiration issues.
 *
 * Features:
 * - Auto-refresh signed URLs before expiry
 * - Visual expiry countdown
 * - Manual refresh button
 * - Loading states
 * - Error handling
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTimeUntilExpiry, useSignedUrl } from '@/hooks/useSignedUrl';
import { Clock, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface VideoPlayerWithRefreshProps {
  videoCID: string;
  initialSignedUrl: string;
  expiresAt: number;
  title?: string;
}

export function VideoPlayerWithRefresh({
  videoCID,
  initialSignedUrl,
  expiresAt,
  title = 'Course Video',
}: VideoPlayerWithRefreshProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Use the signed URL hook for auto-refresh
  const {
    signedUrl,
    expiresAt: _currentExpiresAt,
    isRefreshing,
    refreshSignedUrl,
    timeUntilExpiry,
  } = useSignedUrl({
    cid: videoCID,
    initialSignedUrl,
    expiresAt,
    refreshThreshold: 60000, // Refresh 1 minute before expiry
  });

  // Calculate expiry status
  const isExpiringSoon = timeUntilExpiry > 0 && timeUntilExpiry < 300000; // 5 minutes
  const isExpired = timeUntilExpiry <= 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>

          {/* Expiry Status */}
          <div className="flex items-center gap-2 text-sm font-normal">
            <Clock className={`h-4 w-4 ${isExpired ? 'text-red-500' :
              isExpiringSoon ? 'text-yellow-500' :
                'text-green-500'
              }`} />
            <span className={
              isExpired ? 'text-red-500' :
                isExpiringSoon ? 'text-yellow-500' :
                  'text-muted-foreground'
            }>
              {isExpired ? 'Expired' : `Expires in ${formatTimeUntilExpiry(timeUntilExpiry)}`}
            </span>

            {/* Manual Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshSignedUrl}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Video Player */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            src={signedUrl}
            controls
            className="w-full h-full"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          >
            Your browser does not support the video tag.
          </video>

          {/* Refreshing Overlay */}
          {isRefreshing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-white">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Refreshing video URL...</p>
              </div>
            </div>
          )}

          {/* Expired Warning */}
          {isExpired && !isRefreshing && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-white p-6 text-center">
                <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Video URL Expired</h3>
                  <p className="text-sm text-gray-300 mt-1">
                    Click refresh to continue watching
                  </p>
                </div>
                <Button onClick={refreshSignedUrl} variant="secondary">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Video
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Video CID</p>
            <p className="font-mono text-xs break-all">{videoCID}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`} />
              <p className="font-medium">
                {isPlaying ? 'Playing' : 'Paused'}
              </p>
            </div>
          </div>
        </div>

        {/* Expiry Warning */}
        {isExpiringSoon && !isExpired && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
            <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm">URL Expiring Soon</p>
              <p className="text-xs text-muted-foreground mt-1">
                The video URL will auto-refresh in {formatTimeUntilExpiry(timeUntilExpiry - 60000)} to prevent interruption
              </p>
            </div>
          </div>
        )}

        {/* Refresh Success */}
        {isRefreshing && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            <p className="text-sm">Refreshing video URL...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Example usage in a course page:
 *
 * ```tsx
 * 'use client';
 *
 * import { VideoPlayerWithRefresh } from '@/components/VideoPlayerWithRefresh';
 *
 * export default function CourseLessonPage() {
 *   // Fetch course data (with signed URLs)
 *   const video = {
 *     cid: 'bafybeigbxztbxewqyddso76boh27p3ptlnnqz3rwwmg5pg2juoulb5t3tq',
 *     signedUrl: 'https://copper-far-firefly-220.mypinata.cloud/files/...',
 *     expiresAt: 1760292334758,
 *   };
 *
 *   return (
 *     <div className="container mx-auto py-8">
 *       <VideoPlayerWithRefresh
 *         videoCID={video.cid}
 *         initialSignedUrl={video.signedUrl}
 *         expiresAt={video.expiresAt}
 *         title="Lesson 1: Introduction to Web3"
 *       />
 *     </div>
 *   );
 * }
 * ```
 */

/**
 * Simple Video Player (No Auto-Refresh)
 *
 * For short-term use cases where videos are viewed within the expiry period
 */
interface SimpleVideoPlayerProps {
  src: string;
  title?: string;
}

export function SimpleVideoPlayer({ src, title }: SimpleVideoPlayerProps) {
  return (
    <Card className="w-full">
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          <video src={src} controls className="w-full h-full">
            Your browser does not support the video tag.
          </video>
        </div>
      </CardContent>
    </Card>
  );
}
