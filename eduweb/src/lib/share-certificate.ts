export interface ShareCertificateOptions {
  certificateImageUrl: string;
  tokenId: string;
  studentName: string;
  platformName: string;
  totalCoursesCompleted: number;
  verificationUrl: string;
}

export async function shareCertificateImage(
  options: ShareCertificateOptions
): Promise<{ success: boolean; error?: string }> {
  const {
    certificateImageUrl,
    tokenId,
    studentName,
    platformName,
    totalCoursesCompleted,
    verificationUrl,
  } = options;

  try {
    console.log("[ShareCertificate] Fetching image from:", certificateImageUrl);
    const response = await fetch(certificateImageUrl);
    console.log("[ShareCertificate] Fetch response status:", response.status);

    if (!response.ok) {
      throw new Error("Failed to fetch certificate image");
    }

    const blob = await response.blob();
    console.log("[ShareCertificate] Blob size:", blob.size, "bytes");
    console.log("[ShareCertificate] Blob type:", blob.type);

    const file = new File([blob], `certificate-${tokenId}.png`, {
      type: "image/png",
    });
    console.log("[ShareCertificate] File created:", file.name);

    const canShareFiles =
      navigator.canShare && navigator.canShare({ files: [file] });
    console.log("[ShareCertificate] Can share files:", canShareFiles);
    console.log(
      "[ShareCertificate] Navigator.share available:",
      !!navigator.share
    );

    if (canShareFiles) {
      console.log("[ShareCertificate] Using Web Share API with files");
      await navigator.share({
        title: `${studentName}'s Certificate - ${platformName}`,
        text: `My blockchain-verified certificate with ${totalCoursesCompleted} completed courses!`,
        files: [file],
      });
      console.log("[ShareCertificate] ✅ Share with files successful");
      return { success: true };
    } else if (navigator.share) {
      console.log(
        "[ShareCertificate] Using Web Share API with URL (files not supported)"
      );
      await navigator.share({
        title: `${studentName}'s Certificate - ${platformName}`,
        text: `View my blockchain-verified certificate with ${totalCoursesCompleted} completed courses!`,
        url: verificationUrl,
      });
      console.log("[ShareCertificate] ✅ Share with URL successful");
      return { success: true };
    } else {
      console.log(
        "[ShareCertificate] Web Share API not available, triggering direct download"
      );
      const link = document.createElement("a");
      link.href = certificateImageUrl;
      link.download = `certificate-${tokenId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log("[ShareCertificate] ✅ Direct download triggered");
      return { success: true };
    }
  } catch (error) {
    console.error("[ShareCertificate] ❌ Error:", error);

    try {
      if (navigator.clipboard) {
        console.log(
          "[ShareCertificate] Attempting to copy verification link to clipboard"
        );
        await navigator.clipboard.writeText(verificationUrl);
        console.log(
          "[ShareCertificate] ✅ Verification link copied to clipboard"
        );
        return {
          success: false,
          error:
            "Failed to share image. Verification link copied to clipboard!",
        };
      }
    } catch (clipboardError) {
      console.error("[ShareCertificate] ❌ Clipboard error:", clipboardError);
    }

    return {
      success: false,
      error: "Failed to share certificate. Please try again.",
    };
  }
}

export async function downloadCertificateImage(
  certificateImageUrl: string,
  tokenId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(
      "[DownloadCertificate] Fetching image from:",
      certificateImageUrl
    );
    const response = await fetch(certificateImageUrl);
    console.log(
      "[DownloadCertificate] Fetch response status:",
      response.status
    );

    if (!response.ok) {
      throw new Error("Failed to fetch certificate image");
    }

    const blob = await response.blob();
    console.log("[DownloadCertificate] Blob size:", blob.size, "bytes");
    console.log("[DownloadCertificate] Blob type:", blob.type);

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `certificate-${tokenId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log("[DownloadCertificate] ✅ Download successful");
    return { success: true };
  } catch (error) {
    console.error("[DownloadCertificate] ❌ Error:", error);
    return {
      success: false,
      error: "Failed to download certificate image. Please try again.",
    };
  }
}
