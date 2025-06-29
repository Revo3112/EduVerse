// src/contexts/Web3Context.js - FIXED: Proper Wagmi v2 Hook Usage
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
import { parseEther, formatEther, formatUnits, decodeEventLog } from "viem";
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

  // ✅ FIXED: State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);
  const [modalPreventionActive, setModalPreventionActive] = useState(false);

  // ✅ Cache management
  const cacheRef = useRef({
    licenses: new Map(),
    progress: new Map(),
    courses: new Map(),
    cacheExpiry: 30000, // 30 seconds
  });

  // ✅ Contract addresses
  const contractAddresses = useMemo(
    () => ({
      courseFactory: BLOCKCHAIN_CONFIG.CONTRACTS.courseFactory,
      courseLicense: BLOCKCHAIN_CONFIG.CONTRACTS.courseLicense,
      progressTracker: BLOCKCHAIN_CONFIG.CONTRACTS.progressTracker,
      certificateManager: BLOCKCHAIN_CONFIG.CONTRACTS.certificateManager,
    }),
    []
  );

  // ✅ Initialization effect
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
          console.log("✅ All contracts verified");
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

  // ==================== COURSE FACTORY FUNCTIONS ====================

  // ✅ CRITICAL FIX: Proper Wagmi v2 createCourse implementation
  const createCourse = useCallback(
    async (courseData) => {
      if (!isInitialized || !walletClient || !publicClient) {
        throw new Error("Not initialized or wallet not connected");
      }

      const { title, description, thumbnailCID, pricePerMonth } = courseData;

      try {
        console.log("📝 Preparing course creation transaction...");

        // CRITICAL: Ensure wallet is ready
        if (!walletClient.account) {
          throw new Error("Wallet not properly connected. Please reconnect.");
        }

        const priceInWei = parseEther(pricePerMonth.toString());

        // FIX 1: Properly format the transaction for Wagmi v2
        const transactionRequest = {
          address: contractAddresses.courseFactory,
          abi: CourseFactoryABI,
          functionName: "createCourse",
          args: [
            title.trim(),
            description.trim(),
            thumbnailCID.trim(),
            priceInWei,
          ],
          account: walletClient.account,
          chain: mantaPacificTestnet,
        };

        console.log("📊 Transaction parameters:", {
          to: transactionRequest.address,
          functionName: transactionRequest.functionName,
          from: walletClient.account.address,
        });

        // FIX 2: Skip simulation if it's causing issues
        // Some wallets/RPCs have issues with simulation
        let skipSimulation = false;
        let gasEstimate = null;

        try {
          // Try simulation first
          const simulateResult = await publicClient.simulateContract({
            ...transactionRequest,
            account: walletClient.account.address, // Use address string for simulation
          });

          console.log("✅ Transaction simulated successfully");

          // Extract gas estimate if available
          if (simulateResult.request?.gas) {
            gasEstimate = simulateResult.request.gas;
          }
        } catch (simError) {
          console.warn(
            "⚠️ Simulation failed, proceeding without simulation:",
            simError
          );
          skipSimulation = true;

          // Try to estimate gas directly
          try {
            gasEstimate = await publicClient.estimateContractGas({
              ...transactionRequest,
              account: walletClient.account.address,
            });
            console.log("⛽ Gas estimated:", gasEstimate);
          } catch (gasError) {
            console.warn("⚠️ Gas estimation failed:", gasError);
          }
        }

        // FIX 3: Prepare the write transaction with proper Wagmi v2 format
        console.log("📤 Sending transaction...");

        // Build the transaction config
        const writeConfig = {
          address: contractAddresses.courseFactory,
          abi: CourseFactoryABI,
          functionName: "createCourse",
          args: [
            title.trim(),
            description.trim(),
            thumbnailCID.trim(),
            priceInWei,
          ],
        };

        // Add gas if we have an estimate
        if (gasEstimate) {
          writeConfig.gas = (BigInt(gasEstimate) * 120n) / 100n; // 20% buffer
        }

        // FIX 4: Execute transaction with proper error handling
        let hash;
        try {
          hash = await walletClient.writeContract(writeConfig);
          console.log("✅ Transaction hash received:", hash);
        } catch (writeError) {
          console.error("❌ Write contract error:", writeError);

          // Check for specific error types
          if (
            writeError.cause?.code === 4001 ||
            writeError.message?.toLowerCase().includes("user rejected") ||
            writeError.message?.toLowerCase().includes("user denied")
          ) {
            throw new Error("Transaction was rejected by user");
          } else if (
            writeError.message?.toLowerCase().includes("insufficient funds")
          ) {
            throw new Error("Insufficient ETH for gas fees");
          } else if (writeError.cause?.code === -32603) {
            // Internal JSON-RPC error - could be various issues
            throw new Error(
              "Transaction failed. Please check your wallet connection and try again."
            );
          }

          throw writeError;
        }

        console.log("⏳ Waiting for transaction confirmation...");

        // FIX 5: Wait for receipt with better error handling
        let receipt;
        try {
          receipt = await publicClient.waitForTransactionReceipt({
            hash,
            confirmations: 1,
            timeout: 90000, // 90 seconds timeout
            onReplaced: (replacement) => {
              console.log("⚠️ Transaction was replaced:", replacement);
              if (replacement.reason === "cancelled") {
                throw new Error("Transaction was cancelled");
              }
              return replacement.receipt;
            },
          });

          console.log("✅ Transaction confirmed:", {
            status: receipt.status,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed?.toString(),
          });
        } catch (waitError) {
          console.error("❌ Wait for receipt error:", waitError);

          // Check if transaction exists on chain
          try {
            const tx = await publicClient.getTransaction({ hash });
            if (tx) {
              console.log(
                "ℹ️ Transaction found on chain but not confirmed yet"
              );
              throw new Error(
                `Transaction pending. Hash: ${hash}. Please check your wallet or explorer.`
              );
            }
          } catch (txCheckError) {
            console.error("Failed to check transaction:", txCheckError);
          }

          throw new Error(`Transaction may have failed. Hash: ${hash}`);
        }

        // Check transaction status
        if (receipt.status === "reverted") {
          throw new Error(
            "Transaction reverted on-chain. Please check your inputs."
          );
        }

        // FIX 6: Parse event logs more robustly
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
              // Skip logs that don't match
              continue;
            }
          }
        }

        // Fallback: get courseId from creator's courses
        if (!courseId && walletClient.account) {
          console.log("⚠️ Could not parse CourseCreated event, using fallback");
          try {
            // Get creator's courses
            const creatorCourses = await publicClient.readContract({
              address: contractAddresses.courseFactory,
              abi: CourseFactoryABI,
              functionName: "getCreatorCourses",
              args: [walletClient.account.address],
            });

            if (creatorCourses && creatorCourses.length > 0) {
              // The last course should be the one we just created
              courseId = creatorCourses[creatorCourses.length - 1].toString();
              console.log(
                "📍 Fallback courseId from creator courses:",
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
        console.error("Create course error details:", {
          error,
          message: error.message,
          cause: error.cause,
          details: error.details,
        });

        // Enhanced error messages
        if (error.message?.includes("rejected by user")) {
          throw new Error("Transaction was cancelled by user");
        } else if (error.message?.includes("insufficient funds")) {
          throw new Error(
            "Insufficient ETH for gas fees. Please add funds to your wallet."
          );
        } else if (error.message?.includes("wallet not properly connected")) {
          throw new Error(
            "Wallet disconnected. Please reconnect and try again."
          );
        } else if (error.message?.includes("Transaction pending")) {
          throw error; // Pass through as-is
        } else if (error.message?.includes("Transaction may have failed")) {
          throw error; // Pass through as-is
        } else if (error.shortMessage) {
          throw new Error(`Contract error: ${error.shortMessage}`);
        }

        throw new Error(`Failed to create course: ${error.message}`);
      }
    },
    [isInitialized, walletClient, publicClient, contractAddresses]
  );

  // ✅ CRITICAL FIX: Proper Wagmi v2 addCourseSection implementation
  const addCourseSection = useCallback(
    async (courseId, sectionData) => {
      if (!isInitialized || !walletClient || !publicClient) {
        throw new Error("Not initialized or wallet not connected");
      }

      const { title, contentCID, duration } = sectionData;

      try {
        console.log("📝 Adding course section...");

        // Ensure wallet is ready
        if (!walletClient.account) {
          throw new Error("Wallet not properly connected. Please reconnect.");
        }

        // Prepare transaction
        const writeConfig = {
          address: contractAddresses.courseFactory,
          abi: CourseFactoryABI,
          functionName: "addCourseSection",
          args: [
            BigInt(courseId),
            title.trim(),
            contentCID.trim(),
            BigInt(duration),
          ],
        };

        // Try to estimate gas
        try {
          const gasEstimate = await publicClient.estimateContractGas({
            ...writeConfig,
            account: walletClient.account.address,
          });

          if (gasEstimate) {
            writeConfig.gas = (BigInt(gasEstimate) * 120n) / 100n; // 20% buffer
          }
        } catch (gasError) {
          console.warn(
            "⚠️ Gas estimation failed, proceeding without gas limit:",
            gasError
          );
        }

        // Execute transaction
        const hash = await walletClient.writeContract(writeConfig);
        console.log("✅ Section transaction hash:", hash);

        // Wait for receipt
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
          timeout: 60000,
        });

        console.log("✅ Section added successfully");

        return {
          success: true,
          transactionHash: receipt.transactionHash,
        };
      } catch (error) {
        console.error("Add section error:", error);

        if (
          error.cause?.code === 4001 ||
          error.message?.toLowerCase().includes("user rejected") ||
          error.message?.toLowerCase().includes("user denied")
        ) {
          throw new Error("Transaction was cancelled by user");
        }

        throw error;
      }
    },
    [isInitialized, walletClient, publicClient, contractAddresses]
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

  const getETHPrice = useCallback(async () => {
    if (!isInitialized || !publicClient) {
      throw new Error("Not initialized");
    }

    try {
      const price = await publicClient.readContract({
        address: contractAddresses.courseFactory,
        abi: CourseFactoryABI,
        functionName: "getETHPrice",
      });

      return formatUnits(price, 8);
    } catch (error) {
      console.error("Get ETH price error:", error);
      throw error;
    }
  }, [isInitialized, publicClient, contractAddresses]);

  const getMaxPriceInETH = useCallback(async () => {
    if (!isInitialized || !publicClient) {
      throw new Error("Not initialized");
    }

    try {
      const maxPrice = await publicClient.readContract({
        address: contractAddresses.courseFactory,
        abi: CourseFactoryABI,
        functionName: "getMaxPriceInETH",
      });

      return formatEther(maxPrice);
    } catch (error) {
      console.error("Get max price error:", error);
      throw error;
    }
  }, [isInitialized, publicClient, contractAddresses]);

  // ==================== COURSE LICENSE FUNCTIONS ====================

  // ✅ FIXED: Proper mintLicense without hooks inside
  const mintLicense = useCallback(
    async (courseId, duration = 1) => {
      if (!isInitialized || !walletClient || !publicClient) {
        throw new Error("Not initialized or wallet not connected");
      }

      try {
        // Ensure wallet is ready
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
        });

        const writeConfig = {
          address: contractAddresses.courseLicense,
          abi: CourseLicenseABI,
          functionName: "mintLicense",
          args: [BigInt(courseId), BigInt(duration)],
          value: totalPrice,
        };

        // Try to estimate gas
        try {
          const gasEstimate = await publicClient.estimateContractGas({
            ...writeConfig,
            account: walletClient.account.address,
          });

          if (gasEstimate) {
            writeConfig.gas = (BigInt(gasEstimate) * 120n) / 100n;
          }
        } catch (gasError) {
          console.warn("⚠️ Gas estimation failed:", gasError);
        }

        const hash = await walletClient.writeContract(writeConfig);
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

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

        const writeConfig = {
          address: contractAddresses.progressTracker,
          abi: ProgressTrackerABI,
          functionName: "completeSection",
          args: [BigInt(courseId), BigInt(sectionId)],
        };

        // Try to estimate gas
        try {
          const gasEstimate = await publicClient.estimateContractGas({
            ...writeConfig,
            account: walletClient.account.address,
          });

          if (gasEstimate) {
            writeConfig.gas = (BigInt(gasEstimate) * 120n) / 100n;
          }
        } catch (gasError) {
          console.warn("⚠️ Gas estimation failed:", gasError);
        }

        const hash = await walletClient.writeContract(writeConfig);
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

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
    [isInitialized, walletClient, publicClient, contractAddresses, address]
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

        const writeConfig = {
          address: contractAddresses.certificateManager,
          abi: CertificateManagerABI,
          functionName: "issueCertificate",
          args: [BigInt(courseId), studentName.trim()],
          value: fee,
        };

        // Try to estimate gas
        try {
          const gasEstimate = await publicClient.estimateContractGas({
            ...writeConfig,
            account: walletClient.account.address,
          });

          if (gasEstimate) {
            writeConfig.gas = (BigInt(gasEstimate) * 120n) / 100n;
          }
        } catch (gasError) {
          console.warn("⚠️ Gas estimation failed:", gasError);
        }

        const hash = await walletClient.writeContract(writeConfig);
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

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
    [isInitialized, walletClient, publicClient, contractAddresses]
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

      // Course Factory
      createCourse,
      getAllCourses,
      getCourse,
      getCourseSections,
      addCourseSection,
      getCreatorCourses,
      getTotalCourses,
      getETHPrice,
      getMaxPriceInETH,

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
      createCourse,
      getAllCourses,
      getCourse,
      getCourseSections,
      addCourseSection,
      getCreatorCourses,
      getTotalCourses,
      getETHPrice,
      getMaxPriceInETH,
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
