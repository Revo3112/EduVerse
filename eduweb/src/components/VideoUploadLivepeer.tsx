"use client";

/**
 * Video Upload Component with Livepeer Integration
 *
 * Simple file-based upload to Livepeer via API routes
 * Automatically enables IPFS storage after upload completes
 *
 * @module components/VideoUploadLivepeer
 */

import { AlertCircle, CheckCircle2, FileVideo, Loader2, Trash2, Upload } from "lucide-react";
import { useCallback, useState } from "react";

export interface UploadResult {
  assetId: string;
  playbackId: string;
  ipfsCid: string;
  filename: string;
  duration?: number;
}

interface Props {
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: string) => void;
  maxSizeMB?: number;
  className?: string;
}

export default function VideoUploadLivepeer({
  onUploadComplete,
  onUploadError,
  maxSizeMB = 500,
  className = "",
}: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<string>("idle");
  const [result, setResult] = useState<UploadResult | null>(null);

  const validateFile = useCallback((file: File): string | null => {
    const validTypes = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/webm"];
    if (!validTypes.includes(file.type)) {
      return "Invalid format. Supported: MP4, MOV, AVI, MKV, WebM";
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File too large. Max: ${maxSizeMB}MB`;
    }
    return null;
  }, [maxSizeMB]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const err = validateFile(file);
    if (err) {
      setError(err);
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
    setPhase("idle");
    setResult(null);
  }, [validateFile]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    setPhase("uploading");
    setProgress(0);

    try {
      // Step 1: Upload video file to our API route
      const formData = new FormData();
      formData.append("video", selectedFile);

      setPhase("uploading");
      const uploadResponse = await fetch("/api/livepeer/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.message || "Upload failed");
      }

      const uploadData = await uploadResponse.json();

      setProgress(50);
      setPhase("processing");

      // Step 2: Enable IPFS storage
      const ipfsResponse = await fetch("/api/livepeer/enable-ipfs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: uploadData.assetId }),
      });

      if (!ipfsResponse.ok) {
        throw new Error("Failed to enable IPFS storage");
      }

      const ipfsData = await ipfsResponse.json();

      setProgress(100);
      setPhase("ready");

      const finalResult: UploadResult = {
        assetId: uploadData.assetId,
        playbackId: uploadData.playbackId,
        ipfsCid: ipfsData.ipfsCid,
        filename: selectedFile.name,
        duration: uploadData.duration,
      };

      setResult(finalResult);
      onUploadComplete?.(finalResult);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Upload failed";
      setError(errorMsg);
      setPhase("failed");
      onUploadError?.(errorMsg);
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, onUploadComplete, onUploadError]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    setPhase("idle");
    setProgress(0);
    setResult(null);
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`w-full max-w-2xl ${className}`}>
      {/* File Selector */}
      {!selectedFile && !result && (
        <label className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center gap-4 cursor-pointer hover:border-blue-500 transition-colors">
          <input
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="w-16 h-16 text-gray-400" />
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-700">Upload Video to Livepeer</p>
            <p className="text-sm text-gray-500 mt-2">Click to select or drag & drop</p>
            <p className="text-xs text-gray-400 mt-1">MP4, MOV, AVI, MKV, WebM • Max {maxSizeMB}MB</p>
          </div>
        </label>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Selected File */}
      {selectedFile && !isUploading && !result && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileVideo className="w-8 h-8 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatSize(selectedFile.size)}</p>
              </div>
            </div>
            <button onClick={handleReset} className="text-gray-500 hover:text-gray-700">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={handleUpload}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Start Upload to Livepeer
          </button>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="mt-4 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <div className="flex-1">
              <p className="font-semibold text-blue-600">
                {phase === "uploading" ? "Uploading to Livepeer..." : "Processing & enabling IPFS..."}
              </p>
              <p className="text-sm text-gray-500">{selectedFile?.name}</p>
            </div>
            <span className="text-2xl font-bold text-blue-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success Result */}
      {result && (
        <div className="mt-4 p-6 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">Upload Successful!</p>
              <p className="text-sm text-green-700">{result.filename}</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-t border-green-200">
              <span className="text-gray-600">Playback ID:</span>
              <span className="font-mono text-gray-900">{result.playbackId}</span>
            </div>
            <div className="flex justify-between py-2 border-t border-green-200">
              <span className="text-gray-600">IPFS CID:</span>
              <span className="font-mono text-gray-900 truncate max-w-xs">{result.ipfsCid}</span>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="mt-4 w-full bg-gray-600 text-white py-2 rounded-lg font-medium hover:bg-gray-700"
          >
            Upload Another Video
          </button>
        </div>
      )}
    </div>
  );
}
