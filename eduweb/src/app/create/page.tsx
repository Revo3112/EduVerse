"use client";

import { FormContainer } from "@/components/PageContainer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { draftStorage, type DraftFormData, type DraftSection } from '@/lib/draftStorage';
import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock, DollarSign, Eye,
  FileCheck,
  FileText, GripVertical,
  Image as ImageIcon,
  Info,
  Loader2, PlusCircle, Save,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  Video, X,
  Zap
} from "lucide-react";
import Image from "next/image";
import React, { useCallback, useEffect, useState } from 'react';

// Type definitions - Updated to work with storage service
interface FormData {
  title: string;
  description: string;
  thumbnailFile: File | null;
  thumbnailPreview: string | null;
  thumbnailFileId?: string; // Reference to stored file
  creatorName: string;
  pricePerMonth: string;
  category: string;
  difficulty: string;
  learningObjectives: string[];
  requirements: string[];
  tags: string[];
}

interface Section {
  id: string;
  title: string;
  file: File | null;
  filePreview: string | null;
  fileId?: string; // Reference to stored file
  duration: number;
  type: 'video' | 'document' | 'image';
  description: string;
  uploadStatus?: string;
}

interface NewSection {
  title: string;
  file: File | null;
  filePreview: string | null;
  fileId?: string; // Reference to stored file
  duration: number;
  type: 'video' | 'document' | 'image';
  description: string;
}

interface FileConfig {
  accept: string;
  maxSize: number;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
}

interface UploadProgress {
  [key: string]: number;
}

// Mock useEthPrice hook
const useEthPrice = () => ({
  ethToIDR: 71500000,
  isLoading: false,
  error: null,
  lastUpdated: new Date(),
  refetch: () => {}
});

// Course categories from smart contract
const COURSE_CATEGORIES = [
  { value: 'Programming', label: 'Programming', icon: '💻', color: 'bg-blue-500' },
  { value: 'Design', label: 'Design', icon: '🎨', color: 'bg-purple-500' },
  { value: 'Business', label: 'Business', icon: '💼', color: 'bg-green-500' },
  { value: 'Marketing', label: 'Marketing', icon: '📱', color: 'bg-pink-500' },
  { value: 'DataScience', label: 'Data Science', icon: '📊', color: 'bg-indigo-500' },
  { value: 'Finance', label: 'Finance', icon: '💰', color: 'bg-yellow-500' },
  { value: 'Healthcare', label: 'Healthcare', icon: '⚕️', color: 'bg-red-500' },
  { value: 'Language', label: 'Language', icon: '🗣️', color: 'bg-teal-500' },
  { value: 'Arts', label: 'Arts', icon: '🎭', color: 'bg-orange-500' }
];

const DIFFICULTY_LEVELS = [
  {
    value: 'Beginner',
    label: 'Beginner',
    description: 'No prior experience needed',
    color: 'text-green-600 bg-green-50 border-green-200',
    icon: '🌱'
  },
  {
    value: 'Intermediate',
    label: 'Intermediate',
    description: 'Some knowledge required',
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    icon: '🚀'
  },
  {
    value: 'Advanced',
    label: 'Advanced',
    description: 'Expert level content',
    color: 'text-red-600 bg-red-50 border-red-200',
    icon: '🔥'
  }
];

// File type configurations
const FILE_CONFIGS: Record<'video' | 'document' | 'image', FileConfig> = {
  video: {
    accept: 'video/*',
    maxSize: 500 * 1024 * 1024, // 500MB
    icon: Video,
    color: 'text-blue-600 bg-blue-50'
  },
  document: {
    accept: '.pdf,.doc,.docx,.txt,.md',
    maxSize: 50 * 1024 * 1024, // 50MB
    icon: FileText,
    color: 'text-green-600 bg-green-50'
  },
  image: {
    accept: 'image/*',
    maxSize: 10 * 1024 * 1024, // 10MB
    icon: ImageIcon,
    color: 'text-purple-600 bg-purple-50'
  }
};

export default function CreateCoursePage() {
  const { ethToIDR } = useEthPrice();
  const [activeStep] = useState<number>(0);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // Draft storage states
  const [isDraftSupported, setIsDraftSupported] = useState<boolean>(false);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState<boolean>(true);
  const [isDeletingItem, setIsDeletingItem] = useState<boolean>(false);
  const [draftSaveStatus, setDraftSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Form data state with proper typing
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    thumbnailFile: null,
    thumbnailPreview: null,
    creatorName: '',
    pricePerMonth: '0.01',
    category: '',
    difficulty: '',
    learningObjectives: ['', '', ''],
    requirements: [''],
    tags: []
  });

  // Sections state with proper typing
  const [sections, setSections] = useState<Section[]>([]);
  const [newSection, setNewSection] = useState<NewSection>({
    title: '',
    file: null,
    filePreview: null,
    fileId: undefined,
    duration: 300,
    type: 'video',
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draggedSection, setDraggedSection] = useState<number | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // Auto-save and load from draft storage
  useEffect(() => {
    const initializeDraftStorage = async () => {
      try {
        setIsLoadingDraft(true);

        // Check if draft storage is supported
        const supported = await draftStorage.isSupported();
        setIsDraftSupported(supported);

        if (!supported) {
          console.warn('Draft storage not supported in this browser');
          setIsLoadingDraft(false);
          return;
        }

        // Load existing draft
        const draftData = await draftStorage.loadDraftData();
        if (draftData) {
          // Restore form data
          setFormData(prev => ({
            ...prev,
            ...draftData.formData,
            // Don't restore file objects, only the IDs
            thumbnailFile: null,
            thumbnailPreview: null
          }));

          // Restore sections (without file objects)
          const restoredSections: Section[] = draftData.sections.map(section => ({
            ...section,
            file: null,
            filePreview: null
          }));
          setSections(restoredSections);

          // Load thumbnail preview if exists
          if (draftData.formData.thumbnailFileId) {
            const thumbnailUrl = await draftStorage.createFilePreviewUrl(draftData.formData.thumbnailFileId);
            if (thumbnailUrl) {
              setFormData(prev => ({
                ...prev,
                thumbnailPreview: thumbnailUrl,
                thumbnailFileId: draftData.formData.thumbnailFileId
              }));
            }
          }

          // Load section file previews
          for (let i = 0; i < restoredSections.length; i++) {
            const section = restoredSections[i];
            if (section.fileId) {
              const fileUrl = await draftStorage.createFilePreviewUrl(section.fileId);
              if (fileUrl) {
                setSections(prev => prev.map(s =>
                  s.id === section.id
                    ? { ...s, filePreview: fileUrl }
                    : s
                ));
              }
            }
          }

          setLastSavedAt(new Date(draftData.lastModified));
        }

        // Cleanup any orphaned files
        await draftStorage.cleanupOrphanedFiles();

      } catch (error) {
        console.error('Failed to initialize draft storage:', error);
      } finally {
        setIsLoadingDraft(false);
      }
    };

    initializeDraftStorage();
  }, []);

  // Auto-save draft data (text only, fast)
  useEffect(() => {
    if (isLoadingDraft || !isDraftSupported || isDeletingItem || isSavingDraft) return;

    const saveTimer = setTimeout(async () => {
      try {
        setIsSavingDraft(true);
        setDraftSaveStatus('saving');

        // Prepare draft form data
        const draftFormData: DraftFormData = {
          title: formData.title,
          description: formData.description,
          creatorName: formData.creatorName,
          pricePerMonth: formData.pricePerMonth,
          category: formData.category,
          difficulty: formData.difficulty,
          learningObjectives: formData.learningObjectives,
          requirements: formData.requirements,
          tags: formData.tags,
          thumbnailFileId: formData.thumbnailFileId,
          sectionFileIds: sections.map(s => s.fileId).filter(Boolean) as string[]
        };

        // Prepare sections data
        const draftSections: DraftSection[] = sections.map(section => ({
          id: section.id,
          title: section.title,
          fileId: section.fileId,
          duration: section.duration,
          type: section.type,
          description: section.description
        }));

        await draftStorage.saveDraftData(draftFormData, draftSections);

        setDraftSaveStatus('saved');
        setLastSavedAt(new Date());

        // Reset status after a delay
        setTimeout(() => setDraftSaveStatus('idle'), 2000);

      } catch (error) {
        console.error('Failed to save draft:', error);
        setDraftSaveStatus('error');
        setTimeout(() => setDraftSaveStatus('idle'), 3000);
      } finally {
        setIsSavingDraft(false);
      }
    }, 1000);

    return () => clearTimeout(saveTimer);
  }, [formData, sections, isLoadingDraft, isDraftSupported, isDeletingItem, isSavingDraft]);

  // Handle thumbnail upload with file storage
  const handleThumbnailUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > FILE_CONFIGS.image.maxSize) {
      setErrors(prev => ({ ...prev, thumbnail: 'Image must be less than 10MB' }));
      return;
    }

    try {
      // Create preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          thumbnailFile: file,
          thumbnailPreview: reader.result as string
        }));
      };
      reader.readAsDataURL(file);

      // Store file if draft storage is supported
      if (isDraftSupported) {
        // Delete old thumbnail file if exists
        if (formData.thumbnailFileId) {
          await draftStorage.deleteFile(formData.thumbnailFileId);
        }

        // Store new file
        const fileId = await draftStorage.storeFile(file);
        setFormData(prev => ({
          ...prev,
          thumbnailFileId: fileId
        }));
      }

      setErrors(prev => ({ ...prev, thumbnail: '' }));
    } catch (error) {
      console.error('Failed to store thumbnail:', error);
      setErrors(prev => ({ ...prev, thumbnail: 'Failed to save thumbnail' }));
    }
  }, [isDraftSupported, formData.thumbnailFileId]);

  // Handle section file upload with file storage
  const handleSectionFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const config = FILE_CONFIGS[newSection.type];
    if (file.size > config.maxSize) {
      alert(`File must be less than ${config.maxSize / (1024 * 1024)}MB`);
      return;
    }

    try {
      // Create preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewSection(prev => ({
          ...prev,
          file: file,
          filePreview: reader.result as string
        }));
      };
      reader.readAsDataURL(file);

      // Store file if draft storage is supported (but don't wait for it)
      if (isDraftSupported) {
        draftStorage.storeFile(file).then(fileId => {
          setNewSection(prev => ({
            ...prev,
            fileId
          }));
        }).catch(error => {
          console.error('Failed to store section file:', error);
        });
      }
    } catch (error) {
      console.error('Failed to handle section file upload:', error);
      alert('Failed to process file upload');
    }
  }, [newSection.type, isDraftSupported]);

  // Add section with file management
  const addSection = useCallback(async () => {
    if (!newSection.title.trim() || !newSection.file) {
      alert("Please provide both title and file for the section");
      return;
    }

    const section: Section = {
      ...newSection,
      id: Date.now().toString(),
      uploadStatus: 'pending',
      fileId: newSection.fileId // Carry over the file ID if stored
    };

    setSections(prev => [...prev, section]);

    // Reset new section form
    setNewSection({
      title: '',
      file: null,
      filePreview: null,
      duration: 300,
      type: 'video',
      description: '',
      fileId: undefined
    });
  }, [newSection]);

  // Handle thumbnail removal with file cleanup
  const removeThumbnail = useCallback(async () => {
    setIsDeletingItem(true);

    try {
      // Delete stored file if exists
      if (formData.thumbnailFileId && isDraftSupported) {
        try {
          await draftStorage.deleteFile(formData.thumbnailFileId);
        } catch (error) {
          console.error('Failed to delete thumbnail file:', error);
        }
      }

      // Update form data
      const updatedFormData = {
        ...formData,
        thumbnailFile: null,
        thumbnailPreview: null,
        thumbnailFileId: undefined
      };
      setFormData(updatedFormData);

      // Immediately save the updated state to draft storage
      if (isDraftSupported) {
        try {
          setIsSavingDraft(true);
          setDraftSaveStatus('saving');

          // Prepare draft form data
          const draftFormData: DraftFormData = {
            title: updatedFormData.title,
            description: updatedFormData.description,
            creatorName: updatedFormData.creatorName,
            pricePerMonth: updatedFormData.pricePerMonth,
            category: updatedFormData.category,
            difficulty: updatedFormData.difficulty,
            learningObjectives: updatedFormData.learningObjectives,
            requirements: updatedFormData.requirements,
            tags: updatedFormData.tags,
            thumbnailFileId: undefined, // Explicitly set to undefined
            sectionFileIds: sections.map(s => s.fileId).filter(Boolean) as string[]
          };

          // Prepare sections data
          const draftSections: DraftSection[] = sections.map(section => ({
            id: section.id,
            title: section.title,
            fileId: section.fileId,
            duration: section.duration,
            type: section.type,
            description: section.description
          }));

          await draftStorage.saveDraftData(draftFormData, draftSections);

          setDraftSaveStatus('saved');
          setLastSavedAt(new Date());

          // Reset status after a delay
          setTimeout(() => setDraftSaveStatus('idle'), 2000);

        } catch (error) {
          console.error('Failed to save draft after thumbnail removal:', error);
          setDraftSaveStatus('error');
          setTimeout(() => setDraftSaveStatus('idle'), 3000);
        } finally {
          setIsSavingDraft(false);
        }
      }
    } finally {
      setIsDeletingItem(false);
    }
  }, [formData, isDraftSupported, sections]);

  // Delete section with file cleanup
  const deleteSection = useCallback(async (sectionId: string) => {
    setIsDeletingItem(true);

    try {
      const section = sections.find(s => s.id === sectionId);

      // Delete associated file if exists
      if (section?.fileId && isDraftSupported) {
        try {
          await draftStorage.deleteFile(section.fileId);
        } catch (error) {
          console.error('Failed to delete section file:', error);
        }
      }

      // Update sections state
      const updatedSections = sections.filter(s => s.id !== sectionId);
      setSections(updatedSections);

      // Immediately save the updated state to draft storage
      if (isDraftSupported) {
        try {
          setIsSavingDraft(true);
          setDraftSaveStatus('saving');

          // Prepare draft form data
          const draftFormData: DraftFormData = {
            title: formData.title,
            description: formData.description,
            creatorName: formData.creatorName,
            pricePerMonth: formData.pricePerMonth,
            category: formData.category,
            difficulty: formData.difficulty,
            learningObjectives: formData.learningObjectives,
            requirements: formData.requirements,
            tags: formData.tags,
            thumbnailFileId: formData.thumbnailFileId,
            sectionFileIds: updatedSections.map(s => s.fileId).filter(Boolean) as string[]
          };

          // Prepare sections data
          const draftSections: DraftSection[] = updatedSections.map(section => ({
            id: section.id,
            title: section.title,
            fileId: section.fileId,
            duration: section.duration,
            type: section.type,
            description: section.description
          }));

          await draftStorage.saveDraftData(draftFormData, draftSections);

          setDraftSaveStatus('saved');
          setLastSavedAt(new Date());

          // Reset status after a delay
          setTimeout(() => setDraftSaveStatus('idle'), 2000);

        } catch (error) {
          console.error('Failed to save draft after deletion:', error);
          setDraftSaveStatus('error');
          setTimeout(() => setDraftSaveStatus('idle'), 3000);
        } finally {
          setIsSavingDraft(false);
        }
      }
    } finally {
      setIsDeletingItem(false);
    }
  }, [sections, isDraftSupported, formData]);

  // Clear draft and all associated files
  const clearDraft = useCallback(async () => {
    if (!isDraftSupported) {
      // Fallback to simple state reset
      setFormData({
        title: '',
        description: '',
        thumbnailFile: null,
        thumbnailPreview: null,
        creatorName: '',
        pricePerMonth: '0.01',
        category: '',
        difficulty: '',
        learningObjectives: ['', '', ''],
        requirements: [''],
        tags: []
      });
      setSections([]);
      return;
    }

    try {
      await draftStorage.clearDraft();

      // Reset form state
      setFormData({
        title: '',
        description: '',
        thumbnailFile: null,
        thumbnailPreview: null,
        creatorName: '',
        pricePerMonth: '0.01',
        category: '',
        difficulty: '',
        learningObjectives: ['', '', ''],
        requirements: [''],
        tags: []
      });
      setSections([]);
      setLastSavedAt(null);

    } catch (error) {
      console.error('Failed to clear draft:', error);
      alert('Failed to clear draft');
    }
  }, [isDraftSupported]);

  // Manual save draft
  const manualSaveDraft = useCallback(async () => {
    if (!isDraftSupported) {
      alert('Draft storage not supported in this browser');
      return;
    }

    try {
      setIsSavingDraft(true);
      setDraftSaveStatus('saving');

      const draftFormData: DraftFormData = {
        title: formData.title,
        description: formData.description,
        creatorName: formData.creatorName,
        pricePerMonth: formData.pricePerMonth,
        category: formData.category,
        difficulty: formData.difficulty,
        learningObjectives: formData.learningObjectives,
        requirements: formData.requirements,
        tags: formData.tags,
        thumbnailFileId: formData.thumbnailFileId,
        sectionFileIds: sections.map(s => s.fileId).filter(Boolean) as string[]
      };

      const draftSections: DraftSection[] = sections.map(section => ({
        id: section.id,
        title: section.title,
        fileId: section.fileId,
        duration: section.duration,
        type: section.type,
        description: section.description
      }));

      await draftStorage.saveDraftData(draftFormData, draftSections);

      setDraftSaveStatus('saved');
      setLastSavedAt(new Date());
      alert('Draft saved successfully!');

      setTimeout(() => setDraftSaveStatus('idle'), 2000);

    } catch (error) {
      console.error('Failed to save draft:', error);
      setDraftSaveStatus('error');
      alert('Failed to save draft');
      setTimeout(() => setDraftSaveStatus('idle'), 3000);
    } finally {
      setIsSavingDraft(false);
    }
  }, [formData, sections, isDraftSupported]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedSection(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedSection === null) return;

    if (draggedSection !== index) {
      const newSections = [...sections];
      const draggedItem = newSections[draggedSection];
      newSections.splice(draggedSection, 1);
      newSections.splice(index, 0, draggedItem);
      setSections(newSections);
      setDraggedSection(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedSection(null);
    setIsDraggingOver(false);
  };

  // Simulate IPFS upload
  const simulateIPFSUpload = async (file: File, onProgress: (progress: number) => void): Promise<string> => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          resolve(`Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`);
        }
        onProgress(progress);
      }, 500);
    });
  };

  // Publish course
  const publishCourse = async () => {
    setIsPublishing(true);

    try {
      // Step 1: Upload thumbnail
      if (!formData.thumbnailFile) {
        alert('Please select a thumbnail image');
        return;
      }

      setUploadProgress({ thumbnail: 0 });
      const thumbnailCID = await simulateIPFSUpload(
        formData.thumbnailFile,
        (progress: number) => setUploadProgress(prev => ({ ...prev, thumbnail: progress }))
      );

      // Step 2: Upload section files
      const sectionCIDs = [];
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (!section.file) continue;

        setUploadProgress(prev => ({ ...prev, [`section_${i}`]: 0 }));

        const cid = await simulateIPFSUpload(
          section.file,
          (progress: number) => setUploadProgress(prev => ({ ...prev, [`section_${i}`]: progress }))
        );

        sectionCIDs.push({ ...section, contentCID: cid });
      }

      // Step 3: Create course on blockchain (simulated)
      console.log('Creating course with:', {
        ...formData,
        thumbnailCID,
        sections: sectionCIDs
      });

      // Clear draft after successful publish
      await clearDraft();

      alert('Course published successfully! 🎉');

    } catch (error) {
      console.error('Publishing failed:', error);
      alert('Failed to publish course. Please try again.');
    } finally {
      setIsPublishing(false);
      setUploadProgress({});
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const totalDuration = sections.reduce((acc, s) => acc + s.duration, 0);
  const priceInIDR = parseFloat(formData.pricePerMonth) * ethToIDR;

  const steps = ['Course Info', 'Content', 'Pricing', 'Review'];

  // Show loading screen while initializing draft storage
  if (isLoadingDraft) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Loading Draft...</h2>
          <p className="text-muted-foreground">Initializing storage and loading your saved work</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border">
        <FormContainer>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Create Course
                </h1>
                <p className="text-sm text-muted-foreground">Share your knowledge with the world</p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="hidden lg:flex items-center gap-2">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-center">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    idx === activeStep ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' :
                    idx < activeStep ? 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300' : 'bg-muted text-muted-foreground'
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === activeStep ? 'bg-blue-600 text-white dark:bg-blue-500' :
                      idx < activeStep ? 'bg-green-600 text-white dark:bg-green-500' : 'bg-muted-foreground/20 text-muted-foreground'
                    }`}>
                      {idx < activeStep ? '✓' : idx + 1}
                    </div>
                    <span className="font-medium">{step}</span>
                  </div>
                  {idx < steps.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </FormContainer>
      </div>

      <FormContainer>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Information Card */}
            {/* FIXED: Removed padding from Card and added rounded-t-xl to CardHeader */}
            <Card className="p-0">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border-b border-border p-0 rounded-t-xl">
                <div className="p-6">
                  <CardTitle className="text-xl font-bold text-card-foreground flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Course Information
                  </CardTitle>
                  <CardDescription>Basic details about your course</CardDescription>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Title Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Course Title *
                  </label>
                  <input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Complete Web Development Bootcamp 2025"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all text-foreground placeholder:text-muted-foreground"
                    maxLength={200}
                  />
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Make it searchable and descriptive</span>
                    <span className={`${formData.title.length > 180 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                      {formData.title.length}/200
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Course Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what students will learn, prerequisites, and outcomes..."
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all resize-none text-foreground placeholder:text-muted-foreground"
                    maxLength={2000}
                  />
                  <div className="text-xs text-right">
                    <span className={`${formData.description.length > 1800 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                      {formData.description.length}/2000
                    </span>
                  </div>
                </div>

                {/* Thumbnail Upload */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Course Thumbnail *
                  </label>
                  <div className="relative">
                    {formData.thumbnailPreview ? (
                      <div className="relative group">
                        <Image
                          src={formData.thumbnailPreview}
                          alt="Thumbnail"
                          width={400}
                          height={192}
                          className="w-full h-48 object-cover rounded-xl"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                          <label className="px-4 py-2 bg-white text-slate-800 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleThumbnailUpload}
                              className="hidden"
                            />
                            Change
                          </label>
                          <button
                            onClick={removeThumbnail}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailUpload}
                          className="hidden"
                        />
                        <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                        <span className="text-sm font-medium text-foreground">Click to upload thumbnail</span>
                        <span className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Category & Difficulty */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-foreground">
                      Category *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {COURSE_CATEGORIES.slice(0, 9).map(cat => (
                        <button
                          key={cat.value}
                          onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                          className={`p-3 rounded-xl border-2 transition-all ${
                            formData.category === cat.value
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 dark:border-blue-400'
                              : 'border-border hover:border-muted-foreground/50 bg-card'
                          }`}
                        >
                          <div className="text-2xl mb-1">{cat.icon}</div>
                          <div className="text-xs font-medium text-foreground">{cat.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-foreground">
                      Difficulty Level *
                    </label>
                    <div className="space-y-2">
                      {DIFFICULTY_LEVELS.map(level => (
                        <button
                          key={level.value}
                          onClick={() => setFormData(prev => ({ ...prev, difficulty: level.value }))}
                          className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                            formData.difficulty === level.value
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 dark:border-blue-400'
                              : 'border-border hover:border-muted-foreground/50 bg-card'
                          }`}
                        >
                          <span className="text-2xl">{level.icon}</span>
                          <div className="flex-1 text-left">
                            <div className="font-medium text-foreground">{level.label}</div>
                            <div className="text-xs text-muted-foreground">{level.description}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Course Content Card */}
            {/* FIXED: Removed padding from Card and added rounded-t-xl to CardHeader */}
            <Card className="p-0">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 border-b border-border p-0 rounded-t-xl">
                 <div className="p-6">
                    <CardTitle className="text-xl font-bold text-card-foreground flex items-center gap-2">
                      <Video className="h-5 w-5 text-green-600 dark:text-green-400" />
                      Course Content
                    </CardTitle>
                    <CardDescription>Add videos, documents, and quizzes</CardDescription>
                  </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Sections List */}
                {sections.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-foreground">
                        {sections.length} Section{sections.length !== 1 ? 's' : ''} • {formatDuration(totalDuration)}
                      </span>
                    </div>

                    {sections.map((section, index) => (
                      <div
                        key={section.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`group flex items-center gap-3 p-4 bg-muted/50 rounded-xl border border-border hover:border-muted-foreground/50 transition-all cursor-move ${
                          draggedSection === index ? 'opacity-50' : ''
                        }`}
                      >
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                        <span className="flex items-center justify-center w-8 h-8 bg-card rounded-lg text-sm font-bold text-foreground">
                          {index + 1}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${FILE_CONFIGS[section.type].color}`}>
                              {React.createElement(FILE_CONFIGS[section.type].icon, { className: 'h-4 w-4' })}
                            </div>
                            <p className="font-medium text-foreground truncate">{section.title}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {section.file?.name || 'File uploaded'} • {formatDuration(section.duration)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteSection(section.id)}
                            className="p-2 text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Section */}
                <div className="border-2 border-dashed border-border rounded-xl p-6 space-y-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <PlusCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Add New Section
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      value={newSection.title}
                      onChange={(e) => setNewSection(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Section title"
                      className="px-4 py-2 rounded-lg border border-border bg-background focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all text-foreground placeholder:text-muted-foreground"
                    />

                    <select
                      value={newSection.type}
                      onChange={(e) => setNewSection(prev => ({ ...prev, type: e.target.value as 'video' | 'document' | 'image' }))}
                      className="px-4 py-2 rounded-lg border border-border bg-background focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all text-foreground"
                    >
                      <option value="video">Video</option>
                      <option value="document">Document</option>
                    </select>
                  </div>

                  <textarea
                    value={newSection.description}
                    onChange={(e) => setNewSection(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Section description (optional)"
                    rows={2}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all resize-none text-foreground placeholder:text-muted-foreground"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* File Upload */}
                    <div>
                      {newSection.file ? (
                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/50 rounded-lg">
                          <FileCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium text-green-800 dark:text-green-200 truncate flex-1">
                            {newSection.file.name}
                          </span>
                          <button
                            onClick={() => setNewSection(prev => ({ ...prev, file: null, filePreview: null }))}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all">
                          <input
                            type="file"
                            accept={FILE_CONFIGS[newSection.type].accept}
                            onChange={handleSectionFileUpload}
                            className="hidden"
                          />
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">
                            Upload {newSection.type}
                          </span>
                        </label>
                      )}
                    </div>

                    {/* Duration Input */}
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <input
                        type="number"
                        value={newSection.duration}
                        onChange={(e) => setNewSection(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                        min="60"
                        max="10800"
                        placeholder="Duration (seconds)"
                        className="flex-1 px-4 py-2 rounded-lg border border-border bg-background focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all text-foreground placeholder:text-muted-foreground"
                      />
                      <span className="text-sm text-muted-foreground">{formatDuration(newSection.duration)}</span>
                    </div>
                  </div>

                  <button
                    onClick={addSection}
                    disabled={!newSection.title || !newSection.file}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="h-5 w-5" />
                    Add Section
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Card */}
            {/* FIXED: Removed padding from Card and added rounded-t-xl to CardHeader */}
            <Card className="p-0">
              <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/50 dark:to-orange-950/50 border-b border-border p-0 rounded-t-xl">
                <div className="p-6">
                  <CardTitle className="text-xl font-bold text-card-foreground flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    Pricing & Creator Info
                  </CardTitle>
                  <CardDescription>Set your course price and creator details</CardDescription>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Creator Name *
                  </label>
                  <input
                    value={formData.creatorName}
                    onChange={(e) => setFormData(prev => ({ ...prev, creatorName: e.target.value }))}
                    placeholder="Your name or brand"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all text-foreground placeholder:text-muted-foreground"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Monthly Subscription Price (ETH) *
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                        <span className="text-white font-bold text-xs">ETH</span>
                      </div>
                    </div>
                    <input
                      type="number"
                      value={formData.pricePerMonth}
                      onChange={(e) => setFormData(prev => ({ ...prev, pricePerMonth: e.target.value }))}
                      step="0.001"
                      min="0.001"
                      max="1"
                      className="w-full pl-16 pr-4 py-3 text-lg font-semibold rounded-xl border border-border bg-background focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all text-foreground"
                    />
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Equivalent in IDR:</span>
                      <span className="text-lg font-bold text-foreground">
                        {priceInIDR.toLocaleString('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 0
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                      <span className="text-sm text-muted-foreground">Platform Fee (2%):</span>
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">
                        -{(parseFloat(formData.pricePerMonth) * 0.02).toFixed(6)} ETH
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-semibold text-foreground">Your Earnings:</span>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        {(parseFloat(formData.pricePerMonth) * 0.98).toFixed(6)} ETH
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  Course Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">Sections</span>
                    <span className="font-semibold text-foreground">{sections.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">Total Duration</span>
                    <span className="font-semibold text-foreground">{formatDuration(totalDuration)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">Category</span>
                    <span className="font-semibold text-foreground">
                      {COURSE_CATEGORIES.find(c => c.value === formData.category)?.label || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">Difficulty</span>
                    <span className="font-semibold text-foreground">{formData.difficulty || '-'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Publishing Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
                  <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Publishing Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <button
                    onClick={manualSaveDraft}
                    disabled={!isDraftSupported || isSavingDraft}
                    className="w-full py-3 bg-muted text-muted-foreground font-medium rounded-xl hover:bg-muted/80 hover:text-foreground transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSavingDraft ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Draft
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowPreview(true)}
                    className="w-full py-3 bg-card text-foreground font-medium rounded-xl border-2 border-border hover:border-muted-foreground/50 transition-all flex items-center justify-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Preview Course
                  </button>

                  <button
                    onClick={publishCourse}
                    disabled={isPublishing || !formData.title || !formData.description || !formData.thumbnailFile || sections.length === 0}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        Publish to Blockchain
                      </>
                    )}
                  </button>
                </div>

                {/* Upload Progress */}
                {isPublishing && Object.keys(uploadProgress).length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Upload Progress</h4>
                    {Object.entries(uploadProgress).map(([key, progress]) => (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            {key === 'thumbnail' ? 'Thumbnail' : `Section ${key.replace('section_', '')}`}
                          </span>
                          <span className="text-foreground font-medium">{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Help Card */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Smart Contract Limits
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2"></div>
                  <span>Max 1000 sections per course</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2"></div>
                  <span>Section duration: 1 min - 3 hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2"></div>
                  <span>Max price: 1 ETH per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2"></div>
                  <span>Files stored on IPFS</span>
                </li>
              </ul>
            </div>

            {/* Draft Storage Info */}
            {isDraftSupported && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 rounded-2xl p-6 border border-green-200 dark:border-green-800">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  Enhanced Draft Storage
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2"></div>
                    <span>Large files supported (up to 500MB)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2"></div>
                    <span>Auto-save every second</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2"></div>
                    <span>Works offline</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2"></div>
                    <span>Automatic cleanup</span>
                  </li>
                </ul>
                {lastSavedAt && (
                  <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Last saved: {lastSavedAt.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {!isDraftSupported && (
              <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/50 dark:to-red-950/50 rounded-2xl p-6 border border-orange-200 dark:border-orange-800">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  Limited Storage
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your browser doesn&apos;t support enhanced storage. Draft saving is disabled for large files.
                  Consider using a modern browser for the best experience.
                </p>
              </div>
            )}
          </div>
        </div>
      </FormContainer>

      {/* Course Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-border">
            <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Course Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {formData.thumbnailPreview && (
                <Image
                  src={formData.thumbnailPreview}
                  alt="Course thumbnail"
                  width={400}
                  height={256}
                  className="w-full h-64 object-cover rounded-xl mb-6"
                />
              )}

              <h1 className="text-3xl font-bold text-foreground mb-2">
                {formData.title || 'Untitled Course'}
              </h1>

              <p className="text-muted-foreground mb-6">
                {formData.description || 'No description provided'}
              </p>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">By {formData.creatorName || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{formatDuration(totalDuration)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{formData.pricePerMonth} ETH/month</span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Course Content</h3>
                {sections.map((section, idx) => (
                  <div key={section.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <span className="font-bold text-muted-foreground">{idx + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{section.title}</p>
                      {section.description && (
                        <p className="text-sm text-muted-foreground">{section.description}</p>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">{formatDuration(section.duration)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
