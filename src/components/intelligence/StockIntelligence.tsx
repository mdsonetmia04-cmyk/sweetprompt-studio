import React, { useState } from 'react';
import { TrendingUp, Calendar, ArrowRight, Layers, Tag, Download, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { SeasonalEvent, SeasonalConcept } from '../../types';
import { exportToCSV, exportToJSON } from '../../lib/utils/exportUtils';
import { AIManager } from '../../lib/ai/AIManager';

interface StockIntelligenceProps {
  onSelectPromptIdea: (idea: string) => void;
}

export const StockIntelligence: React.FC<StockIntelligenceProps> = ({
  onSelectPromptIdea,
}) => {
  const [selectedSeason, setSelectedSeason] = useState('Autumn & Halloween');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiConcepts, setAiConcepts] = useState<SeasonalConcept[]>([]);

  const seasonalEvents: SeasonalEvent[] = [
    {
      id: 'halloween',
      name: 'Halloween & Autumn',
      season: 'Fall',
      description: 'High-demand seasonal concepts for autumn flatlays, spooky creative events, and cozy lifestyle themes.',
      concepts: [
        {
          title: 'Cozy Autumn Coffee & Pumpkin Flatlay',
          promptIdea: 'Flatlay photography of hot spiced pumpkin latte, autumn leaves, cinnamon sticks on rustic wooden table, soft morning window light, high copy space',
          category: 'Lifestyle',
          commercialUse: 'Seasonal advertising, cafe menus, food blogs',
          copySpace: '80% top copy space',
        },
        {
          title: 'Modern Minimalist Halloween Party Decor',
          promptIdea: 'Minimalist Halloween party arrangement with matte black pumpkins, subtle gold candles, elegant typography space, high-end interior styling',
          category: 'Seasonal',
          commercialUse: 'Event planning, festive marketing campaigns',
          copySpace: 'Center copy space',
        },
      ],
    },
    {
      id: 'backtoschool',
      name: 'Back to School & Learning',
      season: 'Late Summer',
      description: 'Educational technology, modern virtual classrooms, stationery supplies, and student productivity.',
      concepts: [
        {
          title: 'Modern Online Education Setup',
          promptIdea: 'Sleek laptop displaying online course dashboard, colorful stationery neatly arranged on clean oak desk, bright natural sunlight, editorial photography',
          category: 'Education',
          commercialUse: 'EdTech platforms, school supplies retail, webinars',
          copySpace: '75% right copy space',
        },
        {
          title: 'Collaborative Study Group with Tablets',
          promptIdea: 'Top down view of diverse students brainstorming over digital tablet sketches and notebooks, bright minimalist study space',
          category: 'Education',
          commercialUse: 'University brochures, student lifestyle blogs',
          copySpace: 'Balanced negative space',
        },
      ],
    },
    {
      id: 'newyear',
      name: 'New Year & Financial Planning',
      season: 'Winter',
      description: 'Financial goal setting, investment growth, resolution planning, and business milestone tracking.',
      concepts: [
        {
          title: 'Financial Growth & Investment Strategy',
          promptIdea: 'Abstract 3D financial growth chart with glowing green trend lines, digital coin icons, modern dark mode fintech UI aesthetic',
          category: 'Finance',
          commercialUse: 'Banking apps, investment portfolios, wealth management',
          copySpace: 'Wide panoramic format',
        },
        {
          title: 'Goal Setting Notebook and Coffee',
          promptIdea: 'Close up of leather notebook with 2026 goals written in elegant typography, cup of espresso, gold pen, professional executive desk',
          category: 'Business',
          commercialUse: 'Corporate stationery, productivity apps, coaching ads',
          copySpace: '65% left copy space',
        },
      ],
    },
  ];

  const currentEvent = seasonalEvents.find(e => e.name === selectedSeason) || seasonalEvents[0];

  const seasonTabClass = (active: boolean) =>
    `px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
      active
        ? 'bg-[#C74A43] hover:bg-[#B53F39] text-[#F3EDE2]'
        : 'border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] hover:bg-[#E2D9C7] dark:hover:bg-[#171E24] text-[#1A2024] dark:text-[#F3EDE2]'
    }`;

  const smallSecondaryClass = "px-3 py-2 border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] hover:bg-[#E2D9C7] dark:hover:bg-[#171E24] text-[#1A2024] dark:text-[#F3EDE2] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="rounded-xl border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] p-5 sm:p-6">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#606669] dark:text-[#8C8A86] mb-1">
          Stock Intelligence
        </div>
        <h1 className="font-editorial text-2xl sm:text-3xl text-[#1A2024] dark:text-[#F3EDE2] font-normal tracking-tight flex items-center gap-2.5">
          <TrendingUp className="w-6 h-6 text-[#C74A43]" />
          <span>AI-Driven Commercial Concept Generator</span>
        </h1>
        <p className="text-xs text-[#606669] dark:text-[#8C8A86] mt-1 max-w-2xl">
          Explore high-demand microstock themes, seasonal demand surges, and commercial concepts optimized for Adobe Stock buyer search patterns.
        </p>
      </div>

      {/* Season Selector Tabs & Bulk Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {seasonalEvents.map((evt) => (
            <button
              key={evt.id}
              onClick={() => setSelectedSeason(evt.name)}
              className={seasonTabClass(selectedSeason === evt.name)}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{evt.name}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={async () => {
              setIsAiGenerating(true);
              try {
                const response = await AIManager.generateStructured<{ concepts: SeasonalConcept[] }>(
                  `Generate 4 high-demand commercial Adobe Stock visual concepts for the season/trend: "${selectedSeason}". Focus on underserved niches, high buyer demand, corporate advertising utility, and generous copy space.`,
                  {
                    taskType: 'idea-generation',
                    systemInstruction: `You are a microstock commercial trend analyst. Generate commercially viable stock photo/illustration ideas.
Return JSON strictly:
{
  "concepts": [
    {
      "title": "string",
      "promptIdea": "detailed stock prompt",
      "category": "string",
      "commercialUse": "string",
      "copySpace": "string"
    }
  ]
}`
                  }
                );
                if (response?.concepts && Array.isArray(response.concepts)) {
                  setAiConcepts(response.concepts);
                }
              } catch (err) {
                console.error(err);
              } finally {
                setIsAiGenerating(false);
              }
            }}
            disabled={isAiGenerating}
            className="px-3 py-2 bg-[#C74A43] hover:bg-[#B53F39] disabled:opacity-50 text-[#F3EDE2] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            {isAiGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>{isAiGenerating ? 'Brainstorming...' : 'Trend Expander'}</span>
          </button>

          <button
            onClick={() => {
              const allConcepts = [...seasonalEvents.flatMap(e => 
                e.concepts.map(c => ({
                  SeasonEvent: e.name,
                  Category: c.category,
                  Title: c.title,
                  PromptIdea: c.promptIdea,
                  CommercialUse: c.commercialUse,
                  CopySpace: c.copySpace
                }))
              ), ...aiConcepts.map(c => ({
                SeasonEvent: `${selectedSeason} (AI)`,
                Category: c.category,
                Title: c.title,
                PromptIdea: c.promptIdea,
                CommercialUse: c.commercialUse,
                CopySpace: c.copySpace
              }))];
              exportToCSV(allConcepts, `stock-intelligence-all-${Date.now()}.csv`);
            }}
            className={smallSecondaryClass}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#C74A43]" />
            <span>Bulk CSV All</span>
          </button>
          <button
            onClick={() => {
              const currentConcepts = [...currentEvent.concepts, ...aiConcepts].map(c => ({
                Season: currentEvent.name,
                Category: c.category,
                Title: c.title,
                PromptIdea: c.promptIdea,
                CommercialUse: c.commercialUse,
                CopySpace: c.copySpace
              }));
              exportToJSON(currentConcepts, `stock-intelligence-${currentEvent.id}-${Date.now()}.json`);
            }}
            className={smallSecondaryClass}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Concepts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {aiConcepts.map((concept, idx) => (
          <div key={`ai-${idx}`} className="rounded-xl border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] p-5 sm:p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30] text-[#C74A43] flex items-center gap-1.5">
                  <Layers className="w-3 h-3" />
                  <span>AI Concept • {concept.category}</span>
                </span>
                <span className="text-xs text-[#606669] dark:text-[#8C8A86]">{concept.copySpace}</span>
              </div>
              <h3 className="font-semibold text-[#1A2024] dark:text-[#F3EDE2] text-base">{concept.title}</h3>
              <p className="text-xs font-mono text-[#1A2024] dark:text-[#F3EDE2] bg-[#E9E1D1] dark:bg-[#0C0F12] p-3.5 rounded-lg border border-[#D8CEBF] dark:border-[#272D30] leading-relaxed">
                {concept.promptIdea}
              </p>
              <p className="text-xs text-[#606669] dark:text-[#8C8A86]">
                <strong className="text-[#1A2024] dark:text-[#F3EDE2]">Commercial Use:</strong> {concept.commercialUse}
              </p>
            </div>

            <button
              onClick={() => onSelectPromptIdea(concept.promptIdea)}
              className="w-full rounded-lg bg-[#C74A43] hover:bg-[#B53F39] text-[#F3EDE2] font-semibold px-4 py-3 text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Load into Prompt Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {currentEvent.concepts.map((concept, idx) => (
          <div key={idx} className="rounded-xl border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] p-5 sm:p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30] text-[#1A2024] dark:text-[#F3EDE2]">
                  {concept.category}
                </span>
                <span className="text-xs text-[#606669] dark:text-[#8C8A86]">{concept.copySpace}</span>
              </div>
              <h3 className="font-semibold text-[#1A2024] dark:text-[#F3EDE2] text-base">{concept.title}</h3>
              <p className="text-xs font-mono text-[#1A2024] dark:text-[#F3EDE2] bg-[#E9E1D1] dark:bg-[#0C0F12] p-3.5 rounded-lg border border-[#D8CEBF] dark:border-[#272D30] leading-relaxed">
                {concept.promptIdea}
              </p>
              <p className="text-xs text-[#606669] dark:text-[#8C8A86]">
                <strong className="text-[#1A2024] dark:text-[#F3EDE2]">Commercial Use:</strong> {concept.commercialUse}
              </p>
            </div>

            <button
              onClick={() => onSelectPromptIdea(concept.promptIdea)}
              className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] hover:bg-[#C74A43] hover:border-[#C74A43] hover:text-[#F3EDE2] text-[#1A2024] dark:text-[#F3EDE2] font-semibold px-4 py-3 text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Load into Prompt Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
