// src/hooks/useBlockchain.js - Updated for Manta Pacific
import { useWeb3 } from "../contexts/Web3Context";
import { useAccount, useChainId } from "wagmi";
import { useState, useEffect, useCallback, useRef } from "react";
import { mantaPacificTestnet } from "../constants/blockchain";

// ==================== CONTRACT STATUS HOOKS ====================

export const useSmartContract = () => {
  const web3Context = useWeb3();
  const { isInitialized, initError, modalPreventionActive } = web3Context;

  return {
    smartContractService: web3Context, // ✅ Return the whole context as service
    isInitialized,
    error: initError,
    hasEverInitialized: isInitialized,
    modalPreventionActive,
  };
};

export const useBlockchain = () => {
  const web3Context = useWeb3();
  const { isConnected } = useAccount();
  const chainId = useChainId();

  return {
    smartContractService: web3Context.isInitialized ? web3Context : null,
    isInitialized: web3Context.isInitialized,
    error: web3Context.initError,
    isConnected,
    isCorrectNetwork: chainId === mantaPacificTestnet.id,
  };
};

// ==================== COURSE HOOKS ====================

export const useCourses = (offset = 0, limit = 20) => {
  const { getAllCourses, isInitialized } = useWeb3();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const abortControllerRef = useRef(null);

  const fetchCourses = useCallback(
    async (reset = false) => {
      if (!isInitialized) return;

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const currentOffset = reset ? 0 : offset;
        const coursesData = await getAllCourses(currentOffset, limit);

        if (!abortControllerRef.current.signal.aborted) {
          if (reset) {
            setCourses(coursesData);
          } else {
            setCourses((prev) => [...prev, ...coursesData]);
          }

          setHasMore(coursesData.length === limit);
        }
      } catch (err) {
        if (!abortControllerRef.current.signal.aborted) {
          console.error("Error fetching courses:", err);
          setError(err.message);
        }
      } finally {
        if (!abortControllerRef.current.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [getAllCourses, isInitialized, offset, limit]
  );

  useEffect(() => {
    if (isInitialized) {
      fetchCourses(true);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
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

export const useUserCourses = () => {
  const { address } = useAccount();
  const { getUserLicenses, getCourse, getUserProgress, isInitialized } =
    useWeb3();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  const fetchUserCourses = useCallback(async () => {
    if (!isInitialized || !address) return;

    setLoading(true);
    setError(null);

    try {
      const licenses = await getUserLicenses(address);

      if (!isMountedRef.current) return;

      const coursesWithProgress = [];

      for (const license of licenses) {
        try {
          const [course, progress] = await Promise.all([
            getCourse(license.courseId),
            getUserProgress(address, license.courseId),
          ]);

          if (isMountedRef.current && course) {
            coursesWithProgress.push({
              ...course,
              license,
              progress: progress?.progressPercentage || 0,
              completedSections: progress?.completedSections || 0,
              totalSections: progress?.totalSections || 0,
            });
          }
        } catch (err) {
          console.warn(`Failed to fetch course ${license.courseId}:`, err);
        }
      }

      if (isMountedRef.current) {
        setEnrolledCourses(coursesWithProgress);
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error("Error fetching user courses:", err);
        setError(err.message);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [isInitialized, address, getUserLicenses, getCourse, getUserProgress]);

  useEffect(() => {
    isMountedRef.current = true;

    if (isInitialized && address) {
      fetchUserCourses();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [isInitialized, address]);

  return {
    enrolledCourses,
    loading,
    error,
    refetch: fetchUserCourses,
  };
};

// Helper function for retrying transactions
export const useTransactionWithRetry = () => {
  const executeWithRetry = useCallback(async (txFunction, maxRetries = 2) => {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`Transaction attempt ${i + 1}/${maxRetries}`);
        const result = await txFunction();
        return result;
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${i + 1} failed:`, error);

        // Don't retry if user rejected
        if (
          error.cause?.code === 4001 ||
          error.message.includes("User rejected")
        ) {
          throw error;
        }

        // Wait before retry
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    throw lastError;
  }, []);

  return { executeWithRetry };
};

export const useCreatorCourses = () => {
  const { address } = useAccount();
  const { getCreatorCourses, isInitialized } = useWeb3();
  const [createdCourses, setCreatedCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCreatorCourses = useCallback(async () => {
    if (!isInitialized || !address) return;

    setLoading(true);
    setError(null);

    try {
      const courses = await getCreatorCourses(address);
      setCreatedCourses(courses);
    } catch (err) {
      console.error("Error fetching creator courses:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, address, getCreatorCourses]);

  useEffect(() => {
    if (isInitialized && address) {
      fetchCreatorCourses();
    }
  }, [isInitialized, address]);

  return {
    createdCourses,
    loading,
    error,
    refetch: fetchCreatorCourses,
  };
};

export const useCreateCourse = () => {
  const { createCourse, addCourseSection, isInitialized } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const create = useCallback(
    async (courseData, sections = []) => {
      if (!isInitialized) {
        throw new Error("Smart contract service not initialized");
      }

      setLoading(true);
      setError(null);
      setProgress(0);

      try {
        // Create course
        setProgress(10);
        const courseResult = await createCourse(courseData);

        if (!courseResult.success) {
          throw new Error(courseResult.error || "Failed to create course");
        }

        const courseId = courseResult.courseId;
        setProgress(40);

        // Add sections sequentially
        const sectionResults = [];
        for (let i = 0; i < sections.length; i++) {
          const section = sections[i];

          try {
            const sectionResult = await addCourseSection(courseId, {
              title: section.title,
              contentCID: section.contentCID || "placeholder-video-content",
              duration: section.duration,
            });

            if (sectionResult.success) {
              sectionResults.push(sectionResult);
            }

            setProgress(40 + ((i + 1) / sections.length) * 50);

            // Delay between transactions
            if (i < sections.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          } catch (err) {
            console.warn(`Failed to add section "${section.title}":`, err);
          }
        }

        setProgress(100);

        return {
          success: true,
          courseId,
          sectionsAdded: sectionResults.length,
          totalSections: sections.length,
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
        setTimeout(() => setProgress(0), 2000);
      }
    },
    [isInitialized, createCourse, addCourseSection]
  );

  return {
    createCourse: create,
    loading,
    error,
    progress,
  };
};

// ==================== LICENSE HOOKS ====================

export const useMintLicense = () => {
  const { mintLicense, isInitialized } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mint = useCallback(
    async (courseId, duration = 1) => {
      if (!isInitialized) {
        throw new Error("Not initialized");
      }

      setLoading(true);
      setError(null);

      try {
        const result = await mintLicense(courseId, duration);
        return result;
      } catch (err) {
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
      }
    },
    [mintLicense, isInitialized]
  );

  return {
    mintLicense: mint,
    loading,
    error,
  };
};

export const useHasActiveLicense = (courseId) => {
  const { address } = useAccount();
  const { hasValidLicense, getLicense, isInitialized } = useWeb3();
  const [hasLicense, setHasLicense] = useState(false);
  const [licenseData, setLicenseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkLicense = useCallback(async () => {
    if (!isInitialized || !address || !courseId) {
      setHasLicense(false);
      setLicenseData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isValid = await hasValidLicense(address, courseId);
      setHasLicense(isValid);

      if (isValid) {
        try {
          const licenseDetails = await getLicense(address, courseId);
          setLicenseData(licenseDetails);
        } catch (detailError) {
          console.warn("Could not fetch license details:", detailError);
          setLicenseData(null);
        }
      } else {
        setLicenseData(null);
      }
    } catch (err) {
      console.error("Error checking license:", err);
      setError(err.message);
      setHasLicense(false);
      setLicenseData(null);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, address, courseId, hasValidLicense, getLicense]);

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

// ==================== PROGRESS HOOKS ====================

export const useUpdateProgress = () => {
  const { completeSection, isInitialized } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateProgress = useCallback(
    async (courseId, sectionId) => {
      if (!isInitialized) {
        throw new Error("Not initialized");
      }

      setLoading(true);
      setError(null);

      try {
        const result = await completeSection(courseId, sectionId);
        return result;
      } catch (err) {
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
      }
    },
    [completeSection, isInitialized]
  );

  return {
    updateProgress,
    loading,
    error,
  };
};

export const useUserProgress = (courseId) => {
  const { address } = useAccount();
  const { getUserProgress, isInitialized } = useWeb3();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProgress = useCallback(async () => {
    if (!isInitialized || !address || !courseId) return;

    setLoading(true);
    setError(null);

    try {
      const progressData = await getUserProgress(address, courseId);
      setProgress(progressData);
    } catch (err) {
      console.error("Error fetching user progress:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, address, courseId, getUserProgress]);

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

export const useCourseCompletion = (courseId) => {
  const { address } = useAccount();
  const { isCourseCompleted, isInitialized } = useWeb3();
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkCompletion = useCallback(async () => {
    if (!isInitialized || !address || !courseId) return;

    setLoading(true);
    setError(null);

    try {
      const completed = await isCourseCompleted(address, courseId);
      setIsCompleted(completed);
    } catch (err) {
      console.error("Error checking course completion:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, address, courseId, isCourseCompleted]);

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

// ==================== CERTIFICATE HOOKS ====================

export const useUserCertificates = () => {
  const { address } = useAccount();
  const { getUserCertificates, isInitialized } = useWeb3();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCertificates = useCallback(async () => {
    if (!isInitialized || !address) return;

    setLoading(true);
    setError(null);

    try {
      const certs = await getUserCertificates(address);
      setCertificates(certs);
    } catch (err) {
      console.error("Error fetching certificates:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, address, getUserCertificates]);

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

export const useIssueCertificate = () => {
  const { issueCertificate, isInitialized } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const issue = useCallback(
    async (courseId, studentName) => {
      if (!isInitialized) {
        throw new Error("Not initialized");
      }

      setLoading(true);
      setError(null);

      try {
        const result = await issueCertificate(courseId, studentName);
        return result;
      } catch (err) {
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
      }
    },
    [issueCertificate, isInitialized]
  );

  return {
    issueCertificate: issue,
    loading,
    error,
  };
};

// ==================== UTILITY HOOKS ====================

export const useCourseSections = (courseId) => {
  const { getCourseSections, isInitialized } = useWeb3();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSections = useCallback(async () => {
    if (!isInitialized || !courseId) return;

    setLoading(true);
    setError(null);

    try {
      const sectionsData = await getCourseSections(courseId);
      setSections(sectionsData);
    } catch (err) {
      console.error("Error fetching course sections:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, courseId, getCourseSections]);

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

// Export all hooks
export default {
  useSmartContract,
  useBlockchain,
  useCourses,
  useUserCourses,
  useCreatorCourses,
  useCreateCourse,
  useMintLicense,
  useUpdateProgress,
  useUserCertificates,
  useHasActiveLicense,
  useCourseSections,
  useCourseCompletion,
  useUserProgress,
  useIssueCertificate,
};
