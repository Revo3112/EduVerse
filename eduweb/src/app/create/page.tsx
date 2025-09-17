"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  FileText,
  GripVertical,
  Loader2,
  PlusCircle,
  Save,
  Trash2,
  Upload,
  Video
} from "lucide-react";
import React, { useCallback, useMemo, useState } from 'react';

// Mock useEthPrice hook (replace with your actual hook)
const useEthPrice = () => ({
  ethToIDR: 71500000, // Example rate
  isLoading: false,
  error: null,
  lastUpdated: new Date(),
  refetch: () => {}
});

// Course categories from smart contract
const COURSE_CATEGORIES = [
  { value: 'Programming', label: 'Programming' },
  { value: 'Design', label: 'Design' },
  { value: 'Business', label: 'Business' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'DataScience', label: 'Data Science' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Language', label: 'Language' },
  { value: 'Arts', label: 'Arts' },
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'Science', label: 'Science' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Technology', label: 'Technology' },
  { value: 'Education', label: 'Education' },
  { value: 'Psychology', label: 'Psychology' },
  { value: 'Culinary', label: 'Culinary' },
  { value: 'PersonalDevelopment', label: 'Personal Development' },
  { value: 'Legal', label: 'Legal' },
  { value: 'Sports', label: 'Sports' },
  { value: 'Other', label: 'Other' }
];

const DIFFICULTY_LEVELS = [
  { value: 'Beginner', label: 'Beginner', description: 'Entry level, no prerequisites' },
  { value: 'Intermediate', label: 'Intermediate', description: 'Some background knowledge required' },
  { value: 'Advanced', label: 'Advanced', description: 'Expert level, extensive prerequisites' }
];

interface CourseSection {
  id: string;
  title: string;
  contentCID: string;
  duration: number; // in seconds
  type: 'video' | 'document' | 'quiz';
}

interface CourseFormData {
  title: string;
  description: string;
  thumbnailCID: string;
  creatorName: string;
  pricePerMonth: string;
  category: string;
  difficulty: string;
}

const CreateCoursePage = () => {
  const { ethToIDR, isLoading: priceLoading } = useEthPrice();

  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    thumbnailCID: '',
    creatorName: '',
    pricePerMonth: '',
    category: '',
    difficulty: ''
  });

  const [sections, setSections] = useState<CourseSection[]>([]);
  const [newSection, setNewSection] = useState<{
    title: string;
    contentCID: string;
    duration: number;
    type: 'video' | 'document' | 'quiz';
  }>({
    title: '',
    contentCID: '',
    duration: 300, // 5 minutes default
    type: 'video'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation rules based on smart contract
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    // Title validation (max 200 chars)
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be 200 characters or less';
    }

    // Description validation (max 2000 chars for create, 1000 for update)
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 2000) {
      newErrors.description = 'Description must be 2000 characters or less';
    }

    // Creator name validation (max 100 chars)
    if (!formData.creatorName.trim()) {
      newErrors.creatorName = 'Creator name is required';
    } else if (formData.creatorName.length > 100) {
      newErrors.creatorName = 'Creator name must be 100 characters or less';
    }

    // Thumbnail CID validation (max 150 chars)
    if (!formData.thumbnailCID.trim()) {
      newErrors.thumbnailCID = 'Thumbnail CID is required';
    } else if (formData.thumbnailCID.length > 150) {
      newErrors.thumbnailCID = 'Thumbnail CID must be 150 characters or less';
    }

    // Price validation (cannot be 0, max 1 ETH)
    const price = parseFloat(formData.pricePerMonth);
    if (!formData.pricePerMonth || isNaN(price)) {
      newErrors.pricePerMonth = 'Price is required';
    } else if (price <= 0) {
      newErrors.pricePerMonth = 'Price cannot be zero';
    } else if (price > 1) {
      newErrors.pricePerMonth = 'Price cannot exceed 1 ETH';
    }

    // Category validation
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    // Difficulty validation
    if (!formData.difficulty) {
      newErrors.difficulty = 'Difficulty level is required';
    }

    // Sections validation (max 1000 sections)
    if (sections.length > 1000) {
      newErrors.sections = 'Maximum 1000 sections allowed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, sections.length]);

  // Price calculations
  const priceInIDR = useMemo(() => {
    const ethPrice = parseFloat(formData.pricePerMonth);
    if (isNaN(ethPrice) || ethPrice <= 0) return 0;
    return ethPrice * ethToIDR;
  }, [formData.pricePerMonth, ethToIDR]);

  const platformFee = useMemo(() => {
    const ethPrice = parseFloat(formData.pricePerMonth);
    if (isNaN(ethPrice) || ethPrice <= 0) return 0;
    return ethPrice * 0.02; // 2% platform fee
  }, [formData.pricePerMonth]);

  const earnings = useMemo(() => {
    const ethPrice = parseFloat(formData.pricePerMonth);
    if (isNaN(ethPrice) || ethPrice <= 0) return 0;
    return ethPrice - platformFee;
  }, [formData.pricePerMonth, platformFee]);

  // Handle form input changes
  const handleInputChange = useCallback((field: keyof CourseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  // Add new section
  const addSection = useCallback(() => {
    if (!newSection.title.trim()) return;

    const sectionErrors: Record<string, string> = {};

    // Validate section title (max 200 chars)
    if (newSection.title.length > 200) {
      sectionErrors.sectionTitle = 'Section title must be 200 characters or less';
    }

    // Validate content CID (max 150 chars)
    if (!newSection.contentCID.trim()) {
      sectionErrors.sectionCID = 'Content CID is required';
    } else if (newSection.contentCID.length > 150) {
      sectionErrors.sectionCID = 'Content CID must be 150 characters or less';
    }

    // Validate duration (60-10800 seconds)
    if (newSection.duration < 60) {
      sectionErrors.sectionDuration = 'Duration must be at least 60 seconds';
    } else if (newSection.duration > 10800) {
      sectionErrors.sectionDuration = 'Duration cannot exceed 10800 seconds (3 hours)';
    }

    if (Object.keys(sectionErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...sectionErrors }));
      return;
    }

    const section: CourseSection = {
      id: Date.now().toString(),
      title: newSection.title,
      contentCID: newSection.contentCID,
      duration: newSection.duration,
      type: newSection.type
    };

    setSections(prev => [...prev, section]);
    setNewSection({
      title: '',
      contentCID: '',
      duration: 300,
      type: 'video'
    });

    // Clear section-related errors
    const clearedErrors = { ...errors };
    delete clearedErrors.sectionTitle;
    delete clearedErrors.sectionCID;
    delete clearedErrors.sectionDuration;
    setErrors(clearedErrors);
  }, [newSection, errors]);

  // Remove section
  const removeSection = useCallback((id: string) => {
    setSections(prev => prev.filter(section => section.id !== id));
  }, []);

  // Format duration display
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle form submission
  const handleSubmit = async (action: 'draft' | 'publish') => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Here you would call your smart contract function
      console.log('Submitting course:', { formData, sections, action });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Success handling
      alert(`Course ${action === 'draft' ? 'saved as draft' : 'published'} successfully!`);
    } catch (error) {
      console.error('Error submitting course:', error);
      alert('Failed to submit course. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalDuration = sections.reduce((total, section) => total + section.duration, 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            Create Your Course
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Share your knowledge with the world and earn cryptocurrency through our decentralized education platform
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-8">
            {/* Course Details */}
            <Card className="border border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Course Information
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Provide the essential details about your course
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-foreground">Course Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="e.g., Advanced Smart Contract Development with Solidity"
                    maxLength={200}
                    className="bg-background border-border text-foreground placeholder-muted-foreground focus:border-ring"
                  />
                  <div className="flex justify-between text-sm">
                    {errors.title && <span className="text-destructive">{errors.title}</span>}
                    <span className="text-muted-foreground ml-auto">{formData.title.length}/200</span>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-foreground">Course Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe what students will learn, prerequisites, and course outcomes..."
                    rows={6}
                    maxLength={2000}
                    className="bg-background border-border text-foreground placeholder-muted-foreground focus:border-ring resize-none"
                  />
                  <div className="flex justify-between text-sm">
                    {errors.description && <span className="text-destructive">{errors.description}</span>}
                    <span className="text-muted-foreground ml-auto">{formData.description.length}/2000</span>
                  </div>
                </div>

                {/* Creator Name & Thumbnail */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="creatorName" className="text-slate-200">Your Name *</Label>
                    <Input
                      id="creatorName"
                      value={formData.creatorName}
                      onChange={(e) => handleInputChange('creatorName', e.target.value)}
                      placeholder="John Doe"
                      maxLength={100}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-400"
                    />
                    <div className="flex justify-between text-sm">
                      {errors.creatorName && <span className="text-red-400">{errors.creatorName}</span>}
                      <span className="text-slate-400 ml-auto">{formData.creatorName.length}/100</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="thumbnailCID" className="text-slate-200">Thumbnail IPFS CID *</Label>
                    <Input
                      id="thumbnailCID"
                      value={formData.thumbnailCID}
                      onChange={(e) => handleInputChange('thumbnailCID', e.target.value)}
                      placeholder="QmXxXxXxXxXxXxXxXxXxXxXxXxXxXx"
                      maxLength={150}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-400"
                    />
                    <div className="flex justify-between text-sm">
                      {errors.thumbnailCID && <span className="text-red-400">{errors.thumbnailCID}</span>}
                      <span className="text-slate-400 ml-auto">{formData.thumbnailCID.length}/150</span>
                    </div>
                  </div>
                </div>

                {/* Category & Difficulty */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-200">Category *</Label>
                    <Select value={formData.category} onValueChange={(value: string) => handleInputChange('category', value)}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {COURSE_CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value} className="text-white hover:bg-slate-700">
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category && <span className="text-red-400 text-sm">{errors.category}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-200">Difficulty Level *</Label>
                    <Select value={formData.difficulty} onValueChange={(value: string) => handleInputChange('difficulty', value)}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {DIFFICULTY_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value} className="text-white hover:bg-slate-700">
                            <div>
                              <div className="font-medium">{level.label}</div>
                              <div className="text-sm text-slate-400">{level.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.difficulty && <span className="text-red-400 text-sm">{errors.difficulty}</span>}
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-4">
                  <Label className="text-slate-200">Monthly Subscription Price *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      value={formData.pricePerMonth}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('pricePerMonth', e.target.value)}
                      placeholder="0.01"
                      type="number"
                      step="0.001"
                      min="0.001"
                      max="1"
                      className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-400"
                    />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm font-medium">
                          ETH
                        </span>
                      </div>
                      {errors.pricePerMonth && <span className="text-red-400 text-sm">{errors.pricePerMonth}</span>}
                    </div>

                    <div className="space-y-1">
                      {priceLoading ? (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading price...
                        </div>
                      ) : (
                        <div className="text-slate-300">
                          <div className="text-lg font-semibold">
                            ≈ Rp {priceInIDR.toLocaleString('id-ID')}
                          </div>
                          <div className="text-sm text-slate-400">
                            1 ETH = Rp {ethToIDR.toLocaleString('id-ID')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Course Sections */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Course Content ({sections.length}/1000)
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Add sections and organize your course content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add New Section */}
                <div className="p-6 border-2 border-dashed border-slate-600 rounded-lg bg-slate-700/30">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Add New Section</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-200">Section Title *</Label>
                        <Input
                          value={newSection.title}
                          onChange={(e) => setNewSection(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g., Introduction to Smart Contracts"
                          maxLength={200}
                          className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                        />
                        {errors.sectionTitle && <span className="text-red-400 text-sm">{errors.sectionTitle}</span>}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-200">Content Type</Label>
                        <Select value={newSection.type} onValueChange={(value: 'video' | 'document' | 'quiz') => setNewSection(prev => ({ ...prev, type: value }))}>
                          <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="video" className="text-white"><Video className="inline h-4 w-4 mr-2" />Video</SelectItem>
                            <SelectItem value="document" className="text-white"><FileText className="inline h-4 w-4 mr-2" />Document</SelectItem>
                            <SelectItem value="quiz" className="text-white"><CheckCircle className="inline h-4 w-4 mr-2" />Quiz</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-200">Content IPFS CID *</Label>
                        <Input
                          value={newSection.contentCID}
                          onChange={(e) => setNewSection(prev => ({ ...prev, contentCID: e.target.value }))}
                          placeholder="QmXxXxXxXxXxXxXxXxXxXxXxXxXxXx"
                          maxLength={150}
                          className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                        />
                        {errors.sectionCID && <span className="text-red-400 text-sm">{errors.sectionCID}</span>}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-200">Duration (seconds) *</Label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            value={newSection.duration}
                            onChange={(e) => setNewSection(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                            type="number"
                            min="60"
                            max="10800"
                            className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs">
                            {formatDuration(newSection.duration)}
                          </span>
                        </div>
                        {errors.sectionDuration && <span className="text-red-400 text-sm">{errors.sectionDuration}</span>}
                      </div>
                    </div>

                    <Button
                      onClick={addSection}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Section
                    </Button>
                  </div>
                </div>

                {/* Existing Sections */}
                {sections.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">Course Sections</h3>
                      <div className="text-sm text-slate-400">
                        Total Duration: {formatDuration(totalDuration)}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {sections.map((section) => (
                        <div key={section.id} className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                          <GripVertical className="h-4 w-4 text-slate-400 cursor-move" />

                          <div className="flex-shrink-0">
                            {section.type === 'video' && <Video className="h-4 w-4 text-blue-400" />}
                            {section.type === 'document' && <FileText className="h-4 w-4 text-green-400" />}
                            {section.type === 'quiz' && <CheckCircle className="h-4 w-4 text-yellow-400" />}
                          </div>

                          <div className="flex-grow min-w-0">
                            <div className="text-white font-medium truncate">{section.title}</div>
                            <div className="text-sm text-slate-400 flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              {formatDuration(section.duration)}
                              <span className="text-slate-500">•</span>
                              <span className="truncate">{section.contentCID}</span>
                            </div>
                          </div>

                          <Badge variant="secondary" className="capitalize">
                            {section.type}
                          </Badge>

                          <Button
                            onClick={() => removeSection(section.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {errors.sections && (
                  <Alert className="border-red-500/50 bg-red-900/20">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-400">
                      {errors.sections}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Publish Course</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => handleSubmit('draft')}
                  disabled={isSubmitting}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save as Draft
                </Button>

                <Button
                  disabled={isSubmitting}
                  variant="outline"
                  className="w-full border-blue-500 text-blue-400 hover:bg-blue-900/20"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Course
                </Button>

                <Button
                  onClick={() => handleSubmit('publish')}
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Publish Course
                </Button>
              </CardContent>
            </Card>

            {/* Earnings Preview */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Earnings Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Course Price:</span>
                    <span className="text-white font-medium">{formData.pricePerMonth || '0'} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Platform Fee (2%):</span>
                    <span className="text-red-400">-{platformFee.toFixed(6)} ETH</span>
                  </div>
                  <Separator className="bg-slate-600" />
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-200">Your Earnings:</span>
                    <span className="text-green-400">{earnings.toFixed(6)} ETH</span>
                  </div>
                  {earnings > 0 && (
                    <div className="text-xs text-slate-400">
                      ≈ Rp {(earnings * ethToIDR).toLocaleString('id-ID')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Guidelines */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-sm">Smart Contract Limits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-400">
                <div className="space-y-1">
                  <div>• Max sections: 1000 per course</div>
                  <div>• Section duration: 1 min - 3 hours</div>
                  <div>• Max price: 1 ETH per month</div>
                  <div>• Title: 200 characters max</div>
                  <div>• Description: 2000 characters max</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCoursePage;
