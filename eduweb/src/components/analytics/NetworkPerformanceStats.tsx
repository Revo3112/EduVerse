"use client";

import React from "react";
import {
  Zap,
  Activity,
  BookOpen,
  Award,
  TrendingUp,
  Users,
} from "lucide-react";
import { EduVerseAnalyticsMetrics } from "@/app/analytics/page";

interface NetworkPerformanceStatsProps {
  metrics: EduVerseAnalyticsMetrics;
  contractInteractionsReport: {
    contract: string;
    totalTransactions: number;
    percentage: string;
  }[];
}

export function NetworkPerformanceStats({
  metrics,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  contractInteractionsReport,
}: NetworkPerformanceStatsProps) {
  // Calculate completion rate
  const completionRate =
    metrics.totalLicensesMinted > 0
      ? (
          (metrics.totalCoursesCompleted / metrics.totalLicensesMinted) *
          100
        ).toFixed(1)
      : "0.0";

  // Calculate enrollment growth indicator (sections completed per student)
  const engagementScore =
    metrics.uniqueStudentsWithProgress > 0
      ? (
          metrics.totalSectionsCompleted / metrics.uniqueStudentsWithProgress
        ).toFixed(1)
      : "0.0";

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Top Metrics: Block Time & Total Txs */}
      <div className="grid grid-cols-2 gap-4">
        {/* Average Block Time */}
        <div className="bg-muted/30 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 border hover:border-primary/20 transition-colors relative overflow-hidden">
          <div className="absolute top-2 right-2 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </div>
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
            <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {metrics.averageBlockTime.toFixed(1)}s
            </div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Avg Block Time
            </p>
          </div>
        </div>

        {/* Total Transactions */}
        <div className="bg-muted/30 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 border hover:border-primary/20 transition-colors">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-full">
            <Activity className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {metrics.totalTransactions.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Total Txs
            </p>
          </div>
        </div>
      </div>

      {/* Platform Learning Metrics - Replacing redundant Transaction Distribution */}
      <div className="space-y-4 flex-1">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-sm font-medium">Platform Learning Metrics</h4>
            <p className="text-xs text-muted-foreground">
              Educational performance indicators
            </p>
          </div>
          <div className="text-xs font-medium bg-muted px-2 py-1 rounded-md">
            Live Data
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Courses Created */}
          <div className="p-3 bg-muted/20 rounded-lg border hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Courses</span>
            </div>
            <div className="text-lg font-bold">
              {metrics.totalCourses.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {metrics.activeCourses} active
            </div>
          </div>

          {/* Enrollments */}
          <div className="p-3 bg-muted/20 rounded-lg border hover:border-green-200 dark:hover:border-green-800 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Enrollments</span>
            </div>
            <div className="text-lg font-bold">
              {metrics.totalLicensesMinted.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {metrics.activeLicenses} active licenses
            </div>
          </div>

          {/* Completions */}
          <div className="p-3 bg-muted/20 rounded-lg border hover:border-purple-200 dark:hover:border-purple-800 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Completions</span>
            </div>
            <div className="text-lg font-bold">
              {metrics.totalCoursesCompleted.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {completionRate}% completion rate
            </div>
          </div>

          {/* Engagement Score */}
          <div className="p-3 bg-muted/20 rounded-lg border hover:border-orange-200 dark:hover:border-orange-800 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Engagement</span>
            </div>
            <div className="text-lg font-bold">{engagementScore}</div>
            <div className="text-xs text-muted-foreground">
              sections/student
            </div>
          </div>
        </div>

        {/* Certificates Summary */}
        <div className="p-3 bg-linear-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 rounded-lg border border-yellow-200/50 dark:border-yellow-800/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Certificates Issued</span>
            </div>
            <div className="text-lg font-bold text-yellow-700 dark:text-yellow-400">
              {metrics.totalCertificateHolders.toLocaleString()}
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            One unique certificate per learner • {metrics.totalCourseAdditions}{" "}
            courses added
          </div>
        </div>
      </div>

      {/* Footer Summary */}
      <div className="pt-4 border-t mt-auto">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">
            Active Learners
          </span>
          <div className="flex items-center gap-2 bg-muted/50 px-2.5 py-1 rounded-full border">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-bold text-foreground text-sm">
              {metrics.activeStudents.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
