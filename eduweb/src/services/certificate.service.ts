import type {
  CertificateData,
  ErrorCode,
  UploadErrorResponse,
  UploadSuccessResponse,
} from '@/lib/pinata-types';
import { createCanvas, loadImage, type CanvasRenderingContext2D } from 'canvas';
import QRCode from 'qrcode';
import sharp from 'sharp';
import {
  uploadFileToPrivateIPFS,
  uploadJSONToPrivateIPFS
} from './pinata-upload.service';

const TEMPLATE_URL = 'https://copper-far-firefly-220.mypinata.cloud/ipfs/bafybeiaibxpgjjcjr3dgfyhhg365rt47xl2nwwrnesr6zshpompucxgn3q';

const CANVAS_WIDTH = 6250;
const CANVAS_HEIGHT = 4419;

const QR_BASE_URL = 'https://verify.eduverse.com/certificate';

const NAME_POSITION = {
  x: CANVAS_WIDTH / 2,
  y: 1800,
  fontSize: 285,
  fontFamily: 'Serif',
  fontWeight: 'bold',
  color: '#2D1B4E',
  align: 'center' as const,
  shadowColor: 'rgba(0, 0, 0, 0.15)',
  shadowBlur: 20,
  shadowOffsetX: 4,
  shadowOffsetY: 4,
};

const DESCRIPTION_POSITION = {
  x: CANVAS_WIDTH / 2,
  y: 2210,
  fontSize: 85,
  fontFamily: 'Arial',
  color: '#4A4A4A',
  align: 'center' as const,
  maxWidth: 4275,
  lineHeight: 128,
};

const QR_POSITION = {
  x: 5562,
  y: 3437,
  size: 390,
};

const DATE_POSITION = {
  x: CANVAS_WIDTH / 2,
  y: 3125,
  fontSize: 71,
  fontFamily: 'Arial',
  color: '#666666',
  align: 'center' as const,
};

const COURSE_NAME_POSITION = {
  x: CANVAS_WIDTH / 2,
  y: 2700,
  fontSize: 110,
  fontFamily: 'Arial',
  fontWeight: 'bold',
  color: '#333333',
  align: 'center' as const,
};

const INSTRUCTOR_POSITION = {
  x: CANVAS_WIDTH / 2,
  y: 3437,
  fontSize: 71,
  fontFamily: 'Arial',
  color: '#666666',
  align: 'center' as const,
};

async function generateQRCode(certificateId: string): Promise<Buffer> {
  const verifyUrl = `${QR_BASE_URL}/${certificateId}`;

  const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: QR_POSITION.size,
    margin: 1,
    color: {
      dark: '#2D1B4E',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'H',
  });

  const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

function drawRecipientName(
  ctx: CanvasRenderingContext2D,
  name: string,
  config: typeof NAME_POSITION
): { fontSize: number; textWidth: number; scaled: boolean } {
  let fontSize = config.fontSize;
  let textWidth = 0;
  const maxWidth = CANVAS_WIDTH * 0.85;
  let scaled = false;

  ctx.font = `${config.fontWeight} ${fontSize}px ${config.fontFamily}`;
  ctx.fillStyle = config.color;
  ctx.textAlign = config.align;
  ctx.textBaseline = 'middle';

  textWidth = ctx.measureText(name).width;

  if (textWidth > maxWidth) {
    scaled = true;
    const scaleFactor = maxWidth / textWidth;
    fontSize = Math.floor(fontSize * scaleFactor);
    ctx.font = `${config.fontWeight} ${fontSize}px ${config.fontFamily}`;
    textWidth = ctx.measureText(name).width;
  }

  ctx.shadowColor = config.shadowColor;
  ctx.shadowBlur = config.shadowBlur;
  ctx.shadowOffsetX = config.shadowOffsetX;
  ctx.shadowOffsetY = config.shadowOffsetY;

  ctx.fillText(name, config.x, config.y);

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  return { fontSize, textWidth, scaled };
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): void {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[i] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  ctx.fillText(line.trim(), x, currentY);
}

export async function generateAndUploadCertificate(
  data: CertificateData
): Promise<UploadSuccessResponse | UploadErrorResponse> {
  const startTime = Date.now();

  try {
    console.log('[Certificate Service] Starting certificate generation...');
    console.log('[Certificate Service] Student:', data.studentName);
    console.log('[Certificate Service] Course:', data.courseName);

    const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const ctx = canvas.getContext('2d');

    console.log('[Certificate Service] Loading template...');
    const template = await loadImage(TEMPLATE_URL);
    ctx.drawImage(template, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const nameMetrics = drawRecipientName(ctx, data.studentName, NAME_POSITION);
    console.log(`[Certificate Service] Name rendered (fontSize: ${nameMetrics.fontSize}px, scaled: ${nameMetrics.scaled})`);

    ctx.font = `${DESCRIPTION_POSITION.fontSize}px ${DESCRIPTION_POSITION.fontFamily}`;
    ctx.fillStyle = DESCRIPTION_POSITION.color;
    ctx.textAlign = DESCRIPTION_POSITION.align;
    const description = `has successfully completed`;
    wrapText(
      ctx,
      description,
      DESCRIPTION_POSITION.x,
      DESCRIPTION_POSITION.y,
      DESCRIPTION_POSITION.maxWidth,
      DESCRIPTION_POSITION.lineHeight
    );

    ctx.font = `${COURSE_NAME_POSITION.fontWeight} ${COURSE_NAME_POSITION.fontSize}px ${COURSE_NAME_POSITION.fontFamily}`;
    ctx.fillStyle = COURSE_NAME_POSITION.color;
    ctx.textAlign = COURSE_NAME_POSITION.align;
    ctx.fillText(data.courseName, COURSE_NAME_POSITION.x, COURSE_NAME_POSITION.y);

    ctx.font = `${DATE_POSITION.fontSize}px ${DATE_POSITION.fontFamily}`;
    ctx.fillStyle = DATE_POSITION.color;
    ctx.textAlign = DATE_POSITION.align;
    const dateText = `Completed: ${data.completionDate}`;
    ctx.fillText(dateText, DATE_POSITION.x, DATE_POSITION.y);

    ctx.font = `${INSTRUCTOR_POSITION.fontSize}px ${INSTRUCTOR_POSITION.fontFamily}`;
    ctx.fillStyle = INSTRUCTOR_POSITION.color;
    ctx.textAlign = INSTRUCTOR_POSITION.align;
    const instructorText = `Instructor: ${data.instructorName}`;
    ctx.fillText(instructorText, INSTRUCTOR_POSITION.x, INSTRUCTOR_POSITION.y);

    console.log('[Certificate Service] Generating QR code...');
    const qrCodeBuffer = await generateQRCode(data.certificateId);
    const qrCodeImage = await loadImage(qrCodeBuffer);
    ctx.drawImage(qrCodeImage, QR_POSITION.x, QR_POSITION.y, QR_POSITION.size, QR_POSITION.size);

    console.log('[Certificate Service] Optimizing image with sharp...');
    const pngBuffer = canvas.toBuffer('image/png');
    const optimizedBuffer = await sharp(pngBuffer)
      .png({
        quality: 95,
        compressionLevel: 9,
        adaptiveFiltering: true,
        palette: false,
      })
      .toBuffer();

    const sizeKB = (optimizedBuffer.length / 1024).toFixed(2);
    console.log(`[Certificate Service] Image optimized (${sizeKB} KB)`);

    const uint8Array = new Uint8Array(optimizedBuffer);
    const blob = new Blob([uint8Array], { type: 'image/png' });
    const file = new File([blob], `certificate-${data.certificateId}.png`, {
      type: 'image/png',
    });

    console.log('[Certificate Service] Uploading to Pinata private IPFS...');
    const imageUploadResult = await uploadFileToPrivateIPFS(file, {
      name: `certificate-${data.certificateId}.png`,
      metadata: {
        courseId: data.courseId.toString(),
        fileType: 'certificate',
      },
      keyvalues: {
        certificateId: data.certificateId,
        studentName: data.studentName,
        courseName: data.courseName,
        uploadedAt: new Date().toISOString(),
      },
    });

    if (!imageUploadResult.success) {
      console.error('[Certificate Service] Image upload failed');
      return imageUploadResult;
    }

    console.log(`[Certificate Service] Image uploaded: ${imageUploadResult.data.cid}`);

    const metadata = {
      name: `${data.courseName} - Certificate`,
      description: `Certificate of completion for ${data.studentName}`,
      image: imageUploadResult.data.cid,
      attributes: [
        { trait_type: 'Student', value: data.studentName },
        { trait_type: 'Course', value: data.courseName },
        { trait_type: 'Course ID', value: data.courseId.toString() },
        { trait_type: 'Completion Date', value: data.completionDate },
        { trait_type: 'Instructor', value: data.instructorName },
        { trait_type: 'Certificate ID', value: data.certificateId },
        { trait_type: 'Wallet Address', value: data.walletAddress },
      ],
    };

    console.log('[Certificate Service] Uploading metadata to Pinata...');
    const metadataUploadResult = await uploadJSONToPrivateIPFS(metadata, {
      name: `certificate-metadata-${data.certificateId}.json`,
      metadata: {
        courseId: data.courseId.toString(),
        fileType: 'certificate-metadata',
      },
    });

    if (!metadataUploadResult.success) {
      console.error('[Certificate Service] Metadata upload failed');
      return metadataUploadResult;
    }

    console.log(`[Certificate Service] Metadata uploaded: ${metadataUploadResult.data.cid}`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Certificate Service] Certificate generation complete in ${duration}s`);

    return {
      success: true,
      data: {
        cid: imageUploadResult.data.cid,
        pinataId: imageUploadResult.data.pinataId,
        name: imageUploadResult.data.name,
        size: imageUploadResult.data.size,
        mimeType: imageUploadResult.data.mimeType,
        signedUrl: imageUploadResult.data.signedUrl,
        expiresAt: imageUploadResult.data.expiresAt,
        uploadedAt: imageUploadResult.data.uploadedAt,
        network: 'private' as const,
        metadataCID: metadataUploadResult.data.cid,
        metadataSignedUrl: metadataUploadResult.data.signedUrl,
        metadataExpiresAt: metadataUploadResult.data.expiresAt,
      },
    };
  } catch (error: unknown) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[Certificate Service] Failed after ${duration}s`);
    console.error('[Certificate Service] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      error: {
        code: 'CERTIFICATE_GENERATION_FAILED' as ErrorCode,
        message: errorMessage,
        details: error,
        retryable: false,
      },
    };
  }
}
