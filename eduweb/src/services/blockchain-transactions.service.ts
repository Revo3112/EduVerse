/**
 * Blockchain Transactions Service
 *
 * This service fetches REAL transaction data directly from the blockchain
 * using Thirdweb's RPC methods. It provides:
 * - Transaction receipts with gas data
 * - Block information
 * - Contract event logs
 * - Real-time transaction monitoring
 *
 * @author EduVerse Team
 * @version 1.0.0
 */

import { client } from "@/app/client";
import { chain } from "@/lib/chains";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import {
  getRpcClient,
  eth_getBlockByNumber,
  eth_getLogs,
  eth_getTransactionReceipt,
  eth_gasPrice,
  eth_blockNumber,
} from "thirdweb/rpc";

// ============================================================================
// TYPES
// ============================================================================

export interface BlockchainTransaction {
  hash: string;
  blockNumber: number;
  blockHash: string;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
  gasCost: string; // gasUsed * gasPrice in wei
  gasCostEth: string; // gasCost in ETH
  status: "success" | "failed";
  contractAddress: string | null;
  logs: TransactionLog[];
}

export interface TransactionLog {
  address: string;
  topics: string[];
  data: string;
  logIndex: number;
  transactionIndex: number;
  blockNumber: number;
}

export interface BlockInfo {
  number: number;
  hash: string;
  timestamp: number;
  gasUsed: string;
  gasLimit: string;
  baseFeePerGas: string | null;
  transactionCount: number;
}

export interface NetworkGasInfo {
  gasPrice: string; // in wei
  gasPriceGwei: string; // in gwei
  blockNumber: number;
  timestamp: number;
}

export interface ContractTransactionHistory {
  contractName: string;
  contractAddress: string;
  transactions: BlockchainTransaction[];
  totalGasUsed: string;
  totalGasCost: string;
  totalGasCostEth: string;
  transactionCount: number;
}

export interface BlockchainAnalytics {
  currentBlockNumber: number;
  currentGasPrice: string;
  currentGasPriceGwei: string;
  recentBlocks: BlockInfo[];
  contractHistory: {
    courseFactory: ContractTransactionHistory;
    courseLicense: ContractTransactionHistory;
    progressTracker: ContractTransactionHistory;
    certificateManager: ContractTransactionHistory;
  };
  totalTransactions: number;
  totalGasUsed: string;
  totalGasCost: string;
  totalGasCostEth: string;
  averageGasPerTransaction: string;
  lastUpdated: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const WEI_PER_ETH = BigInt("1000000000000000000");
const WEI_PER_GWEI = BigInt("1000000000");

// Cache expiry times
const TX_CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes for individual tx gas data
const CONTRACT_CACHE_EXPIRY_MS = 30 * 1000; // 30 seconds for contract gas totals

// ============================================================================
// CACHES FOR GAS DATA
// ============================================================================

// Cache for individual transaction gas data
interface TxGasCache {
  gasUsed: bigint;
  gasPrice: bigint;
  gasCost: bigint;
  timestamp: number;
}
const gasCache: Record<string, TxGasCache> = {};

// Cache for contract-level gas totals
interface ContractGasCache {
  totalGasUsed: bigint;
  totalGasCost: bigint;
  transactionHashes: Set<string>;
  lastUpdated: number;
  fromBlock: number;
}
const contractGasCache: Record<string, ContractGasCache> = {};

// EduVerse contract addresses
const CONTRACTS = {
  COURSE_FACTORY: CONTRACT_ADDRESSES.COURSE_FACTORY?.toLowerCase() || "",
  COURSE_LICENSE: CONTRACT_ADDRESSES.COURSE_LICENSE?.toLowerCase() || "",
  PROGRESS_TRACKER: CONTRACT_ADDRESSES.PROGRESS_TRACKER?.toLowerCase() || "",
  CERTIFICATE_MANAGER:
    CONTRACT_ADDRESSES.CERTIFICATE_MANAGER?.toLowerCase() || "",
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function weiToEth(wei: string | bigint): string {
  const weiBigInt = typeof wei === "string" ? BigInt(wei) : wei;
  const eth = Number(weiBigInt) / Number(WEI_PER_ETH);
  return eth.toFixed(18);
}

function weiToGwei(wei: string | bigint): string {
  const weiBigInt = typeof wei === "string" ? BigInt(wei) : wei;
  const gwei = Number(weiBigInt) / Number(WEI_PER_GWEI);

  // For L2 chains like Manta Pacific with ultra-low gas prices (< 0.01 Gwei),
  // we need more decimal places to show meaningful values
  if (gwei < 0.01) {
    // Show 6 decimal places for very small gas prices
    return gwei.toFixed(6);
  } else if (gwei < 1) {
    // Show 4 decimal places for small gas prices
    return gwei.toFixed(4);
  } else {
    // Standard 2 decimal places for normal gas prices
    return gwei.toFixed(2);
  }
}

// ============================================================================
// RPC CLIENT
// ============================================================================

function getRpc() {
  return getRpcClient({ client, chain });
}

// ============================================================================
// BLOCKCHAIN DATA FETCHING
// ============================================================================

/**
 * Get current block number
 */
export async function getCurrentBlockNumber(): Promise<number> {
  try {
    const rpc = getRpc();
    const blockNumber = await eth_blockNumber(rpc);
    return Number(blockNumber);
  } catch (error) {
    console.error("[BlockchainService] Failed to get block number:", error);
    throw error;
  }
}

/**
 * Get current gas price
 */
export async function getCurrentGasPrice(): Promise<NetworkGasInfo> {
  try {
    const rpc = getRpc();
    const [gasPrice, blockNumber] = await Promise.all([
      eth_gasPrice(rpc),
      eth_blockNumber(rpc),
    ]);

    return {
      gasPrice: gasPrice.toString(),
      gasPriceGwei: weiToGwei(gasPrice),
      blockNumber: Number(blockNumber),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("[BlockchainService] Failed to get gas price:", error);
    throw error;
  }
}

/**
 * Get block information by block number
 */
export async function getBlockInfo(
  blockNumber: number | "latest"
): Promise<BlockInfo | null> {
  try {
    const rpc = getRpc();
    // Handle block number parameter - use object format for latest, bigint for specific block
    const blockNumberParam =
      blockNumber === "latest" ? undefined : BigInt(blockNumber);
    const block = await eth_getBlockByNumber(rpc, {
      blockNumber: blockNumberParam,
      includeTransactions: false,
    });

    if (!block) return null;

    return {
      number: Number(block.number),
      hash: block.hash || "",
      timestamp: Number(block.timestamp),
      gasUsed: block.gasUsed.toString(),
      gasLimit: block.gasLimit.toString(),
      baseFeePerGas: block.baseFeePerGas?.toString() || null,
      transactionCount: block.transactions?.length || 0,
    };
  } catch (error) {
    console.error("[BlockchainService] Failed to get block info:", error);
    return null;
  }
}

/**
 * Get transaction receipt with full details
 */
export async function getTransactionReceipt(
  txHash: string
): Promise<BlockchainTransaction | null> {
  try {
    const rpc = getRpc();
    const receipt = await eth_getTransactionReceipt(rpc, {
      hash: txHash as `0x${string}`,
    });

    if (!receipt) return null;

    const gasUsed = receipt.gasUsed;
    const gasPrice = receipt.effectiveGasPrice || BigInt(0);
    const gasCost = gasUsed * gasPrice;

    // Get block for timestamp
    const block = await getBlockInfo(Number(receipt.blockNumber));

    return {
      hash: receipt.transactionHash,
      blockNumber: Number(receipt.blockNumber),
      blockHash: receipt.blockHash,
      timestamp: block?.timestamp || 0,
      from: receipt.from,
      to: receipt.to || "",
      value: "0", // Receipt doesn't include value, would need to fetch tx
      gasUsed: gasUsed.toString(),
      gasPrice: gasPrice.toString(),
      gasCost: gasCost.toString(),
      gasCostEth: weiToEth(gasCost),
      status: receipt.status === "success" ? "success" : "failed",
      contractAddress: receipt.contractAddress || null,
      logs: receipt.logs.map((log) => ({
        address: log.address,
        topics: log.topics as string[],
        data: log.data,
        logIndex: Number(log.logIndex),
        transactionIndex: Number(log.transactionIndex),
        blockNumber: Number(log.blockNumber),
      })),
    };
  } catch (error) {
    console.error(
      "[BlockchainService] Failed to get transaction receipt:",
      error
    );
    return null;
  }
}

/**
 * Get recent contract events/logs
 */
export async function getContractLogs(
  contractAddress: string,
  fromBlock: number,
  toBlock: number | "latest"
): Promise<TransactionLog[]> {
  try {
    const rpc = getRpc();
    const logs = await eth_getLogs(rpc, {
      address: contractAddress as `0x${string}`,
      fromBlock: BigInt(fromBlock),
      toBlock: toBlock === "latest" ? "latest" : BigInt(toBlock),
    });

    return logs.map((log) => ({
      address: log.address,
      topics: log.topics as string[],
      data: log.data,
      logIndex: Number(log.logIndex),
      transactionIndex: Number(log.transactionIndex),
      blockNumber: Number(log.blockNumber),
    }));
  } catch (error) {
    console.error("[BlockchainService] Failed to get contract logs:", error);
    return [];
  }
}

/**
 * Get gas data for a transaction with caching
 */
async function getTransactionGasData(txHash: string): Promise<{
  gasUsed: bigint;
  gasPrice: bigint;
  gasCost: bigint;
} | null> {
  const now = Date.now();

  // Check cache first
  if (
    gasCache[txHash] &&
    now - gasCache[txHash].timestamp < TX_CACHE_EXPIRY_MS
  ) {
    return {
      gasUsed: gasCache[txHash].gasUsed,
      gasPrice: gasCache[txHash].gasPrice,
      gasCost: gasCache[txHash].gasCost,
    };
  }

  try {
    const rpc = getRpc();
    const receipt = await eth_getTransactionReceipt(rpc, {
      hash: txHash as `0x${string}`,
    });

    if (!receipt) return null;

    const gasUsed = receipt.gasUsed;
    const gasPrice = receipt.effectiveGasPrice || BigInt(0);
    const gasCost = gasUsed * gasPrice;

    // Cache the result
    gasCache[txHash] = {
      gasUsed,
      gasPrice,
      gasCost,
      timestamp: now,
    };

    return { gasUsed, gasPrice, gasCost };
  } catch (error) {
    console.error(
      `[BlockchainService] Failed to get gas for tx ${txHash}:`,
      error
    );
    return null;
  }
}

/**
 * Get unique transaction hashes from logs
 */
function getUniqueTransactionHashes(logs: TransactionLog[]): string[] {
  const txHashes = new Set<string>();

  // We need to get transaction hash from each log
  // Since TransactionLog doesn't have txHash, we need to fetch it differently
  // For now, we'll return the log data and fetch receipts by reconstructing
  return Array.from(txHashes);
}

/**
 * Get contract logs with transaction hashes
 */
async function getContractLogsWithTxHash(
  contractAddress: string,
  fromBlock: number,
  toBlock: number | "latest"
): Promise<Array<{ txHash: string; blockNumber: number }>> {
  try {
    const rpc = getRpc();
    const logs = await eth_getLogs(rpc, {
      address: contractAddress as `0x${string}`,
      fromBlock: BigInt(fromBlock),
      toBlock: toBlock === "latest" ? "latest" : BigInt(toBlock),
    });

    // Get unique transaction hashes
    const txMap = new Map<string, number>();
    for (const log of logs) {
      if (log.transactionHash && !txMap.has(log.transactionHash)) {
        txMap.set(log.transactionHash, Number(log.blockNumber));
      }
    }

    return Array.from(txMap.entries()).map(([txHash, blockNumber]) => ({
      txHash,
      blockNumber,
    }));
  } catch (error) {
    console.error(
      "[BlockchainService] Failed to get contract logs with tx hash:",
      error
    );
    return [];
  }
}

/**
 * Calculate real gas cost for a contract by fetching transaction receipts
 * Uses caching to minimize RPC calls
 */
async function calculateRealContractGas(
  contractAddress: string,
  fromBlock: number
): Promise<{
  totalGasUsed: bigint;
  totalGasCost: bigint;
  transactionCount: number;
}> {
  const now = Date.now();
  const cacheKey = contractAddress.toLowerCase();

  // Check if we have valid cached data
  const cached = contractGasCache[cacheKey];
  if (
    cached &&
    now - cached.lastUpdated < CONTRACT_CACHE_EXPIRY_MS &&
    cached.fromBlock === fromBlock
  ) {
    return {
      totalGasUsed: cached.totalGasUsed,
      totalGasCost: cached.totalGasCost,
      transactionCount: cached.transactionHashes.size,
    };
  }

  // Fetch logs with transaction hashes
  const txLogs = await getContractLogsWithTxHash(
    contractAddress,
    fromBlock,
    "latest"
  );

  let totalGasUsed = BigInt(0);
  let totalGasCost = BigInt(0);
  const processedHashes = new Set<string>();

  // Fetch gas data for each unique transaction (with batching to avoid overloading)
  const BATCH_SIZE = 5; // Process 5 transactions at a time

  for (let i = 0; i < txLogs.length; i += BATCH_SIZE) {
    const batch = txLogs.slice(i, i + BATCH_SIZE);

    const gasDataPromises = batch.map(async ({ txHash }) => {
      if (processedHashes.has(txHash)) return null;
      processedHashes.add(txHash);
      return getTransactionGasData(txHash);
    });

    const results = await Promise.all(gasDataPromises);

    for (const gasData of results) {
      if (gasData) {
        totalGasUsed += gasData.gasUsed;
        totalGasCost += gasData.gasCost;
      }
    }
  }

  // Update cache
  contractGasCache[cacheKey] = {
    totalGasUsed,
    totalGasCost,
    transactionHashes: processedHashes,
    lastUpdated: now,
    fromBlock,
  };

  return {
    totalGasUsed,
    totalGasCost,
    transactionCount: processedHashes.size,
  };
}

/**
 * Get recent blocks
 */
export async function getRecentBlocks(
  count: number = 10
): Promise<BlockInfo[]> {
  try {
    const currentBlock = await getCurrentBlockNumber();
    const blocks: BlockInfo[] = [];

    for (let i = 0; i < count; i++) {
      const blockNumber = currentBlock - i;
      if (blockNumber < 0) break;

      const block = await getBlockInfo(blockNumber);
      if (block) {
        blocks.push(block);
      }
    }

    return blocks;
  } catch (error) {
    console.error("[BlockchainService] Failed to get recent blocks:", error);
    return [];
  }
}

/**
 * Get transaction history for a specific contract
 * Now fetches REAL gas data from transaction receipts with caching
 */
export async function getContractTransactionHistory(
  contractAddress: string,
  contractName: string,
  blockRange: number = 10000
): Promise<ContractTransactionHistory> {
  try {
    const currentBlock = await getCurrentBlockNumber();
    const fromBlock = Math.max(0, currentBlock - blockRange);

    // Fetch real gas data from transaction receipts (with caching)
    const gasData = await calculateRealContractGas(contractAddress, fromBlock);

    return {
      contractName,
      contractAddress,
      transactions: [], // Individual transactions not needed for analytics
      totalGasUsed: gasData.totalGasUsed.toString(),
      totalGasCost: gasData.totalGasCost.toString(),
      totalGasCostEth: weiToEth(gasData.totalGasCost),
      transactionCount: gasData.transactionCount,
    };
  } catch (error) {
    console.error(
      `[BlockchainService] Failed to get history for ${contractName}:`,
      error
    );
    return {
      contractName,
      contractAddress,
      transactions: [],
      totalGasUsed: "0",
      totalGasCost: "0",
      totalGasCostEth: "0",
      transactionCount: 0,
    };
  }
}

/**
 * Get comprehensive blockchain analytics for all EduVerse contracts
 */
export async function getBlockchainAnalytics(
  blockRange: number = 10000
): Promise<BlockchainAnalytics> {
  try {
    const [
      currentBlockNumber,
      gasInfo,
      recentBlocks,
      courseFactoryHistory,
      courseLicenseHistory,
      progressTrackerHistory,
      certificateManagerHistory,
    ] = await Promise.all([
      getCurrentBlockNumber(),
      getCurrentGasPrice(),
      getRecentBlocks(10),
      CONTRACTS.COURSE_FACTORY
        ? getContractTransactionHistory(
            CONTRACTS.COURSE_FACTORY,
            "CourseFactory",
            blockRange
          )
        : Promise.resolve(createEmptyHistory("CourseFactory", "")),
      CONTRACTS.COURSE_LICENSE
        ? getContractTransactionHistory(
            CONTRACTS.COURSE_LICENSE,
            "CourseLicense",
            blockRange
          )
        : Promise.resolve(createEmptyHistory("CourseLicense", "")),
      CONTRACTS.PROGRESS_TRACKER
        ? getContractTransactionHistory(
            CONTRACTS.PROGRESS_TRACKER,
            "ProgressTracker",
            blockRange
          )
        : Promise.resolve(createEmptyHistory("ProgressTracker", "")),
      CONTRACTS.CERTIFICATE_MANAGER
        ? getContractTransactionHistory(
            CONTRACTS.CERTIFICATE_MANAGER,
            "CertificateManager",
            blockRange
          )
        : Promise.resolve(createEmptyHistory("CertificateManager", "")),
    ]);

    // Aggregate totals
    const totalTransactions =
      courseFactoryHistory.transactionCount +
      courseLicenseHistory.transactionCount +
      progressTrackerHistory.transactionCount +
      certificateManagerHistory.transactionCount;

    const totalGasUsed =
      BigInt(courseFactoryHistory.totalGasUsed) +
      BigInt(courseLicenseHistory.totalGasUsed) +
      BigInt(progressTrackerHistory.totalGasUsed) +
      BigInt(certificateManagerHistory.totalGasUsed);

    const totalGasCost =
      BigInt(courseFactoryHistory.totalGasCost) +
      BigInt(courseLicenseHistory.totalGasCost) +
      BigInt(progressTrackerHistory.totalGasCost) +
      BigInt(certificateManagerHistory.totalGasCost);

    const averageGasPerTransaction =
      totalTransactions > 0
        ? (totalGasUsed / BigInt(totalTransactions)).toString()
        : "0";

    return {
      currentBlockNumber,
      currentGasPrice: gasInfo.gasPrice,
      currentGasPriceGwei: gasInfo.gasPriceGwei,
      recentBlocks,
      contractHistory: {
        courseFactory: courseFactoryHistory,
        courseLicense: courseLicenseHistory,
        progressTracker: progressTrackerHistory,
        certificateManager: certificateManagerHistory,
      },
      totalTransactions,
      totalGasUsed: totalGasUsed.toString(),
      totalGasCost: totalGasCost.toString(),
      totalGasCostEth: weiToEth(totalGasCost),
      averageGasPerTransaction,
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.error(
      "[BlockchainService] Failed to get blockchain analytics:",
      error
    );
    throw error;
  }
}

function createEmptyHistory(
  name: string,
  address: string
): ContractTransactionHistory {
  return {
    contractName: name,
    contractAddress: address,
    transactions: [],
    totalGasUsed: "0",
    totalGasCost: "0",
    totalGasCostEth: "0",
    transactionCount: 0,
  };
}

// ============================================================================
// REAL-TIME MONITORING
// ============================================================================

export interface BlockchainMonitorCallback {
  onNewBlock?: (block: BlockInfo) => void;
  onNewTransaction?: (tx: BlockchainTransaction) => void;
  onError?: (error: Error) => void;
}

/**
 * Start monitoring blockchain for new blocks
 * Returns a cleanup function to stop monitoring
 */
export function startBlockMonitor(
  callback: BlockchainMonitorCallback,
  intervalMs: number = 5000
): () => void {
  let lastBlockNumber = 0;
  let isRunning = true;

  const poll = async () => {
    if (!isRunning) return;

    try {
      const currentBlock = await getCurrentBlockNumber();

      if (currentBlock > lastBlockNumber) {
        // New block(s) detected
        for (
          let blockNum = lastBlockNumber + 1;
          blockNum <= currentBlock;
          blockNum++
        ) {
          if (!isRunning) break;

          const blockInfo = await getBlockInfo(blockNum);
          if (blockInfo && callback.onNewBlock) {
            callback.onNewBlock(blockInfo);
          }
        }
        lastBlockNumber = currentBlock;
      }
    } catch (error) {
      if (callback.onError) {
        callback.onError(error as Error);
      }
    }

    if (isRunning) {
      setTimeout(poll, intervalMs);
    }
  };

  // Initialize and start polling
  getCurrentBlockNumber()
    .then((blockNum) => {
      lastBlockNumber = blockNum;
      poll();
    })
    .catch((error) => {
      if (callback.onError) {
        callback.onError(error);
      }
    });

  // Return cleanup function
  return () => {
    isRunning = false;
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const blockchainTransactionsService = {
  getCurrentBlockNumber,
  getCurrentGasPrice,
  getBlockInfo,
  getTransactionReceipt,
  getContractLogs,
  getRecentBlocks,
  getContractTransactionHistory,
  getBlockchainAnalytics,
  startBlockMonitor,
};

export default blockchainTransactionsService;
