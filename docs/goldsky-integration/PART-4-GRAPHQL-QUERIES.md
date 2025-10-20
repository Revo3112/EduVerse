# EduVerse × Goldsky Integration Guide
## Part 4: GraphQL Queries for Frontend

> **Target Audience**: Frontend Developers, AI Agents
> **Prerequisites**: Parts 1-3 completed, Subgraph deployed
> **Estimated Time**: 25 minutes

> **📌 NOTE**: These queries expand on the existing Certificate queries in `goldsky.service.ts`. You can:
> - Keep existing `getCertificateByTokenId()` and `getUserCertificate()` functions
> - Add new queries for Course, License, and Progress alongside them
> - Gradually migrate to Apollo Client (covered in Part 6) or continue using fetch()

---

## Daftar Isi (TOC) - Part 4

1. [Introduction](#introduction)
   - [Existing Certificate Queries](#existing-certificate-queries)
   - [What This Part Adds](#what-this-part-adds)
   - [Query Examples Overview](#query-examples-overview)
2. [Certificate Queries](#certificate-queries)
   - [Get Certificate by Token ID](#get-certificate-by-token-id)
   - [Get User Certificates](#get-user-certificates)
   - [Search Certificates by Course](#search-certificates-by-course)
   - [Certificate Verification Status](#certificate-verification-status)
3. [Course Queries](#course-queries)
   - [Get Course Details](#get-course-details)
   - [List All Courses](#list-all-courses)
   - [Get Course with Metadata](#get-course-with-metadata)
   - [Get Courses by Owner](#get-courses-by-owner)
   - [Course Rating & Reviews](#course-rating--reviews)
4. [License Queries](#license-queries)
   - [Get User Licenses](#get-user-licenses)
   - [Check Course Access](#check-course-access)
   - [Get License Transfers](#get-license-transfers)
   - [License Expiration Check](#license-expiration-check)
5. [Progress Queries](#progress-queries)
   - [Get Student Progress](#get-student-progress)
   - [Get Lesson Completion Status](#get-lesson-completion-status)
   - [Get Course Completion Rate](#get-course-completion-rate)
   - [Track Lesson Views](#track-lesson-views)
6. [Advanced Combined Queries](#advanced-combined-queries)
   - [Student Dashboard Query](#student-dashboard-query)
   - [Course Instructor Dashboard](#course-instructor-dashboard)
   - [Certificate Issuance Check](#certificate-issuance-check)
   - [Platform Admin Analytics](#platform-admin-analytics)
7. [Performance Optimization](#performance-optimization)
   - [Pagination Best Practices](#pagination-best-practices)
   - [Query Complexity Management](#query-complexity-management)
   - [Caching Strategies](#caching-strategies)
   - [Error Handling](#error-handling)
8. [Testing & Debugging](#testing--debugging)
   - [GraphQL Playground](#graphql-playground)
   - [Query Validation](#query-validation)
   - [Mock Data for Testing](#mock-data-for-testing)
9. [Troubleshooting](#troubleshooting)
10. [Next Steps](#next-steps)

---

## Introduction

Part ini menyediakan **library lengkap GraphQL queries** untuk mengambil data dari Goldsky Subgraph EduVerse yang telah di-deploy (lihat Part 3).

### Existing Certificate Queries

**Your codebase already has certificate queries in:**
```
eduweb/src/services/goldsky.service.ts
```

**Existing functions:**
- `getCertificateByTokenId(tokenId: string)` - Fetch single certificate
- `getUserCertificate(walletAddress: string)` - Get user's certificates
- Uses `fetch()` directly to Goldsky API endpoint

**These continue to work perfectly fine.** You can:
1. Keep using them for certificate operations
2. Add new queries from this guide for Course/License/Progress
3. Optionally migrate certificates to Apollo Client later (Part 6)

### What This Part Adds

This guide expands beyond certificates to cover:
- **Course Queries**: Course details, metadata, ratings, ownership
- **License Queries**: User licenses, access verification, transfers
- **Progress Queries**: Lesson completion, student progress tracking
- **Combined Queries**: Dashboard aggregations, analytics

### Query Examples Overview

---

## 📖 GraphQL Query Basics

### **Goldsky Endpoint Structure:**

```typescript
// Production endpoint (recommended for frontend)
const GOLDSKY_ENDPOINT = 'https://api.goldsky.com/api/public/project_XXX/subgraphs/eduverse-lms/prod/gn';

// Staging endpoint (for testing)
const GOLDSKY_ENDPOINT_STAGING = 'https://api.goldsky.com/api/public/project_XXX/subgraphs/eduverse-lms/staging/gn';
```

### **Basic Query Structure:**

```graphql
query QueryName($variable: Type!) {
  entityName(
    where: { field: $variable }
    orderBy: fieldName
    orderDirection: desc
    first: 10
    skip: 0
  ) {
    id
    field1
    field2
    nestedEntity {
      id
      nestedField
    }
  }
}
```

### **Common GraphQL Operators:**

```graphql
# Filtering Operators:
where: {
  id: "1"                    # Exact match
  title_contains: "Web3"     # Contains text
  pricePerMonth_gt: 1000     # Greater than
  pricePerMonth_gte: 1000    # Greater than or equal
  pricePerMonth_lt: 5000     # Less than
  pricePerMonth_lte: 5000    # Less than or equal
  isActive: true             # Boolean
  creator_in: [address1, address2]  # In array
}

# Sorting:
orderBy: createdAt
orderDirection: desc  # or asc

# Pagination:
first: 20   # Limit results
skip: 0     # Offset
```

---

## 🔍 Course Discovery Queries

### **1. Browse All Active Courses**

```graphql
query BrowseActiveCourses($first: Int!, $skip: Int!) {
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

    # Analytics
    totalEnrollments
    averageRating
    totalRatings

    # Timestamps
    createdAt
    updatedAt

    # Relationships
    sections {
      id
      title
      duration
    }
  }
}
```

**Variables:**
```json
{
  "first": 20,
  "skip": 0
}
```

**Use Case**: Homepage course listing, course catalog

---

### **2. Filter Courses by Category**

```graphql
query CoursesByCategory(
  $category: CourseCategory!
  $first: Int!
  $skip: Int!
) {
  courses(
    where: {
      isActive: true
      category: $category
    }
    orderBy: averageRating
    orderDirection: desc
    first: $first
    skip: $skip
  ) {
    id
    title
    thumbnailCID
    creator
    creatorName
    pricePerMonth
    category
    difficulty
    averageRating
    totalRatings
    totalEnrollments

    sections {
      id
    }
  }
}
```

**Variables:**
```json
{
  "category": "WEB3_DEVELOPMENT",
  "first": 20,
  "skip": 0
}
```

**Available Categories:**
```typescript
enum CourseCategory {
  PROGRAMMING
  WEB3_DEVELOPMENT
  BLOCKCHAIN_BASICS
  SMART_CONTRACTS
  DEFI
  NFTS
  DAOS
  SECURITY
  DESIGN
  MARKETING
  BUSINESS
  DATA_SCIENCE
  ARTIFICIAL_INTELLIGENCE
  MOBILE_DEVELOPMENT
  GAME_DEVELOPMENT
  OTHER
}
```

---

### **3. Search Courses by Title**

```graphql
query SearchCourses(
  $searchTerm: String!
  $first: Int!
) {
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

**Variables:**
```json
{
  "searchTerm": "smart contract",
  "first": 10
}
```

---

### **4. Get Course Details with Full Sections**

```graphql
query CourseDetails($courseId: ID!) {
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

    # Analytics
    totalEnrollments
    averageRating
    totalRatings
    totalRevenue

    # Timestamps
    createdAt
    updatedAt

    # Complete sections list (ordered by orderId)
    sections(orderBy: orderId, orderDirection: asc) {
      id
      sectionId
      orderId
      title
      contentCID
      duration
      createdAt
    }

    # Recent ratings
    ratings(first: 10, orderBy: ratedAt, orderDirection: desc) {
      user
      rating
      ratedAt
    }
  }
}
```

**Variables:**
```json
{
  "courseId": "1"
}
```

**Use Case**: Course detail page, learning page

---

### **5. Get Top Rated Courses**

```graphql
query TopRatedCourses($first: Int!) {
  courses(
    where: {
      isActive: true
      totalRatings_gte: 5  # Minimum 5 ratings
    }
    orderBy: averageRating
    orderDirection: desc
    first: $first
  ) {
    id
    title
    thumbnailCID
    creator
    creatorName
    pricePerMonth
    category
    averageRating
    totalRatings
    totalEnrollments
    createdAt
  }
}
```

**Variables:**
```json
{
  "first": 10
}
```

**Use Case**: "Top Rated" section, recommendations

---

### **6. Get Trending Courses (Most Enrolled)**

```graphql
query TrendingCourses($first: Int!, $since: BigInt!) {
  courses(
    where: {
      isActive: true
      createdAt_gte: $since
    }
    orderBy: totalEnrollments
    orderDirection: desc
    first: $first
  ) {
    id
    title
    thumbnailCID
    creator
    creatorName
    pricePerMonth
    category
    totalEnrollments
    averageRating
    createdAt
  }
}
```

**Variables:**
```json
{
  "first": 10,
  "since": "1704067200"
}
```

**Use Case**: "Trending Now" section, new courses

---

## 🎓 Student Dashboard Queries

### **1. My Enrolled Courses (Active Licenses)**

```graphql
query MyEnrolledCourses($studentAddress: Bytes!) {
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

    # Course details
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
```

**Variables:**
```json
{
  "studentAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Use Case**: "My Courses" page, active learning dashboard

---

### **2. My Course Progress**

```graphql
query MyCourseProgress(
  $studentAddress: Bytes!
  $courseId: ID!
) {
  # Overall course progress
  courseProgress(id: "${studentAddress}-${courseId}") {
    id
    totalSections
    completedSections
    completionPercentage
    isCompleted
    completedAt
    startedAt
    lastActivityAt

    # Course details
    course {
      id
      title
      thumbnailCID
    }
  }

  # Section-by-section progress
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
```

**Variables:**
```json
{
  "studentAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "courseId": "1"
}
```

**Use Case**: Learning page progress tracking, completion status

---

### **3. My Completed Courses**

```graphql
query MyCompletedCourses($studentAddress: Bytes!) {
  courseProgresses(
    where: {
      student: $studentAddress
      isCompleted: true
    }
    orderBy: completedAt
    orderDirection: desc
  ) {
    id
    completionPercentage
    completedAt
    startedAt

    course {
      id
      title
      thumbnailCID
      creator
      creatorName
      category
      difficulty

      # Check if license is still active
      licenses(where: { student: $studentAddress }) {
        id
        isActive
        expiryTimestamp
      }
    }
  }
}
```

**Variables:**
```json
{
  "studentAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Use Case**: "Completed Courses" section, certificate eligibility check

---

### **4. My Certificates**

```graphql
query MyCertificate($ownerAddress: Bytes!) {
  certificates(
    where: { owner: $ownerAddress }
  ) {
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

    # Individual course certificates
    courseCertificates(orderBy: addedAt, orderDirection: asc) {
      id
      addedAt
      completedAt
      pricePaid
      ipfsCIDAtAddition

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

**Variables:**
```json
{
  "ownerAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Use Case**: "My Certificates" page, certificate viewer

---

### **5. My Learning Statistics**

```graphql
query MyLearningStats($studentAddress: Bytes!) {
  studentStats(id: $studentAddress) {
    id
    student

    # Course Metrics
    totalCoursesEnrolled
    totalCoursesCompleted
    coursesInProgress

    # Section Metrics
    totalSectionsCompleted

    # Certificate Metrics
    hasCertificate
    certificateId
    totalCoursesInCertificate

    # Revenue Metrics
    totalSpent

    # Activity Metrics
    lastActivityAt
    firstActivityAt
  }
}
```

**Variables:**
```json
{
  "studentAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Use Case**: Profile page, gamification, achievements

---

### **6. Check License Status for Course**

```graphql
query CheckLicenseStatus(
  $studentAddress: Bytes!
  $courseId: ID!
) {
  license(id: "${studentAddress}-${courseId}") {
    id
    tokenId
    durationMonths
    expiryTimestamp
    isActive
    isExpired
    purchasedAt
    lastRenewedAt
    timesRenewed
    pricePaid
    totalPaid

    course {
      id
      title
      pricePerMonth
    }

    renewalHistory(orderBy: renewedAt, orderDirection: desc) {
      id
      durationMonths
      pricePaid
      renewedAt
      newExpiryTimestamp
    }
  }
}
```

**Variables:**
```json
{
  "studentAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "courseId": "1"
}
```

**Use Case**: Enroll modal, renewal prompt, access control

---

## 👨‍🏫 Teacher Analytics Queries

### **1. My Courses as Teacher**

```graphql
query MyCreatedCourses($creatorAddress: Bytes!) {
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

    # Analytics
    totalEnrollments
    totalRevenue
    averageRating
    totalRatings

    # Timestamps
    createdAt
    updatedAt

    # Section count
    sections {
      id
    }
  }
}
```

**Variables:**
```json
{
  "creatorAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Use Case**: "My Courses" teacher dashboard

---

### **2. Course Revenue Breakdown**

```graphql
query CourseRevenue($courseId: ID!) {
  # Total revenue for course
  course(id: $courseId) {
    id
    title
    totalRevenue
    totalEnrollments
  }

  # Revenue events breakdown
  revenues(
    where: { course: $courseId }
    orderBy: timestamp
    orderDirection: desc
    first: 100
  ) {
    id
    creator
    amount
    revenueType
    timestamp
    transactionHash
  }
}
```

**Variables:**
```json
{
  "courseId": "1"
}
```

**Use Case**: Teacher revenue analytics, financial reports

---

### **3. Total Teacher Revenue**

```graphql
query TeacherRevenue($creatorAddress: Bytes!) {
  teacherStats(id: $creatorAddress) {
    id
    creator

    # Course Metrics
    totalCoursesCreated
    totalActiveCourses

    # Student Metrics
    totalStudents
    totalEnrollments

    # Revenue Metrics
    totalRevenue
    licenseRevenue
    certificateRevenue

    # Rating Metrics
    averageRating
    totalRatings

    # Activity
    lastCourseCreatedAt
    firstCourseCreatedAt
  }

  # Recent revenue events
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

**Variables:**
```json
{
  "creatorAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Use Case**: Teacher dashboard homepage, revenue summary

---

### **4. Course Enrollment Analytics**

```graphql
query CourseEnrollmentAnalytics($courseId: ID!) {
  course(id: $courseId) {
    id
    title
    totalEnrollments

    # All licenses for this course
    licenses(
      orderBy: purchasedAt
      orderDirection: desc
    ) {
      id
      student
      purchasedAt
      pricePaid
      durationMonths
      isActive
      isExpired
      expiryTimestamp
      timesRenewed
    }
  }
}
```

**Variables:**
```json
{
  "courseId": "1"
}
```

**Use Case**: Enrollment trends, active vs expired students

---

### **5. Course Completion Rate**

```graphql
query CourseCompletionRate($courseId: ID!) {
  # Total enrolled students
  licenses(where: { course: $courseId }) {
    id
    student
  }

  # Students who completed
  courseProgresses(
    where: {
      course: $courseId
      isCompleted: true
    }
  ) {
    id
    student
    completedAt
  }
}
```

**Variables:**
```json
{
  "courseId": "1"
}
```

**Calculation:**
```typescript
const completionRate = (completedCount / totalEnrolled) * 100;
```

**Use Case**: Course quality metrics, teacher dashboard

---

### **6. Course Ratings Analysis**

```graphql
query CourseRatingsAnalysis($courseId: ID!) {
  course(id: $courseId) {
    id
    title
    averageRating
    totalRatings

    # Individual ratings
    ratings(
      orderBy: ratedAt
      orderDirection: desc
    ) {
      id
      user
      rating
      ratedAt
      updatedAt
      transactionHash
    }
  }
}
```

**Variables:**
```json
{
  "courseId": "1"
}
```

**Use Case**: Review management, rating distribution

---

## 🏆 Certificate Verification Queries

### **1. Verify Certificate by Token ID**

```graphql
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

    # All courses in certificate
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

**Variables:**
```json
{
  "tokenId": "1"
}
```

**Use Case**: QR code scanning, certificate verification page

---

### **2. Get Certificate QR Data**

```graphql
query CertificateQRData($tokenId: BigInt!) {
  certificate(id: $tokenId) {
    id
    tokenId
    recipientName
    baseRoute
    ipfsCID
    isValid
    totalCoursesCompleted
    issuedAt

    courseCertificates {
      course {
        title
      }
      completedAt
    }
  }
}
```

**Variables:**
```json
{
  "tokenId": "1"
}
```

**QR Code Data Format:**
```typescript
const qrData = {
  url: `${baseRoute}/${tokenId}`,
  recipient: recipientName,
  courses: totalCoursesCompleted,
  verified: isValid,
  issued: new Date(issuedAt * 1000)
};
```

---

## 🚀 Advanced Query Patterns

### **1. Pagination with Cursor**

```typescript
// Instead of skip-based pagination (slow for large datasets)
// Use cursor-based pagination (fast and efficient)

const PAGE_SIZE = 20;

// First page
query FirstPage {
  courses(
    where: { isActive: true }
    orderBy: createdAt
    orderDirection: desc
    first: 20
  ) {
    id
    createdAt  # Use as cursor
    title
    # ... other fields
  }
}

// Next page (use last item's createdAt as cursor)
query NextPage($cursor: BigInt!) {
  courses(
    where: {
      isActive: true
      createdAt_lt: $cursor  # Less than cursor
    }
    orderBy: createdAt
    orderDirection: desc
    first: 20
  ) {
    id
    createdAt
    title
  }
}
```

---

### **2. Multi-Filter Complex Query**

```graphql
query ComplexCourseSearch(
  $categories: [CourseCategory!]!
  $difficulties: [CourseDifficulty!]!
  $minPrice: BigInt!
  $maxPrice: BigInt!
  $minRating: BigInt!
) {
  courses(
    where: {
      isActive: true
      category_in: $categories
      difficulty_in: $difficulties
      pricePerMonth_gte: $minPrice
      pricePerMonth_lte: $maxPrice
      averageRating_gte: $minRating
      totalRatings_gte: 5
    }
    orderBy: totalEnrollments
    orderDirection: desc
    first: 20
  ) {
    id
    title
    category
    difficulty
    pricePerMonth
    averageRating
    totalRatings
    totalEnrollments
  }
}
```

**Variables:**
```json
{
  "categories": ["WEB3_DEVELOPMENT", "SMART_CONTRACTS"],
  "difficulties": ["BEGINNER", "INTERMEDIATE"],
  "minPrice": "0",
  "maxPrice": "1000000000000000000",
  "minRating": "40000"
}
```

---

### **3. Aggregate Data with Fragments**

```graphql
fragment CourseCard on Course {
  id
  title
  thumbnailCID
  creator
  creatorName
  pricePerMonth
  category
  difficulty
  averageRating
  totalRatings
  totalEnrollments
}

query MultipleCourseLists {
  # Top rated courses
  topRated: courses(
    where: { isActive: true, totalRatings_gte: 5 }
    orderBy: averageRating
    orderDirection: desc
    first: 5
  ) {
    ...CourseCard
  }

  # Most enrolled
  trending: courses(
    where: { isActive: true }
    orderBy: totalEnrollments
    orderDirection: desc
    first: 5
  ) {
    ...CourseCard
  }

  # Recently added
  new: courses(
    where: { isActive: true }
    orderBy: createdAt
    orderDirection: desc
    first: 5
  ) {
    ...CourseCard
  }
}
```

---

## ⚡ Performance Optimization

### **1. Only Request Needed Fields**

```graphql
# ❌ BAD: Requesting everything
query BadQuery {
  courses {
    id
    title
    description
    thumbnailCID
    creator
    creatorName
    pricePerMonth
    # ... 20+ fields
    sections {
      # ... all section fields
    }
    licenses {
      # ... all license fields
    }
  }
}

# ✅ GOOD: Only what you need
query GoodQuery {
  courses(first: 20) {
    id
    title
    thumbnailCID
    pricePerMonth
  }
}
```

---

### **2. Use Variables for Dynamic Queries**

```typescript
// ❌ BAD: String interpolation
const query = `
  query {
    course(id: "${courseId}") {
      title
    }
  }
`;

// ✅ GOOD: Use variables
const query = `
  query GetCourse($courseId: ID!) {
    course(id: $courseId) {
      title
    }
  }
`;

const variables = { courseId: "1" };
```

---

### **3. Limit Nested Queries**

```graphql
# ❌ BAD: Deep nesting
query DeepNesting {
  courses {
    licenses {
      course {
        sections {
          # Too deep!
        }
      }
    }
  }
}

# ✅ GOOD: Flat structure
query FlatStructure($courseId: ID!) {
  course(id: $courseId) {
    id
    title
  }

  licenses(where: { course: $courseId }) {
    id
    student
  }

  sections: courseSections(where: { course: $courseId }) {
    id
    title
  }
}
```

---

## 📊 Query Testing Checklist

Before using in production:

- [ ] Test query in GraphiQL playground
- [ ] Verify response time (<500ms for simple queries)
- [ ] Check data structure matches TypeScript types
- [ ] Test with empty results (no data case)
- [ ] Test with maximum pagination (edge case)
- [ ] Validate filtering logic
- [ ] Test sorting in both directions
- [ ] Verify timestamps are in correct format
- [ ] Check addresses are properly formatted (lowercase)
- [ ] Test error handling (invalid IDs, non-existent entities)

---

## 🎯 What's Next?

**Part 5: Webhook Integration** akan membahas:
- Setting up webhook endpoints di Next.js API routes
- Real-time notifications untuk enrollment, completion, ratings
- Event filtering dan processing
- Discord/Telegram/Email notifications
- Webhook security dan validation

---

**Author**: EduVerse Development Team
**Last Updated**: October 20, 2025
**Version**: 1.0.0

---

**Continue to**: [Part 5: Webhook Integration →](./PART-5-WEBHOOK-INTEGRATION.md)
