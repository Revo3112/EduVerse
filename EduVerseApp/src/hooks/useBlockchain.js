import { useState, useEffect, useCallback } from "react";
import { usePublicClient, useWalletClient, useAccount } from "wagmi";
import { ethers } from "ethers";
import SmartContractService from "../services/SmartContractService";

// Helper function to convert Viem client to ethers provider
function publicClientToProvider(publicClient) {
  const { chain, transport } = publicClient;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };

  if (transport.type === "fallback") {
    return new ethers.providers.FallbackProvider(
      transport.transports.map(
        ({ value }) => new ethers.providers.JsonRpcProvider(value?.url, network)
      )
    );
  }

  return new ethers.providers.JsonRpcProvider(transport.url, network);
}

// Helper function to convert Viem wallet client to ethers signer
function walletClientToSigner(walletClient) {
  const { account, chain, transport } = walletClient;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };

  const provider = new ethers.providers.Web3Provider(transport, network);
  return provider.getSigner(account.address);
}

// Hooks for managing smart contract service initialization
export const useSmartContract = () => {
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeService = async () => {
      if (isConnected && publicClient && walletClient) {
        try {
          // Convert Viem client to ethers provider
          const provider = publicClientToProvider(publicClient);
          await SmartContractService.initialize(provider);
          setIsInitialized(true);
          setError(null);
        } catch (err) {
          console.error("SmartContractService initialization error:", err);
          setError(err.message);
          setIsInitialized(false);
        }
      } else {
        setIsInitialized(false);
      }
    };
    initializeService();
  }, [isConnected, publicClient, walletClient]);

  return { isInitialized, error };
};

// Hook Fetching all courses
export const useCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isInitialized } = useSmartContract();

  const fetchCourses = useCallback(async () => {
    if (!isInitialized) return;

    setLoading(true);
    setError(null);

    try {
      const coursesData = await SmartContractService.getAllCourses();
      setCourses(coursesData);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isInitialized]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return {
    courses,
    loading,
    error,
    refetch: fetchCourses,
  };
};

// Hook for fetching user's enrolled courses (licenses)
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
      const licenses = await SmartContractService.getUserLicenses(address);
      const coursesWithProgress = [];
      for (const license of licenses) {
        try {
          const course = await SmartContractService.getCourse(license.courseId);
          const progress = await SmartContractService.getUserProgress(
            address,
            license.courseId
          );

          if (course) {
            coursesWithProgress.push({
              ...course,
              license,
              progress: progress?.progressPercentage || 0,
              completedSections: progress?.completedSections?.length || 0,
              totalSections: progress?.totalSections || 0,
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

// Hook for fetching creator's courses
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
      const courses = await SmartContractService.getCreatorCourses(address);
      setCreatedCourses(courses);
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

// Hook for course creation
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
        // Create the course
        const courseResult = await SmartContractService.createCourse(
          courseData
        );

        if (!courseResult.success) {
          throw new Error(courseResult.error);
        }

        const courseId = courseResult.courseId;

        // Add sections if provided
        const sectionResults = [];
        for (const section of sections) {
          try {
            const sectionResult = await SmartContractService.addCourseSection(
              courseId,
              section
            );
            sectionResults.push(sectionResult);
          } catch (err) {
            console.warn(`Failed to add section "${section.title}":`, err);
          }
        }

        return {
          success: true,
          courseId,
          transactionHash: courseResult.transactionHash,
          sectionsAdded: sectionResults.filter((r) => r.success).length,
        };
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

// Hook for minting course license
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
        const result = await SmartContractService.mintLicense(
          courseId,
          duration
        );

        if (!result.success) {
          throw new Error(result.error);
        }

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

// Hook for updating course progress
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
        const result = await SmartContractService.updateProgress(
          courseId,
          sectionId,
          completed
        );

        if (!result.success) {
          throw new Error(result.error);
        }

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

// Hook for fetching user certificates
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
      const certs = await SmartContractService.getUserCertificates(address);
      setCertificates(certs);
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

// Hook for ETH price
export const useETHPrice = () => {
  const [price, setPrice] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isInitialized } = useSmartContract();

  const fetchPrice = useCallback(async () => {
    if (!isInitialized) return;

    setLoading(true);
    setError(null);

    try {
      const ethPrice = await SmartContractService.getETHPrice();
      setPrice(ethPrice);
    } catch (err) {
      console.error("Error fetching ETH price:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isInitialized]);

  useEffect(() => {
    fetchPrice();

    // Refresh price every 5 minutes
    const interval = setInterval(fetchPrice, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchPrice]);

  return {
    price,
    loading,
    error,
    refetch: fetchPrice,
  };
};
