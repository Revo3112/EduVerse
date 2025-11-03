'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useEthPrice } from '@/hooks/useEthPrice';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Award, BookOpen, Clock, X, Zap } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';

interface RenewLicenseModalProps {
  courseId: number;
  courseTitle: string;
  creatorName: string;
  pricePerMonth: bigint;
  isOpen: boolean;
  onClose: () => void;
  onRenew: (courseId: number, duration: number) => void;
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

// Memoized PriceDisplay component
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

// Duration options - SAME PRICING AS INITIAL PURCHASE (per business logic)
const DURATION_OPTIONS = [
  {
    months: 1,
    label: '1 Month',
    description: 'Continue learning',
    icon: Clock,
    priceMultiplier: 1
  },
  {
    months: 3,
    label: '3 Months',
    description: 'Most popular',
    popular: true,
    icon: Zap,
    priceMultiplier: 3
  },
  {
    months: 6,
    label: '6 Months',
    description: 'Good value',
    icon: BookOpen,
    priceMultiplier: 6
  },
  {
    months: 12,
    label: '1 Year',
    description: 'Best value',
    icon: Award,
    priceMultiplier: 12
  }
];

const RenewLicenseModal = memo<RenewLicenseModalProps>(({
  courseId,
  courseTitle,
  creatorName,
  pricePerMonth,
  isOpen,
  onClose,
  onRenew
}) => {
  const [selectedDuration, setSelectedDuration] = useState(3); // Default to 3 months

  // Memoize expensive calculations
  const priceInEth = useMemo(() => weiToEth(pricePerMonth), [pricePerMonth]);

  const selectedOption = useMemo(() =>
    DURATION_OPTIONS.find(option => option.months === selectedDuration) || DURATION_OPTIONS[1],
    [selectedDuration]
  );

  const totalPrice = useMemo(() => {
    const basePrice = parseFloat(priceInEth);
    return (basePrice * selectedOption.priceMultiplier).toFixed(6);
  }, [priceInEth, selectedOption.priceMultiplier]);

  const handleRenew = useCallback(() => {
    onRenew(courseId, selectedDuration);
    onClose();
  }, [onRenew, courseId, selectedDuration, onClose]);

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
            className="bg-white dark:bg-black rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-black p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div className="flex-1">
                <h1 className="text-2xl font-bold">Renew License</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {courseTitle}
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
              {/* Business Logic Notice */}
              <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-900 dark:text-blue-100">
                      <p className="font-semibold mb-1">License Renewal</p>
                      <p>Your license has expired. Renew to continue accessing course materials and track your progress. Same pricing as initial purchase applies.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Duration Selection */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Select Duration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {DURATION_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedDuration === option.months;
                    const optionPrice = (parseFloat(priceInEth) * option.priceMultiplier).toFixed(6);

                    return (
                      <Card
                        key={option.months}
                        className={`cursor-pointer transition-all hover:shadow-lg ${isSelected
                            ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500 dark:ring-blue-400'
                            : 'border-gray-200 dark:border-gray-700'
                          }`}
                        onClick={() => setSelectedDuration(option.months)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <Icon className={`h-6 w-6 ${isSelected ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400'}`} />
                            {option.popular && (
                              <Badge variant="secondary" className="text-xs">Popular</Badge>
                            )}
                          </div>
                          <h4 className="font-bold text-lg mb-1">{option.label}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{option.description}</p>
                          <div className="text-sm">
                            <span className="font-semibold">{optionPrice} ETH</span>
                            <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">
                              / {option.months} month{option.months > 1 ? 's' : ''}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Price Summary */}
              <Card className="mb-6">
                <CardHeader>
                  <h3 className="text-xl font-semibold">Payment Summary</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Course</span>
                    <span className="font-medium">{courseTitle}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Instructor</span>
                    <span className="font-medium">{creatorName}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Duration</span>
                    <span className="font-medium">{selectedOption.label}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Price per Month</span>
                    <span className="font-medium">{priceInEth} ETH</span>
                  </div>
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                      <span className="text-lg font-semibold">Total</span>
                      <PriceDisplay ethAmount={totalPrice} className="text-right" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  size="lg"
                  onClick={handleRenew}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Renew License
                </Button>
              </div>

              {/* Business Logic Note */}
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
                Renewal uses same pricing as initial purchase. License will be extended from current time.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

RenewLicenseModal.displayName = 'RenewLicenseModal';

export default RenewLicenseModal;
