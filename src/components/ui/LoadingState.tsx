import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Processing...',
  subMessage = 'Running compliance and commercial models...',
  className = '',
}) => {
  return (
    <div className={`rounded-xl border border-[#D8CEBF] dark:border-[#272D30] p-8 sm:p-12 text-center bg-[#EDE6D8]/60 dark:bg-[#11161A]/60 space-y-3 ${className}`}>
      <Loader2 className="w-7 h-7 text-[#C74A43] animate-spin mx-auto" />
      <div className="space-y-1">
        <h4 className="font-extrabold text-[#1A2024] dark:text-[#F3EDE2] text-sm">{message}</h4>
        <p className="text-xs text-[#606669] dark:text-[#8C8A86] max-w-xs mx-auto leading-relaxed font-medium">
          {subMessage}
        </p>
      </div>
    </div>
  );
};
