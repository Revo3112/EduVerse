// src/contexts/Web3Context.js - MASTER LEVEL: Complete & Fixed
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { ethers } from "ethers";
import { BLOCKCHAIN_CONFIG } from "../constants/blockchain";
import CourseFactoryABI from "../constants/abi/CourseFactory.json";
import CourseLicenseABI from "../constants/abi/CourseLicense.json";
import ProgressTrackerABI from "../constants/abi/ProgressTracker.json";
import CertificateManagerABI from "../constants/abi/CertificateManager.json";

const Web3Context = createContext(null);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within Web3Provider");
  }
  return context;
};

// ✅ MASTER: Stable helper function outside component
function publicClientToProvider(publicClient) {
  const { chain, transport } = publicClient;

  if (transport.type === "fallback") {
    const firstTransport = transport.transports[0];
    return new ethers.JsonRpcProvider(
      firstTransport.value?.url || firstTransport.value,
      {
        chainId: chain.id,
        name: chain.name,
      }
    );
  }

  return new ethers.JsonRpcProvider(transport.url, {
    chainId: chain.id,
    name: chain.name,
  });
}

export function Web3Provider({ children }) {
  const { address, isConnected, status } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // ✅ MASTER: Atomic state management
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contracts, setContracts] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);

  // ✅ MASTER: Advanced cache system
  const licenseCache = useRef(new Map());
  const progressCache = useRef(new Map());
  const cacheExpiry = 30000;

  // ✅ MASTER: Prevent render loops with stable refs
  const stableRefs = useRef({
    lastPublicClientKey: null,
    lastWalletClientKey: null,
    lastSignerAddress: null,
    isInitializing: false,
    initializationPromise: null,
    hasEverInitialized: false,
    modalPreventionActive: false, // ✅ NEW: Prevent modal triggers
  });

  // ✅ MASTER: Memoized client keys for stable comparison
  const publicClientKey = useMemo(() => {
    if (!publicClient) return null;
    return `${publicClient.chain?.id}-${publicClient.transport?.url}-${publicClient.transport?.type}`;
  }, [publicClient]);

  const walletClientKey = useMemo(() => {
    if (!walletClient) return null;
    return `${walletClient.account?.address}-${walletClient.transport?.type}`;
  }, [walletClient]);

  // ✅ MASTER: Provider initialization with strict change detection
  useEffect(() => {
    if (!publicClient) {
      setProvider(null);
      stableRefs.current.lastPublicClientKey = null;
      return;
    }

    // ✅ CRITICAL: Only initialize if client ACTUALLY changed
    if (stableRefs.current.lastPublicClientKey === publicClientKey) {
      return; // Same client, skip completely
    }

    try {
      console.log("Initializing provider...");
      const ethersProvider = publicClientToProvider(publicClient);
      setProvider(ethersProvider);
      stableRefs.current.lastPublicClientKey = publicClientKey;
      console.log("Provider initialized successfully");
    } catch (error) {
      console.error("Failed to initialize provider:", error);
      setInitError(error.message);
      setProvider(null);
    }
  }, [publicClientKey]);

  // ✅ MASTER: Signer initialization with connection state validation
  useEffect(() => {
    // ✅ CRITICAL: Only process on stable connection states
    if (status === "connecting" || status === "reconnecting") {
      return; // Wait for stability
    }

    // ✅ Clear signer if disconnected
    if (!walletClient || !isConnected || status !== "connected") {
      if (signer) {
        console.log("Wallet disconnected, clearing signer");
        setSigner(null);
      }
      stableRefs.current.lastWalletClientKey = null;
      stableRefs.current.lastSignerAddress = null;
      return;
    }

    // ✅ CRITICAL: Only initialize if wallet ACTUALLY changed
    if (stableRefs.current.lastWalletClientKey === walletClientKey) {
      return; // Same wallet, skip completely
    }

    const initializeSigner = async () => {
      try {
        console.log("Initializing signer...");
        const ethersSigner = await new ethers.BrowserProvider(
          walletClient.transport
        ).getSigner();

        setSigner(ethersSigner);
        stableRefs.current.lastWalletClientKey = walletClientKey;
        stableRefs.current.lastSignerAddress = ethersSigner.address;
        console.log("Signer initialized successfully");
      } catch (error) {
        console.error("Failed to initialize signer:", error);
        setInitError(error.message);
        setSigner(null);
      }
    };

    initializeSigner();
  }, [walletClientKey, isConnected, status]);

  // ✅ MASTER: Advanced contract initialization with promise caching
  useEffect(() => {
    if (!provider || !signer) {
      if (Object.keys(contracts).length > 0) {
        setContracts({});
        setIsInitialized(false);
      }
      return;
    }

    const currentSignerAddress = signer.address;

    // ✅ CRITICAL: Check if already initialized for this exact signer
    if (
      isInitialized &&
      contracts.courseFactory &&
      stableRefs.current.lastSignerAddress === currentSignerAddress &&
      stableRefs.current.hasEverInitialized
    ) {
      console.log("✅ Contracts already initialized for this signer, skipping");
      return;
    }

    // ✅ CRITICAL: Prevent multiple simultaneous initializations
    if (stableRefs.current.isInitializing) {
      console.log("🔄 Contract initialization already in progress, waiting...");
      return;
    }

    if (stableRefs.current.initializationPromise) {
      console.log("⏳ Using existing initialization promise...");
      return;
    }

    const initializeContracts = async () => {
      try {
        console.log("Initializing contracts...");
        stableRefs.current.isInitializing = true;
        stableRefs.current.modalPreventionActive = true; // ✅ Prevent modal triggers

        const addresses = BLOCKCHAIN_CONFIG.CONTRACTS;

        if (!addresses.courseFactory) {
          throw new Error("Contract addresses not configured");
        }

        const contractInstances = {
          courseFactory: new ethers.Contract(
            addresses.courseFactory,
            CourseFactoryABI,
            signer
          ),
          courseLicense: new ethers.Contract(
            addresses.courseLicense,
            CourseLicenseABI,
            signer
          ),
          progressTracker: new ethers.Contract(
            addresses.progressTracker,
            ProgressTrackerABI,
            signer
          ),
          certificateManager: new ethers.Contract(
            addresses.certificateManager,
            CertificateManagerABI,
            signer
          ),
        };

        const verifyPromises = Object.entries(contractInstances).map(
          async ([name, contract]) => {
            const code = await provider.getCode(contract.target);
            if (code === "0x") {
              throw new Error(
                `${name} contract not deployed at ${contract.target}`
              );
            }
            return { name, verified: true };
          }
        );

        await Promise.all(verifyPromises);

        // ✅ CRITICAL: Set state atomically to prevent multiple renders
        setContracts(contractInstances);
        setIsInitialized(true);
        setInitError(null);

        stableRefs.current.lastSignerAddress = currentSignerAddress;
        stableRefs.current.hasEverInitialized = true;

        console.log("All contracts initialized successfully");

        // ✅ CRITICAL: Delay before allowing modal triggers again
        setTimeout(() => {
          stableRefs.current.modalPreventionActive = false;
        }, 3000);

        stableRefs.current.initializationPromise = null;
      } catch (error) {
        console.error("Failed to initialize contracts:", error);
        setInitError(error.message);
        setIsInitialized(false);
        setContracts({});
        stableRefs.current.initializationPromise = null;
        stableRefs.current.modalPreventionActive = false;
      } finally {
        stableRefs.current.isInitializing = false;
      }
    };

    stableRefs.current.initializationPromise = initializeContracts();

    const timeoutId = setTimeout(() => {
      stableRefs.current.initializationPromise;
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [provider, signer]);

  // ✅ MASTER: Cleanup on disconnect
  useEffect(() => {
    if (!isConnected && stableRefs.current.hasEverInitialized) {
      console.log("Caches cleared due to disconnect");

      licenseCache.current.clear();
      progressCache.current.clear();
      setContracts({});
      setIsInitialized(false);
      setInitError(null);

      stableRefs.current = {
        lastPublicClientKey: null,
        lastWalletClientKey: null,
        lastSignerAddress: null,
        isInitializing: false,
        initializationPromise: null,
        hasEverInitialized: false,
        modalPreventionActive: false,
      };
    }
  }, [isConnected]);

  // ✅ MASTER: All contract methods with stable callbacks
  const retryOperation = useCallback(async (operation, maxRetries = 3) => {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (
          error.message?.includes("user rejected") ||
          error.message?.includes("insufficient funds")
        ) {
          throw error;
        }

        if (attempt < maxRetries) {
          console.log(`Retry attempt ${attempt}/${maxRetries}`);
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw lastError;
  }, []);

  // ✅ KEEP ALL YOUR EXISTING CONTRACT METHODS HERE
  const createCourse = useCallback(
    async (courseData) => {
      if (!isInitialized || !contracts.courseFactory) {
        throw new Error("Contracts not initialized");
      }

      return retryOperation(async () => {
        const { title, description, thumbnailCID, pricePerMonth } = courseData;
        const priceInWei = ethers.parseEther(pricePerMonth.toString());

        const tx = await contracts.courseFactory.createCourse(
          title.trim(),
          description.trim(),
          thumbnailCID.trim(),
          priceInWei
        );

        const receipt = await tx.wait();

        const event = receipt.logs
          .map((log) => {
            try {
              return contracts.courseFactory.interface.parseLog(log);
            } catch {
              return null;
            }
          })
          .find((parsed) => parsed?.name === "CourseCreated");

        return {
          success: true,
          courseId: event.args.courseId.toString(),
          transactionHash: receipt.hash,
        };
      });
    },
    [contracts, isInitialized, retryOperation]
  );

  const getAllCourses = useCallback(
    async (offset = 0, limit = 20) => {
      if (!isInitialized || !contracts.courseFactory) {
        throw new Error("Contracts not initialized");
      }

      return retryOperation(async () => {
        let coursesData;

        try {
          coursesData = await contracts.courseFactory.getAllCourses(
            offset,
            limit
          );
        } catch (error) {
          const total = await contracts.courseFactory.getTotalCourses();
          const start = offset + 1;
          const end = Math.min(Number(total), offset + limit);

          const promises = [];
          for (let i = start; i <= end; i++) {
            promises.push(contracts.courseFactory.getCourse(i));
          }

          coursesData = await Promise.all(promises);
        }

        return coursesData
          .filter((course) => course?.isActive)
          .map((course) => ({
            id: course.id.toString(),
            title: course.title,
            description: course.description,
            thumbnailCID: course.thumbnailCID,
            creator: course.creator,
            pricePerMonth: ethers.formatEther(course.pricePerMonth),
            pricePerMonthWei: course.pricePerMonth.toString(),
            isActive: course.isActive,
            createdAt: new Date(Number(course.createdAt) * 1000),
          }));
      });
    },
    [contracts, isInitialized, retryOperation]
  );

  const getCourse = useCallback(
    async (courseId) => {
      if (!isInitialized || !contracts.courseFactory) {
        throw new Error("Contracts not initialized");
      }

      return retryOperation(async () => {
        const course = await contracts.courseFactory.getCourse(courseId);

        return {
          id: course.id.toString(),
          title: course.title,
          description: course.description,
          thumbnailCID: course.thumbnailCID,
          creator: course.creator,
          pricePerMonth: ethers.formatEther(course.pricePerMonth),
          pricePerMonthWei: course.pricePerMonth.toString(),
          isActive: course.isActive,
          createdAt: new Date(Number(course.createdAt) * 1000),
        };
      });
    },
    [contracts, isInitialized, retryOperation]
  );

  const getCourseSections = useCallback(
    async (courseId) => {
      if (!isInitialized || !contracts.courseFactory) {
        throw new Error("Contracts not initialized");
      }

      return retryOperation(async () => {
        const sections = await contracts.courseFactory.getCourseSections(
          courseId
        );

        return sections.map((section) => ({
          id: section.id.toString(),
          courseId: section.courseId.toString(),
          title: section.title,
          contentCID: section.contentCID,
          duration: Number(section.duration),
          orderId: Number(section.orderId),
        }));
      });
    },
    [contracts, isInitialized, retryOperation]
  );

  const addCourseSection = useCallback(
    async (courseId, sectionData) => {
      if (!isInitialized || !contracts.courseFactory) {
        throw new Error("Contracts not initialized");
      }

      return retryOperation(async () => {
        const { title, contentCID, duration } = sectionData;

        const tx = await contracts.courseFactory.addCourseSection(
          courseId,
          title.trim(),
          contentCID.trim(),
          duration
        );

        const receipt = await tx.wait();

        return {
          success: true,
          transactionHash: receipt.hash,
        };
      });
    },
    [contracts, isInitialized, retryOperation]
  );

  const getCreatorCourses = useCallback(
    async (creatorAddress) => {
      if (!isInitialized || !contracts.courseFactory) {
        throw new Error("Contracts not initialized");
      }

      return retryOperation(async () => {
        const courseIds = await contracts.courseFactory.getCreatorCourses(
          creatorAddress
        );

        const courses = await Promise.all(
          courseIds.map(async (id) => {
            const course = await getCourse(id.toString());
            return course;
          })
        );

        return courses.filter((course) => course !== null);
      });
    },
    [contracts, isInitialized, getCourse, retryOperation]
  );

  const getTotalCourses = useCallback(async () => {
    if (!isInitialized || !contracts.courseFactory) {
      throw new Error("Contracts not initialized");
    }

    return retryOperation(async () => {
      const total = await contracts.courseFactory.getTotalCourses();
      return Number(total);
    });
  }, [contracts, isInitialized, retryOperation]);

  const getETHPrice = useCallback(async () => {
    if (!isInitialized || !contracts.courseFactory) {
      throw new Error("Contracts not initialized");
    }

    return retryOperation(async () => {
      const price = await contracts.courseFactory.getETHPrice();
      return ethers.formatUnits(price, 8);
    });
  }, [contracts, isInitialized, retryOperation]);

  const getMaxPriceInETH = useCallback(async () => {
    if (!isInitialized || !contracts.courseFactory) {
      throw new Error("Contracts not initialized");
    }

    return retryOperation(async () => {
      const maxPrice = await contracts.courseFactory.getMaxPriceInETH();
      return ethers.formatEther(maxPrice);
    });
  }, [contracts, isInitialized, retryOperation]);

  // License Methods
  const mintLicense = useCallback(
    async (courseId, duration = 1) => {
      if (!isInitialized || !contracts.courseLicense) {
        throw new Error("Contracts not initialized");
      }

      return retryOperation(async () => {
        const course = await getCourse(courseId);
        const pricePerMonthInWei = BigInt(course.pricePerMonthWei);
        const totalPrice = pricePerMonthInWei * BigInt(duration);

        const tx = await contracts.courseLicense.mintLicense(
          courseId,
          duration,
          {
            value: totalPrice,
          }
        );

        const receipt = await tx.wait();

        const cacheKey = `${address}-${courseId}`;
        licenseCache.current.delete(cacheKey);

        return {
          success: true,
          transactionHash: receipt.hash,
        };
      });
    },
    [contracts, isInitialized, address, getCourse, retryOperation]
  );

  const hasValidLicense = useCallback(
    async (userAddress, courseId) => {
      if (!isInitialized || !contracts.courseLicense) {
        throw new Error("Contracts not initialized");
      }

      const cacheKey = `${userAddress}-${courseId}`;
      const cached = licenseCache.current.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < cacheExpiry) {
        return cached.result;
      }

      return retryOperation(async () => {
        const isValid = await contracts.courseLicense.hasValidLicense(
          userAddress,
          courseId
        );

        licenseCache.current.set(cacheKey, {
          result: isValid,
          timestamp: Date.now(),
        });

        return isValid;
      });
    },
    [contracts, isInitialized, cacheExpiry, retryOperation]
  );

  const getLicense = useCallback(
    async (userAddress, courseId) => {
      if (!isInitialized || !contracts.courseLicense) {
        throw new Error("Contracts not initialized");
      }

      return retryOperation(async () => {
        const licenseData = await contracts.courseLicense.getLicense(
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
      });
    },
    [contracts, isInitialized, retryOperation]
  );

  const getUserLicenses = useCallback(
    async (userAddress) => {
      if (!isInitialized || !contracts.courseLicense) {
        throw new Error("Contracts not initialized");
      }

      return retryOperation(async () => {
        const totalCourses = await getTotalCourses();
        const licenses = [];

        for (let courseId = 1; courseId <= totalCourses; courseId++) {
          try {
            const balance = await contracts.courseLicense.balanceOf(
              userAddress,
              courseId
            );

            if (Number(balance) > 0) {
              const licenseData = await getLicense(userAddress, courseId);
              if (licenseData.isActive) {
                licenses.push({
                  ...licenseData,
                  courseId: courseId.toString(),
                });
              }
            }
          } catch (error) {
            console.warn(
              `Failed to check license for course ${courseId}:`,
              error.message
            );
          }
        }

        return licenses;
      });
    },
    [contracts, isInitialized, getTotalCourses, getLicense, retryOperation]
  );

  // Progress Tracker Methods
  const completeSection = useCallback(
    async (courseId, sectionId) => {
      if (!isInitialized || !contracts.progressTracker) {
        throw new Error("Contracts not initialized");
      }

      return retryOperation(async () => {
        const tx = await contracts.progressTracker.completeSection(
          courseId,
          sectionId
        );
        const receipt = await tx.wait();

        const cacheKey = `progress_${address}_${courseId}`;
        progressCache.current.delete(cacheKey);

        return {
          success: true,
          transactionHash: receipt.hash,
        };
      });
    },
    [contracts, isInitialized, address, retryOperation]
  );

  const getUserProgress = useCallback(
    async (userAddress, courseId) => {
      if (!isInitialized || !contracts.progressTracker) {
        throw new Error("Contracts not initialized");
      }

      const cacheKey = `progress_${userAddress}_${courseId}`;
      const cached = progressCache.current.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < cacheExpiry) {
        return cached.progress;
      }

      return retryOperation(async () => {
        try {
          const sectionsProgress =
            await contracts.progressTracker.getCourseSectionsProgress(
              userAddress,
              courseId
            );

          const completedSections = sectionsProgress.filter((p) => p).length;
          const progressPercentage =
            await contracts.progressTracker.getCourseProgressPercentage(
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

          progressCache.current.set(cacheKey, {
            progress,
            timestamp: Date.now(),
          });

          return progress;
        } catch (error) {
          console.error(`Error fetching user progress:`, error.message);

          const defaultProgress = {
            courseId: courseId.toString(),
            completedSections: 0,
            totalSections: 0,
            progressPercentage: 0,
            sectionsProgress: [],
          };

          progressCache.current.set(cacheKey, {
            progress: defaultProgress,
            timestamp: Date.now(),
          });

          return defaultProgress;
        }
      });
    },
    [contracts, isInitialized, cacheExpiry, retryOperation]
  );

  const isCourseCompleted = useCallback(
    async (userAddress, courseId) => {
      if (!isInitialized || !contracts.progressTracker) {
        throw new Error("Contracts not initialized");
      }

      return retryOperation(async () => {
        return await contracts.progressTracker.isCourseCompleted(
          userAddress,
          courseId
        );
      });
    },
    [contracts, isInitialized, retryOperation]
  );

  // Certificate Methods
  const issueCertificate = useCallback(
    async (courseId, studentName) => {
      if (!isInitialized || !contracts.certificateManager) {
        throw new Error("Contracts not initialized");
      }

      return retryOperation(async () => {
        const fee = await contracts.certificateManager.certificateFee();

        const tx = await contracts.certificateManager.issueCertificate(
          courseId,
          studentName.trim(),
          { value: fee }
        );

        const receipt = await tx.wait();

        return {
          success: true,
          transactionHash: receipt.hash,
        };
      });
    },
    [contracts, isInitialized, retryOperation]
  );

  const getCertificateForCourse = useCallback(
    async (userAddress, courseId) => {
      if (!isInitialized || !contracts.certificateManager) {
        throw new Error("Contracts not initialized");
      }

      return retryOperation(async () => {
        try {
          const certificateId =
            await contracts.certificateManager.getStudentCertificate(
              userAddress,
              courseId
            );

          if (Number(certificateId) === 0) {
            return null;
          }

          const cert = await contracts.certificateManager.getCertificate(
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
          console.error(`Error fetching certificate:`, error.message);
          return null;
        }
      });
    },
    [contracts, isInitialized, retryOperation]
  );

  const getUserCertificates = useCallback(
    async (userAddress) => {
      if (!isInitialized || !contracts.certificateManager) {
        throw new Error("Contracts not initialized");
      }

      return retryOperation(async () => {
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
          } catch (certError) {
            console.warn(
              `Failed to get certificate for course ${license.courseId}:`,
              certError.message
            );
          }
        }

        return certificates;
      });
    },
    [
      contracts,
      isInitialized,
      getUserLicenses,
      getCertificateForCourse,
      retryOperation,
    ]
  );

  // ✅ CRITICAL FIX: Export ALL methods in contextValue
  const contextValue = useMemo(() => {
    return {
      // State
      contracts: Object.keys(contracts).length > 0 ? contracts : {},
      provider,
      signer,
      isInitialized,
      initError,

      // ✅ ALL METHODS EXPORTED
      retryOperation,
      createCourse,
      getAllCourses,
      getCourse,
      getCourseSections,
      addCourseSection,
      getCreatorCourses,
      getTotalCourses,
      getETHPrice,
      getMaxPriceInETH,

      // License methods
      mintLicense,
      hasValidLicense,
      getLicense,
      getUserLicenses,

      // Progress methods
      completeSection,
      getUserProgress,
      isCourseCompleted,

      // Certificate methods
      issueCertificate,
      getCertificateForCourse,
      getUserCertificates,

      // ✅ Modal prevention status
      modalPreventionActive: stableRefs.current.modalPreventionActive,
    };
  }, [
    // ✅ Stable dependencies
    Object.keys(contracts).length,
    Boolean(provider),
    Boolean(signer),
    isInitialized,
    initError,

    // Method dependencies
    retryOperation,
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
  ]);

  return (
    <Web3Context.Provider value={contextValue}>{children}</Web3Context.Provider>
  );
}
