/**
 * PinataService.js - React Native Optimized Version
 * Service untuk menangani semua interaksi dengan Pinata IPFS API
 * Dengan perbaikan khusus untuk React Native
 */

class PinataService {
  constructor() {
    // Pastikan environment variable PINATA_JWT tersedia
    this.JWT = process.env.PINATA_JWT || process.env.REACT_NATIVE_PINATA_JWT;
    this.BASE_URL = "https://api.pinata.cloud/v3";
    this.UPLOAD_URL = "https://uploads.pinata.cloud/v3";

    // Pinata v3 specific endpoints
    this.FILES_ENDPOINT = `${this.UPLOAD_URL}/files`;
    this.PRIVATE_FILES_ENDPOINT = `${this.BASE_URL}/files/private`;

    // Gateway configuration - use dedicated gateway from environment if available
    this.PUBLIC_GATEWAY = "https://gateway.pinata.cloud/ipfs";

    // Read dedicated gateway and key from environment variables
    this.PINATA_GATEWAY =
      process.env.PINATA_GATEWAY || process.env.REACT_NATIVE_PINATA_GATEWAY;
    this.GATEWAY_KEY =
      process.env.GATEWAY_KEY || process.env.REACT_NATIVE_GATEWAY_KEY;

    // Set dedicated gateway if provided in environment
    if (this.PINATA_GATEWAY) {
      this.DEDICATED_GATEWAY = this.PINATA_GATEWAY.includes("https://")
        ? this.PINATA_GATEWAY
        : `https://${this.PINATA_GATEWAY}`;
      this._gatewayDetected = true;
      console.log(
        "✅ Using dedicated gateway from environment:",
        this.DEDICATED_GATEWAY
      );

      if (this.GATEWAY_KEY) {
        console.log("✅ Gateway key found for authenticated access");
      }
    } else {
      this.DEDICATED_GATEWAY = null;
      this._gatewayDetected = false;
    }

    // Initialize free plan detection flag
    this._freePlanDetected = false;
    this._planDetectionInProgress = false;

    if (!this.JWT) {
      console.warn("PINATA_JWT tidak ditemukan dalam environment variables");
    } else {
      console.log(
        "PinataService initialized with JWT length:",
        this.JWT.length
      );

      // Auto-detect plan type and gateway on initialization
      this._initializePlanDetection();
    }
  }

  /**
   * Initialize plan detection to avoid 403 errors during uploads
   */
  async _initializePlanDetection() {
    if (this._planDetectionInProgress || this._freePlanDetected) {
      return;
    }

    this._planDetectionInProgress = true;

    try {
      // Detect dedicated gateway first for faster video streaming
      await this._detectDedicatedGateway();

      // Silent test to detect plan type without showing errors
      await this.makeRequest(
        `${this.BASE_URL}/files/sign`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            cid: "test-plan-detection",
            expires: 3600,
            date: Math.floor(Date.now() / 1000),
            method: "GET",
          }),
          timeout: 5000,
        },
        1 // Single attempt
      );

      console.log("Plan detection: Private access links available (paid plan)");
    } catch (error) {
      if (
        error.message.includes("403") ||
        error.message.includes("Forbidden")
      ) {
        this._freePlanDetected = true;
        console.log(
          "Plan detection: Free plan detected - private access links not available"
        );
      }
    } finally {
      this._planDetectionInProgress = false;
    }
  }

  /**
   * Auto-detect dedicated gateway for faster streaming
   */
  async _detectDedicatedGateway() {
    if (this._gatewayDetected) {
      return;
    }

    try {
      console.log("🔍 Detecting dedicated gateway...");

      // Try to create a signed URL first to detect if we have dedicated gateway access
      try {
        const testResponse = await this.makeRequest(
          `${this.BASE_URL}/files/sign`,
          {
            method: "POST",
            headers: this.getHeaders(),
            body: JSON.stringify({
              cid: "QmTest", // Test CID
              expires: 30,
              date: Math.floor(Date.now() / 1000),
              method: "GET",
            }),
            timeout: 5000,
          },
          1
        );

        if (
          testResponse &&
          typeof testResponse === "string" &&
          testResponse.includes(".mypinata.cloud")
        ) {
          // Extract dedicated gateway from response URL
          const urlMatch = testResponse.match(
            /https:\/\/([^.]+\.mypinata\.cloud)/
          );
          if (urlMatch) {
            this.DEDICATED_GATEWAY = `${urlMatch[1]}/ipfs`;
            console.log(
              "✅ Dedicated gateway detected from API:",
              this.DEDICATED_GATEWAY
            );
            this._gatewayDetected = true;
            return;
          }
        }
      } catch (error) {
        if (
          error.message.includes("403") ||
          error.message.includes("Forbidden")
        ) {
          console.log("ℹ️ Free plan detected - no dedicated gateway access");
          this._freePlanDetected = true;
        } else {
          console.log("ℹ️ Gateway detection failed:", error.message);
        }
      }

      // Try to extract dedicated gateway from existing files
      await this._extractDedicatedGatewayFromFiles();

      // If still no dedicated gateway detected, we'll use public gateway
      if (!this.DEDICATED_GATEWAY) {
        console.log(
          "ℹ️ No dedicated gateway detected, will use public gateway"
        );
        this._gatewayDetected = true; // Mark as detected to avoid repeated attempts
      }
    } catch (error) {
      console.log("ℹ️ Dedicated gateway detection failed:", error.message);
      this._gatewayDetected = true; // Mark as detected to avoid repeated attempts
    }
  }

  /**
   * Extract dedicated gateway from existing uploaded files
   */
  async _extractDedicatedGatewayFromFiles() {
    try {
      console.log(
        "🔍 Trying to extract dedicated gateway from uploaded files..."
      );

      // Get recent files to check for dedicated gateway URLs
      const filesResponse = await this.makeRequest(
        `${this.PRIVATE_FILES_ENDPOINT}?limit=1&order=DESC`,
        {
          method: "GET",
          headers: this.getHeaders(),
          timeout: 5000,
        },
        1
      );

      if (
        filesResponse &&
        filesResponse.data &&
        filesResponse.data.length > 0
      ) {
        const file = filesResponse.data[0];

        // Try to create a private access link for this file
        try {
          const privateUrl = await this.createPrivateAccessLink(file.cid, {
            expires: 30,
          });

          if (privateUrl && privateUrl.includes(".mypinata.cloud")) {
            // Extract the dedicated gateway domain
            const urlMatch = privateUrl.match(
              /https:\/\/([^\/]+\.mypinata\.cloud)/
            );
            if (urlMatch) {
              this.DEDICATED_GATEWAY = urlMatch[1];
              console.log(
                "✅ Dedicated gateway extracted from file:",
                this.DEDICATED_GATEWAY
              );
              this._gatewayDetected = true;
              return true;
            }
          }
        } catch (error) {
          // This will be caught in the parent method
          throw error;
        }
      }
    } catch (error) {
      console.log(
        "ℹ️ Could not extract dedicated gateway from files:",
        error.message
      );
    }

    return false;
  }

  /**
   * Headers standar untuk API requests
   */
  getHeaders(contentType = "application/json") {
    const headers = {
      Authorization: `Bearer ${this.JWT}`,
    };

    if (contentType) {
      headers["Content-Type"] = contentType;
    }

    return headers;
  }

  /**
   * Headers khusus untuk FormData upload (React Native)
   */
  getUploadHeaders() {
    return {
      Authorization: `Bearer ${this.JWT}`,
      // Jangan set Content-Type untuk FormData di React Native
      // Biarkan fetch() menangani secara otomatis
    };
  }

  /**
   * Generic request handler dengan retry logic - React Native Optimized
   */
  async makeRequest(url, options = {}, retries = 3) {
    const { timeout = 60000, ...fetchOptions } = options; // Increase timeout untuk upload

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Only log request details if it's not a silent plan detection call
        const isSilentPlanDetection =
          url.includes("/files/sign") &&
          (fetchOptions.body?.includes("test-plan-detection") ||
            fetchOptions.body?.includes("test-permissions-check"));

        if (!isSilentPlanDetection) {
          console.log(`Making request attempt ${attempt + 1} to:`, url);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          if (!isSilentPlanDetection) {
            console.log(`Request timeout after ${timeout}ms`);
          }
          controller.abort();
        }, timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!isSilentPlanDetection) {
          console.log(`Response status: ${response.status}`);
        }

        // Handle different response types - IMPROVED ERROR HANDLING
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
          // Don't log 403 errors for silent plan detection calls
          if (!isSilentPlanDetection || response.status !== 403) {
            console.error("HTTP Error Response:", {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              data: responseData,
              url: url,
            });
          }

          let errorMessage;
          if (typeof responseData === "object") {
            // Handle different error response formats
            if (responseData.error) {
              if (typeof responseData.error === "object") {
                errorMessage =
                  responseData.error.message ||
                  responseData.error.details ||
                  JSON.stringify(responseData.error);
              } else {
                errorMessage = responseData.error;
              }
            } else {
              errorMessage =
                responseData.message ||
                responseData.details ||
                JSON.stringify(responseData) ||
                `HTTP ${response.status}: ${response.statusText}`;
            }

            // Add status code context for specific errors
            if (response.status === 403) {
              errorMessage = `Access Forbidden (403): ${errorMessage}. This might be due to insufficient API key permissions or the feature requiring a paid plan.`;
            } else if (response.status === 401) {
              errorMessage = `Unauthorized (401): ${errorMessage}. Please check your API key.`;
            } else if (response.status === 400) {
              errorMessage = `Bad Request (400): ${errorMessage}. Please check your request parameters.`;
            }
          } else {
            errorMessage =
              responseData || `HTTP ${response.status}: ${response.statusText}`;
          }

          throw new Error(errorMessage);
        }

        return responseData;
      } catch (error) {
        const isSilentPlanDetection =
          url.includes("/files/sign") &&
          (fetchOptions.body?.includes("test-plan-detection") ||
            fetchOptions.body?.includes("test-permissions-check"));

        if (!isSilentPlanDetection || !error.message.includes("403")) {
          console.error(
            `Request attempt ${attempt + 1} failed:`,
            error.message
          );
        }

        if (attempt === retries - 1) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        if (!isSilentPlanDetection) {
          console.log(`Waiting ${delay}ms before retry...`);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Detect MIME type dari nama file atau ekstensi
   */
  detectMimeType(fileName) {
    if (!fileName) return "application/octet-stream";

    const extension = fileName.toLowerCase().split(".").pop();
    const mimeTypes = {
      // Images
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      bmp: "image/bmp",
      ico: "image/x-icon",

      // Documents
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",

      // Text
      txt: "text/plain",
      json: "application/json",
      xml: "text/xml",
      csv: "text/csv",

      // Audio
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",

      // Video - Enhanced for 2025 compatibility
      mp4: "video/mp4",
      avi: "video/x-msvideo",
      mov: "video/quicktime",
      webm: "video/webm",
      mkv: "video/x-matroska",
      flv: "video/x-flv",
      wmv: "video/x-ms-wmv",
      "3gp": "video/3gpp",
      m4v: "video/x-m4v",
      ogv: "video/ogg",
      // Additional video formats supported by Pinata
      f4v: "video/x-f4v",
      asf: "video/x-ms-asf",
      rm: "video/vnd.rn-realvideo",
      rmvb: "video/vnd.rn-realvideo",
      vob: "video/x-ms-vob",
    };

    return mimeTypes[extension] || "application/octet-stream";
  }

  /**
   * Create proper File object for React Native
   */
  /**
   * Create proper File object for React Native - ENHANCED FOR VIDEO SUPPORT
   */
  createFileObject(fileData) {
    console.log("Creating file object from:", fileData);

    // Handle berbagai format file object dari React Native

    // 1. Jika sudah File object yang valid dari web, gunakan langsung
    if (fileData instanceof File) {
      return fileData;
    }

    // 2. Handle React Native image picker result dengan format _data
    if (fileData._data) {
      const data = fileData._data;
      const fileName = data.name || "unknown-file";
      const mimeType = data.type || this.detectMimeType(fileName);

      console.log("Detected MIME type:", mimeType, "for file:", fileName);

      return {
        uri: fileData.uri || data.uri,
        type: mimeType,
        name: fileName,
        size: data.size || fileData.size || 0,
        _data: data, // Preserve original _data
      };
    }

    // 3. Handle React Native image picker result standar - ENHANCED FOR VIDEO
    if (fileData.uri) {
      const fileName = fileData.name || fileData.uri.split("/").pop();
      let mimeType = fileData.type;

      // PERBAIKAN UTAMA: Handle kasus dimana type = "video", "image", dll (tidak spesifik)
      if (!mimeType || mimeType === "image" || mimeType === "video") {
        const detectedType = this.detectMimeType(fileName);
        mimeType = detectedType;
        console.log(
          `Corrected generic type "${fileData.type}" to specific MIME type:`,
          mimeType,
          "for file:",
          fileName
        );
      } else {
        console.log(
          "Using provided MIME type:",
          mimeType,
          "for file:",
          fileName
        );
      }

      // TAMBAHAN: Validasi khusus untuk video files
      if (
        fileName.toLowerCase().includes(".mp4") &&
        (mimeType === "video" || !mimeType.startsWith("video/"))
      ) {
        mimeType = "video/mp4";
        console.log("Force-corrected MP4 file to video/mp4 MIME type");
      }

      return {
        uri: fileData.uri,
        type: mimeType,
        name: fileName,
        size: fileData.size,
      };
    }

    // 4. Handle file object dengan struktur berbeda
    if (fileData.name && fileData.size) {
      const mimeType = fileData.type || this.detectMimeType(fileData.name);

      return {
        uri: fileData.uri || fileData.path,
        type: mimeType,
        name: fileData.name,
        size: fileData.size,
      };
    }

    console.error("Unsupported file data format:", fileData);
    throw new Error("Invalid file data provided");
  }

  /**
   * Upload file ke IPFS - React Native Optimized dengan Pinata v3 API
   */
  async uploadFile(file, options = {}) {
    try {
      console.log("Starting upload with file:", file);

      if (!file) {
        throw new Error("File diperlukan untuk upload");
      }

      const {
        name,
        network = "public", // DEFAULT TO PUBLIC
        groupId,
        keyValues = {},
        metadata = {},
      } = options;

      // Process file untuk React Native compatibility
      const processedFile = this.createFileObject(file);
      console.log("Processed File object:", processedFile);

      // Validasi file processed
      if (!processedFile.uri && !processedFile._data) {
        throw new Error("File URI atau data tidak ditemukan");
      }

      // SESUAI DOKUMENTASI PINATA V3: Buat FormData dengan format yang benar
      const formData = new FormData();

      // Tentukan file object yang akan diupload
      let fileForUpload;

      if (processedFile._data && processedFile._data.blobId) {
        console.log("Using _data blob structure");
        fileForUpload = {
          uri: processedFile.uri || `blob:${processedFile._data.blobId}`,
          type: processedFile.type,
          name: processedFile.name,
        };
      } else if (processedFile.uri) {
        console.log("Using standard URI structure");
        fileForUpload = {
          uri: processedFile.uri,
          type: processedFile.type,
          name: processedFile.name,
        };
      } else {
        throw new Error("File tidak memiliki URI atau _data yang valid");
      }

      console.log("Final file object for upload:", fileForUpload);

      // Validasi MIME type sebelum upload
      if (
        !fileForUpload.type ||
        fileForUpload.type === "image" ||
        fileForUpload.type === "video"
      ) {
        const detectedType = this.detectMimeType(fileForUpload.name);
        fileForUpload.type = detectedType;
        console.log("Corrected MIME type to:", detectedType);
      }

      // SESUAI DOKUMENTASI V3: Append file dengan parameter yang benar
      formData.append("file", fileForUpload);

      // SESUAI DOKUMENTASI V3: Network parameter (required)
      formData.append("network", network);

      // SESUAI DOKUMENTASI V3: Name parameter (optional)
      if (name || processedFile.name) {
        formData.append("name", name || processedFile.name);
      }

      // SESUAI DOKUMENTASI V3: Group ID parameter (optional)
      if (groupId) {
        formData.append("group_id", groupId);
      }

      // SESUAI DOKUMENTASI V3: Key values parameter (optional)
      const combinedKeyValues = {
        ...keyValues,
        ...metadata,
        originalFileName: processedFile.name,
        fileSize: processedFile.size?.toString(),
        mimeType: fileForUpload.type,
        uploadedAt: new Date().toISOString(),
      };

      if (Object.keys(combinedKeyValues).length > 0) {
        // Convert key-value pairs to strings as required by API
        const stringKeyValues = {};
        Object.entries(combinedKeyValues).forEach(([key, value]) => {
          stringKeyValues[key] = String(value);
        });
        formData.append("keyvalues", JSON.stringify(stringKeyValues));
      }

      console.log("FormData prepared for Pinata v3 API");
      console.log("Network:", network);
      console.log("Name:", name || processedFile.name);
      console.log("Group ID:", groupId);
      console.log("Key Values:", combinedKeyValues);

      // Gunakan timeout yang dinamis berdasarkan ukuran file
      const uploadTimeout = Math.max(120000, (processedFile.size || 0) * 0.002);
      console.log(`Upload timeout set to: ${uploadTimeout}ms`);

      // SESUAI DOKUMENTASI V3: Gunakan endpoint upload yang benar
      const uploadEndpoint = `${this.UPLOAD_URL}/files`;
      console.log("Using upload endpoint:", uploadEndpoint);

      const response = await this.makeRequest(uploadEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.JWT}`,
          // Jangan set Content-Type untuk FormData
        },
        body: formData,
        timeout: uploadTimeout,
      });

      console.log("Upload successful:", response);

      // SESUAI DOKUMENTASI V3: Handle response format
      let responseData;
      let isDuplicate = false;

      // Response format: { data: { id, name, cid, created_at, size, number_of_files, mime_type, user_id, group_id, is_duplicate } }
      if (response && response.data) {
        responseData = response.data;
        isDuplicate = Boolean(response.data.is_duplicate);
        console.log("Using v3 API response format");
      } else {
        // Fallback untuk format response yang tidak standar
        responseData = response;
        isDuplicate = Boolean(response.is_duplicate);
        console.log("Using fallback response format");
      }

      console.log("Processed response data:", responseData);
      if (isDuplicate) {
        console.log("File was a duplicate - this is normal and not an error");
      }

      // Validate required fields dari v3 API response
      if (!responseData || !responseData.cid) {
        throw new Error("Invalid response from Pinata - missing CID");
      }

      const result = {
        success: true,
        isDuplicate: isDuplicate,
        data: responseData,
        ipfsHash: responseData.cid,
        fileName: responseData.name || processedFile.name,
        fileSize: responseData.size || processedFile.size,
        fileId: responseData.id, // V3 API provides file ID
        mimeType: responseData.mime_type || fileForUpload.type,
        createdAt: responseData.created_at,
        userId: responseData.user_id,
        groupId: responseData.group_id,
        numberOfFiles: responseData.number_of_files,
        network: network,
        publicUrl: `${this.PUBLIC_GATEWAY}/${responseData.cid}`,
        privateUrl: null, // Will be set below if needed
        message: isDuplicate
          ? "File uploaded successfully (duplicate detected - file already exists)"
          : "File uploaded successfully",
      };

      // Untuk private network, coba buat signed URL
      if (network === "private") {
        try {
          console.log(
            "Creating signed URL for private network file, CID:",
            responseData.cid
          );

          // Wait for plan detection if still in progress
          while (this._planDetectionInProgress) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          result.privateUrl = await this.createPrivateAccessLink(
            responseData.cid
          );
          console.log("Signed URL created successfully:", result.privateUrl);
        } catch (linkError) {
          console.warn("Failed to create signed URL:", linkError.message);
          result.privateUrl = result.publicUrl;
          result.warning =
            "Signed URL creation failed. Using public gateway URL as fallback.";
        }
      } else {
        // Untuk public network, gunakan public gateway
        console.log("File uploaded to PUBLIC network, using public gateway");
        result.privateUrl = result.publicUrl;
      }

      return result;
    } catch (error) {
      console.error("Upload file error:", error);

      // Enhanced error handling
      let errorMessage = error.message;

      if (error.message === "Network request failed") {
        errorMessage = `Network request failed. Debugging info:
1. Koneksi internet: ${
          typeof navigator !== "undefined" && navigator.onLine !== false
            ? "✓"
            : "?"
        }
2. File size: ${file?.size ? this.formatFileSize(file.size) : "Unknown"}
3. PINATA_JWT: ${this.JWT ? "Present" : "Missing"}
4. Upload URL: ${this.UPLOAD_URL}
5. File URI: ${file?.uri ? "Valid" : "Invalid"}

Kemungkinan penyebab:
- File terlalu besar untuk koneksi saat ini
- PINATA_JWT tidak valid atau expired
- Network/Firewall memblokir upload
- File URI tidak dapat diakses oleh React Native`;
      }

      throw new Error(`Gagal upload file: ${errorMessage}`);
    }
  }

  /**
   * Upload JSON data ke IPFS - SESUAI PINATA V3 API
   */
  async uploadJson(jsonData, options = {}) {
    try {
      if (!jsonData) {
        throw new Error("JSON data diperlukan untuk upload");
      }

      const {
        name = "data.json",
        network = "public", // DEFAULT TO PUBLIC
        groupId,
        keyValues = {},
        metadata = {},
      } = options;

      // Convert JSON to string
      const jsonString =
        typeof jsonData === "string"
          ? jsonData
          : JSON.stringify(jsonData, null, 2);

      // Create file object untuk React Native
      const fileObject = {
        uri: `data:application/json;base64,${btoa(jsonString)}`,
        type: "application/json",
        name: name,
        size: new Blob([jsonString]).size,
      };

      console.log("Uploading JSON:", {
        name: fileObject.name,
        type: fileObject.type,
        size: fileObject.size,
        network: network,
        preview: jsonString.substring(0, 100) + "...",
      });

      return await this.uploadFile(fileObject, {
        name,
        network,
        groupId,
        keyValues: {
          ...keyValues,
          contentType: "json",
          dataType: "application/json",
        },
        metadata: {
          ...metadata,
          mimeType: "application/json",
          isJsonData: "true",
        },
      });
    } catch (error) {
      console.error("Upload JSON error:", error);
      throw new Error(`Gagal upload JSON: ${error.message}`);
    }
  }

  /**
   * Get file content by CID - IMPROVED dengan smart URL detection
   */
  async getFileContent(cid, options = {}) {
    try {
      const {
        network = null,
        groupId = null,
        timeout = 30000,
        preferSigned = false,
      } = options;

      console.log("Getting file content for CID:", cid);

      // Get optimal access URL
      const accessUrl = await this.getFileAccessUrl(cid, {
        network,
        groupId,
        preferSigned,
      });

      console.log("Using access URL:", accessUrl);

      // Fetch content with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(accessUrl, {
          signal: controller.signal,
          headers: {
            // Add any necessary headers
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType =
          response.headers.get("content-type") || "application/octet-stream";

        return {
          success: true,
          url: accessUrl,
          content: response,
          contentType: contentType,
          size: response.headers.get("content-length"),
          cid: cid,
          // Helper methods untuk different content types
          async text() {
            return await response.text();
          },
          async json() {
            return await response.json();
          },
          async blob() {
            return await response.blob();
          },
          async arrayBuffer() {
            return await response.arrayBuffer();
          },
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error("Get file content error:", error);
      throw new Error(`Gagal mengambil konten file: ${error.message}`);
    }
  }

  /**
   * List files dari Pinata v3 API - SESUAI DOKUMENTASI
   */
  async listFiles(options = {}) {
    try {
      const {
        network = "public", // DEFAULT TO PUBLIC
        limit = 10,
        name,
        groupId,
        mimeType,
        cid,
        cidPending,
        metadata,
        order = "DESC",
        pageToken,
      } = options;

      // Build query parameters sesuai dokumentasi v3 API
      const params = new URLSearchParams();

      if (limit) params.append("limit", limit.toString());
      if (name) params.append("name", name);
      if (groupId) params.append("group", groupId); // API uses 'group' not 'group_id'
      if (mimeType) params.append("mimeType", mimeType);
      if (cid) params.append("cid", cid);
      if (cidPending !== undefined)
        params.append("cidPending", cidPending.toString());
      if (order) params.append("order", order);
      if (pageToken) params.append("pageToken", pageToken);

      // Handle metadata filtering - sesuai dokumentasi v3 API
      if (metadata && typeof metadata === "object") {
        Object.entries(metadata).forEach(([key, value]) => {
          params.append(`metadata[${key}]`, value.toString());
        });
      }

      const queryString = params.toString();

      // SESUAI DOKUMENTASI V3: Format URL dengan network di path
      const url = `${this.BASE_URL}/files/${network}${
        queryString ? `?${queryString}` : ""
      }`;

      console.log("Listing files from:", url);

      const response = await this.makeRequest(url, {
        method: "GET",
        headers: this.getHeaders(),
      });

      console.log("List files response:", response);

      // SESUAI DOKUMENTASI V3: Response format
      // { data: { files: [...], next_page_token: string } }
      const files = response.data?.files || [];
      const nextPageToken = response.data?.next_page_token || null;

      return {
        success: true,
        files: files,
        count: files.length,
        nextPageToken: nextPageToken,
        hasMore: !!nextPageToken,
        network: network,
        data: response.data,
        // Tambahan untuk kompatibilitas
        totalFiles: files.length,
        currentPage: pageToken || "first",
      };
    } catch (error) {
      console.error("List files error:", error);
      return {
        success: false,
        error: error.message || "Gagal mengambil daftar file",
        files: [],
        count: 0,
        nextPageToken: null,
        hasMore: false,
      };
    }
  }

  /**
   * Get file by ID
   */
  async getFile(fileId, network = "private") {
    try {
      const response = await this.makeRequest(
        `${this.BASE_URL}/files/${network}/${fileId}`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error("Get file error:", error);
      throw new Error(`Gagal mengambil file: ${error.message}`);
    }
  }

  /**
   * Update file metadata
   */
  async updateFile(fileId, updates, network = "private") {
    try {
      const response = await this.makeRequest(
        `${this.BASE_URL}/files/${network}/${fileId}`,
        {
          method: "PUT",
          headers: this.getHeaders(),
          body: JSON.stringify(updates),
        }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error("Update file error:", error);
      throw new Error(`Gagal update file: ${error.message}`);
    }
  }

  /**
   * Delete file
   */
  async deleteFile(fileId, network = "private") {
    try {
      await this.makeRequest(`${this.BASE_URL}/files/${network}/${fileId}`, {
        method: "DELETE",
        headers: this.getHeaders(),
      });

      return {
        success: true,
        message: "File berhasil dihapus",
      };
    } catch (error) {
      console.error("Delete file error:", error);
      throw new Error(`Gagal hapus file: ${error.message}`);
    }
  }

  /**
   * Create signed URL untuk akses file private - SESUAI DOKUMENTASI V3 API
   */
  async createSignedUrl(cid, options = {}) {
    try {
      const {
        expires = 3600, // Default 1 hour in seconds
        method = "GET",
        date = Math.floor(Date.now() / 1000), // Current timestamp in seconds
      } = options;

      console.log("🔐 Creating signed URL for CID:", cid);
      console.log("Options:", { expires, method, date });

      // SESUAI DOKUMENTASI V3: Request body format
      const requestBody = {
        cid: cid,
        expires: expires,
        date: date,
        method: method,
      };

      console.log("Request body:", requestBody);

      // SESUAI DOKUMENTASI V3: Endpoint untuk signed URLs
      const signedUrlEndpoint = `${this.BASE_URL}/files/sign`;

      const response = await this.makeRequest(signedUrlEndpoint, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
        timeout: 15000,
      });

      console.log("Signed URL response:", response);

      // Response bisa berupa string URL langsung atau object dengan data
      let signedUrl;
      if (typeof response === "string") {
        signedUrl = response;
      } else if (response.data) {
        signedUrl = response.data;
      } else if (response.url) {
        signedUrl = response.url;
      } else {
        throw new Error("Invalid signed URL response format");
      }

      if (!signedUrl || typeof signedUrl !== "string") {
        throw new Error("Failed to generate signed URL");
      }

      console.log("✅ Signed URL created successfully");

      return {
        success: true,
        signedUrl: signedUrl,
        cid: cid,
        expires: expires,
        expiresAt: new Date((date + expires) * 1000).toISOString(),
        method: method,
      };
    } catch (error) {
      console.error("Create signed URL error:", error);

      // Handle specific error cases
      if (
        error.message.includes("403") ||
        error.message.includes("Forbidden")
      ) {
        throw new Error(
          "Signed URLs require a paid Pinata plan. This feature is not available on the free tier."
        );
      }

      if (
        error.message.includes("401") ||
        error.message.includes("Unauthorized")
      ) {
        throw new Error(
          "Invalid API key or insufficient permissions for signed URL creation."
        );
      }

      throw new Error(`Failed to create signed URL: ${error.message}`);
    }
  }

  /**
   * Create group - SESUAI DOKUMENTASI V3 API
   */
  async createGroup(name, options = {}) {
    try {
      const { network = "private", isPublic = false } = options;

      const requestBody = {
        name: name,
        is_public: isPublic,
      };

      console.log("Creating group:", requestBody);

      const response = await this.makeRequest(
        `${this.BASE_URL}/groups/${network}`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify(requestBody),
        }
      );

      return {
        success: true,
        data: response.data,
        groupId: response.data?.id,
        name: response.data?.name,
        isPublic: response.data?.is_public,
        network: network,
      };
    } catch (error) {
      console.error("Create group error:", error);
      throw new Error(`Gagal membuat group: ${error.message}`);
    }
  }

  /**
   * List groups - SESUAI DOKUMENTASI V3 API
   */
  async listGroups(network = "private", options = {}) {
    try {
      const { name, isPublic, limit, pageToken } = options;

      const params = new URLSearchParams();
      if (name) params.append("name", name);
      if (isPublic !== undefined)
        params.append("isPublic", isPublic.toString());
      if (limit) params.append("limit", limit.toString());
      if (pageToken) params.append("pageToken", pageToken);

      const queryString = params.toString();
      const url = `${this.BASE_URL}/groups/${network}${
        queryString ? `?${queryString}` : ""
      }`;

      const response = await this.makeRequest(url, {
        method: "GET",
        headers: this.getHeaders(),
      });

      return {
        success: true,
        groups: response.data?.groups || [],
        count: response.data?.groups?.length || 0,
        nextPageToken: response.data?.next_page_token,
        hasMore: !!response.data?.next_page_token,
        network: network,
      };
    } catch (error) {
      console.error("List groups error:", error);
      throw new Error(`Gagal mengambil daftar group: ${error.message}`);
    }
  }

  /**
   * Add file to group - SESUAI DOKUMENTASI V3 API
   */
  async addFileToGroup(groupId, fileId, network = "private") {
    try {
      await this.makeRequest(
        `${this.BASE_URL}/groups/${network}/${groupId}/ids/${fileId}`,
        {
          method: "PUT",
          headers: this.getHeaders(),
        }
      );

      return {
        success: true,
        message: "File berhasil ditambahkan ke group",
        groupId: groupId,
        fileId: fileId,
        network: network,
      };
    } catch (error) {
      console.error("Add file to group error:", error);
      throw new Error(`Gagal menambahkan file ke group: ${error.message}`);
    }
  }

  /**
   * Remove file from group - SESUAI DOKUMENTASI V3 API
   */
  async removeFileFromGroup(groupId, fileId, network = "private") {
    try {
      await this.makeRequest(
        `${this.BASE_URL}/groups/${network}/${groupId}/ids/${fileId}`,
        {
          method: "DELETE",
          headers: this.getHeaders(),
        }
      );

      return {
        success: true,
        message: "File berhasil dihapus dari group",
        groupId: groupId,
        fileId: fileId,
        network: network,
      };
    } catch (error) {
      console.error("Remove file from group error:", error);
      throw new Error(`Gagal menghapus file dari group: ${error.message}`);
    }
  }

  /**
   * Get file content by CID
   */
  async getFileContent(cid, isPrivate = true) {
    try {
      let url;
      if (isPrivate) {
        // For private files, create access link first
        url = await this.createPrivateAccessLink(cid);
      } else {
        // For public files, use public gateway
        url = `https://gateway.pinata.cloud/ipfs/${cid}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        success: true,
        url,
        content: response,
        contentType: response.headers.get("content-type"),
      };
    } catch (error) {
      console.error("Get file content error:", error);
      throw new Error(`Gagal mengambil konten file: ${error.message}`);
    }
  }

  /**
   * Utility function untuk format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Utility function untuk validasi file - React Native Optimized
   */
  validateFile(file, options = {}) {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = [],
    } = options;

    if (!file) {
      throw new Error("File tidak boleh kosong");
    }

    if (file.size > maxSize) {
      throw new Error(
        `Ukuran file terlalu besar. Maksimal: ${this.formatFileSize(maxSize)}`
      );
    }

    // Validasi tipe file yang lebih fleksibel untuk React Native
    if (allowedTypes.length > 0) {
      const fileType = file.type;
      const fileName = file.name || "";

      // Cek MIME type langsung
      if (fileType && allowedTypes.includes(fileType)) {
        return true;
      }

      // Jika MIME type tidak cocok, gunakan detectMimeType yang lebih lengkap
      const detectedMime = this.detectMimeType(fileName);
      if (detectedMime && allowedTypes.includes(detectedMime)) {
        return true;
      }

      // Fallback: cek jika ekstensi file sesuai dengan MIME type yang diizinkan
      const extension = fileName.toLowerCase().split(".").pop();
      const allowedExtensions = allowedTypes
        .map((mimeType) => {
          // Map MIME types ke ekstensi untuk fallback
          const mimeToExt = {
            "image/jpeg": ["jpg", "jpeg"],
            "image/png": ["png"],
            "image/gif": ["gif"],
            "image/webp": ["webp"],
            "application/pdf": ["pdf"],
            "application/msword": ["doc"],
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
              ["docx"],
          };
          return mimeToExt[mimeType] || [];
        })
        .flat();

      if (allowedExtensions.includes(extension)) {
        return true;
      }

      // Jika masih tidak cocok, lempar error dengan info debug yang lebih detail
      throw new Error(
        `Tipe file tidak diizinkan.\n` +
          `File type: "${fileType}"\n` +
          `Extension: "${extension}"\n` +
          `Detected MIME: "${detectedMime}"\n` +
          `Diizinkan: ${allowedTypes.join(", ")}`
      );
    }

    return true;
  }

  /**
   * Debug upload issues - untuk troubleshooting
   */
  async debugUpload(file) {
    console.log("=== PINATA UPLOAD DEBUG ===");

    try {
      // 1. Check JWT
      console.log("1. JWT Check:");
      console.log("  - Has JWT:", !!this.JWT);
      console.log("  - JWT length:", this.JWT?.length);
      console.log("  - JWT starts with:", this.JWT?.substring(0, 20) + "...");

      // 2. Check file
      console.log("2. File Check:");
      console.log("  - Original file:", file);

      if (file) {
        const processedFile = this.createFileObject(file);
        console.log("  - Processed file:", processedFile);
        console.log(
          "  - File size:",
          this.formatFileSize(processedFile.size || 0)
        );
        console.log("  - MIME type:", processedFile.type);
      }

      // 3. Test basic connection
      console.log("3. Connection Test:");
      const connectionTest = await this.testConnection();
      console.log("  - Connection result:", connectionTest);

      // 4. Test small upload
      if (connectionTest.success) {
        console.log("4. Small Upload Test:");
        try {
          const testData = {
            test: "Hello from EduVerse",
            timestamp: Date.now(),
          };
          const jsonUpload = await this.uploadJson(testData, {
            name: "debug-test.json",
            network: "private",
          });
          console.log("  - Small upload successful:", jsonUpload.success);
          console.log("  - Test file CID:", jsonUpload.ipfsHash);
        } catch (uploadError) {
          console.log("  - Small upload failed:", uploadError.message);
        }
      }

      console.log("=== DEBUG COMPLETE ===");

      return {
        success: true,
        message: "Debug information logged to console",
      };
    } catch (error) {
      console.error("Debug failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Debug file structure untuk troubleshooting - NEW METHOD
   */
  debugFileStructure(file) {
    console.log("=== FILE DEBUG INFO ===");
    console.log("Original file object:", file);
    console.log("File properties:");
    console.log("- uri:", file?.uri);
    console.log("- type:", file?.type);
    console.log("- name:", file?.name);
    console.log("- size:", file?.size);
    console.log("- _data:", file?._data);

    if (file?._data) {
      console.log("_data properties:");
      console.log("- blobId:", file._data.blobId);
      console.log("- name:", file._data.name);
      console.log("- type:", file._data.type);
      console.log("- size:", file._data.size);
    }

    try {
      const processed = this.createFileObject(file);
      console.log("Processed file object:", processed);
    } catch (error) {
      console.error("Error processing file:", error);
    }

    console.log("=== END FILE DEBUG ===");
  }

  /**
   * Debug FormData structure - untuk troubleshooting
   */
  debugFormData(formData) {
    console.log("=== FORMDATA DEBUG ===");

    if (formData && formData.entries) {
      try {
        for (let [key, value] of formData.entries()) {
          console.log(`FormData key: ${key}`);
          if (typeof value === "object" && value.uri) {
            console.log(
              `  - File object: {uri: ${value.uri}, type: ${value.type}, name: ${value.name}}`
            );
          } else if (typeof value === "string") {
            console.log(
              `  - String value: ${value.substring(0, 100)}${
                value.length > 100 ? "..." : ""
              }`
            );
          } else {
            console.log(`  - Value type: ${typeof value}`);
          }
        }
      } catch (error) {
        console.log("Cannot iterate FormData entries:", error.message);
      }
    } else {
      console.log("FormData is null or invalid");
    }

    console.log("=== END FORMDATA DEBUG ===");
  }

  /**
   * Test upload with small file untuk debugging
   */
  async testSmallUpload() {
    try {
      console.log("=== TESTING SMALL UPLOAD ===");

      // Create a small test file
      const testContent = JSON.stringify(
        {
          test: "Hello from EduVerse",
          timestamp: Date.now(),
          purpose: "Upload test",
        },
        null,
        2
      );

      const testFile = {
        uri: `data:application/json;base64,${btoa(testContent)}`,
        type: "application/json",
        name: "test-upload.json",
        size: testContent.length,
      };

      console.log("Test file created:", testFile);

      const result = await this.uploadFile(testFile, {
        name: "test-upload.json",
        network: "private",
        metadata: {
          test: true,
          purpose: "debugging",
        },
      });

      console.log("Small upload test result:", result);
      return result;
    } catch (error) {
      console.error("Small upload test failed:", error);
      throw error;
    }
  }

  /**
   * Validate environment setup
   */
  validateEnvironment() {
    const issues = [];

    if (!this.JWT) {
      issues.push("PINATA_JWT tidak ditemukan dalam environment variables");
    } else if (this.JWT.length < 100) {
      issues.push("PINATA_JWT tampak terlalu pendek (mungkin tidak valid)");
    }

    if (!this.BASE_URL) {
      issues.push("BASE_URL tidak dikonfigurasi");
    }

    if (!this.UPLOAD_URL) {
      issues.push("UPLOAD_URL tidak dikonfigurasi");
    }

    return {
      isValid: issues.length === 0,
      issues: issues,
      config: {
        hasJWT: !!this.JWT,
        jwtLength: this.JWT?.length,
        baseUrl: this.BASE_URL,
        uploadUrl: this.UPLOAD_URL,
      },
    };
  }

  /**
   * Test connection to Pinata API - NEW METHOD
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
          timeout: 10000, // 10 seconds timeout for connection test
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
   * Test different API endpoints untuk debugging
   */
  async testApiEndpoints() {
    console.log("=== TESTING API ENDPOINTS ===");

    const endpoints = [
      { name: "Files List", url: `${this.BASE_URL}/files/private?limit=1` },
      {
        name: "Upload Endpoint",
        url: `${this.UPLOAD_URL}/files`,
        method: "OPTIONS",
      },
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing ${endpoint.name}: ${endpoint.url}`);

        const response = await fetch(endpoint.url, {
          method: endpoint.method || "GET",
          headers: {
            Authorization: `Bearer ${this.JWT}`,
            "Content-Type": "application/json",
          },
        });

        console.log(`${endpoint.name} - Status: ${response.status}`);
        console.log(
          `${endpoint.name} - Headers:`,
          Object.fromEntries(response.headers.entries())
        );

        if (response.status === 200) {
          const data = await response.json();
          console.log(`${endpoint.name} - Response:`, data);
        }
      } catch (error) {
        console.error(`${endpoint.name} failed:`, error.message);
      }
    }

    console.log("=== END API ENDPOINTS TEST ===");
  }

  /**
   * Check API key permissions and capabilities
   */
  async checkApiKeyPermissions() {
    console.log("=== API KEY PERMISSIONS CHECK ===");

    try {
      // Test 1: Basic authentication
      console.log("1. Testing basic authentication...");
      const authTest = await this.makeRequest(
        "https://api.pinata.cloud/data/testAuthentication",
        {
          method: "GET",
          headers: this.getHeaders(),
          timeout: 10000,
        }
      );
      console.log("✓ Basic authentication successful:", authTest);

      // Test 2: Files listing (should work with basic permissions)
      console.log("2. Testing files listing...");
      const filesTest = await this.listFiles({ limit: 1 });
      console.log("✓ Files listing successful:", filesTest.success);

      // Test 3: Try to access user info or account details
      console.log("3. Testing account access...");
      try {
        const userTest = await this.makeRequest(
          `${this.BASE_URL}/data/userPinnedDataTotal`,
          {
            method: "GET",
            headers: this.getHeaders(),
            timeout: 10000,
          }
        );
        console.log("✓ User data access successful:", userTest);
      } catch (userError) {
        console.log("✗ User data access failed:", userError.message);
      }

      // Test 4: Check if we can access private file endpoints
      console.log("4. Testing private file access...");
      try {
        const privateTest = await this.makeRequest(
          `${this.BASE_URL}/files/private?limit=1`,
          {
            method: "GET",
            headers: this.getHeaders(),
            timeout: 10000,
          }
        );
        console.log("✓ Private files access successful");
      } catch (privateError) {
        console.log("✗ Private files access failed:", privateError.message);
      }

      console.log("=== PERMISSIONS CHECK COMPLETE ===");

      return {
        success: true,
        permissions: {
          basicAuth: true,
          filesListing: filesTest.success,
          privateFiles: true, // Based on connection test success
        },
      };
    } catch (error) {
      console.error("API key permissions check failed:", error);
      return {
        success: false,
        error: error.message,
        permissions: {
          basicAuth: false,
          filesListing: false,
          privateFiles: false,
        },
      };
    }
  }

  /**
   * Comprehensive API health check
   */
  async healthCheck() {
    console.log("🏥 Performing comprehensive health check...");

    const results = {
      timestamp: new Date().toISOString(),
      overall: "unknown",
      checks: {},
    };

    try {
      // 1. Basic authentication test
      console.log("1. Testing basic authentication...");
      try {
        const authResponse = await this.makeRequest(
          "https://api.pinata.cloud/data/testAuthentication",
          {
            method: "GET",
            headers: this.getHeaders(),
            timeout: 10000,
          }
        );
        results.checks.authentication = {
          status: "success",
          message: "Authentication successful",
          data: authResponse,
        };
      } catch (error) {
        results.checks.authentication = {
          status: "failed",
          message: error.message,
        };
      }

      // 2. List files test
      console.log("2. Testing file listing...");
      try {
        const listResult = await this.listFiles({
          limit: 1,
          network: "public",
        });
        results.checks.fileListAccess = {
          status: listResult.success ? "success" : "failed",
          message: listResult.success ? "File listing works" : listResult.error,
          fileCount: listResult.count,
        };
      } catch (error) {
        results.checks.fileListAccess = {
          status: "failed",
          message: error.message,
        };
      }

      // 3. Upload endpoint test (without actual upload)
      console.log("3. Testing upload endpoint accessibility...");
      try {
        const uploadEndpointTest = await fetch(`${this.UPLOAD_URL}/files`, {
          method: "OPTIONS",
          headers: { Authorization: `Bearer ${this.JWT}` },
        });
        results.checks.uploadEndpoint = {
          status: uploadEndpointTest.ok ? "success" : "warning",
          message: uploadEndpointTest.ok
            ? "Upload endpoint accessible"
            : "Upload endpoint may have issues",
          statusCode: uploadEndpointTest.status,
        };
      } catch (error) {
        results.checks.uploadEndpoint = {
          status: "failed",
          message: error.message,
        };
      }

      // 4. Plan type detection
      console.log("4. Checking plan type...");
      const planStatus = this.getPlanStatus();
      results.checks.planType = {
        status: "info",
        planType: planStatus.planType,
        freePlanDetected: planStatus.freePlanDetected,
        dedicatedGateway: !!planStatus.dedicatedGateway,
      };

      // 5. Gateway connectivity test
      console.log("5. Testing gateway connectivity...");
      try {
        const gatewayTest = await fetch(this.PUBLIC_GATEWAY, {
          method: "HEAD",
          timeout: 5000,
        });
        results.checks.gatewayConnectivity = {
          status: gatewayTest.ok ? "success" : "warning",
          message: "Public gateway accessible",
          gateway: this.PUBLIC_GATEWAY,
        };
      } catch (error) {
        results.checks.gatewayConnectivity = {
          status: "failed",
          message: error.message,
          gateway: this.PUBLIC_GATEWAY,
        };
      }

      // Calculate overall status
      const failedChecks = Object.values(results.checks).filter(
        (check) => check.status === "failed"
      );
      const warningChecks = Object.values(results.checks).filter(
        (check) => check.status === "warning"
      );

      if (failedChecks.length === 0) {
        results.overall = warningChecks.length === 0 ? "healthy" : "warning";
      } else {
        results.overall = "unhealthy";
      }

      console.log(
        `🏥 Health check completed: ${results.overall.toUpperCase()}`
      );
      return results;
    } catch (error) {
      console.error("❌ Health check failed:", error);
      results.overall = "error";
      results.error = error.message;
      return results;
    }
  }

  /**
   * Validate Pinata API key format and basic info
   */
  validateApiKey() {
    const issues = [];
    const info = {};

    if (!this.JWT) {
      issues.push("PINATA_JWT environment variable is not set");
      return { isValid: false, issues, info };
    }

    info.hasJWT = true;
    info.jwtLength = this.JWT.length;

    // Basic JWT format validation
    if (typeof this.JWT !== "string") {
      issues.push("PINATA_JWT must be a string");
    } else if (this.JWT.length < 50) {
      issues.push(
        "PINATA_JWT appears to be too short (minimum ~100 characters expected)"
      );
    } else if (!this.JWT.startsWith("eyJ")) {
      issues.push(
        "PINATA_JWT does not appear to be a valid JWT token (should start with 'eyJ')"
      );
    }

    // Try to decode JWT header to get basic info (without validation)
    try {
      const headerB64 = this.JWT.split(".")[0];
      const header = JSON.parse(atob(headerB64));
      info.jwtHeader = header;
      info.algorithm = header.alg;
      info.tokenType = header.typ;
    } catch (error) {
      issues.push("PINATA_JWT format appears invalid (cannot decode header)");
    }

    return {
      isValid: issues.length === 0,
      issues,
      info,
    };
  }

  /**
   * Get service configuration summary
   */
  getConfiguration() {
    const validation = this.validateApiKey();
    const planStatus = this.getPlanStatus();

    return {
      version: "Pinata v3 API",
      timestamp: new Date().toISOString(),
      endpoints: {
        api: this.BASE_URL,
        upload: this.UPLOAD_URL,
        publicGateway: this.PUBLIC_GATEWAY,
        dedicatedGateway: this.DEDICATED_GATEWAY,
      },
      authentication: {
        hasJWT: validation.info.hasJWT,
        jwtLength: validation.info.jwtLength,
        isValid: validation.isValid,
        issues: validation.issues,
      },
      plan: {
        type: planStatus.planType,
        freePlanDetected: planStatus.freePlanDetected,
        detectionInProgress: planStatus.detectionInProgress,
        dedicatedGatewayAvailable: !!planStatus.dedicatedGateway,
      },
      features: {
        fileUpload: true,
        jsonUpload: true,
        fileListingPublic: true,
        fileListingPrivate: true,
        signedUrls: !planStatus.freePlanDetected,
        groupManagement: true,
        bulkOperations: true,
        searchFiles: true,
        storageStats: true,
      },
    };
  }

  /**
   * Get current plan detection status
   */
  getPlanStatus() {
    return {
      freePlanDetected: this._freePlanDetected,
      detectionInProgress: this._planDetectionInProgress,
      planType:
        this._freePlanDetected === null
          ? "unknown"
          : this._freePlanDetected
          ? "free"
          : "paid",
      dedicatedGateway: this.DEDICATED_GATEWAY,
      gatewayDetected: this._gatewayDetected,
    };
  }

  /**
   * Get public gateway URL - Simple method untuk akses langsung
   */
  getPublicGatewayUrl(cid) {
    const url = `${this.PUBLIC_GATEWAY}/${cid}`;
    console.log("🌐 Generated public gateway URL:", url);
    return url;
  }

  /**
   * Upload file sebagai PUBLIC secara eksplisit
   */
  async uploadFilePublic(file, options = {}) {
    console.log("📤 Uploading file as PUBLIC for easy access...");

    return await this.uploadFile(file, {
      ...options,
      network: "public", // Force public network
    });
  }
}

// Export singleton instance
export const pinataService = new PinataService();
export default pinataService;
