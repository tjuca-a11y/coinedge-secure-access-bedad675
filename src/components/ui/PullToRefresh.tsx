import React from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export function PullToRefreshIndicator({ 
  pullDistance, 
  isRefreshing,
  threshold = 80 
}: PullToRefreshIndicatorProps) {
  const progress = Math.min(pullDistance / threshold, 1);
  const shouldShow = pullDistance > 10 || isRefreshing;

  if (!shouldShow) return null;

  return (
    <div 
      className="flex items-center justify-center py-2 transition-all"
      style={{ 
        height: isRefreshing ? 48 : pullDistance,
        opacity: isRefreshing ? 1 : progress
      }}
    >
      <div 
        className={cn(
          "p-2 rounded-full bg-muted",
          isRefreshing && "animate-spin"
        )}
        style={{ 
          transform: isRefreshing ? undefined : `rotate(${progress * 180}deg)`,
        }}
      >
        <RefreshCw className="h-5 w-5 text-primary" />
      </div>
    </div>
  );
}
