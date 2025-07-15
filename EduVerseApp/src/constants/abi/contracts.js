/**
 * Contract Helper Utilities for EduVerse Mobile App
 * Simplified and cleaned up version without duplications
 */

import ContractAddresses from "./contract-addresses.json";
import {
  CourseFactoryABI,
  CourseLicenseABI,
  ProgressTrackerABI,
  CertificateManagerABI,

  
  CONTRACT_NAMES,
  CONTRACT_ABIS,
} from "./index.js";

// Get contract address by name
export const getContractAddress = (contractNameKey) => {
  const contractKeyMapping = {
    [CONTRACT_NAMES.COURSE_FACTORY]: "courseFactory",
    [CONTRACT_NAMES.COURSE_LICENSE]: "courseLicense",
    [CONTRACT_NAMES.PROGRESS_TRACKER]: "progressTracker",
    [CONTRACT_NAMES.CERTIFICATE_MANAGER]: "certificateManager",
    
    
  };

  const contractKey = contractKeyMapping[contractNameKey];
  const address = ContractAddresses.addresses[contractKey];

  if (!address || address === "0x...") {
    throw new Error(`Contract address not found for: ${contractNameKey}`);
  }

  return address;
};

// Get contract ABI by name
export const getContractABI = (contractNameKey) => {
  const abi = CONTRACT_ABIS[contractNameKey];

  if (!abi) {
    throw new Error(`Contract ABI not found for: ${contractNameKey}`);
  }

  return abi;
};

// Validate contract setup
export const validateContractSetup = () => {
  const requiredContracts = [
    "courseFactory",
    "courseLicense",
    "progressTracker",
    "certificateManager",
    
    
  ];

  const missingContracts = requiredContracts.filter(
    (contract) =>
      !ContractAddresses.addresses[contract] ||
      ContractAddresses.addresses[contract] === "0x..."
  );

  return {
    isValid: missingContracts.length === 0,
    totalContracts: requiredContracts.length,
    availableContracts: requiredContracts.length - missingContracts.length,
    missingContracts,
  };
};

// Export contract addresses
export const ADDRESSES = ContractAddresses.addresses;

// Export ABIs
export {
  CourseFactoryABI,
  CourseLicenseABI,
  ProgressTrackerABI,
  CertificateManagerABI,

  
  ContractAddresses,
};
