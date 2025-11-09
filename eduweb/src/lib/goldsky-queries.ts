const GOLDSKY_ENDPOINT = process.env.NEXT_PUBLIC_GOLDSKY_ENDPOINT || "";

export interface AdminConfigEvent {
  id: string;
  admin: string;
  type: string;
  configKey: string;
  oldValue: string | null;
  newValue: string;
  affectedContract: string;
  timestamp: string;
  blockNumber: string;
  transactionHash: string;
  description: string;
  gasUsed: string | null;
}

export interface ContractConfigState {
  id: string;
  contractName: string;
  defaultCertificateFee: string | null;
  defaultCertificateFeeEth: string | null;
  defaultCourseAdditionFee: string | null;
  defaultCourseAdditionFeeEth: string | null;
  platformWallet: string | null;
  defaultPlatformName: string | null;
  defaultBaseRoute: string | null;
  platformFeePercentage: string | null;
  licenseURI: string | null;
  lastUpdated: string;
  lastUpdateBlock: string;
  lastUpdateTxHash: string;
}

export async function fetchAdminConfigEvents(
  limit: number = 50,
  skip: number = 0
): Promise<AdminConfigEvent[]> {
  const query = `
    query GetAdminConfigEvents($limit: Int!, $skip: Int!) {
      adminConfigEvents(
        first: $limit
        skip: $skip
        orderBy: timestamp
        orderDirection: desc
      ) {
        id
        admin
        type
        configKey
        oldValue
        newValue
        affectedContract
        timestamp
        blockNumber
        transactionHash
        description
        gasUsed
      }
    }
  `;

  try {
    const response = await fetch(GOLDSKY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { limit, skip },
      }),
    });

    if (!response.ok) {
      throw new Error(`Goldsky API error: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
      console.error("GraphQL errors:", result.errors);
      return [];
    }

    return result.data?.adminConfigEvents || [];
  } catch (error) {
    console.error("Error fetching admin config events:", error);
    return [];
  }
}

export async function fetchContractConfigState(
  contractAddress: string
): Promise<ContractConfigState | null> {
  const query = `
    query GetContractConfig($id: ID!) {
      contractConfigState(id: $id) {
        id
        contractName
        defaultCertificateFee
        defaultCertificateFeeEth
        defaultCourseAdditionFee
        defaultCourseAdditionFeeEth
        platformWallet
        defaultPlatformName
        defaultBaseRoute
        platformFeePercentage
        licenseURI
        lastUpdated
        lastUpdateBlock
        lastUpdateTxHash
      }
    }
  `;

  try {
    const response = await fetch(GOLDSKY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { id: contractAddress.toLowerCase() },
      }),
    });

    if (!response.ok) {
      throw new Error(`Goldsky API error: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
      console.error("GraphQL errors:", result.errors);
      return null;
    }

    return result.data?.contractConfigState || null;
  } catch (error) {
    console.error("Error fetching contract config state:", error);
    return null;
  }
}

export async function fetchAllAdminConfigEvents(): Promise<AdminConfigEvent[]> {
  const query = `
    query GetAllAdminConfigEvents {
      adminConfigEvents(
        orderBy: timestamp
        orderDirection: desc
        first: 1000
      ) {
        id
        admin
        type
        configKey
        oldValue
        newValue
        affectedContract
        timestamp
        blockNumber
        transactionHash
        description
        gasUsed
      }
    }
  `;

  try {
    const response = await fetch(GOLDSKY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Goldsky API error: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
      console.error("GraphQL errors:", result.errors);
      return [];
    }

    return result.data?.adminConfigEvents || [];
  } catch (error) {
    console.error("Error fetching all admin config events:", error);
    return [];
  }
}

export async function fetchAdminConfigEventsByType(
  eventType: string,
  limit: number = 50
): Promise<AdminConfigEvent[]> {
  const query = `
    query GetAdminConfigEventsByType($type: String!, $limit: Int!) {
      adminConfigEvents(
        where: { type: $type }
        first: $limit
        orderBy: timestamp
        orderDirection: desc
      ) {
        id
        admin
        type
        configKey
        oldValue
        newValue
        affectedContract
        timestamp
        blockNumber
        transactionHash
        description
        gasUsed
      }
    }
  `;

  try {
    const response = await fetch(GOLDSKY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { type: eventType, limit },
      }),
    });

    if (!response.ok) {
      throw new Error(`Goldsky API error: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
      console.error("GraphQL errors:", result.errors);
      return [];
    }

    return result.data?.adminConfigEvents || [];
  } catch (error) {
    console.error("Error fetching admin config events by type:", error);
    return [];
  }
}

export async function fetchAdminConfigEventsByAdmin(
  adminAddress: string,
  limit: number = 50
): Promise<AdminConfigEvent[]> {
  const query = `
    query GetAdminConfigEventsByAdmin($admin: Bytes!, $limit: Int!) {
      adminConfigEvents(
        where: { admin: $admin }
        first: $limit
        orderBy: timestamp
        orderDirection: desc
      ) {
        id
        admin
        type
        configKey
        oldValue
        newValue
        affectedContract
        timestamp
        blockNumber
        transactionHash
        description
        gasUsed
      }
    }
  `;

  try {
    const response = await fetch(GOLDSKY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { admin: adminAddress.toLowerCase(), limit },
      }),
    });

    if (!response.ok) {
      throw new Error(`Goldsky API error: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
      console.error("GraphQL errors:", result.errors);
      return [];
    }

    return result.data?.adminConfigEvents || [];
  } catch (error) {
    console.error("Error fetching admin config events by admin:", error);
    return [];
  }
}
