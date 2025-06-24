// src/services/SmartContractService.js - Enhanced Smart Contract Integration for ethers v6
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
    this.browserProvider = null;
    this.contracts = {};
    this.isInitialized = false;
  }

  // Initialize the service with providers (ethers v6)
  async initialize(provider, browserProvider) {
    try {
      this.provider = provider;
      this.browserProvider = browserProvider;
      this.signer = await browserProvider.getSigner();

      // Initialize contract instances with ethers v6 syntax
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

  // Course Factory Methods
  async createCourse(courseData) {
    this.ensureInitialized();

    try {
      const { title, description, thumbnailURI, pricePerMonth } = courseData;

      // Convert price to wei if it's in ETH (ethers v6)
      const priceInWei = ethers.parseEther(pricePerMonth.toString());

      const tx = await this.contracts.courseFactory.createCourse(
        title,
        description,
        thumbnailURI,
        priceInWei
      );

      const receipt = await tx.wait();

      // Extract course ID from event logs (ethers v6)
      let courseId = null;
      for (const log of receipt.logs) {
        try {
          const parsedLog =
            this.contracts.courseFactory.interface.parseLog(log);
          if (parsedLog && parsedLog.name === "CourseCreated") {
            courseId = parsedLog.args.CourseId.toString();
            break;
          }
        } catch (e) {
          // Skip logs that can't be parsed
          continue;
        }
      }

      return {
        success: true,
        courseId: courseId,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error("Error creating course:", error);
      return {
        success: false,
        error: error.message,
      };
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

      // Extract section ID from event logs (ethers v6)
      let sectionId = null;
      for (const log of receipt.logs) {
        try {
          const parsedLog =
            this.contracts.courseFactory.interface.parseLog(log);
          if (parsedLog && parsedLog.name === "SectionAdded") {
            sectionId = parsedLog.args.sectionId.toString();
            break;
          }
        } catch (e) {
          // Skip logs that can't be parsed
          continue;
        }
      }

      return {
        success: true,
        sectionId: sectionId,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error("Error adding course section:", error);
      return {
        success: false,
        error: error.message,
      };
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

          // Format course data (ethers v6)
          const formattedCourse = {
            id: course.id.toString(),
            title: course.title,
            description: course.description,
            thumbnailURI: course.thumbnailURI,
            creator: course.creator,
            pricePerMonth: ethers.formatEther(course.pricePerMonth),
            isActive: course.isActive,
            createdAt: new Date(Number(course.createdAt) * 1000),
          };

          courses.push(formattedCourse);
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
      console.error("Error fetching course:", error);
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
      console.error("Error fetching course sections:", error);
      return [];
    }
  }

  async getCreatorCourses(creatorAddress) {
    this.ensureInitialized();

    try {
      const courseIds = await this.contracts.courseFactory.getCreatorCourses(
        creatorAddress
      );
      const courses = [];

      for (const courseId of courseIds) {
        try {
          const course = await this.getCourse(courseId.toString());
          if (course) {
            courses.push(course);
          }
        } catch (error) {
          console.warn(`Failed to fetch creator course ${courseId}:`, error);
        }
      }

      return courses;
    } catch (error) {
      console.error("Error fetching creator courses:", error);
      return [];
    }
  }

  // Course License Methods
  async mintLicense(courseId, duration = 1) {
    this.ensureInitialized();

    try {
      // Get course price
      const course = await this.getCourse(courseId);
      if (!course) {
        throw new Error("Course not found");
      }

      const priceInWei = ethers.parseEther(course.pricePerMonth);
      const totalPrice = priceInWei * BigInt(duration);

      const tx = await this.contracts.courseLicense.mintLicense(
        courseId,
        duration,
        { value: totalPrice }
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error("Error minting license:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getUserLicenses(userAddress) {
    this.ensureInitialized();

    try {
      // Dapatkan semua courseId yang tersedia
      const totalCourses = await this.contracts.courseFactory.getTotalCourses();
      const licenses = [];

      for (let i = 1; i <= Number(totalCourses); i++) {
        const balance = await this.contracts.courseLicense.balanceOf(userAddress, i);
        if (balance > 0) {
          // Perbaiki di sini: getLicense butuh 2 parameter
          const license = await this.contracts.courseLicense.getLicense(userAddress, i);
          licenses.push({
            courseId: i,
            ...license,
          });
        }
      }

      return licenses;
    } catch (error) {
      console.error("Error fetching user licenses:", error);
      return [];
    }
  }

  // Progress Tracker Methods
  async updateProgress(courseId, sectionId, completed = true) {
    this.ensureInitialized();

    try {
      const tx = await this.contracts.progressTracker.updateProgress(
        courseId,
        sectionId,
        completed
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error("Error updating progress:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getUserProgress(userAddress, courseId) {
    this.ensureInitialized();

    try {
      const progress = await this.contracts.progressTracker.getUserProgress(
        userAddress,
        courseId
      );

      return {
        courseId: progress.courseId.toString(),
        completedSections: progress.completedSections.map((id) =>
          id.toString()
        ),
        totalSections: Number(progress.totalSections),
        progressPercentage: Number(progress.progressPercentage),
        lastUpdated: new Date(Number(progress.lastUpdated) * 1000),
      };
    } catch (error) {
      console.error("Error fetching user progress:", error);
      return null;
    }
  }

  // Certificate Manager Methods
  async issueCertificate(courseId, studentAddress) {
    this.ensureInitialized();

    try {
      const tx = await this.contracts.certificateManager.issueCertificate(
        courseId,
        studentAddress
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error("Error issuing certificate:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getUserCertificates(userAddress) {
    this.ensureInitialized();

    try {
      const certificates =
        await this.contracts.certificateManager.getUserCertificates(
          userAddress
        );

      return certificates.map((cert) => ({
        id: cert.id.toString(),
        courseId: cert.courseId.toString(),
        student: cert.student,
        issuer: cert.issuer,
        issuedAt: new Date(Number(cert.issuedAt) * 1000),
        metadataURI: cert.metadataURI,
      }));
    } catch (error) {
      console.error("Error fetching user certificates:", error);
      return [];
    }
  }

  // Utility Methods
  async getETHPrice() {
    this.ensureInitialized();

    try {
      const price = await this.contracts.courseFactory.getETHPrice();
      return ethers.formatUnits(price, 8); // Price feed usually has 8 decimals
    } catch (error) {
      console.error("Error fetching ETH price:", error);
      return "0";
    }
  }

  async estimateGas(contractMethod, ...args) {
    this.ensureInitialized();

    try {
      const gasEstimate = await contractMethod.estimateGas(...args);
      return gasEstimate.toString();
    } catch (error) {
      console.error("Error estimating gas:", error);
      return "0";
    }
  }

  // Event Listeners (ethers v6)
  subscribeToEvents(eventName, callback) {
    this.ensureInitialized();

    try {
      this.contracts.courseFactory.on(eventName, callback);
    } catch (error) {
      console.error("Error subscribing to events:", error);
    }
  }

  unsubscribeFromEvents(eventName) {
    this.ensureInitialized();

    try {
      this.contracts.courseFactory.removeAllListeners(eventName);
    } catch (error) {
      console.error("Error unsubscribing from events:", error);
    }
  }
}

// Export singleton instance
export default new SmartContractService();
