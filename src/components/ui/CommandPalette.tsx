import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Lightbulb, 
  Camera, 
  Image as ImageIcon, 
  Wand2, 
  Layers, 
  Maximize2, 
  ShieldCheck, 
  Languages, 
  Compass, 
  Users, 
  FileCheck, 
  TrendingUp, 
  GitCompare, 
  Tag, 
  FolderArchive, 
  Settings, 
  Package,
  Home,
  Palette,
  ScanSearch,
  PenTool,
  ArrowRight
} from 'lucide-react';
import { ModuleType, ThemeStyle } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModule: (module: ModuleType) => void;
  onSelectTheme?: (theme: ThemeStyle) => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  shortcut?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectModule,
  onSelectTheme,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    {
      id: 'home',
      title: 'Home Command Center',
      category: 'Navigation',
      icon: Home,
      action: () => onSelectModule('home'),
      shortcut: 'H',
    },
    {
      id: 'prompt-studio',
      title: 'Prompt Studio (Create Stock Prompt)',
      category: 'Create',
      icon: Layers,
      action: () => onSelectModule('prompt-studio'),
      shortcut: 'P',
    },
    {
      id: 'jpg-creator',
      title: 'JPG Creator (Commercial Photo)',
      category: 'Create',
      icon: Camera,
      action: () => onSelectModule('jpg-creator'),
    },
    {
      id: 'png-creator',
      title: 'PNG Creator (Isolated Elements & Cutouts)',
      category: 'Create',
      icon: ImageIcon,
      action: () => onSelectModule('png-creator'),
    },
    {
      id: 'vector-studio',
      title: 'Vector Prompt Studio (Trace-Friendly Vectors)',
      category: 'Create',
      icon: PenTool,
      action: () => onSelectModule('vector-studio'),
    },
    {
      id: 'idea-gen',
      title: 'Idea Generator (Commercial Stock Lab)',
      category: 'Create',
      icon: Lightbulb,
      action: () => onSelectModule('idea-gen'),
    },
    {
      id: 'bulk-hub',
      title: 'Bulk Hub (Batch Prompts & CSV Export)',
      category: 'Create',
      icon: Package,
      action: () => onSelectModule('bulk-hub'),
    },
    {
      id: 'prompt-improver',
      title: 'Prompt Improver & Polisher',
      category: 'AI Tools',
      icon: Wand2,
      action: () => onSelectModule('prompt-improver'),
    },
    {
      id: 'prompt-variations',
      title: 'Prompt Variations (Safe Diverse Series)',
      category: 'AI Tools',
      icon: Layers,
      action: () => onSelectModule('prompt-variations'),
    },
    {
      id: 'prompt-expander',
      title: 'Prompt Expander (Detail & Lighting Cues)',
      category: 'AI Tools',
      icon: Maximize2,
      action: () => onSelectModule('prompt-expander'),
    },
    {
      id: 'prompt-fixer',
      title: 'Prompt Fixer (Sanitize IP & Buzzwords)',
      category: 'AI Tools',
      icon: ShieldCheck,
      action: () => onSelectModule('prompt-fixer'),
    },
    {
      id: 'prompt-translator',
      title: 'Prompt Translator (Multilingual to English)',
      category: 'AI Tools',
      icon: Languages,
      action: () => onSelectModule('prompt-translator'),
    },
    {
      id: 'brainstormer',
      title: 'Stock Niche Brainstormer',
      category: 'AI Tools',
      icon: Compass,
      action: () => onSelectModule('brainstormer'),
    },
    {
      id: 'silhouette-finder',
      title: 'Silhouette & Vector Concept Finder',
      category: 'AI Tools',
      icon: Users,
      action: () => onSelectModule('silhouette-finder'),
    },
    {
      id: 'image-scan',
      title: 'Image Scan (Bulk Adobe Stock Pre-Submission Review)',
      category: 'Stock',
      icon: ScanSearch,
      action: () => onSelectModule('image-scan'),
      shortcut: 'I',
    },
    {
      id: 'metadata',
      title: 'Metadata Studio (50 Tags & Titles)',
      category: 'Stock',
      icon: Tag,
      action: () => onSelectModule('metadata'),
      shortcut: 'M',
    },
    {
      id: 'risk-checker',
      title: 'IP & Trademark Risk Validator',
      category: 'Stock',
      icon: ShieldCheck,
      action: () => onSelectModule('risk-checker'),
      shortcut: 'R',
    },
    {
      id: 'commercial-optimizer',
      title: 'Commercial Stock Optimizer',
      category: 'Stock',
      icon: TrendingUp,
      action: () => onSelectModule('commercial-optimizer'),
    },
    {
      id: 'similarity-checker',
      title: 'Similarity & Diversity Checker',
      category: 'Stock',
      icon: GitCompare,
      action: () => onSelectModule('similarity-checker'),
    },
    {
      id: 'pre-submission-check',
      title: 'Pre-Submission Stock Compliance Audit',
      category: 'Stock',
      icon: FileCheck,
      action: () => onSelectModule('pre-submission-check'),
    },
    {
      id: 'library',
      title: 'Commercial Stock Library',
      category: 'Catalog',
      icon: FolderArchive,
      action: () => onSelectModule('library'),
      shortcut: 'L',
    },
    {
      id: 'settings',
      title: 'Settings & AI Engine Setup',
      category: 'Catalog',
      icon: Settings,
      action: () => onSelectModule('settings'),
      shortcut: 'S',
    },
  ];

  if (onSelectTheme) {
    commands.push(
      {
        id: 'theme-sweet',
        title: 'Switch to Sweet Theme (Default Navy & Orange)',
        category: 'Appearance',
        icon: Palette,
        action: () => onSelectTheme('sweet'),
      },
      {
        id: 'theme-simple',
        title: 'Switch to Simple Theme (Monochrome Minimal)',
        category: 'Appearance',
        icon: Palette,
        action: () => onSelectTheme('simple'),
      },
      {
        id: 'theme-futuristic',
        title: 'Switch to Futuristic Theme (Dark Neon)',
        category: 'Appearance',
        icon: Palette,
        action: () => onSelectTheme('futuristic'),
      }
    );
  }

  const filtered = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 sm:p-6 pt-[12vh]">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
      />

      {/* Palette Modal */}
      <div className="relative w-full max-w-xl bg-[#EDE6D8] dark:bg-[#11161A] border border-[#D8CEBF] dark:border-[#272D30] rounded-2xl shadow-2xl overflow-hidden z-10 animate-fade-in flex flex-col">
        {/* Search Bar */}
        <div className="p-3.5 border-b border-[#D8CEBF] dark:border-[#272D30] flex items-center gap-3">
          <Search className="w-5 h-5 text-[#606669] dark:text-[#8C8A86] shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search tools (e.g. JPG, Ideas, IP Check)..."
            className="w-full bg-transparent text-sm text-[#1A2024] dark:text-[#F3EDE2] placeholder:text-[#8C8A86] focus:outline-none"
          />
          <kbd className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-[#E9E1D1] dark:bg-[#0C0F12] text-[#606669] dark:text-[#8C8A86] border border-[#D8CEBF] dark:border-[#272D30]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-[#D8CEBF]/60 dark:divide-[#272D30]/60">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#606669] dark:text-[#8C8A86]">
              No matching tools or commands found for "{query}".
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs transition-colors text-left focus-visible:outline-none ${
                    isSelected
                      ? 'bg-[#E2D9C7] dark:bg-[#171E24] text-[#1A2024] dark:text-[#F3EDE2]'
                      : 'text-[#606669] dark:text-[#8C8A86] hover:bg-[#E2D9C7] dark:hover:bg-[#171E24] hover:text-[#1A2024] dark:hover:text-[#F3EDE2]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-[#C74A43]/15 text-[#C74A43] font-bold' : 'bg-[#E9E1D1] dark:bg-[#0C0F12] text-[#606669] dark:text-[#8C8A86]'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold truncate block">{cmd.title}</span>
                      <span className="text-[10px] text-[#606669] dark:text-[#8C8A86] uppercase tracking-wider font-bold">{cmd.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {cmd.shortcut && (
                      <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#E9E1D1] dark:bg-[#0C0F12] text-[#606669] dark:text-[#8C8A86] border border-[#D8CEBF] dark:border-[#272D30] font-semibold">
                        {cmd.shortcut}
                      </kbd>
                    )}
                    <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'translate-x-0.5 text-[#C74A43]' : 'opacity-0'}`} />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 border-t border-[#D8CEBF] dark:border-[#272D30] bg-[#E9E1D1] dark:bg-[#0C0F12] text-[11px] text-[#606669] dark:text-[#8C8A86] flex items-center justify-between">
          <span>Navigate with <kbd className="px-1 py-0.2 bg-[#EDE6D8] dark:bg-[#171E24] rounded text-[#606669] dark:text-[#8C8A86] border border-[#D8CEBF] dark:border-[#272D30]">↑</kbd> <kbd className="px-1 py-0.2 bg-[#EDE6D8] dark:bg-[#171E24] rounded text-[#606669] dark:text-[#8C8A86] border border-[#D8CEBF] dark:border-[#272D30]">↓</kbd></span>
          <span>Select <kbd className="px-1 py-0.2 bg-[#EDE6D8] dark:bg-[#171E24] rounded text-[#606669] dark:text-[#8C8A86] border border-[#D8CEBF] dark:border-[#272D30]">Enter</kbd></span>
        </div>
      </div>
    </div>
  );
};
