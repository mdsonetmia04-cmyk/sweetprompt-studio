import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Copy, 
  Check, 
  FileSpreadsheet, 
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { MetadataResult } from '../../types';
import { generateStockMetadata } from '../../lib/metadata/generator';
import { exportMetadataCSV } from '../../lib/utils/exportUtils';
import { saveHistoryItem } from '../../lib/storage/localStorage';

interface MetadataGeneratorProps {
  initialData?: { prompt: string; title?: string; category?: string } | null;
  showToast: (msg: string) => void;
}

export const MetadataGenerator: React.FC<MetadataGeneratorProps> = ({
  initialData,
  showToast,
}) => {
  const [prompt, setPrompt] = useState(initialData?.prompt || '');
  const [contentType, setContentType] = useState('Auto (Default)');
  const [category, setCategory] = useState(initialData?.category || 'Auto (Default)');
  const [commercialIntent, setCommercialIntent] = useState('Auto (Default)');
  
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<MetadataResult | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  useEffect(() => {
    if (initialData?.prompt) {
      setPrompt(initialData.prompt);
      if (initialData.category) setCategory(initialData.category);
    }
  }, [initialData]);

  const contentTypes = ['Auto (Default)', 'Photo', 'Illustration', 'Vector', '3D Render'];
  const categories = [
    'Auto (Default)',
    'Business & Corporate',
    'Technology & AI',
    'Modern Lifestyle & Wellness',
    'Healthcare & Medicine',
    'Sustainability & Green Tech',
    'Food & Culinary',
    'Education & Learning',
    'Architecture & Spaces',
    'Finance & Fintech',
    'Backgrounds & Patterns'
  ];

  const commercialIntents = [
    'Auto (Default)',
    'Adobe Stock Marketplace',
    'Multi-Platform Stock (Adobe + Shutterstock)',
    'Commercial Advertising & Marketing',
    'Web UI & Editorial Publishing'
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      showToast('Please enter a prompt or image description.');
      return;
    }

    setLoading(true);
    try {
      const res = await generateStockMetadata(prompt, category);
      
      const keywordsCapped = (res.keywords || []).slice(0, 49);
      const updatedMetadata: MetadataResult = {
        ...res,
        keywords: keywordsCapped,
        contentType: contentType,
        category: category.startsWith('Default') ? (res.category || 'General Commercial') : category
      };

      setMetadata(updatedMetadata);

      saveHistoryItem({
        type: 'metadata',
        title: `Metadata: ${updatedMetadata.title}`,
        summary: updatedMetadata.keywords.slice(0, 8).join(', '),
        data: updatedMetadata,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
      });

      showToast(`Generated title and ${updatedMetadata.keywords.length} keywords`);
    } catch (err: any) {
      showToast(err.message || 'Failed to generate metadata');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    showToast(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleExportCSV = () => {
    if (!metadata) return;
    exportMetadataCSV(metadata.title, metadata.keywords, metadata.category, contentType);
    showToast('Exported CSV formatted for Adobe Stock');
  };

  const labelClass = 'text-xs font-medium text-[#1A2024] dark:text-[#E8E4DC]';
  const subLabelClass = 'text-[11px] font-medium text-[#606669] dark:text-[#8C8A86]';
  const inputClass = 'w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-sm text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#D8CEBF] dark:border-[#272D30]">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#606669] dark:text-[#8C8A86] mb-1">
            Tagging & Discovery
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl text-[#1A2024] dark:text-[#F3EDE2] font-normal tracking-tight">
            Metadata Studio
          </h1>
          <p className="text-xs text-[#606669] dark:text-[#8C8A86] mt-1">
            Focused two-column metadata editor for Adobe Stock titles, keywords, and categories.
          </p>
        </div>

        {metadata && (
          <button
            onClick={handleExportCSV}
            className="border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] hover:bg-[#E2D9C7] dark:hover:bg-[#171E24] text-[#1A2024] dark:text-[#F3EDE2] font-medium rounded-lg px-4 py-2 text-sm flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#C74A43]" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* Focused Two-Column Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Prompt & Source Concept */}
        <div className="lg:col-span-5">
          <div className="rounded-xl border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] p-5 sm:p-6 space-y-4">
            <div className="space-y-1.5">
              <label className={labelClass}>
                Prompt / Source Concept *
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Paste your stock prompt or visual description..."
                rows={5}
                className={`${inputClass} text-xs p-3 resize-none leading-relaxed placeholder-[#606669] dark:placeholder-[#8C8A86]`}
              />
            </div>

            <div className="space-y-1">
              <label className={subLabelClass}>
                Content Type
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className={`${inputClass} text-xs`}
              >
                {contentTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className={subLabelClass}>
                Stock Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`${inputClass} text-xs`}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className={subLabelClass}>
                Commercial Intent
              </label>
              <select
                value={commercialIntent}
                onChange={(e) => setCommercialIntent(e.target.value)}
                className={`${inputClass} text-xs`}
              >
                {commercialIntents.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="w-full bg-[#C74A43] hover:bg-[#B53F39] disabled:opacity-50 text-[#F3EDE2] font-semibold rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Metadata...</span>
                </>
              ) : (
                <span>Generate Stock Metadata →</span>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Title, Keywords, Category & Clean Output */}
        <div className="lg:col-span-7">
          {metadata ? (
            <div className="rounded-xl border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] p-5 sm:p-6 space-y-5 animate-fade-in">
              {/* Title Section */}
              <div className="space-y-2 pb-5 border-b border-[#D8CEBF] dark:border-[#272D30]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606669] dark:text-[#8C8A86]">
                    Commercial Title
                  </span>
                  <button
                    onClick={() => handleCopyText(metadata.title, 'Title')}
                    className="text-xs text-[#606669] dark:text-[#8C8A86] hover:text-[#1A2024] dark:hover:text-[#F3EDE2] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSection === 'Title' ? <Check className="w-3 h-3 text-[#C74A43]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'Title' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-[#F5F0E6] dark:bg-[#090B0D] border border-[#D8CEBF] dark:border-[#272D30]">
                  <p className="text-sm text-[#1A2024] dark:text-[#F3EDE2] font-medium leading-relaxed select-all">
                    {metadata.title}
                  </p>
                </div>
              </div>

              {/* Keywords Section (Clean Unboxed Layout) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606669] dark:text-[#8C8A86]">
                      Keywords ({metadata.keywords.length})
                    </span>
                    <span className="text-[10px] text-[#606669] dark:text-[#8C8A86] font-mono">
                      (Max 49 tags)
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyText(metadata.keywords.join(', '), 'Keywords')}
                    className="text-xs text-[#606669] dark:text-[#8C8A86] hover:text-[#1A2024] dark:hover:text-[#F3EDE2] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSection === 'Keywords' ? <Check className="w-3 h-3 text-[#C74A43]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'Keywords' ? 'Copied' : 'Copy All'}</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-lg bg-[#F5F0E6] dark:bg-[#090B0D] border border-[#D8CEBF] dark:border-[#272D30] flex flex-wrap gap-1.5 max-h-64 overflow-y-auto">
                  {metadata.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="text-xs text-[#1A2024] dark:text-[#E8E4DC] hover:text-[#C74A43] px-2 py-0.5 rounded bg-[#EDE6D8] dark:bg-[#11161A] border border-[#D8CEBF] dark:border-[#272D30] font-mono transition-colors"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* Metadata Attributes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-2.5 rounded-lg bg-[#F5F0E6] dark:bg-[#090B0D] border border-[#D8CEBF] dark:border-[#272D30]">
                  <span className="text-[10px] text-[#606669] dark:text-[#8C8A86] block">Category</span>
                  <span className="text-[#1A2024] dark:text-[#E8E4DC] font-medium">{metadata.category}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#F5F0E6] dark:bg-[#090B0D] border border-[#D8CEBF] dark:border-[#272D30]">
                  <span className="text-[10px] text-[#606669] dark:text-[#8C8A86] block">Content Type</span>
                  <span className="text-[#1A2024] dark:text-[#E8E4DC] font-medium">{contentType}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#F5F0E6] dark:bg-[#090B0D] border border-[#D8CEBF] dark:border-[#272D30]">
                  <span className="text-[10px] text-[#606669] dark:text-[#8C8A86] block">Format</span>
                  <span className="text-[#C74A43] font-medium">CSV Ready</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] p-10 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-[#F5F0E6] dark:bg-[#090B0D] text-[#606669] dark:text-[#8C8A86] flex items-center justify-center mx-auto border border-[#D8CEBF] dark:border-[#272D30]">
                <Tag className="w-4 h-4" />
              </div>
              <h3 className="font-editorial text-base text-[#1A2024] dark:text-[#F3EDE2]">
                No Metadata Generated
              </h3>
              <p className="text-xs text-[#606669] dark:text-[#8C8A86] max-w-xs mx-auto">
                Paste your prompt or concept on the left and click Generate Metadata.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
