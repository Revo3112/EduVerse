import localforage from 'localforage';

// Configure storage instances
const textDataStore = localforage.createInstance({
  name: 'EduVerse',
  storeName: 'courseDrafts',
  description: 'Course draft text data'
});

const fileDataStore = localforage.createInstance({
  name: 'EduVerse',
  storeName: 'courseFiles',
  description: 'Course draft file data'
});

// Configure preferred drivers (IndexedDB first for large files)
textDataStore.setDriver([
  localforage.INDEXEDDB,
  localforage.WEBSQL,
  localforage.LOCALSTORAGE
]);

fileDataStore.setDriver([
  localforage.INDEXEDDB,
  localforage.WEBSQL
]); // Don't use localStorage for files

export interface DraftFormData {
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

  /**
   * Generate unique file ID
   */
  private generateFileId(): string {
    return `${this.FILE_PREFIX}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Store a file and return its reference ID
   */
  async storeFile(file: File): Promise<string> {
    const fileId = this.generateFileId();

    try {
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
    } catch (error) {
      console.error('Failed to store file:', error);
      throw new Error('Failed to store file');
    }
  }

  /**
   * Retrieve a file by its ID
   */
  async getFile(fileId: string): Promise<File | null> {
    try {
      const file = await fileDataStore.getItem<File>(fileId);
      return file;
    } catch (error) {
      console.error('Failed to retrieve file:', error);
      return null;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<FileReference | null> {
    try {
      const metadata = await fileDataStore.getItem<FileReference>(`${fileId}_meta`);
      return metadata;
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
    try {
      await Promise.all([
        fileDataStore.removeItem(fileId),
        fileDataStore.removeItem(`${fileId}_meta`)
      ]);
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  }

  /**
   * Save draft data (text only, fast operation)
   */
  async saveDraftData(formData: DraftFormData, sections: DraftSection[]): Promise<void> {
    try {
      const draftData: DraftData = {
        formData,
        sections,
        createdAt: Date.now(),
        lastModified: Date.now()
      };

      await textDataStore.setItem(this.DRAFT_KEY, draftData);
    } catch (error) {
      console.error('Failed to save draft data:', error);
      throw new Error('Failed to save draft');
    }
  }

  /**
   * Load draft data
   */
  async loadDraftData(): Promise<DraftData | null> {
    try {
      const draftData = await textDataStore.getItem<DraftData>(this.DRAFT_KEY);
      return draftData;
    } catch (error) {
      console.error('Failed to load draft data:', error);
      return null;
    }
  }

  /**
   * Clear all draft data and associated files
   */
  async clearDraft(): Promise<void> {
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
      await textDataStore.removeItem(this.DRAFT_KEY);
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
  }> {
    try {
      const [textKeys, fileKeys] = await Promise.all([
        textDataStore.keys(),
        fileDataStore.keys()
      ]);

      return {
        textDataKeys: textKeys.length,
        fileDataKeys: fileKeys.length,
        estimatedSize: 'Unknown' // Browser doesn't expose actual storage usage
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        textDataKeys: 0,
        fileDataKeys: 0,
        estimatedSize: 'Error'
      };
    }
  }

  /**
   * Check if drafts are supported
   */
  async isSupported(): Promise<boolean> {
    try {
      await textDataStore.ready();
      await fileDataStore.ready();
      return true;
    } catch (error) {
      console.error('Draft storage not supported:', error);
      return false;
    }
  }

  /**
   * Clean up orphaned files (files without associated draft data)
   */
  async cleanupOrphanedFiles(): Promise<number> {
    try {
      const draftData = await this.loadDraftData();
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
    } catch (error) {
      console.error('Failed to cleanup orphaned files:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const draftStorage = new DraftStorageService();

// Export for debugging
export { fileDataStore, textDataStore };
