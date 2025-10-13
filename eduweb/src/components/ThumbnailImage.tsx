import { useThumbnailUrl } from '@/hooks/useThumbnailUrl';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

interface ThumbnailImageProps {
  cid: string | undefined;
  alt: string;
  fallback?: React.ReactNode;
  className?: string;
  sizes?: string;
}

/**
 * ThumbnailImage Component
 *
 * Renders course thumbnail from private Pinata IPFS with proper signed URL handling.
 *
 * IMPORTANT: For private files in Pinata, direct gateway URLs will return 403.
 * This component fetches a signed URL via pinata.gateways.private.createAccessLink()
 * to properly authenticate and display private IPFS content.
 *
 * @param cid - IPFS Content Identifier for the thumbnail
 * @param alt - Alt text for the image
 * @param fallback - Fallback content when CID is missing (optional)
 * @param className - Additional CSS classes (optional)
 * @param sizes - Responsive image sizes (optional)
 */
export function ThumbnailImage({
  cid,
  alt,
  fallback,
  className = "object-cover",
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
}: ThumbnailImageProps) {
  const { thumbnailUrl, loading, error } = useThumbnailUrl(cid);

  // Show fallback if no CID provided
  if (!cid) {
    return <>{fallback}</>;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show error state
  if (error || !thumbnailUrl) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Failed to load thumbnail</p>
      </div>
    );
  }

  // Render image with signed URL
  return (
    <Image
      src={thumbnailUrl}
      alt={alt}
      fill
      className={className}
      sizes={sizes}
      priority={false}
    />
  );
}
