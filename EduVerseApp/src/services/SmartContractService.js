// src/services/SmartContractService.js - Enhanced Smart Contract Integration with CID Parameters
import { ethers } from "ethers";
import { BLOCKCHAIN_CONFIG } from "../constants/blockchain";

// Import contract ABIs
import CourseFactoryABI from "../constants/abi/CourseFactory.json";
import CourseLicenseABI from "../constants/abi/CourseLicense.json";
import ProgressTrackerABI from "../constants/abi/ProgressTracker.json";
import CertificateManagerABI from "../constants/abi/CertificateManager.json";

class SmartContractService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.isInitialized = false;
    this.licenseCache = new Map();
    this.cacheExpiry = 30000; // 30 seconds cache
  }

  // Initialize the service with providers (ethers v6)
  async initialize(provider, browserProvider) {
    try {
      this.provider = provider;

      // Log network info untuk debugging - FIX untuk ethers v6
      try {
        const network = await provider.getNetwork();
        console.log("Connected to network:", {
          chainId: Number(network.chainId), // Konversi BigInt ke Number
          name: network.name || "Unknown",
        });
      } catch (networkError) {
        console.warn("Failed to get network info:", networkError.message);
      }

      // Log contract addresses
      console.log("Contract addresses:", {
        courseFactory: BLOCKCHAIN_CONFIG.CONTRACTS.courseFactory,
        courseLicense: BLOCKCHAIN_CONFIG.CONTRACTS.courseLicense,
        progressTracker: BLOCKCHAIN_CONFIG.CONTRACTS.progressTracker,
        certificateManager: BLOCKCHAIN_CONFIG.CONTRACTS.certificateManager,
      });

      // Get signer dengan proper error handling - FIX untuk wagmi v2
      try {
        // Untuk wagmi v2 dan ethers v6, penggunaan signer yang benar
        if (
          browserProvider &&
          typeof browserProvider.getSigner === "function"
        ) {
          this.signer = await browserProvider.getSigner();
          const address = await this.signer.getAddress();
          console.log("Signer address:", address);
        } else {
          // Fallback jika browserProvider bukan provider ethers v6 standar
          throw new Error("Invalid browser provider format");
        }
      } catch (signerError) {
        console.error("Failed to get signer:", signerError);
        throw new Error("Failed to get wallet signer: " + signerError.message);
      }

      // Initialize contract instances with the signer
      this.contracts = {
        courseFactory: new ethers.Contract(
          BLOCKCHAIN_CONFIG.CONTRACTS.courseFactory,
          CourseFactoryABI,
          this.signer
        ),
        courseLicense: new ethers.Contract(
          BLOCKCHAIN_CONFIG.CONTRACTS.courseLicense,
          CourseLicenseABI,
          this.signer
        ),
        progressTracker: new ethers.Contract(
          BLOCKCHAIN_CONFIG.CONTRACTS.progressTracker,
          ProgressTrackerABI,
          this.signer
        ),
        certificateManager: new ethers.Contract(
          BLOCKCHAIN_CONFIG.CONTRACTS.certificateManager,
          CertificateManagerABI,
          this.signer
        ),
      };

      this.isInitialized = true;
      console.log("SmartContractService initialized successfully");
    } catch (error) {
      console.error("Failed to initialize SmartContractService:", error);
      this.isInitialized = false;
      throw error;
    }
  }

  // Check if service is initialized
  ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error(
        "SmartContractService not initialized. Call initialize() first."
      );
    }
  }

  // --- Course Factory Methods ---

  // ✅ PERBAIKAN: Updated createCourse with CID parameter
  async createCourse(courseData, options = {}) {
    this.ensureInitialized();
    try {
      const { title, description, thumbnailCID, pricePerMonth } = courseData; // ✅ Changed from thumbnailURI to thumbnailCID
      const priceInWei = ethers.parseEther(pricePerMonth.toString());

      // ✅ OPTIMASI: Simplified transaction options
      const txOptions = {
        gasLimit: options.gasLimit || "300000", // ✅ Reduced from 400000
      };

      console.log("🔗 Sending createCourse transaction:", {
        title,
        thumbnailCID, // ✅ Log CID instead of URI
        priceInWei: priceInWei.toString(),
        gasLimit: txOptions.gasLimit,
      });

      // ✅ OPTIMASI: Direct transaction with CID parameter
      const tx = await this.contracts.courseFactory.createCourse(
        title,
        description,
        thumbnailCID, // ✅ Pass CID instead of URI
        priceInWei,
        txOptions
      );

      console.log("📤 Transaction sent, waiting for confirmation...");
      console.log("Transaction hash:", tx.hash);

      // ✅ OPTIMASI: Simple wait dengan timeout
      const receipt = await Promise.race([
        tx.wait(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Transaction timeout")),
            options.timeout || 60000 // ✅ Reduced from 90000
          )
        ),
      ]);

      console.log("✅ Transaction confirmed in block:", receipt.blockNumber);

      // Find CourseCreated event
      for (const log of receipt.logs) {
        try {
          const parsedLog =
            this.contracts.courseFactory.interface.parseLog(log);
          if (parsedLog && parsedLog.name === "CourseCreated") {
            return {
              success: true,
              courseId: parsedLog.args.courseId.toString(), // ✅ Fixed event parameter name
              transactionHash: receipt.hash,
              blockNumber: receipt.blockNumber,
              gasUsed: receipt.gasUsed?.toString(),
            };
          }
        } catch (e) {
          continue;
        }
      }

      throw new Error("CourseCreated event not found");
    } catch (error) {
      console.error("❌ Error creating course:", error);

      // Simplified error handling
      let errorMessage = error.message;
      if (error.message.includes("timeout")) {
        errorMessage = "Transaction timeout. Please try again.";
      } else if (error.code === "USER_REJECTED") {
        errorMessage = "Transaction was rejected by user.";
      } else if (error.code === "INSUFFICIENT_FUNDS") {
        errorMessage = "Insufficient funds for gas fees.";
      }

      return {
        success: false,
        error: errorMessage,
        originalError: error.message,
      };
    }
  }

  // ✅ PERBAIKAN: Updated addCourseSection with CID parameter
  async addCourseSection(courseId, sectionData, options = {}) {
    this.ensureInitialized();
    try {
      const { title, contentCID, duration } = sectionData; // ✅ Changed from contentURI to contentCID

      const txOptions = {
        gasLimit: options.gasLimit || "200000", // ✅ Reduced gas limit
      };

      console.log(`📖 Adding section "${title}" to course ${courseId}`);

      const tx = await this.contracts.courseFactory.addCourseSection(
        courseId,
        title,
        contentCID, // ✅ Pass CID instead of URI
        duration,
        txOptions
      );

      console.log("📤 Section transaction sent, hash:", tx.hash);

      const receipt = await Promise.race([
        tx.wait(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Section transaction timeout")),
            options.timeout || 45000 // ✅ Reduced from 120000
          )
        ),
      ]);

      console.log(`✅ Section "${title}" added successfully`);

      for (const log of receipt.logs) {
        try {
          const parsedLog =
            this.contracts.courseFactory.interface.parseLog(log);
          if (parsedLog && parsedLog.name === "SectionAdded") {
            return {
              success: true,
              sectionId: parsedLog.args.sectionId.toString(),
              transactionHash: receipt.hash,
              gasUsed: receipt.gasUsed?.toString(),
            };
          }
        } catch (e) {
          continue;
        }
      }
      throw new Error("SectionAdded event not found.");
    } catch (error) {
      console.error(`❌ Error adding section "${sectionData.title}":`, error);
      return {
        success: false,
        error: error.message.includes("timeout")
          ? "Section transaction timeout. Please try again."
          : error.message,
      };
    }
  }

  // ✅ PERBAIKAN: Enhanced getAllCourses with pagination support
  async getAllCourses(offset = 0, limit = 50) {
    this.ensureInitialized();
    try {
      console.log(
        `📚 Fetching courses with pagination: offset=${offset}, limit=${limit}`
      );

      // ✅ Try using paginated version first
      let coursesData;
      try {
        coursesData = await this.contracts.courseFactory.getAllCourses(
          offset,
          limit
        );
        console.log(
          `✅ Used paginated getAllCourses, got ${coursesData.length} courses`
        );
      } catch (paginationError) {
        console.log("Pagination not supported, using fallback method");
        // Fallback to old method
        const totalCourses =
          await this.contracts.courseFactory.getTotalCourses();
        const courses = [];

        const start = Math.max(1, offset + 1);
        const end = Math.min(Number(totalCourses), offset + limit);

        for (let i = start; i <= end; i++) {
          try {
            const course = await this.contracts.courseFactory.getCourse(i);
            if (course.isActive) {
              courses.push(course);
            }
          } catch (error) {
            console.warn(`Failed to fetch course ${i}:`, error);
          }
        }
        coursesData = courses;
      }

      // ✅ Process courses with CID and URL generation
      const processedCourses = await Promise.all(
        coursesData
          .filter((course) => course.isActive)
          .map(async (course) => {
            const sectionsCount = await this.getCourseSectionsCount(course.id);

            // ✅ Generate accessible thumbnail URL from CID
            const thumbnailUrl = course.thumbnailCID
              ? await this.generateThumbnailUrl(course.thumbnailCID)
              : null;

            return {
              id: course.id.toString(),
              title: course.title,
              description: course.description,
              thumbnailCID: course.thumbnailCID, // ✅ Return CID from smart contract
              thumbnailUrl: thumbnailUrl, // ✅ Generated accessible URL
              creator: course.creator,
              pricePerMonth: ethers.formatEther(course.pricePerMonth),
              pricePerMonthWei: course.pricePerMonth.toString(),
              isActive: course.isActive,
              createdAt: new Date(Number(course.createdAt) * 1000),
              sectionsCount: sectionsCount,
            };
          })
      );

      return processedCourses;
    } catch (error) {
      console.error("Error fetching all courses:", error);
      return [];
    }
  }

  // ✅ PERBAIKAN: Enhanced getCourse with CID handling
  async getCourse(courseId) {
    this.ensureInitialized();
    try {
      const course = await this.contracts.courseFactory.getCourse(courseId);
      const sectionsCount = await this.getCourseSectionsCount(courseId);

      // ✅ Generate accessible thumbnail URL from CID
      const thumbnailUrl = course.thumbnailCID
        ? await this.generateThumbnailUrl(course.thumbnailCID)
        : null;

      return {
        id: course.id.toString(),
        title: course.title,
        description: course.description,
        thumbnailCID: course.thumbnailCID, // ✅ CID from smart contract
        thumbnailUrl: thumbnailUrl, // ✅ Generated accessible URL
        creator: course.creator,
        pricePerMonth: ethers.formatEther(course.pricePerMonth),
        pricePerMonthWei: course.pricePerMonth.toString(),
        isActive: course.isActive,
        createdAt: new Date(Number(course.createdAt) * 1000),
        sectionsCount: sectionsCount,
      };
    } catch (error) {
      console.error(`Error fetching course ${courseId}:`, error);
      return null;
    }
  }

  // ✅ PERBAIKAN: Enhanced getCourseSections with CID and URL generation
  async getCourseSections(courseId) {
    this.ensureInitialized();
    try {
      const sections = await this.contracts.courseFactory.getCourseSections(
        courseId
      );

      // ✅ Process sections with URL generation from CID
      const sectionsWithUrls = await Promise.all(
        sections.map(async (section) => {
          let videoUrl = null;
          if (
            section.contentCID &&
            section.contentCID !== "placeholder-video-content"
          ) {
            try {
              // ✅ Generate video streaming URL from CID
              const { videoService } = await import("./VideoService");
              const streamingResult = await videoService.getVideoStreamingUrl(
                section.contentCID,
                "public" // Assume public for course videos
              );
              videoUrl = streamingResult.success
                ? streamingResult.streamingUrl
                : null;
            } catch (urlError) {
              console.warn(
                `Failed to generate URL for section ${section.id}:`,
                urlError
              );
            }
          }

          return {
            id: section.id.toString(),
            courseId: section.courseId.toString(), // ✅ Fixed field name consistency
            title: section.title,
            contentCID: section.contentCID, // ✅ Return CID from smart contract
            contentUrl: videoUrl, // ✅ Generated accessible URL
            duration: Number(section.duration),
            orderId: Number(section.orderId),
          };
        })
      );

      return sectionsWithUrls;
    } catch (error) {
      console.error(`Error fetching sections for course ${courseId}:`, error);
      return [];
    }
  }

  // ✅ PERBAIKAN: Enhanced getCourseMetadata method
  async getCourseMetadata(courseId) {
    this.ensureInitialized();
    try {
      // ✅ Use smart contract's getCourseMetadata method if available
      try {
        const metadata = await this.contracts.courseFactory.getCourseMetadata(
          courseId
        );
        return {
          title: metadata.title,
          description: metadata.description,
          thumbnailCID: metadata.thumbnailCID, // ✅ CID from smart contract
          sectionsCount: Number(metadata.sectionsCount),
        };
      } catch (metadataError) {
        // Fallback to getCourse method
        console.log("Using fallback getCourse method for metadata");
        const course = await this.getCourse(courseId);
        if (course) {
          return {
            title: course.title,
            description: course.description,
            thumbnailCID: course.thumbnailCID,
            sectionsCount: course.sectionsCount,
          };
        }
        return null;
      }
    } catch (error) {
      console.error(`Error fetching course metadata ${courseId}:`, error);
      return null;
    }
  }

  // ✅ PERBAIKAN: Enhanced getCourseSection with CID
  async getCourseSection(courseId, orderIndex) {
    this.ensureInitialized();
    try {
      const section = await this.contracts.courseFactory.getCourseSection(
        courseId,
        orderIndex
      );
      return {
        id: section.id.toString(),
        courseId: section.courseId_ret.toString(), // ✅ Fixed return parameter name
        title: section.title,
        contentCID: section.contentCID, // ✅ Changed from contentURI
        duration: Number(section.duration),
      };
    } catch (error) {
      console.error(
        `Error fetching section ${orderIndex} for course ${courseId}:`,
        error
      );
      return null;
    }
  }

  // NEW METHOD: Get course sections count
  async getCourseSectionsCount(courseId) {
    this.ensureInitialized();
    try {
      const sections = await this.contracts.courseFactory.getCourseSections(
        courseId
      );
      return sections.length;
    } catch (error) {
      console.error(
        `Error fetching sections count for course ${courseId}:`,
        error
      );
      return 0;
    }
  }

  // ✅ PERBAIKAN: Enhanced generateThumbnailUrl method
  async generateThumbnailUrl(thumbnailCID) {
    try {
      if (!thumbnailCID) return null;

      // ✅ Import PinataService dinamis untuk avoid circular dependency
      const { pinataService } = await import("./PinataService");

      return await pinataService.getOptimizedFileUrl(thumbnailCID, {
        forcePublic: true, // Thumbnail biasanya public
        network: "public",
      });
    } catch (error) {
      console.warn("Failed to generate thumbnail URL:", error);
      // ✅ Fallback ke public gateway
      return `https://gateway.pinata.cloud/ipfs/${thumbnailCID}`;
    }
  }

  // ✅ PERBAIKAN: Enhanced getCreatorCourses
  async getCreatorCourses(creatorAddress) {
    this.ensureInitialized();
    try {
      const courseIds = await this.contracts.courseFactory.getCreatorCourses(
        creatorAddress
      );

      // Fetch details for each course ID dengan enhanced processing
      const courses = await Promise.all(
        courseIds.map(async (id) => {
          const course = await this.getCourse(id.toString());
          if (course) {
            // Add additional metadata untuk created courses UI
            return {
              ...course,
              students: 0, // TODO: Implement student count tracking
              revenue: "0.00", // TODO: Implement revenue tracking
              status: course.isActive ? "Published" : "Draft",
              created: course.createdAt.toISOString().split("T")[0],
              thumbnail: course.thumbnailUrl, // ✅ Use generated URL
              category: "Blockchain", // Default category
            };
          }
          return null;
        })
      );

      return courses.filter((course) => course !== null);
    } catch (error) {
      console.error("Error fetching creator courses:", error);
      return [];
    }
  }

  // ✅ PERBAIKAN: Updated updateCourse with CID parameter
  async updateCourse(courseId, courseData) {
    this.ensureInitialized();
    try {
      const { title, description, thumbnailCID, pricePerMonth, isActive } =
        courseData; // ✅ Changed from thumbnailURI
      const priceInWei = ethers.parseEther(pricePerMonth.toString());

      const tx = await this.contracts.courseFactory.updateCourse(
        courseId,
        title,
        description,
        thumbnailCID, // ✅ Pass CID instead of URI
        priceInWei,
        isActive
      );
      const receipt = await tx.wait();
      return { success: true, transactionHash: receipt.hash };
    } catch (error) {
      console.error("Error updating course:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ PERBAIKAN: Updated updateCourseSection with CID parameter
  async updateCourseSection(courseId, sectionId, sectionData) {
    this.ensureInitialized();
    try {
      const { title, contentCID, duration } = sectionData; // ✅ Changed from contentURI
      const tx = await this.contracts.courseFactory.updateCourseSection(
        courseId,
        sectionId,
        title,
        contentCID, // ✅ Pass CID instead of URI
        duration
      );
      const receipt = await tx.wait();
      return { success: true, transactionHash: receipt.hash };
    } catch (error) {
      console.error("Error updating course section:", error);
      return { success: false, error: error.message };
    }
  }

  // --- Course License Methods ---
  async mintLicense(courseId, duration = 1) {
    this.ensureInitialized();
    try {
      const course = await this.getCourse(courseId);
      if (!course) throw new Error("Course not found");

      // Use the wei value for calculations
      const pricePerMonthInWei = BigInt(course.pricePerMonthWei);
      const totalPrice = pricePerMonthInWei * BigInt(duration);

      const tx = await this.contracts.courseLicense.mintLicense(
        courseId,
        duration,
        { value: totalPrice }
      );
      const receipt = await tx.wait();
      return { success: true, transactionHash: receipt.hash };
    } catch (error) {
      console.error("Error minting license:", error);
      return { success: false, error: error.message };
    }
  }

  async getUserLicenses(userAddress) {
    this.ensureInitialized();
    try {
      const totalCourses = await this.contracts.courseFactory.getTotalCourses();
      const courseIds = Array.from(
        { length: Number(totalCourses) },
        (_, i) => i + 1
      );

      const licenses = [];
      for (const courseId of courseIds) {
        // Check if the user has a license for this course
        const balance = await this.contracts.courseLicense.balanceOf(
          userAddress,
          courseId
        );
        if (Number(balance) > 0) {
          const licenseData = await this.contracts.courseLicense.getLicense(
            userAddress,
            courseId
          );
          if (licenseData.isActive) {
            licenses.push({
              courseId: licenseData.courseId.toString(),
              student: licenseData.student,
              durationLicense: licenseData.durationLicense.toString(),
              expiryTimestamp: new Date(
                Number(licenseData.expiryTimestamp) * 1000
              ),
              isActive: licenseData.isActive,
            });
          }
        }
      }
      return licenses;
    } catch (error) {
      console.error("Error fetching user licenses:", error);
      return [];
    }
  }

  // ✅ Enhanced hasValidLicense with better caching
  async hasValidLicense(userAddress, courseId) {
    this.ensureInitialized();

    // Check cache first untuk improve performance
    const cacheKey = `${userAddress}-${courseId}`;
    const cached = this.licenseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      console.log("License check from cache:", cached.result);
      return cached.result;
    }

    try {
      console.log("Checking license for:", { userAddress, courseId });

      // Validate input parameters
      if (!userAddress || !courseId) {
        console.error("Invalid parameters for license check:", {
          userAddress,
          courseId,
        });
        this.licenseCache.set(cacheKey, {
          result: false,
          timestamp: Date.now(),
        });
        return false;
      }

      // Ensure courseId is string for consistency
      const courseIdStr = courseId.toString();

      // ✅ Try using smart contract's hasValidLicense method if available
      try {
        const isValid = await this.contracts.courseLicense.hasValidLicense(
          userAddress,
          courseIdStr
        );
        console.log(`✅ Smart contract hasValidLicense result: ${isValid}`);

        this.licenseCache.set(cacheKey, {
          result: isValid,
          timestamp: Date.now(),
        });
        return isValid;
      } catch (directMethodError) {
        console.log(
          "Direct hasValidLicense not available, using fallback method"
        );

        // Fallback to balance check method
        const balance = await this.contracts.courseLicense.balanceOf(
          userAddress,
          courseIdStr
        );
        console.log("License balance:", balance.toString());

        if (Number(balance) > 0) {
          // If has balance, check if license is still active
          try {
            const licenseData = await this.contracts.courseLicense.getLicense(
              userAddress,
              courseIdStr
            );

            console.log("License data:", {
              isActive: licenseData.isActive,
              expiryTimestamp: licenseData.expiryTimestamp.toString(),
              currentTime: Math.floor(Date.now() / 1000),
            });

            // Check if license is active and not expired
            const now = Math.floor(Date.now() / 1000);
            const isActive =
              licenseData.isActive && Number(licenseData.expiryTimestamp) > now;

            console.log("License validity result:", isActive);
            this.licenseCache.set(cacheKey, {
              result: isActive,
              timestamp: Date.now(),
            });
            return isActive;
          } catch (licenseDataError) {
            console.error("Error fetching license data:", licenseDataError);
            // If error in getting license data but balance > 0, assume valid
            console.log("Assuming valid license due to positive balance");
            this.licenseCache.set(cacheKey, {
              result: true,
              timestamp: Date.now(),
            });
            return true;
          }
        }

        console.log("No license balance found");
        this.licenseCache.set(cacheKey, {
          result: false,
          timestamp: Date.now(),
        });
        return false;
      }
    } catch (error) {
      console.error("Error checking license validity:", error);
      this.licenseCache.set(cacheKey, { result: false, timestamp: Date.now() });
      return false;
    }
  }

  // ✅ NEW: Get license details
  async getLicense(userAddress, courseId) {
    this.ensureInitialized();
    try {
      const licenseData = await this.contracts.courseLicense.getLicense(
        userAddress,
        courseId
      );
      return {
        courseId: licenseData.courseId.toString(),
        student: licenseData.student,
        durationLicense: licenseData.durationLicense.toString(),
        expiryTimestamp: new Date(Number(licenseData.expiryTimestamp) * 1000),
        isActive: licenseData.isActive,
      };
    } catch (error) {
      console.error("Error fetching license details:", error);
      return null;
    }
  }

  // --- Progress Tracker Methods ---

  async completeSection(courseId, sectionId) {
    this.ensureInitialized();
    try {
      const tx = await this.contracts.progressTracker.completeSection(
        courseId,
        sectionId
      );
      const receipt = await tx.wait();
      return { success: true, transactionHash: receipt.hash };
    } catch (error) {
      console.error("Error completing section:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ Alias for useBlockchain compatibility
  async updateProgress(courseId, sectionId, completed = true) {
    if (completed) {
      return await this.completeSection(courseId, sectionId);
    } else {
      // TODO: Implement uncomplete section if needed
      return { success: false, error: "Uncomplete section not implemented" };
    }
  }

  async getUserProgress(userAddress, courseId) {
    this.ensureInitialized();
    try {
      const sectionsProgress =
        await this.contracts.progressTracker.getCourseSectionsProgress(
          userAddress,
          courseId
        );
      const completedSections = sectionsProgress.filter((p) => p).length;

      const progressPercentage =
        await this.contracts.progressTracker.getCourseProgressPercentage(
          userAddress,
          courseId
        );

      return {
        courseId: courseId.toString(),
        completedSections: completedSections,
        totalSections: sectionsProgress.length,
        progressPercentage: Number(progressPercentage),
      };
    } catch (error) {
      console.error(
        `Error fetching user progress for course ${courseId}:`,
        error
      );
      return {
        courseId: courseId.toString(),
        completedSections: 0,
        totalSections: 0,
        progressPercentage: 0,
      };
    }
  }

  // Alias method for compatibility
  async getUserCourseProgress(userAddress, courseId) {
    return this.getUserProgress(userAddress, courseId);
  }

  // --- Certificate Manager Methods ---

  async issueCertificate(courseId, studentName) {
    this.ensureInitialized();
    try {
      const fee = await this.contracts.certificateManager.certificateFee();
      const tx = await this.contracts.certificateManager.issueCertificate(
        courseId,
        studentName,
        { value: fee }
      );
      const receipt = await tx.wait();
      return { success: true, transactionHash: receipt.hash };
    } catch (error) {
      console.error("Error issuing certificate:", error);
      return { success: false, error: error.message };
    }
  }

  async getCertificateForCourse(userAddress, courseId) {
    this.ensureInitialized();
    try {
      const certificateId =
        await this.contracts.certificateManager.getStudentCertificate(
          userAddress,
          courseId
        );
      if (Number(certificateId) === 0) {
        return null;
      }

      const cert = await this.contracts.certificateManager.getCertificate(
        certificateId
      );
      if (!cert.isValid) {
        return null;
      }

      return {
        id: cert.certificateId.toString(),
        courseId: cert.courseId.toString(),
        student: cert.student,
        studentName: cert.studentName,
        issuedAt: new Date(Number(cert.issuedAt) * 1000),
        isValid: cert.isValid,
      };
    } catch (error) {
      console.error(
        `Error fetching certificate for course ${courseId}:`,
        error
      );
      return null;
    }
  }

  // ✅ NEW: Get user certificates
  async getUserCertificates(userAddress) {
    this.ensureInitialized();
    try {
      // This would need to be implemented based on your certificate tracking needs
      // For now, we'll check certificates for all courses the user has licenses for
      const licenses = await this.getUserLicenses(userAddress);
      const certificates = [];

      for (const license of licenses) {
        const cert = await this.getCertificateForCourse(
          userAddress,
          license.courseId
        );
        if (cert) {
          certificates.push(cert);
        }
      }

      return certificates;
    } catch (error) {
      console.error("Error fetching user certificates:", error);
      return [];
    }
  }

  // --- Utility Methods ---

  async getETHPrice() {
    this.ensureInitialized();
    try {
      const price = await this.contracts.courseFactory.getETHPrice();
      return ethers.formatUnits(price, 8);
    } catch (error) {
      console.error("Error fetching ETH price:", error);
      return "0";
    }
  }

  // Get maximum price in wei (as returned by smart contract)
  async getMaxPriceInWei() {
    this.ensureInitialized();
    try {
      const maxPriceInWei =
        await this.contracts.courseFactory.getMaxPriceInETH();
      return maxPriceInWei; // Returns BigNumber in wei
    } catch (error) {
      console.error("Error fetching max price in wei:", error);
      return ethers.parseEther("0");
    }
  }

  // Get maximum price formatted as ETH string (for UI display)
  async getMaxPriceInETH() {
    this.ensureInitialized();
    try {
      const maxPrice = await this.contracts.courseFactory.getMaxPriceInETH();
      return ethers.formatEther(maxPrice);
    } catch (error) {
      console.error("Error fetching max price in ETH:", error);
      return "0";
    }
  }

  async getTotalCourses() {
    this.ensureInitialized();
    try {
      const total = await this.contracts.courseFactory.getTotalCourses();
      return Number(total);
    } catch (error) {
      console.error("Error fetching total courses:", error);
      return 0;
    }
  }

  // ✅ PERBAIKAN: Enhanced getUserEnrolledCourses
  async getUserEnrolledCourses(userAddress) {
    this.ensureInitialized();
    try {
      const totalCourses = await this.contracts.courseFactory.getTotalCourses();
      const courseIds = Array.from(
        { length: Number(totalCourses) },
        (_, i) => i + 1
      );

      const enrolledCourses = [];
      for (const courseId of courseIds) {
        // Check if user has valid license for this course
        const hasLicense = await this.hasValidLicense(userAddress, courseId);

        if (hasLicense) {
          // Get course details with enhanced data
          const course = await this.getCourse(courseId);
          if (course) {
            // Get user's progress for this course
            try {
              const progress = await this.getUserCourseProgress(
                userAddress,
                courseId
              );
              enrolledCourses.push({
                ...course,
                progress: progress.progressPercentage || 0,
                totalLessons: course.sectionsCount || 0,
                completedLessons: progress.completedSections || 0,
                instructor: `${course.creator.slice(
                  0,
                  6
                )}...${course.creator.slice(-4)}`,
                thumbnail: course.thumbnailUrl, // ✅ Use generated URL
                category: "Blockchain",
                enrolled: new Date().toISOString().split("T")[0],
              });
            } catch (progressError) {
              // If progress tracking fails, still include the course with default progress
              enrolledCourses.push({
                ...course,
                progress: 0,
                totalLessons: course.sectionsCount || 0,
                completedLessons: 0,
                instructor: `${course.creator.slice(
                  0,
                  6
                )}...${course.creator.slice(-4)}`,
                thumbnail: course.thumbnailUrl, // ✅ Use generated URL
                category: "Blockchain",
                enrolled: new Date().toISOString().split("T")[0],
              });
            }
          }
        }
      }
      return enrolledCourses;
    } catch (error) {
      console.error("Error fetching user enrolled courses:", error);
      return [];
    }
  }
}

export default new SmartContractService();
