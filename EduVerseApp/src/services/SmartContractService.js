// src/services/SmartContractService.js - Enhanced Smart Contract Integration with Course Sections Count
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
  }

  // Initialize the service with providers (ethers v6)
  async initialize(provider, browserProvider) {
    try {
      this.provider = provider;
      this.signer = await browserProvider.getSigner();

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

  async createCourse(courseData) {
    this.ensureInitialized();
    try {
      const { title, description, thumbnailURI, pricePerMonth } = courseData;
      const priceInWei = ethers.parseEther(pricePerMonth.toString());

      const tx = await this.contracts.courseFactory.createCourse(
        title,
        description,
        thumbnailURI,
        priceInWei
      );
      const receipt = await tx.wait();

      // Find the event to get the course ID
      for (const log of receipt.logs) {
        try {
          const parsedLog =
            this.contracts.courseFactory.interface.parseLog(log);
          if (parsedLog && parsedLog.name === "CourseCreated") {
            return {
              success: true,
              courseId: parsedLog.args.CourseId.toString(),
              transactionHash: receipt.hash,
            };
          }
        } catch (e) {
          continue; // Not a CourseFactory event, skip
        }
      }
      throw new Error("CourseCreated event not found.");
    } catch (error) {
      console.error("Error creating course:", error);
      return { success: false, error: error.message };
    }
  }

  async addCourseSection(courseId, sectionData) {
    this.ensureInitialized();
    try {
      const { title, contentURI, duration } = sectionData;
      const tx = await this.contracts.courseFactory.addCourseSection(
        courseId,
        title,
        contentURI,
        duration
      );
      const receipt = await tx.wait();

      for (const log of receipt.logs) {
        try {
          const parsedLog =
            this.contracts.courseFactory.interface.parseLog(log);
          if (parsedLog && parsedLog.name === "SectionAdded") {
            return {
              success: true,
              sectionId: parsedLog.args.sectionId.toString(),
              transactionHash: receipt.hash,
            };
          }
        } catch (e) {
          continue;
        }
      }
      throw new Error("SectionAdded event not found.");
    } catch (error) {
      console.error("Error adding course section:", error);
      return { success: false, error: error.message };
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

  // ENHANCED METHOD: Get all courses with sections count
  async getAllCourses() {
    this.ensureInitialized();
    try {
      const totalCourses = await this.contracts.courseFactory.getTotalCourses();
      const courses = [];

      for (let i = 1; i <= Number(totalCourses); i++) {
        try {
          const course = await this.contracts.courseFactory.getCourse(i);
          if (course.isActive) {
            // Get sections count for each course
            const sectionsCount = await this.getCourseSectionsCount(i);
            courses.push({
              id: course.id.toString(),
              title: course.title,
              description: course.description,
              thumbnailURI: course.thumbnailURI,
              creator: course.creator,
              pricePerMonth: ethers.formatEther(course.pricePerMonth), // Convert wei to ETH for display
              pricePerMonthWei: course.pricePerMonth.toString(), // Keep original wei value for calculations
              isActive: course.isActive,
              createdAt: new Date(Number(course.createdAt) * 1000),
              sectionsCount: sectionsCount, // NEW: Add sections count
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch course ${i}:`, error);
        }
      }
      return courses;
    } catch (error) {
      console.error("Error fetching all courses:", error);
      return [];
    }
  }

  // ENHANCED METHOD: Get single course with sections count
  async getCourse(courseId) {
    this.ensureInitialized();
    try {
      const course = await this.contracts.courseFactory.getCourse(courseId);
      const sectionsCount = await this.getCourseSectionsCount(courseId);
      return {
        id: course.id.toString(),
        title: course.title,
        description: course.description,
        thumbnailURI: course.thumbnailURI,
        creator: course.creator,
        pricePerMonth: ethers.formatEther(course.pricePerMonth), // For display
        pricePerMonthWei: course.pricePerMonth.toString(), // For calculations
        isActive: course.isActive,
        createdAt: new Date(Number(course.createdAt) * 1000),
        sectionsCount: sectionsCount, // NEW: Add sections count
      };
    } catch (error) {
      console.error(`Error fetching course ${courseId}:`, error);
      return null;
    }
  }

  async getCourseSections(courseId) {
    this.ensureInitialized();
    try {
      const sections = await this.contracts.courseFactory.getCourseSections(
        courseId
      );
      return sections.map((section) => ({
        id: section.id.toString(),
        courseId: section.CourseId.toString(),
        title: section.title,
        contentURI: section.contentURI,
        duration: Number(section.duration),
        orderId: Number(section.orderId),
      }));
    } catch (error) {
      console.error(`Error fetching sections for course ${courseId}:`, error);
      return [];
    }
  }

  // ENHANCED METHOD: Get creator courses with sections count
  async getCreatorCourses(creatorAddress) {
    this.ensureInitialized();
    try {
      const courseIds = await this.contracts.courseFactory.getCreatorCourses(
        creatorAddress
      );
      // Fetch details for each course ID (including sections count)
      const courses = await Promise.all(
        courseIds.map((id) => this.getCourse(id.toString()))
      );
      return courses.filter((course) => course !== null); // Filter out any nulls from failed fetches
    } catch (error) {
      console.error("Error fetching creator courses:", error);
      return [];
    }
  }

  // NEW METHOD: Get course section by specific index
  async getCourseSection(courseId, orderIndex) {
    this.ensureInitialized();
    try {
      const section = await this.contracts.courseFactory.getCourseSection(
        courseId,
        orderIndex
      );
      return {
        id: section.id.toString(),
        courseId: section.CourseId.toString(),
        title: section.title,
        contentURI: section.contentURI,
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

  // NEW METHOD: Get basic course data (lighter version)
  async getDataCourse(courseId) {
    this.ensureInitialized();
    try {
      const courseData = await this.contracts.courseFactory.getDataCourse(
        courseId
      );
      return {
        id: courseData.id.toString(),
        title: courseData.title,
        description: courseData.description,
        pricePerMonth: ethers.formatEther(courseData.pricePerMonth),
        isActive: courseData.isActive,
      };
    } catch (error) {
      console.error(`Error fetching course data ${courseId}:`, error);
      return null;
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

  // Method untuk mengecek apakah user memiliki lisensi yang valid dan aktif untuk course tertentu
  async hasValidLicense(userAddress, courseId) {
    this.ensureInitialized();
    try {
      // Cek balance user untuk course ID tertentu (ERC1155)
      const balance = await this.contracts.courseLicense.balanceOf(
        userAddress,
        courseId
      );

      if (Number(balance) > 0) {
        // Jika punya balance, cek apakah lisensinya masih aktif
        const licenseData = await this.contracts.courseLicense.getLicense(
          userAddress,
          courseId
        );

        // Cek apakah lisensi masih aktif dan belum expired
        const now = Math.floor(Date.now() / 1000);
        const isActive =
          licenseData.isActive && Number(licenseData.expiryTimestamp) > now;

        return isActive;
      }

      return false;
    } catch (error) {
      console.error("Error checking license validity:", error);
      return false;
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

  // --- Course Update Methods ---

  async updateCourse(courseId, courseData) {
    this.ensureInitialized();
    try {
      const { title, description, thumbnailURI, pricePerMonth, isActive } =
        courseData;
      const priceInWei = ethers.parseEther(pricePerMonth.toString());

      const tx = await this.contracts.courseFactory.updateCourse(
        courseId,
        title,
        description,
        thumbnailURI,
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

  async updateCourseSection(courseId, sectionId, sectionData) {
    this.ensureInitialized();
    try {
      const { title, contentURI, duration } = sectionData;
      const tx = await this.contracts.courseFactory.updateCourseSection(
        courseId,
        sectionId,
        title,
        contentURI,
        duration
      );
      const receipt = await tx.wait();
      return { success: true, transactionHash: receipt.hash };
    } catch (error) {
      console.error("Error updating course section:", error);
      return { success: false, error: error.message };
    }
  }

  // NEW METHOD: Get courses that user has enrolled (has active license)
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
          // Get course details
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
                thumbnail: course.thumbnailURI,
                category: "Blockchain", // Default category, could be enhanced
                enrolled: new Date().toISOString().split("T")[0], // Current date as enrolled date
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
                thumbnail: course.thumbnailURI,
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

  // Alias method for compatibility
  async getUserCourseProgress(userAddress, courseId) {
    return this.getUserProgress(userAddress, courseId);
  }
}

export default new SmartContractService();
