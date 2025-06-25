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

      // Auto-detect plan type on initialization to avoid 403 errors later
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
   * Create proper File object for React Native - FIXED
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

    // 3. Handle React Native image picker result standar - IMPROVED
    if (fileData.uri) {
      const fileName = fileData.name || fileData.uri.split("/").pop();
      let mimeType = fileData.type;

      // PERBAIKAN: Handle kasus dimana type = "image" (tidak spesifik)
      if (!mimeType || mimeType === "image") {
        mimeType = this.detectMimeType(fileName);
        console.log(
          "Detected MIME type from filename:",
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
   * Upload file ke IPFS - React Native Optimized - MAJOR FIX
   */
  async uploadFile(file, options = {}) {
    try {
      console.log("Starting upload with file:", file);

      if (!file) {
        throw new Error("File diperlukan untuk upload");
      }

      const {
        name,
        network = "private",
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

      // PERBAIKAN UTAMA: Buat FormData dengan struktur yang benar sesuai Pinata API
      const formData = new FormData();

      // Tentukan file object yang akan diupload - FIXED untuk React Native
      let fileForUpload;

      if (processedFile._data && processedFile._data.blobId) {
        // Untuk file dengan _data structure (React Native Blob)
        console.log("Using _data blob structure");
        fileForUpload = {
          uri: processedFile.uri || `blob:${processedFile._data.blobId}`,
          type: processedFile.type,
          name: processedFile.name,
        };
      } else if (processedFile.uri) {
        // Untuk file dengan URI standar - IMPROVED
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

      // PERBAIKAN: Validasi MIME type sebelum upload
      if (!fileForUpload.type || fileForUpload.type === "image") {
        const detectedType = this.detectMimeType(fileForUpload.name);
        fileForUpload.type = detectedType;
        console.log("Corrected MIME type to:", detectedType);
      }

      // PERBAIKAN KRITIS: Format FormData sesuai dengan Pinata v3 API
      // Append file ke FormData dengan format yang benar
      formData.append("file", fileForUpload);

      // Append required fields sesuai dokumentasi Pinata
      const pinataOptions = {
        cidVersion: 1,
      };

      const pinataMetadata = {
        name: name || processedFile.name,
        keyvalues: {
          ...keyValues,
          ...metadata,
          originalFileName: processedFile.name,
          fileSize: processedFile.size.toString(),
          mimeType: fileForUpload.type,
          uploadedAt: new Date().toISOString(),
        },
      };

      // Append Pinata specific fields
      formData.append("pinataOptions", JSON.stringify(pinataOptions));
      formData.append("pinataMetadata", JSON.stringify(pinataMetadata));

      // Network parameter untuk Pinata v3
      if (network === "private") {
        formData.append(
          "pinataOptions",
          JSON.stringify({
            ...pinataOptions,
            customPinPolicy: {
              regions: [
                {
                  id: "FRA1",
                  desiredReplicationCount: 1,
                },
              ],
            },
          })
        );
      }

      console.log("FormData prepared for Pinata v3 API");
      console.log("Pinata Options:", pinataOptions);
      console.log("Pinata Metadata:", pinataMetadata);

      console.log("Sending upload request to Pinata v3 API...");

      // Gunakan timeout yang dinamis berdasarkan ukuran file
      const uploadTimeout = Math.max(120000, (processedFile.size || 0) * 0.002); // 120s minimum atau 2ms per byte
      console.log(`Upload timeout set to: ${uploadTimeout}ms`);

      // PERBAIKAN: Gunakan endpoint yang benar untuk Pinata v3
      const uploadEndpoint = `https://uploads.pinata.cloud/v3/files`;
      console.log("Upload endpoint:", uploadEndpoint);

      const response = await this.makeRequest(uploadEndpoint, {
        method: "POST",
        headers: {
          // PERBAIKAN: Hanya Authorization header untuk FormData
          Authorization: `Bearer ${this.JWT}`,
          // Jangan set Content-Type untuk FormData - biarkan browser/RN yang handle
        },
        body: formData,
        timeout: uploadTimeout,
      });

      console.log("Upload successful:", response);

      // Handle different response formats from Pinata v3 API - IMPROVED DUPLICATE HANDLING
      let responseData;
      let isDuplicate = false;

      // Check for duplicate file response
      if (response && (response.is_duplicate || response.isDuplicate)) {
        isDuplicate = true;
        console.log("Duplicate file detected - file already exists on IPFS");
      }

      // Pinata v3 API structure
      if (response && response.data) {
        responseData = response.data;
        isDuplicate = isDuplicate || response.data.is_duplicate;
      } else if (response && response.IpfsHash) {
        // Legacy v2 format fallback
        responseData = {
          cid: response.IpfsHash,
          name: response.PinSize ? `${response.PinSize}` : processedFile.name,
          size: response.PinSize || processedFile.size,
        };
      } else {
        // Direct response
        responseData = response;
        isDuplicate = isDuplicate || response.is_duplicate;
      }

      console.log("Processed response data:", responseData);
      if (isDuplicate) {
        console.log("File was a duplicate - this is normal and not an error");
      }

      // Validate required fields
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
        publicUrl: `https://gateway.pinata.cloud/ipfs/${responseData.cid}`,
        privateUrl: null, // Will be set below if needed
        message: isDuplicate
          ? "File uploaded successfully (duplicate detected - file already exists)"
          : "File uploaded successfully",
      };

      // Create private access link if network is private - IMPROVED HANDLING
      if (network === "private") {
        try {
          console.log(
            "Creating private access link for CID:",
            responseData.cid
          );

          // Wait for plan detection if still in progress
          while (this._planDetectionInProgress) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          result.privateUrl = await this.createPrivateAccessLink(
            responseData.cid
          );
          console.log(
            "Private access link created successfully:",
            result.privateUrl
          );
        } catch (linkError) {
          console.warn(
            "Failed to create private access link:",
            linkError.message
          );
          // IMPROVED: Set a fallback URL instead of null
          result.privateUrl = `https://gateway.pinata.cloud/ipfs/${responseData.cid}`;
          console.warn(
            "Using fallback gateway URL for private file:",
            result.privateUrl
          );

          // Add warning message to result
          result.warning =
            "Private access link creation failed. Using public gateway URL as fallback.";
        }
      }

      return result;
    } catch (error) {
      console.error("Upload file error:", error);

      // Enhanced error handling dengan informasi lebih detail
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
   * Upload JSON data ke IPFS - React Native Optimized
   */
  async uploadJson(jsonData, options = {}) {
    try {
      if (!jsonData) {
        throw new Error("JSON data diperlukan untuk upload");
      }

      const {
        name = "data.json",
        network = "private",
        groupId,
        keyValues = {},
        metadata = {},
      } = options;

      // Convert JSON to proper format untuk React Native
      const jsonString =
        typeof jsonData === "string"
          ? jsonData
          : JSON.stringify(jsonData, null, 2);

      // Create file object compatible dengan React Native
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
        preview: jsonString.substring(0, 100) + "...",
      });

      return await this.uploadFile(fileObject, {
        name,
        network,
        groupId,
        keyValues: { ...keyValues, type: "json" },
        metadata: { ...metadata, contentType: "application/json" },
      });
    } catch (error) {
      console.error("Upload JSON error:", error);
      throw new Error(`Gagal upload JSON: ${error.message}`);
    }
  }

  /**
   * List files dari Pinata
   */
  async listFiles(options = {}) {
    try {
      const {
        network = "private",
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

      // Build query parameters
      const params = new URLSearchParams();
      if (limit) params.append("limit", limit.toString());
      if (name) params.append("name", name);
      if (groupId) params.append("group", groupId);
      if (mimeType) params.append("mimeType", mimeType);
      if (cid) params.append("cid", cid);
      if (cidPending !== undefined)
        params.append("cidPending", cidPending.toString());
      if (order) params.append("order", order);
      if (pageToken) params.append("pageToken", pageToken);

      // Handle metadata filtering
      if (metadata && typeof metadata === "object") {
        // Convert metadata object ke format yang diharapkan API
        Object.entries(metadata).forEach(([key, value]) => {
          params.append(`metadata[${key}]`, value);
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
   * Create private access link for private files - FREE PLAN OPTIMIZED
   */
  async createPrivateAccessLink(cid, options = {}) {
    // Wait for plan detection to complete if still in progress
    while (this._planDetectionInProgress) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Check if we've already detected that this is a free plan
    if (this._freePlanDetected) {
      console.log(
        "Free plan detected, using public gateway URL directly (no API call needed)"
      );
      return `https://gateway.pinata.cloud/ipfs/${cid}`;
    }

    try {
      const {
        expires = 3600, // 1 hour default
        date = Math.floor(Date.now() / 1000),
        method = "GET",
      } = options;

      console.log("Attempting to create private access link for CID:", cid);

      const requestBody = {
        cid: cid,
        expires: expires,
        date: date,
        method: method,
      };

      // Single attempt without retries for 403 errors
      const response = await this.makeRequest(
        `${this.BASE_URL}/files/sign`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify(requestBody),
          timeout: 10000,
        },
        1
      ); // Only 1 attempt, no retries

      console.log("Private access link created successfully");
      return response.data || response.url || response;
    } catch (error) {
      // Check if this is a 403 Forbidden error (free plan limitation)
      if (
        error.message.includes("403") ||
        error.message.includes("Forbidden")
      ) {
        console.log(
          "Free plan detected during request: Private access links not available"
        );

        // Set flag to avoid future attempts
        this._freePlanDetected = true;

        // Return public gateway URL immediately
        const publicUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
        console.log("Using public gateway URL for free plan:", publicUrl);
        return publicUrl;
      }

      // For other errors, also return public URL but log the error
      console.warn("Private access link creation failed:", error.message);
      const fallbackUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
      console.log("Using fallback public gateway URL:", fallbackUrl);
      return fallbackUrl;
    }
  }

  /**
   * Create group
   */
  async createGroup(name, options = {}) {
    try {
      const { network = "private", isPublic = false } = options;

      const response = await this.makeRequest(
        `${this.BASE_URL}/groups/${network}`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            name,
            is_public: isPublic,
          }),
        }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error("Create group error:", error);
      throw new Error(`Gagal membuat group: ${error.message}`);
    }
  }

  /**
   * List groups
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
        groups: response.data.groups || [],
        nextPageToken: response.data.next_page_token,
      };
    } catch (error) {
      console.error("List groups error:", error);
      throw new Error(`Gagal mengambil daftar group: ${error.message}`);
    }
  }

  /**
   * Add file to group
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
      };
    } catch (error) {
      console.error("Add file to group error:", error);
      throw new Error(`Gagal menambahkan file ke group: ${error.message}`);
    }
  }

  /**
   * Remove file from group
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
   * Get file access URL with fallback strategies
   */
  async getFileAccessUrl(cid, options = {}) {
    const { isPrivate = true, forcePublic = false } = options;

    console.log(`Getting access URL for CID: ${cid}, private: ${isPrivate}`);

    // If force public or not private, use public gateway
    if (forcePublic || !isPrivate) {
      const publicUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
      console.log("Using public gateway URL:", publicUrl);
      return publicUrl;
    }

    // Try to create private access link
    try {
      const privateUrl = await this.createPrivateAccessLink(cid);
      console.log("Created private access URL:", privateUrl);
      return privateUrl;
    } catch (error) {
      console.warn(
        "Private access failed, falling back to public gateway:",
        error.message
      );

      // Fallback to public gateway
      const fallbackUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
      console.log("Using fallback public gateway URL:", fallbackUrl);
      return fallbackUrl;
    }
  }

  /**
   * Alternative upload method with public network for testing
   */
  async uploadFilePublic(file, options = {}) {
    console.log("Uploading file as PUBLIC (for testing)...");

    return await this.uploadFile(file, {
      ...options,
      network: "public", // Force public network
    });
  }

  /**
   * Check API key permissions and capabilities - IMPROVED
   */
  async checkApiKeyPermissions() {
    console.log("Checking API key permissions...");

    // Wait for plan detection to complete if still in progress
    while (this._planDetectionInProgress) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // If we already detected the plan type, return the cached result
    if (this._freePlanDetected !== null) {
      const planType = this._freePlanDetected ? "free" : "paid";
      console.log(`API key permissions: ${planType} plan (cached result)`);

      return {
        valid: true,
        planType: planType,
        features: {
          upload: true,
          privateFiles: !this._freePlanDetected,
          privateAccess: !this._freePlanDetected,
        },
      };
    }

    // If not detected yet, perform the check
    try {
      // Test basic API access
      const authTest = await this.makeRequest(
        `${this.BASE_URL}/files/private?limit=1`,
        {
          method: "GET",
          headers: this.getHeaders(),
          timeout: 5000,
        }
      );

      console.log("API key is valid - basic access confirmed");

      // Try to test sign endpoint to detect free plan
      try {
        await this.makeRequest(
          `${this.BASE_URL}/files/sign`,
          {
            method: "POST",
            headers: this.getHeaders(),
            body: JSON.stringify({
              cid: "test-permissions-check",
              expires: 3600,
              date: Math.floor(Date.now() / 1000),
              method: "GET",
            }),
            timeout: 5000,
          },
          1
        );

        console.log("API key has private access capabilities (paid plan)");
        this._freePlanDetected = false;

        return {
          valid: true,
          planType: "paid",
          features: {
            upload: true,
            privateFiles: true,
            privateAccess: true,
          },
        };
      } catch (signError) {
        if (
          signError.message.includes("403") ||
          signError.message.includes("Forbidden")
        ) {
          console.log("API key has basic capabilities only (free plan)");
          this._freePlanDetected = true;

          return {
            valid: true,
            planType: "free",
            features: {
              upload: true,
              privateFiles: false,
              privateAccess: false,
            },
          };
        } else {
          console.warn(
            "Unexpected error testing sign endpoint:",
            signError.message
          );
          return {
            valid: true,
            planType: "unknown",
            features: {
              upload: true,
              privateFiles: false,
              privateAccess: false,
            },
          };
        }
      }
    } catch (error) {
      console.error("API key validation failed:", error.message);
      return {
        valid: false,
        planType: "invalid",
        error: error.message,
        features: {
          upload: false,
          privateFiles: false,
          privateAccess: false,
        },
      };
    }
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
    };
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Test upload with a small file (for debugging)
   */
  async testUpload() {
    console.log("Testing upload with small test file...");

    try {
      // Create a small test file
      const testData = JSON.stringify(
        {
          test: true,
          timestamp: new Date().toISOString(),
          message: "This is a test upload from EduVerse app",
        },
        null,
        2
      );

      const testFile = {
        uri: `data:application/json;base64,${btoa(testData)}`,
        type: "application/json",
        name: `test-upload-${Date.now()}.json`,
        size: new Blob([testData]).size,
      };

      console.log("Test file created:", {
        name: testFile.name,
        size: this.formatFileSize(testFile.size),
        type: testFile.type,
      });

      // Try public upload first
      const publicResult = await this.uploadFilePublic(testFile, {
        name: testFile.name,
        metadata: {
          purpose: "API test",
          app: "EduVerse",
        },
      });

      console.log("Public upload test successful:", publicResult);
      return publicResult;
    } catch (error) {
      console.error("Test upload failed:", error.message);
      throw error;
    }
  }
}

// Export singleton instance
export const pinataService = new PinataService();
export default pinataService;
