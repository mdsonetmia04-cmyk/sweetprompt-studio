import React from 'react';
import { LucideIcon, Layers } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Layers,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`rounded-xl border border-dashed border-[#D8CEBF] dark:border-[#272D30] p-8 sm:p-12 text-center bg-[#EDE6D8]/60 dark:bg-[#11161A]/60 space-y-3.5 ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30] text-[#606669] dark:text-[#8C8A86] mx-auto flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-sm mx-auto">
        <h3 className="font-semibold text-[#1A2024] dark:text-[#F3EDE2] text-sm sm:text-base">
          {title}
        </h3>
        <p className="text-xs text-[#606669] dark:text-[#8C8A86] leading-relaxed">
          {description}
        </p>
      </div>
      {actionLabel && onAction && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onAction}
            className="px-4 py-2 rounded-lg bg-[#C74A43] hover:bg-[#B53F39] text-[#F3EDE2] text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
};
