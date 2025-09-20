/**
 * ===================================================================================
 * Mock Data Lengkap untuk Platform EduVerse
 * ===================================================================================
 * Deskripsi:
 * File ini menyediakan data mock yang komprehensif untuk frontend aplikasi EduVerse.
 * Struktur data di sini secara ketat mencerminkan struct dan enum yang didefinisikan
 * dalam smart contract berikut:
 * 1. CourseFactory.sol: Untuk data kursus, kategori, tingkat kesulitan, dan rating.
 * 2. CourseLicense.sol: Untuk data lisensi NFT yang dimiliki pengguna.
 * 3. ProgressTracker.sol: Untuk melacak kemajuan belajar pengguna per sesi.
 * 4. CertificateManager.sol: Untuk data sertifikat digital ERC-1155 yang dinamis.
 *
 * Dibuat oleh: Gemini (Ahli Developer Web3)
 * Versi: 2.0.0
 * Terakhir Diperbarui: 7 September 2025
 * ===================================================================================
 */

// ======================================================
// ENUMS & TYPES - Sesuai dengan Smart Contracts
// ======================================================

/**
 * @enum {CourseCategory} - Kategori kursus sesuai CourseFactory.sol
 */
export enum CourseCategory {
  Programming = 0,
  Design = 1,
  Business = 2,
  Marketing = 3,
  DataScience = 4,
  Finance = 5,
  Healthcare = 6,
  Language = 7,
  Arts = 8,
  Mathematics = 9,
  Science = 10,
  Engineering = 11,
  Technology = 12,
  Education = 13,
  Psychology = 14,
  Culinary = 15,
  PersonalDevelopment = 16,
  Legal = 17,
  Sports = 18,
  Other = 19
}

/**
 * @enum {CourseDifficulty} - Tingkat kesulitan kursus sesuai CourseFactory.sol
 */
export enum CourseDifficulty {
  Beginner = 0,
  Intermediate = 1,
  Advanced = 2
}

/**
 * @enum {LicenseStatus} - Status lisensi (digunakan di frontend untuk interpretasi data on-chain)
 */
export enum LicenseStatus {
  Active = 0,
  Expired = 1,
  NotPurchased = 2,
  Suspended = 3 // Untuk kasus lisensi dinonaktifkan oleh admin
}

// ======================================================
// INTERFACES - Mencerminkan Struct di Smart Contracts
// ======================================================

/**
 * @interface Course - Sesuai `Course` struct di CourseFactory.sol
 */
export interface Course {
  id: bigint;                          // uint256 id
  title: string;                       // string title
  description: string;                 // string description
  thumbnailCID: string;                // string thumbnailCID
  creator: `0x${string}`;             // address creator
  creatorName: string;                 // string creatorName
  isActive: boolean;                   // bool isActive
  category: CourseCategory;            // CourseCategory category
  difficulty: CourseDifficulty;        // CourseDifficulty difficulty
  pricePerMonth: bigint;               // uint256 pricePerMonth (dalam Wei)
  createdAt: bigint;                   // uint256 createdAt (Unix timestamp)
}

/**
 * @interface CourseSection - Sesuai `CourseSection` struct di CourseFactory.sol
 */
export interface CourseSection {
  id: bigint;                          // uint256 id (ID unik sesi saat dibuat)
  courseId: bigint;                    // uint256 courseId
  title: string;                       // string title
  contentCID: string;                  // string contentCID
  duration: bigint;                    // uint256 duration (dalam detik)
  orderId: bigint;                     // uint256 orderId (urutan dalam array)
}

/**
 * @interface CourseRating - Sesuai `CourseRating` struct di CourseFactory.sol
 */
export interface CourseRating {
  totalRatings: bigint;                // uint256 totalRatings
  ratingSum: bigint;                   // uint256 ratingSum
  averageRating: bigint;               // uint256 averageRating (skala 10000, misal 45000 -> 4.5)
  userRatings: Map<`0x${string}`, number>; // mapping(address => uint256) userRatings (1-5)
}

/**
 * @interface License - Sesuai `License` struct di CourseLicense.sol
 */
export interface License {
  courseId: bigint;                    // uint256 courseId
  student: `0x${string}`;              // address student
  durationLicense: bigint;             // uint257 durationLicense (dalam bulan)
  expiryTimestamp: bigint;             // uint256 expiryTimestamp (Unix timestamp)
  isActive: boolean;                   // bool isActive
}

/**
 * @interface SectionProgress - Sesuai `SectionProgress` struct di ProgressTracker.sol
 */
export interface SectionProgress {
  courseId: bigint;                    // uint256 courseId
  sectionId: bigint;                   // uint256 sectionId (merujuk pada `orderId` dari CourseSection)
  completed: boolean;                  // bool completed
  completedAt: bigint;                 // uint256 completedAt (Unix timestamp)
}

/**
 * @interface Certificate - Sesuai `Certificate` struct di CertificateManager.sol
 */
export interface Certificate {
  tokenId: bigint;                     // uint256 tokenId
  platformName: string;                // string platformName
  recipientName: string;               // string recipientName
  recipientAddress: `0x${string}`;     // address recipientAddress
  lifetimeFlag: boolean;               // bool lifetimeFlag
  isValid: boolean;                    // bool isValid
  ipfsCID: string;                     // string ipfsCID
  baseRoute: string;                   // string baseRoute (untuk QR code)
  issuedAt: bigint;                    // uint256 issuedAt
  lastUpdated: bigint;                 // uint256 lastUpdated
  totalCoursesCompleted: bigint;       // uint256 totalCoursesCompleted
  paymentReceiptHash: `0x${string}`;   // bytes32 paymentReceiptHash
  completedCourses: bigint[];          // uint256[] completedCourses
}


// =================================================================
// INTERFACES UNTUK FRONTEND - Menggabungkan data untuk kemudahan
// =================================================================

/**
 * @interface EnrichedCourseSection - Gabungan CourseSection dengan metadata video untuk frontend
 */
export interface EnrichedCourseSection extends CourseSection {
  description: string; // Deskripsi tambahan untuk UI
  videoMetadata: {
    thumbnailCID: string;
    qualityOptions: { resolution: string; bitrate: number; size: number }[];
    subtitleLanguages: string[];
    chapters: { title: string; startTime: number; endTime: number }[];
    estimatedSize: number; // dalam MB
  };
}

/**
 * @interface ExtendedCourse - Gabungan data dari berbagai kontrak untuk halaman detail kursus
 */
export interface ExtendedCourse extends Course {
  totalSections: number;
  userProgress: SectionProgress[];
  sections: EnrichedCourseSection[];
  rating: CourseRating;
}


// ======================================================
// HELPER FUNCTIONS - Untuk format data di UI
// ======================================================

export const weiToEth = (wei: bigint): number => {
  return Number(wei) / 1e18;
};

export const getCategoryName = (category: CourseCategory): string => {
  return CourseCategory[category] || 'Unknown';
};

export const getDifficultyName = (difficulty: CourseDifficulty): string => {
  return CourseDifficulty[difficulty] || 'Unknown';
};

export const formatDuration = (seconds: bigint): string => {
  const numSeconds = Number(seconds);
  const h = Math.floor(numSeconds / 3600);
  const m = Math.floor((numSeconds % 3600) / 60);
  const s = Math.floor(numSeconds % 60);
  if (h > 0) return `${h}j ${m}m ${s}d`;
  if (m > 0) return `${m}m ${s}d`;
  return `${s}d`;
};

export const formatPriceInETH = (priceInWei: bigint): string => {
  const priceInEth = weiToEth(priceInWei);
  return `${priceInEth.toFixed(5)} ETH`;
};

/**
 * [FIXED] Mengonversi harga dari Wei ke Rupiah.
 * Sekarang aman melakukan perkalian karena weiToEth mengembalikan number.
 */
export const formatPriceInIDR = (priceInWei: bigint, ethToIdrRate: number): string => {
  if (ethToIdrRate <= 0) {
    return "Rp ...";
  }
  // `priceInEth` sekarang adalah `number`, sehingga operasi perkalian valid.
  const priceInEth = weiToEth(priceInWei);
  const priceInIdr = priceInEth * ethToIdrRate;

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(priceInIdr);
};
// ======================================================
// MOCK DATA GENERATION
// ======================================================

export const MOCK_USER_ADDRESS: `0x${string}` = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

const createMockEnrichedSections = (courseId: bigint, sectionCount: number): EnrichedCourseSection[] => {
  const sectionTitles = [
    "Pengenalan Teknologi Blockchain", "Memahami Fungsi Hash Kriptografi", "Tanda Tangan Digital dan Kriptografi Kunci Publik",
    "Struktur Data dan Pohon Merkle", "Mekanisme Konsensus: PoW vs PoS", "Menyelami Ethereum Virtual Machine (EVM)",
    "Pengembangan Smart Contract dengan Solidity", "Interaksi Kontrak menggunakan Web3.js", "Membangun DApp Pertama Anda",
    "Strategi Pengujian dan Deployment", "Praktik Terbaik Keamanan Smart Contract", "Teknik Optimisasi Gas"
  ];
  const sectionDescriptions = [
    "Selamat datang di dunia teknologi blockchain yang menakjubkan! Di sesi dasar ini, Anda akan menemukan apa yang membuat blockchain revolusioner.",
    "Selami lebih dalam dasar-dasar kriptografi yang membuat blockchain aman. Pelajari tentang fungsi hash dan propertinya.",
    "Kuasai konsep tanda tangan digital dan kriptografi kunci publik. Pahami bagaimana transaksi diverifikasi dan diautentikasi.",
    "Jelajahi pohon Merkle dan struktur data penting lainnya yang digunakan dalam blockchain untuk verifikasi yang efisien.",
    "Bandingkan mekanisme konsensus yang berbeda dan pahami bagaimana jaringan mencapai kesepakatan antara Proof of Work dan Proof of Stake.",
    "Lihat secara komprehensif Ethereum Virtual Machine. Pahami bagaimana smart contract dieksekusi.",
    "Mulai bangun smart contract dengan Solidity. Pelajari sintaks, praktik terbaik, dan pola umum yang digunakan.",
    "Hubungkan smart contract Anda ke aplikasi web menggunakan Web3.js. Bangun frontend interaktif untuk aplikasi blockchain.",
    "Satukan semuanya dengan membangun aplikasi terdesentralisasi lengkap dari smart contract hingga antarmuka pengguna.",
    "Pelajari metodologi pengujian profesional dan strategi deployment untuk aplikasi blockchain yang siap produksi.",
    "Kuasai praktik terbaik keamanan untuk melindungi aplikasi Anda dari kerentanan dan serangan umum.",
    "Optimalkan smart contract Anda untuk efisiensi gas dan pelajari teknik canggih untuk mengurangi biaya transaksi."
  ];

  return Array.from({ length: sectionCount }, (_, index) => {
    const sectionId = BigInt(index);
    return {
      id: BigInt(Number(courseId) * 100 + index),
      courseId: courseId,
      title: sectionTitles[index % sectionTitles.length],
      description: sectionDescriptions[index % sectionDescriptions.length],
      contentCID: "bafybeicmoogk5nmg4uizxyn6i3gh24dc2c7rnpico7ziqoi4llvhqaicli",
      duration: BigInt(1800 + Math.floor(Math.random() * 1200)), // 30-50 menit
      orderId: sectionId,
      videoMetadata: {
        thumbnailCID: "bafybeic3zml2dfde76qfakovud6wamewoa42z23tgliplke54nrwc5cj2y",
        qualityOptions: [
          { resolution: "1080p", bitrate: 4000, size: 720 }, { resolution: "720p", bitrate: 2500, size: 450 },
          { resolution: "480p", bitrate: 1200, size: 280 }
        ],
        subtitleLanguages: ["id", "en", "es"],
        chapters: [
          { title: "Pendahuluan", startTime: 0, endTime: 300 }, { title: "Konsep Inti", startTime: 300, endTime: 1000 },
          { title: "Contoh Praktis", startTime: 1000, endTime: 1500 }, { title: "Ringkasan", startTime: 1500, endTime: 1800 }
        ],
        estimatedSize: 720
      }
    };
  });
};


// ======================================================
// MOCK DATABASE - Inisialisasi Data Lengkap
// ======================================================

export const mockCourses: ExtendedCourse[] = [
  {
    id: BigInt(1),
    title: "Dasar-Dasar Blockchain untuk Pemula",
    description: "Pelajari konsep inti teknologi blockchain, cryptocurrency, dan sistem terdesentralisasi. Sempurna untuk pendatang baru di Web3.",
    thumbnailCID: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    creator: "0x742e8A4C2a9b4f7A76B25e5B8F6a8f9E8A9b4c5D",
    creatorName: "Dr. Sarah Johnson",
    isActive: true,
    category: CourseCategory.Programming,
    difficulty: CourseDifficulty.Beginner,
    pricePerMonth: BigInt("1000000000000000"), // 0.001 ETH
    createdAt: BigInt(1703836800), // 1 Jan 2024
    totalSections: 10,
    sections: createMockEnrichedSections(BigInt(1), 10),
    userProgress: [
      { courseId: BigInt(1), sectionId: BigInt(0), completed: true, completedAt: BigInt(1709856000) },
      { courseId: BigInt(1), sectionId: BigInt(1), completed: true, completedAt: BigInt(1709942400) },
      { courseId: BigInt(1), sectionId: BigInt(2), completed: true, completedAt: BigInt(1710028800) },
      { courseId: BigInt(1), sectionId: BigInt(3), completed: false, completedAt: BigInt(0) }
    ],
    rating: {
      totalRatings: BigInt(150),
      ratingSum: BigInt(690), // (150 * 4.6)
      averageRating: BigInt(46000), // 4.6000
      userRatings: new Map([
          ["0x...", 5],
          [MOCK_USER_ADDRESS, 4]
      ])
    }
  },
  {
    id: BigInt(2),
    title: "Pengembangan Smart Contract Solidity Tingkat Lanjut",
    description: "Kuasai pola Solidity tingkat lanjut, praktik terbaik keamanan, dan teknik optimisasi gas. Bangun smart contract siap produksi.",
    thumbnailCID: "QmUNLLsPACCz1vLxQVkXqqLX5R1X9RVxrK7F2z4B8xCmv8",
    creator: "0x1a2B3c4D5e6F7890aB1c2D3e4F567890aB1c2D3e",
    creatorName: "Alex Chen",
    isActive: true,
    category: CourseCategory.Programming,
    difficulty: CourseDifficulty.Advanced,
    pricePerMonth: BigInt("3000000000000000"), // 0.003 ETH
    createdAt: BigInt(1703923200), // 2 Jan 2024
    totalSections: 12,
    sections: createMockEnrichedSections(BigInt(2), 12),
    userProgress: [
        { courseId: BigInt(2), sectionId: BigInt(0), completed: true, completedAt: BigInt(1709856000) },
        { courseId: BigInt(2), sectionId: BigInt(1), completed: true, completedAt: BigInt(1709942400) },
        { courseId: BigInt(2), sectionId: BigInt(2), completed: true, completedAt: BigInt(1710028800) },
        { courseId: BigInt(2), sectionId: BigInt(3), completed: true, completedAt: BigInt(1710115200) },
        { courseId: BigInt(2), sectionId: BigInt(4), completed: true, completedAt: BigInt(1710201600) },
    ],
    rating: {
        totalRatings: BigInt(210),
        ratingSum: BigInt(1008), // (210 * 4.8)
        averageRating: BigInt(48000), // 4.8000
        userRatings: new Map()
    }
  },
  {
    id: BigInt(3),
    title: "Arsitektur dan Pengembangan Protokol DeFi",
    description: "Rancang dan bangun protokol keuangan terdesentralisasi dari awal. Pelajari tentang AMM, protokol pinjaman, dan strategi yield farming.",
    thumbnailCID: "QmPvP4z9FJiXpKvP2zq8x7Y6B5a1B2c3D4e5F6g7H8i9J",
    creator: "0x9F8e7D6c5B4a3921F8e7D6c5B4a39218F7e6D5c4",
    creatorName: "Maria Rodriguez",
    isActive: false, // Contoh kursus tidak aktif
    category: CourseCategory.Finance,
    difficulty: CourseDifficulty.Intermediate,
    pricePerMonth: BigInt("4000000000000000"), // 0.004 ETH
    createdAt: BigInt(1704009600), // 3 Jan 2024
    totalSections: 8,
    sections: createMockEnrichedSections(BigInt(3), 8),
    userProgress: [],
    rating: {
        totalRatings: BigInt(95),
        ratingSum: BigInt(446), // (95 * 4.7)
        averageRating: BigInt(47000), // 4.7000
        userRatings: new Map([
            [MOCK_USER_ADDRESS, 5]
        ])
    }
  }
];

export const mockLicenses: License[] = [
  {
    courseId: BigInt(1),
    student: MOCK_USER_ADDRESS,
    durationLicense: BigInt(1),
    expiryTimestamp: BigInt(Math.floor(Date.now() / 1000) + (30 * 86400)), // Aktif 30 hari lagi
    isActive: true
  },
  {
    courseId: BigInt(2),
    student: MOCK_USER_ADDRESS,
    durationLicense: BigInt(3),
    expiryTimestamp: BigInt(Math.floor(Date.now() / 1000) + (90 * 86400)), // Aktif 90 hari lagi
    isActive: true
  },
  {
    courseId: BigInt(3),
    student: MOCK_USER_ADDRESS,
    durationLicense: BigInt(1),
    expiryTimestamp: BigInt(Math.floor(Date.now() / 1000) - (10 * 86400)), // Kedaluwarsa 10 hari lalu
    isActive: false // Seharusnya false jika sudah kedaluwarsa
  }
];

// Mock sertifikat tunggal untuk pengguna.
// Sertifikat ini mencerminkan perjalanan belajar pengguna, bertambah seiring kursus yang diselesaikan.
export const mockUserCertificate: Certificate = {
    tokenId: BigInt(101),
    platformName: "EduVerse Academy",
    recipientName: "Budi Santoso",
    recipientAddress: MOCK_USER_ADDRESS,
    lifetimeFlag: true,
    isValid: true,
    ipfsCID: "bafybeigajo2ei5zcnbtr3a245fhx3o6dtoa27yrhvro7jcyy4ywdkitgwm", // CID gambar sertifikat terbaru
    baseRoute: "https://verify.eduverse.com/certificate",
    issuedAt: BigInt(1710028800), // Timestamp saat kursus pertama selesai & sertifikat di-mint
    lastUpdated: BigInt(1710201600), // Timestamp saat kursus terakhir ditambahkan
    totalCoursesCompleted: BigInt(2),
    paymentReceiptHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
    completedCourses: [BigInt(1), BigInt(2)] // ID kursus yang telah diselesaikan dari `mockCourses`
};


// Kelas Mock Database untuk simulasi interaksi backend/blockchain di frontend
export class MockEduVerseDatabase {
  getCourse(courseId: bigint): ExtendedCourse | null {
    return mockCourses.find(course => course.id === courseId) || null;
  }

  getAllCourses(): ExtendedCourse[] {
    return mockCourses;
  }

  getLicenseForUser(courseId: bigint, student: `0x${string}`): License | null {
    return mockLicenses.find(l => l.courseId === courseId && l.student === student) || null;
  }

  getUserCertificate(student: `0x${string}`): Certificate | null {
    if (mockUserCertificate.recipientAddress === student) {
        return mockUserCertificate;
    }
    return null;
  }
}

// Ekspor instance tunggal untuk digunakan di seluruh aplikasi
export const mockDB = new MockEduVerseDatabase();
