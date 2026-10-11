import React, { useState } from 'react';
import { 
  Layers, 
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

interface PromptVariationsProps {
  settings: AISettings;
  showToast: (msg: string) => void;
  onSendToMetadata: (prompt: string, title?: string, category?: string) => void;
  onSendToRisk: (prompt: string) => void;
  onSendToImprover?: (prompt: string) => void;
}

export const PromptVariations: React.FC<PromptVariationsProps> = ({
  settings,
  showToast,
  onSendToMetadata,
  onSendToRisk,
  onSendToImprover,
}) => {
  const [basePrompt, setBasePrompt] = useState('Woman working on laptop in modern sunlit Scandinavian apartment, soft daylight, copy space on right');
  const [instructions, setInstructions] = useState('Create diverse visual variations exploring different camera angles, environments, times of day, and demographic diversity while preserving commercial intent');
  const [count, setCount] = useState<PromptCount>(5);

  const [variationType, setVariationType] = useState('Auto (Default)');
  const [contentType, setContentType] = useState<string>('Auto (Default)');

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [results, setResults] = useState<GeneratedStockPrompt[]>([]);
  const [diversityScore, setDiversityScore] = useState<number>(96);

  const variationTypes = [
    'Auto (Default)',
    'Multi-Angle & Environmental Diversity',
    'Camera Angles & Framing (Close-up, Wide, Flatlay, Low-Angle)',
    'Demographics & Human Diversity (Different ages, ethnicities, expressions)',
    'Lighting & Time of Day (Golden hour, studio strobe, rim light, ambient)',
    'Minimalist vs Editorial Contexts'
  ];

  const handleGenerate = async () => {
    if (!basePrompt.trim()) {
      showToast('Please enter an original prompt to generate variations.');
      return;
    }

    setIsGenerating(true);
    setProgress({ current: 0, total: count, step: 'Analyze', message: 'Analyzing base prompt concept and variation vectors...' });

    try {
      const combinedInstructions = `Original Base Prompt: "${basePrompt}". Variation Strategy: ${variationType}. ${instructions ? `Additional user rules: ${instructions}. ` : ''}Generate ${count} distinctly diversified commercial stock prompts that explore different angles, environments, or framing while honoring the core subject.`;

      const batchResult = await UniversalPromptGenerator.generateBatch(
        {
          subject: basePrompt.slice(0, 80),
          instructions: combinedInstructions.trim(),
          count,
          contentType,
          commercialIntent: 'Commercial Stock Variations',
          sectionContext: 'Prompt Variations'
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
          title: `Variations: ${basePrompt.slice(0, 35)} (${batchResult.prompts.length} Prompts)`,
          summary: batchResult.prompts[0].prompt.slice(0, 100) + '...',
          data: batchResult,
          provider: settings.provider,
          model: settings.model,
        });
      }

      showToast(`Generated exactly ${batchResult.prompts.length} unique variations!`);
    } catch (err: any) {
      showToast(err.message || 'Variation generation failed. Check API configuration.');
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
          prompt: `Alternative commercial variation of ${basePrompt}, freshly styled with different viewpoint, ambient lighting, and dedicated buyer copy space`,
          similarityStatus: 'REFINED'
        };
      }
      return p;
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header & Inputs Panel */}
      <div className="rounded-xl border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] p-5 sm:p-6 space-y-5">
        <div className="pb-4 border-b border-[#D8CEBF] dark:border-[#272D30]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#606669] dark:text-[#8C8A86] mb-1">
            Prompt Tools
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl text-[#1A2024] dark:text-[#F3EDE2] font-normal tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-[#C74A43]" />
            <span>Prompt Variations</span>
          </h1>
          <p className="text-xs text-[#606669] dark:text-[#8C8A86] mt-1 max-w-xl">
            Produce meaningfully differentiated stock variations without repetitive phrasing or near-identical duplicate penalties.
          </p>
        </div>

        {/* Inputs Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Base Prompt & Instructions */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#1A2024] dark:text-[#F3EDE2] flex items-center justify-between">
                <span>Original Base Prompt *</span>
                <span className="text-[10px] text-[#606669] dark:text-[#8C8A86] font-normal">Source concept to diversify</span>
              </label>
              <textarea
                value={basePrompt}
                onChange={(e) => setBasePrompt(e.target.value)}
                placeholder="Paste your existing prompt or concept here..."
                rows={3}
                className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3.5 py-2.5 text-sm text-[#1A2024] dark:text-[#F3EDE2] placeholder-[#606669] dark:placeholder-[#606669] focus:outline-none focus:border-[#C74A43] resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#1A2024] dark:text-[#F3EDE2] flex items-center justify-between">
                <span>Variation Strategy & Constraints</span>
                <span className="text-[10px] text-[#606669] dark:text-[#8C8A86] font-normal">Direction for variations</span>
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Specific guidance (e.g. Vary environments and demographics, keep natural lighting, no logos, left copy space)..."
                rows={2}
                className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3.5 py-2.5 text-xs text-[#1A2024] dark:text-[#F3EDE2] placeholder-[#606669] dark:placeholder-[#606669] focus:outline-none focus:border-[#C74A43] resize-none leading-relaxed"
              />
            </div>

            {/* Quick Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#606669] dark:text-[#8C8A86]">Variation Focus</label>
                <select
                  value={variationType}
                  onChange={(e) => setVariationType(e.target.value)}
                  className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-xs text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
                >
                  {variationTypes.map(v => <option key={v} value={v} className="bg-[#11161A] text-[#F3EDE2]">{v}</option>)}
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
              <span className="font-semibold text-[#1A2024] dark:text-[#F3EDE2] block">Anti-Duplication Protection</span>
              <p className="text-[11px] text-[#606669] dark:text-[#8C8A86] leading-relaxed">
                Each variation changes meaningful commercial dimensions (angle, framing, context, lighting) rather than superficial adjective swaps.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !basePrompt.trim()}
              className="w-full rounded-lg bg-[#C74A43] hover:bg-[#B53F39] text-[#F3EDE2] font-semibold px-4 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating {count} Unique Variations...</span>
                </>
              ) : (
                <span>Generate Variations ({count})</span>
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
        subject={basePrompt.slice(0, 40)}
        instructions={instructions}
        sectionTitle="Prompt Variations"
        diversityScore={diversityScore}
        onRegenerateBatch={handleGenerate}
        onRegenerateSingle={handleRegenerateSingle}
        onSendToMetadata={onSendToMetadata}
        onSendToRisk={onSendToRisk}
        onSendToImprover={onSendToImprover}
        showToast={showToast}
      />
    </div>
  );
};
