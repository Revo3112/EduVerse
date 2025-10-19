"use client";

import { Button } from "@/components/ui/button";
import { formatTimeUntilExpiry, getSignedUrlForCID, isSignedUrlExpired } from "@/lib/ipfs-helpers";
import { EnrichedCourseSection, SectionProgress } from "@/lib/mock-data";
import {
  AlertCircle,
  Clock,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  RefreshCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

/* ---------- helpers ---------- */
const fmtTime = (s: number) =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(s % 60)
      .toString()
      .padStart(2, "0")}`;

interface LegacyVideoPlayerProps {
  section: EnrichedCourseSection;
  progress: SectionProgress | null;
  onProgressUpdate: (pos: number) => void;
}

/**
 * Legacy Video Player for Pinata IPFS Content
 *
 * This player handles existing courses with IPFS CIDs stored in Pinata.
 * Features:
 * - Signed URL fetching and auto-refresh
 * - Custom controls with skip forward/backward
 * - Progress tracking
 * - Chapter markers
 * - Fullscreen support
 *
 * Used for backward compatibility with existing courses.
 * New courses should use Livepeer Player (detected automatically by HybridVideoPlayer).
 */
export function LegacyVideoPlayer({ section, onProgressUpdate }: LegacyVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fs, setFs] = useState(false);
  const [show, setShow] = useState(true);
  const [loading, setLoading] = useState(true);

  // Signed URL state
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [fetchingUrl, setFetchingUrl] = useState(true);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Fetch signed URL for private IPFS content
  useEffect(() => {
    async function fetchSignedUrl() {
      if (!section.contentCID) {
        setUrlError('No content CID available');
        setFetchingUrl(false);
        return;
      }

      try {
        setFetchingUrl(true);
        setUrlError(null);
        console.log('[Legacy Video Player] Fetching signed URL for CID:', section.contentCID);

        const result = await getSignedUrlForCID(section.contentCID, 7200); // 2 hours
        setSignedUrl(result.signedUrl);
        setExpiresAt(result.expiresAt);
        console.log('[Legacy Video Player] Signed URL fetched successfully');
      } catch (error) {
        console.error('[Legacy Video Player] Error fetching signed URL:', error);
        setUrlError(error instanceof Error ? error.message : 'Failed to load video');
      } finally {
        setFetchingUrl(false);
      }
    }

    fetchSignedUrl();
  }, [section.contentCID]);

  // Auto-refresh URL before expiry
  useEffect(() => {
    if (!signedUrl || !expiresAt) return;

    const checkInterval = setInterval(() => {
      const timeUntilExpiry = expiresAt - Date.now();

      // Refresh 1 minute before expiry
      if (timeUntilExpiry > 0 && timeUntilExpiry < 60000) {
        console.log('[Legacy Video Player] Signed URL expiring soon, refreshing...');
        getSignedUrlForCID(section.contentCID, 7200)
          .then(result => {
            setSignedUrl(result.signedUrl);
            setExpiresAt(result.expiresAt);
            console.log('[Legacy Video Player] Signed URL refreshed');
          })
          .catch(error => {
            console.error('[Legacy Video Player] Error refreshing URL:', error);
            setUrlError('Failed to refresh video URL');
          });
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(checkInterval);
  }, [signedUrl, expiresAt, section.contentCID]);

  const src = signedUrl || undefined;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onData = () => {
      setLoading(false);
      setDur(v.duration);
      v.currentTime = 0;
    };
    const onTime = () => {
      const t = Math.floor(v.currentTime);
      setTime(t);
      onProgressUpdate(t);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onVol = () => {
      setVol(v.volume);
      setMuted(v.muted);
    };

    v.addEventListener("loadeddata", onData);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("volumechange", onVol);

    return () => {
      v.removeEventListener("loadeddata", onData);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("volumechange", onVol);
    };
  }, [onProgressUpdate, section.contentCID]);

  const togglePlay = () => (playing ? videoRef.current?.pause() : videoRef.current?.play());
  const seek = (s: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(s, dur));
  };
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
  };
  const setVolume = (v: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = v;
  };
  const toggleFs = async () => {
    if (!wrapRef.current) return;
    try {
      if (!fs) await wrapRef.current.requestFullscreen();
      else await document.exitFullscreen();
    } catch { }
  };

  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => playing && setShow(false), 3000);
    return () => clearTimeout(t);
  }, [playing]);

  const pct = dur ? (time / dur) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      onMouseMove={() => setShow(true)}
      onMouseLeave={() => playing && setShow(false)}
      className={`relative bg-black rounded-lg overflow-hidden shadow-lg ${fs ? "fixed inset-0 z-50 rounded-none" : ""}`}
    >
      <div className={`relative ${fs ? "h-full" : "aspect-video"}`}>
        <video ref={videoRef} src={src} className={`w-full ${fs ? "h-full" : "h-full"} object-cover`} preload="metadata" />

        {/* Fetching Signed URL */}
        {fetchingUrl && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white">
            <Loader2 className="h-10 w-10 animate-spin mb-3" />
            <p className="text-sm">Loading secure video link...</p>
            <p className="text-xs text-gray-400 mt-1">Generating signed URL</p>
          </div>
        )}

        {/* URL Error */}
        {urlError && !fetchingUrl && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white p-6">
            <AlertCircle className="h-12 w-12 text-red-500 mb-3" />
            <p className="text-lg font-semibold mb-2">Failed to Load Video</p>
            <p className="text-sm text-gray-300 text-center mb-4">{urlError}</p>
            <Button
              onClick={async () => {
                setFetchingUrl(true);
                setUrlError(null);
                try {
                  const result = await getSignedUrlForCID(section.contentCID, 7200);
                  setSignedUrl(result.signedUrl);
                  setExpiresAt(result.expiresAt);
                } catch (error) {
                  setUrlError(error instanceof Error ? error.message : 'Failed to load video');
                } finally {
                  setFetchingUrl(false);
                }
              }}
              variant="secondary"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {/* Video Loading */}
        {loading && !fetchingUrl && !urlError && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
            <RefreshCw className="h-8 w-8 animate-spin mb-2" />
            <p className="text-sm">Loading video…</p>
          </div>
        )}

        {/* URL Expiry Warning */}
        {!fetchingUrl && !urlError && expiresAt > 0 && isSignedUrlExpired(expiresAt) && (
          <div className="absolute top-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Video URL expired - refreshing...</span>
          </div>
        )}

        {!loading && !fetchingUrl && !urlError && (
          <div onClick={togglePlay} className="absolute inset-0 flex items-center justify-center cursor-pointer">
            <Button
              size="lg"
              variant="ghost"
              className={`h-20 w-20 rounded-full bg-black/30 hover:bg-black/50 text-white transition-opacity ${playing && !show ? "opacity-0" : "opacity-100"}`}
            >
              {playing ? <Pause className="h-10 w-10" /> : <Play className="h-10 w-10 ml-1" />}
            </Button>
          </div>
        )}

        {show && !loading && !fetchingUrl && !urlError && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4">
            <div className="h-2 bg-white/30 rounded cursor-pointer relative group" onClick={(e) => seek((e.nativeEvent.offsetX / e.currentTarget.clientWidth) * dur)}>
              <div className="h-full bg-red-500 rounded" style={{ width: `${pct}%` }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg group-hover:scale-110 transition-transform" style={{ left: `${pct}%`, marginLeft: -8 }} />
            </div>
            <div className="flex items-center justify-between text-white mt-4">
              <div className="flex items-center gap-3">
                <Button size="sm" variant="ghost" onClick={togglePlay} className="text-white hover:bg-white/20 p-2">
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => seek(time - 10)} className="text-white hover:bg-white/20 p-2">
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => seek(time + 10)} className="text-white hover:bg-white/20 p-2">
                  <SkipForward className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={toggleMute} className="text-white hover:bg-white/20 p-2">
                    {muted || !vol ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                  <input type="range" min={0} max={1} step={0.1} value={muted ? 0 : vol} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-20 accent-red-500" />
                </div>
                <div className="text-sm font-mono">{fmtTime(time)} / {fmtTime(dur)}</div>

                {/* URL Expiry Timer */}
                {expiresAt > 0 && (
                  <div className="ml-3 px-3 py-1 bg-white/10 rounded-full text-xs font-medium flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>URL: {formatTimeUntilExpiry(expiresAt)}</span>
                  </div>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={toggleFs} className="text-white hover:bg-white/20 p-2">{fs ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>
      {show && section.videoMetadata.chapters.length > 0 && !fs && (
        <div className="bg-gray-900 text-white p-4 border-t border-gray-700">
          <div className="text-sm text-gray-300 mb-2">Chapters</div>
          <div className="flex flex-wrap gap-2">
            {section.videoMetadata.chapters.map((c, i) => (
              <Button key={i} size="sm" variant="outline" onClick={() => seek(c.startTime)} className="text-xs bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700">
                {c.title}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
