# EduVerse × Goldsky Integration Guide
## Part 5: Webhook Integration

> **Target Audience**: Backend Developers, AI Agents
> **Prerequisites**: Parts 1-4 completed, Subgraph deployed
> **Estimated Time**: 30 minutes

> **⚠️ IMPORTANT**: Webhook integration is **NEW IMPLEMENTATION** for EduVerse. The current codebase:
> - ✅ Has certificate queries (goldsky.service.ts)
> - ❌ Does NOT have webhook routes or real-time event processing
> - 📁 `eduweb/src/app/api/webhooks/goldsky/` directory needs to be created
> - 🔧 This guide provides complete implementation for adding webhooks

---

## 📚 Table of Contents

1. [Webhook Fundamentals](#webhook-fundamentals)
2. [Next.js API Route Setup](#nextjs-api-route-setup)
3. [Event Processing Logic](#event-processing-logic)
4. [Real-Time Notifications](#real-time-notifications)
5. [Security & Validation](#security--validation)
6. [Production Deployment](#production-deployment)

---

## 🎣 Webhook Fundamentals

### **What Are Goldsky Webhooks?**

Goldsky webhooks send **HTTP POST requests** to your endpoint whenever entities change in your subgraph. This enables real-time notifications without polling.

**Key Features:**
- Fires on `INSERT`, `UPDATE`, `DELETE` operations
- Includes full entity data in payload
- Tracks block range for entity versions
- Supports secret-based authentication
- Automatic retries with exponential backoff

---

### **Webhook Payload Structure:**

```typescript
interface WebhookPayload {
  op: 'INSERT' | 'UPDATE' | 'DELETE';
  entityName: string;
  entityId: string;
  entity: Record<string, any>;
  blockRange: {
    from: number;
    to: number | null;
  };
  timestamp: number;
}
```

**Example Payload:**

```json
{
  "op": "INSERT",
  "entityName": "License",
  "entityId": "0x742d35cc6634c0532925a3b844bc9e7595f0beb-1",
  "entity": {
    "id": "0x742d35cc6634c0532925a3b844bc9e7595f0beb-1",
    "tokenId": "1",
    "student": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
    "course": "1",
    "durationMonths": 1,
    "expiryTimestamp": "1735689600",
    "isActive": true,
    "isExpired": false,
    "purchasedAt": "1733097600",
    "pricePaid": "100000000000000000"
  },
  "blockRange": {
    "from": 1234567,
    "to": null
  },
  "timestamp": 1733097600
}
```

---

## 🔧 Next.js API Route Setup

> **📁 Directory Creation Required**: The `eduweb/src/app/api/webhooks/goldsky/` directory does not exist yet. You will create it following this guide.

### **Step 1: Create Webhook Endpoint**

```bash
# Create API route directory (this is NEW - not in current codebase)
mkdir -p eduweb/src/app/api/webhooks/goldsky
cd eduweb/src/app/api/webhooks/goldsky
touch route.ts
```

**Verify directory structure after creation:**
```
eduweb/src/app/api/
└── webhooks/           # NEW directory
    └── goldsky/        # NEW directory
        └── route.ts    # NEW file (create this)
```

---

### **Step 2: Base Webhook Handler**

```typescript
// eduweb/src/app/api/webhooks/goldsky/route.ts

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Environment variables
const WEBHOOK_SECRET = process.env.GOLDSKY_WEBHOOK_SECRET!;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const EMAIL_API_KEY = process.env.SENDGRID_API_KEY;

// Types
interface WebhookPayload {
  op: 'INSERT' | 'UPDATE' | 'DELETE';
  entityName: string;
  entityId: string;
  entity: Record<string, any>;
  blockRange: {
    from: number;
    to: number | null;
  };
  timestamp: number;
}

// Webhook verification
function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Main handler
export async function POST(req: NextRequest) {
  try {
    // 1. Read raw body
    const rawBody = await req.text();
    const payload: WebhookPayload = JSON.parse(rawBody);

    // 2. Verify signature
    const signature = req.headers.get('x-goldsky-signature');
    if (!signature || !verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET)) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // 3. Log webhook event
    console.log(`📥 Webhook received: ${payload.op} ${payload.entityName}`, {
      entityId: payload.entityId,
      timestamp: new Date(payload.timestamp * 1000).toISOString()
    });

    // 4. Route to handler
    await handleWebhookEvent(payload);

    // 5. Respond quickly (Goldsky expects 2xx within 5s)
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Event router
async function handleWebhookEvent(payload: WebhookPayload) {
  const { op, entityName, entity } = payload;

  switch (entityName) {
    case 'License':
      if (op === 'INSERT') {
        await handleNewEnrollment(entity);
      }
      break;

    case 'CourseProgress':
      if (op === 'UPDATE' && entity.isCompleted) {
        await handleCourseCompletion(entity);
      }
      break;

    case 'Certificate':
      if (op === 'INSERT') {
        await handleCertificateIssued(entity);
      } else if (op === 'UPDATE') {
        await handleCertificateUpdated(entity);
      }
      break;

    case 'CourseRating':
      if (op === 'INSERT') {
        await handleNewRating(entity);
      }
      break;

    case 'Revenue':
      if (op === 'INSERT') {
        await handleRevenueRecorded(entity);
      }
      break;

    default:
      console.log(`ℹ️ Unhandled entity: ${entityName}`);
  }
}
```

---

## 🎯 Event Processing Logic

### **1. New Enrollment Handler**

```typescript
// eduweb/src/app/api/webhooks/goldsky/handlers/enrollment.ts

import { sendDiscordNotification } from '../utils/discord';
import { sendEmail } from '../utils/email';

interface LicenseEntity {
  id: string;
  tokenId: string;
  student: string;
  course: string;
  durationMonths: number;
  pricePaid: string;
  purchasedAt: string;
}

export async function handleNewEnrollment(license: LicenseEntity) {
  console.log(`🎓 New enrollment: Student ${license.student} → Course ${license.course}`);

  try {
    // 1. Fetch course details from GraphQL
    const course = await fetchCourseDetails(license.course);

    // 2. Send Discord notification
    if (process.env.DISCORD_WEBHOOK_URL) {
      await sendDiscordNotification({
        title: '🎓 New Student Enrollment',
        color: 0x00FF00, // Green
        fields: [
          {
            name: 'Course',
            value: course.title,
            inline: true
          },
          {
            name: 'Student',
            value: `\`${license.student.slice(0, 6)}...${license.student.slice(-4)}\``,
            inline: true
          },
          {
            name: 'Price',
            value: `${formatEther(license.pricePaid)} MANTA`,
            inline: true
          },
          {
            name: 'Duration',
            value: `${license.durationMonths} month(s)`,
            inline: true
          }
        ],
        timestamp: new Date(parseInt(license.purchasedAt) * 1000).toISOString()
      });
    }

    // 3. Send welcome email to student
    await sendEmail({
      to: await resolveEmailFromAddress(license.student),
      subject: `Welcome to ${course.title}!`,
      template: 'enrollment-welcome',
      data: {
        courseName: course.title,
        creatorName: course.creatorName,
        expiryDate: new Date(parseInt(license.purchasedAt) * 1000 + license.durationMonths * 30 * 24 * 60 * 60 * 1000),
        courseUrl: `${process.env.NEXT_PUBLIC_APP_URL}/learn/${course.id}`
      }
    });

    // 4. Notify course creator
    await sendEmail({
      to: await resolveEmailFromAddress(course.creator),
      subject: `New student enrolled in ${course.title}`,
      template: 'creator-new-student',
      data: {
        courseName: course.title,
        studentAddress: license.student,
        revenue: formatEther(license.pricePaid),
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/teacher/dashboard`
      }
    });

    console.log('✅ Enrollment notifications sent');
  } catch (error) {
    console.error('❌ Enrollment handler error:', error);
  }
}

// Helper: Fetch course from GraphQL
async function fetchCourseDetails(courseId: string) {
  const query = `
    query GetCourse($id: ID!) {
      course(id: $id) {
        id
        title
        creator
        creatorName
        thumbnailCID
      }
    }
  `;

  const response = await fetch(process.env.GOLDSKY_ENDPOINT!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { id: courseId } })
  });

  const { data } = await response.json();
  return data.course;
}

// Helper: Format wei to ether
function formatEther(wei: string): string {
  const ether = BigInt(wei) / BigInt(10 ** 18);
  return ether.toString();
}
```

---

### **2. Course Completion Handler**

```typescript
// eduweb/src/app/api/webhooks/goldsky/handlers/completion.ts

interface CourseProgressEntity {
  id: string;
  student: string;
  course: string;
  totalSections: number;
  completedSections: number;
  completionPercentage: number;
  isCompleted: boolean;
  completedAt: string;
}

export async function handleCourseCompletion(progress: CourseProgressEntity) {
  console.log(`🎉 Course completed: ${progress.student} finished ${progress.course}`);

  try {
    // 1. Fetch course and student license
    const [course, license] = await Promise.all([
      fetchCourseDetails(progress.course),
      fetchStudentLicense(progress.student, progress.course)
    ]);

    // 2. Check certificate eligibility
    const eligibleForCertificate = license.isActive && !license.isExpired;

    // 3. Send congratulations
    await sendDiscordNotification({
      title: '🎉 Course Completed!',
      color: 0xFFD700, // Gold
      fields: [
        {
          name: 'Student',
          value: `\`${progress.student.slice(0, 6)}...${progress.student.slice(-4)}\``,
          inline: true
        },
        {
          name: 'Course',
          value: course.title,
          inline: true
        },
        {
          name: 'Completion',
          value: `${progress.completionPercentage / 100}%`,
          inline: true
        },
        {
          name: 'Certificate Eligible',
          value: eligibleForCertificate ? '✅ Yes' : '❌ No (license expired)',
          inline: true
        }
      ],
      timestamp: new Date(parseInt(progress.completedAt) * 1000).toISOString()
    });

    // 4. Send completion email
    await sendEmail({
      to: await resolveEmailFromAddress(progress.student),
      subject: `🎉 Congratulations! You completed ${course.title}`,
      template: 'course-completion',
      data: {
        courseName: course.title,
        completedSections: progress.totalSections,
        eligibleForCertificate,
        certificateUrl: eligibleForCertificate
          ? `${process.env.NEXT_PUBLIC_APP_URL}/certificate/mint?course=${course.id}`
          : null
      }
    });

    console.log('✅ Completion notifications sent');
  } catch (error) {
    console.error('❌ Completion handler error:', error);
  }
}

// Helper: Fetch license
async function fetchStudentLicense(student: string, courseId: string) {
  const query = `
    query GetLicense($id: ID!) {
      license(id: $id) {
        id
        isActive
        isExpired
        expiryTimestamp
      }
    }
  `;

  const response = await fetch(process.env.GOLDSKY_ENDPOINT!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { id: `${student.toLowerCase()}-${courseId}` }
    })
  });

  const { data } = await response.json();
  return data.license;
}
```

---

### **3. Certificate Issued Handler**

```typescript
// eduweb/src/app/api/webhooks/goldsky/handlers/certificate.ts

interface CertificateEntity {
  id: string;
  tokenId: string;
  owner: string;
  recipientName: string;
  ipfsCID: string;
  baseRoute: string;
  totalCoursesCompleted: number;
  issuedAt: string;
}

export async function handleCertificateIssued(certificate: CertificateEntity) {
  console.log(`🏆 Certificate issued: Token #${certificate.tokenId} → ${certificate.owner}`);

  try {
    // 1. Generate certificate URL and QR code
    const certificateUrl = `${certificate.baseRoute}/${certificate.tokenId}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(certificateUrl)}`;

    // 2. Send Discord notification
    await sendDiscordNotification({
      title: '🏆 Certificate Issued',
      color: 0x9C27B0, // Purple
      thumbnail: {
        url: `https://gateway.pinata.cloud/ipfs/${certificate.ipfsCID}`
      },
      fields: [
        {
          name: 'Recipient',
          value: certificate.recipientName,
          inline: true
        },
        {
          name: 'Token ID',
          value: `#${certificate.tokenId}`,
          inline: true
        },
        {
          name: 'Courses',
          value: certificate.totalCoursesCompleted.toString(),
          inline: true
        },
        {
          name: 'View Certificate',
          value: `[Open →](${certificateUrl})`,
          inline: false
        }
      ],
      image: {
        url: qrCodeUrl
      },
      timestamp: new Date(parseInt(certificate.issuedAt) * 1000).toISOString()
    });

    // 3. Send email with certificate
    await sendEmail({
      to: await resolveEmailFromAddress(certificate.owner),
      subject: `🏆 Your EduVerse Certificate is Ready!`,
      template: 'certificate-issued',
      data: {
        recipientName: certificate.recipientName,
        tokenId: certificate.tokenId,
        coursesCompleted: certificate.totalCoursesCompleted,
        certificateUrl,
        qrCodeUrl,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${certificate.ipfsCID}`
      }
    });

    console.log('✅ Certificate notifications sent');
  } catch (error) {
    console.error('❌ Certificate handler error:', error);
  }
}

export async function handleCertificateUpdated(certificate: CertificateEntity) {
  console.log(`📝 Certificate updated: Token #${certificate.tokenId}`);

  // Notify user that certificate has been updated with new course
  await sendEmail({
    to: await resolveEmailFromAddress(certificate.owner),
    subject: `📝 Your Certificate Has Been Updated`,
    template: 'certificate-updated',
    data: {
      recipientName: certificate.recipientName,
      tokenId: certificate.tokenId,
      totalCourses: certificate.totalCoursesCompleted,
      certificateUrl: `${certificate.baseRoute}/${certificate.tokenId}`
    }
  });
}
```

---

### **4. New Rating Handler**

```typescript
// eduweb/src/app/api/webhooks/goldsky/handlers/rating.ts

interface CourseRatingEntity {
  id: string;
  course: string;
  user: string;
  rating: string;
  ratedAt: string;
}

export async function handleNewRating(rating: CourseRatingEntity) {
  console.log(`⭐ New rating: ${rating.rating} for course ${rating.course}`);

  try {
    // 1. Fetch course details
    const course = await fetchCourseDetails(rating.course);

    // 2. Calculate star rating
    const stars = parseInt(rating.rating) / 10000; // Convert from 0-50000 to 0-5

    // 3. Notify course creator
    await sendEmail({
      to: await resolveEmailFromAddress(course.creator),
      subject: `⭐ New ${stars}-star rating for ${course.title}`,
      template: 'new-rating',
      data: {
        courseName: course.title,
        rating: stars,
        raterAddress: rating.user,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/teacher/courses/${course.id}/analytics`
      }
    });

    console.log('✅ Rating notification sent');
  } catch (error) {
    console.error('❌ Rating handler error:', error);
  }
}
```

---

### **5. Revenue Handler**

```typescript
// eduweb/src/app/api/webhooks/goldsky/handlers/revenue.ts

interface RevenueEntity {
  id: string;
  creator: string;
  course: string;
  amount: string;
  revenueType: 'LICENSE_PURCHASE' | 'LICENSE_RENEWAL' | 'CERTIFICATE_MINT';
  timestamp: string;
  transactionHash: string;
}

export async function handleRevenueRecorded(revenue: RevenueEntity) {
  console.log(`💰 Revenue: ${formatEther(revenue.amount)} MANTA for ${revenue.creator}`);

  try {
    // 1. Fetch course details
    const course = await fetchCourseDetails(revenue.course);

    // 2. Send revenue notification
    await sendEmail({
      to: await resolveEmailFromAddress(revenue.creator),
      subject: `💰 You earned ${formatEther(revenue.amount)} MANTA`,
      template: 'revenue-notification',
      data: {
        courseName: course.title,
        amount: formatEther(revenue.amount),
        revenueType: revenue.revenueType.replace('_', ' ').toLowerCase(),
        transactionUrl: `https://pacific-explorer.sepolia-testnet.manta.network/tx/${revenue.transactionHash}`,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/teacher/dashboard`
      }
    });

    console.log('✅ Revenue notification sent');
  } catch (error) {
    console.error('❌ Revenue handler error:', error);
  }
}
```

---

## 🔔 Real-Time Notifications

### **Discord Webhook Integration**

```typescript
// eduweb/src/app/api/webhooks/goldsky/utils/discord.ts

interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  thumbnail?: {
    url: string;
  };
  image?: {
    url: string;
  };
  footer?: {
    text: string;
  };
  timestamp?: string;
}

export async function sendDiscordNotification(embed: DiscordEmbed) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('⚠️ Discord webhook URL not configured');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'EduVerse Bot',
        avatar_url: 'https://yourdomain.com/Eduverse_logo.png',
        embeds: [
          {
            ...embed,
            footer: {
              text: 'EduVerse LMS',
              icon_url: 'https://yourdomain.com/Eduverse_logo.png'
            }
          }
        ]
      })
    });

    if (!response.ok) {
      console.error('❌ Discord notification failed:', await response.text());
    } else {
      console.log('✅ Discord notification sent');
    }
  } catch (error) {
    console.error('❌ Discord notification error:', error);
  }
}
```

---

### **Email Integration (SendGrid)**

```typescript
// eduweb/src/app/api/webhooks/goldsky/utils/email.ts

import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export async function sendEmail(options: EmailOptions) {
  try {
    const msg = {
      to: options.to,
      from: process.env.SENDGRID_FROM_EMAIL!,
      templateId: getTemplateId(options.template),
      dynamicTemplateData: options.data
    };

    await sgMail.send(msg);
    console.log(`✅ Email sent to ${options.to}`);
  } catch (error) {
    console.error('❌ Email sending error:', error);
  }
}

function getTemplateId(template: string): string {
  const templates: Record<string, string> = {
    'enrollment-welcome': process.env.SENDGRID_TEMPLATE_ENROLLMENT!,
    'creator-new-student': process.env.SENDGRID_TEMPLATE_NEW_STUDENT!,
    'course-completion': process.env.SENDGRID_TEMPLATE_COMPLETION!,
    'certificate-issued': process.env.SENDGRID_TEMPLATE_CERTIFICATE!,
    'certificate-updated': process.env.SENDGRID_TEMPLATE_CERT_UPDATE!,
    'new-rating': process.env.SENDGRID_TEMPLATE_RATING!,
    'revenue-notification': process.env.SENDGRID_TEMPLATE_REVENUE!
  };

  return templates[template];
}

// Helper: Resolve email from blockchain address
export async function resolveEmailFromAddress(address: string): Promise<string> {
  // Implementation depends on your user management system
  // Options:
  // 1. Query your database for user email by wallet address
  // 2. Use ENS to resolve email (if set)
  // 3. Use a third-party service like Web3Auth

  // Example database query:
  // const user = await prisma.user.findUnique({
  //   where: { walletAddress: address.toLowerCase() }
  // });
  // return user?.email || '';

  // For now, return placeholder
  return `${address}@example.com`;
}
```

---

## 🔒 Security & Validation

### **1. Webhook Signature Verification**

```typescript
// Already implemented in main route.ts
function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

**Generate webhook secret:**
```bash
# Generate a secure random secret
openssl rand -hex 32

# Add to .env.local
GOLDSKY_WEBHOOK_SECRET=your_generated_secret_here
```

---

### **2. Rate Limiting**

```typescript
// eduweb/src/app/api/webhooks/goldsky/middleware/rate-limit.ts

import { NextRequest, NextResponse } from 'next/server';

const requestCounts = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100 // Max 100 requests per minute per IP
};

export function rateLimitMiddleware(req: NextRequest): NextResponse | null {
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();

  const record = requestCounts.get(ip);

  if (!record || now > record.resetAt) {
    requestCounts.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT.windowMs
    });
    return null; // Allow request
  }

  if (record.count >= RATE_LIMIT.maxRequests) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  record.count++;
  return null; // Allow request
}
```

---

### **3. Payload Validation**

```typescript
// eduweb/src/app/api/webhooks/goldsky/utils/validation.ts

import { z } from 'zod';

const WebhookPayloadSchema = z.object({
  op: z.enum(['INSERT', 'UPDATE', 'DELETE']),
  entityName: z.string(),
  entityId: z.string(),
  entity: z.record(z.any()),
  blockRange: z.object({
    from: z.number(),
    to: z.number().nullable()
  }),
  timestamp: z.number()
});

export function validateWebhookPayload(payload: unknown): boolean {
  try {
    WebhookPayloadSchema.parse(payload);
    return true;
  } catch (error) {
    console.error('❌ Invalid webhook payload:', error);
    return false;
  }
}
```

---

## 🚀 Production Deployment

### **Step 1: Configure Webhook in Goldsky Dashboard**

```bash
# Login to Goldsky
goldsky login

# Add webhook to your subgraph
goldsky subgraph webhook add eduverse-lms/prod \
  --url "https://yourdomain.com/api/webhooks/goldsky" \
  --secret "your_webhook_secret"
```

**Webhook Configuration:**
```json
{
  "url": "https://yourdomain.com/api/webhooks/goldsky",
  "secret": "your_webhook_secret",
  "entities": [
    "License",
    "CourseProgress",
    "Certificate",
    "CourseRating",
    "Revenue"
  ],
  "operations": ["INSERT", "UPDATE", "DELETE"]
}
```

---

### **Step 2: Environment Variables**

```bash
# eduweb/.env.local

# Goldsky
GOLDSKY_ENDPOINT=https://api.goldsky.com/api/public/project_XXX/subgraphs/eduverse-lms/prod/gn
GOLDSKY_WEBHOOK_SECRET=your_generated_secret_here

# Discord (optional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN

# SendGrid (optional)
SENDGRID_API_KEY=SG.your_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_TEMPLATE_ENROLLMENT=d-xxx
SENDGRID_TEMPLATE_NEW_STUDENT=d-xxx
SENDGRID_TEMPLATE_COMPLETION=d-xxx
SENDGRID_TEMPLATE_CERTIFICATE=d-xxx
SENDGRID_TEMPLATE_CERT_UPDATE=d-xxx
SENDGRID_TEMPLATE_RATING=d-xxx
SENDGRID_TEMPLATE_REVENUE=d-xxx

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

### **Step 3: Test Webhook Locally**

```bash
# Install ngrok for local testing
npm install -g ngrok

# Start Next.js dev server
cd eduweb
npm run dev

# In another terminal, expose local server
ngrok http 3000

# Use ngrok URL for webhook testing
# Example: https://abc123.ngrok.io/api/webhooks/goldsky
```

**Test webhook with curl:**
```bash
curl -X POST https://abc123.ngrok.io/api/webhooks/goldsky \
  -H "Content-Type: application/json" \
  -H "x-goldsky-signature: test_signature" \
  -d '{
    "op": "INSERT",
    "entityName": "License",
    "entityId": "test-1",
    "entity": {
      "id": "test-1",
      "student": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
      "course": "1",
      "purchasedAt": "1733097600"
    },
    "blockRange": { "from": 1234567, "to": null },
    "timestamp": 1733097600
  }'
```

---

### **Step 4: Deploy to Production**

```bash
# Deploy to Vercel
cd eduweb
vercel --prod

# Update Goldsky webhook URL
goldsky subgraph webhook update eduverse-lms/prod \
  --url "https://yourdomain.com/api/webhooks/goldsky"
```

---

### **Step 5: Monitor Webhooks**

```typescript
// eduweb/src/app/api/webhooks/goldsky/logs/route.ts

import { NextRequest, NextResponse } from 'next/server';

// In-memory log storage (use database in production)
const webhookLogs: Array<{
  timestamp: Date;
  entityName: string;
  op: string;
  entityId: string;
  status: 'success' | 'error';
  error?: string;
}> = [];

export function logWebhookEvent(
  entityName: string,
  op: string,
  entityId: string,
  status: 'success' | 'error',
  error?: string
) {
  webhookLogs.push({
    timestamp: new Date(),
    entityName,
    op,
    entityId,
    status,
    error
  });

  // Keep only last 1000 logs
  if (webhookLogs.length > 1000) {
    webhookLogs.shift();
  }
}

export async function GET(req: NextRequest) {
  // Add authentication here
  const apiKey = req.headers.get('x-api-key');
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    total: webhookLogs.length,
    logs: webhookLogs.slice(-100) // Return last 100 logs
  });
}
```

---

## 🧪 Testing Checklist

- [ ] Webhook signature verification works
- [ ] Rate limiting prevents abuse
- [ ] Discord notifications deliver correctly
- [ ] Email notifications deliver correctly
- [ ] All entity types are handled
- [ ] Error handling doesn't crash server
- [ ] Logs are stored and accessible
- [ ] Production environment variables are set
- [ ] Goldsky webhook is registered
- [ ] Local testing with ngrok works
- [ ] Response time is under 5 seconds

---

## 🎯 What's Next?

**Part 6: Frontend Service Integration** akan membahas:
- Apollo Client setup untuk Next.js 14
- Custom React hooks untuk GraphQL queries
- TypeScript code generation dari schema
- Cache management dan optimistic updates
- Complete working implementation untuk eduweb

---

**Author**: EduVerse Development Team
**Last Updated**: October 20, 2025
**Version**: 1.0.0

---

**Continue to**: [Part 6: Frontend Service Integration →](./PART-6-FRONTEND-INTEGRATION.md)
