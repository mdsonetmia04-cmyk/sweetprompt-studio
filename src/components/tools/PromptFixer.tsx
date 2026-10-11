import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Copy, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  ArrowRight, 
  CheckCircle2, 
  Tag, 
  ShieldAlert, 
  Layers
} from 'lucide-react';
import { AISettings } from '../../types';
import { sanitizePromptInput, autoSanitizePrompt } from '../../lib/adobe-stock/promptSanitizer';
import { findIPRisks } from '../../lib/adobe-stock/ipRules';
import { saveHistoryItem, saveLibraryItem } from '../../lib/storage/localStorage';
import { AIManager } from '../../lib/ai/AIManager';

interface PromptFixerProps {
  settings: AISettings;
  showToast: (msg: string) => void;
  onSendToMetadata: (prompt: string, title?: string, category?: string) => void;
  onSendToRisk: (prompt: string) => void;
}

export const PromptFixer: React.FC<PromptFixerProps> = ({
  settings,
  showToast,
  onSendToMetadata,
  onSendToRisk
}) => {
  const [dirtyPrompt, setDirtyPrompt] = useState('');
  const [isAiFixing, setIsAiFixing] = useState(false);
  const [fixedResult, setFixedResult] = useState<{
    original: string;
    sanitized: string;
    hasRisk: boolean;
    replacedCount: number;
    replacedTerms: { original: string; replacement: string; reason: string }[];
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const sampleProblemPrompts = [
    'iPhone 16 on wooden desk next to Nike sneakers, in the style of Van Gogh, photorealistic 8k octane render',
    'Batman drinking Starbucks coffee at McDonald’s, highly detailed, trending on artstation masterpiece',
    'Elon Musk speaking at Tesla showroom with Sony camera, hyperrealistic unreal engine 5'
  ];

  const handleFix = () => {
    if (!dirtyPrompt.trim()) {
      showToast('Please enter a prompt to sanitize.');
      return;
    }

    const scan = autoSanitizePrompt(dirtyPrompt);
    setFixedResult({
      original: dirtyPrompt,
      sanitized: scan.sanitizedPrompt,
      hasRisk: scan.hasRisk,
      replacedCount: scan.replacedTerms.length,
      replacedTerms: scan.replacedTerms
    });

    saveHistoryItem({
      type: 'prompt',
      title: `Sanitized Stock Prompt (${scan.replacedTerms.length} fixes)`,
      summary: scan.sanitizedPrompt.slice(0, 100),
      data: scan,
      provider: settings.provider,
      model: settings.model
    });

    showToast(`Sanitized prompt: ${scan.replacedTerms.length} violations resolved`);
  };

  const handleAiFix = async () => {
    if (!dirtyPrompt.trim()) {
      showToast('Please enter a prompt to rewrite with AI.');
      return;
    }

    setIsAiFixing(true);
    try {
      const response = await AIManager.generateStructured<{
        sanitizedPrompt: string;
        replacedTerms: { original: string; replacement: string; reason: string }[];
        commercialRationale: string;
      }>(
        `Rewrite and sanitize the following AI prompt to make it 100% compliant with Adobe Stock Contributor Guidelines and Commercial Safe Harbor:\n\nDirty Prompt: "${dirtyPrompt}"`,
        {
          taskType: 'prompt-generation',
          systemInstruction: `You are an elite Adobe Stock Prompt Sanitizer and IP Compliance Engineer.
Transform uncompliant prompts by:
1. Converting all recognizable human faces, close-up portraits, or direct eye contact into anonymous faceless compositions (seen from behind, silhouette, cropped headless, or hands-only interaction) to prevent model release rejections and facial AI distortion.
2. Replacing all trademarked brand names, vehicle badges, and electronics with generic commercial descriptions (e.g., iPhone -> sleek modern smartphone, Nike -> unbranded athletic sneakers, Rolex -> luxury mechanical watch).
3. Removing all corporate logos, brand emblems, living artists ("in the style of"), celebrities, and copyrighted characters (Marvel, Disney, Star Wars, etc.).
4. Stripping out banned AI quality buzzwords ("photorealistic", "hyperrealistic", "8k", "octane render", "trending on artstation", "unreal engine", "masterpiece").
5. Ensuring zero watermarks, zero text, and adding commercial stock qualities: lighting, perspective, depth of field, and clean copy space.

Return strictly JSON format:
{
  "sanitizedPrompt": "the clean, high-grade stock prompt",
  "replacedTerms": [
    { "original": "flagged term", "replacement": "clean generic replacement", "reason": "why it was replaced" }
  ],
  "commercialRationale": "Brief explanation of how this was elevated for stock buyers"
}`
        }
      );

      setFixedResult({
        original: dirtyPrompt,
        sanitized: response.sanitizedPrompt,
        hasRisk: response.replacedTerms.length > 0,
        replacedCount: response.replacedTerms.length,
        replacedTerms: response.replacedTerms,
      });

      showToast(`AI Sanitized & Rewrote prompt (${response.replacedTerms.length} violations eliminated)`);
    } catch (err: any) {
      showToast(`AI Fix Error: ${err.message || 'Failed to fix prompt with AI'}`);
    } finally {
      setIsAiFixing(false);
    }
  };

  const handleCopy = () => {
    if (!fixedResult) return;
    navigator.clipboard.writeText(fixedResult.sanitized);
    setCopied(true);
    showToast('Clean prompt copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const smallSecondaryClass = "px-2.5 py-1.5 rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] hover:bg-[#E2D9C7] dark:hover:bg-[#171E24] text-[#1A2024] dark:text-[#F3EDE2] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer";

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#606669] dark:text-[#8C8A86] mb-1">
          Compliance Tools
        </div>
        <h1 className="font-editorial text-2xl sm:text-3xl text-[#1A2024] dark:text-[#F3EDE2] font-normal tracking-tight flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-[#C74A43]" />
          <span>Prompt Fixer & Compliance Sanitizer</span>
        </h1>
        <p className="text-xs text-[#606669] dark:text-[#8C8A86] mt-1 max-w-2xl">
          Instant rule-based sanitation: strips brand names, celebrity figures, living artist styles ("in the style of"), and AI spam buzzwords, substituting Adobe Stock-safe commercial terminology.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] p-5 sm:p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#1A2024] dark:text-[#F3EDE2]">
                  Input Prompt with Potential Violations *
                </label>
              </div>
              <textarea
                value={dirtyPrompt}
                onChange={(e) => setDirtyPrompt(e.target.value)}
                placeholder="Paste any prompt with brand names, logos, artist styles, or buzzwords..."
                rows={5}
                className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-xs text-[#1A2024] dark:text-[#F3EDE2] placeholder-[#606669] dark:placeholder-[#606669] focus:outline-none focus:border-[#C74A43]"
              />
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#606669] dark:text-[#8C8A86] uppercase tracking-wider block mb-1.5">
                Try a Sample Risky Prompt:
              </span>
              <div className="space-y-1.5">
                {sampleProblemPrompts.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => setDirtyPrompt(sample)}
                    className="w-full text-left p-2 rounded-lg bg-[#E9E1D1] dark:bg-[#0C0F12] hover:bg-[#E2D9C7] dark:hover:bg-[#171E24] text-[11px] text-[#606669] dark:text-[#8C8A86] border border-[#D8CEBF] dark:border-[#272D30] truncate transition-colors cursor-pointer"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handleFix}
                className="rounded-lg bg-[#C74A43] hover:bg-[#B53F39] text-[#F3EDE2] font-semibold px-4 py-2.5 text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Fast Sanitize</span>
              </button>

              <button
                onClick={handleAiFix}
                disabled={isAiFixing}
                className="border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] hover:bg-[#E2D9C7] dark:hover:bg-[#171E24] text-[#1A2024] dark:text-[#F3EDE2] font-medium rounded-lg px-4 py-2.5 text-xs disabled:opacity-50 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {isAiFixing ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                <span>{isAiFixing ? 'Rewriting...' : 'Smart Rewrite'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-sm font-semibold text-[#1A2024] dark:text-[#F3EDE2]">
            Sanitized Adobe Stock-Safe Result
          </h2>

          {!fixedResult && (
            <div className="rounded-xl border border-dashed border-[#D8CEBF] dark:border-[#272D30] p-12 text-center bg-[#EDE6D8]/60 dark:bg-[#11161A]/60 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#E9E1D1] dark:bg-[#0C0F12] text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border border-[#D8CEBF] dark:border-[#272D30]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-[#1A2024] dark:text-[#F3EDE2] text-sm">
                Ready to Sanitize
              </h3>
              <p className="text-xs text-[#606669] dark:text-[#8C8A86] max-w-sm mx-auto">
                Paste any prompt containing trademarks (e.g. Nike, iPhone), artist names ("style of Picasso"), or spam buzzwords to clean it automatically.
              </p>
            </div>
          )}

          {fixedResult && (
            <div className="rounded-xl border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/60">
                    ADOBE STOCK COMPLIANT
                  </span>
                  <span className="text-xs text-[#606669] dark:text-[#8C8A86]">
                    {fixedResult.replacedCount} issue{fixedResult.replacedCount === 1 ? '' : 's'} cleaned
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className={smallSecondaryClass}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Clean Output */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-[#606669] dark:text-[#8C8A86] uppercase tracking-wider block">
                  Sanitized Stock Prompt:
                </span>
                <div className="p-3.5 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/50 font-mono text-xs text-[#1A2024] dark:text-[#F3EDE2] leading-relaxed select-all">
                  {fixedResult.sanitized}
                </div>
              </div>

              {/* Replacements Breakdown */}
              {fixedResult.replacedTerms.length > 0 ? (
                <div className="p-3.5 rounded-lg bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 space-y-2">
                  <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Cleaned Violations & Substitutions:
                  </span>
                  <div className="space-y-2 pt-1">
                    {fixedResult.replacedTerms.map((item, idx) => (
                      <div key={idx} className="text-xs p-2.5 rounded-lg bg-[#EDE6D8] dark:bg-[#11161A] border border-amber-200/60 dark:border-amber-900/60">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-rose-600 line-through">"{item.original}"</span>
                          <ArrowRight className="w-3 h-3 text-[#606669] dark:text-[#8C8A86]" />
                          <span className="font-semibold text-emerald-600">"{item.replacement}"</span>
                        </div>
                        <p className="text-[11px] text-[#606669] dark:text-[#8C8A86] mt-0.5">
                          {item.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>No trademark, brand, or artist violations detected in this prompt.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#D8CEBF] dark:border-[#272D30]">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => onSendToMetadata(fixedResult.sanitized, 'Sanitized Stock Asset', 'Commercial Stock')}
                    className={smallSecondaryClass}
                  >
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Send to Metadata</span>
                  </button>
                  <button
                    onClick={() => onSendToRisk(fixedResult.sanitized)}
                    className={smallSecondaryClass}
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                    <span>Verify Scan</span>
                  </button>
                </div>
                <button
                  onClick={() => {
                    saveLibraryItem({
                      title: 'Sanitized Prompt',
                      prompt: fixedResult.sanitized,
                      category: 'Sanitized',
                      contentType: 'Photo',
                      aspectRatio: '16:9',
                      tags: ['Cleaned', 'Sanitized']
                    });
                    showToast('Saved to Library');
                  }}
                  className={smallSecondaryClass}
                >
                  <Layers className="w-3.5 h-3.5 text-[#C74A43]" />
                  <span>Save to Library</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
