/**
 * ============================================================================
 * ADDRESS HELPER UTILITIES
 * ============================================================================
 * Helper functions for Ethereum address validation, normalization, and formatting
 * Used across the application to ensure consistent address handling
 * ============================================================================
 */

import { isAddress, getAddress } from "thirdweb";

/**
 * Normalize Ethereum address to lowercase (for Goldsky queries)
 * Goldsky stores addresses in lowercase
 */
export function normalizeAddress(address: string): string {
  if (!address) return "";
  return address.toLowerCase().trim();
}

/**
 * Get checksummed address (mixed case) for display
 * Uses thirdweb's getAddress which implements EIP-55
 */
export function getChecksumAddress(address: string): string {
  try {
    if (!address) return "";
    return getAddress(address);
  } catch (error) {
    console.warn("[Address Helper] Invalid address for checksum:", address);
    return address.toLowerCase();
  }
}

/**
 * Validate if string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  if (!address || typeof address !== "string") return false;
  return isAddress(address);
}

/**
 * Compare two addresses (case-insensitive)
 */
export function addressesEqual(addr1: string, addr2: string): boolean {
  if (!addr1 || !addr2) return false;
  return normalizeAddress(addr1) === normalizeAddress(addr2);
}

/**
 * Format address for display (0x1234...5678)
 */
export function truncateAddress(
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (!address || address.length < startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Debug helper: log address in multiple formats
 */
export function debugAddress(label: string, address: string): void {
  console.log(`[Address Debug] ${label}:`, {
    original: address,
    normalized: normalizeAddress(address),
    checksum: getChecksumAddress(address),
    isValid: isValidAddress(address),
    truncated: truncateAddress(address),
  });
}

/**
 * Get active wallet address from thirdweb hook result
 * Returns normalized lowercase address
 */
export function getActiveWalletAddress(
  account: { address?: string } | undefined
): string {
  if (!account?.address) return "";
  return normalizeAddress(account.address);
}

/**
 * Ensure address has 0x prefix
 */
export function ensureHexPrefix(address: string): string {
  if (!address) return "";
  return address.startsWith("0x") ? address : `0x${address}`;
}

/**
 * Remove 0x prefix from address
 */
export function removeHexPrefix(address: string): string {
  if (!address) return "";
  return address.startsWith("0x") ? address.slice(2) : address;
}
