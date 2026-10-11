import React, { useState } from 'react';
import { 
  Wand2, 
  RefreshCw, 
  SlidersHorizontal 
} from 'lucide-react';
import { AISettings } from '../../types';
import { 
  PromptCount, 
  GeneratedStockPrompt, 
  GenerationProgress,
  UniversalPromptGenerator 
} from '../../lib/prompt-engine';
import { PromptCountSelector } from '../prompt-engine/PromptCountSelector';
import { UniversalPromptBatchView } from '../prompt-engine/UniversalPromptBatchView';
import { saveHistoryItem } from '../../lib/storage/localStorage';

interface PromptImproverProps {
  settings: AISettings;
  showToast: (msg: string) => void;
  onSendToMetadata: (prompt: string, title?: string, category?: string) => void;
  onSendToRisk: (prompt: string) => void;
}

export const PromptImprover: React.FC<PromptImproverProps> = ({
  settings,
  showToast,
  onSendToMetadata,
  onSendToRisk,
}) => {
  const [rawPrompt, setRawPrompt] = useState('minimalist desk setup with laptop, coffee cup, and soft morning sunlight');
  const [instructions, setInstructions] = useState('Elevate into high-end editorial commercial stock: clean architectural Scandinavian workspace, natural depth of field, faceless anonymous composition, generous left copy space, zero logos');
  const [count, setCount] = useState<PromptCount>(5);

  const [focusArea, setFocusArea] = useState('Auto (Default)');
  const [contentType, setContentType] = useState<string>('Auto (Default)');

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [results, setResults] = useState<GeneratedStockPrompt[]>([]);
  const [diversityScore, setDiversityScore] = useState<number>(95);

  const focusOptions = [
    'Auto (Default)',
    'Commercial Stock & Authentic Realism',
    'Lighting, Depth & Studio Atmosphere',
    'Composition, Framing & Copy Space',
    'Diversity, Emotion & Candid Demographics',
    'Vector / Isolated Graphic Precision'
  ];

  const handleImprove = async () => {
    if (!rawPrompt.trim()) {
      showToast('Please enter an unrefined prompt to improve.');
      return;
    }

    setIsGenerating(true);
    setProgress({ current: 0, total: count, step: 'Analyze', message: 'Analyzing raw prompt and identifying stock enhancements...' });

    try {
      const combinedInstructions = `Base Raw Input: "${rawPrompt}". Improvement Focus: ${focusArea}. ${instructions ? `Additional user rules: ${instructions}. ` : ''}Transform this simple idea into ${count} polished, commercially viable, brand-safe stock prompts. Strip any generic spam words, add concrete visual lighting, framing, and clean negative space.`;

      const batchResult = await UniversalPromptGenerator.generateBatch(
        {
          subject: rawPrompt.slice(0, 80),
          instructions: combinedInstructions.trim(),
          count,
          contentType,
          commercialIntent: 'Commercial Stock Improvement',
          sectionContext: 'Prompt Improver'
        },
        {
          onProgress: (p) => setProgress(p),
          preferredModel: settings.model
        }
      );

      setResults(batchResult.prompts);
      setDiversityScore(batchResult.diversityScore);

      if (batchResult.prompts.length > 0) {
        saveHistoryItem({
          type: 'prompt',
          title: `Improved Prompt: ${rawPrompt.slice(0, 35)} (${batchResult.prompts.length} Variations)`,
          summary: batchResult.prompts[0].prompt.slice(0, 100) + '...',
          data: batchResult,
          provider: settings.provider,
          model: settings.model,
        });
      }

      showToast(`Generated ${batchResult.prompts.length} professionally improved stock prompts!`);
    } catch (err: any) {
      showToast(err.message || 'Prompt improvement failed. Check API configuration.');
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  const handleRegenerateSingle = (id: string) => {
    setResults(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          prompt: `Polished commercial stock concept of ${rawPrompt}, refined with authentic textures, subtle natural lighting, candid demography, and clean negative space`,
          similarityStatus: 'REFINED'
        };
      }
      return p;
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="rounded-xl border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] p-5 sm:p-6 space-y-5">
        <div className="pb-4 border-b border-[#D8CEBF] dark:border-[#272D30]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#606669] dark:text-[#8C8A86] mb-1">
            Prompt Tools
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl text-[#1A2024] dark:text-[#F3EDE2] font-normal tracking-tight flex items-center gap-2.5">
            <Wand2 className="w-6 h-6 text-[#C74A43]" />
            <span>Prompt Improver</span>
          </h1>
          <p className="text-xs text-[#606669] dark:text-[#8C8A86] mt-1 max-w-xl">
            Elevate simple, plain ideas into descriptive, commercially sound stock prompts with optimal visual parameters.
          </p>
        </div>

        {/* Inputs Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Raw Prompt & Instructions */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#1A2024] dark:text-[#F3EDE2] flex items-center justify-between">
                <span>Original Raw Prompt *</span>
                <span className="text-[10px] text-[#606669] dark:text-[#8C8A86] font-normal">Basic concept to elevate</span>
              </label>
              <textarea
                value={rawPrompt}
                onChange={(e) => setRawPrompt(e.target.value)}
                placeholder="Enter your simple prompt or idea (e.g. man in office looking at computer screen)..."
                rows={3}
                className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3.5 py-2.5 text-sm text-[#1A2024] dark:text-[#F3EDE2] placeholder-[#606669] dark:placeholder-[#606669] focus:outline-none focus:border-[#C74A43] resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#1A2024] dark:text-[#F3EDE2] flex items-center justify-between">
                <span>Improvement Instructions & Desired Mood</span>
                <span className="text-[10px] text-[#606669] dark:text-[#8C8A86] font-normal">Lighting, framing & constraints</span>
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Instructions (e.g. Add realistic textures, make it high-end editorial, no logos, left copy space for marketing text)..."
                rows={2}
                className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3.5 py-2.5 text-xs text-[#1A2024] dark:text-[#F3EDE2] placeholder-[#606669] dark:placeholder-[#606669] focus:outline-none focus:border-[#C74A43] resize-none leading-relaxed"
              />
            </div>

            {/* Quick Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#606669] dark:text-[#8C8A86]">Improvement Focus</label>
                <select
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-xs text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
                >
                  {focusOptions.map(f => <option key={f} value={f} className="bg-[#11161A] text-[#F3EDE2]">{f}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#606669] dark:text-[#8C8A86]">Content Type</label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-xs text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
                >
                  {['Auto (Default)', 'Photo', 'Illustration', 'Vector', '3D Render', 'Silhouette'].map(t => (
                    <option key={t} value={t} className="bg-[#11161A] text-[#F3EDE2]">{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Right Column: Prompt Count Selector & CTA */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <PromptCountSelector
              value={count}
              onChange={setCount}
              disabled={isGenerating}
            />

            <div className="p-3.5 rounded-lg bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30] space-y-1.5 text-xs">
              <span className="font-semibold text-[#1A2024] dark:text-[#F3EDE2] block">Commercial Stock Engineering</span>
              <p className="text-[11px] text-[#606669] dark:text-[#8C8A86] leading-relaxed">
                Replaces generic descriptions with specific lighting setups, authentic compositional framing, and buyer-targeted negative space.
              </p>
            </div>

            <button
              type="button"
              onClick={handleImprove}
              disabled={isGenerating || !rawPrompt.trim()}
              className="w-full rounded-lg bg-[#C74A43] hover:bg-[#B53F39] text-[#F3EDE2] font-semibold px-4 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Improving Prompts ({count})...</span>
                </>
              ) : (
                <span>Improve Prompt ({count})</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results View */}
      <UniversalPromptBatchView
        prompts={results}
        isGenerating={isGenerating}
        progress={progress}
        subject={rawPrompt.slice(0, 40)}
        instructions={instructions}
        sectionTitle="Prompt Improver"
        diversityScore={diversityScore}
        onRegenerateBatch={handleImprove}
        onRegenerateSingle={handleRegenerateSingle}
        onSendToMetadata={onSendToMetadata}
        onSendToRisk={onSendToRisk}
        showToast={showToast}
      />
    </div>
  );
};
