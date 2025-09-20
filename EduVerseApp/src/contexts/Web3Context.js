// src/contexts/Web3Context.js - Updated for Direct ETH Pricing
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useChainId,
} from "wagmi";
import { parseEther, formatEther, decodeEventLog } from "viem";
import { BLOCKCHAIN_CONFIG } from "../constants/blockchain";

// Import ABIs
import CourseFactoryABI from "../constants/abi/CourseFactory.json";
import CourseLicenseABI from "../constants/abi/CourseLicense.json";
import ProgressTrackerABI from "../constants/abi/ProgressTracker.json";
import CertificateManagerABI from "../constants/abi/CertificateManager.json";
import { mantaPacificTestnet } from "../constants/blockchain";

const Web3Context = createContext(null);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within Web3Provider");
  }
  return context;
};

export function Web3Provider({ children }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);
  const [modalPreventionActive, setModalPreventionActive] = useState(false);

  // Transaction safety delay for Manta Pacific Sepolia
  const TRANSACTION_DELAY_MS = 3000; // 3 seconds between transactions

  // Cache management
  const cacheRef = useRef({
    licenses: new Map(),
    progress: new Map(),
    courses: new Map(),
    cacheExpiry: 30000, // 30 seconds
  });

  // Contract addresses
  const contractAddresses = useMemo(
    () => ({
      courseFactory: BLOCKCHAIN_CONFIG.CONTRACTS.courseFactory,
      courseLicense: BLOCKCHAIN_CONFIG.CONTRACTS.courseLicense,
      progressTracker: BLOCKCHAIN_CONFIG.CONTRACTS.progressTracker,
      certificateManager: BLOCKCHAIN_CONFIG.CONTRACTS.certificateManager,
    }),
    []
  );

  // Initialization effect
  useEffect(() => {
    const checkInitialization = async () => {
      try {
        setModalPreventionActive(true);

        if (!publicClient) {
          setIsInitialized(false);
          return;
        }

        // Verify contract deployments
        const verifications = await Promise.all(
          Object.entries(contractAddresses).map(async ([name, address]) => {
            if (!address) return { name, valid: false };
            try {
              const code = await publicClient.getBytecode({ address });
              return { name, valid: code && code !== "0x" };
            } catch (error) {
              console.error(`Failed to verify ${name}:`, error);
              return { name, valid: false };
            }
          })
        );

        const allValid = verifications.every((v) => v.valid);

        if (allValid) {
          console.log("✅ All contracts verified on Manta Pacific Sepolia");
          setIsInitialized(true);
          setInitError(null);
        } else {
          const invalid = verifications
            .filter((v) => !v.valid)
            .map((v) => v.name);
          throw new Error(`Invalid contracts: ${invalid.join(", ")}`);
        }
      } catch (error) {
        console.error("❌ Initialization error:", error);
        setInitError(error.message);
        setIsInitialized(false);
      } finally {
        // Delay to prevent modal triggers
        setTimeout(() => {
          setModalPreventionActive(false);
        }, 2000);
      }
    };

    if (publicClient) {
      checkInitialization();
    }
  }, [publicClient, contractAddresses]);

  // ==================== HELPER FUNCTIONS ====================

  // Safe delay function
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Safe transaction execution with retry logic
  const executeTransaction = useCallback(
    async (txFunc, options = {}) => {
      const {
        confirmations = 2, // Higher confirmations for testnet
        timeout = 120000, // 2 minutes timeout
        retryOnNonce = true,
      } = options;

      let retries = 0;
      const maxRetries = 2;

      while (retries <= maxRetries) {
        try {
          console.log(
            `📤 Executing transaction (attempt ${retries + 1}/${
              maxRetries + 1
            })`
          );

          // Execute the transaction function
          const hash = await txFunc();

          console.log(`📋 Transaction hash: ${hash}`);
          console.log(`⏳ Waiting for ${confirmations} confirmations...`);

          // Wait for receipt with proper timeout
          const receipt = await publicClient.waitForTransactionReceipt({
            hash,
            confirmations,
            timeout,
          });

          console.log(`✅ Transaction confirmed:`, {
            status: receipt.status,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed?.toString(),
          });

          if (receipt.status === "reverted") {
            throw new Error("Transaction reverted on-chain");
          }

          return { hash, receipt };
        } catch (error) {
          console.error(`Transaction attempt ${retries + 1} failed:`, error);

          // Don't retry on user rejection
          if (
            error.message?.includes("user rejected") ||
            error.message?.includes("User denied") ||
            error.cause?.code === 4001
          ) {
            throw error;
          }

          // Retry on nonce issues
          if (
            retryOnNonce &&
            error.message?.includes("nonce") &&
            retries < maxRetries
          ) {
            console.log("🔄 Retrying due to nonce issue...");
            await new Promise((resolve) => setTimeout(resolve, 2000));
            retries++;
            continue;
          }

          throw error;
        }
      }

      throw new Error("Transaction failed after all retries");
    },
    [publicClient]
  );

  // Get MAX_PRICE_ETH constant from contract
  const getMaxPriceETH = useCallback(async () => {
    if (!isInitialized || !publicClient) {
      console.log("getMaxPriceETH: Not initialized yet");
      return "0.002"; // Return default while initializing
    }

    try {
      const maxPriceWei = await publicClient.readContract({
        address: contractAddresses.courseFactory,
        abi: CourseFactoryABI,
        functionName: "MAX_PRICE_ETH",
      });

      const maxPriceETH = formatEther(maxPriceWei);
      console.log("✅ MAX_PRICE_ETH from contract:", maxPriceETH, "ETH");
      return maxPriceETH;
    } catch (error) {
      console.error("Get max price error:", error);
      // Fallback to hardcoded value from contract
      return "0.002";
    }
  }, [isInitialized, publicClient, contractAddresses]);

  // ==================== COURSE FACTORY FUNCTIONS ====================

  const createCourse = useCallback(
    async (courseData) => {
      if (!isInitialized || !walletClient || !publicClient) {
        throw new Error("Not initialized or wallet not connected");
      }

      const { title, description, thumbnailCID, pricePerMonth } = courseData;

      try {
        console.log("📝 Preparing course creation transaction...");

        if (!walletClient.account) {
          throw new Error("Wallet not properly connected. Please reconnect.");
        }

        // Validate price against MAX_PRICE_ETH
        const maxPrice = await getMaxPriceETH();
        const priceValue = parseFloat(pricePerMonth);

        if (priceValue > parseFloat(maxPrice)) {
          throw new Error(`Price exceeds maximum allowed: ${maxPrice} ETH`);
        }

        const priceInWei = parseEther(pricePerMonth.toString());

        console.log("📊 Transaction parameters:", {
          to: contractAddresses.courseFactory,
          from: walletClient.account.address,
          title: title.trim(),
          priceETH: pricePerMonth,
          priceWei: priceInWei.toString(),
        });

        // Execute transaction with retry logic
        const { hash, receipt } = await executeTransaction(
          async () => {
            return await walletClient.writeContract({
              address: contractAddresses.courseFactory,
              abi: CourseFactoryABI,
              functionName: "createCourse",
              args: [
                title.trim(),
                description.trim(),
                thumbnailCID.trim(),
                priceInWei,
              ],
              chain: mantaPacificTestnet,
            });
          },
          { confirmations: 2 }
        );

        // Parse event logs to get courseId
        let courseId = null;
        if (receipt.logs && receipt.logs.length > 0) {
          for (const log of receipt.logs) {
            try {
              if (
                log.address.toLowerCase() ===
                contractAddresses.courseFactory.toLowerCase()
              ) {
                const decoded = decodeEventLog({
                  abi: CourseFactoryABI,
                  data: log.data,
                  topics: log.topics,
                });

                if (decoded.eventName === "CourseCreated") {
                  courseId = decoded.args.courseId?.toString();
                  console.log("📚 Course created with ID:", courseId);
                  break;
                }
              }
            } catch (e) {
              continue;
            }
          }
        }

        // Fallback: get courseId from creator's courses
        if (!courseId && walletClient.account) {
          try {
            // Add small delay to ensure state is updated
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const creatorCourses = await publicClient.readContract({
              address: contractAddresses.courseFactory,
              abi: CourseFactoryABI,
              functionName: "getCreatorCourses",
              args: [walletClient.account.address],
            });

            if (creatorCourses && creatorCourses.length > 0) {
              courseId = creatorCourses[creatorCourses.length - 1].toString();
              console.log(
                "📍 Retrieved courseId from creator courses:",
                courseId
              );
            }
          } catch (fallbackError) {
            console.error(
              "Fallback courseId extraction failed:",
              fallbackError
            );
          }
        }

        return {
          success: true,
          courseId: courseId || "unknown",
          transactionHash: receipt.transactionHash,
        };
      } catch (error) {
        console.error("Create course error:", error);

        // Enhanced error handling
        if (error.message?.includes("user rejected")) {
          throw new Error("Transaction was cancelled by user");
        } else if (error.message?.includes("insufficient funds")) {
          throw new Error("Insufficient ETH for gas fees");
        } else if (error.message?.includes("Price exceeds maximum")) {
          throw new Error(
            `Course price exceeds maximum allowed (${await getMaxPriceETH()} ETH)`
          );
        } else if (error.message?.includes("reverted")) {
          // Try to decode revert reason
          const revertReason =
            error.message.match(/reason="([^"]+)"/)?.[1] ||
            "Transaction reverted";
          throw new Error(`Contract error: ${revertReason}`);
        }

        throw error;
      }
    },
    [
      isInitialized,
      walletClient,
      publicClient,
      contractAddresses,
      executeTransaction,
      getMaxPriceETH,
    ]
  );

  const addCourseSection = useCallback(
    async (courseId, sectionData) => {
      if (!isInitialized || !walletClient || !publicClient) {
        throw new Error("Not initialized or wallet not connected");
      }

      const { title, contentCID, duration } = sectionData;

      try {
        console.log("📝 Adding course section...", {
          courseId,
          title: title.substring(0, 50) + "...",
          duration,
        });

        if (!walletClient.account) {
          throw new Error("Wallet not properly connected. Please reconnect.");
        }

        // Validate inputs
        if (duration > 86400) {
          throw new Error(
            "Duration exceeds maximum allowed: 86400 seconds (24 hours)"
          );
        }

        const { hash, receipt } = await executeTransaction(
          async () => {
            return await walletClient.writeContract({
              address: contractAddresses.courseFactory,
              abi: CourseFactoryABI,
              functionName: "addCourseSection",
              args: [
                BigInt(courseId),
                title.trim(),
                contentCID.trim(),
                BigInt(duration),
              ],
              chain: mantaPacificTestnet,
            });
          },
          { confirmations: 2 }
        );

        console.log("✅ Section added successfully");

        // Add delay for next transaction
        await new Promise((resolve) =>
          setTimeout(resolve, TRANSACTION_DELAY_MS)
        );

        return {
          success: true,
          transactionHash: receipt.transactionHash,
        };
      } catch (error) {
        console.error("Add section error:", error);

        if (error.message?.includes("user rejected")) {
          throw new Error("Transaction was cancelled by user");
        } else if (error.message?.includes("Not course creator")) {
          throw new Error("Only the course creator can add sections");
        } else if (error.message?.includes("Duration too long")) {
          throw new Error(
            "Section duration exceeds maximum allowed (24 hours)"
          );
        }

        throw error;
      }
    },
    [
      isInitialized,
      walletClient,
      publicClient,
      contractAddresses,
      executeTransaction,
    ]
  );

  const getAllCourses = useCallback(
    async (offset = 0, limit = 20) => {
      if (!isInitialized || !publicClient) {
        throw new Error("Not initialized");
      }

      try {
        const data = await publicClient.readContract({
          address: contractAddresses.courseFactory,
          abi: CourseFactoryABI,
          functionName: "getAllCourses",
          args: [BigInt(offset), BigInt(limit)],
        });

        return data.map((course) => ({
          id: course.id.toString(),
          title: course.title,
          description: course.description,
          thumbnailCID: course.thumbnailCID,
          creator: course.creator,
          pricePerMonth: formatEther(course.pricePerMonth),
          pricePerMonthWei: course.pricePerMonth.toString(),
          isActive: course.isActive,
          createdAt: new Date(Number(course.createdAt) * 1000),
        }));
      } catch (error) {
        console.error("Get all courses error:", error);
        throw error;
      }
    },
    [isInitialized, publicClient, contractAddresses]
  );

  const getCourse = useCallback(
    async (courseId) => {
      if (!isInitialized || !publicClient) {
        throw new Error("Not initialized");
      }

      const cacheKey = `course_${courseId}`;
      const cached = cacheRef.current.courses.get(cacheKey);

      if (
        cached &&
        Date.now() - cached.timestamp < cacheRef.current.cacheExpiry
      ) {
        return cached.data;
      }

      try {
        const course = await publicClient.readContract({
          address: contractAddresses.courseFactory,
          abi: CourseFactoryABI,
          functionName: "getCourse",
          args: [BigInt(courseId)],
        });

        const formattedCourse = {
          id: course.id.toString(),
          title: course.title,
          description: course.description,
          thumbnailCID: course.thumbnailCID,
          creator: course.creator,
          pricePerMonth: formatEther(course.pricePerMonth),
          pricePerMonthWei: course.pricePerMonth.toString(),
          isActive: course.isActive,
          createdAt: new Date(Number(course.createdAt) * 1000),
        };

        cacheRef.current.courses.set(cacheKey, {
          data: formattedCourse,
          timestamp: Date.now(),
        });

        return formattedCourse;
      } catch (error) {
        console.error("Get course error:", error);
        throw error;
      }
    },
    [isInitialized, publicClient, contractAddresses]
  );

  const getCourseSections = useCallback(
    async (courseId) => {
      if (!isInitialized || !publicClient) {
        throw new Error("Not initialized");
      }

      try {
        const sections = await publicClient.readContract({
          address: contractAddresses.courseFactory,
          abi: CourseFactoryABI,
          functionName: "getCourseSections",
          args: [BigInt(courseId)],
        });

        return sections.map((section) => ({
          id: section.id.toString(),
          courseId: section.courseId.toString(),
          title: section.title,
          contentCID: section.contentCID,
          duration: Number(section.duration),
          orderId: Number(section.orderId),
        }));
      } catch (error) {
        console.error("Get course sections error:", error);
        throw error;
      }
    },
    [isInitialized, publicClient, contractAddresses]
  );

  const getCourseSectionsCount = useCallback(async (courseId) => {
    if (!isInitialized || !publicClient) {
      throw new Error("Not initialized");
    }
    try {
      const count = await publicClient.readContract({
        address: contractAddresses.courseFactory,
        abi: CourseFactoryABI,
        functionName: "getCourseSections",
        args: [BigInt(courseId)],
      });
      return count.length;
    } catch (error) {
      console.error(
        `Get course sections count error for course ${courseId}:`,
        error
      );
      // Kembalikan 0 jika terjadi error agar tidak merusak UI
      return 0;
    }
  });

  const getCreatorCourses = useCallback(
    async (creatorAddress) => {
      if (!isInitialized || !publicClient) {
        throw new Error("Not initialized");
      }

      try {
        const courseIds = await publicClient.readContract({
          address: contractAddresses.courseFactory,
          abi: CourseFactoryABI,
          functionName: "getCreatorCourses",
          args: [creatorAddress],
        });

        const courses = await Promise.all(
          courseIds.map((id) => getCourse(id.toString()))
        );

        return courses.filter((course) => course !== null);
      } catch (error) {
        console.error("Get creator courses error:", error);
        throw error;
      }
    },
    [isInitialized, publicClient, contractAddresses, getCourse]
  );

  const getTotalCourses = useCallback(async () => {
    if (!isInitialized || !publicClient) {
      throw new Error("Not initialized");
    }

    try {
      const total = await publicClient.readContract({
        address: contractAddresses.courseFactory,
        abi: CourseFactoryABI,
        functionName: "getTotalCourses",
      });

      return Number(total);
    } catch (error) {
      console.error("Get total courses error:", error);
      throw error;
    }
  }, [isInitialized, publicClient, contractAddresses]);

  // ==================== COURSE LICENSE FUNCTIONS ====================

  const mintLicense = useCallback(
    async (courseId, duration = 1) => {
      if (!isInitialized || !walletClient || !publicClient) {
        throw new Error("Not initialized or wallet not connected");
      }

      try {
        if (!walletClient.account) {
          throw new Error("Wallet not properly connected. Please reconnect.");
        }

        // Get course to calculate price
        const course = await getCourse(courseId);
        const pricePerMonthInWei = BigInt(course.pricePerMonthWei);
        const totalPrice = pricePerMonthInWei * BigInt(duration);

        console.log("💳 Minting license...", {
          courseId,
          duration,
          totalPrice: totalPrice.toString(),
          totalPriceETH: formatEther(totalPrice),
        });

        const { hash, receipt } = await executeTransaction(
          async () => {
            return await walletClient.writeContract({
              address: contractAddresses.courseLicense,
              abi: CourseLicenseABI,
              functionName: "mintLicense",
              args: [BigInt(courseId), BigInt(duration)],
              value: totalPrice,
              chain: mantaPacificTestnet,
            });
          },
          { confirmations: 2 }
        );

        // Clear cache
        if (address) {
          const cacheKey = `${address}-${courseId}`;
          cacheRef.current.licenses.delete(cacheKey);
        }

        console.log("✅ License minted successfully");

        return {
          success: true,
          transactionHash: receipt.transactionHash,
        };
      } catch (error) {
        console.error("Mint license error:", error);
        throw error;
      }
    },
    [
      isInitialized,
      walletClient,
      publicClient,
      contractAddresses,
      address,
      getCourse,
      executeTransaction,
    ]
  );

  const hasValidLicense = useCallback(
    async (userAddress, courseId) => {
      if (!isInitialized || !publicClient) {
        throw new Error("Not initialized");
      }

      const cacheKey = `${userAddress}-${courseId}`;
      const cached = cacheRef.current.licenses.get(cacheKey);

      if (
        cached &&
        Date.now() - cached.timestamp < cacheRef.current.cacheExpiry
      ) {
        return cached.result;
      }

      try {
        const isValid = await publicClient.readContract({
          address: contractAddresses.courseLicense,
          abi: CourseLicenseABI,
          functionName: "hasValidLicense",
          args: [userAddress, BigInt(courseId)],
        });

        cacheRef.current.licenses.set(cacheKey, {
          result: isValid,
          timestamp: Date.now(),
        });

        return isValid;
      } catch (error) {
        console.error("Check valid license error:", error);
        throw error;
      }
    },
    [isInitialized, publicClient, contractAddresses]
  );

  const getLicense = useCallback(
    async (userAddress, courseId) => {
      if (!isInitialized || !publicClient) {
        throw new Error("Not initialized");
      }

      try {
        const licenseData = await publicClient.readContract({
          address: contractAddresses.courseLicense,
          abi: CourseLicenseABI,
          functionName: "getLicense",
          args: [userAddress, BigInt(courseId)],
        });

        return {
          courseId: licenseData.courseId.toString(),
          student: licenseData.student,
          durationLicense: licenseData.durationLicense.toString(),
          expiryTimestamp: new Date(Number(licenseData.expiryTimestamp) * 1000),
          isActive: licenseData.isActive,
        };
      } catch (error) {
        console.error("Get license error:", error);
        throw error;
      }
    },
    [isInitialized, publicClient, contractAddresses]
  );

  const getUserLicenses = useCallback(
    async (userAddress) => {
      if (!isInitialized || !publicClient) {
        throw new Error("Not initialized");
      }

      try {
        const totalCourses = await getTotalCourses();
        const licenses = [];

        // Batch read licenses
        const courseIds = Array.from({ length: totalCourses }, (_, i) => i + 1);

        for (const courseId of courseIds) {
          try {
            const hasLicense = await hasValidLicense(userAddress, courseId);
            if (hasLicense) {
              const licenseData = await getLicense(userAddress, courseId);
              licenses.push({
                ...licenseData,
                courseId: courseId.toString(),
              });
            }
          } catch (error) {
            console.warn(
              `Failed to check license for course ${courseId}:`,
              error
            );
          }
        }

        return licenses;
      } catch (error) {
        console.error("Get user licenses error:", error);
        throw error;
      }
    },
    [isInitialized, publicClient, getTotalCourses, hasValidLicense, getLicense]
  );

  // ==================== PROGRESS TRACKER FUNCTIONS ====================

  const completeSection = useCallback(
    async (courseId, sectionId) => {
      if (!isInitialized || !walletClient || !publicClient) {
        throw new Error("Not initialized or wallet not connected");
      }

      try {
        console.log("📝 Completing section...", { courseId, sectionId });

        if (!walletClient.account) {
          throw new Error("Wallet not properly connected. Please reconnect.");
        }

        const { hash, receipt } = await executeTransaction(
          async () => {
            return await walletClient.writeContract({
              address: contractAddresses.progressTracker,
              abi: ProgressTrackerABI,
              functionName: "completeSection",
              args: [BigInt(courseId), BigInt(sectionId)],
              chain: mantaPacificTestnet,
            });
          },
          { confirmations: 2 }
        );

        // Clear cache
        if (address) {
          const cacheKey = `progress_${address}_${courseId}`;
          cacheRef.current.progress.delete(cacheKey);
        }

        console.log("✅ Section completed successfully");

        return {
          success: true,
          transactionHash: receipt.transactionHash,
        };
      } catch (error) {
        console.error("Complete section error:", error);
        throw error;
      }
    },
    [
      isInitialized,
      walletClient,
      publicClient,
      contractAddresses,
      address,
      executeTransaction,
    ]
  );

  const getUserProgress = useCallback(
    async (userAddress, courseId) => {
      if (!isInitialized || !publicClient) {
        throw new Error("Not initialized");
      }

      const cacheKey = `progress_${userAddress}_${courseId}`;
      const cached = cacheRef.current.progress.get(cacheKey);

      if (
        cached &&
        Date.now() - cached.timestamp < cacheRef.current.cacheExpiry
      ) {
        return cached.progress;
      }

      try {
        const [sectionsProgress, progressPercentage] = await Promise.all([
          publicClient.readContract({
            address: contractAddresses.progressTracker,
            abi: ProgressTrackerABI,
            functionName: "getCourseSectionsProgress",
            args: [userAddress, BigInt(courseId)],
          }),
          publicClient.readContract({
            address: contractAddresses.progressTracker,
            abi: ProgressTrackerABI,
            functionName: "getCourseProgressPercentage",
            args: [userAddress, BigInt(courseId)],
          }),
        ]);

        const completedSections = sectionsProgress.filter((p) => p).length;

        const progress = {
          courseId: courseId.toString(),
          completedSections,
          totalSections: sectionsProgress.length,
          progressPercentage: Number(progressPercentage),
          sectionsProgress,
        };

        cacheRef.current.progress.set(cacheKey, {
          progress,
          timestamp: Date.now(),
        });

        return progress;
      } catch (error) {
        console.error("Get user progress error:", error);

        // Return default progress on error
        return {
          courseId: courseId.toString(),
          completedSections: 0,
          totalSections: 0,
          progressPercentage: 0,
          sectionsProgress: [],
        };
      }
    },
    [isInitialized, publicClient, contractAddresses]
  );

  const isCourseCompleted = useCallback(
    async (userAddress, courseId) => {
      if (!isInitialized || !publicClient) {
        throw new Error("Not initialized");
      }

      try {
        return await publicClient.readContract({
          address: contractAddresses.progressTracker,
          abi: ProgressTrackerABI,
          functionName: "isCourseCompleted",
          args: [userAddress, BigInt(courseId)],
        });
      } catch (error) {
        console.error("Check course completed error:", error);
        throw error;
      }
    },
    [isInitialized, publicClient, contractAddresses]
  );

  // ==================== CERTIFICATE FUNCTIONS ====================

  const issueCertificate = useCallback(
    async (courseId, studentName) => {
      if (!isInitialized || !walletClient || !publicClient) {
        throw new Error("Not initialized or wallet not connected");
      }

      try {
        console.log("📜 Issuing certificate...");

        if (!walletClient.account) {
          throw new Error("Wallet not properly connected. Please reconnect.");
        }

        // Get certificate fee
        const fee = await publicClient.readContract({
          address: contractAddresses.certificateManager,
          abi: CertificateManagerABI,
          functionName: "certificateFee",
        });

        const { hash, receipt } = await executeTransaction(
          async () => {
            return await walletClient.writeContract({
              address: contractAddresses.certificateManager,
              abi: CertificateManagerABI,
              functionName: "issueCertificate",
              args: [BigInt(courseId), studentName.trim()],
              value: fee,
              chain: mantaPacificTestnet,
            });
          },
          { confirmations: 2 }
        );

        console.log("✅ Certificate issued successfully");

        return {
          success: true,
          transactionHash: receipt.transactionHash,
        };
      } catch (error) {
        console.error("Issue certificate error:", error);
        throw error;
      }
    },
    [
      isInitialized,
      walletClient,
      publicClient,
      contractAddresses,
      executeTransaction,
    ]
  );

  const getCertificateForCourse = useCallback(
    async (userAddress, courseId) => {
      if (!isInitialized || !publicClient) {
        throw new Error("Not initialized");
      }

      try {
        const certificateId = await publicClient.readContract({
          address: contractAddresses.certificateManager,
          abi: CertificateManagerABI,
          functionName: "getStudentCertificate",
          args: [userAddress, BigInt(courseId)],
        });

        if (Number(certificateId) === 0) {
          return null;
        }

        const cert = await publicClient.readContract({
          address: contractAddresses.certificateManager,
          abi: CertificateManagerABI,
          functionName: "getCertificate",
          args: [certificateId],
        });

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
        console.error("Get certificate error:", error);
        return null;
      }
    },
    [isInitialized, publicClient, contractAddresses]
  );

  const getUserCertificates = useCallback(
    async (userAddress) => {
      if (!isInitialized || !publicClient) {
        throw new Error("Not initialized");
      }

      try {
        const licenses = await getUserLicenses(userAddress);
        const certificates = [];

        for (const license of licenses) {
          try {
            const cert = await getCertificateForCourse(
              userAddress,
              license.courseId
            );
            if (cert) {
              certificates.push(cert);
            }
          } catch (error) {
            console.warn(
              `Failed to get certificate for course ${license.courseId}:`,
              error
            );
          }
        }

        return certificates;
      } catch (error) {
        console.error("Get user certificates error:", error);
        throw error;
      }
    },
    [isInitialized, publicClient, getUserLicenses, getCertificateForCourse]
  );

  // ==================== CONTEXT VALUE ====================

  const contextValue = useMemo(
    () => ({
      // State
      isInitialized,
      initError,
      modalPreventionActive,
      contracts: contractAddresses,

      // Constants
      getMaxPriceETH,

      // Course Factory
      createCourse,
      getAllCourses,
      getCourse,
      getCourseSections,
      getCourseSectionsCount,
      addCourseSection,
      getCreatorCourses,
      getTotalCourses,

      // Course License
      mintLicense,
      hasValidLicense,
      getLicense,
      getUserLicenses,

      // Progress Tracker
      completeSection,
      getUserProgress,
      isCourseCompleted,

      // Certificate Manager
      issueCertificate,
      getCertificateForCourse,
      getUserCertificates,
    }),
    [
      isInitialized,
      initError,
      modalPreventionActive,
      contractAddresses,
      getMaxPriceETH,
      createCourse,
      getAllCourses,
      getCourse,
      getCourseSections,
      getCourseSectionsCount,
      addCourseSection,
      getCreatorCourses,
      getTotalCourses,
      mintLicense,
      hasValidLicense,
      getLicense,
      getUserLicenses,
      completeSection,
      getUserProgress,
      isCourseCompleted,
      issueCertificate,
      getCertificateForCourse,
      getUserCertificates,
    ]
  );

  return (
    <Web3Context.Provider value={contextValue}>{children}</Web3Context.Provider>
  );
}
