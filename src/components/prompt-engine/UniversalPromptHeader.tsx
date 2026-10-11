import React from 'react';
import { PromptCount } from '../../lib/prompt-engine/promptSchema';
import { PromptCountSelector } from './PromptCountSelector';
import { RefreshCw, SlidersHorizontal, Layers } from 'lucide-react';

interface UniversalPromptHeaderProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  subject: string;
  onSubjectChange: (val: string) => void;
  subjectPlaceholder?: string;
  instructions: string;
  onInstructionsChange: (val: string) => void;
  instructionsPlaceholder?: string;
  count: PromptCount;
  onCountChange: (count: PromptCount) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  generateButtonText?: string;
  children?: React.ReactNode; // For section-specific settings slot
}

export const UniversalPromptHeader: React.FC<UniversalPromptHeaderProps> = ({
  title,
  description,
  icon: Icon,
  subject,
  onSubjectChange,
  subjectPlaceholder = 'Enter your subject, object, concept or topic (e.g. coffee cup, senior bioengineer, sustainable solar farm)...',
  instructions,
  onInstructionsChange,
  instructionsPlaceholder = 'Add your specific instructions, visual direction, commercial purpose, composition, style or restrictions (e.g. clean isolated vector concepts with generous left copy space, no human faces)...',
  count,
  onCountChange,
  onGenerate,
  isGenerating,
  generateButtonText = 'Generate Prompts',
  children,
}) => {
  return (
    <div className="space-y-6">
      {/* Title & Description Header */}
      <div className="pb-4 border-b border-[#D8CEBF] dark:border-[#272D30]">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A2024] dark:text-[#F3EDE2] flex items-center gap-2.5">
          {Icon ? <Icon className="w-5 h-5 text-[#C74A43]" /> : <Layers className="w-5 h-5 text-[#C74A43]" />}
          <span>{title}</span>
        </h1>
        <p className="text-xs sm:text-sm font-medium text-[#606669] dark:text-[#8C8A86] mt-1.5 max-w-3xl leading-relaxed">
          {description}
        </p>
      </div>

      {/* Main Unified Input Panel */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#EDE6D8] dark:bg-[#11161A] border border-[#D8CEBF] dark:border-[#272D30] space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Subject & Instructions */}
          <div className="lg:col-span-7 space-y-4">
            {/* Subject Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#1A2024] dark:text-[#F3EDE2] flex items-center justify-between">
                <span>Subject / Topic *</span>
                <span className="text-[10px] text-[#606669] dark:text-[#8C8A86] font-normal">Core commercial concept</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => onSubjectChange(e.target.value)}
                placeholder={subjectPlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8CEBF] dark:border-[#272D30] bg-[#E9E1D1] dark:bg-[#0C0F12] text-sm text-[#1A2024] dark:text-[#F3EDE2] placeholder:text-[#8C8A86] focus:outline-none focus:ring-2 focus:ring-[#C74A43] font-medium"
              />
            </div>

            {/* Instructions Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#1A2024] dark:text-[#F3EDE2] flex items-center justify-between">
                <span>Additional Instructions</span>
                <span className="text-[10px] text-[#606669] dark:text-[#8C8A86] font-normal">Visual direction, style & constraints</span>
              </label>
              <textarea
                value={instructions}
                onChange={(e) => onInstructionsChange(e.target.value)}
                placeholder={instructionsPlaceholder}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8CEBF] dark:border-[#272D30] bg-[#E9E1D1] dark:bg-[#0C0F12] text-xs text-[#1A2024] dark:text-[#F3EDE2] placeholder:text-[#8C8A86] focus:outline-none focus:ring-2 focus:ring-[#C74A43] resize-none font-medium leading-relaxed"
              />
            </div>
          </div>

          {/* Right Column: Prompt Count & Section Settings */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            {/* Prompt Count Selector (1, 5, 10, 15, 20, 30) */}
            <PromptCountSelector
              value={count}
              onChange={onCountChange}
              disabled={isGenerating}
            />

            {/* Section-Specific Settings Slot */}
            {children && (
              <div className="space-y-3 pt-2 border-t border-[#D8CEBF] dark:border-[#272D30]">
                {children}
              </div>
            )}

            {/* Primary Generate CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onGenerate}
                disabled={isGenerating || !subject.trim()}
                className="w-full py-3.5 px-5 rounded-xl bg-[#C74A43] hover:bg-[#B53F39] disabled:opacity-50 disabled:cursor-not-allowed text-[#F3EDE2] font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-none"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating {count} Unique Prompts...</span>
                  </>
                ) : (
                  <span>{generateButtonText} ({count})</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
