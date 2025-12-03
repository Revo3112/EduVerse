"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Box, Key, BarChart3, Shield, FileCode } from "lucide-react";

interface ContractActivityAnalysisProps {
    contractInteractionsReport: {
        contract: string;
        totalTransactions: number;
        percentage: string;
    }[];
}

export function ContractActivityAnalysis({
    contractInteractionsReport,
}: ContractActivityAnalysisProps) {
    // Helper to get icon and color based on contract name
    const getContractConfig = (contractName: string) => {
        switch (contractName) {
            case "CourseFactory":
                return {
                    icon: Box,
                    color: "text-blue-500",
                    bgColor: "bg-blue-500",
                    bgLight: "bg-blue-500/10",
                };
            case "CourseLicense":
                return {
                    icon: Key,
                    color: "text-purple-500",
                    bgColor: "bg-purple-500",
                    bgLight: "bg-purple-500/10",
                };
            case "ProgressTracker":
                return {
                    icon: BarChart3,
                    color: "text-green-500",
                    bgColor: "bg-green-500",
                    bgLight: "bg-green-500/10",
                };
            case "CertificateManager":
                return {
                    icon: Shield,
                    color: "text-orange-500",
                    bgColor: "bg-orange-500",
                    bgLight: "bg-orange-500/10",
                };
            default:
                return {
                    icon: FileCode,
                    color: "text-gray-500",
                    bgColor: "bg-gray-500",
                    bgLight: "bg-gray-500/10",
                };
        }
    };

    return (
        <div className="space-y-5">
            {contractInteractionsReport.map((item) => {
                const config = getContractConfig(item.contract);
                const Icon = config.icon;
                const percentage = parseFloat(item.percentage);

                return (
                    <div key={item.contract} className="space-y-2">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-lg", config.bgLight)}>
                                    <Icon className={cn("h-4 w-4", config.color)} />
                                </div>
                                <div>
                                    <div className="font-medium text-sm text-foreground">
                                        {item.contract}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {item.totalTransactions.toLocaleString()} transactions
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-sm">{item.percentage}%</div>
                                <div className="text-xs text-muted-foreground">of total</div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full rounded-full transition-all duration-500", config.bgColor)}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
