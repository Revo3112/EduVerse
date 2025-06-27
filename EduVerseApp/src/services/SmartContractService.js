// Enhanced Smart Contract Service - Fully Aligned with Solidity Contracts
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
    this.progressCache = new Map();
    this.cacheExpiry = 30000;
    this.networkCache = null;
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
    };

    // ✅ PERSISTENT: Never reset these unless explicitly required
    this.isPersistentlyInitialized = false;
    this.lastProviderSignature = null;
    this.initializationLock = false;
  }

  // ✅ ENHANCED: Smart initialization that persists
  async initialize(provider, browserProvider) {
    // ✅ Generate provider signature for comparison
    const network = await provider.getNetwork();
    const signerAddress = await browserProvider
      .getSigner()
      .then((s) => s.getAddress())
      .catch(() => null);
    const currentSignature = `${network.chainId}-${signerAddress}`;

    // ✅ SKIP if already initialized with same providers
    if (
      this.isPersistentlyInitialized &&
      this.isInitialized &&
      this.lastProviderSignature === currentSignature
    ) {
      console.log(
        "✅ Service already initialized with same providers, skipping re-initialization"
      );
      return Promise.resolve();
    }

    // ✅ Prevent concurrent initializations
    if (this.initializationLock) {
      console.log("⏳ Initialization already in progress, waiting...");
      while (this.initializationLock) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return;
    }

    this.initializationLock = true;

    try {
      console.log(
        "🚀 Starting persistent SmartContractService initialization..."
      );

      this.provider = provider;
      this.browserProvider = browserProvider;
      this.lastProviderSignature = currentSignature;

      // ✅ Network validation with caching
      await this._validateNetworkConnection();

      // ✅ Signer initialization
      await this._initializeSigner();

      // ✅ Contract initialization
      await this._initializeContracts();

      // ✅ Validation
      await this._validateInitialization();

      // ✅ Mark as persistently initialized
      this.isInitialized = true;
      this.isPersistentlyInitialized = true;

      console.log(
        "✅ SmartContractService initialized successfully! (Persistent mode active)"
      );
    } catch (error) {
      console.error("❌ Failed to initialize SmartContractService:", error);
      this.isInitialized = false;
      throw new Error(`Initialization failed: ${error.message}`);
    } finally {
      this.initializationLock = false;
    }
  }

  // ✅ ENHANCED: Better validation
  ensureInitialized() {
    if (!this.isPersistentlyInitialized || !this.isInitialized) {
      throw new Error(
        "SmartContractService not initialized. Please connect wallet first."
      );
    }

    if (!this.contracts || !this.contracts.courseFactory) {
      throw new Error(
        "SmartContractService contracts not properly initialized"
      );
    }
  }

  // ✅ NEW: Soft reset for provider changes (without full re-initialization)
  async updateProviders(provider, browserProvider) {
    if (!this.isPersistentlyInitialized) {
      return this.initialize(provider, browserProvider);
    }

    console.log("🔄 Updating providers for existing service...");

    try {
      this.provider = provider;
      this.browserProvider = browserProvider;
      this.signer = await browserProvider.getSigner();

      // ✅ Update contracts with new signer
      const addresses = BLOCKCHAIN_CONFIG.CONTRACTS;

      this.contracts.courseFactory = new ethers.Contract(
        addresses.courseFactory,
        CourseFactoryABI,
        this.signer
      );
      this.contracts.courseLicense = new ethers.Contract(
        addresses.courseLicense,
        CourseLicenseABI,
        this.signer
      );
      this.contracts.progressTracker = new ethers.Contract(
        addresses.progressTracker,
        ProgressTrackerABI,
        this.signer
      );
      this.contracts.certificateManager = new ethers.Contract(
        addresses.certificateManager,
        CertificateManagerABI,
        this.signer
      );

      console.log("✅ Providers updated successfully");
    } catch (error) {
      console.error("❌ Failed to update providers:", error);
      throw error;
    }
  }

  // ✅ ENHANCED: Only reset when absolutely necessary
  reset(forceReset = false) {
    if (!forceReset && this.isPersistentlyInitialized) {
      console.log(
        "⚠️ Skipping reset - service is in persistent mode. Use forceReset=true if needed."
      );
      return;
    }

    console.log("🔄 Resetting SmartContractService...");
    this.isInitialized = false;
    this.isPersistentlyInitialized = false;
    this.lastProviderSignature = null;
    this.initializationLock = false;
    this.provider = null;
    this.browserProvider = null;
    this.signer = null;
    this.contracts = {};
    this.clearAllCaches();
    console.log("✅ SmartContractService reset completed");
  }

  // ✅ SEPARATED: Main initialization logic
  async _performInitialization(provider, browserProvider) {
    try {
      console.log("🚀 Starting SmartContractService initialization...");

      this.provider = provider;
      this.browserProvider = browserProvider;

      // ✅ OPTIMIZED: Skip network validation if same network
      if (!this.networkCache || this.networkCache.provider !== provider) {
        await this._validateNetworkConnection();
      } else {
        console.log("✅ Using cached network validation");
      }

      // ✅ Enhanced signer initialization
      await this._initializeSigner();

      // ✅ Contract initialization with validation
      await this._initializeContracts();

      // ✅ OPTIMIZED: Lighter validation check
      await this._validateInitialization();

      this.isInitialized = true;
      console.log("✅ SmartContractService initialized successfully!");
    } catch (error) {
      console.error("❌ Failed to initialize SmartContractService:", error);
      this.isInitialized = false;
      throw new Error(`Initialization failed: ${error.message}`);
    }
  }

  // ✅ OPTIMIZED: Enhanced network validation with caching
  async _validateNetworkConnection() {
    try {
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);

      // ✅ Check if network changed
      if (this.networkCache && this.networkCache.chainId === chainId) {
        console.log("✅ Network unchanged, using cache");
        return;
      }

      this.networkCache = {
        chainId,
        name: network.name || "Unknown",
        timestamp: Date.now(),
        provider: this.provider, // ✅ Track provider reference
      };

      console.log("✅ Network validated:", {
        chainId: this.networkCache.chainId,
        name: this.networkCache.name,
      });

      // ✅ OPTIMIZED: Single validation of contract addresses
      const addresses = BLOCKCHAIN_CONFIG.CONTRACTS;
      const requiredContracts = [
        "courseFactory",
        "courseLicense",
        "progressTracker",
        "certificateManager",
      ];

      for (const contract of requiredContracts) {
        if (!addresses[contract]) {
          throw new Error(`Missing ${contract} address in configuration`);
        }
      }

      console.log("✅ Contract addresses validated");
    } catch (error) {
      throw new Error(`Network validation failed: ${error.message}`);
    }
  }

  // ✅ OPTIMIZED: Enhanced signer initialization
  async _initializeSigner() {
    try {
      if (
        !this.browserProvider ||
        typeof this.browserProvider.getSigner !== "function"
      ) {
        throw new Error(
          "Invalid browser provider - getSigner method not available"
        );
      }

      this.signer = await this.browserProvider.getSigner();
      const signerAddress = await this.signer.getAddress();

      console.log("✅ Signer initialized:", signerAddress);

      // ✅ OPTIMIZED: Skip balance check in production for faster init
      if (process.env.NODE_ENV === "development") {
        const balance = await this.provider.getBalance(signerAddress);
        console.log("💰 Signer balance:", ethers.formatEther(balance), "ETH");
      }
    } catch (error) {
      throw new Error(`Signer initialization failed: ${error.message}`);
    }
  }

  // ✅ OPTIMIZED: Faster contract initialization
  async _initializeContracts() {
    try {
      const addresses = BLOCKCHAIN_CONFIG.CONTRACTS;

      // ✅ Create all contracts in parallel
      const contractPromises = {
        courseFactory: new ethers.Contract(
          addresses.courseFactory,
          CourseFactoryABI,
          this.signer
        ),
        courseLicense: new ethers.Contract(
          addresses.courseLicense,
          CourseLicenseABI,
          this.signer
        ),
        progressTracker: new ethers.Contract(
          addresses.progressTracker,
          ProgressTrackerABI,
          this.signer
        ),
        certificateManager: new ethers.Contract(
          addresses.certificateManager,
          CertificateManagerABI,
          this.signer
        ),
      };

      this.contracts = contractPromises;
      console.log("✅ Contract instances created successfully");
    } catch (error) {
      throw new Error(`Contract initialization failed: ${error.message}`);
    }
  }

  // ✅ OPTIMIZED: Lighter validation
  async _validateInitialization() {
    try {
      // ✅ Simple connectivity test with timeout
      const totalCoursesPromise =
        this.contracts.courseFactory.getTotalCourses();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Validation timeout")), 5000)
      );

      const totalCourses = await Promise.race([
        totalCoursesPromise,
        timeoutPromise,
      ]);
      console.log(
        "✅ Contract connectivity test passed. Total courses:",
        Number(totalCourses)
      );
    } catch (error) {
      // ✅ Don't fail initialization for validation error
      console.warn("⚠️ Validation warning (non-critical):", error.message);
    }
  }

  // ✅ FIXED: Clean CID for proper URL generation
  async _generateThumbnailUrlCached(thumbnailCID) {
    if (!thumbnailCID) return null;

    // ✅ FIXED: Clean CID for proper URL generation
    const cleanCID = thumbnailCID.replace("ipfs://", "");
    const cacheKey = `thumbnail_${cleanCID}`;
    const cached = this.progressCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.url;
    }

    try {
      // ✅ Try to use PinataService first
      const { pinataService } = await import("./PinataService");
      const url = await pinataService.getOptimizedFileUrl(cleanCID, {
        forcePublic: true,
        network: "public",
      });

      this.progressCache.set(cacheKey, {
        url,
        timestamp: Date.now(),
      });

      return url;
    } catch (error) {
      console.warn("⚠️ PinataService failed, using fallback:", error.message);

      // ✅ FIXED: Improved fallback URL generation
      const fallbackUrl = `https://gateway.pinata.cloud/ipfs/${cleanCID}`;

      this.progressCache.set(cacheKey, {
        url: fallbackUrl,
        timestamp: Date.now(),
      });

      return fallbackUrl;
    }
  }

  // ✅ OPTIMIZED: Enhanced getAllCourses with better error handling
  async getAllCourses(offset = 0, limit = 20) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      console.log(`📚 Fetching courses: offset=${offset}, limit=${limit}`);

      let coursesData = [];

      try {
        // ✅ Try paginated version with timeout
        const paginatedPromise = this.contracts.courseFactory.getAllCourses(
          offset,
          limit
        );
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Pagination timeout")), 10000)
        );

        coursesData = await Promise.race([paginatedPromise, timeoutPromise]);
        console.log(
          `✅ Fetched ${coursesData.length} courses using pagination`
        );
      } catch (paginationError) {
        console.log("⚠️ Pagination failed, using fallback method");

        // ✅ OPTIMIZED: Fallback with better batch processing
        const totalCourses =
          await this.contracts.courseFactory.getTotalCourses();
        const start = Math.max(1, offset + 1);
        const end = Math.min(Number(totalCourses), offset + limit);

        // ✅ Smaller batch size for faster processing
        const batchSize = 3;
        const courses = [];

        for (let i = start; i <= end; i += batchSize) {
          const batchEnd = Math.min(i + batchSize - 1, end);
          const batchPromises = [];

          for (let j = i; j <= batchEnd; j++) {
            batchPromises.push(
              this.contracts.courseFactory
                .getCourse(j)
                .then((course) => (course.isActive ? course : null))
                .catch((error) => {
                  console.warn(
                    `⚠️ Failed to fetch course ${j}:`,
                    error.message
                  );
                  return null;
                })
            );
          }

          const batchResults = await Promise.allSettled(batchPromises);
          const validCourses = batchResults
            .filter((result) => result.status === "fulfilled" && result.value)
            .map((result) => result.value);

          courses.push(...validCourses);
        }

        coursesData = courses;
      }

      // ✅ OPTIMIZED: Parallel processing with better error handling
      const processedCourses = await Promise.allSettled(
        coursesData
          .filter((course) => course?.isActive)
          .map(async (course) => {
            try {
              const [sectionsCount, thumbnailUrl] = await Promise.allSettled([
                this._getCourseSectionsCountCached(course.id),
                this._generateThumbnailUrlCached(course.thumbnailCID),
              ]);

              return {
                id: course.id.toString(),
                title: course.title,
                description: course.description,
                thumbnailCID: course.thumbnailCID,
                thumbnailUrl:
                  thumbnailUrl.status === "fulfilled"
                    ? thumbnailUrl.value
                    : null,
                creator: course.creator,
                pricePerMonth: ethers.formatEther(course.pricePerMonth),
                pricePerMonthWei: course.pricePerMonth.toString(),
                isActive: course.isActive,
                createdAt: new Date(Number(course.createdAt) * 1000),
                sectionsCount:
                  sectionsCount.status === "fulfilled"
                    ? sectionsCount.value
                    : 0,
              };
            } catch (error) {
              console.warn(
                `⚠️ Failed to process course ${course.id}:`,
                error.message
              );
              return null;
            }
          })
      );

      // ✅ Filter out failed courses
      const validCourses = processedCourses
        .filter((result) => result.status === "fulfilled" && result.value)
        .map((result) => result.value);

      console.log(`✅ Processed ${validCourses.length} courses successfully`);
      return validCourses;
    }, "getAllCourses");
  }

  // ✅ OPTIMIZED: Better cache management for sections count
  async _getCourseSectionsCountCached(courseId) {
    const cacheKey = `sections_count_${courseId}`;
    const cached = this.progressCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.count;
    }

    try {
      const sectionsPromise =
        this.contracts.courseFactory.getCourseSections(courseId);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Sections timeout")), 5000)
      );

      const sections = await Promise.race([sectionsPromise, timeoutPromise]);
      const count = sections.length;

      this.progressCache.set(cacheKey, {
        count,
        timestamp: Date.now(),
      });

      return count;
    } catch (error) {
      console.warn(
        `⚠️ Failed to get sections count for course ${courseId}:`,
        error.message
      );
      return 0;
    }
  }

  // ✅ ENHANCED: Better service validation
  ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error(
        "SmartContractService not initialized. Call initialize() first."
      );
    }

    // ✅ Additional validation for critical components
    if (!this.contracts || !this.contracts.courseFactory) {
      throw new Error(
        "SmartContractService contracts not properly initialized"
      );
    }
  }

  // ✅ OPTIMIZED: Enhanced retry mechanism with backoff
  async _retryOperation(operation, context = "operation") {
    let lastError;

    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === this.retryConfig.maxRetries) {
          break;
        }

        // ✅ Enhanced non-retryable error detection
        if (this._isNonRetryableError(error)) {
          throw error;
        }

        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, attempt - 1),
          this.retryConfig.maxDelay
        );

        console.warn(
          `🔄 ${context} failed (attempt ${attempt}/${this.retryConfig.maxRetries}), retrying in ${delay}ms`
        );
        await this._delay(delay);
      }
    }

    throw lastError;
  }

  // ✅ ENHANCED: Better error classification
  _isNonRetryableError(error) {
    const errorMessage = error.message.toLowerCase();
    const nonRetryableMessages = [
      "user rejected",
      "user denied",
      "insufficient funds",
      "invalid address",
      "contract not found",
      "method not found",
      "execution reverted",
      "nonce too high",
      "replacement fee too low",
    ];

    return nonRetryableMessages.some((msg) => errorMessage.includes(msg));
  }

  // ✅ NEW: Reset method for cleanup
  reset() {
    console.log("🔄 Resetting SmartContractService...");
    this.isInitialized = false;
    this.initializationLock = false;
    this.initializationPromise = null;
    this.lastInitAttempt = 0;
    this.provider = null;
    this.browserProvider = null;
    this.signer = null;
    this.contracts = {};
    this.clearAllCaches();
    console.log("✅ SmartContractService reset completed");
  }

  // ✅ UTILITY: Delay helper
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // === COURSE FACTORY METHODS ===

  // ✅ FIXED: Aligned with Solidity - uses thumbnailCID parameter
  async createCourse(courseData, options = {}) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const { title, description, thumbnailCID, pricePerMonth } = courseData;

      // Validate inputs according to Solidity constraints
      if (!title?.trim()) throw new Error("Course title is required");
      if (title.trim().length > 200)
        throw new Error("Title too long (max 200 chars)");
      if (!description?.trim())
        throw new Error("Course description is required");
      if (description.trim().length > 1000)
        throw new Error("Description too long (max 1000 chars)");
      if (!thumbnailCID?.trim()) throw new Error("Thumbnail CID is required");
      if (thumbnailCID.trim().length > 100)
        throw new Error("Thumbnail CID too long (max 100 chars)");

      const priceInWei = ethers.parseEther(pricePerMonth.toString());

      // Check max price limit from contract
      const maxPriceInETH = await this.getMaxPriceInETH();
      if (Number(ethers.formatEther(priceInWei)) > Number(maxPriceInETH)) {
        throw new Error(`Price exceeds maximum limit of ${maxPriceInETH} ETH`);
      }

      // Enhanced gas estimation
      const gasEstimate =
        await this.contracts.courseFactory.createCourse.estimateGas(
          title.trim(),
          description.trim(),
          thumbnailCID.trim(),
          priceInWei
        );

      const gasLimit = gasEstimate + (gasEstimate * 20n) / 100n; // 20% buffer

      console.log("🔗 Creating course with optimized gas:", {
        title: title.trim(),
        thumbnailCID: thumbnailCID.trim(),
        priceInWei: priceInWei.toString(),
        gasEstimate: gasEstimate.toString(),
        gasLimit: gasLimit.toString(),
      });

      const tx = await this.contracts.courseFactory.createCourse(
        title.trim(),
        description.trim(),
        thumbnailCID.trim(),
        priceInWei,
        { gasLimit }
      );

      console.log("📤 Transaction sent:", tx.hash);

      // Enhanced receipt waiting with timeout
      const receipt = await Promise.race([
        tx.wait(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Transaction timeout")),
            options.timeout || 120000
          )
        ),
      ]);

      console.log(
        "✅ Course creation confirmed in block:",
        receipt.blockNumber
      );

      // Parse events more efficiently
      const courseCreatedEvent = receipt.logs
        .map((log) => {
          try {
            return this.contracts.courseFactory.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed?.name === "CourseCreated");

      if (!courseCreatedEvent) {
        throw new Error("CourseCreated event not found in transaction receipt");
      }

      return {
        success: true,
        courseId: courseCreatedEvent.args.courseId.toString(),
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
      };
    }, "createCourse");
  }

  // ✅ FIXED: Aligned with Solidity - uses contentCID parameter and duration validation
  async addCourseSection(courseId, sectionData, options = {}) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const { title, contentCID, duration } = sectionData;

      // Validate inputs according to Solidity constraints
      if (!title?.trim()) throw new Error("Section title is required");
      if (title.trim().length > 200)
        throw new Error("Section title too long (max 200 chars)");
      if (!contentCID?.trim()) throw new Error("Content CID is required");
      if (contentCID.trim().length > 100)
        throw new Error("Content CID too long (max 100 chars)");
      if (!duration || duration <= 0)
        throw new Error("Valid duration is required");
      if (duration > 86400) throw new Error("Duration too long (max 24 hours)");

      // Gas estimation
      const gasEstimate =
        await this.contracts.courseFactory.addCourseSection.estimateGas(
          courseId,
          title.trim(),
          contentCID.trim(),
          duration
        );

      const gasLimit = gasEstimate + (gasEstimate * 15n) / 100n; // 15% buffer

      console.log(`📖 Adding section "${title.trim()}" to course ${courseId}`);

      const tx = await this.contracts.courseFactory.addCourseSection(
        courseId,
        title.trim(),
        contentCID.trim(),
        duration,
        { gasLimit }
      );

      const receipt = await Promise.race([
        tx.wait(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Section transaction timeout")),
            options.timeout || 90000
          )
        ),
      ]);

      console.log(`✅ Section "${title.trim()}" added successfully`);

      // Parse section added event
      const sectionAddedEvent = receipt.logs
        .map((log) => {
          try {
            return this.contracts.courseFactory.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed?.name === "SectionAdded");

      if (!sectionAddedEvent) {
        throw new Error("SectionAdded event not found in transaction receipt");
      }

      return {
        success: true,
        sectionId: sectionAddedEvent.args.sectionId.toString(),
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
      };
    }, "addCourseSection");
  }

  // ✅ FIXED: Aligned with Solidity - uses updateCourse with correct parameters
  async updateCourse(courseId, courseData, options = {}) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const { title, description, thumbnailCID, pricePerMonth, isActive } =
        courseData;

      // Validate inputs according to Solidity constraints
      if (!title?.trim()) throw new Error("Course title is required");
      if (title.trim().length > 200)
        throw new Error("Title too long (max 200 chars)");
      if (!description?.trim())
        throw new Error("Course description is required");
      if (description.trim().length > 1000)
        throw new Error("Description too long (max 1000 chars)");
      if (!thumbnailCID?.trim()) throw new Error("Thumbnail CID is required");
      if (thumbnailCID.trim().length > 100)
        throw new Error("Thumbnail CID too long (max 100 chars)");

      const priceInWei = ethers.parseEther(pricePerMonth.toString());

      // Check max price limit from contract
      const maxPriceInETH = await this.getMaxPriceInETH();
      if (Number(ethers.formatEther(priceInWei)) > Number(maxPriceInETH)) {
        throw new Error(`Price exceeds maximum limit of ${maxPriceInETH} ETH`);
      }

      // Gas estimation
      const gasEstimate =
        await this.contracts.courseFactory.updateCourse.estimateGas(
          courseId,
          title.trim(),
          description.trim(),
          thumbnailCID.trim(),
          priceInWei,
          isActive
        );

      const gasLimit = gasEstimate + (gasEstimate * 15n) / 100n;

      const tx = await this.contracts.courseFactory.updateCourse(
        courseId,
        title.trim(),
        description.trim(),
        thumbnailCID.trim(),
        priceInWei,
        isActive,
        { gasLimit }
      );

      const receipt = await Promise.race([
        tx.wait(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Update course timeout")),
            options.timeout || 90000
          )
        ),
      ]);

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
      };
    }, "updateCourse");
  }

  // ✅ FIXED: Aligned with Solidity - uses updateCourseSection with correct parameters
  async updateCourseSection(courseId, sectionId, sectionData, options = {}) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const { title, contentCID, duration } = sectionData;

      // Validate inputs according to Solidity constraints
      if (!title?.trim()) throw new Error("Section title is required");
      if (title.trim().length > 200)
        throw new Error("Section title too long (max 200 chars)");
      if (!contentCID?.trim()) throw new Error("Content CID is required");
      if (contentCID.trim().length > 100)
        throw new Error("Content CID too long (max 100 chars)");
      if (!duration || duration <= 0)
        throw new Error("Valid duration is required");
      if (duration > 86400) throw new Error("Duration too long (max 24 hours)");

      // Gas estimation
      const gasEstimate =
        await this.contracts.courseFactory.updateCourseSection.estimateGas(
          courseId,
          sectionId,
          title.trim(),
          contentCID.trim(),
          duration
        );

      const gasLimit = gasEstimate + (gasEstimate * 15n) / 100n;

      const tx = await this.contracts.courseFactory.updateCourseSection(
        courseId,
        sectionId,
        title.trim(),
        contentCID.trim(),
        duration,
        { gasLimit }
      );

      const receipt = await Promise.race([
        tx.wait(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Update section timeout")),
            options.timeout || 90000
          )
        ),
      ]);

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
      };
    }, "updateCourseSection");
  }

  // ✅ OPTIMIZED: Enhanced getAllCourses with pagination
  async getAllCourses(offset = 0, limit = 20) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      console.log(`📚 Fetching courses: offset=${offset}, limit=${limit}`);

      let coursesData = [];

      try {
        // ✅ Try paginated version with timeout
        const paginatedPromise = this.contracts.courseFactory.getAllCourses(
          offset,
          limit
        );
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Pagination timeout")), 10000)
        );

        coursesData = await Promise.race([paginatedPromise, timeoutPromise]);
        console.log(
          `✅ Fetched ${coursesData.length} courses using pagination`
        );
      } catch (paginationError) {
        console.log("⚠️ Pagination failed, using fallback method");

        // ✅ OPTIMIZED: Fallback with better batch processing
        const totalCourses =
          await this.contracts.courseFactory.getTotalCourses();
        const start = Math.max(1, offset + 1);
        const end = Math.min(Number(totalCourses), offset + limit);

        // ✅ Smaller batch size for faster processing
        const batchSize = 3;
        const courses = [];

        for (let i = start; i <= end; i += batchSize) {
          const batchEnd = Math.min(i + batchSize - 1, end);
          const batchPromises = [];

          for (let j = i; j <= batchEnd; j++) {
            batchPromises.push(
              this.contracts.courseFactory
                .getCourse(j)
                .then((course) => (course.isActive ? course : null))
                .catch((error) => {
                  console.warn(
                    `⚠️ Failed to fetch course ${j}:`,
                    error.message
                  );
                  return null;
                })
            );
          }

          const batchResults = await Promise.allSettled(batchPromises);
          const validCourses = batchResults
            .filter((result) => result.status === "fulfilled" && result.value)
            .map((result) => result.value);

          courses.push(...validCourses);
        }

        coursesData = courses;
      }

      // ✅ OPTIMIZED: Parallel processing with better error handling
      const processedCourses = await Promise.allSettled(
        coursesData
          .filter((course) => course?.isActive)
          .map(async (course) => {
            try {
              const [sectionsCount, thumbnailUrl] = await Promise.allSettled([
                this._getCourseSectionsCountCached(course.id),
                this._generateThumbnailUrlCached(course.thumbnailCID),
              ]);

              return {
                id: course.id.toString(),
                title: course.title,
                description: course.description,
                thumbnailCID: course.thumbnailCID,
                thumbnailUrl:
                  thumbnailUrl.status === "fulfilled"
                    ? thumbnailUrl.value
                    : null,
                creator: course.creator,
                pricePerMonth: ethers.formatEther(course.pricePerMonth),
                pricePerMonthWei: course.pricePerMonth.toString(),
                isActive: course.isActive,
                createdAt: new Date(Number(course.createdAt) * 1000),
                sectionsCount:
                  sectionsCount.status === "fulfilled"
                    ? sectionsCount.value
                    : 0,
              };
            } catch (error) {
              console.warn(
                `⚠️ Failed to process course ${course.id}:`,
                error.message
              );
              return null;
            }
          })
      );

      // ✅ Filter out failed courses
      const validCourses = processedCourses
        .filter((result) => result.status === "fulfilled" && result.value)
        .map((result) => result.value);

      console.log(`✅ Processed ${validCourses.length} courses successfully`);
      return validCourses;
    }, "getAllCourses");
  }

  // ✅ CACHED: Sections count with caching
  async _getCourseSectionsCountCached(courseId) {
    const cacheKey = `sections_count_${courseId}`;
    const cached = this.progressCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.count;
    }

    try {
      const sectionsPromise =
        this.contracts.courseFactory.getCourseSections(courseId);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Sections timeout")), 5000)
      );

      const sections = await Promise.race([sectionsPromise, timeoutPromise]);
      const count = sections.length;

      this.progressCache.set(cacheKey, {
        count,
        timestamp: Date.now(),
      });

      return count;
    } catch (error) {
      console.warn(
        `⚠️ Failed to get sections count for course ${courseId}:`,
        error.message
      );
      return 0;
    }
  }

  // ✅ CACHED: Thumbnail URL generation with caching
  async _generateThumbnailUrlCached(thumbnailCID) {
    if (!thumbnailCID) return null;

    // ✅ FIXED: Clean CID for proper URL generation
    const cleanCID = thumbnailCID.replace("ipfs://", "");
    const cacheKey = `thumbnail_${cleanCID}`;
    const cached = this.progressCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.url;
    }

    try {
      // ✅ Try to use PinataService first
      const { pinataService } = await import("./PinataService");
      const url = await pinataService.getOptimizedFileUrl(cleanCID, {
        forcePublic: true,
        network: "public",
      });

      this.progressCache.set(cacheKey, {
        url,
        timestamp: Date.now(),
      });

      return url;
    } catch (error) {
      console.warn("⚠️ PinataService failed, using fallback:", error.message);

      // ✅ FIXED: Improved fallback URL generation
      const fallbackUrl = `https://gateway.pinata.cloud/ipfs/${cleanCID}`;

      this.progressCache.set(cacheKey, {
        url: fallbackUrl,
        timestamp: Date.now(),
      });

      return fallbackUrl;
    }
  }

  // ✅ OPTIMIZED: Enhanced getCourse
  async getCourse(courseId) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const course = await this.contracts.courseFactory.getCourse(courseId);
      const sectionsCount = await this._getCourseSectionsCountCached(courseId);
      const thumbnailUrl = await this._generateThumbnailUrlCached(
        course.thumbnailCID
      );

      return {
        id: course.id.toString(),
        title: course.title,
        description: course.description,
        thumbnailCID: course.thumbnailCID,
        thumbnailUrl,
        creator: course.creator,
        pricePerMonth: ethers.formatEther(course.pricePerMonth),
        pricePerMonthWei: course.pricePerMonth.toString(),
        isActive: course.isActive,
        createdAt: new Date(Number(course.createdAt) * 1000),
        sectionsCount,
      };
    }, "getCourse");
  }

  // ✅ OPTIMIZED: Enhanced getCourseSections
  async getCourseSections(courseId) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const sections = await this.contracts.courseFactory.getCourseSections(
        courseId
      );

      const sectionsWithUrls = await Promise.all(
        sections.map(async (section) => {
          let contentUrl = null;

          if (
            section.contentCID &&
            section.contentCID !== "placeholder-video-content"
          ) {
            try {
              const { videoService } = await import("./VideoService");
              const streamingResult = await videoService.getVideoStreamingUrl(
                section.contentCID,
                "public"
              );
              contentUrl = streamingResult.success
                ? streamingResult.streamingUrl
                : null;
            } catch (urlError) {
              console.warn(
                `Failed to generate URL for section ${section.id}:`,
                urlError.message
              );
            }
          }

          return {
            id: section.id.toString(),
            courseId: section.courseId.toString(),
            title: section.title,
            contentCID: section.contentCID,
            contentUrl,
            duration: Number(section.duration),
            orderId: Number(section.orderId),
          };
        })
      );

      return sectionsWithUrls;
    }, "getCourseSections");
  }

  // ✅ FIXED: Aligned with Solidity getCourseSection function
  async getCourseSection(courseId, orderIndex) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const section = await this.contracts.courseFactory.getCourseSection(
        courseId,
        orderIndex
      );

      return {
        id: section.id.toString(),
        courseId: section.courseId_ret.toString(), // Note: Solidity returns courseId_ret
        title: section.title,
        contentCID: section.contentCID,
        duration: Number(section.duration),
      };
    }, "getCourseSection");
  }

  // ✅ OPTIMIZED: Enhanced getCourseMetadata
  async getCourseMetadata(courseId) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      try {
        const metadata = await this.contracts.courseFactory.getCourseMetadata(
          courseId
        );
        return {
          title: metadata.title,
          description: metadata.description,
          thumbnailCID: metadata.thumbnailCID,
          sectionsCount: Number(metadata.sectionsCount),
        };
      } catch (metadataError) {
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
    }, "getCourseMetadata");
  }

  // ✅ OPTIMIZED: Enhanced getCreatorCourses
  async getCreatorCourses(creatorAddress) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const courseIds = await this.contracts.courseFactory.getCreatorCourses(
        creatorAddress
      );

      const courses = await Promise.all(
        courseIds.map(async (id) => {
          try {
            const course = await this.getCourse(id.toString());
            if (course) {
              return {
                ...course,
                students: 0, // TODO: Implement actual student count
                revenue: "0.00", // TODO: Implement actual revenue tracking
                status: course.isActive ? "Published" : "Draft",
                created: course.createdAt.toISOString().split("T")[0],
                thumbnail: course.thumbnailUrl,
                category: "Blockchain",
              };
            }
            return null;
          } catch (error) {
            console.warn(
              `Failed to fetch course details for ID ${id}:`,
              error.message
            );
            return null;
          }
        })
      );

      return courses.filter((course) => course !== null);
    }, "getCreatorCourses");
  }

  // === COURSE LICENSE METHODS ===

  // ✅ FIXED: Aligned with Solidity - duration validation (max 12 months)
  async mintLicense(courseId, duration = 1) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      // Validate duration according to Solidity constraints
      if (duration <= 0) throw new Error("Duration must be positive");
      if (duration > 12) throw new Error("Maximum 12 months per transaction");

      const course = await this.getCourse(courseId);
      if (!course) throw new Error("Course not found");
      if (!course.isActive) throw new Error("Course is not active");

      const pricePerMonthInWei = BigInt(course.pricePerMonthWei);
      const totalPrice = pricePerMonthInWei * BigInt(duration);

      // Gas estimation
      const gasEstimate =
        await this.contracts.courseLicense.mintLicense.estimateGas(
          courseId,
          duration,
          { value: totalPrice }
        );

      const gasLimit = gasEstimate + (gasEstimate * 20n) / 100n;

      console.log(
        `🎫 Minting license for course ${courseId}, duration: ${duration} month(s)`
      );
      console.log(`💰 Total price: ${ethers.formatEther(totalPrice)} ETH`);

      const tx = await this.contracts.courseLicense.mintLicense(
        courseId,
        duration,
        { value: totalPrice, gasLimit }
      );

      const receipt = await Promise.race([
        tx.wait(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("License mint timeout")), 150000)
        ),
      ]);

      console.log("✅ License minted successfully");

      // Clear license cache for this user
      this._clearLicenseCache(await this.signer.getAddress(), courseId);

      // Parse license minted event
      const licenseMintedEvent = receipt.logs
        .map((log) => {
          try {
            return this.contracts.courseLicense.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed?.name === "LincenseMinted"); // Note: Typo in Solidity event name

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        tokenId: licenseMintedEvent?.args?.tokenId?.toString() || null,
        expiryTimestamp:
          licenseMintedEvent?.args?.expiryTimestamp?.toString() || null,
      };
    }, "mintLicense");
  }

  // ✅ FIXED: Added renewLicense function aligned with Solidity
  async renewLicense(courseId, duration = 1) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      // Validate duration according to Solidity constraints
      if (duration <= 0) throw new Error("Duration must be positive");
      if (duration > 12) throw new Error("Maximum 12 months per transaction");

      const course = await this.getCourse(courseId);
      if (!course) throw new Error("Course not found");
      if (!course.isActive) throw new Error("Course is not active");

      // Check if license exists
      const userAddress = await this.signer.getAddress();
      const tokenId = await this.contracts.courseLicense.getTokenId(
        userAddress,
        courseId
      );
      if (Number(tokenId) === 0) throw new Error("License does not exist");

      const pricePerMonthInWei = BigInt(course.pricePerMonthWei);
      const totalPrice = pricePerMonthInWei * BigInt(duration);

      // Gas estimation
      const gasEstimate =
        await this.contracts.courseLicense.renewLicense.estimateGas(
          courseId,
          duration,
          { value: totalPrice }
        );

      const gasLimit = gasEstimate + (gasEstimate * 20n) / 100n;

      console.log(
        `🔄 Renewing license for course ${courseId}, duration: ${duration} month(s)`
      );
      console.log(`💰 Total price: ${ethers.formatEther(totalPrice)} ETH`);

      const tx = await this.contracts.courseLicense.renewLicense(
        courseId,
        duration,
        { value: totalPrice, gasLimit }
      );

      const receipt = await Promise.race([
        tx.wait(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("License renewal timeout")), 150000)
        ),
      ]);

      console.log("✅ License renewed successfully");

      // Clear license cache for this user
      this._clearLicenseCache(userAddress, courseId);

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
      };
    }, "renewLicense");
  }

  // ✅ FIXED: Enhanced getUserLicenses with proper batch processing
  async getUserLicenses(userAddress) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const totalCourses = await this.contracts.courseFactory.getTotalCourses();
      const courseIds = Array.from(
        { length: Number(totalCourses) },
        (_, i) => i + 1
      );

      const licenses = [];

      // Process in batches to avoid timeout
      const batchSize = 10;
      for (let i = 0; i < courseIds.length; i += batchSize) {
        const batch = courseIds.slice(i, i + batchSize);

        const batchPromises = batch.map(async (courseId) => {
          try {
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
                const tokenId = await this.contracts.courseLicense.getTokenId(
                  userAddress,
                  courseId
                );

                return {
                  courseId: licenseData.courseId.toString(),
                  student: licenseData.student,
                  durationLicense: licenseData.durationLicense.toString(),
                  expiryTimestamp: new Date(
                    Number(licenseData.expiryTimestamp) * 1000
                  ),
                  isActive: licenseData.isActive,
                  tokenId: tokenId.toString(),
                };
              }
            }
            return null;
          } catch (error) {
            console.warn(
              `Failed to check license for course ${courseId}:`,
              error.message
            );
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        licenses.push(...batchResults.filter(Boolean));
      }

      return licenses;
    }, "getUserLicenses");
  }

  // ✅ FIXED: Added getStudentCourses function aligned with Solidity
  async getStudentCourses(userAddress, courseIds) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const results = await this.contracts.courseLicense.getStudentCourses(
        userAddress,
        courseIds
      );
      return results;
    }, "getStudentCourses");
  }

  // ✅ OPTIMIZED: Enhanced hasValidLicense with improved caching
  async hasValidLicense(userAddress, courseId) {
    this.ensureInitialized();

    const cacheKey = `${userAddress}-${courseId}`;
    const cached = this.licenseCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.result;
    }

    return await this._retryOperation(async () => {
      if (!userAddress || !courseId) {
        this.licenseCache.set(cacheKey, {
          result: false,
          timestamp: Date.now(),
        });
        return false;
      }

      const courseIdStr = courseId.toString();

      try {
        // Use direct contract method first
        const isValid = await this.contracts.courseLicense.hasValidLicense(
          userAddress,
          courseIdStr
        );

        this.licenseCache.set(cacheKey, {
          result: isValid,
          timestamp: Date.now(),
        });
        return isValid;
      } catch (directMethodError) {
        console.log(
          "Direct hasValidLicense failed, using fallback method:",
          directMethodError.message
        );

        // Fallback to balance check
        try {
          const balance = await this.contracts.courseLicense.balanceOf(
            userAddress,
            courseIdStr
          );

          if (Number(balance) > 0) {
            const licenseData = await this.contracts.courseLicense.getLicense(
              userAddress,
              courseIdStr
            );
            const now = Math.floor(Date.now() / 1000);
            const isActive =
              licenseData.isActive && Number(licenseData.expiryTimestamp) > now;

            this.licenseCache.set(cacheKey, {
              result: isActive,
              timestamp: Date.now(),
            });
            return isActive;
          }

          this.licenseCache.set(cacheKey, {
            result: false,
            timestamp: Date.now(),
          });
          return false;
        } catch (fallbackError) {
          console.error(
            "All license check methods failed:",
            fallbackError.message
          );
          this.licenseCache.set(cacheKey, {
            result: false,
            timestamp: Date.now(),
          });
          return false;
        }
      }
    }, "hasValidLicense");
  }

  // ✅ OPTIMIZED: Enhanced getLicense
  async getLicense(userAddress, courseId) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
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
    }, "getLicense");
  }

  // === PROGRESS TRACKER METHODS ===

  // ✅ OPTIMIZED: Enhanced completeSection
  async completeSection(courseId, sectionId) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      // Gas estimation
      const gasEstimate =
        await this.contracts.progressTracker.completeSection.estimateGas(
          courseId,
          sectionId
        );

      const gasLimit = gasEstimate + (gasEstimate * 15n) / 100n;

      const tx = await this.contracts.progressTracker.completeSection(
        courseId,
        sectionId,
        { gasLimit }
      );

      const receipt = await Promise.race([
        tx.wait(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Progress update timeout")), 90000)
        ),
      ]);

      // Clear progress cache
      const userAddress = await this.signer.getAddress();
      this._clearProgressCache(userAddress, courseId);

      // Parse events
      const sectionCompletedEvent = receipt.logs
        .map((log) => {
          try {
            return this.contracts.progressTracker.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed?.name === "SectionCompleted");

      const courseCompletedEvent = receipt.logs
        .map((log) => {
          try {
            return this.contracts.progressTracker.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed?.name === "CourseCompleted");

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        sectionCompleted: !!sectionCompletedEvent,
        courseCompleted: !!courseCompletedEvent,
      };
    }, "completeSection");
  }

  // ✅ FIXED: Added isSectionCompleted function aligned with Solidity
  async isSectionCompleted(userAddress, courseId, sectionId) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const isCompleted =
        await this.contracts.progressTracker.isSectionCompleted(
          userAddress,
          courseId,
          sectionId
        );
      return isCompleted;
    }, "isSectionCompleted");
  }

  // ✅ FIXED: Added isCourseCompleted function aligned with Solidity
  async isCourseCompleted(userAddress, courseId) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const isCompleted =
        await this.contracts.progressTracker.isCourseCompleted(
          userAddress,
          courseId
        );
      return isCompleted;
    }, "isCourseCompleted");
  }

  // ✅ ALIAS: Progress update compatibility
  async updateProgress(courseId, sectionId, completed = true) {
    if (completed) {
      return await this.completeSection(courseId, sectionId);
    } else {
      return { success: false, error: "Uncomplete section not implemented" };
    }
  }

  // ✅ OPTIMIZED: Enhanced getUserProgress
  async getUserProgress(userAddress, courseId) {
    this.ensureInitialized();

    const cacheKey = `progress_${userAddress}_${courseId}`;
    const cached = this.progressCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.progress;
    }

    return await this._retryOperation(async () => {
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

        const progress = {
          courseId: courseId.toString(),
          completedSections,
          totalSections: sectionsProgress.length,
          progressPercentage: Number(progressPercentage),
          sectionsProgress,
        };

        this.progressCache.set(cacheKey, {
          progress,
          timestamp: Date.now(),
        });

        return progress;
      } catch (error) {
        console.error(
          `Error fetching user progress for course ${courseId}:`,
          error.message
        );

        const defaultProgress = {
          courseId: courseId.toString(),
          completedSections: 0,
          totalSections: 0,
          progressPercentage: 0,
          sectionsProgress: [],
        };

        this.progressCache.set(cacheKey, {
          progress: defaultProgress,
          timestamp: Date.now(),
        });

        return defaultProgress;
      }
    }, "getUserProgress");
  }

  // ✅ ALIAS: Compatibility method
  async getUserCourseProgress(userAddress, courseId) {
    return this.getUserProgress(userAddress, courseId);
  }

  // === CERTIFICATE MANAGER METHODS ===

  // ✅ FIXED: Enhanced issueCertificate with student name validation
  async issueCertificate(courseId, studentName) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      // Validate input according to Solidity constraints
      if (!studentName?.trim()) {
        throw new Error("Student name is required");
      }
      if (studentName.trim().length > 100) {
        throw new Error("Student name too long (max 100 chars)");
      }

      // Check if course is completed
      const userAddress = await this.signer.getAddress();
      const isCompleted = await this.isCourseCompleted(userAddress, courseId);
      if (!isCompleted) {
        throw new Error("Course not completed");
      }

      // Check if certificate already exists
      const existingCertificate =
        await this.contracts.certificateManager.getStudentCertificate(
          userAddress,
          courseId
        );
      if (Number(existingCertificate) !== 0) {
        throw new Error("Certificate already issued");
      }

      const fee = await this.contracts.certificateManager.certificateFee();

      // Gas estimation
      const gasEstimate =
        await this.contracts.certificateManager.issueCertificate.estimateGas(
          courseId,
          studentName.trim(),
          { value: fee }
        );

      const gasLimit = gasEstimate + (gasEstimate * 20n) / 100n;

      console.log(`🏆 Issuing certificate for course ${courseId}`);
      console.log(`👤 Student: ${studentName.trim()}`);
      console.log(`💰 Certificate fee: ${ethers.formatEther(fee)} ETH`);

      const tx = await this.contracts.certificateManager.issueCertificate(
        courseId,
        studentName.trim(),
        { value: fee, gasLimit }
      );

      const receipt = await Promise.race([
        tx.wait(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Certificate issue timeout")),
            120000
          )
        ),
      ]);

      console.log("✅ Certificate issued successfully");

      // Parse certificate issued event
      const certificateIssuedEvent = receipt.logs
        .map((log) => {
          try {
            return this.contracts.certificateManager.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed?.name === "CertificateIssued");

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        certificateId:
          certificateIssuedEvent?.args?.certificateId?.toString() || null,
        issuedAt: certificateIssuedEvent?.args?.issuedAt?.toString() || null,
      };
    }, "issueCertificate");
  }

  // ✅ FIXED: Added revokeCertificate function (admin only)
  async revokeCertificate(certificateId) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const tx = await this.contracts.certificateManager.revokeCertificate(
        certificateId
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
      };
    }, "revokeCertificate");
  }

  // ✅ FIXED: Added verifyCertificate function aligned with Solidity
  async verifyCertificate(certificateId) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const isValid = await this.contracts.certificateManager.verifyCertificate(
        certificateId
      );
      return isValid;
    }, "verifyCertificate");
  }

  // ✅ OPTIMIZED: Enhanced getCertificateForCourse
  async getCertificateForCourse(userAddress, courseId) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
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
          error.message
        );
        return null;
      }
    }, "getCertificateForCourse");
  }

  // ✅ FIXED: Added getCertificate function aligned with Solidity
  async getCertificate(certificateId) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const cert = await this.contracts.certificateManager.getCertificate(
        certificateId
      );

      return {
        id: cert.certificateId.toString(),
        courseId: cert.courseId.toString(),
        student: cert.student,
        studentName: cert.studentName,
        issuedAt: new Date(Number(cert.issuedAt) * 1000),
        isValid: cert.isValid,
      };
    }, "getCertificate");
  }

  // ✅ FIXED: Added getCertificateMetadata function aligned with Solidity
  async getCertificateMetadata(certificateId) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const metadata =
        await this.contracts.certificateManager.getCertificateMetadata(
          certificateId
        );
      return JSON.parse(metadata);
    }, "getCertificateMetadata");
  }

  // ✅ FIXED: Added getVerificationData function aligned with Solidity
  async getVerificationData(certificateId) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const verificationData =
        await this.contracts.certificateManager.getVerificationData(
          certificateId
        );
      return verificationData;
    }, "getVerificationData");
  }

  // ✅ OPTIMIZED: Enhanced getUserCertificates
  async getUserCertificates(userAddress) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      try {
        const licenses = await this.getUserLicenses(userAddress);
        const certificates = [];

        // Process in batches
        const batchSize = 5;
        for (let i = 0; i < licenses.length; i += batchSize) {
          const batch = licenses.slice(i, i + batchSize);

          const batchPromises = batch.map(async (license) => {
            try {
              const cert = await this.getCertificateForCourse(
                userAddress,
                license.courseId
              );
              return cert;
            } catch (certError) {
              console.warn(
                `Failed to get certificate for course ${license.courseId}:`,
                certError.message
              );
              return null;
            }
          });

          const batchResults = await Promise.all(batchPromises);
          certificates.push(...batchResults.filter(Boolean));
        }

        return certificates;
      } catch (error) {
        console.error("Error fetching user certificates:", error.message);
        return [];
      }
    }, "getUserCertificates");
  }

  // ✅ FIXED: Added certificate management functions
  async setCertificateFee(newFee) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const tx = await this.contracts.certificateManager.setCertificateFee(
        ethers.parseEther(newFee.toString())
      );
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
      };
    }, "setCertificateFee");
  }

  async setPlatformFee(newFeePercentage) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const tx = await this.contracts.certificateManager.setPlatformFee(
        newFeePercentage
      );
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
      };
    }, "setPlatformFee");
  }

  async setPlatformWallet(newWallet) {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const tx = await this.contracts.certificateManager.setPlatformWallet(
        newWallet
      );
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
      };
    }, "setPlatformWallet");
  }

  // === UTILITY METHODS ===

  // ✅ OPTIMIZED: Enhanced getETHPrice
  async getETHPrice() {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const price = await this.contracts.courseFactory.getETHPrice();
      return ethers.formatUnits(price, 8);
    }, "getETHPrice");
  }

  // ✅ OPTIMIZED: Enhanced getMaxPriceInETH
  async getMaxPriceInETH() {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const maxPrice = await this.contracts.courseFactory.getMaxPriceInETH();
      return ethers.formatEther(maxPrice);
    }, "getMaxPriceInETH");
  }

  // ✅ OPTIMIZED: Enhanced getTotalCourses
  async getTotalCourses() {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const total = await this.contracts.courseFactory.getTotalCourses();
      return Number(total);
    }, "getTotalCourses");
  }

  // ✅ FIXED: Added getCertificateFee function
  async getCertificateFee() {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const fee = await this.contracts.certificateManager.certificateFee();
      return ethers.formatEther(fee);
    }, "getCertificateFee");
  }

  // ✅ FIXED: Added SECONDS_PER_MONTH constant getter
  async getSecondsPerMonth() {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      const seconds = await this.contracts.courseLicense.SECONDS_PER_MONTH();
      return Number(seconds);
    }, "getSecondsPerMonth");
  }

  // === CACHE MANAGEMENT ===

  // ✅ NEW: Clear license cache
  _clearLicenseCache(userAddress, courseId) {
    const cacheKey = `${userAddress}-${courseId}`;
    this.licenseCache.delete(cacheKey);
  }

  // ✅ NEW: Clear progress cache
  _clearProgressCache(userAddress, courseId) {
    const cacheKey = `progress_${userAddress}_${courseId}`;
    this.progressCache.delete(cacheKey);
  }

  // ✅ NEW: Clear all caches
  clearAllCaches() {
    const licenseCount = this.licenseCache.size;
    const progressCount = this.progressCache.size;

    this.licenseCache.clear();
    this.progressCache.clear();

    console.log(
      `✅ Cleared ${licenseCount} license cache entries and ${progressCount} progress cache entries`
    );
  }

  // === BACKWARD COMPATIBILITY METHODS ===

  // ✅ COMPATIBILITY: For existing code
  async getCourseSectionsCount(courseId) {
    return await this._getCourseSectionsCountCached(courseId);
  }

  async generateThumbnailUrl(thumbnailCID) {
    return await this._generateThumbnailUrlCached(thumbnailCID);
  }

  async getMaxPriceInWei() {
    this.ensureInitialized();

    return await this._retryOperation(async () => {
      return await this.contracts.courseFactory.getMaxPriceInETH();
    }, "getMaxPriceInWei");
  }

  async getUserEnrolledCourses(userAddress) {
    const licenses = await this.getUserLicenses(userAddress);
    const enrolledCourses = [];

    for (const license of licenses) {
      try {
        const course = await this.getCourse(license.courseId);
        if (course) {
          const progress = await this.getUserProgress(
            userAddress,
            license.courseId
          );

          enrolledCourses.push({
            ...course,
            progress: progress.progressPercentage || 0,
            totalLessons: course.sectionsCount || 0,
            completedLessons: progress.completedSections || 0,
            instructor: `${course.creator.slice(0, 6)}...${course.creator.slice(
              -4
            )}`,
            thumbnail: course.thumbnailUrl,
            category: "Blockchain",
            enrolled: new Date().toISOString().split("T")[0],
          });
        }
      } catch (error) {
        console.warn(
          `Failed to process enrolled course ${license.courseId}:`,
          error.message
        );
      }
    }

    return enrolledCourses;
  }
}

export default new SmartContractService();
