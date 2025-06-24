// src/services/SmartContractService.js - Enhanced and Corrected Smart Contract Integration for ethers v6
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

  async getAllCourses() {
    this.ensureInitialized();
    try {
      const totalCourses = await this.contracts.courseFactory.getTotalCourses();
      const courses = [];
      for (let i = 1; i <= Number(totalCourses); i++) {
        try {
          const course = await this.contracts.courseFactory.getCourse(i);
          if (course.isActive) {
            courses.push({
              id: course.id.toString(),
              title: course.title,
              description: course.description,
              thumbnailURI: course.thumbnailURI,
              creator: course.creator,
              pricePerMonth: ethers.formatEther(course.pricePerMonth),
              isActive: course.isActive,
              createdAt: new Date(Number(course.createdAt) * 1000),
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

  async getCourse(courseId) {
    this.ensureInitialized();
    try {
      const course = await this.contracts.courseFactory.getCourse(courseId);
      return {
        id: course.id.toString(),
        title: course.title,
        description: course.description,
        thumbnailURI: course.thumbnailURI,
        creator: course.creator,
        pricePerMonth: ethers.formatEther(course.pricePerMonth),
        isActive: course.isActive,
        createdAt: new Date(Number(course.createdAt) * 1000),
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

  async getCreatorCourses(creatorAddress) {
    this.ensureInitialized();
    try {
      const courseIds = await this.contracts.courseFactory.getCreatorCourses(
        creatorAddress
      );
      // Fetch details for each course ID
      const courses = await Promise.all(
        courseIds.map((id) => this.getCourse(id.toString()))
      );
      return courses.filter((course) => course !== null); // Filter out any nulls from failed fetches
    } catch (error) {
      console.error("Error fetching creator courses:", error);
      return [];
    }
  }

  // --- Course License Methods ---

  async mintLicense(courseId, duration = 1) {
    this.ensureInitialized();
    try {
      const course = await this.getCourse(courseId);
      if (!course) throw new Error("Course not found");

      const priceInWei = ethers.parseEther(course.pricePerMonth);
      const totalPrice = priceInWei * BigInt(duration);

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

  // --- Progress Tracker Methods ---

  /**
   * PERBAIKAN: Mengganti `updateProgress` dengan `completeSection` sesuai dengan ABI.
   * Fungsi ini menandai satu bagian kursus sebagai selesai.
   */
  async completeSection(courseId, sectionId) {
    this.ensureInitialized();
    try {
      // The contract function is `completeSection`, not `updateProgress`.
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

  /**
   * PERBAIKAN: Mengganti `getUserProgress` dengan kombinasi fungsi yang ada.
   * Tidak ada fungsi `getUserProgress`. Kita akan menggunakan `getCourseSectionsProgress`
   * dan `getCourseProgressPercentage` untuk mendapatkan data yang relevan.
   */
  async getUserProgress(userAddress, courseId) {
    this.ensureInitialized();
    try {
      // The function `getUserProgress` does not exist. We use existing functions to build the progress data.
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
      // Return a default object on error so the UI doesn't break
      return {
        courseId: courseId.toString(),
        completedSections: 0,
        totalSections: 0,
        progressPercentage: 0,
      };
    }
  }

  // --- Certificate Manager Methods ---

  /**
   * PERBAIKAN: Menyesuaikan parameter `issueCertificate`.
   * Kontrak memerlukan `studentName` (string), bukan `studentAddress` (address).
   */
  async issueCertificate(courseId, studentName) {
    this.ensureInitialized();
    try {
      // The contract function requires `studentName` as a string, not studentAddress.
      // We also need to send a fee if required by the contract.
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

  /**
   * PERBAIKAN: Mengganti `getUserCertificates` yang tidak ada.
   * Kita akan membuat fungsi baru `getCertificateForCourse` untuk mengambil sertifikat
   * per kursus, karena tidak ada fungsi untuk mengambil semua sertifikat pengguna sekaligus.
   */
  async getCertificateForCourse(userAddress, courseId) {
    this.ensureInitialized();
    try {
      // The function `getUserCertificates` does not exist.
      // We get the certificate ID first, then the certificate details.
      const certificateId =
        await this.contracts.certificateManager.getStudentCertificate(
          userAddress,
          courseId
        );
      if (Number(certificateId) === 0) {
        // User does not have a certificate for this course
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
        // You might want to fetch and add metadataURI content here
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
      // The price from Chainlink is usually with 8 decimals for USD pairs
      return ethers.formatUnits(price, 8);
    } catch (error) {
      console.error("Error fetching ETH price:", error);
      return "0";
    }
  }
}

// Export singleton instance
export default new SmartContractService();
