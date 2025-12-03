"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

interface TransactionTypeChartProps {
    data: {
        type: string;
        count: number;
        percentage: number;
    }[];
}

const COLORS = [
    "#3b82f6", // blue-500
    "#22c55e", // green-500
    "#eab308", // yellow-500
    "#a855f7", // purple-500
    "#ec4899", // pink-500
    "#f97316", // orange-500
    "#06b6d4", // cyan-500
    "#6366f1", // indigo-500
];

export function TransactionTypeChart({ data }: TransactionTypeChartProps) {
    const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

    // Filter out zero values and sort by count desc
    const chartData = useMemo(() => {
        return data.filter((d) => d.count > 0).sort((a, b) => b.count - a.count);
    }, [data]);

    const total = useMemo(
        () => chartData.reduce((acc, curr) => acc + curr.count, 0),
        [chartData]
    );

    // Calculate segments
    let cumulativePercent = 0;
    const segments = chartData.map((d, i) => {
        const startPercent = cumulativePercent;
        const percent = d.count / total;
        cumulativePercent += percent;

        return {
            ...d,
            color: COLORS[i % COLORS.length],
            startPercent,
            percent,
        };
    });

    // SVG Math
    // viewBox 0 0 100 100
    // center 50 50
    // radius 40
    // circumference = 2 * PI * 40 = 251.327

    const radius = 40;
    const circumference = 2 * Math.PI * radius;

    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No transaction data available
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-6 h-full">
            <div className="relative w-48 h-48 shrink-0 group/chart">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {segments.map((segment, i) => {
                        const strokeDasharray = `${segment.percent * circumference
                            } ${circumference}`;
                        const strokeDashoffset = -segment.startPercent * circumference;
                        const isActive = activeIndex === i;

                        return (
                            <circle
                                key={segment.type}
                                cx="50"
                                cy="50"
                                r={radius}
                                fill="none"
                                stroke={segment.color}
                                strokeWidth={isActive ? "14" : "12"}
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                className={cn(
                                    "transition-all duration-300 ease-out cursor-pointer",
                                    activeIndex !== null && !isActive ? "opacity-30" : "opacity-100"
                                )}
                                onMouseEnter={() => setActiveIndex(i)}
                                onMouseLeave={() => setActiveIndex(null)}
                            />
                        );
                    })}
                </svg>

                {/* Center Text or Tooltip */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    {activeIndex !== null ? (
                        <div className="animate-in fade-in zoom-in duration-200">
                            <span className="text-2xl font-bold tracking-tighter block" style={{ color: segments[activeIndex].color }}>
                                {segments[activeIndex].count}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider max-w-[80%] mx-auto line-clamp-2 leading-tight">
                                {segments[activeIndex].type.replace(/_/g, " ")}
                            </span>
                        </div>
                    ) : (
                        <>
                            <span className="text-3xl font-bold tracking-tighter">{total}</span>
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                Total
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Legend */}
            <div className="w-full space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                {segments.map((segment, i) => (
                    <div
                        key={segment.type}
                        className={cn(
                            "flex items-center justify-between text-sm group cursor-pointer p-2 rounded-lg transition-colors",
                            activeIndex === i ? "bg-muted" : "hover:bg-muted/50",
                            activeIndex !== null && activeIndex !== i ? "opacity-40" : "opacity-100"
                        )}
                        onMouseEnter={() => setActiveIndex(i)}
                        onMouseLeave={() => setActiveIndex(null)}
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div
                                className={cn(
                                    "w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all",
                                    activeIndex === i ? "ring-2 ring-offset-1" : ""
                                )}
                                style={{
                                    backgroundColor: segment.color,
                                    boxShadow: `0 0 8px ${segment.color}40`,
                                    borderColor: segment.color,
                                }}
                            />
                            <span
                                className={cn(
                                    "capitalize truncate font-medium transition-colors",
                                    activeIndex === i ? "text-foreground" : "text-muted-foreground"
                                )}
                                title={segment.type.replace(/_/g, " ")}
                            >
                                {segment.type.replace(/_/g, " ").toLowerCase()}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 tabular-nums">
                            <span className={cn("font-semibold", activeIndex === i && "text-primary")}>
                                {segment.count}
                            </span>
                            <span className="text-xs text-muted-foreground w-9 text-right bg-background px-1.5 py-0.5 rounded border">
                                {Math.round(segment.percent * 100)}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
