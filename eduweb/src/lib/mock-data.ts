/**
 * Mock data for EduVerse educational platform
 * Data structures mirror CourseFactory and CourseLicense smart contracts
 * Deployed on Manta Pacific Testnet (chainId: 3441006)
 */

// CourseCategory enum from CourseFactory.sol (20 categories)
export enum CourseCategory {
  Programming = 0,        // Software Development, Coding, Web Development
  Design = 1,            // UI/UX, Graphic Design, Web Design
  Business = 2,          // Entrepreneurship, Management, Strategy
  Marketing = 3,         // Digital Marketing, Social Media, SEO
  DataScience = 4,       // Analytics, Machine Learning, AI
  Finance = 5,           // Accounting, Investment, Cryptocurrency
  Healthcare = 6,        // Medical, Nursing, Health Sciences
  Language = 7,          // English, Foreign Languages, Communication
  Arts = 8,              // Music, Photography, Creative Arts
  Mathematics = 9,       // Pure Math, Statistics, Calculus, Algebra
  Science = 10,          // Physics, Chemistry, Biology, Earth Sciences
  Engineering = 11,      // Mechanical, Electrical, Civil Engineering
  Technology = 12,       // Cybersecurity, DevOps, Cloud Computing
  Education = 13,        // Teaching Methods, Curriculum Design
  Psychology = 14,       // Mental Health, Behavioral Psychology
  Culinary = 15,         // Cooking, Nutrition, Food Safety
  PersonalDevelopment = 16, // Leadership, Productivity, Communication
  Legal = 17,            // Law, Compliance, Intellectual Property
  Sports = 18,           // Fitness, Athletics, Sports Science
  Other = 19             // Miscellaneous categories
}

// CourseDifficulty enum from CourseFactory.sol (3 levels)
export enum CourseDifficulty {
  Beginner = 0,      // Entry level, no prerequisites
  Intermediate = 1,  // Some background knowledge required
  Advanced = 2       // Expert level, extensive prerequisites
}

// Course interface based on CourseFactory.sol Course struct
export interface Course {
  id: bigint;                          // uint256 id
  title: string;                       // string title
  description: string;                 // string description
  thumbnailCID: string;               // string thumbnailCID (IPFS hash)
  creatorAddress: `0x${string}`;      // address creator
  creatorName: string;                // string creatorName
  isActive: boolean;                  // bool isActive
  category: CourseCategory;           // CourseCategory category
  difficulty: CourseDifficulty;       // CourseDifficulty difficulty
  pricePerMonth: bigint;              // uint256 pricePerMonth (in Wei)
  createdAt: bigint;                  // uint256 createdAt (Unix timestamp)
}

// License interface based on CourseLicense.sol License struct
export interface CourseLicense {
  courseId: bigint;                   // uint256 courseId
  student: `0x${string}`;             // address student
  durationLicense: bigint;            // uint256 durationLicense (in months)
  expiryTimestamp: bigint;            // uint256 expiryTimestamp (Unix timestamp)
  isActive: boolean;                  // bool isActive
}

// Helper function to convert Wei to ETH for display
export const weiToEth = (wei: bigint): string => {
  return (Number(wei) / 1e18).toFixed(4);
}

// Helper function to get category name
export const getCategoryName = (category: CourseCategory): string => {
  return CourseCategory[category] || 'Unknown';
}

// Helper function to get difficulty name
export const getDifficultyName = (difficulty: CourseDifficulty): string => {
  return CourseDifficulty[difficulty] || 'Unknown';
}

// Mock courses data based on realistic CourseFactory contract returns
export const mockCourses: Course[] = [
  {
    id: BigInt(1),
    title: "Blockchain Fundamentals for Beginners",
    description: "Learn the core concepts of blockchain technology, cryptocurrencies, and decentralized systems. Perfect for newcomers to Web3.",
    thumbnailCID: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG", // Example IPFS hash
    creatorAddress: "0x742e8A4C2a9b4f7A76B25e5B8F6a8f9E8A9b4c5D",
    creatorName: "Dr. Sarah Johnson",
    isActive: true,
    category: CourseCategory.Programming,
    difficulty: CourseDifficulty.Beginner,
    pricePerMonth: BigInt("1000000000000000"), // 0.001 ETH in Wei
    createdAt: BigInt(1703836800) // January 1, 2024
  },
  {
    id: BigInt(2),
    title: "Advanced Solidity Smart Contract Development",
    description: "Master advanced Solidity patterns, security best practices, and gas optimization techniques. Build production-ready smart contracts.",
    thumbnailCID: "QmUNLLsPACCz1vLxQVkXqqLX5R1X9RVxrK7F2z4B8xCmv8",
    creatorAddress: "0x1a2B3c4D5e6F7890aB1c2D3e4F567890aB1c2D3e",
    creatorName: "Alex Chen",
    isActive: true,
    category: CourseCategory.Programming,
    difficulty: CourseDifficulty.Advanced,
    pricePerMonth: BigInt("3000000000000000"), // 0.003 ETH in Wei
    createdAt: BigInt(1703923200) // January 2, 2024
  },
  {
    id: BigInt(3),
    title: "DeFi Protocol Architecture and Development",
    description: "Design and build decentralized finance protocols from scratch. Learn about AMMs, lending protocols, and yield farming strategies.",
    thumbnailCID: "QmPvP4z9FJiXpKvP2zq8x7Y6B5a1B2c3D4e5F6g7H8i9J",
    creatorAddress: "0x9F8e7D6c5B4a3921F8e7D6c5B4a39218F7e6D5c4",
    creatorName: "Maria Rodriguez",
    isActive: true,
    category: CourseCategory.Finance,
    difficulty: CourseDifficulty.Intermediate,
    pricePerMonth: BigInt("4000000000000000"), // 0.004 ETH in Wei
    createdAt: BigInt(1704009600) // January 3, 2024
  },
  {
    id: BigInt(4),
    title: "NFT Marketplace Development with React",
    description: "Create a full-featured NFT marketplace using React, Thirdweb SDK, and modern Web3 libraries. Includes minting, trading, and auctions.",
    thumbnailCID: "QmT5k8Jz2x9Y3a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P",
    creatorAddress: "0x3e4F5a6B7c8D9e0F1a2B3c4D5e6F7890aB1c2D3e",
    creatorName: "David Kim",
    isActive: true,
    category: CourseCategory.Technology,
    difficulty: CourseDifficulty.Intermediate,
    pricePerMonth: BigInt("2500000000000000"), // 0.0025 ETH in Wei
    createdAt: BigInt(1704096000) // January 4, 2024
  },
  {
    id: BigInt(5),
    title: "Web3 UI/UX Design Principles",
    description: "Master the art of designing intuitive and beautiful Web3 user interfaces. Learn wallet integration patterns, transaction flows, and user psychology.",
    thumbnailCID: "QmR6s5T7u8V9w1X2y3Z4a5B6c7D8e9F0g1H2i3J4k5L",
    creatorAddress: "0x6B7c8D9e0F1a2B3c4D5e6F7890aB1c2D3e4F5a6B",
    creatorName: "Emma Thompson",
    isActive: true,
    category: CourseCategory.Design,
    difficulty: CourseDifficulty.Beginner,
    pricePerMonth: BigInt("1500000000000000"), // 0.0015 ETH in Wei
    createdAt: BigInt(1704182400) // January 5, 2024
  },
  {
    id: BigInt(6),
    title: "Cryptography and Blockchain Security",
    description: "Deep dive into cryptographic principles, hash functions, digital signatures, and security vulnerabilities in blockchain systems.",
    thumbnailCID: "QmS7t8U9v0W1x2Y3z4A5b6C7d8E9f0G1h2I3j4K5l6M",
    creatorAddress: "0x8D9e0F1a2B3c4D5e6F7890aB1c2D3e4F5a6B7c8D",
    creatorName: "Prof. Michael Zhang",
    isActive: true,
    category: CourseCategory.Technology,
    difficulty: CourseDifficulty.Advanced,
    pricePerMonth: BigInt("3500000000000000"), // 0.0035 ETH in Wei
    createdAt: BigInt(1704268800) // January 6, 2024
  }
];

// Mock license data for demonstration
export const mockLicenses: CourseLicense[] = [
  {
    courseId: BigInt(1),
    student: "0x0123456789abcdef0123456789abcdef01234567",
    durationLicense: BigInt(3), // 3 months
    expiryTimestamp: BigInt(1711958400), // March 2024
    isActive: true
  },
  {
    courseId: BigInt(2),
    student: "0x0123456789abcdef0123456789abcdef01234567",
    durationLicense: BigInt(6), // 6 months
    expiryTimestamp: BigInt(1719734400), // June 2024
    isActive: true
  }
];
