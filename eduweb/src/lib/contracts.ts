import { getContract } from "thirdweb";
import { client } from "@/app/client";
import { chain } from "./chains";

// EduVerse Smart Contract Addresses (auto-synced by portal system)
export const CONTRACT_ADDRESSES = {
  COURSE_FACTORY: process.env.NEXT_PUBLIC_COURSE_FACTORY_ADDRESS!,
  COURSE_LICENSE: process.env.NEXT_PUBLIC_COURSE_LICENSE_ADDRESS!,
  PROGRESS_TRACKER: process.env.NEXT_PUBLIC_PROGRESS_TRACKER_ADDRESS!,
  CERTIFICATE_MANAGER: process.env.NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS!,
} as const;

// Contract instances ready to use
export const courseFactory = getContract({
  client,
  chain,
  address: CONTRACT_ADDRESSES.COURSE_FACTORY,
});

export const courseLicense = getContract({
  client,
  chain,
  address: CONTRACT_ADDRESSES.COURSE_LICENSE,
});

export const progressTracker = getContract({
  client,
  chain,
  address: CONTRACT_ADDRESSES.PROGRESS_TRACKER,
});

export const certificateManager = getContract({
  client,
  chain,
  address: CONTRACT_ADDRESSES.CERTIFICATE_MANAGER,
});

// Helper function to get contract by name
export function getEduVerseContract(contractName: keyof typeof CONTRACT_ADDRESSES) {
  const address = CONTRACT_ADDRESSES[contractName];
  return getContract({
    client,
    chain,
    address,
  });
}
