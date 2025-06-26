/**
 * PinataService.js - React Native Optimized Version (Fixed dengan Signed URL)
 * Service untuk menangani interaksi dengan Pinata IPFS API v3
 */

class PinataService {
  constructor() {
    this.JWT = process.env.PINATA_JWT || process.env.REACT_NATIVE_PINATA_JWT;
    this.BASE_URL = "https://api.pinata.cloud/v3";
    this.UPLOAD_URL = "https://uploads.pinata.cloud/v3";
    this.PUBLIC_GATEWAY = "https://gateway.pinata.cloud/ipfs";

    // Dedicated gateway dari environment
    this.PINATA_GATEWAY =
      process.env.PINATA_GATEWAY || process.env.REACT_NATIVE_PINATA_GATEWAY;

    if (this.PINATA_GATEWAY) {
      this.DEDICATED_GATEWAY = this.PINATA_GATEWAY.includes("https://")
        ? this.PINATA_GATEWAY
        : `https://${this.PINATA_GATEWAY}`;
      console.log("✅ Using dedicated gateway:", this.DEDICATED_GATEWAY);
    } else {
      this.DEDICATED_GATEWAY = null;
    }

    if (!this.JWT) {
      console.warn("PINATA_JWT tidak ditemukan dalam environment variables");
    } else {
      console.log(
        "PinataService initialized with JWT length:",
        this.JWT.length
      );
    }
  }

  /**
   * Headers untuk API requests
   */
  getHeaders() {
    return {
      Authorization: `Bearer ${this.JWT}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Generic request handler dengan retry logic
   */
  async makeRequest(url, options = {}, retries = 3) {
    const { timeout = 60000, ...fetchOptions } = options;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        console.log(`Making request attempt ${attempt + 1} to:`, url);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log(`Request timeout after ${timeout}ms`);
          controller.abort();
        }, timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log(`Response status: ${response.status}`);

        let responseData;
        const contentType = response.headers.get("content-type");

        try {
          if (contentType && contentType.includes("application/json")) {
            responseData = await response.json();
          } else {
            responseData = await response.text();
          }
        } catch (parseError) {
          console.error("Failed to parse response:", parseError);
          responseData = `Response parse error: ${parseError.message}`;
        }

        if (!response.ok) {
          console.error("HTTP Error Response:", {
            status: response.status,
            statusText: response.statusText,
            data: responseData,
            url: url,
          });

          let errorMessage;
          if (typeof responseData === "object") {
            if (responseData.error) {
              errorMessage =
                typeof responseData.error === "object"
                  ? responseData.error.message ||
                    JSON.stringify(responseData.error)
                  : responseData.error;
            } else {
              errorMessage =
                responseData.message ||
                JSON.stringify(responseData) ||
                `HTTP ${response.status}: ${response.statusText}`;
            }
          } else {
            errorMessage =
              responseData || `HTTP ${response.status}: ${response.statusText}`;
          }

          throw new Error(errorMessage);
        }

        return responseData;
      } catch (error) {
        console.error(`Request attempt ${attempt + 1} failed:`, error.message);

        if (attempt === retries - 1) {
          throw error;
        }

        // Wait before retry
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Detect MIME type dari nama file
   */
  detectMimeType(fileName) {
    if (!fileName) return "application/octet-stream";

    const extension = fileName.toLowerCase().split(".").pop();
    const mimeTypes = {
      // Video formats
      mp4: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
      mkv: "video/x-matroska",
      flv: "video/x-flv",
      wmv: "video/x-ms-wmv",
      "3gp": "video/3gpp",
      m4v: "video/x-m4v",
      ogv: "video/ogg",

      // Images
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",

      // Documents
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      txt: "text/plain",
      json: "application/json",
    };

    return mimeTypes[extension] || "application/octet-stream";
  }

  /**
   * Create proper File object for React Native
   */
  createFileObject(fileData) {
    console.log("Creating file object from:", fileData);

    if (fileData instanceof File) {
      return fileData;
    }

    // Handle React Native image picker result
    if (fileData.uri) {
      const fileName = fileData.name || fileData.uri.split("/").pop();
      let mimeType = fileData.type;

      // Handle generic types like "video", "image"
      if (!mimeType || mimeType === "image" || mimeType === "video") {
        const detectedType = this.detectMimeType(fileName);
        mimeType = detectedType;
        console.log(
          `Corrected generic type "${fileData.type}" to specific MIME type:`,
          mimeType
        );
      }

      return {
        uri: fileData.uri,
        type: mimeType,
        name: fileName,
        size: fileData.size,
      };
    }

    console.error("Unsupported file data format:", fileData);
    throw new Error("Invalid file data provided");
  }

  /**
   * Upload file ke IPFS sesuai dengan Pinata API v3
   */
  async uploadFile(file, options = {}) {
    try {
      console.log("Starting upload with file:", file);

      if (!file) {
        throw new Error("File diperlukan untuk upload");
      }

      const {
        name,
        network = "public", // DEFAULT ke public untuk kemudahan akses
        group_id,
        keyvalues = {},
      } = options;

      // Process file untuk React Native compatibility
      const processedFile = this.createFileObject(file);
      console.log("Processed File object:", processedFile);

      if (!processedFile.uri) {
        throw new Error("File URI tidak ditemukan");
      }

      // Create FormData sesuai dengan API v3 spec
      const formData = new FormData();

      const fileForUpload = {
        uri: processedFile.uri,
        type: processedFile.type,
        name: processedFile.name,
      };

      console.log("Final file object for upload:", fileForUpload);

      // Append required fields sesuai API v3
      formData.append("file", fileForUpload);
      formData.append("network", network); // PENTING: network field adalah required

      // Optional fields
      if (name) {
        formData.append("name", name);
      }

      if (group_id) {
        formData.append("group_id", group_id);
      }

      // Keyvalues untuk metadata (sesuai dokumentasi)
      if (keyvalues && Object.keys(keyvalues).length > 0) {
        Object.entries(keyvalues).forEach(([key, value]) => {
          formData.append(`keyvalues[${key}]`, value.toString());
        });
      }

      console.log("Sending upload request to Pinata v3 API...");
      console.log("Network setting:", network);

      const uploadTimeout = Math.max(120000, (processedFile.size || 0) * 0.002);
      console.log(`Upload timeout set to: ${uploadTimeout}ms`);

      const uploadEndpoint = `${this.UPLOAD_URL}/files`;
      console.log("Using upload endpoint:", uploadEndpoint);

      const response = await this.makeRequest(uploadEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.JWT}`,
          // Note: Don't set Content-Type for FormData, let browser set it with boundary
        },
        body: formData,
        timeout: uploadTimeout,
      });

      console.log("Upload successful:", response);

      // Handle response sesuai API v3 spec
      let responseData = response.data || response;
      let isDuplicate = responseData.is_duplicate || false;

      if (isDuplicate) {
        console.log("File was a duplicate - this is normal and not an error");
      }

      if (!responseData || !responseData.cid) {
        throw new Error("Invalid response from Pinata - missing CID");
      }

      // Deteksi network dari response (bukan dari options)
      const actualNetwork = responseData.network || network;
      console.log(`File uploaded to ${actualNetwork} network`);

      // Generate URLs berdasarkan network yang sebenarnya
      let publicUrl, privateUrl, streamingUrl;

      if (actualNetwork === "public") {
        // File public - langsung accessible
        publicUrl = `${this.PUBLIC_GATEWAY}/${responseData.cid}`;
        privateUrl = publicUrl;
        streamingUrl = publicUrl;
      } else {
        // File private - perlu signed URL
        console.log("File is private, will need signed URL for access");
        publicUrl = `${this.PUBLIC_GATEWAY}/${responseData.cid}`; // Fallback, tapi tidak akan work
        privateUrl = `${this.PUBLIC_GATEWAY}/${responseData.cid}`;
        streamingUrl = null; // Will be generated when needed
      }

      const result = {
        success: true,
        isDuplicate: isDuplicate,
        data: responseData,
        ipfsHash: responseData.cid,
        fileName: responseData.name || processedFile.name,
        fileSize: responseData.size || processedFile.size,
        network: actualNetwork, // Use actual network from response
        publicUrl: publicUrl,
        privateUrl: privateUrl,
        streamingUrl: streamingUrl,
        isPrivate: actualNetwork === "private",
        message: isDuplicate
          ? "File uploaded successfully (duplicate detected - file already exists)"
          : "File uploaded successfully",
      };

      return result;
    } catch (error) {
      console.error("Upload file error:", error);
      throw new Error(`Gagal upload file: ${error.message}`);
    }
  }

  /**
   * Create signed URL untuk mengakses file private
   * Sesuai dengan dokumentasi API v3
   */
  async createSignedUrl(cid, options = {}) {
    try {
      const {
        expires = 3600, // 1 jam default
        method = "GET",
        gateway = this.DEDICATED_GATEWAY || this.PUBLIC_GATEWAY,
      } = options;

      console.log(`Creating signed URL for CID: ${cid}`);

      const url = gateway.includes("/ipfs/")
        ? `${gateway}/${cid}`
        : `${gateway}/ipfs/${cid}`;

      const data = {
        url: url,
        date: Math.floor(new Date().getTime() / 1000), // Current timestamp
        expires: expires, // Duration in seconds
        method: method,
      };

      console.log("Signed URL request data:", data);

      const response = await this.makeRequest(`${this.BASE_URL}/files/sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.JWT}`,
        },
        body: JSON.stringify(data),
        timeout: 10000,
      });

      console.log("Signed URL created successfully");

      return {
        success: true,
        signedUrl: response.data,
        expiresAt: new Date((data.date + expires) * 1000).toISOString(),
        expires: expires,
      };
    } catch (error) {
      console.error("Failed to create signed URL:", error);
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }
  }

  /**
   * Get file by ID (untuk mendapatkan info file)
   */
  async getFileById(id, network = "private") {
    try {
      console.log(`Getting file info for ID: ${id} on ${network} network`);

      const response = await this.makeRequest(
        `${this.BASE_URL}/files/${network}/${id}`,
        {
          method: "GET",
          headers: this.getHeaders(),
          timeout: 10000,
        }
      );

      return {
        success: true,
        file: response.data,
      };
    } catch (error) {
      console.error("Failed to get file by ID:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * List files dari Pinata sesuai API v3
   */
  async listFiles(options = {}) {
    try {
      const {
        network = "public",
        limit = 10,
        order = "DESC",
        cid,
        name,
        group,
        mimeType,
        cidPending,
        metadata,
        pageToken,
      } = options;

      const params = new URLSearchParams();

      if (limit) params.append("limit", limit.toString());
      if (order) params.append("order", order);
      if (cid) params.append("cid", cid);
      if (name) params.append("name", name);
      if (group) params.append("group", group);
      if (mimeType) params.append("mimeType", mimeType);
      if (cidPending !== undefined)
        params.append("cidPending", cidPending.toString());
      if (pageToken) params.append("pageToken", pageToken);

      // Handle metadata object
      if (metadata && typeof metadata === "object") {
        Object.entries(metadata).forEach(([key, value]) => {
          params.append(`metadata[${key}]`, value.toString());
        });
      }

      const queryString = params.toString();
      const url = `${this.BASE_URL}/files/${network}${
        queryString ? `?${queryString}` : ""
      }`;

      const response = await this.makeRequest(url, {
        method: "GET",
        headers: this.getHeaders(),
      });

      return {
        success: true,
        files: response.data.files || [],
        count: response.data.files ? response.data.files.length : 0,
        nextPageToken: response.data.next_page_token,
        data: response.data,
      };
    } catch (error) {
      console.error("List files error:", error);
      return {
        success: false,
        error: error.message || "Gagal mengambil daftar file",
      };
    }
  }

  /**
   * Test connection to Pinata API
   */
  async testConnection() {
    try {
      console.log("Testing connection to Pinata...");
      console.log("JWT exists:", !!this.JWT);
      console.log("JWT length:", this.JWT?.length);

      const response = await this.makeRequest(
        `${this.BASE_URL}/files/private?limit=1`,
        {
          method: "GET",
          headers: this.getHeaders(),
          timeout: 10000,
        }
      );

      console.log("Connection test successful:", response);

      return {
        success: true,
        message: "Koneksi ke Pinata berhasil",
        data: response,
      };
    } catch (error) {
      console.error("Connection test failed:", error);
      return {
        success: false,
        error: error.message,
        message: "Koneksi ke Pinata gagal",
      };
    }
  }

  /**
   * Get fastest streaming URL dengan support untuk signed URL
   */
  async getFasterStreamingUrl(cid, network = null) {
    console.log(
      `🚀 Getting fastest streaming URL for CID: ${cid} (network: ${network})`
    );

    if (!cid) {
      console.error("❌ CID is required");
      return null;
    }

    const streamingUrl = await this.getOptimizedFileUrl(cid, {
      forcePublic: false,
      network: network,
      expires: 7200, // 2 jam untuk video streaming
    });

    console.log(`✅ Generated streaming URL: ${streamingUrl}`);
    return streamingUrl;
  }

  /**
   * Get optimized file URL dengan deteksi network type dan signed URL
   */
  async getOptimizedFileUrl(cid, options = {}) {
    const { forcePublic = false, expires = 3600, network = null } = options;

    console.log(`🔍 Getting optimized URL for CID: ${cid}`);

    if (!cid) {
      console.error("❌ CID is required for URL generation");
      return null;
    }

    if (forcePublic) {
      const publicUrl = `${this.PUBLIC_GATEWAY}/${cid}`;
      console.log("🌐 Using forced public gateway:", publicUrl);
      return publicUrl;
    }

    try {
      // Step 1: Cek apakah ini file private yang perlu signed URL
      if (network === "private") {
        console.log("🔐 File is private, creating signed URL...");
        try {
          const signedResult = await this.createSignedUrl(cid, { expires });
          if (signedResult.success && signedResult.signedUrl) {
            console.log("✅ Created signed URL for private file");
            return signedResult.signedUrl;
          }
        } catch (signedError) {
          console.log("❌ Failed to create signed URL:", signedError.message);
        }
      }

      // Step 2: Try dedicated gateway if available
      if (this.DEDICATED_GATEWAY) {
        const dedicatedUrl = `${this.DEDICATED_GATEWAY}/ipfs/${cid}`;
        console.log("🔓 Trying dedicated gateway:", dedicatedUrl);

        try {
          const testResponse = await fetch(dedicatedUrl, {
            method: "HEAD",
            timeout: 5000,
          });

          if (testResponse.ok) {
            console.log("✅ Dedicated gateway accessible");
            return dedicatedUrl;
          }
        } catch (testError) {
          console.log(
            "❌ Dedicated gateway not accessible:",
            testError.message
          );
        }
      }

      // Step 3: Fallback to public gateway
      const fallbackUrl = `${this.PUBLIC_GATEWAY}/${cid}`;
      console.log("🆘 Using public gateway as fallback:", fallbackUrl);
      return fallbackUrl;
    } catch (error) {
      console.error("❌ Error getting optimized URL:", error.message);
      const emergencyUrl = `${this.PUBLIC_GATEWAY}/${cid}`;
      console.log("🚨 Using emergency public gateway:", emergencyUrl);
      return emergencyUrl;
    }
  }

  /**
   * Format file size utility
   */
  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

// Export singleton instance
export const pinataService = new PinataService();
export default pinataService;
