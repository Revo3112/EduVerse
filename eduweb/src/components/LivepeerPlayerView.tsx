"use client";

import { Button } from "@/components/ui/button";
import { getVideoRenditions } from "@/lib/livepeer-helpers";
import { Src } from "@livepeer/core/media";
import * as Player from "@livepeer/react/player";
import {
  AlertCircle,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  RefreshCw,
  Settings,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface VideoQuality {
  label: string;
  height: number;
  url: string;
  type: "MP4" | "HLS";
}

interface LivepeerPlayerViewProps {
  playbackId: string;
  onProgressUpdate: (time: number) => void;
  onComplete?: () => void;
  chapters?: { title: string; startTime: number; endTime: number }[];
}

/**
 * Livepeer Player Component with Custom Controls
 *
 * Uses Livepeer Player primitives with custom UI matching existing design.
 * Fetches playback info from API route and handles HLS/MP4 sources.
 *
 * @param playbackId - Livepeer playback ID (16 char hex string)
 * @param onProgressUpdate - Callback for progress tracking (called every second)
 * @param chapters - Optional chapter markers for video navigation
 */
export function LivepeerPlayerView({
  playbackId,
  onProgressUpdate,
  onComplete,
  chapters = [],
}: LivepeerPlayerViewProps) {
  const playerRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Playback state
  const [src, setSrc] = useState<Src[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [playbackInfo, setPlaybackInfo] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingCheckCount, setProcessingCheckCount] = useState(0);

  // Player state
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hoverTime, setHoverTime] = useState<number | null>(null); // For progress bar hover tooltip
  const [showHoverTooltip, setShowHoverTooltip] = useState(false);

  // Quality selector state
  const [availableQualities, setAvailableQualities] = useState<VideoQuality[]>(
    []
  );
  const [currentQuality, setCurrentQuality] = useState<string>("Auto");
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Fetch playback source using official Livepeer SDK (via server action)
  useEffect(() => {
    async function fetchPlaybackSource() {
      setLoading(true);
      setError(null);

      try {
        console.log(
          "[Livepeer Player] Fetching playback source for:",
          playbackId
        );

        // Use server action to fetch source with official getSrc()
        const { getLivepeerSource } = await import("@/app/actions/livepeer");
        const result = await getLivepeerSource(playbackId);

        if (!result.success || !result.src) {
          throw new Error(result.error || "Failed to fetch playback source");
        }

        console.log("[Livepeer Player] Source received:", {
          sourceCount: result.src.length,
          types: result.src.map((s) => s.type).join(", "),
        });

        // Check if video is still processing
        // Processing state is determined by missing HLS renditions
        const processing =
          result.playbackInfo?.meta?.source?.some(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (s: any) => s.hrn === "HLS" && !s.url
          ) ?? false;

        setIsProcessing(processing);

        if (processing) {
          console.log("[Livepeer Player] Video is still processing");
          // Player will show processing message
        }

        // Set source (already in correct Src[] format from getSrc())
        setSrc(result.src);
        setPlaybackInfo(result.playbackInfo);

        // Parse available quality options from playback info
        const renditions = getVideoRenditions(result.playbackInfo);
        console.log("[Livepeer Player] Available renditions:", renditions);
        setAvailableQualities(renditions);

        // Set default quality to Auto (HLS) if available
        const hlsQuality = renditions.find((r) => r.type === "HLS");
        if (hlsQuality) {
          setCurrentQuality(hlsQuality.label);
        } else if (renditions.length > 0) {
          setCurrentQuality(renditions[renditions.length - 1].label);
        }

        console.log("[Livepeer Player] Player initialized successfully");
      } catch (err) {
        console.error("[Livepeer Player] Error:", err);

        // Enhanced error messages
        let errorMessage = "Failed to load video";
        if (err instanceof Error) {
          if (
            err.message.includes("Failed to fetch") ||
            err.message.includes("fetch")
          ) {
            errorMessage =
              "Network error. Please check your connection and try again.";
          } else if (err.message.includes("processing")) {
            errorMessage =
              "Video is being processed. Please wait a moment and refresh.";
          } else {
            errorMessage = err.message;
          }
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchPlaybackSource();
  }, [playbackId]);

  // Poll for processing completion
  useEffect(() => {
    if (!isProcessing || processingCheckCount >= 20) return; // Stop after 20 checks (~2 minutes)

    const pollInterval = setInterval(async () => {
      try {
        console.log("[Livepeer Player] Checking processing status...");

        // Re-fetch source to check if processing is complete
        const { getLivepeerSource } = await import("@/app/actions/livepeer");
        const result = await getLivepeerSource(playbackId);

        if (result.success && result.src) {
          // Check if HLS renditions are now available
          const stillProcessing =
            result.playbackInfo?.meta?.source?.some(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (s: any) => s.hrn === "HLS" && !s.url
            ) ?? false;

          if (!stillProcessing) {
            console.log(
              "[Livepeer Player] Processing complete! Updating renditions..."
            );
            setIsProcessing(false);

            // Update with new transcoded renditions
            const renditions = getVideoRenditions(result.playbackInfo);
            setAvailableQualities(renditions);
            setPlaybackInfo(result.playbackInfo);
            setSrc(result.src);

            // Switch to HLS if now available
            const hlsQuality = renditions.find((r) => r.type === "HLS");
            if (hlsQuality) {
              setCurrentQuality(hlsQuality.label);
            }
          } else {
            setProcessingCheckCount((prev) => prev + 1);
          }
        }
      } catch (err) {
        console.error(
          "[Livepeer Player] Error checking processing status:",
          err
        );
      }
    }, 6000); // Check every 6 seconds

    return () => clearInterval(pollInterval);
  }, [isProcessing, processingCheckCount, playbackId]);

  // Attach video event listeners
  useEffect(() => {
    const video = playerRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      const currentTime = Math.floor(video.currentTime);
      setTime(currentTime);
      onProgressUpdate(currentTime);

      // Trigger completion callback at 95% progress
      if (onComplete && video.duration > 0) {
        const progressPercent = (currentTime / video.duration) * 100;
        if (progressPercent >= 95) {
          onComplete();
        }
      }
    };

    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);

    const handleVolumeChange = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("volumechange", handleVolumeChange);

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("volumechange", handleVolumeChange);
    };
  }, [onProgressUpdate, onComplete]);

  // Format time as MM:SS for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Progress bar percentage for custom displays
  const progressPercent = duration ? (time / duration) * 100 : 0;

  // Seek to specific time
  const seekTo = (seconds: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = Math.max(0, Math.min(seconds, duration));
    }
  };

  // Switch video quality
  const switchQuality = (quality: VideoQuality) => {
    console.log("[Livepeer Player] Quality switching:", quality.label);

    // Livepeer Player handles quality switching automatically via VideoQualitySelect
    // This is kept for UI state management only
    setCurrentQuality(quality.label);
    setShowQualityMenu(false);

    // Note: Livepeer Player handles quality switching internally
    // The VideoQualitySelect component manages HLS and MP4 renditions
    // Manual quality switching would require using their primitives
  };

  // Toggle play/pause - Available for custom controls
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const togglePlay = () => {
    if (playerRef.current) {
      if (playing) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
    }
  };

  // Toggle mute - Available for custom controls
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleMute = () => {
    if (playerRef.current) {
      playerRef.current.muted = !playerRef.current.muted;
    }
  };

  // Set volume - Available for custom controls
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleVolumeChange = (newVolume: number) => {
    if (playerRef.current) {
      playerRef.current.volume = newVolume;
    }
  };

  // Toggle fullscreen - Available for custom controls
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleFullscreen = async () => {
    if (!wrapRef.current) return;

    try {
      if (!fullscreen) {
        await wrapRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Auto-hide controls when playing
  useEffect(() => {
    if (!playing) return;

    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [playing, showControls]);

  // Loading state
  if (loading) {
    return (
      <div className="relative aspect-video bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="flex flex-col items-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mb-4 text-red-500" />
          <p className="text-base font-medium">Loading video...</p>
          <p className="text-xs text-gray-400 mt-2">
            Fetching playback information
          </p>
        </div>
        {/* Skeleton pulse effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"></div>
      </div>
    );
  }

  // Error state
  if (error || !src) {
    return (
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <div className="flex flex-col items-center text-white p-6 max-w-md">
          <AlertCircle className="h-14 w-14 text-red-500 mb-4" />
          <p className="text-xl font-semibold mb-3">Failed to Load Video</p>
          <p className="text-sm text-gray-300 text-center mb-6 leading-relaxed">
            {error || "Unknown error occurred"}
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setLoading(true);
                setError(null);
                window.location.reload();
              }}
              variant="default"
              className="bg-red-600 hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button onClick={() => window.history.back()} variant="secondary">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main player
  return (
    <div
      ref={wrapRef}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => playing && setShowControls(false)}
      className={`relative bg-black rounded-lg overflow-hidden shadow-lg ${
        fullscreen ? "fixed inset-0 z-50 rounded-none" : ""
      }`}
    >
      <div className={`relative ${fullscreen ? "h-full" : "aspect-video"}`}>
        <Player.Root src={src} autoPlay={false}>
          <Player.Container className="h-full w-full overflow-hidden bg-black outline-none transition">
            <Player.Video
              ref={playerRef}
              title={playbackId}
              className={`w-full h-full object-contain`}
            />

            {/* Livepeer Loading Indicator */}
            <Player.LoadingIndicator className="w-full relative h-full bg-black/50 backdrop-blur data-[visible=true]:animate-in data-[visible=false]:animate-out data-[visible=false]:fade-out-0 data-[visible=true]:fade-in-0">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            </Player.LoadingIndicator>

            {/* Livepeer Error Indicator */}
            <Player.ErrorIndicator
              matcher="all"
              className="absolute select-none inset-0 text-center bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center gap-4"
            >
              <div className="flex flex-col gap-3 items-center">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <div className="text-lg font-bold text-white">
                  Failed to load video
                </div>
                <div className="text-sm text-gray-300">
                  Please try refreshing the page
                </div>
              </div>
            </Player.ErrorIndicator>

            {/* Processing Indicator Banner */}
            {isProcessing && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-600/95 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 z-10 animate-pulse">
                <Loader2 className="h-5 w-5 animate-spin" />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">
                    Video Processing
                  </span>
                  <span className="text-xs text-yellow-100">
                    Higher quality versions are being generated. Video will
                    improve automatically.
                  </span>
                </div>
              </div>
            )}

            {/* Video Info Overlay - Shows playback info and stats */}
            {showControls && playbackInfo && (
              <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs space-y-1 z-10">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Progress:</span>
                  <span className="font-mono">
                    {Math.round(progressPercent)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Time:</span>
                  <span className="font-mono">
                    {formatTime(time)} / {formatTime(duration)}
                  </span>
                </div>
                {!muted && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Volume:</span>
                    <span className="font-mono">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                )}
                {muted && (
                  <div className="flex items-center gap-2 text-yellow-400">
                    <VolumeX className="h-3 w-3" />
                    <span>Muted</span>
                  </div>
                )}
              </div>
            )}

            {/* Center Play/Pause Button - Using Livepeer Primitives */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Player.PlayPauseTrigger
                className={`pointer-events-auto h-20 w-20 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all duration-200 flex items-center justify-center ${
                  playing && !showControls ? "opacity-0" : "opacity-100"
                }`}
              >
                <Player.PlayingIndicator asChild matcher={false}>
                  <Play className="h-10 w-10 ml-1" />
                </Player.PlayingIndicator>
                <Player.PlayingIndicator asChild>
                  <Pause className="h-10 w-10" />
                </Player.PlayingIndicator>
              </Player.PlayPauseTrigger>
            </div>

            {/* Custom Controls Overlay */}
            {showControls && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4 z-20">
                {/* Progress Bar - Using Livepeer Seek Primitive */}
                <div className="relative w-full mb-4">
                  <Player.Seek
                    className="relative group flex cursor-pointer items-center select-none touch-none w-full h-6"
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const percentage = x / rect.width;
                      const targetTime = percentage * duration;
                      setHoverTime(targetTime);
                      setShowHoverTooltip(true);
                    }}
                    onMouseLeave={() => {
                      setShowHoverTooltip(false);
                      setHoverTime(null);
                    }}
                  >
                    <Player.Track className="bg-white/30 relative grow rounded-full h-2 group-hover:h-3 transition-all">
                      <Player.SeekBuffer className="absolute bg-white/20 transition duration-1000 rounded-full h-full" />
                      <Player.Range className="absolute bg-red-500 rounded-full h-full" />
                    </Player.Track>
                    <Player.Thumb className="block w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg group-hover:scale-110 transition-transform" />
                  </Player.Seek>

                  {/* Hover Time Tooltip */}
                  {showHoverTooltip && hoverTime !== null && (
                    <div
                      className="absolute -top-8 bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none"
                      style={{
                        left: `${(hoverTime / duration) * 100}%`,
                        transform: "translateX(-50%)",
                      }}
                    >
                      {formatTime(hoverTime)}
                    </div>
                  )}
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    {/* Play/Pause - Livepeer Primitive */}
                    <Player.PlayPauseTrigger className="text-white hover:bg-white/20 p-2 rounded-md transition-colors">
                      <Player.PlayingIndicator asChild matcher={false}>
                        <Play className="h-5 w-5" />
                      </Player.PlayingIndicator>
                      <Player.PlayingIndicator asChild>
                        <Pause className="h-5 w-5" />
                      </Player.PlayingIndicator>
                    </Player.PlayPauseTrigger>

                    {/* Skip Backward */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => seekTo(time - 10)}
                      className="text-white hover:bg-white/20 p-2"
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>

                    {/* Skip Forward */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => seekTo(time + 10)}
                      className="text-white hover:bg-white/20 p-2"
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>

                    {/* Volume Controls - Livepeer Primitives */}
                    <div className="flex items-center gap-2">
                      <Player.MuteTrigger className="text-white hover:bg-white/20 p-2 rounded-md transition-colors">
                        <Player.VolumeIndicator asChild matcher={false}>
                          <Volume2 className="h-4 w-4" />
                        </Player.VolumeIndicator>
                        <Player.VolumeIndicator asChild matcher={true}>
                          <VolumeX className="h-4 w-4" />
                        </Player.VolumeIndicator>
                      </Player.MuteTrigger>
                      <Player.Volume className="relative flex-1 group flex cursor-pointer items-center select-none touch-none w-20 h-5">
                        <Player.Track className="bg-white/30 relative grow rounded-full h-2 group-hover:h-3 transition-all">
                          <Player.Range className="absolute bg-white rounded-full h-full" />
                        </Player.Track>
                        <Player.Thumb className="block w-3 h-3 bg-white rounded-full transition group-hover:scale-110" />
                      </Player.Volume>
                    </div>

                    {/* Time Display - Livepeer Primitive */}
                    <Player.Time className="text-sm font-mono tabular-nums select-none" />
                  </div>

                  {/* Right Controls */}
                  <div className="flex items-center gap-2">
                    {/* Quality Selector */}
                    {availableQualities.length > 0 && (
                      <div className="relative">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowQualityMenu(!showQualityMenu)}
                          className="text-white hover:bg-white/20 p-2"
                          title="Quality"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>

                        {/* Quality Dropdown Menu */}
                        {showQualityMenu && (
                          <div className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded-lg shadow-xl border border-gray-700 overflow-hidden min-w-[140px]">
                            <div className="px-3 py-2 text-xs font-semibold text-gray-400 border-b border-gray-700">
                              Quality
                            </div>
                            <div className="py-1">
                              {availableQualities.map((quality, index) => (
                                <button
                                  key={`${quality.type}-${quality.label}-${index}`}
                                  onClick={() => switchQuality(quality)}
                                  className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-800 transition-colors flex items-center justify-between ${
                                    currentQuality === quality.label
                                      ? "bg-gray-800 text-white font-semibold"
                                      : "text-gray-300"
                                  }`}
                                >
                                  <span>{quality.label}</span>
                                  {currentQuality === quality.label && (
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Fullscreen Toggle - Livepeer Primitive */}
                    <Player.FullscreenTrigger className="text-white hover:bg-white/20 p-2 rounded-md transition-colors">
                      <Player.FullscreenIndicator asChild>
                        <Minimize className="h-4 w-4" />
                      </Player.FullscreenIndicator>
                      <Player.FullscreenIndicator asChild matcher={false}>
                        <Maximize className="h-4 w-4" />
                      </Player.FullscreenIndicator>
                    </Player.FullscreenTrigger>
                  </div>
                </div>
              </div>
            )}
          </Player.Container>
        </Player.Root>
      </div>

      {/* Chapter Markers */}
      {showControls && chapters.length > 0 && !fullscreen && (
        <div className="bg-gray-900 text-white p-4 border-t border-gray-700">
          <div className="text-sm text-gray-300 mb-2">Chapters</div>
          <div className="flex flex-wrap gap-2">
            {chapters.map((chapter, index) => (
              <Button
                key={index}
                size="sm"
                variant="outline"
                onClick={() => seekTo(chapter.startTime)}
                className="text-xs bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                {chapter.title}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
