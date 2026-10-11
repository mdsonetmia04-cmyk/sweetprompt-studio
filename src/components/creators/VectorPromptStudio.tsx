import React, { useState, useEffect } from 'react';
import { 
  PenTool, 
  RefreshCw, 
  SlidersHorizontal,
  Sparkles,
  Download,
  Copy,
  Check,
  CheckSquare,
  Square,
  FileText,
  Info,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  HelpCircle,
  Save,
  RotateCcw,
  Percent
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
import { downloadTXT, downloadCSV } from '../../lib/export/exportEngine';

interface VectorPromptStudioProps {
  settings: AISettings;
  showToast: (msg: string) => void;
  onSendToMetadata: (prompt: string, title?: string, category?: string) => void;
  onSendToRisk: (prompt: string) => void;
  onSendToImprover?: (prompt: string) => void;
}

const PRESET_STORAGE_KEY = 'sweetprompts_vector_preset_settings';

export const VectorPromptStudio: React.FC<VectorPromptStudioProps> = ({
  settings,
  showToast,
  onSendToMetadata,
  onSendToRisk,
  onSendToImprover,
}) => {
  // Main Inputs
  const [subject, setSubject] = useState('');
  const [instructions, setInstructions] = useState('');
  const [count, setCount] = useState<PromptCount>(5);

  // Core Vector Settings (Defaults set to 'Auto (AI Suggested)')
  const [vectorType, setVectorType] = useState('Auto (AI Suggested)');
  const [style, setStyle] = useState('Auto (AI Suggested)');
  const [complexity, setComplexity] = useState('Auto (AI Suggested)');
  const [background, setBackground] = useState('Auto (AI Suggested)');
  const [colorPalette, setColorPalette] = useState('Auto (AI Suggested)');
  const [negativeSpace, setNegativeSpace] = useState('Auto (AI Suggested)');
  const [negativeSpacePercent, setNegativeSpacePercent] = useState('Auto (AI Suggested)');
  const [commercialUse, setCommercialUse] = useState('Auto (AI Suggested)');

  // UI Drawer Toggles
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [results, setResults] = useState<GeneratedStockPrompt[]>([]);
  const [diversityScore, setDiversityScore] = useState<number>(96);

  // Load saved preset from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PRESET_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.vectorType) setVectorType(parsed.vectorType);
        if (parsed.style) setStyle(parsed.style);
        if (parsed.complexity) setComplexity(parsed.complexity);
        if (parsed.background) setBackground(parsed.background);
        if (parsed.colorPalette) setColorPalette(parsed.colorPalette);
        if (parsed.negativeSpace) setNegativeSpace(parsed.negativeSpace);
        if (parsed.negativeSpacePercent) setNegativeSpacePercent(parsed.negativeSpacePercent);
        if (parsed.commercialUse) setCommercialUse(parsed.commercialUse);
      }
    } catch (e) {
      console.warn('Failed to load saved vector preset:', e);
    }
  }, []);

  // Save Settings / Preset
  const handleSavePreset = () => {
    const presetData = {
      vectorType,
      style,
      complexity,
      background,
      colorPalette,
      negativeSpace,
      negativeSpacePercent,
      commercialUse
    };
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presetData));
      showToast('Vector Studio settings saved as default!');
    } catch (e) {
      showToast('Failed to save settings.');
    }
  };

  // Reset Settings to Auto Defaults
  const handleResetPreset = () => {
    setVectorType('Auto (AI Suggested)');
    setStyle('Auto (AI Suggested)');
    setComplexity('Auto (AI Suggested)');
    setBackground('Auto (AI Suggested)');
    setColorPalette('Auto (AI Suggested)');
    setNegativeSpace('Auto (AI Suggested)');
    setNegativeSpacePercent('Auto (AI Suggested)');
    setCommercialUse('Auto (AI Suggested)');
    showToast('Reset all settings to Auto (AI Suggested)');
  };

  // Final Vector QA Checklist State
  const [checklistItems, setChecklistItems] = useState<{ id: string; label: string; checked: boolean }[]>([
    { id: '1', label: 'Original concept (No brand logos, trademarks, corporate emblems)', checked: false },
    { id: '2', label: 'No copyrighted characters, celebrities, or living artist references', checked: false },
    { id: '3', label: 'No unwanted text / Fonts outlined if typography is present', checked: false },
    { id: '4', label: 'Clean contours inspected in Outline Mode (No stray anchor points or open paths)', checked: false },
    { id: '5', label: 'No unnecessary raster elements or unexpanded pixel effects', checked: false },
    { id: '6', label: 'Organized groups and layers for easy buyer customization', checked: false },
    { id: '7', label: 'RGB color mode & correct artboard dimensions (15 MP min, 65 MP max)', checked: false },
    { id: '8', label: 'File size under 45 MB (AI / EPS / SVG format)', checked: false },
    { id: '9', label: 'Generative AI labeled correctly according to Adobe Stock guidelines', checked: false },
  ]);

  const vectorTypeOptions = [
    'Auto (AI Suggested)',
    'Single Object',
    'Icon',
    'Icon Set',
    'Silhouette',
    'Flat Illustration',
    'Pattern',
    'Seamless Pattern',
    'Decorative Element',
    'Botanical',
    'Food',
    'Animal',
    'People Silhouette',
    'Business Concept',
    'Technology Concept',
    'Education Concept',
    'Seasonal Concept',
    'Infographic Element',
    'Background Element'
  ];

  const styleOptions = [
    'Auto (AI Suggested)',
    'Clean Flat Vector',
    'Minimal Vector',
    'Geometric Vector',
    'Editorial Vector',
    'Bold Graphic',
    'Monoline',
    'Line Art',
    'Flat Illustration',
    'Paper Cut Style',
    'Organic Shapes',
    'Retro-inspired Generic',
    'Modern Minimal',
    'Black Silhouette'
  ];

  const complexityOptions = ['Auto (AI Suggested)', 'Simple', 'Moderate', 'Detailed'];

  const backgroundOptions = [
    'Auto (AI Suggested)',
    'Pure White',
    'Transparent-style isolated background',
    'Warm White',
    'Light Gray',
    'Solid Color',
    'Minimal Background'
  ];

  const colorPaletteOptions = [
    'Auto (AI Suggested)',
    '3 Colors',
    'Monochrome',
    'Black & White',
    '2 Colors',
    '4 Colors',
    '5 Colors',
    'Custom'
  ];

  const negativeSpaceOptions = [
    'Auto (AI Suggested)',
    'None',
    'Left',
    'Right',
    'Top',
    'Bottom',
    'Balanced'
  ];

  const negativeSpacePercentOptions = [
    'Auto (AI Suggested)',
    '10%',
    '20%',
    '30%',
    '40%',
    '50%',
    '60%',
    '70%'
  ];

  const commercialUseOptions = [
    'Auto (AI Suggested)',
    'Advertising',
    'Icons',
    'Packaging',
    'Website',
    'Social Media',
    'Presentation',
    'Editorial',
    'Print',
    'Background',
    'Education',
    'Business',
    'E-commerce'
  ];

  const toggleChecklistItem = (id: string) => {
    setChecklistItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handleGenerate = async () => {
    const activeSubject = subject.trim() || 'minimal botanical leaf set, geometric desk lamp, business icon';

    setIsGenerating(true);
    setProgress({ current: 0, total: count, step: 'Analyze', message: 'Analyzing vector trace-friendliness and IP safety...' });

    try {
      // Build vector-type specific composition rules
      let typeSpecificRule = '';
      if (vectorType === 'Auto (AI Suggested)') {
        typeSpecificRule = 'Auto-select optimal vector framing (single object, icon set, or flat illustration based on subject) with crisp outer contours and trace-friendly geometry.';
      } else if (vectorType === 'Single Object') {
        typeSpecificRule = 'Isolated single centered subject, crisp outer contour, simple internal geometry, zero background clutter, trace-friendly object placement.';
      } else if (vectorType === 'Icon' || vectorType === 'Icon Set') {
        typeSpecificRule = 'Simple geometric icon framing, recognizable silhouette, consistent stroke weight, limited color fills, balanced proportions, no complex gradients or tiny details.';
      } else if (vectorType === 'Silhouette') {
        typeSpecificRule = 'Pure solid black vector silhouette, ultra-sharp outer contour, no internal gradients or transparent effects, isolated on pure white background.';
      } else if (vectorType === 'Flat Illustration') {
        typeSpecificRule = 'Clearly separated flat shape regions, flat color fills, simple vector shadows, organized compositional hierarchy, zero photographic textures.';
      } else if (vectorType === 'Seamless Pattern' || vectorType === 'Pattern') {
        typeSpecificRule = 'Seamless repeating composition, perfectly tileable pattern with zero visible seams, clean vector elements arranged in harmonious rhythm.';
      } else if (vectorType === 'Botanical') {
        typeSpecificRule = 'Simplified organic contours, clean leaf and stem forms, limited palette, elegant negative space, easily traceable botanical shapes.';
      } else if (vectorType === 'Animal') {
        typeSpecificRule = 'Recognizable animal anatomy, clean silhouette, simplified fur and facial forms, no photorealistic fur or microscopic hair details.';
      } else if (vectorType === 'People Silhouette') {
        typeSpecificRule = 'Generic anonymous human figures, simplified silhouettes, clean posture and anatomy, readable poses, zero facial details, no real celebrities.';
      } else {
        typeSpecificRule = `Clean commercial ${vectorType} concept, well-separated visual components, vectorization-friendly forms.`;
      }

      // Build complexity instructions
      let complexityRule = '';
      if (complexity === 'Auto (AI Suggested)' || complexity === 'Simple') {
        complexityRule = 'Simple geometry, minimal shapes, ultra-clean contours, zero tiny details, extremely easy for vector auto-tracing.';
      } else if (complexity === 'Moderate') {
        complexityRule = 'Controlled visual complexity, well-defined shapes, balanced details suitable for clean vector tracing.';
      } else {
        complexityRule = 'Rich vector-friendly shapes and detailed internal regions while preserving sharp trace-friendly boundaries.';
      }

      // Negative space & percentage rule
      let negativeSpaceRule = '';
      const spacePos = negativeSpace === 'Auto (AI Suggested)' ? 'balanced side' : negativeSpace.toLowerCase();
      const spaceRatio = negativeSpacePercent === 'Auto (AI Suggested)' ? '30%' : negativeSpacePercent;

      if (negativeSpace !== 'None') {
        negativeSpaceRule = `Intentionally preserve approximately ${spaceRatio} clean negative copy space on the ${spacePos} for commercial text placement.`;
      }

      // Style instruction
      const styleInstruction = style === 'Auto (AI Suggested)' ? 'Clean flat vector style' : style;

      // Color Palette instruction
      const paletteInstruction = colorPalette === 'Auto (AI Suggested)' ? '3-4 harmonious commercial colors' : colorPalette;

      // Background instruction
      const backgroundInstruction = (background === 'Auto (AI Suggested)' || background.toLowerCase().includes('transparent') || background.toLowerCase().includes('white')) 
        ? 'isolated on pure solid white background (#ffffff), pure white backdrop, zero drop shadows, zero background elements, clean sharp alpha cutout boundaries, background removal ready' 
        : `Background: ${background}, high-contrast clean backdrop`;

      const combinedInstructions = [
        instructions ? `${instructions}.` : '',
        `Vector Type: ${vectorType}.`,
        `Style: ${styleInstruction}.`,
        `Complexity: ${complexityRule}`,
        `Color Palette: ${paletteInstruction} palette, crisp separated color regions.`,
        `Background: ${backgroundInstruction}.`,
        typeSpecificRule,
        negativeSpaceRule,
        'Prompt Length: Generate rich, highly detailed 40-70 word prompts detailing shape geometry, color swatches, clean contours, specular highlights, and commercial layout.',
        'Trace-Friendly Criteria: clean closed shapes, clear contours, strong silhouette separation, minimal visual noise, trace-friendly edges, scalable vector structure.',
        'Strict Restrictions: NO TEXT, NO TYPOGRAPHY, NO WATERMARK, NO LOGO, NO SIGNATURE, NO PHOTOGRAPHIC TEXTURES, NO GRADIENT NOISE, NO RASTER ARTIFACTS.',
        'Strict Adobe Stock Compliance: unbranded generic concepts, zero brand logos, zero trademarks, zero copyrighted characters, zero living artist references.'
      ].filter(Boolean).join(' ');

      const batchResult = await UniversalPromptGenerator.generateBatch(
        {
          subject: activeSubject,
          instructions: combinedInstructions,
          count,
          contentType: 'Vector',
          category: vectorType === 'Auto (AI Suggested)' ? 'General Vector' : vectorType,
          commercialIntent: commercialUse === 'Auto (AI Suggested)' ? 'Advertising' : commercialUse,
          negativeSpace: negativeSpace === 'Auto (AI Suggested)' ? 'None' : negativeSpace,
          sectionContext: 'Vector Prompt Studio'
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
          title: `Vector: ${activeSubject.slice(0, 35)} (${batchResult.prompts.length} Prompts)`,
          summary: batchResult.prompts[0].prompt.slice(0, 100) + '...',
          data: batchResult,
          provider: settings.provider,
          model: settings.model,
        });
      }

      showToast(`Generated ${batchResult.prompts.length} perfect trace-friendly vector prompts!`);
    } catch (err: any) {
      showToast(err.message || 'Generation failed. Check API configuration.');
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
          prompt: `${style === 'Auto (AI Suggested)' ? 'Clean flat vector' : style} illustration of ${p.subject}, vector aesthetic, clean closed shapes, strong outer contour, isolated background, trace-friendly, no text, no logos`,
          similarityStatus: 'REFINED'
        };
      }
      return p;
    }));
  };

  const handleExportTXT = () => {
    if (results.length === 0) return;
    const promptsText = results.map(r => r.prompt);
    downloadTXT(promptsText, `vector-prompts-${subject.slice(0, 20)}`);
    showToast('Downloaded TXT file!');
  };

  const handleExportCSV = () => {
    if (results.length === 0) return;
    const csvData = results.map((r, idx) => ({
      'Prompt Number': idx + 1,
      'Subject': subject || r.subject,
      'Vector Type': vectorType,
      'Style': style,
      'Complexity': complexity,
      'Color Palette': colorPalette,
      'Commercial Use': commercialUse,
      'Prompt': r.prompt
    }));
    downloadCSV(csvData, `vector-prompts-${subject.slice(0, 20)}`);
    showToast('Downloaded CSV file!');
  };

  const headerActionClass = "text-xs font-medium px-2.5 py-1.5 rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] hover:bg-[#E2D9C7] dark:hover:bg-[#171E24] text-[#1A2024] dark:text-[#F3EDE2] flex items-center gap-1.5 cursor-pointer transition-colors";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#606669] dark:text-[#8C8A86] mb-1">
            Vector Studio
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl text-[#1A2024] dark:text-[#F3EDE2] font-normal tracking-tight flex items-center gap-2.5">
            <PenTool className="w-6 h-6 text-[#C74A43]" />
            <span>Vector Prompt Studio</span>
          </h1>
          <p className="text-xs text-[#606669] dark:text-[#8C8A86] mt-1 max-w-xl">
            Create clean, trace-friendly prompts for professional vector artwork and Illustrator refinement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <button
            type="button"
            onClick={handleSavePreset}
            className={headerActionClass}
            title="Save current dropdown settings as default preset"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>

          <button
            type="button"
            onClick={handleResetPreset}
            className={headerActionClass}
            title="Reset all settings to Auto (AI Suggested)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={() => setShowWorkflow(!showWorkflow)}
            className={headerActionClass}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Workflow</span>
          </button>

          <button
            type="button"
            onClick={() => setShowChecklist(!showChecklist)}
            className={headerActionClass}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Vector QA Check</span>
          </button>
        </div>
      </div>

      {/* Subtle Vector Workflow Guide */}
      {showWorkflow && (
        <div className="rounded-xl border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] p-4 sm:p-5 space-y-3 animate-fade-in text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#1A2024] dark:text-[#F3EDE2] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#C74A43]" />
              Trace-Friendly Vector Workflow Pipeline
            </span>
            <button onClick={() => setShowWorkflow(false)} className="text-xs text-[#606669] dark:text-[#8C8A86] hover:text-[#1A2024] dark:hover:text-[#F3EDE2] transition-colors">Close</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center pt-1 font-mono text-[11px]">
            <div className="p-2 rounded-lg bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30]">
              <span className="text-[#C74A43] font-bold block">01 Prompt</span>
              <span className="text-[10px] text-[#606669] dark:text-[#8C8A86]">Vector Studio</span>
            </div>
            <div className="p-2 rounded-lg bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30]">
              <span className="text-[#C74A43] font-bold block">02 Generate</span>
              <span className="text-[10px] text-[#606669] dark:text-[#8C8A86]">Source Image</span>
            </div>
            <div className="p-2 rounded-lg bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30]">
              <span className="text-[#C74A43] font-bold block">03 Trace</span>
              <span className="text-[10px] text-[#606669] dark:text-[#8C8A86]">Image Trace</span>
            </div>
            <div className="p-2 rounded-lg bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30]">
              <span className="text-[#C74A43] font-bold block">04 Refine</span>
              <span className="text-[10px] text-[#606669] dark:text-[#8C8A86]">Illustrator</span>
            </div>
            <div className="p-2 rounded-lg bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30]">
              <span className="text-[#C74A43] font-bold block">05 Review</span>
              <span className="text-[10px] text-[#606669] dark:text-[#8C8A86]">QA Checklist</span>
            </div>
            <div className="p-2 rounded-lg bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30]">
              <span className="text-[#C74A43] font-bold block">06 Submit</span>
              <span className="text-[10px] text-[#606669] dark:text-[#8C8A86]">Adobe Stock</span>
            </div>
          </div>
        </div>
      )}

      {/* Vector Refinement Checklist Drawer */}
      {showChecklist && (
        <div className="rounded-xl border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] p-4 sm:p-5 space-y-3 text-xs animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-[#D8CEBF] dark:border-[#272D30]">
            <span className="font-semibold text-[#1A2024] dark:text-[#F3EDE2] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C74A43]" />
              Final Vector Pre-Submission Checklist (Manual QA in Illustrator)
            </span>
            <span className="text-[10px] text-[#606669] dark:text-[#8C8A86] font-mono">
              {checklistItems.filter(i => i.checked).length} of {checklistItems.length} verified
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {checklistItems.map(item => (
              <button
                key={item.id}
                onClick={() => toggleChecklistItem(item.id)}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-colors cursor-pointer ${
                  item.checked 
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200' 
                    : 'bg-[#E9E1D1] dark:bg-[#0C0F12] border-[#D8CEBF] dark:border-[#272D30] text-[#1A2024] dark:text-[#F3EDE2]'
                }`}
              >
                {item.checked ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-[#606669] dark:text-[#8C8A86] shrink-0 mt-0.5" />
                )}
                <span className="leading-tight font-medium text-[11px]">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Centralized Adobe Technical Specs Reminder */}
          <div className="mt-3 p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
            <span className="font-bold block">Adobe Stock Vector Requirements (Illustrator Export Specs):</span>
            <p className="leading-relaxed text-[#606669] dark:text-[#8C8A86]">
              Supported Formats: <strong className="text-[#1A2024] dark:text-[#F3EDE2]">AI, EPS, SVG</strong> | Color Mode: <strong className="text-[#1A2024] dark:text-[#F3EDE2]">RGB</strong> | Artboard Dimensions: <strong className="text-[#1A2024] dark:text-[#F3EDE2]">15 MP min (e.g. 4000x3750px)</strong> to <strong className="text-[#1A2024] dark:text-[#F3EDE2]">65 MP max</strong> | Max File Size: <strong className="text-[#1A2024] dark:text-[#F3EDE2]">45 MB</strong> | Offset: <strong className="text-[#1A2024] dark:text-[#F3EDE2]">0,0</strong>.
            </p>
            <p className="text-[10px] text-[#606669] dark:text-[#8C8A86] italic">
              * Note: These technical requirements apply to final vector export in Illustrator, not hardcoded into the initial source image prompt string.
            </p>
          </div>
        </div>
      )}

      {/* Main Workspace Form */}
      <div className="rounded-xl border border-[#D8CEBF] dark:border-[#272D30] bg-[#EDE6D8] dark:bg-[#11161A] p-5 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Input Fields */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#606669] dark:text-[#8C8A86] mb-1.5">
                Subject / Idea *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter what vector you want to create (e.g. minimal botanical leaf set, cyberpunk delivery drone, isometric office desk)..."
                className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-sm text-[#1A2024] dark:text-[#F3EDE2] placeholder-[#606669] dark:placeholder-[#606669] focus:outline-none focus:border-[#C74A43]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#606669] dark:text-[#8C8A86] mb-1.5">
                Instructions
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Add additional instructions (e.g. clean flat vector, three colors, isolated on white background, no tiny details)..."
                rows={3}
                className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-sm text-[#1A2024] dark:text-[#F3EDE2] placeholder-[#606669] dark:placeholder-[#606669] focus:outline-none focus:border-[#C74A43] resize-none"
              />
            </div>

            {/* Core Settings Grid with Default 'Auto (AI Suggested)' */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-[#606669] dark:text-[#8C8A86] mb-1">
                  Vector Type
                </label>
                <select
                  value={vectorType}
                  onChange={(e) => setVectorType(e.target.value)}
                  className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-xs text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
                >
                  {vectorTypeOptions.map(vt => <option key={vt} value={vt} className="bg-[#11161A] text-[#F3EDE2]">{vt}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#606669] dark:text-[#8C8A86] mb-1">
                  Style
                </label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-xs text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
                >
                  {styleOptions.map(st => <option key={st} value={st} className="bg-[#11161A] text-[#F3EDE2]">{st}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#606669] dark:text-[#8C8A86] mb-1">
                  Complexity
                </label>
                <select
                  value={complexity}
                  onChange={(e) => setComplexity(e.target.value)}
                  className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-xs text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
                >
                  {complexityOptions.map(cx => <option key={cx} value={cx} className="bg-[#11161A] text-[#F3EDE2]">{cx}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#606669] dark:text-[#8C8A86] mb-1">
                  Background
                </label>
                <select
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-xs text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
                >
                  {backgroundOptions.map(bg => <option key={bg} value={bg} className="bg-[#11161A] text-[#F3EDE2]">{bg}</option>)}
                </select>
              </div>
            </div>

            {/* Extra Options Drawer Toggle */}
            <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs font-medium text-[#606669] dark:text-[#8C8A86] hover:text-[#C74A43] flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{showAdvanced ? 'Hide Additional Settings' : 'More Settings (Palette, Negative Space %, Commercial Use)'}</span>
              </button>

              <button
                type="button"
                onClick={handleSavePreset}
                className="text-[11px] text-[#606669] dark:text-[#8C8A86] hover:text-[#C74A43] flex items-center gap-1 cursor-pointer transition-colors"
                title="Save current configuration"
              >
                <Save className="w-3 h-3" />
                <span>Save</span>
              </button>
            </div>

            {/* Extra Settings Drawer */}
            {showAdvanced && (
              <div className="p-4 rounded-lg bg-[#E9E1D1] dark:bg-[#0C0F12] border border-[#D8CEBF] dark:border-[#272D30] grid grid-cols-2 md:grid-cols-4 gap-3 text-xs animate-fade-in">
                <div>
                  <label className="block text-[11px] font-medium text-[#606669] dark:text-[#8C8A86] mb-1">
                    Color Palette
                  </label>
                  <select
                    value={colorPalette}
                    onChange={(e) => setColorPalette(e.target.value)}
                    className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-xs text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
                  >
                    {colorPaletteOptions.map(cp => <option key={cp} value={cp} className="bg-[#11161A] text-[#F3EDE2]">{cp}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#606669] dark:text-[#8C8A86] mb-1">
                    Negative Space Position
                  </label>
                  <select
                    value={negativeSpace}
                    onChange={(e) => setNegativeSpace(e.target.value)}
                    className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-xs text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
                  >
                    {negativeSpaceOptions.map(ns => <option key={ns} value={ns} className="bg-[#11161A] text-[#F3EDE2]">{ns}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#606669] dark:text-[#8C8A86] mb-1 flex items-center gap-1">
                    <Percent className="w-3 h-3 text-[#C74A43]" />
                    <span>Negative Space %</span>
                  </label>
                  <select
                    value={negativeSpacePercent}
                    onChange={(e) => setNegativeSpacePercent(e.target.value)}
                    className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-xs text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
                  >
                    {negativeSpacePercentOptions.map(nsp => <option key={nsp} value={nsp} className="bg-[#11161A] text-[#F3EDE2]">{nsp}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#606669] dark:text-[#8C8A86] mb-1">
                    Commercial Usage
                  </label>
                  <select
                    value={commercialUse}
                    onChange={(e) => setCommercialUse(e.target.value)}
                    className="w-full rounded-lg border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] px-3 py-2 text-xs text-[#1A2024] dark:text-[#F3EDE2] focus:outline-none focus:border-[#C74A43]"
                  >
                    {commercialUseOptions.map(cu => <option key={cu} value={cu} className="bg-[#11161A] text-[#F3EDE2]">{cu}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Count Selector & Action Button */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <PromptCountSelector
              value={count}
              onChange={setCount}
              disabled={isGenerating}
            />

            <div className="p-3.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-[11px] leading-relaxed space-y-1">
              <span className="font-semibold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Automatic IP & Risk Compliance Active:
              </span>
              <p className="text-[#606669] dark:text-[#8C8A86]">
                All generated prompts automatically filter out trademarked logos, brand names, celebrities, and copyrighted characters to ensure 100% Adobe Stock readiness.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full rounded-lg bg-[#C74A43] hover:bg-[#B53F39] text-[#F3EDE2] font-semibold px-4 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating {count} Perfect Vector Prompts...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Vector Prompts →</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Export Toolbar when results exist */}
      {results.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-[#EDE6D8] dark:bg-[#11161A] border border-[#D8CEBF] dark:border-[#272D30]">
          <div className="text-xs text-[#606669] dark:text-[#8C8A86]">
            Generated <strong className="text-[#1A2024] dark:text-[#F3EDE2]">{results.length}</strong> perfect trace-friendly vector prompt concepts
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportTXT}
              className="border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] hover:bg-[#E2D9C7] dark:hover:bg-[#171E24] text-[#1A2024] dark:text-[#F3EDE2] font-medium rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download TXT</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="border border-[#D8CEBF] dark:border-[#272D30] bg-[#F5F0E6] dark:bg-[#090B0D] hover:bg-[#E2D9C7] dark:hover:bg-[#171E24] text-[#1A2024] dark:text-[#F3EDE2] font-medium rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* Results View */}
      <UniversalPromptBatchView
        prompts={results}
        isGenerating={isGenerating}
        progress={progress}
        subject={subject || 'Vector Concept'}
        instructions={instructions}
        sectionTitle="Vector Prompt Studio"
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
