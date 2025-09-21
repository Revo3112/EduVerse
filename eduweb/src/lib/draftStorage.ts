import localforage from 'localforage';

// Storage mode enum
enum StorageMode {
  LOCALFORAGE = 'localforage',
  LOCALSTORAGE = 'localStorage',
  DISABLED = 'disabled'
}

// Storage instances - will be initialized later
let textDataStore: LocalForage | null = null;
let fileDataStore: LocalForage | null = null;
let currentStorageMode: StorageMode = StorageMode.DISABLED;

// Initialize storage with proper error handling
async function initializeStorage(): Promise<StorageMode> {
  try {
    // Try to initialize LocalForage instances
    const textStore = localforage.createInstance({
      name: 'EduVerse',
      storeName: 'courseDrafts',
      description: 'Course draft text data'
    });

    const fileStore = localforage.createInstance({
      name: 'EduVerse',
      storeName: 'courseFiles',
      description: 'Course draft file data'
    });

    // Configure drivers with fallback
    await textStore.setDriver([
      localforage.INDEXEDDB,
      localforage.WEBSQL,
      localforage.LOCALSTORAGE
    ]);

    await fileStore.setDriver([
      localforage.INDEXEDDB,
      localforage.WEBSQL
    ]);

    // Test if the stores are ready
    await Promise.all([
      textStore.ready(),
      fileStore.ready()
    ]);

    // Test basic operations
    await textStore.setItem('test', 'test');
    await textStore.removeItem('test');

    // If we get here, LocalForage is working
    textDataStore = textStore;
    fileDataStore = fileStore;
    currentStorageMode = StorageMode.LOCALFORAGE;

    console.log('✅ LocalForage initialized successfully');
    return StorageMode.LOCALFORAGE;

  } catch (error) {
    console.warn('⚠️ LocalForage failed, falling back to localStorage:', error);

    // Test if localStorage is available
    try {
      const testKey = 'eduverse_storage_test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      currentStorageMode = StorageMode.LOCALSTORAGE;
      console.log('✅ localStorage fallback initialized');
      return StorageMode.LOCALSTORAGE;
    } catch (localStorageError) {
      console.error('❌ No storage method available:', localStorageError);
      currentStorageMode = StorageMode.DISABLED;
      return StorageMode.DISABLED;
    }
  }
}export interface DraftFormData {
  title: string;
  description: string;
  creatorName: string;
  pricePerMonth: string;
  category: string;
  difficulty: string;
  learningObjectives: string[];
  requirements: string[];
  tags: string[];
  // File references instead of actual files
  thumbnailFileId?: string;
  sectionFileIds: string[];
}

export interface DraftSection {
  id: string;
  title: string;
  fileId?: string; // Reference to file in fileDataStore
  duration: number;
  type: 'video' | 'document' | 'image';
  description: string;
}

export interface DraftData {
  formData: DraftFormData;
  sections: DraftSection[];
  createdAt: number;
  lastModified: number;
}

export interface FileReference {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
}

class DraftStorageService {
  private readonly DRAFT_KEY = 'currentCourseDraft';
  private readonly FILE_PREFIX = 'file_';
  private isInitialized = false;

  /**
   * Initialize storage with proper error handling
   */
  async initialize(): Promise<StorageMode> {
    if (this.isInitialized) {
      return currentStorageMode;
    }

    const mode = await initializeStorage();
    this.isInitialized = true;
    return mode;
  }

  /**
   * Check if storage is available
   */
  async isSupported(): Promise<boolean> {
    const mode = await this.initialize();
    return mode !== StorageMode.DISABLED;
  }

  /**
   * Get current storage mode
   */
  getStorageMode(): StorageMode {
    return currentStorageMode;
  }

  /**
   * Generate unique file ID
   */
  private generateFileId(): string {
    return `${this.FILE_PREFIX}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Store a file with fallback handling
   */
  async storeFile(file: File): Promise<string> {
    const mode = await this.initialize();
    const fileId = this.generateFileId();

    try {
      if (mode === StorageMode.LOCALFORAGE && fileDataStore) {
        // Store the actual file as blob
        await fileDataStore.setItem(fileId, file);

        // Store file metadata for reference
        const fileRef: FileReference = {
          id: fileId,
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified
        };

        await fileDataStore.setItem(`${fileId}_meta`, fileRef);
        return fileId;

      } else if (mode === StorageMode.LOCALSTORAGE) {
        // For localStorage, we can't store large files, so we'll just store metadata
        const fileRef: FileReference = {
          id: fileId,
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified
        };

        localStorage.setItem(`eduverse_file_${fileId}`, JSON.stringify(fileRef));
        console.warn('⚠️ File content not stored due to localStorage limitations. Only metadata saved.');
        return fileId;

      } else {
        throw new Error('No storage method available');
      }
    } catch (error) {
      console.error('Failed to store file:', error);
      throw new Error('Failed to store file');
    }
  }

  /**
   * Retrieve a file by its ID
   */
  async getFile(fileId: string): Promise<File | null> {
    const mode = await this.initialize();

    try {
      if (mode === StorageMode.LOCALFORAGE && fileDataStore) {
        const file = await fileDataStore.getItem<File>(fileId);
        return file;
      } else if (mode === StorageMode.LOCALSTORAGE) {
        // localStorage can't store files, return null
        console.warn('⚠️ File content not available in localStorage mode');
        return null;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Failed to retrieve file:', error);
      return null;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<FileReference | null> {
    const mode = await this.initialize();

    try {
      if (mode === StorageMode.LOCALFORAGE && fileDataStore) {
        const metadata = await fileDataStore.getItem<FileReference>(`${fileId}_meta`);
        return metadata;
      } else if (mode === StorageMode.LOCALSTORAGE) {
        const stored = localStorage.getItem(`eduverse_file_${fileId}`);
        return stored ? JSON.parse(stored) : null;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Failed to retrieve file metadata:', error);
      return null;
    }
  }

  /**
   * Create a preview URL for a file
   */
  async createFilePreviewUrl(fileId: string): Promise<string | null> {
    try {
      const file = await this.getFile(fileId);
      if (!file) return null;

      return URL.createObjectURL(file);
    } catch (error) {
      console.error('Failed to create preview URL:', error);
      return null;
    }
  }

  /**
   * Delete a file by ID
   */
  async deleteFile(fileId: string): Promise<void> {
    const mode = await this.initialize();

    try {
      if (mode === StorageMode.LOCALFORAGE && fileDataStore) {
        await Promise.all([
          fileDataStore.removeItem(fileId),
          fileDataStore.removeItem(`${fileId}_meta`)
        ]);
      } else if (mode === StorageMode.LOCALSTORAGE) {
        localStorage.removeItem(`eduverse_file_${fileId}`);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  }

  /**
   * Save draft data with fallback handling
   */
  async saveDraftData(formData: DraftFormData, sections: DraftSection[]): Promise<void> {
    const mode = await this.initialize();

    try {
      const draftData: DraftData = {
        formData,
        sections,
        createdAt: Date.now(),
        lastModified: Date.now()
      };

      if (mode === StorageMode.LOCALFORAGE && textDataStore) {
        await textDataStore.setItem(this.DRAFT_KEY, draftData);
      } else if (mode === StorageMode.LOCALSTORAGE) {
        localStorage.setItem(`eduverse_${this.DRAFT_KEY}`, JSON.stringify(draftData));
      } else {
        throw new Error('No storage method available');
      }
    } catch (error) {
      console.error('Failed to save draft data:', error);
      throw new Error('Failed to save draft');
    }
  }

  /**
   * Load draft data
   */
  async loadDraftData(): Promise<DraftData | null> {
    const mode = await this.initialize();

    try {
      if (mode === StorageMode.LOCALFORAGE && textDataStore) {
        const draftData = await textDataStore.getItem<DraftData>(this.DRAFT_KEY);
        return draftData;
      } else if (mode === StorageMode.LOCALSTORAGE) {
        const stored = localStorage.getItem(`eduverse_${this.DRAFT_KEY}`);
        return stored ? JSON.parse(stored) : null;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Failed to load draft data:', error);
      return null;
    }
  }

  /**
   * Clear all draft data and associated files
   */
  async clearDraft(): Promise<void> {
    const mode = await this.initialize();

    try {
      // Get draft data to find file IDs
      const draftData = await this.loadDraftData();

      if (draftData) {
        // Collect all file IDs
        const fileIds: string[] = [];

        if (draftData.formData.thumbnailFileId) {
          fileIds.push(draftData.formData.thumbnailFileId);
        }

        draftData.sections.forEach(section => {
          if (section.fileId) {
            fileIds.push(section.fileId);
          }
        });

        // Delete all files
        await Promise.all(fileIds.map(fileId => this.deleteFile(fileId)));
      }

      // Clear draft data
      if (mode === StorageMode.LOCALFORAGE && textDataStore) {
        await textDataStore.removeItem(this.DRAFT_KEY);
      } else if (mode === StorageMode.LOCALSTORAGE) {
        localStorage.removeItem(`eduverse_${this.DRAFT_KEY}`);
      }
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    textDataKeys: number;
    fileDataKeys: number;
    estimatedSize: string;
    storageMode: StorageMode;
  }> {
    const mode = await this.initialize();

    try {
      if (mode === StorageMode.LOCALFORAGE && textDataStore && fileDataStore) {
        const [textKeys, fileKeys] = await Promise.all([
          textDataStore.keys(),
          fileDataStore.keys()
        ]);

        return {
          textDataKeys: textKeys.length,
          fileDataKeys: fileKeys.length,
          estimatedSize: 'Unknown',
          storageMode: mode
        };
      } else if (mode === StorageMode.LOCALSTORAGE) {
        let count = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('eduverse_')) {
            count++;
          }
        }

        return {
          textDataKeys: count,
          fileDataKeys: 0,
          estimatedSize: 'Limited',
          storageMode: mode
        };
      } else {
        return {
          textDataKeys: 0,
          fileDataKeys: 0,
          estimatedSize: 'Disabled',
          storageMode: mode
        };
      }
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        textDataKeys: 0,
        fileDataKeys: 0,
        estimatedSize: 'Error',
        storageMode: mode
      };
    }
  }

  /**
   * Check if drafts are supported (updated)
   */
  async isReady(): Promise<boolean> {
    const mode = await this.initialize();

    try {
      if (mode === StorageMode.LOCALFORAGE && textDataStore && fileDataStore) {
        await Promise.all([
          textDataStore.ready(),
          fileDataStore.ready()
        ]);
        return true;
      } else if (mode === StorageMode.LOCALSTORAGE) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Storage not ready:', error);
      return false;
    }
  }

  /**
   * Clean up orphaned files
   */
  async cleanupOrphanedFiles(): Promise<number> {
    const mode = await this.initialize();

    try {
      const draftData = await this.loadDraftData();

      if (mode === StorageMode.LOCALFORAGE && fileDataStore) {
        const allFileKeys = await fileDataStore.keys();

        // Filter only actual file keys (not metadata)
        const fileKeys = allFileKeys.filter(key =>
          key.startsWith(this.FILE_PREFIX) && !key.endsWith('_meta')
        );

        if (!draftData) {
          // No draft data, all files are orphaned
          await Promise.all(fileKeys.map(fileId => this.deleteFile(fileId)));
          return fileKeys.length;
        }

        // Collect active file IDs
        const activeFileIds = new Set<string>();
        if (draftData.formData.thumbnailFileId) {
          activeFileIds.add(draftData.formData.thumbnailFileId);
        }
        draftData.sections.forEach(section => {
          if (section.fileId) {
            activeFileIds.add(section.fileId);
          }
        });

        // Delete orphaned files
        const orphanedFiles = fileKeys.filter(fileId => !activeFileIds.has(fileId));
        await Promise.all(orphanedFiles.map(fileId => this.deleteFile(fileId)));

        return orphanedFiles.length;
      } else {
        return 0;
      }
    } catch (error) {
      console.error('Failed to cleanup orphaned files:', error);
      return 0;
    }
  }
}// Export singleton instance
export const draftStorage = new DraftStorageService();

// Export for debugging
export { fileDataStore, textDataStore };
