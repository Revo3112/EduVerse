'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Clock, Users, Award, CheckCircle, Zap, Shield, BookOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEthPrice } from '@/hooks/useEthPrice';
import { Course } from '@/lib/mock-data';

interface CourseEnrollmentModalSpaciousProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onEnroll: (courseId: bigint, duration: number) => void;
}

const formatIDR = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const PriceDisplay: React.FC<{ ethAmount: string; className?: string }> = ({ ethAmount, className = '' }) => {
  const { ethToIDR, isLoading, error } = useEthPrice();

  if (isLoading) {
    return (
      <div className={`text-gray-500 text-sm ${className}`}>
        Loading price...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-gray-500 text-sm ${className}`}>
        <span className="text-2xl font-bold">{ethAmount} ETH</span>
      </div>
    );
  }

  const ethValue = parseFloat(ethAmount);
  const idrAmount = ethValue * ethToIDR;

  return (
    <div className={className}>
      <div className="text-2xl font-bold">{ethAmount} ETH</div>
      <div className="text-gray-600 dark:text-gray-400 text-sm">≈ {formatIDR(idrAmount)}</div>
    </div>
  );
};

const weiToEth = (wei: bigint): string => {
  const ethValue = Number(wei) / Math.pow(10, 18);
  return ethValue.toFixed(6);
};

// Format creator address for display (show first 6 and last 4 characters)
const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Duration options based on mobile app - clean and minimalist
const DURATION_OPTIONS = [
  {
    months: 1,
    label: '1 Month',
    description: 'Try it out',
    discount: 0,
    popular: false,
    icon: Clock,
    priceMultiplier: 1
  },
  {
    months: 3,
    label: '3 Months',
    description: 'Most popular',
    discount: 10,
    popular: true,
    icon: Zap,
    priceMultiplier: 2.7 // 3 months * (1 - 10% discount)
  },
  {
    months: 6,
    label: '6 Months',
    description: 'Good value',
    discount: 15,
    popular: false,
    icon: BookOpen,
    priceMultiplier: 5.1 // 6 months * (1 - 15% discount)
  },
  {
    months: 12,
    label: '1 Year',
    description: 'Best value',
    discount: 25,
    popular: false,
    icon: Award,
    priceMultiplier: 9 // 12 months * (1 - 25% discount)
  }
];

export default function CourseEnrollmentModalSpacious({
  isOpen,
  onClose,
  course,
  onEnroll
}: CourseEnrollmentModalSpaciousProps) {
  const [selectedDuration, setSelectedDuration] = useState(1); // Start with 1 month

  if (!course) return null;

  const coursePriceETH = weiToEth(course.pricePerMonth);

  // Use months as ID and calculate based on CourseFactory data
  const selectedOption = DURATION_OPTIONS.find(option => option.months === selectedDuration) || DURATION_OPTIONS[0];
  const basePrice = parseFloat(coursePriceETH);
  const totalPriceETH = (basePrice * selectedOption.priceMultiplier).toFixed(6);
  const originalPriceETH = (basePrice * selectedOption.months).toFixed(6);
  const savingsText = selectedOption.discount > 0 ? `Save ${selectedOption.discount}%` : null;

  const handleEnroll = () => {
    onEnroll(course.id, selectedDuration);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-black rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-black p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{course.title}</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  by {course.creatorName}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-10 w-10 ml-4 flex-shrink-0"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            <div className="p-8">
              {/* Course Information - Real CourseFactory data only */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-semibold">Course Details</h2>
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="text-sm">
                          {course.category}
                        </Badge>
                        <Badge variant="outline" className="text-sm">
                          {course.difficulty}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {course.description}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <h3 className="text-xl font-semibold">Pricing</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Monthly Price</div>
                        <PriceDisplay ethAmount={coursePriceETH} className="text-lg" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Selected Duration</div>
                        <div className="text-lg font-semibold">{selectedOption.label}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{selectedOption.description}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Total Cost</div>
                        <PriceDisplay ethAmount={totalPriceETH} className="text-2xl" />
                        {savingsText && (
                          <div className="text-green-600 text-sm font-medium">{savingsText}</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Duration Selection - Minimalist like mobile app */}
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold">Choose Your Learning Duration</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {DURATION_OPTIONS.map((option) => {
                    const IconComponent = option.icon;
                    const isSelected = selectedDuration === option.months;

                    return (
                      <div
                        key={option.months}
                        className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 hover:shadow-md ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-md'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                        } ${option.popular ? 'ring-1 ring-blue-200' : ''}`}
                        onClick={() => setSelectedDuration(option.months)}
                      >
                        {option.popular && (
                          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                            <Badge className="bg-blue-500 text-white text-xs">
                              Popular
                            </Badge>
                          </div>
                        )}

                        <div className="text-center space-y-2">
                          <IconComponent className={`mx-auto h-8 w-8 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`} />
                          <div>
                            <h3 className="font-semibold">{option.label}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{option.description}</p>
                            {option.discount > 0 && (
                              <p className="text-sm text-green-600 font-medium">Save {option.discount}%</p>
                            )}
                          </div>
                          <div className="text-sm font-medium">
                            <PriceDisplay
                              ethAmount={(basePrice * option.priceMultiplier).toFixed(6)}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Enrollment Summary */}
              <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Enrollment Summary</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedOption.label} access to "{course.title}"
                    </p>
                  </div>
                  <div className="text-right">
                    <PriceDisplay ethAmount={totalPriceETH} className="text-2xl" />
                    {savingsText && (
                      <p className="text-green-600 text-sm font-medium">
                        {savingsText} compared to monthly billing
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleEnroll}
                  className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
                >
                  Enroll Now - {totalPriceETH} ETH
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
