import { fetchGraphQL } from "./goldsky.service";

export interface ContractConfig {
  id: string;
  contractAddress: string;
  contractType: string;
  contractName: string;
  platformWallet?: string;
  platformFeePercentage?: string;
  defaultCertificateFee?: string;
  defaultCertificateFeeEth?: string;
  defaultCourseAdditionFee?: string;
  defaultCourseAdditionFeeEth?: string;
  defaultPlatformName?: string;
  defaultBaseRoute?: string;
  defaultMetadataBaseURI?: string;
  licenseBaseURI?: string;
  isPaused?: boolean;
  lastUpdated?: string;
  lastUpdateBlock?: string;
  lastUpdateTxHash?: string;
}

export interface AdminConfigEvent {
  id: string;
  admin: string;
  eventType: string;
  configKey: string;
  oldValue?: string;
  newValue: string;
  contractName: string;
  description: string;
  timestamp: string;
  blockNumber: string;
  transactionHash: string;
}

export async function getContractConfig(
  contractAddress: string
): Promise<ContractConfig | null> {
  const query = `
    query GetContractConfig($contractAddress: String!) {
      contractConfigState(id: $contractAddress) {
        id
        contractAddress
        contractType
        contractName
        platformWallet
        platformFeePercentage
        defaultCertificateFee
        defaultCertificateFeeEth
        defaultCourseAdditionFee
        defaultCourseAdditionFeeEth
        defaultPlatformName
        defaultBaseRoute
        defaultMetadataBaseURI
        licenseBaseURI
        isPaused
        lastUpdated
        lastUpdateBlock
        lastUpdateTxHash
      }
    }
  `;

  const data = await fetchGraphQL(
    query,
    { contractAddress: contractAddress.toLowerCase() },
    "GetContractConfig"
  );

  return data.contractConfigState || null;
}

export async function getAllContractConfigs(): Promise<ContractConfig[]> {
  const query = `
    query GetAllContractConfigs {
      contractConfigStates {
        id
        contractAddress
        contractType
        contractName
        platformWallet
        platformFeePercentage
        defaultCertificateFee
        defaultCertificateFeeEth
        defaultCourseAdditionFee
        defaultCourseAdditionFeeEth
        defaultPlatformName
        defaultBaseRoute
        defaultMetadataBaseURI
        licenseBaseURI
        isPaused
        lastUpdated
        lastUpdateBlock
        lastUpdateTxHash
      }
    }
  `;

  const data = await fetchGraphQL(query, {}, "GetAllContractConfigs");

  return data.contractConfigStates || [];
}

export async function getAdminConfigEvents(
  first: number = 50,
  skip: number = 0,
  admin?: string
): Promise<AdminConfigEvent[]> {
  const whereClause = admin ? `where: { admin: "${admin.toLowerCase()}" }` : "";

  const query = `
    query GetAdminConfigEvents($first: Int!, $skip: Int!) {
      adminConfigEvents(
        first: $first
        skip: $skip
        ${whereClause}
        orderBy: timestamp
        orderDirection: desc
      ) {
        id
        admin
        eventType
        configKey
        oldValue
        newValue
        contractName
        description
        timestamp
        blockNumber
        transactionHash
      }
    }
  `;

  const data = await fetchGraphQL(
    query,
    { first, skip },
    "GetAdminConfigEvents"
  );

  return data.adminConfigEvents || [];
}

export async function getContractConfigByType(
  contractType: string
): Promise<ContractConfig | null> {
  const query = `
    query GetContractConfigByType($contractType: String!) {
      contractConfigStates(where: { contractType: $contractType }, first: 1) {
        id
        contractAddress
        contractType
        contractName
        platformWallet
        platformFeePercentage
        defaultCertificateFee
        defaultCertificateFeeEth
        defaultCourseAdditionFee
        defaultCourseAdditionFeeEth
        defaultPlatformName
        defaultBaseRoute
        defaultMetadataBaseURI
        baseURI
        licenseBaseURI
        isPaused
        lastUpdated
        lastUpdateBlock
        lastUpdateTxHash
      }
    }
  `;

  const data = await fetchGraphQL(
    query,
    { contractType },
    "GetContractConfigByType"
  );

  const configs = data.contractConfigStates || [];
  return configs.length > 0 ? configs[0] : null;
}
