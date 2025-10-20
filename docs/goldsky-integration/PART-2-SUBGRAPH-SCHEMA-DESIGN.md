# EduVerse × Goldsky Integration Guide
## Part 2: Subgraph Schema Design

> **Target Audience**: AI Agents, Smart Contract Developers
> **Prerequisites**: Part 1 completed, Understanding of GraphQL
> **Estimated Time**: 30 minutes

> **⚠️ NOTE**: This schema **expands** the existing `goldsky-schema.graphql` (Certificate-only) to include **ALL 4 contracts**. The existing Certificate schema remains compatible.

---

## 📚 Table of Contents

1. [Smart Contract Events Overview](#smart-contract-events-overview)
2. [GraphQL Entity Design](#graphql-entity-design)
3. [Entity Relationships](#entity-relationships)
4. [Complete Schema Definition](#complete-schema-definition)
5. [No-Code Configuration](#no-code-configuration)
6. [Event Handler Logic](#event-handler-logic)

---

## 📡 Smart Contract Events Overview

### **EduVerse emits 31 unique events across 4 contracts:**

```typescript
// Event Distribution:
CourseFactory.sol      → 14 events (Course management, sections, ratings, admin)
CourseLicense.sol      → 4 events  (License lifecycle, revenue)
ProgressTracker.sol    → 4 events  (Learning progress)
CertificateManager.sol → 9 events  (Certificate management, fees, updates)
```
```

### **1. CourseFactory Events (14 total)**

#### **Course Management (5 events)**
```solidity
// ✅ GOLDSKY INDEXED - Course Discovery
event CourseCreated(
    uint256 indexed courseId,
    address indexed creator,
    string title,
    uint256 pricePerMonth,
    uint256 timestamp
);

event CourseUpdated(
    uint256 indexed courseId,
    string title,
    uint256 pricePerMonth,
    uint256 timestamp
);
```

#### **Section Management (6 events)**
```solidity
// ✅ GOLDSKY INDEXED - Course Content Structure
event SectionAdded(
    uint256 indexed courseId,
    uint256 indexed sectionId,
    string title,
    string contentCID,
    uint256 duration
);

event SectionUpdated(
    uint256 indexed courseId,
    uint256 indexed sectionId
);

event SectionDeleted(
    uint256 indexed courseId,
    uint256 indexed sectionId
);

event SectionMoved(
    uint256 indexed courseId,
    uint256 indexed fromIndex,
    uint256 indexed toIndex,
    string sectionTitle
);

event SectionsSwapped(
    uint256 indexed courseId,
    uint256 indexA,
    uint256 indexB
);

event SectionsBatchReordered(
    uint256 indexed courseId,
    uint256[] newOrder
);
```

#### **Rating System (4 events)**
```solidity
// ✅ GOLDSKY INDEXED - Course Quality & Discovery
event CourseRated(
    uint256 indexed courseId,
    address indexed user,
    uint256 rating,
    uint256 averageRating
);

event RatingUpdated(
    uint256 indexed courseId,
    address indexed user,
    uint256 oldRating,
    uint256 newRating,
    uint256 averageRating
);

event RatingDeleted(
    uint256 indexed courseId,
    address indexed user,
    uint256 rating
);

event RatingRemoved(
    uint256 indexed courseId,
    address indexed user,
    uint256 rating
);
```

#### **Admin & Moderation (3 events)**
```solidity
// 🆕 NEW - User Management
event UserBlacklisted(
    address indexed user,
    address indexed admin
);

event UserUnblacklisted(
    address indexed user,
    address indexed admin
);

// Note: RatingRemoved is handled in Rating System above
```

### **2. CourseLicense Events (4 total)**

```solidity
// ✅ GOLDSKY INDEXED - Revenue Analytics & Enrollment Tracking
event LicenseMinted(
    uint256 indexed courseId,
    address indexed student,
    uint256 tokenId,
    uint256 durationMonths,
    uint256 expiryTimestamp,
    uint256 pricePaid  // ✅ Revenue tracking
);

event LicenseRenewed(
    uint256 indexed courseId,
    address indexed student,
    uint256 tokenId,
    uint256 durationMonths,
    uint256 expiryTimestamp,
    uint256 pricePaid  // ✅ Revenue tracking
);

// ✅ GOLDSKY INDEXED - License Expiry Analytics
event LicenseExpired(
    uint256 indexed courseId,
    address indexed student,
    uint256 tokenId,
    uint256 expiredAt
);

// ✅ GOLDSKY INDEXED - Teacher Revenue Dashboard
event RevenueRecorded(
    uint256 indexed courseId,
    address indexed creator,
    uint256 amount,
    uint256 timestamp,
    string revenueType  // "LICENSE_MINT" or "LICENSE_RENEWAL"
);
```

### **3. ProgressTracker Events (4 total)**

```solidity
// ✅ GOLDSKY INDEXED - Learning Analytics
event SectionStarted(
    address indexed student,
    uint256 indexed courseId,
    uint256 indexed sectionId,
    uint256 startedAt
);

// ✅ GOLDSKY INDEXED - Completion Tracking
event SectionCompleted(
    address indexed student,
    uint256 indexed courseId,
    uint256 indexed sectionId,
    uint256 completedAt  // ✅ Time-to-completion analytics
);

// ✅ GOLDSKY INDEXED - Certificate Eligibility
event CourseCompleted(
    address indexed student,
    uint256 indexed courseId
);

// Admin-only event (rare usage)
event ProgressReset(
    address indexed student,
    uint256 indexed courseId
);
```

### **4. CertificateManager Events (9 total)**

> **Note**: Existing `goldsky-schema.graphql` already indexes CertificateMinted and CourseAddedToCertificate. This expands to include fee management and administrative events.

```solidity
// ✅ EXISTING IN goldsky-schema.graphql
event CertificateMinted(
    address indexed owner,
    uint256 indexed tokenId,
    string recipientName,
    string ipfsCID,
    bytes32 paymentReceiptHash,
    uint256 timestamp
);

// ✅ EXISTING IN goldsky-schema.graphql
event CourseAddedToCertificate(
    address indexed owner,
    uint256 indexed tokenId,
    uint256 indexed courseId,
    string newIpfsCID,
    bytes32 paymentReceiptHash,
    uint256 timestamp
);

// 🆕 NEW - Certificate Updates
event CertificateUpdated(
    uint256 indexed tokenId,
    string newIpfsCID,
    uint256 timestamp
);

// 🆕 NEW - Payment Tracking
event CertificatePaymentRecorded(
    uint256 indexed tokenId,
    address indexed payer,
    uint256 amount,
    string paymentType
);

// 🆕 NEW - Administrative Events
event CertificateRevoked(
    uint256 indexed tokenId,
    string reason
);

event BaseRouteUpdated(
    uint256 indexed tokenId,
    string newBaseRoute
);

event PlatformNameUpdated(
    string newPlatformName
);

event CourseAdditionFeeUpdated(
    uint256 newFee
);

event CourseCertificatePriceSet(
    uint256 indexed courseId,
    uint256 price,
    address indexed creator
);
```

```solidity
// ✅ GOLDSKY INDEXED - Certificate NFT Tracking
event CertificateMinted(
    address indexed owner,
    uint256 indexed tokenId,
    string recipientName,
    string ipfsCID,
    bytes32 paymentReceiptHash,
    uint256 pricePaid  // ✅ Certificate revenue
);

event CourseAddedToCertificate(
    address indexed owner,
    uint256 indexed tokenId,
    uint256 indexed courseId,
    string newIpfsCID,
    bytes32 paymentReceiptHash,
    uint256 pricePaid  // ✅ Certificate revenue
);

event CertificateUpdated(
    address indexed owner,
    uint256 indexed tokenId,
    string newIpfsCID,
    bytes32 paymentReceiptHash
);

event CertificatePaymentRecorded(
    address indexed payer,
    address indexed owner,
    uint256 indexed tokenId,
    bytes32 paymentReceiptHash
);

event CertificateRevoked(
    uint256 indexed tokenId,
    string reason
);

event BaseRouteUpdated(
    uint256 indexed tokenId,
    string newBaseRoute
);

event PlatformNameUpdated(
    string newPlatformName
);

event CourseAdditionFeeUpdated(
    uint256 newFee
);

event CourseCertificatePriceSet(
    uint256 indexed courseId,
    uint256 price,
    address indexed creator
);
```

---

## 🗄️ GraphQL Entity Design

### **Core Principle: Events → Entities**

```
Smart Contract Event → Subgraph Handler → GraphQL Entity → PostgreSQL
```

### **Entity Architecture:**

```
Root Entities (Primary):
├── Course           (from CourseFactory)
├── CourseSection    (from CourseFactory)
├── License          (from CourseLicense)
├── Progress         (from ProgressTracker)
└── Certificate      (from CertificateManager)

Analytics Entities (Derived):
├── CourseRating     (from CourseFactory events)
├── Revenue          (from License + Certificate events)
├── StudentStats     (aggregated from Progress)
└── TeacherStats     (aggregated from Course + Revenue)

Relationship Entities:
├── CoursePurchase   (student → course)
├── CertificateCourse (certificate → courses)
└── SectionProgress  (student → section)
```

---

## 📊 Complete Schema Definition

### **schema.graphql**

```graphql
# ============================================
# COURSE ENTITIES
# ============================================

"""
Course entity - represents a learning course
Maps to: CourseFactory.CourseCreated event
"""
type Course @entity {
  # Primary Key
  id: ID!  # courseId as string

  # Course Details (from CourseCreated event)
  title: String!
  description: String!
  thumbnailCID: String!  # IPFS CID
  creator: Bytes!  # address
  pricePerMonth: BigInt!  # in wei

  # Metadata
  category: CourseCategory!
  difficulty: CourseDifficulty!
  creatorName: String!

  # Status Flags
  isActive: Boolean!

  # Timestamps
  createdAt: BigInt!
  updatedAt: BigInt!

  # Analytics (computed fields)
  totalEnrollments: BigInt!
  totalRevenue: BigInt!
  averageRating: BigInt!  # scaled by 10000 (e.g., 47500 = 4.75 stars)
  totalRatings: BigInt!

  # Relationships
  sections: [CourseSection!]! @derivedFrom(field: "course")
  licenses: [License!]! @derivedFrom(field: "course")
  ratings: [CourseRating!]! @derivedFrom(field: "course")
  revenues: [Revenue!]! @derivedFrom(field: "course")
}

"""
Course category enum
Maps to: CourseFactory.CourseCategory
"""
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

"""
Course difficulty enum
Maps to: CourseFactory.CourseDifficulty
"""
enum CourseDifficulty {
  BEGINNER
  INTERMEDIATE
  ADVANCED
}

"""
CourseSection entity - represents a section within a course
Maps to: CourseFactory.SectionAdded event
"""
type CourseSection @entity {
  # Composite Primary Key: courseId-sectionId
  id: ID!  # "courseId-sectionId"

  # Section Details
  course: Course!
  sectionId: BigInt!
  orderId: BigInt!  # For ordering sections
  title: String!
  contentCID: String!  # Video IPFS CID
  duration: BigInt!  # in seconds

  # Timestamps
  createdAt: BigInt!
  updatedAt: BigInt!

  # Relationships
  completions: [SectionProgress!]! @derivedFrom(field: "section")
}

# ============================================
# LICENSE ENTITIES
# ============================================

"""
License entity - represents a course license NFT
Maps to: CourseLicense.LicenseMinted event
"""
type License @entity {
  # Composite Primary Key: student-courseId
  id: ID!  # "studentAddress-courseId"

  # License Details
  course: Course!
  student: Bytes!  # address
  tokenId: BigInt!

  # License Terms
  durationMonths: BigInt!
  expiryTimestamp: BigInt!
  isActive: Boolean!

  # Purchase Info
  pricePaid: BigInt!  # wei
  purchasedAt: BigInt!

  # Renewal Tracking
  timesRenewed: BigInt!
  lastRenewedAt: BigInt
  totalPaid: BigInt!  # cumulative wei

  # Status
  isExpired: Boolean!
  expiredAt: BigInt

  # Relationships
  renewalHistory: [LicenseRenewal!]! @derivedFrom(field: "license")
}

"""
LicenseRenewal entity - tracks each renewal
Maps to: CourseLicense.LicenseRenewed event
"""
type LicenseRenewal @entity {
  # Primary Key: txHash-logIndex
  id: ID!

  license: License!
  durationMonths: BigInt!
  pricePaid: BigInt!
  renewedAt: BigInt!
  newExpiryTimestamp: BigInt!

  # Transaction Info
  transactionHash: Bytes!
}

# ============================================
# PROGRESS TRACKING ENTITIES
# ============================================

"""
SectionProgress entity - tracks student progress per section
Maps to: ProgressTracker.SectionCompleted event
"""
type SectionProgress @entity {
  # Composite Primary Key: student-courseId-sectionId
  id: ID!  # "studentAddress-courseId-sectionId"

  # Progress Details
  student: Bytes!
  course: Course!
  section: CourseSection!

  # Completion Status
  completed: Boolean!
  completedAt: BigInt
  startedAt: BigInt  # from SectionStarted event

  # Time Tracking (for analytics)
  timeSpent: BigInt  # completedAt - startedAt
}

"""
CourseProgress entity - aggregated course completion status
Maps to: ProgressTracker.CourseCompleted event
"""
type CourseProgress @entity {
  # Composite Primary Key: student-courseId
  id: ID!  # "studentAddress-courseId"

  student: Bytes!
  course: Course!

  # Completion Metrics
  totalSections: BigInt!
  completedSections: BigInt!
  completionPercentage: BigInt!  # 0-100

  # Status
  isCompleted: Boolean!
  completedAt: BigInt

  # Timestamps
  startedAt: BigInt  # first section started
  lastActivityAt: BigInt  # last section completed

  # Relationships
  sectionProgress: [SectionProgress!]! @derivedFrom(field: "course")
}

# ============================================
# CERTIFICATE ENTITIES
# ============================================

"""
Certificate entity - represents the "One Growing Certificate" NFT
Maps to: CertificateManager.CertificateMinted event
"""
type Certificate @entity {
  # Primary Key: tokenId
  id: ID!

  # Certificate Details
  tokenId: BigInt!
  owner: Bytes!  # recipient address
  recipientName: String!
  platformName: String!

  # IPFS Metadata
  ipfsCID: String!  # Updated each time course is added
  baseRoute: String!  # QR code base URL

  # Status
  isValid: Boolean!
  lifetimeFlag: Boolean!  # Always true

  # Timestamps
  issuedAt: BigInt!
  lastUpdated: BigInt!

  # Courses Tracking
  totalCoursesCompleted: BigInt!
  completedCourses: [BigInt!]!  # Array of courseIds

  # Payment Info
  totalPaid: BigInt!  # Cumulative wei paid for certificate

  # Relationships
  courseCertificates: [CertificateCourse!]! @derivedFrom(field: "certificate")
}

"""
CertificateCourse entity - many-to-many relationship
Maps to: CertificateManager.CourseAddedToCertificate event
"""
type CertificateCourse @entity {
  # Composite Primary Key: certificateId-courseId
  id: ID!  # "tokenId-courseId"

  certificate: Certificate!
  course: Course!

  # Addition Info
  addedAt: BigInt!
  completedAt: BigInt!  # Course completion timestamp
  pricePaid: BigInt!  # wei paid for adding this course

  # Updated Certificate Metadata
  ipfsCIDAtAddition: String!
}

# ============================================
# RATING ENTITIES
# ============================================

"""
CourseRating entity - individual user ratings
Maps to: CourseFactory.CourseRated event
"""
type CourseRating @entity {
  # Composite Primary Key: user-courseId
  id: ID!  # "userAddress-courseId"

  course: Course!
  user: Bytes!
  rating: BigInt!  # 1-5 stars

  # Timestamps
  ratedAt: BigInt!
  updatedAt: BigInt

  # Transaction Info
  transactionHash: Bytes!
}

# ============================================
# REVENUE ANALYTICS ENTITIES
# ============================================

"""
Revenue entity - tracks all revenue events
Maps to: CourseLicense.RevenueRecorded & Certificate events
"""
type Revenue @entity {
  # Primary Key: txHash-logIndex
  id: ID!

  # Revenue Details
  course: Course!
  creator: Bytes!
  amount: BigInt!  # wei
  revenueType: RevenueType!

  # Timestamps
  timestamp: BigInt!

  # Transaction Info
  transactionHash: Bytes!

  # Optional: Link to source entity
  licenseId: String  # if from license
  certificateId: String  # if from certificate
}

enum RevenueType {
  LICENSE_MINT
  LICENSE_RENEWAL
  CERTIFICATE_MINT
  CERTIFICATE_COURSE_ADDITION
}

# ============================================
# ANALYTICS ENTITIES (Aggregated)
# ============================================

"""
StudentStats entity - per-student analytics
Auto-computed from Progress entities
"""
type StudentStats @entity {
  # Primary Key: student address
  id: ID!

  student: Bytes!

  # Course Metrics
  totalCoursesEnrolled: BigInt!
  totalCoursesCompleted: BigInt!
  coursesInProgress: BigInt!

  # Section Metrics
  totalSectionsCompleted: BigInt!

  # Certificate Metrics
  hasCertificate: Boolean!
  certificateId: BigInt
  totalCoursesInCertificate: BigInt!

  # Revenue Metrics
  totalSpent: BigInt!  # Total wei spent

  # Activity Metrics
  lastActivityAt: BigInt!
  firstActivityAt: BigInt!
}

"""
TeacherStats entity - per-teacher analytics
Auto-computed from Course and Revenue entities
"""
type TeacherStats @entity {
  # Primary Key: creator address
  id: ID!

  creator: Bytes!

  # Course Metrics
  totalCoursesCreated: BigInt!
  totalActiveCourses: BigInt!

  # Student Metrics
  totalStudents: BigInt!  # Unique students enrolled
  totalEnrollments: BigInt!  # Total license mints

  # Revenue Metrics
  totalRevenue: BigInt!  # Total wei earned
  licenseRevenue: BigInt!
  certificateRevenue: BigInt!

  # Rating Metrics
  averageRating: BigInt!  # Average across all courses
  totalRatings: BigInt!

  # Activity Metrics
  lastCourseCreatedAt: BigInt!
  firstCourseCreatedAt: BigInt!
}

# ============================================
# GLOBAL PLATFORM STATS
# ============================================

"""
PlatformStats entity - global platform metrics
Singleton entity with id "platform"
"""
type PlatformStats @entity {
  id: ID!  # Always "platform"

  # Course Metrics
  totalCourses: BigInt!
  totalActiveCourses: BigInt!
  totalSections: BigInt!

  # User Metrics
  totalStudents: BigInt!
  totalTeachers: BigInt!

  # License Metrics
  totalLicensesMinted: BigInt!
  totalLicensesRenewed: BigInt!
  totalActiveLicenses: BigInt!

  # Certificate Metrics
  totalCertificatesMinted: BigInt!
  totalCoursesInCertificates: BigInt!

  # Revenue Metrics
  totalPlatformRevenue: BigInt!
  totalCreatorRevenue: BigInt!

  # Activity Metrics
  lastActivityAt: BigInt!

  # Timestamps
  deployedAt: BigInt!
}
```

---

## 🔗 Entity Relationships

### **Visual Entity Relationship Diagram:**

```
┌─────────────────────────────────────────────────────────────────┐
│                      EDUVERSE DATA MODEL                         │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │   Course     │
                    │ (Primary)    │
                    └──────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼───────┐ ┌────▼────┐   ┌─────▼──────┐
    │CourseSection │ │ License │   │CourseRating│
    │(1-to-Many)   │ │(1-to-M) │   │(1-to-Many) │
    └──────┬───────┘ └────┬────┘   └────────────┘
           │              │
           │              │
    ┌──────▼──────────────▼──────┐
    │   SectionProgress          │
    │   (Many-to-Many)           │
    │   student ↔ section        │
    └────────────────────────────┘

                    ┌──────────────┐
                    │ Certificate  │
                    │  (NFT 1:1)   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────────┐
                    │CertificateCourse │
                    │  (Many-to-Many)  │
                    │ cert ↔ course    │
                    └──────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    ANALYTICS AGGREGATIONS                        │
└─────────────────────────────────────────────────────────────────┘

    ┌────────────┐         ┌────────────┐         ┌──────────────┐
    │  Student   │         │  Teacher   │         │  Platform    │
    │   Stats    │         │   Stats    │         │    Stats     │
    │(Per-User)  │         │(Per-Creator)│         │  (Global)    │
    └────────────┘         └────────────┘         └──────────────┘
```

### **Key Relationships:**

1. **Course → CourseSection** (1-to-Many)
   - One course has multiple sections
   - Sections ordered by `orderId`

2. **Course → License** (1-to-Many)
   - One course can have multiple student licenses
   - Each student can have one license per course

3. **Course → CourseRating** (1-to-Many)
   - One course can have multiple ratings
   - Each student can rate once (updateable)

4. **CourseSection → SectionProgress** (1-to-Many)
   - One section can be completed by multiple students
   - Tracks individual completion timestamps

5. **Certificate → CertificateCourse** (1-to-Many)
   - One certificate can contain multiple courses
   - Revolutionary "One Growing Certificate" model

6. **Course → Revenue** (1-to-Many)
   - One course generates multiple revenue events
   - Tracks license + certificate revenue separately

---

## ⚙️ No-Code Configuration

### **eduverse-config.json**

This file enables Goldsky instant subgraph deployment without writing any code:

```json
{
  "version": "1",
  "name": "eduverse-lms",
  "abis": {
    "CourseFactory": {
      "path": "./abis/CourseFactory.json"
    },
    "CourseLicense": {
      "path": "./abis/CourseLicense.json"
    },
    "ProgressTracker": {
      "path": "./abis/ProgressTracker.json"
    },
    "CertificateManager": {
      "path": "./abis/CertificateManager.json"
    }
  },
  "chains": {
    "manta-pacific-sepolia": {
      "rpc": "https://pacific-rpc.sepolia-testnet.manta.network/http",
      "chainId": 3441006
    }
  },
  "instances": [
    {
      "abi": "CourseFactory",
      "address": "0xYOUR_COURSE_FACTORY_ADDRESS",
      "startBlock": 0,
      "chain": "manta-pacific-sepolia"
    },
    {
      "abi": "CourseLicense",
      "address": "0xYOUR_COURSE_LICENSE_ADDRESS",
      "startBlock": 0,
      "chain": "manta-pacific-sepolia"
    },
    {
      "abi": "ProgressTracker",
      "address": "0xYOUR_PROGRESS_TRACKER_ADDRESS",
      "startBlock": 0,
      "chain": "manta-pacific-sepolia"
    },
    {
      "abi": "CertificateManager",
      "address": "0xYOUR_CERTIFICATE_MANAGER_ADDRESS",
      "startBlock": 0,
      "chain": "manta-pacific-sepolia"
    }
  ]
}
```

---

## 🎯 Event Handler Logic

### **Key Indexing Patterns:**

#### **1. Entity Creation Pattern:**
```typescript
// Example: CourseCreated event
handler: {
  CourseCreated(event) {
    // Create new Course entity
    const courseId = event.params.courseId.toString();
    let course = new Course(courseId);

    // Set properties from event
    course.title = event.params.title;
    course.creator = event.params.creator;
    course.pricePerMonth = event.params.pricePerMonth;
    course.createdAt = event.block.timestamp;
    course.isActive = true;

    // Initialize counters
    course.totalEnrollments = BigInt.fromI32(0);
    course.totalRevenue = BigInt.fromI32(0);

    course.save();
  }
}
```

#### **2. Entity Update Pattern:**
```typescript
// Example: CourseRated event
handler: {
  CourseRated(event) {
    // Load existing Course entity
    let course = Course.load(event.params.courseId.toString());

    // Update rating stats
    course.totalRatings = course.totalRatings.plus(BigInt.fromI32(1));
    course.averageRating = event.params.averageRating;

    course.save();

    // Create CourseRating entity
    const ratingId = event.params.user.toHex() + "-" + event.params.courseId.toString();
    let rating = new CourseRating(ratingId);
    rating.course = event.params.courseId.toString();
    rating.user = event.params.user;
    rating.rating = event.params.rating;
    rating.ratedAt = event.block.timestamp;

    rating.save();
  }
}
```

#### **3. Revenue Aggregation Pattern:**
```typescript
// Example: RevenueRecorded event
handler: {
  RevenueRecorded(event) {
    // Create Revenue entity
    const revenueId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
    let revenue = new Revenue(revenueId);

    revenue.course = event.params.courseId.toString();
    revenue.creator = event.params.creator;
    revenue.amount = event.params.amount;
    revenue.revenueType = event.params.revenueType;
    revenue.timestamp = event.params.timestamp;

    revenue.save();

    // Update Course total revenue
    let course = Course.load(event.params.courseId.toString());
    course.totalRevenue = course.totalRevenue.plus(event.params.amount);
    course.save();

    // Update TeacherStats
    let teacherStats = TeacherStats.load(event.params.creator.toHex());
    if (teacherStats == null) {
      teacherStats = new TeacherStats(event.params.creator.toHex());
      teacherStats.totalRevenue = BigInt.fromI32(0);
    }
    teacherStats.totalRevenue = teacherStats.totalRevenue.plus(event.params.amount);
    teacherStats.save();
  }
}
```

---

## ✅ Schema Validation Checklist

Before deploying, verify:

- [ ] All 27 events mapped to entities
- [ ] Entity IDs are unique and deterministic
- [ ] Relationships use correct field names
- [ ] Timestamps use BigInt (not Int)
- [ ] Addresses use Bytes (not String)
- [ ] Enums match Solidity contract enums
- [ ] Analytics entities have aggregation logic
- [ ] No circular dependencies in relationships

---

## 📊 What's Next?

**Part 3: Subgraph Deployment Guide** akan membahas:
- Extracting ABIs from compiled contracts
- Configuring deployment for Manta Pacific
- Running `goldsky subgraph deploy` command
- Verifying deployment and testing GraphQL endpoint
- Setting up tags for prod/staging environments

---

**Author**: EduVerse Development Team
**Last Updated**: October 20, 2025
**Version**: 1.0.0

---

**Continue to**: [Part 3: Subgraph Deployment Guide →](./PART-3-DEPLOYMENT-GUIDE.md)
