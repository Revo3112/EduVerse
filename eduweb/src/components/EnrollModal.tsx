'use client';

import { useState, memo, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Clock, Users, Award, CheckCircle, Zap, Shield, BookOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEthPrice } from '@/hooks/useEthPrice';
import { Course } from '@/lib/mock-data';

interface EnrollModalProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onEnroll: (courseId: bigint, duration: number) => void;
}

// Memoized helper functions
const formatIDR = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const weiToEth = (wei: bigint): string => {
  const ethValue = Number(wei) / Math.pow(10, 18);
  return ethValue.toFixed(6);
};

const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Memoized PriceDisplay component with improved state handling
const PriceDisplay = memo<{ ethAmount: string; className?: string }>(({ ethAmount, className = '' }) => {
  const { ethToIDR, isLoading, error, lastUpdated } = useEthPrice();

  const priceContent = useMemo(() => {
    if (isLoading && !ethToIDR) {
      return (
        <div className={`text-gray-500 text-sm ${className}`}>
          <div className="animate-pulse">Loading price...</div>
        </div>
      );
    }

    if (error && !ethToIDR) {
      return (
        <div className={`text-gray-500 text-sm ${className}`}>
          <span className="text-2xl font-bold">{ethAmount} ETH</span>
          <div className="text-xs text-red-500">Price unavailable</div>
        </div>
      );
    }

    const ethValue = parseFloat(ethAmount);
    const idrAmount = ethValue * ethToIDR;

    return (
      <div className={className}>
        <div className="text-2xl font-bold">{ethAmount} ETH</div>
        {ethToIDR > 0 && (
          <div className="text-gray-600 dark:text-gray-400 text-sm">
            ≈ {formatIDR(idrAmount)}
            {lastUpdated && (
              <span className="text-xs ml-1 text-gray-500">
                ({new Date(lastUpdated).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: 'numeric',
                  second: 'numeric'
                })})
              </span>
            )}
          </div>
        )}
      </div>
    );
  }, [ethAmount, ethToIDR, isLoading, error, lastUpdated, className]);

  return priceContent;
});

PriceDisplay.displayName = 'PriceDisplay';

// Duration options - memoized to prevent recreation
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
    discount: 20,
    popular: false,
    icon: Award,
    priceMultiplier: 9.6 // 12 months * (1 - 20% discount)
  }
];

const EnrollModal = memo<EnrollModalProps>(({ course, isOpen, onClose, onEnroll }) => {
  const [selectedDuration, setSelectedDuration] = useState(3); // Default to 3 months

  // Memoize expensive calculations
  const courseData = useMemo(() => ({
    priceInEth: weiToEth(course.pricePerMonth),
    formattedCreator: formatAddress(course.creatorName),
  }), [course.pricePerMonth, course.creatorName]);

  const selectedOption = useMemo(() =>
    DURATION_OPTIONS.find(option => option.months === selectedDuration) || DURATION_OPTIONS[1],
    [selectedDuration]
  );

  const totalPrice = useMemo(() => {
    const basePrice = parseFloat(courseData.priceInEth);
    return (basePrice * selectedOption.priceMultiplier).toFixed(6);
  }, [courseData.priceInEth, selectedOption.priceMultiplier]);

  const handleEnroll = useCallback(() => {
    onEnroll(course.id, selectedDuration);
    onClose();
  }, [onEnroll, course.id, selectedDuration, onClose]);

  const handleDurationSelect = useCallback((months: number) => {
    setSelectedDuration(months);
  }, []);

  // Additional calculated values
  const savingsText = selectedOption.discount > 0 ? `Save ${selectedOption.discount}%` : null;

  if (!course) return null;

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
                        <PriceDisplay ethAmount={courseData.priceInEth} className="text-lg" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Selected Duration</div>
                        <div className="text-lg font-semibold">{selectedOption.label}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{selectedOption.description}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Total Cost</div>
                        <PriceDisplay ethAmount={totalPrice} className="text-2xl" />
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
                              ethAmount={(parseFloat(courseData.priceInEth) * option.priceMultiplier).toFixed(6)}
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
                      {selectedOption.label} access to &ldquo;{course.title}&rdquo;
                    </p>
                  </div>
                  <div className="text-right">
                    <PriceDisplay ethAmount={totalPrice} className="text-2xl" />
                    {savingsText && (
                      <p className="text-green-600 text-sm font-medium">
                        {savingsText} compared to monthly billing
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleEnroll}
                  className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg text-white"
                >
                  Enroll Now - {totalPrice} ETH
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

EnrollModal.displayName = 'EnrollModal';

export default EnrollModal;
