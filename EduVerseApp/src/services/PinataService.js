/**
 * PinataService.js
 * Service untuk menangani semua interaksi dengan Pinata IPFS API
 * Berdasarkan dokumentasi resmi Pinata v3 API
 */

class PinataService {
  constructor() {
    // Pastikan environment variable PINATA_JWT tersedia
    this.JWT = process.env.PINATA_JWT || process.env.REACT_NATIVE_PINATA_JWT;
    this.BASE_URL = "https://api.pinata.cloud/v3";
    this.UPLOAD_URL = "https://uploads.pinata.cloud/v3";

    if (!this.JWT) {
      console.warn("PINATA_JWT tidak ditemukan dalam environment variables");
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
   * Generic request handler dengan retry logic
   */
  async makeRequest(url, options = {}, retries = 3) {
    const { timeout = 30000, ...fetchOptions } = options;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(
            responseData.error ||
              `HTTP ${response.status}: ${response.statusText}`
          );
        }

        return responseData;
      } catch (error) {
        console.error(`Request attempt ${attempt + 1} failed:`, error.message);

        if (attempt === retries - 1) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  /**
   * Test koneksi ke Pinata
   */
  async testConnection() {
    try {
      if (!this.JWT) {
        return {
          success: false,
          error:
            "PINATA_JWT tidak dikonfigurasi. Pastikan environment variable sudah diset.",
        };
      }

      // Test dengan endpoint yang ringan - list files dengan limit 1
      const response = await this.makeRequest(
        `${this.BASE_URL}/files/private?limit=1`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      return {
        success: true,
        message: "Koneksi ke Pinata berhasil",
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Gagal terhubung ke Pinata",
      };
    }
  }

  /**
   * Upload file ke IPFS
   */
  async uploadFile(file, options = {}) {
    try {
      if (!file) {
        throw new Error("File diperlukan untuk upload");
      }

      const {
        name = file.name || "unnamed-file",
        network = "private", // 'public' atau 'private'
        groupId,
        keyValues = {},
        metadata = {},
      } = options;

      // Buat FormData untuk multipart upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("network", network);

      if (name) {
        formData.append("name", name);
      }

      if (groupId) {
        formData.append("group_id", groupId);
      }

      // Gabungkan metadata dan keyValues
      const combinedKeyValues = { ...metadata, ...keyValues };
      if (Object.keys(combinedKeyValues).length > 0) {
        formData.append("keyvalues", JSON.stringify(combinedKeyValues));
      }

      const response = await this.makeRequest(`${this.UPLOAD_URL}/files`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.JWT}`,
          // Jangan set Content-Type untuk FormData, browser akan set otomatis
        },
        body: formData,
      });

      return {
        success: true,
        data: response.data,
        // Format untuk kompatibilitas dengan komponen yang ada
        ipfsHash: response.data.cid,
        fileName: response.data.name,
        fileSize: response.data.size,
        publicUrl: `https://gateway.pinata.cloud/ipfs/${response.data.cid}`,
        privateUrl:
          network === "private"
            ? await this.createPrivateAccessLink(response.data.cid)
            : null,
      };
    } catch (error) {
      console.error("Upload file error:", error);
      throw new Error(`Gagal upload file: ${error.message}`);
    }
  }

  /**
   * Upload JSON data ke IPFS
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

      // Convert JSON to Blob then to File
      const jsonString =
        typeof jsonData === "string"
          ? jsonData
          : JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const file = new File([blob], name, { type: "application/json" });

      return await this.uploadFile(file, {
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
   * Create private access link for private files
   */
  async createPrivateAccessLink(cid, options = {}) {
    try {
      const {
        expires = 3600, // 1 hour default
        date = Math.floor(Date.now() / 1000),
        method = "GET",
      } = options;

      const url = `https://gateway.pinata.cloud/ipfs/${cid}`;

      const response = await this.makeRequest(
        `${this.BASE_URL}/files/private/download_link`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            url,
            expires,
            date,
            method,
          }),
        }
      );

      return response.data; // Return the signed URL directly
    } catch (error) {
      console.error("Create access link error:", error);
      throw new Error(`Gagal membuat access link: ${error.message}`);
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
   * Utility function untuk validasi file
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

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      throw new Error(
        `Tipe file tidak diizinkan. Diizinkan: ${allowedTypes.join(", ")}`
      );
    }

    return true;
  }
}

// Export singleton instance
export const pinataService = new PinataService();
export default pinataService;
