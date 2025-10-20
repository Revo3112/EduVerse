# EduVerse × Goldsky Integration Guide
## Part 6: Frontend Service Integration

> **Target Audience**: Frontend Developers, AI Agents
> **Prerequisites**: Parts 1-5 completed, Next.js 14 project setup
> **Estimated Time**: 40 minutes

> **🔄 MIGRATION CONTEXT**: Your codebase currently uses:
> - ✅ **Existing**: `goldsky.service.ts` with `fetch()` for certificate queries
> - 📦 **Addition**: This guide adds Apollo Client for Course/License/Progress queries
> - 🤝 **Coexistence**: Both approaches can work together during migration
> - 🎯 **Choice**: Keep fetch() for certificates OR migrate everything to Apollo Client

---

## 📚 Table of Contents

1. [Migration Strategy](#migration-strategy)
   - [Existing Implementation Overview](#existing-implementation-overview)
   - [Apollo Client as Addition](#apollo-client-as-addition)
   - [Coexistence Approach](#coexistence-approach)
2. [Apollo Client Setup](#apollo-client-setup)
3. [GraphQL Code Generation](#graphql-code-generation)
4. [Custom React Hooks](#custom-react-hooks)
5. [Cache Management](#cache-management)
6. [Complete Implementation](#complete-implementation)
7. [Performance Optimization](#performance-optimization)

---

## 🔀 Migration Strategy

### **Existing Implementation Overview**

Your current codebase has:
```typescript
// eduweb/src/services/goldsky.service.ts
export async function getCertificateByTokenId(tokenId: string) {
  const response = await fetch(GOLDSKY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: CERTIFICATE_QUERY, variables: { tokenId } })
  });
  return response.json();
}

export async function getUserCertificate(walletAddress: string) {
  // Similar fetch-based implementation
}
```

**This works perfectly fine and doesn't need to change.**

---

### **Apollo Client as Addition**

This guide adds Apollo Client **alongside** existing fetch-based queries:

**Option A: Partial Migration (Recommended for initial rollout)**
```
Certificate Queries → Keep using goldsky.service.ts (fetch)
Course Queries     → Use Apollo Client (new)
License Queries    → Use Apollo Client (new)
Progress Queries   → Use Apollo Client (new)
```

**Option B: Full Migration**
```
All Queries → Migrate to Apollo Client
```

**Option C: Hybrid Approach**
```
Keep both, gradually migrate as you refactor components
```

---

### **Coexistence Approach**

**Both methods can work together:**

```typescript
// Old: goldsky.service.ts (continues to work)
import { getCertificateByTokenId } from '@/services/goldsky.service';

// New: Apollo Client hooks
import { useGetCourseDetailsQuery } from '@/hooks/generated/graphql';

function MyComponent() {
  // Old approach for certificates (keep using this)
  const [certificate, setCertificate] = useState(null);
  useEffect(() => {
    getCertificateByTokenId('123').then(setCertificate);
  }, []);

  // New approach for courses (add this)
  const { data: courseData } = useGetCourseDetailsQuery({
    variables: { id: '1' }
  });

  return (/* ... */);
}
```

**Migration Timeline Suggestion:**
1. **Phase 1**: Install Apollo Client, add Course/License/Progress queries
2. **Phase 2**: Keep existing certificate queries working
3. **Phase 3** (optional): Migrate certificates to Apollo if you want consistency

---

## 🚀 Apollo Client Setup

> **Note**: These packages are NOT currently installed. This section adds them as new dependencies.

### **Step 1: Install Dependencies**

```bash
cd eduweb

npm install @apollo/client graphql

# For code generation
npm install -D @graphql-codegen/cli \
  @graphql-codegen/typescript \
  @graphql-codegen/typescript-operations \
  @graphql-codegen/typescript-react-apollo
```

---

### **Step 2: Create Apollo Client Provider**

```typescript
// eduweb/src/lib/apollo-client.ts

import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';

// Goldsky endpoint
const GOLDSKY_ENDPOINT = process.env.NEXT_PUBLIC_GOLDSKY_ENDPOINT!;

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

// HTTP link
const httpLink = new HttpLink({
  uri: GOLDSKY_ENDPOINT,
  credentials: 'same-origin'
});

// Context link (for auth if needed)
const authLink = setContext((_, { headers }) => {
  // Add auth token here if using private endpoint
  // const token = process.env.NEXT_PUBLIC_GOLDSKY_API_KEY;

  return {
    headers: {
      ...headers,
      // Authorization: token ? `Bearer ${token}` : '',
    }
  };
});

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Pagination merge function
          courses: {
            keyArgs: ['where', 'orderBy', 'orderDirection'],
            merge(existing = [], incoming, { args }) {
              const merged = existing ? existing.slice(0) : [];
              const offset = args?.skip || 0;

              for (let i = 0; i < incoming.length; ++i) {
                merged[offset + i] = incoming[i];
              }

              return merged;
            }
          }
        }
      },
      // Enable normalization by ID
      Course: {
        keyFields: ['id']
      },
      License: {
        keyFields: ['id']
      },
      Certificate: {
        keyFields: ['id']
      },
      CourseProgress: {
        keyFields: ['id']
      }
    }
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all'
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all'
    },
    mutate: {
      errorPolicy: 'all'
    }
  }
});
```

---

### **Step 3: Add Apollo Provider to App**

```typescript
// eduweb/src/app/providers.tsx

'use client';

import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '@/lib/apollo-client';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ApolloProvider client={apolloClient}>
      {children}
    </ApolloProvider>
  );
}
```

```typescript
// eduweb/src/app/layout.tsx

import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

---

## 🔧 GraphQL Code Generation

### **Step 1: Create Codegen Configuration**

```yaml
# eduweb/codegen.yml

schema: ${NEXT_PUBLIC_GOLDSKY_ENDPOINT}
documents: 'src/**/*.graphql'
generates:
  src/generated/graphql.ts:
    plugins:
      - typescript
      - typescript-operations
      - typescript-react-apollo
    config:
      withHooks: true
      withComponent: false
      withHOC: false
      skipTypename: false
      enumsAsTypes: true
      constEnums: false
      immutableTypes: false
      maybeValue: T | null
      avoidOptionals:
        field: true
        inputValue: false
        object: false
        defaultValue: false
```

---

### **Step 2: Create GraphQL Query Files**

```graphql
# eduweb/src/graphql/queries/courses.graphql

query GetActiveCourses($first: Int!, $skip: Int!) {
  courses(
    where: { isActive: true }
    orderBy: createdAt
    orderDirection: desc
    first: $first
    skip: $skip
  ) {
    id
    title
    description
    thumbnailCID
    creator
    creatorName
    pricePerMonth
    category
    difficulty
    totalEnrollments
    averageRating
    totalRatings
    createdAt
    sections {
      id
      title
      duration
    }
  }
}

query GetCourseDetails($courseId: ID!) {
  course(id: $courseId) {
    id
    title
    description
    thumbnailCID
    creator
    creatorName
    pricePerMonth
    category
    difficulty
    isActive
    totalEnrollments
    averageRating
    totalRatings
    totalRevenue
    createdAt
    updatedAt
    sections(orderBy: orderId, orderDirection: asc) {
      id
      sectionId
      orderId
      title
      contentCID
      duration
      createdAt
    }
    ratings(first: 10, orderBy: ratedAt, orderDirection: desc) {
      user
      rating
      ratedAt
    }
  }
}

query SearchCourses($searchTerm: String!, $first: Int!) {
  courses(
    where: {
      isActive: true
      title_contains_nocase: $searchTerm
    }
    orderBy: totalEnrollments
    orderDirection: desc
    first: $first
  ) {
    id
    title
    description
    thumbnailCID
    creator
    creatorName
    pricePerMonth
    category
    difficulty
    averageRating
    totalEnrollments
  }
}
```

```graphql
# eduweb/src/graphql/queries/student.graphql

query GetMyEnrolledCourses($studentAddress: Bytes!) {
  licenses(
    where: {
      student: $studentAddress
      isActive: true
      isExpired: false
    }
    orderBy: purchasedAt
    orderDirection: desc
  ) {
    id
    tokenId
    durationMonths
    expiryTimestamp
    purchasedAt
    pricePaid
    course {
      id
      title
      description
      thumbnailCID
      creator
      creatorName
      category
      difficulty
      sections {
        id
        sectionId
        orderId
        title
        duration
      }
    }
  }
}

query GetMyCourseProgress($studentAddress: Bytes!, $courseId: ID!) {
  courseProgress(id: "${studentAddress}-${courseId}") {
    id
    totalSections
    completedSections
    completionPercentage
    isCompleted
    completedAt
    startedAt
    lastActivityAt
    course {
      id
      title
      thumbnailCID
    }
  }
  sectionProgresses(
    where: {
      student: $studentAddress
      course: $courseId
    }
    orderBy: section__orderId
    orderDirection: asc
  ) {
    id
    completed
    completedAt
    startedAt
    timeSpent
    section {
      id
      sectionId
      orderId
      title
      contentCID
      duration
    }
  }
}

query GetMyCertificates($ownerAddress: Bytes!) {
  certificates(where: { owner: $ownerAddress }) {
    id
    tokenId
    recipientName
    platformName
    ipfsCID
    baseRoute
    isValid
    lifetimeFlag
    issuedAt
    lastUpdated
    totalCoursesCompleted
    completedCourses
    totalPaid
    courseCertificates(orderBy: addedAt, orderDirection: asc) {
      id
      addedAt
      completedAt
      pricePaid
      course {
        id
        title
        thumbnailCID
        creator
        creatorName
        category
      }
    }
  }
}
```

```graphql
# eduweb/src/graphql/queries/teacher.graphql

query GetMyCreatedCourses($creatorAddress: Bytes!) {
  courses(
    where: { creator: $creatorAddress }
    orderBy: createdAt
    orderDirection: desc
  ) {
    id
    title
    description
    thumbnailCID
    pricePerMonth
    category
    difficulty
    isActive
    totalEnrollments
    totalRevenue
    averageRating
    totalRatings
    createdAt
    updatedAt
    sections {
      id
    }
  }
}

query GetTeacherStats($creatorAddress: Bytes!) {
  teacherStats(id: $creatorAddress) {
    id
    creator
    totalCoursesCreated
    totalActiveCourses
    totalStudents
    totalEnrollments
    totalRevenue
    licenseRevenue
    certificateRevenue
    averageRating
    totalRatings
    lastCourseCreatedAt
    firstCourseCreatedAt
  }
  revenues(
    where: { creator: $creatorAddress }
    orderBy: timestamp
    orderDirection: desc
    first: 50
  ) {
    id
    amount
    revenueType
    timestamp
    transactionHash
    course {
      id
      title
    }
  }
}
```

```graphql
# eduweb/src/graphql/queries/certificate.graphql

query VerifyCertificate($tokenId: BigInt!) {
  certificate(id: $tokenId) {
    id
    tokenId
    owner
    recipientName
    platformName
    ipfsCID
    baseRoute
    isValid
    lifetimeFlag
    issuedAt
    lastUpdated
    totalCoursesCompleted
    courseCertificates(orderBy: completedAt, orderDirection: asc) {
      id
      addedAt
      completedAt
      course {
        id
        title
        creator
        creatorName
        category
        difficulty
      }
    }
  }
}
```

---

### **Step 3: Generate TypeScript Types**

```bash
# Add script to package.json
npm pkg set scripts.codegen="graphql-codegen --config codegen.yml"

# Generate types
npm run codegen
```

**Generated file structure:**
```
src/generated/
  graphql.ts  # All types and hooks
```

---

## 🎣 Custom React Hooks

### **1. useCourses - Course Discovery**

```typescript
// eduweb/src/hooks/useCourses.ts

import { useState, useCallback } from 'react';
import { useGetActiveCoursesQuery } from '@/generated/graphql';

const PAGE_SIZE = 20;

export function useCourses() {
  const [page, setPage] = useState(0);

  const { data, loading, error, fetchMore } = useGetActiveCoursesQuery({
    variables: {
      first: PAGE_SIZE,
      skip: 0
    },
    notifyOnNetworkStatusChange: true
  });

  const courses = data?.courses || [];
  const hasMore = courses.length >= (page + 1) * PAGE_SIZE;

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    try {
      await fetchMore({
        variables: {
          skip: (page + 1) * PAGE_SIZE
        }
      });
      setPage(prev => prev + 1);
    } catch (err) {
      console.error('Failed to load more courses:', err);
    }
  }, [page, hasMore, loading, fetchMore]);

  return {
    courses,
    loading,
    error,
    hasMore,
    loadMore
  };
}
```

**Usage:**
```typescript
// In a component
import { useCourses } from '@/hooks/useCourses';

function CoursesPage() {
  const { courses, loading, error, hasMore, loadMore } = useCourses();

  if (loading && courses.length === 0) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        {courses.map(course => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>

      {hasMore && (
        <button onClick={loadMore} disabled={loading}>
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

---

### **2. useCourseDetails - Course Detail Page**

```typescript
// eduweb/src/hooks/useCourseDetails.ts

import { useGetCourseDetailsQuery } from '@/generated/graphql';

export function useCourseDetails(courseId: string) {
  const { data, loading, error, refetch } = useGetCourseDetailsQuery({
    variables: { courseId },
    skip: !courseId
  });

  return {
    course: data?.course,
    loading,
    error,
    refetch
  };
}
```

**Usage:**
```typescript
// app/courses/[id]/page.tsx
'use client';

import { useCourseDetails } from '@/hooks/useCourseDetails';

export default function CourseDetailPage({
  params
}: {
  params: { id: string }
}) {
  const { course, loading, error } = useCourseDetails(params.id);

  if (loading) return <Skeleton />;
  if (error || !course) return <NotFound />;

  return (
    <div>
      <h1>{course.title}</h1>
      <p>{course.description}</p>

      <div className="sections">
        {course.sections.map(section => (
          <SectionCard key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
```

---

### **3. useMyEnrollments - Student Dashboard**

```typescript
// eduweb/src/hooks/useMyEnrollments.ts

import { useAccount } from 'wagmi';
import { useGetMyEnrolledCoursesQuery } from '@/generated/graphql';

export function useMyEnrollments() {
  const { address } = useAccount();

  const { data, loading, error, refetch } = useGetMyEnrolledCoursesQuery({
    variables: {
      studentAddress: address?.toLowerCase() || ''
    },
    skip: !address,
    pollInterval: 30000 // Poll every 30s for updates
  });

  const enrollments = data?.licenses || [];

  return {
    enrollments,
    loading,
    error,
    refetch
  };
}
```

**Usage:**
```typescript
// app/student/dashboard/page.tsx
'use client';

import { useMyEnrollments } from '@/hooks/useMyEnrollments';

export default function StudentDashboard() {
  const { enrollments, loading, error } = useMyEnrollments();

  if (loading) return <Spinner />;
  if (error) return <Error />;

  return (
    <div>
      <h1>My Courses ({enrollments.length})</h1>

      <div className="grid grid-cols-2 gap-4">
        {enrollments.map(license => (
          <EnrolledCourseCard
            key={license.id}
            license={license}
          />
        ))}
      </div>
    </div>
  );
}
```

---

### **4. useCourseProgress - Learning Progress**

```typescript
// eduweb/src/hooks/useCourseProgress.ts

import { useAccount } from 'wagmi';
import { useGetMyCourseProgressQuery } from '@/generated/graphql';

export function useCourseProgress(courseId: string) {
  const { address } = useAccount();

  const { data, loading, error, refetch } = useGetMyCourseProgressQuery({
    variables: {
      studentAddress: address?.toLowerCase() || '',
      courseId
    },
    skip: !address || !courseId,
    pollInterval: 10000 // Poll every 10s for real-time updates
  });

  return {
    courseProgress: data?.courseProgress,
    sectionProgresses: data?.sectionProgresses || [],
    loading,
    error,
    refetch
  };
}
```

**Usage:**
```typescript
// app/learn/[courseId]/page.tsx
'use client';

import { useCourseProgress } from '@/hooks/useCourseProgress';

export default function LearningPage({
  params
}: {
  params: { courseId: string }
}) {
  const {
    courseProgress,
    sectionProgresses,
    loading
  } = useCourseProgress(params.courseId);

  if (loading) return <Spinner />;

  return (
    <div>
      {/* Progress bar */}
      <ProgressBar
        percentage={courseProgress?.completionPercentage || 0}
      />

      {/* Section list with progress */}
      <div className="sections">
        {sectionProgresses.map(progress => (
          <SectionRow
            key={progress.id}
            section={progress.section}
            completed={progress.completed}
            timeSpent={progress.timeSpent}
          />
        ))}
      </div>
    </div>
  );
}
```

---

### **5. useMyCertificates - Certificate Viewer**

```typescript
// eduweb/src/hooks/useMyCertificates.ts

import { useAccount } from 'wagmi';
import { useGetMyCertificatesQuery } from '@/generated/graphql';

export function useMyCertificates() {
  const { address } = useAccount();

  const { data, loading, error, refetch } = useGetMyCertificatesQuery({
    variables: {
      ownerAddress: address?.toLowerCase() || ''
    },
    skip: !address
  });

  const certificates = data?.certificates || [];

  return {
    certificates,
    hasCertificate: certificates.length > 0,
    loading,
    error,
    refetch
  };
}
```

---

### **6. useTeacherAnalytics - Teacher Dashboard**

```typescript
// eduweb/src/hooks/useTeacherAnalytics.ts

import { useAccount } from 'wagmi';
import { useGetTeacherStatsQuery } from '@/generated/graphql';
import { formatEther } from 'viem';

export function useTeacherAnalytics() {
  const { address } = useAccount();

  const { data, loading, error, refetch } = useGetTeacherStatsQuery({
    variables: {
      creatorAddress: address?.toLowerCase() || ''
    },
    skip: !address,
    pollInterval: 60000 // Poll every minute
  });

  const stats = data?.teacherStats;
  const revenues = data?.revenues || [];

  // Calculate total revenue in MANTA
  const totalRevenueManta = stats
    ? parseFloat(formatEther(BigInt(stats.totalRevenue)))
    : 0;

  return {
    stats,
    revenues,
    totalRevenueManta,
    loading,
    error,
    refetch
  };
}
```

**Usage:**
```typescript
// app/teacher/dashboard/page.tsx
'use client';

import { useTeacherAnalytics } from '@/hooks/useTeacherAnalytics';

export default function TeacherDashboard() {
  const { stats, revenues, totalRevenueManta, loading } = useTeacherAnalytics();

  if (loading) return <Spinner />;
  if (!stats) return <EmptyState />;

  return (
    <div>
      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={`${totalRevenueManta.toFixed(2)} MANTA`}
        />
        <StatCard
          label="Total Students"
          value={stats.totalStudents}
        />
        <StatCard
          label="Active Courses"
          value={stats.totalActiveCourses}
        />
        <StatCard
          label="Avg Rating"
          value={`${(stats.averageRating / 10000).toFixed(1)} ⭐`}
        />
      </div>

      {/* Revenue history */}
      <div className="mt-8">
        <h2>Recent Revenue</h2>
        <RevenueTable revenues={revenues} />
      </div>
    </div>
  );
}
```

---

## 🗄️ Cache Management

### **1. Optimistic Updates**

```typescript
// eduweb/src/hooks/useOptimisticEnrollment.ts

import { useApolloClient } from '@apollo/client';
import {
  GetMyEnrolledCoursesDocument,
  GetMyEnrolledCoursesQuery
} from '@/generated/graphql';

export function useOptimisticEnrollment() {
  const client = useApolloClient();

  const addOptimisticEnrollment = (
    studentAddress: string,
    courseId: string,
    transactionHash: string
  ) => {
    // Read current cache
    const existing = client.readQuery<GetMyEnrolledCoursesQuery>({
      query: GetMyEnrolledCoursesDocument,
      variables: { studentAddress: studentAddress.toLowerCase() }
    });

    if (!existing) return;

    // Add optimistic license
    const optimisticLicense = {
      __typename: 'License' as const,
      id: `${studentAddress.toLowerCase()}-${courseId}`,
      tokenId: 'pending',
      durationMonths: 1,
      expiryTimestamp: String(Date.now() / 1000 + 30 * 24 * 60 * 60),
      purchasedAt: String(Date.now() / 1000),
      pricePaid: '0',
      course: {
        __typename: 'Course' as const,
        id: courseId,
        title: 'Loading...',
        description: '',
        thumbnailCID: '',
        creator: '',
        creatorName: '',
        category: 'OTHER' as const,
        difficulty: 'BEGINNER' as const,
        sections: []
      }
    };

    // Write updated cache
    client.writeQuery({
      query: GetMyEnrolledCoursesDocument,
      variables: { studentAddress: studentAddress.toLowerCase() },
      data: {
        licenses: [optimisticLicense, ...existing.licenses]
      }
    });
  };

  return { addOptimisticEnrollment };
}
```

---

### **2. Manual Cache Updates**

```typescript
// eduweb/src/hooks/useRefetchOnBlockchain.ts

import { useEffect } from 'react';
import { useWatchContractEvent } from 'wagmi';
import { useApolloClient } from '@apollo/client';
import { courseLicenseABI } from '@/abis/CourseLicense';

export function useRefetchOnBlockchain() {
  const client = useApolloClient();

  // Listen to LicenseMinted event
  useWatchContractEvent({
    address: process.env.NEXT_PUBLIC_COURSE_LICENSE_ADDRESS as `0x${string}`,
    abi: courseLicenseABI,
    eventName: 'LicenseMinted',
    onLogs(logs) {
      console.log('LicenseMinted event detected, refetching...');

      // Refetch all queries
      client.refetchQueries({
        include: ['GetMyEnrolledCourses', 'GetCourseDetails']
      });
    }
  });

  // Listen to CourseCompleted event
  useWatchContractEvent({
    address: process.env.NEXT_PUBLIC_PROGRESS_TRACKER_ADDRESS as `0x${string}`,
    abi: progressTrackerABI,
    eventName: 'CourseCompleted',
    onLogs(logs) {
      console.log('CourseCompleted event detected, refetching...');

      client.refetchQueries({
        include: ['GetMyCourseProgress', 'GetMyCertificates']
      });
    }
  });
}
```

---

### **3. Polling Configuration**

```typescript
// eduweb/src/hooks/usePollingConfig.ts

import { useEffect } from 'react';
import { useApolloClient } from '@apollo/client';

export function usePollingConfig() {
  const client = useApolloClient();

  useEffect(() => {
    // Stop polling when tab is not visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        client.stop();
      } else {
        client.reFetchObservableQueries();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [client]);
}
```

---

## 📦 Complete Implementation

### **Directory Structure:**

```
eduweb/src/
├── app/
│   ├── courses/
│   │   └── [id]/
│   │       └── page.tsx
│   ├── learn/
│   │   └── [courseId]/
│   │       └── page.tsx
│   ├── student/
│   │   └── dashboard/
│   │       └── page.tsx
│   ├── teacher/
│   │   └── dashboard/
│   │       └── page.tsx
│   ├── certificate/
│   │   └── [tokenId]/
│   │       └── page.tsx
│   ├── providers.tsx
│   └── layout.tsx
│
├── components/
│   ├── CourseCard.tsx
│   ├── EnrolledCourseCard.tsx
│   ├── SectionRow.tsx
│   ├── ProgressBar.tsx
│   ├── CertificateViewer.tsx
│   └── RevenueTable.tsx
│
├── hooks/
│   ├── useCourses.ts
│   ├── useCourseDetails.ts
│   ├── useMyEnrollments.ts
│   ├── useCourseProgress.ts
│   ├── useMyCertificates.ts
│   ├── useTeacherAnalytics.ts
│   ├── useOptimisticEnrollment.ts
│   ├── useRefetchOnBlockchain.ts
│   └── usePollingConfig.ts
│
├── graphql/
│   └── queries/
│       ├── courses.graphql
│       ├── student.graphql
│       ├── teacher.graphql
│       └── certificate.graphql
│
├── generated/
│   └── graphql.ts
│
├── lib/
│   └── apollo-client.ts
│
└── services/
    └── goldsky/
        ├── index.ts
        └── types.ts
```

---

### **Complete Service Implementation:**

```typescript
// eduweb/src/services/goldsky/index.ts

import { apolloClient } from '@/lib/apollo-client';
import {
  GetActiveCoursesDocument,
  GetCourseDetailsDocument,
  GetMyEnrolledCoursesDocument,
  GetMyCourseProgressDocument,
  GetMyCertificatesDocument,
  GetTeacherStatsDocument,
  VerifyCertificateDocument
} from '@/generated/graphql';

export class GoldskyService {
  /**
   * Fetch active courses with pagination
   */
  static async fetchCourses(first: number, skip: number) {
    const { data } = await apolloClient.query({
      query: GetActiveCoursesDocument,
      variables: { first, skip }
    });

    return data.courses;
  }

  /**
   * Fetch single course details
   */
  static async fetchCourseDetails(courseId: string) {
    const { data } = await apolloClient.query({
      query: GetCourseDetailsDocument,
      variables: { courseId }
    });

    return data.course;
  }

  /**
   * Fetch student enrollments
   */
  static async fetchMyEnrollments(studentAddress: string) {
    const { data } = await apolloClient.query({
      query: GetMyEnrolledCoursesDocument,
      variables: { studentAddress: studentAddress.toLowerCase() }
    });

    return data.licenses;
  }

  /**
   * Fetch course progress for student
   */
  static async fetchCourseProgress(studentAddress: string, courseId: string) {
    const { data } = await apolloClient.query({
      query: GetMyCourseProgressDocument,
      variables: {
        studentAddress: studentAddress.toLowerCase(),
        courseId
      }
    });

    return {
      courseProgress: data.courseProgress,
      sectionProgresses: data.sectionProgresses
    };
  }

  /**
   * Fetch student certificates
   */
  static async fetchMyCertificates(ownerAddress: string) {
    const { data } = await apolloClient.query({
      query: GetMyCertificatesDocument,
      variables: { ownerAddress: ownerAddress.toLowerCase() }
    });

    return data.certificates;
  }

  /**
   * Fetch teacher analytics
   */
  static async fetchTeacherStats(creatorAddress: string) {
    const { data } = await apolloClient.query({
      query: GetTeacherStatsDocument,
      variables: { creatorAddress: creatorAddress.toLowerCase() }
    });

    return {
      stats: data.teacherStats,
      revenues: data.revenues
    };
  }

  /**
   * Verify certificate by token ID
   */
  static async verifyCertificate(tokenId: string) {
    const { data } = await apolloClient.query({
      query: VerifyCertificateDocument,
      variables: { tokenId }
    });

    return data.certificate;
  }
}
```

---

## ⚡ Performance Optimization

### **1. Lazy Query Loading**

```typescript
// Only load queries when needed
import { useLazyQuery } from '@apollo/client';
import { GetCourseDetailsDocument } from '@/generated/graphql';

function CourseModal() {
  const [getCourse, { data, loading }] = useLazyQuery(GetCourseDetailsDocument);

  const handleOpen = (courseId: string) => {
    getCourse({ variables: { courseId } });
  };

  return (
    <button onClick={() => handleOpen('1')}>
      View Course
    </button>
  );
}
```

---

### **2. Batch Queries**

```typescript
// Batch multiple queries in one request
import { useQueries } from '@apollo/client';

function Dashboard() {
  const results = useQueries([
    { query: GetMyEnrolledCoursesDocument, variables: { studentAddress } },
    { query: GetMyCertificatesDocument, variables: { ownerAddress } },
    { query: GetTeacherStatsDocument, variables: { creatorAddress } }
  ]);

  const [enrollments, certificates, stats] = results;

  return <div>...</div>;
}
```

---

### **3. Persisted Queries**

```typescript
// eduweb/src/lib/apollo-persisted-queries.ts

import { createPersistedQueryLink } from '@apollo/client/link/persisted-queries';
import { sha256 } from 'crypto-hash';

const persistedQueriesLink = createPersistedQueryLink({
  sha256,
  useGETForHashedQueries: true
});

// Add to Apollo Client link chain
export const apolloClient = new ApolloClient({
  link: from([persistedQueriesLink, httpLink]),
  cache: new InMemoryCache()
});
```

---

## 🧪 Testing

```typescript
// eduweb/src/__tests__/hooks/useCourses.test.ts

import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { useCourses } from '@/hooks/useCourses';
import { GetActiveCoursesDocument } from '@/generated/graphql';

const mocks = [
  {
    request: {
      query: GetActiveCoursesDocument,
      variables: { first: 20, skip: 0 }
    },
    result: {
      data: {
        courses: [
          {
            id: '1',
            title: 'Test Course',
            description: 'Test description',
            // ... other fields
          }
        ]
      }
    }
  }
];

describe('useCourses', () => {
  it('should fetch courses', async () => {
    const { result } = renderHook(() => useCourses(), {
      wrapper: ({ children }) => (
        <MockedProvider mocks={mocks}>
          {children}
        </MockedProvider>
      )
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.courses).toHaveLength(1);
    expect(result.current.courses[0].title).toBe('Test Course');
  });
});
```

---

## ✅ Integration Checklist

- [ ] Apollo Client configured and connected
- [ ] Environment variables set (NEXT_PUBLIC_GOLDSKY_ENDPOINT)
- [ ] GraphQL queries created in .graphql files
- [ ] Code generation configured (codegen.yml)
- [ ] Types generated (npm run codegen)
- [ ] Custom hooks implemented
- [ ] Cache policies configured
- [ ] Polling strategies implemented
- [ ] Error handling in place
- [ ] Loading states handled
- [ ] Optimistic updates working
- [ ] Blockchain event listeners active
- [ ] Tests written and passing

---

## 🎉 Conclusion

**You now have a complete Goldsky integration!**

**What you've built:**
- ✅ Real-time blockchain data indexing
- ✅ Fast GraphQL queries for frontend
- ✅ Webhook notifications for events
- ✅ TypeScript type safety
- ✅ Optimized caching and polling
- ✅ Production-ready infrastructure

**Performance Benefits:**
- 6x faster than standard subgraphs
- <100ms query response times
- Real-time updates via webhooks
- 99.9%+ uptime guarantee

---

## 📚 Complete Documentation Index

1. **[Part 1: Introduction & Setup](./PART-1-INTRODUCTION-AND-SETUP.md)**
   - What is Goldsky
   - Why use it for EduVerse
   - CLI installation and account setup

2. **[Part 2: Subgraph Schema Design](./PART-2-SUBGRAPH-SCHEMA-DESIGN.md)**
   - Event mapping (27 events)
   - GraphQL schema design
   - No-code configuration

3. **[Part 3: Deployment Guide](./PART-3-DEPLOYMENT-GUIDE.md)**
   - ABI extraction
   - Configuration setup
   - Deployment commands

4. **[Part 4: GraphQL Queries](./PART-4-GRAPHQL-QUERIES.md)**
   - Ready-to-use queries
   - Filtering and pagination
   - Query optimization

5. **[Part 5: Webhook Integration](./PART-5-WEBHOOK-INTEGRATION.md)**
   - Webhook endpoint setup
   - Event processing
   - Real-time notifications

6. **[Part 6: Frontend Integration](./PART-6-FRONTEND-INTEGRATION.md)** ← You are here
   - Apollo Client setup
   - Custom React hooks
   - Production implementation

---

**Author**: EduVerse Development Team
**Last Updated**: October 20, 2025
**Version**: 1.0.0

---

**Need Help?**
- Goldsky Docs: https://docs.goldsky.com
- EduVerse Repository: https://github.com/yourusername/eduverse
- Discord Support: https://discord.gg/eduverse

---

**🎓 Happy Building with EduVerse × Goldsky! 🚀**
