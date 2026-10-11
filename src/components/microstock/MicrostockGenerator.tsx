import React, { useState } from 'react';
import { Layers, Copy, Check, Tag, RefreshCw, FileText, Download } from 'lucide-react';
import { AISettings } from '../../types';
import { callAI } from '../../lib/ai/aiService';
import { saveHistoryItem } from '../../lib/storage/localStorage';
import { downloadFile } from '../../lib/utils/exportUtils';
import { autoSanitizePrompt } from '../../lib/adobe-stock/promptSanitizer';

interface MicrostockGeneratorProps {
  showToast: (msg: string) => void;
  onSendToMetadata: (prompt: string, title?: string, category?: string) => void;
}

export const MicrostockGenerator: React.FC<MicrostockGeneratorProps> = ({
  showToast,
  onSendToMetadata,
}) => {
  const [marketplace, setMarketplace] = useState('Adobe Stock');
  const [category, setCategory] = useState('Default (As Is / Exact)');
  const [topic, setTopic] = useState('Airport and modern air travel concept');
  const [numberPrompts, setNumberPrompts] = useState(10);
  const [negativeSpace, setNegativeSpace] = useState('85% copy space');
  const [humanFaces, setHumanFaces] = useState('No');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  
  const [loading, setLoading] = useState(false);
  const [generatedList, setGeneratedList] = useState<{ title: string; prompt: string; category: string }[]>([]);

  const marketplaces = ['Adobe Stock', 'Shutterstock', 'Freepik', 'Getty Images', 'Alamy'];
  const categories = [
    'Default (As Is / Exact)',
    'Travel & Tourism', 'Business & Corporate', 'Technology & AI', 
    'Healthcare & Medical', 'Finance & Banking', 'Lifestyle & Family',
    'Food & Beverage', 'E-commerce & Retail', 'Logistics & Shipping', 'Abstract Backgrounds'
  ];

  const handleGenerateBulk = async () => {
    if (!topic.trim()) {
      showToast('Please enter a topic.');
      return;
    }

    setLoading(true);
    try {
      const systemInstruction = `You are a professional microstock prompt generator specialized in Adobe Stock compliance. Generate exactly ${numberPrompts} distinct, commercial-ready AI image prompts for ${marketplace}.
Category: ${category}
Topic: ${topic}
Negative Space: ${negativeSpace}
Human Faces: Faceless & Anonymous (strictly NO recognizable human faces, close-up portraits, or head-on eyes; if people are depicted, frame from behind, silhouette, cropped headless, or hands-only)
Aspect Ratio: ${aspectRatio}

STRICT ADOBE STOCK COMPLIANCE RULES:
1. NEVER generate recognizable human faces or close-up portraits (always faceless, rear-view, silhouette, or hands-only).
2. NEVER include brand names, corporate logos, emblems, or registered trademarks (use generic descriptions).
3. NEVER include living artists, celebrities, or copyrighted fictional characters.
4. NEVER use spam buzzwords like "photorealistic", "8k", "trending on artstation", "octane render".
5. Ensure zero watermarks, zero text, and zero typography errors.

Ensure each prompt is uniquely varied in composition, angle, and setting.
Return a JSON array of objects:
[
  { "title": "Concise Commercial Title", "prompt": "Complete detailed brand-safe prompt string...", "category": "${category}" }
]`;

      const raw = await callAI(`Generate ${numberPrompts} stock prompts for: ${topic}`, systemInstruction, true);
      const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const items = (Array.isArray(parsed) ? parsed : []).map((item: any) => {
        const pScan = autoSanitizePrompt(item.prompt || '');
        return {
          title: item.title || topic,
          prompt: pScan.sanitizedPrompt,
          category: item.category || category
        };
      });
      setGeneratedList(items);

      saveHistoryItem({
        type: 'microstock',
        title: `Bulk Microstock: ${topic} (${items.length} prompts)`,
        summary: items[0]?.prompt || topic,
        data: items,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
      });

      showToast(`Generated ${items.length} commercial microstock prompts`);
    } catch (err: any) {
      showToast(err.message || 'Bulk generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (generatedList.length === 0) return;
    const csvLines = ['Title,Prompt,Category'];
    generatedList.forEach(item => {
      csvLines.push(`"${item.title.replace(/"/g, '""')}","${item.prompt.replace(/"/g, '""')}","${item.category}"`);
    });
    downloadFile(csvLines.join('\n'), `microstock-batch-${Date.now()}.csv`, 'text/csv');
    showToast('Exported bulk prompts as CSV');
  };

  const handleExportJSON = () => {
    if (generatedList.length === 0) return;
    downloadFile(JSON.stringify(generatedList, null, 2), `microstock-batch-${Date.now()}.json`, 'application/json');
    showToast('Exported bulk prompts as JSON');
  };

  const handleExportTXT = () => {
    if (generatedList.length === 0) return;
    const textData = generatedList.map((item, idx) => `[PROMPT ${idx + 1}] ${item.title}\n${item.prompt}\n`).join('\n');
    downloadFile(textData, `microstock-batch-${Date.now()}.txt`, 'text/plain');
    showToast('Exported bulk prompts as TXT');
  };

  const handleCopyAll = () => {
    if (generatedList.length === 0) return;
    const all = generatedList.map((item, idx) => `${idx + 1}. ${item.title}\n${item.prompt}`).join('\n\n');
    navigator.clipboard.writeText(all);
    showToast('Copied all bulk prompts to clipboard');
  };

  const smallExportClass = "px-2.5 py-1.5 border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] hover:bg-[#E2D9C7] dark:hover:bg-[#171E24] text-[#1A2024] dark:text-[#F3EDE2] rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#606669] dark:text-[#8C8A86] mb-1">
          Microstock Workflow
        </div>
        <h1 className="font-editorial text-2xl sm:text-3xl text-[#1A2024] dark:text-[#F3EDE2] font-normal tracking-tight flex items-center gap-2.5">
          <Layers className="w-6 h-6 text-[#C74A43]" />
          <span>Bulk Microstock Generator</span>
        </h1>
        <p className="text-xs text-[#606669] dark:text-[#8C8A86] mt-1 max-w-xl">
          Generate high-volume batches of marketplace-ready, compliance-filtered stock prompts in one pass.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8CEBF] dark:border-[#272D30]">
              <h3 className="font-semibold text-[#1A2024] dark:text-[#F3EDE2] text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#C74A43]" />
                <span>Bulk Generator Parameters</span>
              </h3>
              <span className="text-[11px] text-[#606669] dark:text-[#8C8A86] font-mono">Microstock Workflow</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#606669] dark:text-[#8C8A86]">Marketplace</label>
              <select
                value={marketplace}
                onChange={(e) => setMarketplace(e.target.value)}
                className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-sm text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
              >
                {marketplaces.map(m => <option key={m} value={m} className="bg-[#11161A] text-[#F3EDE2]">{m}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#606669] dark:text-[#8C8A86]">Category & Subcategory</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-sm text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
              >
                {categories.map(c => <option key={c} value={c} className="bg-[#11161A] text-[#F3EDE2]">{c}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#606669] dark:text-[#8C8A86]">Topic / Core Theme *</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Sustainable green energy and wind turbines in agricultural landscape..."
                rows={3}
                className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-sm text-[#1A2024] dark:text-[#F3EDE2] placeholder-[#606669] dark:placeholder-[#606669] focus:outline-none focus:border-[#C74A43] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#606669] dark:text-[#8C8A86]">Number of Prompts</label>
                <select
                  value={numberPrompts}
                  onChange={(e) => setNumberPrompts(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-sm text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
                >
                  {[5, 10, 20, 30].map(n => <option key={n} value={n} className="bg-[#11161A] text-[#F3EDE2]">{n} Prompts</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#606669] dark:text-[#8C8A86]">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-sm text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
                >
                  {['1:1', '4:5', '3:4', '16:9', '9:16', '3:2'].map(a => <option key={a} value={a} className="bg-[#11161A] text-[#F3EDE2]">{a}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#606669] dark:text-[#8C8A86]">Negative Space</label>
                <input
                  type="text"
                  value={negativeSpace}
                  onChange={(e) => setNegativeSpace(e.target.value)}
                  className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-sm text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#606669] dark:text-[#8C8A86]">Human Faces</label>
                <select
                  value={humanFaces}
                  onChange={(e) => setHumanFaces(e.target.value)}
                  className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-sm text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
                >
                  <option value="No">No (Brand safe)</option>
                  <option value="Yes">Yes (With Model Release)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateBulk}
              disabled={loading}
              className="w-full rounded-lg bg-[#C74A43] hover:bg-[#B53F39] text-[#F3EDE2] font-semibold px-4 py-3 text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating batch...</span>
                </>
              ) : (
                <span>Generate Bulk Prompts ({numberPrompts})</span>
              )}
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-xl border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] p-5 sm:p-6 flex flex-col h-full min-h-[550px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#D8CEBF] dark:border-[#272D30]">
              <h3 className="font-semibold text-[#1A2024] dark:text-[#F3EDE2] text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C74A43]" />
                <span>Generated Batch ({generatedList.length})</span>
              </h3>
              {generatedList.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={handleExportCSV}
                    className="px-2.5 py-1.5 bg-[#C74A43] hover:bg-[#B53F39] text-[#F3EDE2] rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Export CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className={smallExportClass}
                    title="Export JSON"
                  >
                    <span>JSON</span>
                  </button>
                  <button
                    onClick={handleExportTXT}
                    className={smallExportClass}
                    title="Export TXT"
                  >
                    <span>TXT</span>
                  </button>
                  <button
                    onClick={handleCopyAll}
                    className={smallExportClass}
                    title="Copy All"
                  >
                    <Copy className="w-3 h-3" />
                    <span>All</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto max-h-[600px] space-y-3 py-4 pr-1">
              {generatedList.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-12">
                  <div className="w-12 h-12 rounded-xl bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30] text-[#606669] dark:text-[#8C8A86] flex items-center justify-center mb-3">
                    <Layers className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-[#1A2024] dark:text-[#F3EDE2] text-sm">No bulk prompts generated yet</p>
                  <p className="text-xs text-[#606669] dark:text-[#8C8A86] max-w-xs mt-1">
                    Configure parameters and generate a high-volume batch for stock submission workflows.
                  </p>
                </div>
              ) : (
                generatedList.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-mono font-semibold text-[#C74A43]">#{idx + 1} • {item.title}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(item.prompt);
                            showToast(`Copied prompt #${idx + 1}`);
                          }}
                          className={smallExportClass}
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                        <button
                          onClick={() => onSendToMetadata(item.prompt, item.title, item.category)}
                          className={smallExportClass}
                        >
                          <Tag className="w-3 h-3" />
                          <span>Metadata</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-xs font-mono text-[#1A2024] dark:text-[#F3EDE2] leading-relaxed">
                      {item.prompt}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
