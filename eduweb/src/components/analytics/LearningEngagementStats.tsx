"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Star, BookOpen, CheckCircle2, Trophy } from "lucide-react";
import { EduVerseAnalyticsMetrics } from "@/app/analytics/page";

interface LearningEngagementStatsProps {
    metrics: EduVerseAnalyticsMetrics;
}

export function LearningEngagementStats({ metrics }: LearningEngagementStatsProps) {
    // Calculate completion rate based on the existing logic: Courses / Sections
    // This seems to track "Courses Completed per Section Completed" ratio
    const completionRate =
        metrics.totalSectionsCompleted > 0
            ? (metrics.totalCoursesCompleted / metrics.totalSectionsCompleted) * 100
            : 0;

    // Waffle Chart Data
    // We want to show 100 cells (10x10 grid)
    // Filled cells = completionRate
    const totalCells = 100;
    const filledCells = Math.min(Math.round(completionRate), 100);

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="grid grid-cols-2 gap-4">
                {/* Sections Completed */}
                <div className="bg-muted/30 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 border hover:border-primary/20 transition-colors">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                        <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-foreground">
                            {metrics.totalSectionsCompleted}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            Sections Done
                        </p>
                    </div>
                </div>

                {/* Courses Finished */}
                <div className="bg-muted/30 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 border hover:border-primary/20 transition-colors">
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                        <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-foreground">
                            {metrics.totalCoursesCompleted}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            Courses Finished
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <h4 className="text-sm font-medium">Completion Efficiency</h4>
                        <p className="text-xs text-muted-foreground">
                            Courses finished per section
                        </p>
                    </div>
                </div>

                {/* Semi-Circle Gauge */}
                <div className="relative flex items-end justify-center h-[140px] w-full overflow-hidden">
                    <svg viewBox="0 0 200 130" className="w-full h-full max-w-[280px]">
                        {/* Layer 1: Container Border (Wider stroke) */}
                        <path
                            d="M 20 100 A 80 80 0 0 1 180 100"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="24"
                            strokeLinecap="round"
                            className="text-muted-foreground/10"
                        />

                        {/* Layer 2: Track Background (Overlay to create border effect) */}
                        <path
                            d="M 20 100 A 80 80 0 0 1 180 100"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="20"
                            strokeLinecap="round"
                            className="text-muted/10 dark:text-muted/20"
                        />

                        {/* Labels */}
                        <text x="20" y="125" textAnchor="middle" className="text-[10px] fill-muted-foreground font-medium">0%</text>
                        <text x="180" y="125" textAnchor="middle" className="text-[10px] fill-muted-foreground font-medium">100%</text>

                        {/* Layer 3: Foreground Progress */}
                        <path
                            d="M 20 100 A 80 80 0 0 1 180 100"
                            fill="none"
                            stroke="url(#gradient)"
                            strokeWidth="16"
                            strokeLinecap="round"
                            strokeDasharray="251.2"
                            strokeDashoffset={251.2 - (251.2 * Math.min(completionRate, 100)) / 100}
                            className="transition-all duration-1000 ease-out"
                        />

                        {/* Gradient Definition */}
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Value Display */}
                    <div className="absolute bottom-0 flex flex-col items-center mb-6">
                        <span className="text-4xl font-bold tracking-tighter text-foreground">
                            {completionRate.toFixed(1)}%
                        </span>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">
                            Efficiency Rate
                        </span>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t mt-auto">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">
                        Platform Rating
                    </span>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={cn(
                                    "h-5 w-5 transition-all",
                                    star <= Math.round(metrics.averagePlatformRating || 5)
                                        ? "text-yellow-500 fill-yellow-500"
                                        : "text-muted-foreground/20 fill-muted-foreground/20"
                                )}
                            />
                        ))}
                        <span className="ml-2 text-sm font-bold text-muted-foreground">
                            {metrics.averagePlatformRating || "5.0"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
