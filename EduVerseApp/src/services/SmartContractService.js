// src/services/SmartContractService.js
import { useReadContract, useWriteContract, useSimulateContract } from "wagmi";
import { parseEther } from "viem";

// Import semua ABI yang diperlukan
import CertificateManagerABI from "../constants/abi/CertificateManager.json";
import CourseFactoryABI from "../constants/abi/CourseFactory.json";
import CourseLicenseABI from "../constants/abi/CourseLicense.json";
import MockV3AggregatorABI from "../constants/abi/MockV3Aggregator.json";
import PlatformRegistryABI from "../constants/abi/PlatformRegistry.json";
import ProgressTrackerABI from "../constants/abi/ProgressTracker.json";

// Alamat kontrak yang sudah di-deploy (ganti dengan alamat yang sebenarnya dari deployed-contracts.json Anda)
// Gunakan alamat kontrak yang valid di Manta Pacific Testnet
export const CONTRACT_ADDRESSES = {
  CertificateManager:
    process.env.EXPO_PUBLIC_CERTIFICATE_MANAGER_ADDRESS || "0x...",
  CourseFactory: process.env.EXPO_PUBLIC_COURSE_FACTORY_ADDRESS || "0x...",
  CourseLicense: process.env.EXPO_PUBLIC_COURSE_LICENSE_ADDRESS || "0x...",
  MockV3Aggregator:
    process.env.EXPO_PUBLIC_MOCK_V3_AGGREGATOR_ADDRESS || "0x...",
  PlatformRegistry:
    process.env.EXPO_PUBLIC_PLATFORM_REGISTRY_ADDRESS || "0x...",
  ProgressTracker: process.env.EXPO_PUBLIC_PROGRESS_TRACKER_ADDRESS || "0x...",
};

// Hook kustom untuk interaksi dengan smart contract
export function useEduVerseContracts() {
  // Contoh penggunaan useReadContract untuk membaca data dari CourseFactory
  const { data: courseCount } = useReadContract({
    address: CONTRACT_ADDRESSES.CourseFactory,
    abi: CourseFactoryABI,
    functionName: "courseCount",
  });

  // Contoh penggunaan useWriteContract untuk menulis data ke CourseFactory
  const {
    writeContract: createCourse,
    data: createCourseTxHash,
    isPending: isCreatingCourse,
  } = useWriteContract();

  const createNewCourse = async (name, description, price, durationMonths) => {
    try {
      createCourse({
        address: CONTRACT_ADDRESSES.CourseFactory,
        abi: CourseFactoryABI,
        functionName: "createCourse",
        args: [
          name,
          description,
          parseEther(price.toString()),
          BigInt(durationMonths),
        ],
      });
    } catch (error) {
      console.error("Error simulating createCourse:", error);
      throw error;
    }
  };

  // Contoh penggunaan useSimulateContract untuk simulasi transaksi
  const { data: simulateMintLicense } = useSimulateContract({
    address: CONTRACT_ADDRESSES.CourseLicense,
    abi: CourseLicenseABI,
    functionName: "mintLicense",
    args: [BigInt(1), BigInt(1)], // Contoh argumen
    value: parseEther("0.01"), // Contoh nilai ETH yang dikirim
  });

  const { writeContract: mintLicense, isPending: isMintingLicense } =
    useWriteContract();

  const handleMintLicense = async (courseId, durationMonths, value) => {
    if (!simulateMintLicense?.request) {
      console.error("Simulation failed or request not ready.");
      return;
    }
    try {
      mintLicense(simulateMintLicense.request);
    } catch (error) {
      console.error("Error minting license:", error);
      throw error;
    }
  };

  return {
    courseCount: courseCount ? Number(courseCount) : 0,
    createNewCourse,
    createCourseTxHash,
    isCreatingCourse,
    handleMintLicense,
    isMintingLicense,
    // Tambahkan hook untuk kontrak lainnya sesuai kebutuhan
  };
}
