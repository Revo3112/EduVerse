'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Star, Clock, Users, Award, CheckCircle, Zap, Shield, BookOpen } from 'lucide-react';
import { useEthPrice } from '../hooks/useEthPrice';
import { Course, getDifficultyName, getCategoryName, weiToEth } from '@/lib/mock-data';

interface CourseEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  onEnroll: (courseId: bigint, duration: number) => void;
}

// Utility function for IDR formatting
const formatIDR = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Professional PriceDisplay component
const PriceDisplay: React.FC<{ ethAmount: string; className?: string }> = ({ ethAmount, className = '' }) => {
  const { ethToIDR, isLoading, error } = useEthPrice();

  const ethValue = parseFloat(ethAmount);
  const idrValue = ethValue * ethToIDR;

  if (isLoading) {
    return (
      <div className={`flex items-baseline gap-1 ${className}`}>
        <span className="text-2xl font-bold text-foreground">{ethAmount} ETH</span>
        <span className="text-sm text-muted-foreground animate-pulse">(Loading...)</span>
      </div>
    );
  }

  if (error || !ethToIDR) {
    return (
      <div className={`flex items-baseline gap-1 ${className}`}>
        <span className="text-2xl font-bold text-foreground">{ethAmount} ETH</span>
      </div>
    );
  }

  return (
    <div className={`flex items-baseline gap-1.5 ${className}`}>
      <span className="text-2xl font-bold text-foreground">{ethAmount} ETH</span>
      <span className="text-sm text-muted-foreground">({formatIDR(idrValue)})</span>
    </div>
  );
};

const DURATION_OPTIONS = [
  {
    id: 1,
    label: '1 Month Access',
    shortLabel: '1 Month',
    description: 'Perfect for trying out',
    priceMultiplier: 1,
    popular: false,
    icon: Clock,
    features: [
      'Full course content access',
      'Community discussion access',
      'Mobile app access',
      'Basic email support'
    ],
    savings: null
  },
  {
    id: 3,
    label: '3 Months Access',
    shortLabel: '3 Months',
    description: 'Most popular choice',
    priceMultiplier: 2.5, // Discount applied
    popular: true,
    icon: Zap,
    features: [
      'Full course content access',
      'Community discussion access',
      'Mobile app access',
      'Priority email support',
      'Completion certificate',
      'Downloadable resources',
      'Progress tracking'
    ],
    savings: '17% off monthly rate'
  },
  {
    id: 12,
    label: '1 Year Access',
    shortLabel: '1 Year',
    description: 'Best value for serious learners',
    priceMultiplier: 7.5, // Bigger discount
    popular: false,
    icon: Award,
    features: [
      'Full course content access',
      'Community discussion access',
      'Mobile app access',
      'Priority email support',
      'Completion certificate',
      'Downloadable resources',
      'Progress tracking',
      'Lifetime updates',
      'Direct instructor access',
      '1-on-1 mentoring session'
    ],
    savings: '38% off monthly rate'
  }
];

export default function CourseEnrollmentModal({
  isOpen,
  onClose,
  course,
  onEnroll
}: CourseEnrollmentModalProps) {
  const [selectedDuration, setSelectedDuration] = useState(1); // Duration in months

  if (!course) return null;

  const selectedOption = DURATION_OPTIONS.find(opt => opt.id === selectedDuration) || DURATION_OPTIONS[1];
  const coursePriceETH = weiToEth(course.pricePerMonth);
  const totalPriceETH = (parseFloat(coursePriceETH) * selectedOption.priceMultiplier).toFixed(6);

  // Mock data for display (this would come from backend in real app)
  const courseDisplayData = {
    students: 15420,
    rating: 4.8,
    instructor: "Dr. Sarah Johnson", // Mock instructor name
    duration: "12 weeks" // Mock duration
  };

  const handleEnroll = () => {
    onEnroll(course.id, selectedDuration);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[98vw] max-w-[4400px] max-h-[95vh] overflow-y-auto">
        {/* Professional Header with Gradient */}
        <div className="relative overflow-hidden rounded-t-lg bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 p-8 text-white">
          <div className="relative z-10">
            <DialogHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-3 max-w-4xl">
                  <DialogTitle className="text-3xl font-bold leading-tight">
                    {course.title}
                  </DialogTitle>
                  <DialogDescription className="text-blue-100 text-lg leading-relaxed">
                    {course.description}
                  </DialogDescription>
                  <div className="flex items-center gap-6 text-blue-100">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">{courseDisplayData.students.toLocaleString()} students</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">{courseDisplayData.rating}/5</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{courseDisplayData.duration}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <Badge variant="secondary" className="text-xs">
                    {getCategoryName(course.category)}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-white/10 border-white/20 text-white">
                    {getDifficultyName(course.difficulty)}
                  </Badge>
                </div>
              </div>
            </DialogHeader>
          </div>
          {/* Decorative background pattern */}
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>

        <div className="p-8 space-y-8">
          {/* Two Column Layout for Better Width Utilization */}
          <div className="grid xl:grid-cols-3 gap-8">
            {/* Left Column - Course Info & Duration Selection */}
            <div className="xl:col-span-2 space-y-8">
              {/* Instructor Info */}
              <div className="flex items-center justify-between p-6 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 rounded-xl border">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {courseDisplayData.instructor.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Taught by</p>
                    <p className="font-semibold text-lg">{courseDisplayData.instructor}</p>
                  </div>
                </div>
                <Badge variant="outline" className="h-8 px-4">
                  <Shield className="h-3 w-3 mr-1" />
                  Verified Instructor
                </Badge>
              </div>

              {/* Duration Selection */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                  <h3 className="text-2xl font-bold">Choose Your Learning Duration</h3>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {DURATION_OPTIONS.map((option) => {
                    const IconComponent = option.icon;
                    const isSelected = selectedDuration === option.id;

                    return (
                      <Card
                        key={option.id}
                        className={`relative cursor-pointer transition-all duration-300 hover:shadow-xl ${
                          isSelected
                            ? 'ring-2 ring-blue-500 shadow-lg border-blue-200 dark:border-blue-700'
                            : 'hover:border-blue-200 dark:hover:border-blue-800'
                        } ${option.popular ? 'transform scale-105' : ''}`}
                        onClick={() => setSelectedDuration(option.id)}
                      >
                        {option.popular && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1">
                              Most Popular
                            </Badge>
                          </div>
                        )}

                        <CardHeader className="text-center space-y-4 pb-4">
                          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                            isSelected
                              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                              : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                          }`}>
                            <IconComponent className="h-8 w-8" />
                          </div>
                          <div>
                            <CardTitle className="text-xl">{option.shortLabel}</CardTitle>
                            <CardDescription className="text-sm mt-1">{option.description}</CardDescription>
                          </div>
                          <div className="space-y-1">
                            <PriceDisplay ethAmount={(parseFloat(coursePriceETH) * option.priceMultiplier).toFixed(6)} className="justify-center" />
                            {option.savings && (
                              <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                                {option.savings}
                              </p>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            {option.features.map((feature, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column - Features & Payment Summary */}
            <div className="space-y-6">
              {/* What You'll Get Section */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                <h4 className="text-lg font-semibold mb-4 text-green-800 dark:text-green-200">
                  What you'll get:
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm">Lifetime access to course content</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm">Mobile and desktop compatibility</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm">Community discussion access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm">Progress tracking and analytics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm">Downloadable resources</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm">30-day money-back guarantee</span>
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 space-y-4 sticky top-4">
                <h4 className="text-lg font-semibold">Payment Summary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Course</span>
                    <span className="font-medium text-sm">{course.title}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Duration</span>
                    <span className="font-medium">{selectedOption.label}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Access Level</span>
                    <Badge variant="outline">{selectedOption.features.length} Features</Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-semibold">Total</span>
                    <PriceDisplay ethAmount={totalPriceETH} />
                  </div>
                  {selectedOption.savings && (
                    <p className="text-center text-sm text-green-600 dark:text-green-400 font-medium">
                      You save {selectedOption.savings}!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-8 pt-0 space-x-4">
          <Button
            variant="outline"
            onClick={onClose}
            size="lg"
            className="px-8 py-3 text-base"
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleEnroll}
            size="lg"
            className="px-8 py-3 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
          >
            <Award className="h-5 w-5 mr-2" />
            Enroll Now - {totalPriceETH} ETH
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
