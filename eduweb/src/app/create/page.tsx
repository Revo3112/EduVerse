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
    pricePerMonth: '0.01',
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

    if (!formData.title.trim() || formData.title.length > 200) {
      newErrors.title = 'Title is required and must be 200 characters or less.';
    }
    if (!formData.description.trim() || formData.description.length > 2000) {
      newErrors.description = 'Description is required and must be 2000 characters or less.';
    }
    if (!formData.creatorName.trim() || formData.creatorName.length > 100) {
      newErrors.creatorName = 'Creator name is required and must be 100 characters or less.';
    }
    if (!formData.thumbnailCID.trim() || formData.thumbnailCID.length > 150) {
      newErrors.thumbnailCID = 'Thumbnail CID is required and must be 150 characters or less.';
    }
    const price = parseFloat(formData.pricePerMonth);
    if (isNaN(price) || price <= 0 || price > 1) {
      newErrors.pricePerMonth = 'Price must be between 0.001 and 1 ETH.';
    }
    if (!formData.category) newErrors.category = 'Category is required.';
    if (!formData.difficulty) newErrors.difficulty = 'Difficulty is required.';
    if (sections.length > 1000) newErrors.sections = 'Maximum 1000 sections allowed.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, sections.length]);

  // Price calculations
  const priceInIDR = useMemo(() => {
    const ethPrice = parseFloat(formData.pricePerMonth);
    return isNaN(ethPrice) ? 0 : ethPrice * ethToIDR;
  }, [formData.pricePerMonth, ethToIDR]);

  const platformFee = useMemo(() => {
    const ethPrice = parseFloat(formData.pricePerMonth);
    return isNaN(ethPrice) ? 0 : ethPrice * 0.02; // 2% platform fee
  }, [formData.pricePerMonth]);

  const earnings = useMemo(() => {
    const ethPrice = parseFloat(formData.pricePerMonth);
    return isNaN(ethPrice) ? 0 : ethPrice - platformFee;
  }, [formData.pricePerMonth, platformFee]);

  // Handle form input changes
  const handleInputChange = useCallback((field: keyof CourseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  // Add new section
  const addSection = useCallback(() => {
    // Simplified validation for brevity, add proper checks as in validateForm
    if (!newSection.title.trim() || !newSection.contentCID.trim()) {
        alert("Section title and content CID are required.");
        return;
    }
    setSections(prev => [...prev, { ...newSection, id: Date.now().toString() }]);
    setNewSection({ title: '', contentCID: '', duration: 300, type: 'video' });
  }, [newSection]);

  // Remove section
  const removeSection = useCallback((id: string) => {
    setSections(prev => prev.filter(section => section.id !== id));
  }, []);

  // Format duration display
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // Handle form submission
  const handleSubmit = async (action: 'draft' | 'publish') => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    console.log('Submitting course:', { formData, sections, action });
    await new Promise(resolve => setTimeout(resolve, 2000));
    alert(`Course ${action}ed successfully!`);
    setIsSubmitting(false);
  };

  const totalDuration = sections.reduce((total, section) => total + section.duration, 0);

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Create Your Course
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Share your knowledge with the world and earn cryptocurrency through our decentralized education platform.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-8">
          {/* Course Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Course Information
              </CardTitle>
              <CardDescription>
                Provide the essential details about your course.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Advanced Smart Contract Development with Solidity"
                  maxLength={200}
                />
                <div className="flex justify-between text-sm">
                  {errors.title && <span className="text-destructive">{errors.title}</span>}
                  <span className="text-muted-foreground ml-auto">{formData.title.length}/200</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Course Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe what students will learn, prerequisites, and course outcomes..."
                  rows={6}
                  maxLength={2000}
                  className="resize-none"
                />
                <div className="flex justify-between text-sm">
                  {errors.description && <span className="text-destructive">{errors.description}</span>}
                  <span className="text-muted-foreground ml-auto">{formData.description.length}/2000</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="creatorName">Your Name *</Label>
                  <Input
                    id="creatorName"
                    value={formData.creatorName}
                    onChange={(e) => handleInputChange('creatorName', e.target.value)}
                    placeholder="John Doe"
                    maxLength={100}
                  />
                  <div className="flex justify-between text-sm">
                    {errors.creatorName && <span className="text-destructive">{errors.creatorName}</span>}
                    <span className="text-muted-foreground ml-auto">{formData.creatorName.length}/100</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thumbnailCID">Thumbnail IPFS CID *</Label>
                  <Input
                    id="thumbnailCID"
                    value={formData.thumbnailCID}
                    onChange={(e) => handleInputChange('thumbnailCID', e.target.value)}
                    placeholder="QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                    maxLength={150}
                  />
                  <div className="flex justify-between text-sm">
                    {errors.thumbnailCID && <span className="text-destructive">{errors.thumbnailCID}</span>}
                    <span className="text-muted-foreground ml-auto">{formData.thumbnailCID.length}/150</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>
                      {COURSE_CATEGORIES.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Difficulty Level *</Label>
                  <Select value={formData.difficulty} onValueChange={(value) => handleInputChange('difficulty', value)}>
                    <SelectTrigger><SelectValue placeholder="Select difficulty" /></SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <div>
                            <div className="font-medium">{level.label}</div>
                            <div className="text-xs text-muted-foreground">{level.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.difficulty && <p className="text-sm text-destructive">{errors.difficulty}</p>}
                </div>
              </div>

              <div className="space-y-2">
  <Label htmlFor="price">Monthly Subscription Price *</Label>

  {/* Kontainer utama yang menyatukan input dan konversi */}
  <div className="rounded-lg border bg-background p-4 transition-all focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50">
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground">ETH</span>
      <Input
        id="price"
        value={formData.pricePerMonth}
        onChange={(e) => handleInputChange('pricePerMonth', e.target.value)}
        placeholder="0.00"
        type="number"
        step="0.001"
        min="0.001"
        max="1"
        // Override style Input agar transparan dan menyatu
        className="h-auto flex-1 border-0 bg-transparent p-0 text-2xl font-bold shadow-none outline-none focus-visible:ring-0"
      />
    </div>

    {/* Tampilan konversi Rupiah di bawah input */}
    <div className="mt-1 text-right text-sm text-muted-foreground">
      {priceInIDR > 0 ? (
        <span>
          ≈ <span className="font-semibold text-foreground">
            {priceInIDR.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
          </span>
        </span>
      ) : (
        <span>Enter a price to see IDR conversion</span>
      )}
    </div>
  </div>

  {/* Pesan error tetap di luar kontainer */}
  <div className="flex min-h-[1.25rem] justify-between text-sm">
      {errors.pricePerMonth && <span className="text-destructive">{errors.pricePerMonth}</span>}
      <span className="text-muted-foreground ml-auto">
        1 ETH ≈ {ethToIDR.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
      </span>
  </div>
</div>
            </CardContent>
          </Card>

          {/* Course Sections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Course Content ({sections.length}/1000)
              </CardTitle>
              <CardDescription>
                Add sections and organize your course content. Total Duration: {formatDuration(totalDuration)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Existing Sections */}
              {sections.length > 0 && (
                <div className="space-y-3">
                  {sections.map((section, index) => (
                    <div key={section.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg border">
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-move flex-shrink-0" />
                      <span className="font-mono text-xs text-muted-foreground">{index + 1}</span>
                      <div className="flex-grow min-w-0">
                        <p className="font-medium truncate">{section.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{section.contentCID}</p>
                      </div>
                      <Badge variant="secondary" className="capitalize flex-shrink-0">{section.type}</Badge>
                      <div className="text-sm text-muted-foreground flex-shrink-0">{formatDuration(section.duration)}</div>
                      <Button onClick={() => removeSection(section.id)} variant="ghost" size="icon" className="text-destructive flex-shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Section Form */}
              <div className="p-4 border-2 border-dashed rounded-lg space-y-4">
                <h3 className="text-lg font-semibold">Add New Section</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input value={newSection.title} onChange={(e) => setNewSection(p => ({ ...p, title: e.target.value }))} placeholder="Section Title *" maxLength={200} />
                  <Select value={newSection.type} onValueChange={(value: 'video' | 'document' | 'quiz') => setNewSection(p => ({ ...p, type: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video"><Video className="inline h-4 w-4 mr-2" />Video</SelectItem>
                      <SelectItem value="document"><FileText className="inline h-4 w-4 mr-2" />Document</SelectItem>
                      <SelectItem value="quiz"><CheckCircle className="inline h-4 w-4 mr-2" />Quiz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <Input value={newSection.contentCID} onChange={(e) => setNewSection(p => ({ ...p, contentCID: e.target.value }))} placeholder="Content IPFS CID *" maxLength={150} />
                   <Input value={newSection.duration} onChange={(e) => setNewSection(p => ({ ...p, duration: parseInt(e.target.value) || 60 }))} type="number" min="60" max="10800" placeholder="Duration (seconds) *"/>
                </div>
                <Button onClick={addSection} className="w-full">
                  <PlusCircle className="h-4 w-4 mr-2" /> Add Section
                </Button>
              </div>

              {errors.sections && (
                 <Alert variant="destructive">
                   <AlertCircle className="h-4 w-4" />
                   <AlertDescription>{errors.sections}</AlertDescription>
                 </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:sticky lg:top-8">
          <Card>
            <CardHeader><CardTitle>Publish Course</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={() => handleSubmit('draft')} disabled={isSubmitting} variant="outline" className="w-full">
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save as Draft
              </Button>
              <Button disabled={isSubmitting} variant="outline" className="w-full">
                <Eye className="h-4 w-4 mr-2" /> Preview Course
              </Button>
              <Button onClick={() => handleSubmit('publish')} disabled={isSubmitting} className="w-full">
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Publish Course
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Earnings Preview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Course Price:</span>
                <span className="font-medium">{formData.pricePerMonth || '0'} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform Fee (2%):</span>
                <span className="font-medium text-destructive">-{platformFee.toFixed(6)} ETH</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span className="text-foreground">Your Earnings:</span>
                <span className="text-green-600 dark:text-green-500">{earnings.toFixed(6)} ETH</span>
              </div>
              {earnings > 0 && <div className="text-xs text-muted-foreground text-right">≈ Rp {(earnings * ethToIDR).toLocaleString('id-ID')}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Smart Contract Limits</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>• Max sections: 1000 per course</p>
              <p>• Section duration: 1 min - 3 hours</p>
              <p>• Max price: 1 ETH per month</p>
              <p>• Title: 200 characters max</p>
              <p>• Description: 2000 characters max</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateCoursePage;
