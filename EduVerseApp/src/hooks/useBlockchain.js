import { useState, useEffect, useCallback, useRef } from "react";
import { usePublicClient, useWalletClient, useAccount } from "wagmi";
import { ethers } from "ethers";
import SmartContractService from "../services/SmartContractService";

// ✅ Helper functions
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

function walletClientToSigner(walletClient, publicClient) {
  return new ethers.BrowserProvider(walletClient.transport, {
    chainId: walletClient.chain.id,
    name: walletClient.chain.name,
  });
}

// ✅ FIXED: Persistent SmartContract Hook - Initialize Once, Use Forever
export const useSmartContract = () => {
  const { isConnected, status } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);

  // ✅ FIXED: Persistent refs - never reset unless explicitly needed
  const hasEverInitialized = useRef(false);
  const initializationInProgress = useRef(false);
  const lastSuccessfulProvider = useRef(null);
  const initTimer = useRef(null);

  // ✅ FIXED: Smart initialization - only when really needed
  const initializeServiceOnce = useCallback(async () => {
    // ✅ SKIP if already initialized and providers haven't changed
    if (hasEverInitialized.current && isInitialized) {
      console.log("✅ SmartContractService already initialized, skipping...");
      return;
    }

    // ✅ SKIP if initialization in progress
    if (initializationInProgress.current) {
      console.log("⏳ Initialization already in progress, skipping...");
      return;
    }

    // ✅ SKIP if requirements not met
    if (!publicClient || !walletClient || !isConnected) {
      console.log("❌ Requirements not met for initialization:", {
        publicClient: !!publicClient,
        walletClient: !!walletClient,
        isConnected,
      });
      return;
    }

    // ✅ CHECK if providers actually changed
    const currentProviderKey = `${publicClient.chain.id}-${walletClient.account.address}`;
    if (
      hasEverInitialized.current &&
      lastSuccessfulProvider.current === currentProviderKey
    ) {
      console.log("✅ Same providers, using existing initialization");
      setIsInitialized(true);
      setError(null);
      return;
    }

    initializationInProgress.current = true;

    try {
      console.log("🚀 Initializing SmartContractService (one-time setup)...");

      const provider = publicClientToProvider(publicClient);
      const browserProvider = walletClientToSigner(walletClient, publicClient);

      // ✅ Test provider connection first
      const network = await provider.getNetwork();
      console.log("✅ Provider connected to network:", {
        chainId: Number(network.chainId),
        name: network.name || "Unknown",
      });

      await SmartContractService.initialize(provider, browserProvider);

      // ✅ Mark as successfully initialized
      hasEverInitialized.current = true;
      lastSuccessfulProvider.current = currentProviderKey;
      setIsInitialized(true);
      setError(null);

      console.log(
        "✅ SmartContractService initialized successfully! (Will persist until app restart)"
      );
    } catch (err) {
      console.error("❌ SmartContractService initialization failed:", err);
      setError(err.message);
      setIsInitialized(false);

      // ✅ Only retry if never successfully initialized
      if (!hasEverInitialized.current) {
        console.log("🔄 Will retry initialization in 3 seconds...");
        setTimeout(() => {
          initializationInProgress.current = false;
          initializeServiceOnce();
        }, 3000);
        return;
      }
    } finally {
      initializationInProgress.current = false;
    }
  }, [publicClient, walletClient, isConnected, isInitialized]);

  // ✅ FIXED: Minimal useEffect - only trigger when absolutely necessary
  useEffect(() => {
    // Clear any existing timer
    if (initTimer.current) {
      clearTimeout(initTimer.current);
      initTimer.current = null;
    }

    // ✅ Only initialize if connected and not already initialized
    if (status === "connected" && isConnected && !hasEverInitialized.current) {
      console.log(
        "🔗 Wallet connected for first time, initializing SmartContractService..."
      );

      // ✅ Small delay for wallet stability
      initTimer.current = setTimeout(() => {
        initializeServiceOnce();
      }, 500);
    }
    // ✅ Re-activate if previously initialized but currently not active
    else if (
      status === "connected" &&
      isConnected &&
      hasEverInitialized.current &&
      !isInitialized
    ) {
      console.log("🔄 Re-activating existing SmartContractService...");
      setIsInitialized(true);
      setError(null);
    }
    // ✅ Handle disconnection gracefully - don't reset, just mark as inactive
    else if (status === "disconnected" || !isConnected) {
      if (isInitialized) {
        console.log(
          "🔌 Wallet disconnected, deactivating service (keeping initialization)"
        );
        setIsInitialized(false);
        // ✅ Don't reset hasEverInitialized - keep the service ready for reconnection
      }
    }

    return () => {
      if (initTimer.current) {
        clearTimeout(initTimer.current);
        initTimer.current = null;
      }
    };
  }, [status, isConnected, initializeServiceOnce]);

  // ✅ FIXED: Enhanced debugging
  useEffect(() => {
    console.log("🔗 SmartContract Hook Status:", {
      status,
      isConnected,
      publicClient: !!publicClient,
      walletClient: !!walletClient,
      isInitialized,
      hasEverInitialized: hasEverInitialized.current,
      error: !!error,
    });
  }, [status, publicClient, walletClient, isConnected, isInitialized, error]);

  return {
    smartContractService: isInitialized ? SmartContractService : null,
    isInitialized,
    error,
    hasEverInitialized: hasEverInitialized.current,
  };
};

// ✅ Enhanced useCourses hook with pagination and caching
export const useCourses = (offset = 0, limit = 20) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCourses, setTotalCourses] = useState(0);
  const { isInitialized } = useSmartContract();

  const fetchCourses = useCallback(
    async (reset = false) => {
      if (!isInitialized) return;

      setLoading(true);
      setError(null);

      try {
        const currentOffset = reset ? 0 : offset;
        console.log(
          `📚 Fetching courses: offset=${currentOffset}, limit=${limit}`
        );

        // ✅ Use timeout for fetch operation
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), 30000)
        );

        const [coursesData, total] = await Promise.race([
          Promise.all([
            SmartContractService.getAllCourses(currentOffset, limit),
            SmartContractService.getTotalCourses(),
          ]),
          timeoutPromise,
        ]);

        if (reset) {
          setCourses(coursesData);
        } else {
          setCourses((prev) => [...prev, ...coursesData]);
        }

        setTotalCourses(total);
        setHasMore(currentOffset + coursesData.length < total);

        console.log(
          `✅ Fetched ${coursesData.length} courses (${
            currentOffset + coursesData.length
          }/${total})`
        );
      } catch (err) {
        console.error("❌ Error fetching courses:", err);
        setError(err.message || "Failed to fetch courses");
      } finally {
        setLoading(false);
      }
    },
    [isInitialized, offset, limit]
  );

  useEffect(() => {
    if (isInitialized) {
      fetchCourses(true);
    }
  }, [isInitialized]);

  return {
    courses,
    loading,
    error,
    hasMore,
    totalCourses,
    refetch: () => fetchCourses(true),
    loadMore: () => fetchCourses(false),
  };
};

// ✅ Enhanced useUserCourses hook with better error handling
export const useUserCourses = () => {
  const { address } = useAccount();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isInitialized } = useSmartContract();

  const fetchUserCourses = useCallback(async () => {
    if (!isInitialized || !address) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`👤 Fetching enrolled courses for: ${address}`);

      // ✅ Add timeout protection
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 45000)
      );

      const licenses = await Promise.race([
        SmartContractService.getUserLicenses(address),
        timeoutPromise,
      ]);

      const coursesWithProgress = [];

      // ✅ Process licenses in batches to avoid timeout
      const batchSize = 3;
      for (let i = 0; i < licenses.length; i += batchSize) {
        const batch = licenses.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batch.map(async (license) => {
            try {
              const course = await SmartContractService.getCourse(
                license.courseId
              );

              if (course) {
                let progress = null;
                try {
                  progress = await SmartContractService.getUserProgress(
                    address,
                    license.courseId
                  );
                } catch (progressError) {
                  console.warn(
                    `Progress not available for course ${license.courseId}:`,
                    progressError
                  );
                }

                return {
                  ...course,
                  license,
                  progress: progress?.progressPercentage || 0,
                  completedSections: progress?.completedSections?.length || 0,
                  totalSections:
                    progress?.totalSections || course.sectionsCount || 0,
                };
              }
              return null;
            } catch (err) {
              console.warn(
                `Failed to fetch course details for license ${license.tokenId}:`,
                err
              );
              return null;
            }
          })
        );

        coursesWithProgress.push(...batchResults.filter(Boolean));
      }

      setEnrolledCourses(coursesWithProgress);
      console.log(`✅ Fetched ${coursesWithProgress.length} enrolled courses`);
    } catch (err) {
      console.error("❌ Error fetching user courses:", err);
      setError(err.message || "Failed to fetch enrolled courses");
    } finally {
      setLoading(false);
    }
  }, [isInitialized, address]);

  useEffect(() => {
    if (isInitialized && address) {
      fetchUserCourses();
    }
  }, [fetchUserCourses]);

  return {
    enrolledCourses,
    loading,
    error,
    refetch: fetchUserCourses,
  };
};

// ✅ Enhanced useCreatorCourses hook
export const useCreatorCourses = () => {
  const { address } = useAccount();
  const [createdCourses, setCreatedCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isInitialized } = useSmartContract();

  const fetchCreatorCourses = useCallback(async () => {
    if (!isInitialized || !address) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`👨‍🏫 Fetching created courses for: ${address}`);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 30000)
      );

      const courses = await Promise.race([
        SmartContractService.getCreatorCourses(address),
        timeoutPromise,
      ]);

      setCreatedCourses(courses);
      console.log(`✅ Fetched ${courses.length} created courses`);
    } catch (err) {
      console.error("❌ Error fetching creator courses:", err);
      setError(err.message || "Failed to fetch created courses");
    } finally {
      setLoading(false);
    }
  }, [isInitialized, address]);

  useEffect(() => {
    if (isInitialized && address) {
      fetchCreatorCourses();
    }
  }, [fetchCreatorCourses]);

  return {
    createdCourses,
    loading,
    error,
    refetch: fetchCreatorCourses,
  };
};

// ✅ Enhanced useCreateCourse hook with robust transaction handling
export const useCreateCourse = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const { isInitialized } = useSmartContract();

  const createCourse = useCallback(
    async (courseData, sections = []) => {
      if (!isInitialized) {
        throw new Error("Smart contract service not initialized");
      }

      setLoading(true);
      setError(null);
      setProgress(0);

      try {
        console.log("🚀 Creating course with data:", {
          title: courseData.title,
          thumbnailCID: courseData.thumbnailCID,
          sectionsCount: sections.length,
        });

        setProgress(10);

        // ✅ Create course with optimized gas settings
        const courseResult = await SmartContractService.createCourse(
          {
            title: courseData.title,
            description: courseData.description,
            thumbnailCID: courseData.thumbnailCID,
            pricePerMonth: courseData.pricePerMonth || "0",
          },
          {
            gasLimit: "350000", // ✅ Optimized gas limit
            timeout: 90000, // ✅ 90 second timeout
          }
        );

        if (!courseResult.success) {
          throw new Error(courseResult.error || "Failed to create course");
        }

        const courseId = courseResult.courseId;
        console.log(`✅ Course created with ID: ${courseId}`);
        setProgress(40);

        // ✅ Add sections sequentially with delay between transactions
        const sectionResults = [];
        for (let i = 0; i < sections.length; i++) {
          const section = sections[i];
          try {
            console.log(
              `📖 Adding section ${i + 1}/${sections.length}: ${section.title}`
            );

            // ✅ Add delay between transactions to avoid nonce conflicts
            if (i > 0) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }

            const sectionResult = await SmartContractService.addCourseSection(
              courseId,
              {
                title: section.title,
                contentCID: section.contentCID,
                duration: section.duration,
              },
              {
                gasLimit: "250000", // ✅ Optimized gas limit for sections
                timeout: 60000, // ✅ 60 second timeout per section
              }
            );

            if (sectionResult.success) {
              sectionResults.push(sectionResult);
              console.log(`✅ Section ${i + 1} added successfully`);
            } else {
              console.warn(
                `❌ Failed to add section ${i + 1}:`,
                sectionResult.error
              );
            }

            // ✅ Update progress
            setProgress(40 + ((i + 1) / sections.length) * 50);
          } catch (err) {
            console.warn(`Failed to add section "${section.title}":`, err);
          }
        }

        setProgress(100);

        const successMessage = {
          success: true,
          courseId,
          transactionHash: courseResult.transactionHash,
          sectionsAdded: sectionResults.filter((r) => r.success).length,
          totalSections: sections.length,
          blockNumber: courseResult.blockNumber,
          gasUsed: courseResult.gasUsed,
        };

        console.log("🎉 Course creation completed:", successMessage);
        return successMessage;
      } catch (err) {
        console.error("❌ Error creating course:", err);
        setError(err.message || "Failed to create course");
        return {
          success: false,
          error: err.message || "Failed to create course",
        };
      } finally {
        setLoading(false);
        setTimeout(() => setProgress(0), 2000); // Reset progress after delay
      }
    },
    [isInitialized]
  );

  return {
    createCourse,
    loading,
    error,
    progress,
  };
};

// ✅ Enhanced useMintLicense hook with gas optimization
export const useMintLicense = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isInitialized } = useSmartContract();

  const mintLicense = useCallback(
    async (courseId, duration = 1) => {
      if (!isInitialized) {
        throw new Error("Smart contract service not initialized");
      }

      setLoading(true);
      setError(null);

      try {
        console.log(
          `🎫 Minting license for course ${courseId}, duration: ${duration} month(s)`
        );

        // ✅ Add timeout protection
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Transaction timeout")), 120000)
        );

        const result = await Promise.race([
          SmartContractService.mintLicense(courseId, duration),
          timeoutPromise,
        ]);

        if (!result.success) {
          throw new Error(result.error || "Failed to mint license");
        }

        console.log("✅ License minted successfully:", result);
        return result;
      } catch (err) {
        console.error("❌ Error minting license:", err);
        setError(err.message || "Failed to mint license");
        return {
          success: false,
          error: err.message || "Failed to mint license",
        };
      } finally {
        setLoading(false);
      }
    },
    [isInitialized]
  );

  return {
    mintLicense,
    loading,
    error,
  };
};

// ✅ Enhanced useUpdateProgress hook
export const useUpdateProgress = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isInitialized } = useSmartContract();

  const updateProgress = useCallback(
    async (courseId, sectionId, completed = true) => {
      if (!isInitialized) {
        throw new Error("Smart contract service not initialized");
      }

      setLoading(true);
      setError(null);

      try {
        console.log(
          `📈 Updating progress: course ${courseId}, section ${sectionId}, completed: ${completed}`
        );

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Transaction timeout")), 60000)
        );

        const result = await Promise.race([
          SmartContractService.updateProgress(courseId, sectionId, completed),
          timeoutPromise,
        ]);

        if (!result.success) {
          throw new Error(result.error || "Failed to update progress");
        }

        console.log("✅ Progress updated successfully");
        return result;
      } catch (err) {
        console.error("❌ Error updating progress:", err);
        setError(err.message || "Failed to update progress");
        return {
          success: false,
          error: err.message || "Failed to update progress",
        };
      } finally {
        setLoading(false);
      }
    },
    [isInitialized]
  );

  return {
    updateProgress,
    loading,
    error,
  };
};

// ✅ Enhanced useUserCertificates hook
export const useUserCertificates = () => {
  const { address } = useAccount();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isInitialized } = useSmartContract();

  const fetchCertificates = useCallback(async () => {
    if (!isInitialized || !address) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`🏆 Fetching certificates for: ${address}`);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 30000)
      );

      const certs = await Promise.race([
        SmartContractService.getUserCertificates(address),
        timeoutPromise,
      ]);

      setCertificates(certs);
      console.log(`✅ Fetched ${certs.length} certificates`);
    } catch (err) {
      console.error("❌ Error fetching certificates:", err);
      setError(err.message || "Failed to fetch certificates");
    } finally {
      setLoading(false);
    }
  }, [isInitialized, address]);

  useEffect(() => {
    if (isInitialized && address) {
      fetchCertificates();
    }
  }, [fetchCertificates]);

  return {
    certificates,
    loading,
    error,
    refetch: fetchCertificates,
  };
};

// ✅ Enhanced useETHPrice hook with caching
export const useETHPrice = () => {
  const [price, setPrice] = useState("0");
  const [maxPriceETH, setMaxPriceETH] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(0);
  const { isInitialized } = useSmartContract();

  const fetchPriceData = useCallback(
    async (force = false) => {
      if (!isInitialized) return;

      // ✅ Cache for 30 seconds to avoid excessive calls
      const now = Date.now();
      if (!force && now - lastFetch < 30000) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log("💰 Fetching ETH price data...");

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Price fetch timeout")), 15000)
        );

        const [ethPrice, maxPrice] = await Promise.race([
          Promise.all([
            SmartContractService.getETHPrice(),
            SmartContractService.getMaxPriceInETH(),
          ]),
          timeoutPromise,
        ]);

        setPrice(ethPrice);
        setMaxPriceETH(maxPrice);
        setLastFetch(now);

        console.log(`✅ ETH Price: ${ethPrice}, Max Price: ${maxPrice} ETH`);
      } catch (err) {
        console.error("❌ Error fetching ETH price:", err);
        setError(err.message || "Failed to fetch ETH price");
      } finally {
        setLoading(false);
      }
    },
    [isInitialized, lastFetch]
  );

  useEffect(() => {
    if (isInitialized) {
      fetchPriceData();

      // ✅ Refresh price every 2 minutes
      const interval = setInterval(() => fetchPriceData(), 2 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isInitialized, fetchPriceData]);

  return {
    price,
    maxPriceETH,
    loading,
    error,
    refetch: () => fetchPriceData(true),
  };
};

// ✅ Enhanced useHasActiveLicense hook with caching
export const useHasActiveLicense = (courseId) => {
  const { address } = useAccount();
  const [hasLicense, setHasLicense] = useState(false);
  const [licenseData, setLicenseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isInitialized } = useSmartContract();

  const checkLicense = useCallback(async () => {
    if (!isInitialized || !address || !courseId) {
      setHasLicense(false);
      setLicenseData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`🎫 Checking license for course ${courseId}`);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("License check timeout")), 20000)
      );

      const isValid = await Promise.race([
        SmartContractService.hasValidLicense(address, courseId),
        timeoutPromise,
      ]);

      setHasLicense(isValid);

      if (isValid) {
        try {
          const licenseDetails = await SmartContractService.getLicense(
            address,
            courseId
          );
          setLicenseData(licenseDetails);
        } catch (detailError) {
          console.warn("Could not fetch license details:", detailError);
          setLicenseData(null);
        }
      } else {
        setLicenseData(null);
      }

      console.log(
        `✅ License check completed: ${isValid ? "Valid" : "Invalid"}`
      );
    } catch (err) {
      console.error("❌ Error checking license:", err);
      setError(err.message || "Failed to check license");
      setHasLicense(false);
      setLicenseData(null);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, address, courseId]);

  useEffect(() => {
    if (isInitialized && address && courseId) {
      checkLicense();
    }
  }, [checkLicense]);

  return {
    hasLicense,
    licenseData,
    loading,
    error,
    refetch: checkLicense,
  };
};

// ✅ NEW: Hook for getting course metadata efficiently
export const useCourseMetadata = (courseId) => {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isInitialized } = useSmartContract();

  const fetchMetadata = useCallback(async () => {
    if (!isInitialized || !courseId) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`📋 Fetching metadata for course ${courseId}`);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Metadata fetch timeout")), 15000)
      );

      const metadataResult = await Promise.race([
        SmartContractService.getCourseMetadata(courseId),
        timeoutPromise,
      ]);

      setMetadata(metadataResult);
      console.log(`✅ Metadata fetched for course ${courseId}`);
    } catch (err) {
      console.error("❌ Error fetching course metadata:", err);
      setError(err.message || "Failed to fetch metadata");
    } finally {
      setLoading(false);
    }
  }, [isInitialized, courseId]);

  useEffect(() => {
    if (isInitialized && courseId) {
      fetchMetadata();
    }
  }, [fetchMetadata]);

  return {
    metadata,
    loading,
    error,
    refetch: fetchMetadata,
  };
};

// ✅ NEW: Hook for getting course sections with URLs
export const useCourseSections = (courseId) => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isInitialized } = useSmartContract();

  const fetchSections = useCallback(async () => {
    if (!isInitialized || !courseId) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`📖 Fetching sections for course ${courseId}`);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Sections fetch timeout")), 25000)
      );

      const sectionsData = await Promise.race([
        SmartContractService.getCourseSections(courseId),
        timeoutPromise,
      ]);

      setSections(sectionsData);
      console.log(
        `✅ Fetched ${sectionsData.length} sections for course ${courseId}`
      );
    } catch (err) {
      console.error("❌ Error fetching course sections:", err);
      setError(err.message || "Failed to fetch sections");
    } finally {
      setLoading(false);
    }
  }, [isInitialized, courseId]);

  useEffect(() => {
    if (isInitialized && courseId) {
      fetchSections();
    }
  }, [fetchSections]);

  return {
    sections,
    loading,
    error,
    refetch: fetchSections,
  };
};

// ✅ Enhanced main useBlockchain hook
export const useBlockchain = () => {
  const smartContractData = useSmartContract();

  return {
    smartContractService: smartContractData.smartContractService,
    isInitialized: smartContractData.isInitialized,
    error: smartContractData.error,
    initializationAttempts: smartContractData.initializationAttempts,
  };
};

// ✅ NEW: Hook for checking if course is completed
export const useCourseCompletion = (courseId) => {
  const { address } = useAccount();
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isInitialized } = useSmartContract();

  const checkCompletion = useCallback(async () => {
    if (!isInitialized || !address || !courseId) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`🏁 Checking completion for course ${courseId}`);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Completion check timeout")), 15000)
      );

      const completed = await Promise.race([
        SmartContractService.contracts.progressTracker.isCourseCompleted(
          address,
          courseId
        ),
        timeoutPromise,
      ]);

      setIsCompleted(completed);
      console.log(`✅ Course ${courseId} completion status: ${completed}`);
    } catch (err) {
      console.error("❌ Error checking course completion:", err);
      setError(err.message || "Failed to check completion");
    } finally {
      setLoading(false);
    }
  }, [isInitialized, address, courseId]);

  useEffect(() => {
    if (isInitialized && address && courseId) {
      checkCompletion();
    }
  }, [checkCompletion]);

  return {
    isCompleted,
    loading,
    error,
    refetch: checkCompletion,
  };
};

// ✅ NEW: Hook for getting user progress with detailed section info
export const useUserProgress = (courseId) => {
  const { address } = useAccount();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isInitialized } = useSmartContract();

  const fetchProgress = useCallback(async () => {
    if (!isInitialized || !address || !courseId) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`📊 Fetching progress for course ${courseId}`);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Progress fetch timeout")), 20000)
      );

      const progressData = await Promise.race([
        SmartContractService.getUserProgress(address, courseId),
        timeoutPromise,
      ]);

      setProgress(progressData);
      console.log(`✅ Progress fetched for course ${courseId}:`, progressData);
    } catch (err) {
      console.error("❌ Error fetching user progress:", err);
      setError(err.message || "Failed to fetch progress");
    } finally {
      setLoading(false);
    }
  }, [isInitialized, address, courseId]);

  useEffect(() => {
    if (isInitialized && address && courseId) {
      fetchProgress();
    }
  }, [fetchProgress]);

  return {
    progress,
    loading,
    error,
    refetch: fetchProgress,
  };
};

// ✅ NEW: Hook for issuing certificates
export const useIssueCertificate = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isInitialized } = useSmartContract();

  const issueCertificate = useCallback(
    async (courseId, studentName) => {
      if (!isInitialized) {
        throw new Error("Smart contract service not initialized");
      }

      setLoading(true);
      setError(null);

      try {
        console.log(`🏆 Issuing certificate for course ${courseId}`);

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Certificate issue timeout")),
            90000
          )
        );

        const result = await Promise.race([
          SmartContractService.issueCertificate(courseId, studentName),
          timeoutPromise,
        ]);

        if (!result.success) {
          throw new Error(result.error || "Failed to issue certificate");
        }

        console.log("✅ Certificate issued successfully:", result);
        return result;
      } catch (err) {
        console.error("❌ Error issuing certificate:", err);
        setError(err.message || "Failed to issue certificate");
        return {
          success: false,
          error: err.message || "Failed to issue certificate",
        };
      } finally {
        setLoading(false);
      }
    },
    [isInitialized]
  );

  return {
    issueCertificate,
    loading,
    error,
  };
};

export default {
  useSmartContract,
  useCourses,
  useUserCourses,
  useCreatorCourses,
  useCreateCourse,
  useMintLicense,
  useUpdateProgress,
  useUserCertificates,
  useETHPrice,
  useHasActiveLicense,
  useCourseMetadata,
  useCourseSections,
  useBlockchain,
  useCourseCompletion,
  useUserProgress,
  useIssueCertificate,
};
