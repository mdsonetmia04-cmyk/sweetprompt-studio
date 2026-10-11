import React from 'react';
import { Check } from 'lucide-react';

export type StepState = 'create' | 'check' | 'export';

interface WorkflowStepsProps {
  currentStep: StepState;
  onStepClick?: (step: StepState) => void;
  className?: string;
}

export const WorkflowSteps: React.FC<WorkflowStepsProps> = ({
  currentStep,
  onStepClick,
  className = '',
}) => {
  const steps: { id: StepState; label: string; num: string }[] = [
    { id: 'create', label: 'Create', num: '01' },
    { id: 'check', label: 'Check', num: '02' },
    { id: 'export', label: 'Export', num: '03' },
  ];

  const getStatus = (stepId: StepState) => {
    if (currentStep === 'create') {
      if (stepId === 'create') return 'active';
      return 'pending';
    }
    if (currentStep === 'check') {
      if (stepId === 'create') return 'completed';
      if (stepId === 'check') return 'active';
      return 'pending';
    }
    // currentStep === 'export'
    if (stepId === 'export') return 'active';
    return 'completed';
  };

  return (
    <div className={`flex items-center gap-2 sm:gap-4 py-2 ${className}`}>
      {steps.map((step, idx) => {
        const status = getStatus(step.id);
        return (
          <React.Fragment key={step.id}>
            {idx > 0 && (
              <div className="w-4 sm:w-8 h-[1px] bg-[#D8CEBF] dark:bg-[#272D30] shrink-0" />
            )}
            <button
              type="button"
              onClick={() => onStepClick && onStepClick(step.id)}
              disabled={!onStepClick}
              className={`flex items-center gap-2 text-xs transition-colors focus-visible:outline-none ${
                onStepClick ? 'cursor-pointer' : 'cursor-default'
              } ${
                status === 'active'
                  ? 'text-[#C74A43] font-extrabold'
                  : status === 'completed'
                  ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                  : 'text-[#606669] dark:text-[#8C8A86] font-medium'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 transition-colors ${
                  status === 'completed'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                    : status === 'active'
                    ? 'bg-[#C74A43]/15 text-[#C74A43] border border-[#C74A43]/40 ring-2 ring-[#C74A43]/20 font-bold'
                    : 'bg-[#E9E1D1] dark:bg-[#0C0F12] text-[#606669] dark:text-[#8C8A86] border border-[#D8CEBF] dark:border-[#272D30]'
                }`}
              >
                {status === 'completed' ? (
                  <Check className="w-3 h-3 stroke-[2.5]" />
                ) : (
                  <span>{step.num}</span>
                )}
              </span>
              <span className="hidden sm:inline tracking-wide">{step.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};
