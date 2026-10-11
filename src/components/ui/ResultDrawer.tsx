import React, { useState } from 'react';
import { X, Copy, Check, ShieldCheck, Tag, Layers, ExternalLink } from 'lucide-react';
import { CompliancePanel } from './CompliancePanel';
import { StatusBadge } from './StatusBadge';

export interface DrawerPayload {
  title?: string;
  prompt: string;
  category?: string;
  contentType?: string;
  metadataKeywords?: string[];
  metadataTitle?: string;
}

interface ResultDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: DrawerPayload | null;
  onSendToMetadata?: (prompt: string, title?: string, category?: string) => void;
  onSendToRisk?: (prompt: string) => void;
}

export const ResultDrawer: React.FC<ResultDrawerProps> = ({
  isOpen,
  onClose,
  data,
  onSendToMetadata,
  onSendToRisk,
}) => {
  const [activeTab, setActiveTab] = useState<'result' | 'compliance' | 'metadata'>('result');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !data) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(data.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const labelClass = 'text-xs font-semibold text-[#606669] dark:text-[#8C8A86] block mb-1.5 uppercase tracking-wider text-[10px]';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg bg-[#F5F0E6] dark:bg-[#090B0D] border-l border-[#D8CEBF] dark:border-[#272D30] shadow-2xl flex flex-col h-full z-10 animate-fade-in">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#D8CEBF] dark:border-[#272D30] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#1A2024] dark:text-[#F3EDE2] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#C74A43]" />
              <span>Asset Inspector</span>
            </h3>
            <p className="text-xs text-[#606669] dark:text-[#8C8A86] mt-0.5 truncate max-w-xs">
              {data.title || 'Selected Stock Prompt'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#606669] dark:text-[#8C8A86] hover:text-[#1A2024] dark:hover:text-[#F3EDE2] hover:bg-[#E2D9C7] dark:hover:bg-[#171E24] transition-colors focus-visible:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-[#D8CEBF] dark:border-[#272D30] px-4 bg-[#EDE6D8] dark:bg-[#11161A] text-xs font-medium">
          {(['result', 'compliance', 'metadata'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-3 uppercase tracking-wider text-[11px] font-semibold border-b-2 transition-colors focus-visible:outline-none ${
                activeTab === tab
                  ? 'border-[#C74A43] text-[#C74A43] font-bold'
                  : 'border-transparent text-[#606669] dark:text-[#8C8A86] hover:text-[#1A2024] dark:hover:text-[#F3EDE2]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === 'result' && (
            <div className="space-y-4">
              <div>
                <span className={labelClass}>
                  Stock Title
                </span>
                <p className="text-sm font-semibold text-[#1A2024] dark:text-[#F3EDE2]">
                  {data.title || 'Untitled Commercial Asset'}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={labelClass}>
                    Full Prompt
                  </span>
                  <button
                    onClick={handleCopy}
                    className="text-xs text-[#C74A43] hover:text-[#B53F39] flex items-center gap-1 font-semibold focus-visible:outline-none"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-3.5 rounded-xl bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30] font-mono text-xs text-[#1A2024] dark:text-[#F3EDE2] leading-relaxed select-all">
                  {data.prompt}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-lg bg-[#EDE6D8] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30]">
                  <span className="text-[#606669] dark:text-[#8C8A86] block text-[10px] uppercase font-semibold">Category</span>
                  <span className="text-[#1A2024] dark:text-[#F3EDE2] font-medium">{data.category || 'General Commercial'}</span>
                </div>
                <div className="p-3 rounded-lg bg-[#EDE6D8] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30]">
                  <span className="text-[#606669] dark:text-[#8C8A86] block text-[10px] uppercase font-semibold">Content Type</span>
                  <span className="text-[#1A2024] dark:text-[#F3EDE2] font-medium">{data.contentType || 'Photo (JPG)'}</span>
                </div>
              </div>

              {/* Quick Compliance Preview */}
              <CompliancePanel promptText={data.prompt} titleText={data.title} compact />
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-4">
              <CompliancePanel promptText={data.prompt} titleText={data.title} />
              <div className="p-3 rounded-xl bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30] text-xs space-y-2">
                <span className="font-semibold text-[#1A2024] dark:text-[#F3EDE2] block">Stock Guidelines Reminder:</span>
                <ul className="space-y-1 text-[#606669] dark:text-[#8C8A86] text-[11px] list-disc list-inside">
                  <li>Never upload with visible brand logos or trademarked gadgets.</li>
                  <li>Do not imitate living artist signature styles.</li>
                  <li>Check the Generative AI box upon uploading to Adobe Stock.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'metadata' && (
            <div className="space-y-4">
              <div>
                <span className={labelClass}>
                  Generated / Suggested Title
                </span>
                <p className="text-sm font-semibold text-[#1A2024] dark:text-[#F3EDE2] p-2.5 rounded-lg bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30]">
                  {data.metadataTitle || data.title || 'Commercial Stock Photo Concept'}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-[#606669] dark:text-[#8C8A86] uppercase tracking-wider text-[10px]">
                    Keywords ({data.metadataKeywords?.length || 0}/49)
                  </span>
                </div>
                {data.metadataKeywords && data.metadataKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30]">
                    {data.metadataKeywords.map((k, idx) => (
                      <span
                        key={idx}
                        className={`text-xs px-2 py-0.5 rounded-md ${
                          idx < 3
                            ? 'bg-[#C74A43]/10 text-[#C74A43] font-semibold border border-[#C74A43]/30'
                            : 'bg-[#EDE6D8] dark:bg-[#171E24] text-[#606669] dark:text-[#8C8A86]'
                        }`}
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center rounded-xl bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30] space-y-2">
                    <Tag className="w-6 h-6 text-[#606669] dark:text-[#8C8A86] mx-auto" />
                    <p className="text-xs text-[#606669] dark:text-[#8C8A86]">
                      No metadata generated yet for this prompt.
                    </p>
                    {onSendToMetadata && (
                      <button
                        onClick={() => {
                          onSendToMetadata(data.prompt, data.title, data.category);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#C74A43] hover:bg-[#B53F39] text-[#F3EDE2] text-xs font-medium focus-visible:outline-none"
                      >
                        Open in Metadata Studio
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {onSendToMetadata && (
              <button
                onClick={() => {
                  onSendToMetadata(data.prompt, data.title, data.category);
                  onClose();
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[#D8CEBF] dark:border-[#272D30] bg-[#E9E1D1] dark:bg-[#0C0F12] hover:bg-[#E2D9C7] dark:hover:bg-[#171E24] text-[#1A2024] dark:text-[#F3EDE2] flex items-center gap-1.5 transition-colors focus-visible:outline-none"
              >
                <Tag className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>To Metadata</span>
              </button>
            )}
            {onSendToRisk && (
              <button
                onClick={() => {
                  onSendToRisk(data.prompt);
                  onClose();
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[#D8CEBF] dark:border-[#272D30] bg-[#E9E1D1] dark:bg-[#0C0F12] hover:bg-[#E2D9C7] dark:hover:bg-[#171E24] text-[#1A2024] dark:text-[#F3EDE2] flex items-center gap-1.5 transition-colors focus-visible:outline-none"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
                <span>To IP Scan</span>
              </button>
            )}
          </div>
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#C74A43] hover:bg-[#B53F39] text-[#F3EDE2] flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Prompt'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
