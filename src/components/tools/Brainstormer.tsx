import React, { useState } from 'react';
import { 
  Compass, 
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

interface BrainstormerProps {
  settings: AISettings;
  showToast: (msg: string) => void;
  onSendToPromptStudio: (prompt: string, title?: string, category?: string) => void;
  onSendToMetadata?: (prompt: string, title?: string, category?: string) => void;
  onSendToRisk?: (prompt: string) => void;
}

export const Brainstormer: React.FC<BrainstormerProps> = ({
  settings,
  showToast,
  onSendToPromptStudio,
  onSendToMetadata,
  onSendToRisk,
}) => {
  const [subject, setSubject] = useState('High-demand commercial niches in modern renewable energy');
  const [instructions, setInstructions] = useState('Identify underserved buyer visual demands, focusing on commercial utility, clean technology, and realistic working situations');
  const [count, setCount] = useState<PromptCount>(5);

  const [industry, setIndustry] = useState('Auto (Default)');
  const [buyerType, setBuyerType] = useState('Auto (Default)');
  const [contentType, setContentType] = useState<'Photo' | 'Illustration' | 'Vector' | '3D Render' | 'Silhouette'>('Photo');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [results, setResults] = useState<GeneratedStockPrompt[]>([]);
  const [diversityScore, setDiversityScore] = useState<number>(95);

  const industries = [
    'Auto (Default)',
    'Green Tech & Renewable Energy',
    'Healthcare & Modern Medicine',
    'Remote Work, Freelancing & Digital Nomad',
    'Modern Agriculture & Food Tech',
    'Senior Wellness & Active Retirement',
    'Cybersecurity & Cloud Infrastructure',
    'Small Business Entrepreneurship & Craft'
  ];

  const buyerOptions = [
    'Auto (Default)',
    'Corporate Marketing & PR Teams',
    'Tech Startups & SaaS Landing Pages',
    'Editorial Publishers & Journalists',
    'Healthcare & Educational Institutions',
    'Small Business Owners & Brand Agencies'
  ];

  const handleBrainstorm = async () => {
    if (!subject.trim()) {
      showToast('Please enter a topic or industry focus.');
      return;
    }

    setIsGenerating(true);
    setProgress({ current: 0, total: count, step: 'Analyze', message: 'Analyzing market gaps and buyer demand signals...' });

    try {
      const combinedInstructions = `Topic: "${subject}". Industry: ${industry}. Target Buyer: ${buyerType}. ${instructions ? `Instructions: ${instructions}. ` : ''}Brainstorm ${count} distinct, commercially valuable stock prompt concepts that address real-world buyer needs and high search volume topics without brand names or trademarks.`;

      const batchResult = await UniversalPromptGenerator.generateBatch(
        {
          subject: subject.slice(0, 80),
          instructions: combinedInstructions.trim(),
          count,
          contentType,
          category: industry,
          commercialIntent: 'Stock Niche Market Gap',
          sectionContext: 'Brainstormer'
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
          title: `Brainstorm: ${subject.slice(0, 35)} (${batchResult.prompts.length} Ideas)`,
          summary: batchResult.prompts[0].prompt.slice(0, 100) + '...',
          data: batchResult,
          provider: settings.provider,
          model: settings.model,
        });
      }

      showToast(`Brainstormed ${batchResult.prompts.length} high-demand commercial concepts!`);
    } catch (err: any) {
      showToast(err.message || 'Brainstorming failed. Check API configuration.');
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
          prompt: `High-value commercial stock concept exploring ${p.subject} for ${buyerType.toLowerCase()}, featuring authentic lighting, candid perspective, and generous copy space`,
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#D8CEBF] dark:border-[#272D30]">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#606669] dark:text-[#8C8A86] mb-1">
              Niche Discovery
            </div>
            <h1 className="font-editorial text-2xl sm:text-3xl text-[#1A2024] dark:text-[#F3EDE2] font-normal tracking-tight flex items-center gap-2.5">
              <Compass className="w-6 h-6 text-[#C74A43]" />
              <span>Brainstormer</span>
            </h1>
            <p className="text-xs text-[#606669] dark:text-[#8C8A86] mt-1 max-w-xl">
              Identify underserved stock niches, uncrowded subject categories, and high-demand commercial themes.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs font-medium text-[#606669] dark:text-[#8C8A86] hover:text-[#1A2024] dark:hover:text-[#F3EDE2] flex items-center gap-1.5 self-start sm:self-auto transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{showAdvanced ? 'Hide Market Filters' : 'Industry & Buyer Filters'}</span>
          </button>
        </div>

        {/* Inputs Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Topic & Instructions */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#1A2024] dark:text-[#F3EDE2] flex items-center justify-between">
                <span>Topic / Commercial Focus *</span>
                <span className="text-[10px] text-[#606669] dark:text-[#8C8A86] font-normal">Exploration angle</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter topic or market sector (e.g. Modern renewable energy, active senior lifestyles)..."
                className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3.5 py-2.5 text-sm text-[#1A2024] dark:text-[#F3EDE2] placeholder-[#606669] dark:placeholder-[#606669] focus:outline-none focus:border-[#C74A43] font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#1A2024] dark:text-[#F3EDE2] flex items-center justify-between">
                <span>Market Gap Context & Instructions</span>
                <span className="text-[10px] text-[#606669] dark:text-[#8C8A86] font-normal">Buyer needs & direction</span>
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Identify specific buyer requirements (e.g. Focus on practical B2B applications, natural authentic moments, negative space for layout)..."
                rows={3}
                className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3.5 py-2.5 text-xs text-[#1A2024] dark:text-[#F3EDE2] placeholder-[#606669] dark:placeholder-[#606669] focus:outline-none focus:border-[#C74A43] resize-none leading-relaxed"
              />
            </div>

            {/* Quick Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#606669] dark:text-[#8C8A86]">Target Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-xs text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
                >
                  {industries.map(i => <option key={i} value={i} className="bg-[#11161A] text-[#F3EDE2]">{i}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#606669] dark:text-[#8C8A86]">Target Buyer Persona</label>
                <select
                  value={buyerType}
                  onChange={(e) => setBuyerType(e.target.value)}
                  className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-xs text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
                >
                  {buyerOptions.map(b => <option key={b} value={b} className="bg-[#11161A] text-[#F3EDE2]">{b}</option>)}
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

            <div className="p-3.5 rounded-lg bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30] space-y-1 text-xs">
              <span className="font-semibold text-[#1A2024] dark:text-[#F3EDE2] block">Niche Market Intelligence</span>
              <p className="text-[11px] text-[#606669] dark:text-[#8C8A86] leading-snug">
                Filters out saturated generic concepts and surfaces authentic, high-converting visual setups in high buyer demand.
              </p>
            </div>

            <button
              type="button"
              onClick={handleBrainstorm}
              disabled={isGenerating || !subject.trim()}
              className="w-full rounded-lg bg-[#C74A43] hover:bg-[#B53F39] text-[#F3EDE2] font-semibold px-4 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Brainstorming Concepts ({count})...</span>
                </>
              ) : (
                <span>Brainstorm Stock Niches ({count})</span>
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
        subject={subject}
        instructions={instructions}
        sectionTitle="Brainstormer"
        diversityScore={diversityScore}
        onRegenerateBatch={handleBrainstorm}
        onRegenerateSingle={handleRegenerateSingle}
        onSendToMetadata={onSendToMetadata}
        onSendToRisk={onSendToRisk}
        showToast={showToast}
      />
    </div>
  );
};
