import { PINATA_JWT, PINATA_GATEWAY } from "@env";

/**
 * Production-ready Pinata IPFS Service
 * Uses latest Pinata API with JWT authentication and proper error handling
 */
class PinataService {
  constructor() {
    this.apiUrl = "https://api.pinata.cloud";
    this.gatewayUrl = `https://${PINATA_GATEWAY}`;
    this.jwt = PINATA_JWT;

    if (!this.jwt) {
      console.error("Pinata JWT not found in environment variables");
    }
  }

  /**
   * Get authorization headers for Pinata API
   */
  getHeaders(isFormData = false) {
    const headers = {
      Authorization: `Bearer ${this.jwt}`,
    };

    // Don't set Content-Type for FormData, let the browser set it with boundary
    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    return headers;
  }

  /**
   * Upload file to IPFS via Pinata
   * @param {File|Blob} file - File or Blob to upload
   * @param {Object} options - Upload options
   * @param {string} options.name - Custom name for the file
   * @param {Object} options.metadata - Custom metadata
   * @param {Array} options.keyValues - Key-value pairs for searchable metadata
   * @param {Function} options.onProgress - Progress callback (percentage)
   * @returns {Promise<Object>} Upload result with IPFS hash and details
   */
  async uploadFile(file, options = {}) {
    try {
      if (!this.jwt) {
        throw new Error("Pinata JWT not configured");
      }

      if (!file) {
        throw new Error("File is required");
      }

      const formData = new FormData();

      // Add the file
      const fileName = options.name || file.name || `file_${Date.now()}`;
      formData.append("file", file, fileName);

      // Add pinata options (metadata)
      const pinataOptions = {
        cidVersion: 1,
      };

      if (options.metadata || options.keyValues) {
        const pinataMetadata = {};

        if (options.metadata) {
          pinataMetadata.name = options.metadata.name || fileName;
          if (options.metadata.description) {
            pinataMetadata.description = options.metadata.description;
          }
        }

        if (options.keyValues && Array.isArray(options.keyValues)) {
          pinataMetadata.keyvalues = {};
          options.keyValues.forEach(({ key, value }) => {
            pinataMetadata.keyvalues[key] = value;
          });
        }

        formData.append("pinataMetadata", JSON.stringify(pinataMetadata));
      }

      formData.append("pinataOptions", JSON.stringify(pinataOptions));

      // Create XMLHttpRequest for progress tracking if callback provided
      if (options.onProgress && typeof options.onProgress === "function") {
        return this._uploadWithProgress(formData, options.onProgress);
      }

      // Standard fetch upload
      const response = await fetch(`${this.apiUrl}/pinning/pinFileToIPFS`, {
        method: "POST",
        headers: this.getHeaders(true),
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          `Pinata API error: ${responseData.error || response.statusText}`
        );
      }

      return {
        success: true,
        ipfsHash: responseData.IpfsHash,
        pinSize: responseData.PinSize,
        timestamp: responseData.Timestamp,
        gatewayUrl: `${this.gatewayUrl}/ipfs/${responseData.IpfsHash}`,
        publicUrl: `https://gateway.pinata.cloud/ipfs/${responseData.IpfsHash}`,
        isDuplicate: responseData.isDuplicate || false,
      };
    } catch (error) {
      console.error("Pinata upload error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Upload file with progress tracking using XMLHttpRequest
   */
  _uploadWithProgress(formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round(
            (event.loaded / event.total) * 100
          );
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener("load", () => {
        try {
          const responseData = JSON.parse(xhr.responseText);

          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({
              success: true,
              ipfsHash: responseData.IpfsHash,
              pinSize: responseData.PinSize,
              timestamp: responseData.Timestamp,
              gatewayUrl: `${this.gatewayUrl}/ipfs/${responseData.IpfsHash}`,
              publicUrl: `https://gateway.pinata.cloud/ipfs/${responseData.IpfsHash}`,
              isDuplicate: responseData.isDuplicate || false,
            });
          } else {
            reject(
              new Error(
                `Pinata API error: ${responseData.error || xhr.statusText}`
              )
            );
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"));
      });

      xhr.addEventListener("timeout", () => {
        reject(new Error("Upload timeout"));
      });

      xhr.open("POST", `${this.apiUrl}/pinning/pinFileToIPFS`);
      xhr.setRequestHeader("Authorization", `Bearer ${this.jwt}`);
      xhr.timeout = 300000; // 5 minute timeout
      xhr.send(formData);
    });
  }

  /**
   * Upload JSON data to IPFS via Pinata
   * @param {Object} jsonData - JSON object to upload
   * @param {Object} options - Upload options
   * @param {string} options.name - Custom name for the JSON file
   * @param {Object} options.metadata - Custom metadata
   * @param {Array} options.keyValues - Key-value pairs for searchable metadata
   * @returns {Promise<Object>} Upload result with IPFS hash and details
   */
  async uploadJSON(jsonData, options = {}) {
    try {
      if (!this.jwt) {
        throw new Error("Pinata JWT not configured");
      }

      if (!jsonData || typeof jsonData !== "object") {
        throw new Error("Valid JSON data is required");
      }

      const pinataContent = {
        pinataContent: jsonData,
        pinataOptions: {
          cidVersion: 1,
        },
      };

      // Add metadata if provided
      if (options.metadata || options.keyValues) {
        const pinataMetadata = {};

        if (options.metadata) {
          pinataMetadata.name =
            options.metadata.name || options.name || `json_${Date.now()}`;
          if (options.metadata.description) {
            pinataMetadata.description = options.metadata.description;
          }
        }

        if (options.keyValues && Array.isArray(options.keyValues)) {
          pinataMetadata.keyvalues = {};
          options.keyValues.forEach(({ key, value }) => {
            pinataMetadata.keyvalues[key] = value;
          });
        }

        pinataContent.pinataMetadata = pinataMetadata;
      }

      const response = await fetch(`${this.apiUrl}/pinning/pinJSONToIPFS`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(pinataContent),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          `Pinata API error: ${responseData.error || response.statusText}`
        );
      }

      return {
        success: true,
        ipfsHash: responseData.IpfsHash,
        pinSize: responseData.PinSize,
        timestamp: responseData.Timestamp,
        gatewayUrl: `${this.gatewayUrl}/ipfs/${responseData.IpfsHash}`,
        publicUrl: `https://gateway.pinata.cloud/ipfs/${responseData.IpfsHash}`,
        isDuplicate: responseData.isDuplicate || false,
      };
    } catch (error) {
      console.error("Pinata JSON upload error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get file from IPFS using Pinata gateway
   * @param {string} ipfsHash - IPFS hash of the file
   * @param {boolean} useCustomGateway - Whether to use custom gateway or public
   * @returns {Promise<string>} File URL
   */
  getFileUrl(ipfsHash, useCustomGateway = true) {
    if (!ipfsHash) {
      throw new Error("IPFS hash is required");
    }

    // Remove ipfs:// prefix if present
    const cleanHash = ipfsHash.replace("ipfs://", "");

    return useCustomGateway && this.gatewayUrl
      ? `${this.gatewayUrl}/ipfs/${cleanHash}`
      : `https://gateway.pinata.cloud/ipfs/${cleanHash}`;
  }

  /**
   * Get pinned files list from Pinata
   * @param {Object} filters - Filter options
   * @param {string} filters.status - Pin status (pinned, unpinned, etc.)
   * @param {number} filters.pageLimit - Number of results per page (max 1000)
   * @param {number} filters.pageOffset - Offset for pagination
   * @param {Object} filters.metadata - Metadata filters
   * @returns {Promise<Object>} List of pinned files
   */
  async listFiles(filters = {}) {
    try {
      if (!this.jwt) {
        throw new Error("Pinata JWT not configured");
      }

      const params = new URLSearchParams();

      if (filters.status) {
        params.append("status", filters.status);
      }

      if (filters.pageLimit) {
        params.append("pageLimit", Math.min(filters.pageLimit, 1000));
      }

      if (filters.pageOffset) {
        params.append("pageOffset", filters.pageOffset);
      }

      if (filters.metadata) {
        Object.entries(filters.metadata).forEach(([key, value]) => {
          params.append(`metadata[keyvalues][${key}]`, value);
        });
      }

      const url = `${this.apiUrl}/data/pinList?${params.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          `Pinata API error: ${responseData.error || response.statusText}`
        );
      }

      return {
        success: true,
        files: responseData.rows || [],
        count: responseData.count || 0,
      };
    } catch (error) {
      console.error("Pinata list files error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Unpin file from IPFS
   * @param {string} ipfsHash - IPFS hash to unpin
   * @returns {Promise<Object>} Unpin result
   */
  async unpinFile(ipfsHash) {
    try {
      if (!this.jwt) {
        throw new Error("Pinata JWT not configured");
      }

      if (!ipfsHash) {
        throw new Error("IPFS hash is required");
      }

      const cleanHash = ipfsHash.replace("ipfs://", "");

      const response = await fetch(
        `${this.apiUrl}/pinning/unpin/${cleanHash}`,
        {
          method: "DELETE",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(
          `Pinata API error: ${responseData.error || response.statusText}`
        );
      }

      return {
        success: true,
        message: "File unpinned successfully",
      };
    } catch (error) {
      console.error("Pinata unpin error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Test Pinata connection and authentication
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    try {
      if (!this.jwt) {
        throw new Error("Pinata JWT not configured");
      }

      const response = await fetch(`${this.apiUrl}/data/testAuthentication`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          `Pinata API error: ${responseData.error || response.statusText}`
        );
      }

      return {
        success: true,
        message: responseData.message || "Authenticated successfully",
      };
    } catch (error) {
      console.error("Pinata connection test error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Export singleton instance
export const pinataService = new PinataService();
export default pinataService;
