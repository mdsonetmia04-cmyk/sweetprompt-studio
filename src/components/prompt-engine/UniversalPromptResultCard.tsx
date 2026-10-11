import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Bookmark, 
  Tag, 
  ShieldAlert, 
  RefreshCw, 
  CheckSquare, 
  Square,
  Wand2
} from 'lucide-react';
import { GeneratedStockPrompt } from '../../lib/prompt-engine/promptSchema';
import { saveLibraryItem } from '../../lib/storage/localStorage';

interface UniversalPromptResultCardProps {
  promptItem: GeneratedStockPrompt;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onRegenerateSingle?: (id: string) => void;
  onSendToMetadata?: (prompt: string, title?: string, category?: string) => void;
  onSendToRisk?: (prompt: string) => void;
  onSendToImprover?: (prompt: string) => void;
  showToast: (msg: string) => void;
}

export const UniversalPromptResultCard: React.FC<UniversalPromptResultCardProps> = ({
  promptItem,
  isSelected,
  onToggleSelect,
  onRegenerateSingle,
  onSendToMetadata,
  onSendToRisk,
  onSendToImprover,
  showToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(promptItem.prompt);
    setCopied(true);
    showToast('Prompt copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    saveLibraryItem({
      title: `${promptItem.subject} (Prompt ${promptItem.number})`,
      prompt: promptItem.prompt,
      category: promptItem.category || 'General',
      contentType: (promptItem.contentType as any) || 'Photo',
      aspectRatio: promptItem.aspectRatio || 'Default',
      copySpace: promptItem.copySpace || promptItem.negativeSpace,
      tags: [promptItem.commercialUse, promptItem.contentType, promptItem.category].filter(Boolean),
      status: 'ready'
    });
    setSaved(true);
    showToast('Saved prompt to Stock Library');
    setTimeout(() => setSaved(false), 2500);
  };

  const handleRegenerate = async () => {
    if (!onRegenerateSingle) return;
    setRegenerating(true);
    try {
      await onRegenerateSingle(promptItem.id);
      showToast(`Regenerated concept #${promptItem.number}`);
    } finally {
      setRegenerating(false);
    }
  };

  const numStr = String(promptItem.number).padStart(2, '0');

  // Compliance styling: emerald for low risk, amber for review, rose for high risk
  const getRiskStyle = (risk: string) => {
    if (risk === 'LOW RISK' || risk === 'SAFE' || risk === 'LOW') {
      return 'text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    }
    if (risk === 'HIGH RISK' || risk === 'REJECT' || risk === 'CRITICAL') {
      return 'text-rose-700 dark:text-rose-400 border-rose-500/30 bg-rose-500/10';
    }
    return 'text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10';
  };

  const outlineBtn = 'px-2.5 py-1.5 rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#E9E1D1] dark:bg-[#0C0F12] hover:bg-[#E2D9C7] dark:hover:bg-[#171E24] text-[#1A2024] dark:text-[#F3EDE2] text-xs flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none';

  return (
    <div className={`p-4 rounded-lg border transition-colors ${
      isSelected
        ? 'bg-[#EDE6D8] dark:bg-[#171E24] border-[#C74A43]'
        : 'bg-[#EDE6D8] dark:bg-[#11161A] border-[#D8CEBF] dark:border-[#272D30] hover:border-[#C74A43]/40'
    }`}>
      {/* Top row: Number, Title, Metadata */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-[#D8CEBF] dark:border-[#272D30]">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onToggleSelect(promptItem.id)}
            className="text-[#606669] dark:text-[#8C8A86] hover:text-[#C74A43] cursor-pointer focus-visible:outline-none"
            aria-label={`Select prompt ${numStr}`}
          >
            {isSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-[#C74A43]" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
          </button>

          <span className="font-mono text-xs font-semibold text-[#606669] dark:text-[#8C8A86]">
            {numStr}
          </span>

          <span className="text-xs font-semibold text-[#1A2024] dark:text-[#F3EDE2] tracking-wide truncate max-w-xs">
            {promptItem.subject}
          </span>
        </div>

        {/* Status Metadata (Clean Unboxed & Muted Badges) */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-[#606669] dark:text-[#8C8A86]">{promptItem.contentType}</span>
          <span className="text-[#D8CEBF] dark:text-[#383E41]">·</span>
          <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold border ${getRiskStyle(promptItem.ipRisk || 'LOW RISK')}`}>
            {promptItem.ipRisk || 'LOW RISK'}
          </span>
          <span className="text-[#D8CEBF] dark:text-[#383E41]">·</span>
          <span className="text-[#606669] dark:text-[#8C8A86] font-mono text-[10px]">
            {promptItem.similarityStatus || 'DISTINCT'}
          </span>
        </div>
      </div>

      {/* Prompt Text Body */}
      <div className="bg-[#E9E1D1] dark:bg-[#090B0D] p-3 rounded-lg border border-[#D8CEBF] dark:border-[#272D30] mb-3">
        <p className="text-xs text-[#1A2024] dark:text-[#F3EDE2] leading-relaxed select-all font-mono">
          {promptItem.prompt}
        </p>
      </div>

      {/* Footer Controls: Clean text action links / outlined buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
        <div className="flex items-center gap-2">
          {promptItem.aspectRatio && (
            <span className="text-[11px] text-[#606669] dark:text-[#8C8A86] font-mono">
              AR: {promptItem.aspectRatio}
            </span>
          )}
          {promptItem.commercialUse && (
            <span className="text-[11px] text-[#606669] dark:text-[#8C8A86]">
              · {promptItem.commercialUse}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className={outlineBtn}
          >
            {copied ? <Check className="w-3 h-3 text-emerald-700 dark:text-emerald-400" /> : <Copy className="w-3 h-3 text-[#606669] dark:text-[#8C8A86]" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={outlineBtn}
          >
            <Bookmark className={`w-3 h-3 ${saved ? 'text-[#C74A43]' : 'text-[#606669] dark:text-[#8C8A86]'}`} />
            <span>{saved ? 'Saved' : 'Save'}</span>
          </button>

          {onSendToMetadata && (
            <button
              type="button"
              onClick={() => onSendToMetadata(promptItem.prompt, promptItem.subject, promptItem.category)}
              className={outlineBtn}
            >
              <Tag className="w-3 h-3 text-[#606669] dark:text-[#8C8A86]" />
              <span>Metadata</span>
            </button>
          )}

          {onSendToRisk && (
            <button
              type="button"
              onClick={() => onSendToRisk(promptItem.prompt)}
              className={outlineBtn}
            >
              <ShieldAlert className="w-3 h-3 text-[#606669] dark:text-[#8C8A86]" />
              <span>IP Check</span>
            </button>
          )}

          {onRegenerateSingle && (
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenerating}
              className="p-1.5 rounded-lg border border-[#D8CEBF] dark:border-[#272D30] text-[#606669] dark:text-[#8C8A86] hover:text-[#1A2024] dark:hover:text-[#F3EDE2] hover:bg-[#E2D9C7] dark:hover:bg-[#171E24] transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none"
              title="Regenerate single prompt"
            >
              <RefreshCw className={`w-3 h-3 ${regenerating ? 'animate-spin text-[#C74A43]' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
