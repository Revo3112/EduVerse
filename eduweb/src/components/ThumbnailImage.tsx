import { useThumbnailUrl } from "@/hooks/useThumbnailUrl";
import { Loader2, AlertCircle } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface ThumbnailImageProps {
  cid: string | undefined;
  alt: string;
  fallback?: React.ReactNode;
  className?: string;
  sizes?: string;
}

export function ThumbnailImage({
  cid,
  alt,
  fallback,
  className = "object-cover",
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
}: ThumbnailImageProps) {
  const { thumbnailUrl, loading, error } = useThumbnailUrl(cid);
  const [imageError, setImageError] = useState<string | null>(null);

  if (!cid) {
    return <>{fallback}</>;
  }

  if (loading) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !thumbnailUrl) {
    return (
      <div className="w-full h-full bg-muted flex flex-col items-center justify-center text-muted-foreground p-4">
        <AlertCircle className="w-8 h-8 mb-2 text-red-500" />
        <p className="text-sm text-center">Failed to load thumbnail</p>
        {error && (
          <p className="text-xs text-center mt-1 opacity-70">{error}</p>
        )}
      </div>
    );
  }

  if (imageError) {
    return (
      <div className="w-full h-full bg-muted flex flex-col items-center justify-center text-muted-foreground p-4">
        <AlertCircle className="w-8 h-8 mb-2 text-orange-500" />
        <p className="text-sm text-center">Image load failed</p>
        <p className="text-xs text-center mt-1 opacity-70">{imageError}</p>
      </div>
    );
  }

  return (
    <Image
      src={thumbnailUrl}
      alt={alt}
      fill
      className={className}
      sizes={sizes}
      priority={false}
      onError={() => {
        console.error("[ThumbnailImage] Image failed to load:", thumbnailUrl);
        setImageError("Network timeout or invalid image");
      }}
      onLoadingComplete={() => {
        console.log(
          "[ThumbnailImage] Image loaded successfully:",
          cid?.substring(0, 12)
        );
      }}
    />
  );
}
