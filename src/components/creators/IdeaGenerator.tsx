import React, { useState } from 'react';
import { 
  Lightbulb, 
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

interface IdeaGeneratorProps {
  settings: AISettings;
  showToast: (msg: string) => void;
  onSendToPromptStudio: (prompt: string, title?: string, category?: string) => void;
  onSendToMetadata: (prompt: string, title?: string, category?: string) => void;
  onSendToRisk?: (prompt: string) => void;
}

export const IdeaGenerator: React.FC<IdeaGeneratorProps> = ({
  settings,
  showToast,
  onSendToPromptStudio,
  onSendToMetadata,
  onSendToRisk,
}) => {
  const [subject, setSubject] = useState('Sustainable Clean Energy & Solar Technology');
  const [instructions, setInstructions] = useState('Create commercial concepts suitable for corporate sustainability reports, website hero banners, and green tech marketing');
  const [count, setCount] = useState<PromptCount>(5);

  const [category, setCategory] = useState('Auto (Default)');
  const [commercialUse, setCommercialUse] = useState('Auto (Default)');
  const [season, setSeason] = useState('Auto (Default)');
  const [contentType, setContentType] = useState<string>('Auto (Default)');
  const [negativeSpace, setNegativeSpace] = useState('Auto (Default)');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [results, setResults] = useState<GeneratedStockPrompt[]>([]);
  const [diversityScore, setDiversityScore] = useState<number>(92);

  const categories = [
    'Auto (Default)',
    'Business & Modern Work',
    'Technology & AI Integration',
    'Sustainability & Clean Energy',
    'Healthcare & Medical Science',
    'Education & Digital Learning',
    'Food, Dining & Culinary',
    'Finance & Modern Banking',
    'Travel & Hospitality',
    'Logistics & Supply Chain',
    'Real Estate & Architecture'
  ];

  const seasons = ['Auto (Default)', 'All Year', 'Spring', 'Summer', 'Autumn / Fall', 'Winter', 'Holiday Season'];
  const commercialUses = ['Auto (Default)', 'Website Hero & Marketing', 'Advertising Campaign', 'Social Media Graphics', 'E-commerce', 'Packaging', 'Editorial Spread'];
  const negativeSpaces = ['Auto (Default)', 'None', 'Left', 'Right', 'Top', 'Bottom', 'Center'];

  const handleGenerate = async () => {
    if (!subject.trim()) {
      showToast('Please enter a subject or theme for the Idea Generator.');
      return;
    }

    setIsGenerating(true);
    setProgress({ current: 0, total: count, step: 'Analyze', message: 'Analyzing commercial stock idea requirements...' });

    try {
      const combinedInstructions = `${instructions ? `${instructions}. ` : ''}Category: ${category}. Commercial Purpose: ${commercialUse}. Season: ${season}. Target buyers: Corporate buyers, creative directors, marketing agencies.`;

      const batchResult = await UniversalPromptGenerator.generateBatch(
        {
          subject: subject.trim(),
          instructions: combinedInstructions.trim(),
          count,
          contentType,
          category,
          commercialIntent: commercialUse,
          negativeSpace,
          sectionContext: 'Idea Generator'
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
          title: `Stock Ideas: ${subject.slice(0, 35)} (${batchResult.prompts.length} Ideas)`,
          summary: batchResult.prompts[0].prompt.slice(0, 100) + '...',
          data: batchResult,
          provider: settings.provider,
          model: settings.model,
        });
      }

      showToast(`Generated exactly ${batchResult.prompts.length} commercial stock concepts!`);
    } catch (err: any) {
      showToast(err.message || 'Idea generation failed. Check API configuration.');
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
          prompt: `${p.subject}, newly diversified commercial concept with distinctive composition, realistic natural lighting, and dedicated copy space`,
          similarityStatus: 'REFINED'
        };
      }
      return p;
    }));
  };

  return (
    <div className="space-y-6">
      {/* Universal Header Panel */}
      <div className="rounded-xl border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#D8CEBF] dark:border-[#272D30]">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#606669] dark:text-[#8C8A86] mb-1">
              Concept Lab
            </div>
            <h1 className="font-editorial text-2xl sm:text-3xl text-[#1A2024] dark:text-[#F3EDE2] font-normal tracking-tight flex items-center gap-2.5">
              <Lightbulb className="w-6 h-6 text-[#C74A43]" />
              <span>Idea Generator & Stock Concept Lab</span>
            </h1>
            <p className="text-xs text-[#606669] dark:text-[#8C8A86] mt-1 max-w-xl">
              Brainstorm commercially valuable stock niches, market themes, and buyer-targeted visual ideas.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs font-medium text-[#606669] dark:text-[#8C8A86] hover:text-[#1A2024] dark:hover:text-[#F3EDE2] flex items-center gap-1.5 self-start sm:self-auto transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{showAdvanced ? 'Hide Market Filters' : 'Market & Season Filters'}</span>
          </button>
        </div>

        {/* Inputs Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Subject & Instructions */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#1A2024] dark:text-[#F3EDE2] flex items-center justify-between">
                <span>Subject / Industry Theme *</span>
                <span className="text-[10px] text-[#606669] dark:text-[#8C8A86] font-normal">Core stock niche</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter stock theme or niche (e.g. Remote teamwork in modern hybrid office, electric vehicle charging)..."
                className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3.5 py-2.5 text-sm text-[#1A2024] dark:text-[#F3EDE2] placeholder-[#606669] dark:placeholder-[#606669] focus:outline-none focus:border-[#C74A43] font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#1A2024] dark:text-[#F3EDE2] flex items-center justify-between">
                <span>Buyer Context & Instructions</span>
                <span className="text-[10px] text-[#606669] dark:text-[#8C8A86] font-normal">Target audience & visual direction</span>
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Add instructions, target buyer needs, or styling rules (e.g. Authentic diversity, natural working postures, generous negative space for website copy)..."
                rows={3}
                className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3.5 py-2.5 text-xs text-[#1A2024] dark:text-[#F3EDE2] placeholder-[#606669] dark:placeholder-[#606669] focus:outline-none focus:border-[#C74A43] resize-none leading-relaxed"
              />
            </div>

            {/* Quick Settings */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#606669] dark:text-[#8C8A86]">Commercial Use</label>
                <select
                  value={commercialUse}
                  onChange={(e) => setCommercialUse(e.target.value)}
                  className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-xs text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
                >
                  {commercialUses.map(u => <option key={u} value={u} className="bg-[#11161A] text-[#F3EDE2]">{u}</option>)}
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

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#606669] dark:text-[#8C8A86]">Copy Space</label>
                <select
                  value={negativeSpace}
                  onChange={(e) => setNegativeSpace(e.target.value)}
                  className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-xs text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
                >
                  {negativeSpaces.map(n => <option key={n} value={n} className="bg-[#11161A] text-[#F3EDE2]">{n}</option>)}
                </select>
              </div>
            </div>

            {/* Filter Drawer */}
            {showAdvanced && (
              <div className="p-4 rounded-lg bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs animate-fade-in">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#606669] dark:text-[#8C8A86]">Industry / Niche</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-xs text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
                  >
                    {categories.map(c => <option key={c} value={c} className="bg-[#11161A] text-[#F3EDE2]">{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#606669] dark:text-[#8C8A86]">Season / Timeliness</label>
                  <select
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-xs text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
                  >
                    {seasons.map(s => <option key={s} value={s} className="bg-[#11161A] text-[#F3EDE2]">{s}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Prompt Count Selector & CTA */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <PromptCountSelector
              value={count}
              onChange={setCount}
              disabled={isGenerating}
            />

            <div className="p-3.5 rounded-lg bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30] space-y-1.5 text-xs">
              <span className="font-semibold text-[#1A2024] dark:text-[#F3EDE2] block">Stock Concept Diversification</span>
              <p className="text-[11px] text-[#606669] dark:text-[#8C8A86] leading-relaxed">
                Every generated concept is structured around a distinctive commercial angle, buyer persona, and composition setup.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !subject.trim()}
              className="w-full rounded-lg bg-[#C74A43] hover:bg-[#B53F39] text-[#F3EDE2] font-semibold px-4 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating {count} Commercial Concepts...</span>
                </>
              ) : (
                <span>Generate Stock Ideas ({count})</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results Batch View */}
      <UniversalPromptBatchView
        prompts={results}
        isGenerating={isGenerating}
        progress={progress}
        subject={subject}
        instructions={instructions}
        sectionTitle="Idea Generator"
        diversityScore={diversityScore}
        onRegenerateBatch={handleGenerate}
        onRegenerateSingle={handleRegenerateSingle}
        onSendToMetadata={onSendToMetadata}
        onSendToRisk={onSendToRisk}
        showToast={showToast}
      />
    </div>
  );
};
