import { useState, useEffect, useCallback } from "react";
import { usePublicClient, useWalletClient, useAccount } from "wagmi";
import { ethers } from "ethers";
import SmartContractService from "../services/SmartContractService";

// Helper function to convert Viem client to ethers provider (ethers v6)
function publicClientToProvider(publicClient) {
  const { chain, transport } = publicClient;

  if (transport.type === "fallback") {
    // For fallback transport, use the first URL
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

// Helper function to convert Viem wallet client to ethers signer (ethers v6)
function walletClientToSigner(walletClient, publicClient) {
  const provider = publicClientToProvider(publicClient);

  // In ethers v6, we create a BrowserProvider for wallet interactions
  return new ethers.BrowserProvider(walletClient.transport, {
    chainId: walletClient.chain.id,
    name: walletClient.chain.name,
  });
}

// ✅ Enhanced useSmartContract hook dengan optimasi
export const useSmartContract = () => {
  const { isConnected, status } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);

  // Tambahkan debugging info
  useEffect(() => {
    console.log("Status wallet:", status);
    console.log("Public client:", !!publicClient);
    console.log("Wallet client:", !!walletClient);
  }, [status, publicClient, walletClient]);

  useEffect(() => {
    const initializeService = async () => {
      if (!publicClient || !walletClient) {
        console.log("Client tidak tersedia:", {
          publicClient: !!publicClient,
          walletClient: !!walletClient,
        });
        return;
      }

      try {
        console.log("Mencoba initialize SmartContractService...");
        const provider = publicClientToProvider(publicClient);
        const browserProvider = walletClientToSigner(
          walletClient,
          publicClient
        );

        await SmartContractService.initialize(provider, browserProvider);
        console.log("SmartContractService berhasil diinisialisasi!");
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        console.error("ERROR inisialisasi SmartContractService:", err);
        setError(err.message);
        setIsInitialized(false);
      }
    };

    let initTimer;
    if (status === "connected" && publicClient && walletClient) {
      console.log("Wallet connected, menginisialisasi SmartContractService...");
      // Tambahkan delay lebih lama untuk memastikan provider stabil
      initTimer = setTimeout(initializeService, 1200); // ✅ Reduced delay
    } else {
      setIsInitialized(false);
    }

    return () => {
      if (initTimer) clearTimeout(initTimer);
    };
  }, [status, publicClient, walletClient]);

  return {
    smartContractService: isInitialized ? SmartContractService : null,
    isInitialized,
    error,
  };
};

// ✅ Enhanced useCourses hook dengan pagination support
export const useCourses = (offset = 0, limit = 50) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
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

        // ✅ Use enhanced getAllCourses with pagination
        const coursesData = await SmartContractService.getAllCourses(
          currentOffset,
          limit
        );

        if (reset) {
          setCourses(coursesData);
        } else {
          setCourses((prev) => [...prev, ...coursesData]);
        }

        // Check if there are more courses
        setHasMore(coursesData.length === limit);

        console.log(`✅ Fetched ${coursesData.length} courses`);
      } catch (err) {
        console.error("Error fetching courses:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [isInitialized, offset, limit]
  );

  useEffect(() => {
    fetchCourses(true); // Reset on first load
  }, [isInitialized]);

  return {
    courses,
    loading,
    error,
    hasMore,
    refetch: () => fetchCourses(true),
    loadMore: () => fetchCourses(false),
  };
};

// ✅ Enhanced useUserCourses hook
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

      const licenses = await SmartContractService.getUserLicenses(address);
      const coursesWithProgress = [];

      for (const license of licenses) {
        try {
          // ✅ Use enhanced getCourse method
          const course = await SmartContractService.getCourse(license.courseId);

          if (course) {
            // ✅ Use enhanced progress tracking if available
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

            coursesWithProgress.push({
              ...course,
              license,
              progress: progress?.progressPercentage || 0,
              completedSections: progress?.completedSections?.length || 0,
              totalSections:
                progress?.totalSections || course.sectionsCount || 0,
            });
          }
        } catch (err) {
          console.warn(
            `Failed to fetch course details for license ${license.tokenId}:`,
            err
          );
        }
      }

      setEnrolledCourses(coursesWithProgress);
      console.log(`✅ Fetched ${coursesWithProgress.length} enrolled courses`);
    } catch (err) {
      console.error("Error fetching user courses:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, address]);

  useEffect(() => {
    fetchUserCourses();
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

      // ✅ Use enhanced getCreatorCourses method
      const courses = await SmartContractService.getCreatorCourses(address);
      setCreatedCourses(courses);

      console.log(`✅ Fetched ${courses.length} created courses`);
    } catch (err) {
      console.error("Error fetching creator courses:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, address]);

  useEffect(() => {
    fetchCreatorCourses();
  }, [fetchCreatorCourses]);

  return {
    createdCourses,
    loading,
    error,
    refetch: fetchCreatorCourses,
  };
};

// ✅ Enhanced useCreateCourse hook dengan CID parameter
export const useCreateCourse = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isInitialized } = useSmartContract();

  const createCourse = useCallback(
    async (courseData, sections = []) => {
      if (!isInitialized) {
        throw new Error("Smart contract service not initialized");
      }

      setLoading(true);
      setError(null);

      try {
        console.log("🚀 Creating course with data:", {
          title: courseData.title,
          thumbnailCID: courseData.thumbnailCID, // ✅ Use CID parameter
          sectionsCount: sections.length,
        });

        // ✅ Create course with CID parameter
        const courseResult = await SmartContractService.createCourse({
          title: courseData.title,
          description: courseData.description,
          thumbnailCID: courseData.thumbnailCID, // ✅ Changed from thumbnailURI
          pricePerMonth: courseData.pricePerMonth || "0",
        });

        if (!courseResult.success) {
          throw new Error(courseResult.error);
        }

        const courseId = courseResult.courseId;
        console.log(`✅ Course created with ID: ${courseId}`);

        // ✅ Add sections with CID parameter
        const sectionResults = [];
        for (let i = 0; i < sections.length; i++) {
          const section = sections[i];
          try {
            console.log(`📖 Adding section ${i + 1}: ${section.title}`);

            const sectionResult = await SmartContractService.addCourseSection(
              courseId,
              {
                title: section.title,
                contentCID: section.contentCID, // ✅ Changed from contentURI
                duration: section.duration,
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
          } catch (err) {
            console.warn(`Failed to add section "${section.title}":`, err);
          }
        }

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
        console.error("Error creating course:", err);
        setError(err.message);
        return {
          success: false,
          error: err.message,
        };
      } finally {
        setLoading(false);
      }
    },
    [isInitialized]
  );

  return {
    createCourse,
    loading,
    error,
  };
};

// ✅ Enhanced useMintLicense hook
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

        const result = await SmartContractService.mintLicense(
          courseId,
          duration
        );

        if (!result.success) {
          throw new Error(result.error);
        }

        console.log("✅ License minted successfully:", result);
        return result;
      } catch (err) {
        console.error("Error minting license:", err);
        setError(err.message);
        return {
          success: false,
          error: err.message,
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

        const result = await SmartContractService.updateProgress(
          courseId,
          sectionId,
          completed
        );

        if (!result.success) {
          throw new Error(result.error);
        }

        console.log("✅ Progress updated successfully");
        return result;
      } catch (err) {
        console.error("Error updating progress:", err);
        setError(err.message);
        return {
          success: false,
          error: err.message,
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

      const certs = await SmartContractService.getUserCertificates(address);
      setCertificates(certs);

      console.log(`✅ Fetched ${certs.length} certificates`);
    } catch (err) {
      console.error("Error fetching certificates:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, address]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  return {
    certificates,
    loading,
    error,
    refetch: fetchCertificates,
  };
};

// ✅ Enhanced useETHPrice hook
export const useETHPrice = () => {
  const [price, setPrice] = useState("0");
  const [maxPriceETH, setMaxPriceETH] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isInitialized } = useSmartContract();

  const fetchPriceData = useCallback(async () => {
    if (!isInitialized) return;

    setLoading(true);
    setError(null);

    try {
      console.log("💰 Fetching ETH price data...");

      // ✅ Fetch both current price and max allowed price
      const [ethPrice, maxPrice] = await Promise.all([
        SmartContractService.getETHPrice(),
        SmartContractService.getMaxPriceInETH
          ? SmartContractService.getMaxPriceInETH()
          : Promise.resolve("0"),
      ]);

      setPrice(ethPrice);
      setMaxPriceETH(maxPrice);

      console.log(`✅ ETH Price: ${ethPrice}, Max Price: ${maxPrice} ETH`);
    } catch (err) {
      console.error("Error fetching ETH price:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isInitialized]);

  useEffect(() => {
    fetchPriceData();

    // Refresh price every 5 minutes
    const interval = setInterval(fetchPriceData, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchPriceData]);

  return {
    price,
    maxPriceETH, // ✅ Add max price in ETH
    loading,
    error,
    refetch: fetchPriceData,
  };
};

// ✅ Enhanced useHasActiveLicense hook
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

      // ✅ Use hasValidLicense method for efficient checking
      const isValid = await SmartContractService.hasValidLicense(
        address,
        courseId
      );

      setHasLicense(isValid);

      // ✅ If valid, get detailed license data
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
      console.error("Error checking license:", err);
      setError(err.message);
      setHasLicense(false);
      setLicenseData(null);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, address, courseId]);

  useEffect(() => {
    checkLicense();
  }, [checkLicense]);

  return {
    hasLicense,
    licenseData, // ✅ Return detailed license information
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

      // ✅ Use efficient getCourseMetadata method
      const metadataResult = await SmartContractService.getCourseMetadata(
        courseId
      );
      setMetadata(metadataResult);

      console.log(`✅ Metadata fetched for course ${courseId}`);
    } catch (err) {
      console.error("Error fetching course metadata:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, courseId]);

  useEffect(() => {
    fetchMetadata();
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

      // ✅ Use enhanced getCourseSections with URL generation
      const sectionsData = await SmartContractService.getCourseSections(
        courseId
      );
      setSections(sectionsData);

      console.log(
        `✅ Fetched ${sectionsData.length} sections for course ${courseId}`
      );
    } catch (err) {
      console.error("Error fetching course sections:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, courseId]);

  useEffect(() => {
    fetchSections();
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

      const completed =
        await SmartContractService.contracts.progressTracker.isCourseCompleted(
          address,
          courseId
        );

      setIsCompleted(completed);
      console.log(`✅ Course ${courseId} completion status: ${completed}`);
    } catch (err) {
      console.error("Error checking course completion:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, address, courseId]);

  useEffect(() => {
    checkCompletion();
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

      const progressData = await SmartContractService.getUserProgress(
        address,
        courseId
      );

      setProgress(progressData);
      console.log(`✅ Progress fetched for course ${courseId}:`, progressData);
    } catch (err) {
      console.error("Error fetching user progress:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, address, courseId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    progress,
    loading,
    error,
    refetch: fetchProgress,
  };
};
