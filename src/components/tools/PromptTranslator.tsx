import React, { useState } from 'react';
import { 
  Languages, 
  Copy, 
  Check, 
  RefreshCw, 
  Tag, 
  ShieldAlert, 
  Layers
} from 'lucide-react';
import { AISettings } from '../../types';
import { callAI } from '../../lib/ai/aiService';
import { sanitizePromptInput } from '../../lib/adobe-stock/promptSanitizer';
import { saveHistoryItem, saveLibraryItem } from '../../lib/storage/localStorage';

interface PromptTranslatorProps {
  settings: AISettings;
  showToast: (msg: string) => void;
  onSendToMetadata: (prompt: string, title?: string, category?: string) => void;
  onSendToRisk: (prompt: string) => void;
}

export const PromptTranslator: React.FC<PromptTranslatorProps> = ({
  settings,
  showToast,
  onSendToMetadata,
  onSendToRisk
}) => {
  const [foreignPrompt, setForeignPrompt] = useState('');
  const [sourceLang, setSourceLang] = useState('Auto-Detect');
  const [translatedResult, setTranslatedResult] = useState<{
    original: string;
    translatedStockPrompt: string;
    detectedLanguage: string;
    title: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const samplePrompts = [
    { lang: 'Spanish', text: 'Un médico mayor explicando una radiografía digital a un paciente joven en un hospital moderno y luminoso' },
    { lang: 'French', text: 'Une femme d’affaires souriante tenant une tasse de café dans un bureau scandinave épuré' },
    { lang: 'German', text: 'Ein Ingenieur mit Schutzhelm überprüft Solarzellen auf einem modernen Hausdach bei Sonnenuntergang' },
    { lang: 'Japanese', text: 'モダンなカフェでノートパソコンを使ってリモートワークをする若い女性、自然光、コピースペース' }
  ];

  const handleTranslate = async () => {
    if (!foreignPrompt.trim()) {
      showToast('Please enter a prompt to translate.');
      return;
    }

    setLoading(true);
    try {
      const systemInstruction = `You are a specialized multilingual microstock prompt translator.
Translate international prompts into studio-quality English prompts optimized for AI generators (Midjourney, Flux, Adobe Firefly).
Rules:
1. Translate nuances faithfully while formatting as a commercial stock prompt (camera cues, natural light, copy space).
2. Strip trademarks, brand names, and celebrity references.
3. Output JSON strictly.

JSON structure:
{
  "detectedLanguage": "Name of source language",
  "title": "Short descriptive stock title in English",
  "translatedStockPrompt": "Polished English prompt ready for generation"
}`;

      const userReq = `Source Language: ${sourceLang}
Input text: "${foreignPrompt}"
Translate into production-ready English commercial stock prompt.`;

      const raw = await callAI(userReq, systemInstruction, true);
      const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const scan = sanitizePromptInput(parsed.translatedStockPrompt);

      const finalResult = {
        original: foreignPrompt,
        translatedStockPrompt: scan.sanitizedPrompt,
        detectedLanguage: parsed.detectedLanguage || 'Detected Language',
        title: parsed.title || 'Translated Stock Asset'
      };

      setTranslatedResult(finalResult);

      saveHistoryItem({
        type: 'prompt',
        title: `Translated: ${finalResult.title}`,
        summary: scan.sanitizedPrompt.slice(0, 100),
        data: finalResult,
        provider: settings.provider,
        model: settings.model
      });

      showToast(`Translated from ${finalResult.detectedLanguage}`);
    } catch (err: any) {
      showToast(err.message || 'Translation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!translatedResult) return;
    navigator.clipboard.writeText(translatedResult.translatedStockPrompt);
    setCopied(true);
    showToast('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const smallSecondaryClass = "px-2.5 py-1.5 rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] hover:bg-[#E2D9C7] dark:hover:bg-[#171E24] text-[#1A2024] dark:text-[#F3EDE2] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer";

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#606669] dark:text-[#8C8A86] mb-1">
          Prompt Tools
        </div>
        <h1 className="font-editorial text-2xl sm:text-3xl text-[#1A2024] dark:text-[#F3EDE2] font-normal tracking-tight flex items-center gap-2.5">
          <Languages className="w-6 h-6 text-[#C74A43]" />
          <span>Prompt Stock Translator</span>
        </h1>
        <p className="text-xs text-[#606669] dark:text-[#8C8A86] mt-1 max-w-2xl">
          Translate prompts from Spanish, French, German, Japanese, Chinese, Arabic, and more into fluent English stock prompts with photography cues.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] p-5 sm:p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#1A2024] dark:text-[#F3EDE2]">
                  Non-English Prompt *
                </label>
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="text-[11px] rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-2 py-1 text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
                >
                  <option value="Auto-Detect">Auto-Detect</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Portuguese">Portuguese</option>
                  <option value="Italian">Italian</option>
                  <option value="Russian">Russian</option>
                  <option value="Korean">Korean</option>
                  <option value="Hindi">Hindi</option>
                </select>
              </div>
              <textarea
                value={foreignPrompt}
                onChange={(e) => setForeignPrompt(e.target.value)}
                placeholder="Escribe tu prompt en cualquier idioma..."
                rows={4}
                className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-xs text-[#1A2024] dark:text-[#F3EDE2] placeholder-[#606669] dark:placeholder-[#606669] focus:outline-none focus:border-[#C74A43]"
              />
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#606669] dark:text-[#8C8A86] uppercase tracking-wider block mb-1.5">
                Try Examples:
              </span>
              <div className="space-y-1.5">
                {samplePrompts.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setForeignPrompt(s.text);
                      setSourceLang(s.lang);
                    }}
                    className="w-full text-left p-2 rounded-lg bg-[#E9E1D1] dark:bg-[#0C0F12] hover:bg-[#E2D9C7] dark:hover:bg-[#171E24] text-[11px] text-[#606669] dark:text-[#8C8A86] border border-[#D8CEBF] dark:border-[#272D30] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EDE6D8] dark:bg-[#11161A] border border-[#D8CEBF] dark:border-[#272D30] text-[#1A2024] dark:text-[#F3EDE2] shrink-0">
                      {s.lang}
                    </span>
                    <span className="truncate">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleTranslate}
              disabled={loading}
              className="w-full rounded-lg bg-[#C74A43] hover:bg-[#B53F39] text-[#F3EDE2] font-semibold px-4 py-2.5 text-xs disabled:opacity-50 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Translating & Stock Formatting...</span>
                </>
              ) : (
                <>
                  <Languages className="w-4 h-4" />
                  <span>Translate to Stock Prompt</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-sm font-semibold text-[#1A2024] dark:text-[#F3EDE2]">
            Fluent English Stock Prompt
          </h2>

          {!translatedResult && !loading && (
            <div className="rounded-xl border border-dashed border-[#D8CEBF] dark:border-[#272D30] p-12 text-center bg-[#EDE6D8]/60 dark:bg-[#11161A]/60 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#E9E1D1] dark:bg-[#0C0F12] text-[#C74A43] mx-auto flex items-center justify-center border border-[#D8CEBF] dark:border-[#272D30]">
                <Languages className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-[#1A2024] dark:text-[#F3EDE2] text-sm">
                Ready for Translation
              </h3>
              <p className="text-xs text-[#606669] dark:text-[#8C8A86] max-w-sm mx-auto">
                Paste foreign language concepts to convert them into native English commercial stock prompts with studio terminology.
              </p>
            </div>
          )}

          {loading && (
            <div className="rounded-xl border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] p-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#C74A43] animate-spin mx-auto" />
              <p className="text-xs text-[#606669] dark:text-[#8C8A86]">
                Translating idioms and framing with commercial photography keywords...
              </p>
            </div>
          )}

          {translatedResult && (
            <div className="rounded-xl border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-[#C74A43] bg-[#E9E1D1] dark:bg-[#0C0F12] px-2 py-0.5 rounded border border-[#D8CEBF] dark:border-[#272D30] mb-1.5 inline-block uppercase tracking-wider">
                    From {translatedResult.detectedLanguage}
                  </span>
                  <h3 className="font-semibold text-[#1A2024] dark:text-[#F3EDE2] text-base">
                    {translatedResult.title}
                  </h3>
                </div>
                <button
                  onClick={handleCopy}
                  className={smallSecondaryClass}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-[#606669] dark:text-[#8C8A86] uppercase tracking-wider block">
                  Original Text:
                </span>
                <div className="p-2.5 rounded-lg bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30] text-xs text-[#606669] dark:text-[#8C8A86] italic">
                  "{translatedResult.original}"
                </div>

                <span className="text-[11px] font-semibold text-[#606669] dark:text-[#8C8A86] uppercase tracking-wider block pt-1">
                  Commercial English Prompt:
                </span>
                <div className="p-3.5 rounded-lg bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30] font-mono text-xs text-[#1A2024] dark:text-[#F3EDE2] leading-relaxed select-all">
                  {translatedResult.translatedStockPrompt}
                </div>
              </div>

              <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#D8CEBF] dark:border-[#272D30]">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => onSendToMetadata(translatedResult.translatedStockPrompt, translatedResult.title, 'Stock Photo')}
                    className={smallSecondaryClass}
                  >
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Send to Metadata</span>
                  </button>
                  <button
                    onClick={() => onSendToRisk(translatedResult.translatedStockPrompt)}
                    className={smallSecondaryClass}
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                    <span>Scan IP</span>
                  </button>
                </div>
                <button
                  onClick={() => {
                    saveLibraryItem({
                      title: translatedResult.title,
                      prompt: translatedResult.translatedStockPrompt,
                      category: 'Translated',
                      contentType: 'Photo',
                      aspectRatio: '16:9',
                      tags: ['Translated', translatedResult.detectedLanguage]
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
