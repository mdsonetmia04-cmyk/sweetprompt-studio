import { AIProviderName } from '../../types';
import { ProviderCapabilities, CAPABILITY_NOT_SUPPORTED } from './providerTypes';

export { CAPABILITY_NOT_SUPPORTED };

export const PROVIDER_CAPABILITIES: Record<AIProviderName, ProviderCapabilities> = {
  gemini: {
    supportsText: true,
    supportsVision: true,
    supportsStructuredJson: true,
    speedTier: 'fast',
    freeOrLowCostTier: true,
    defaultTextModel: 'gemini-3.8-flash',
    defaultVisionModel: 'gemini-3.8-flash',
    defaultStructuredModel: 'gemini-3.8-flash',
    supportedModels: [
      'gemini-3.8-flash',
      'gemini-flash-latest'
    ]
  },
  groq: {
    supportsText: true,
    supportsVision: false, // Groq has no vision model on free/developer tiers
    supportsStructuredJson: true,
    speedTier: 'ultra-fast',
    freeOrLowCostTier: true,
    defaultTextModel: 'openai/gpt-oss-20b',
    defaultStructuredModel: 'openai/gpt-oss-120b',
    supportedModels: [
      'openai/gpt-oss-20b',
      'openai/gpt-oss-120b'
    ]
  },
  mistral: {
    supportsText: true,
    supportsVision: true, // Supported via pixtral-12b-2409
    supportsStructuredJson: true,
    speedTier: 'fast',
    freeOrLowCostTier: true,
    defaultTextModel: 'mistral-small-latest',
    defaultVisionModel: 'pixtral-12b-2409',
    defaultStructuredModel: 'mistral-small-latest',
    supportedModels: [
      'mistral-small-latest',
      'mistral-medium-latest',
      'mistral-large-latest',
      'codestral-latest',
      'pixtral-12b-2409'
    ]
  },
  openrouter: {
    supportsText: true,
    supportsVision: true,
    supportsStructuredJson: true,
    speedTier: 'fast',
    freeOrLowCostTier: false,
    defaultTextModel: 'anthropic/claude-3.5-sonnet',
    defaultVisionModel: 'anthropic/claude-3.5-sonnet',
    defaultStructuredModel: 'anthropic/claude-3.5-sonnet',
    supportedModels: [
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o',
      'deepseek/deepseek-chat',
      'meta-llama/llama-3.3-70b-instruct',
      'google/gemini-2.0-flash-001'
    ]
  },
  huggingface: {
    supportsText: true,
    supportsVision: false,
    supportsStructuredJson: true,
    speedTier: 'fast',
    freeOrLowCostTier: true,
    defaultTextModel: 'meta-llama/Llama-3.3-70B-Instruct',
    defaultStructuredModel: 'meta-llama/Llama-3.3-70B-Instruct',
    supportedModels: [
      'meta-llama/Llama-3.3-70B-Instruct',
      'mistralai/Mistral-7B-Instruct-v0.3',
      'Qwen/Qwen2.5-72B-Instruct',
      'microsoft/Phi-3.5-mini-instruct'
    ]
  },
  cerebras: {
    supportsText: true,
    supportsVision: false,
    supportsStructuredJson: true,
    speedTier: 'ultra-fast',
    freeOrLowCostTier: true,
    defaultTextModel: 'llama3.3-70b',
    defaultStructuredModel: 'llama3.3-70b',
    supportedModels: [
      'llama3.3-70b',
      'llama3.1-8b'
    ]
  }
};

/**
 * Providers currently enabled in the app. Only these two have verified,
 * working free-tier APIs: Gemini and Groq (text only). Mistral, OpenRouter,
 * Cerebras and Hugging Face are kept in the code but hidden from Settings
 * and never used as a fallback — see SettingsView PROVIDERS.
 */
export const ENABLED_PROVIDERS: AIProviderName[] = ['gemini', 'groq'];

export function getProviderCapabilities(provider: AIProviderName): ProviderCapabilities {
  return PROVIDER_CAPABILITIES[provider] || PROVIDER_CAPABILITIES.gemini;
}

export function validateProviderCapability(
  provider: AIProviderName, 
  capability: 'text' | 'vision' | 'structured'
): boolean {
  const caps = getProviderCapabilities(provider);
  switch (capability) {
    case 'text':
      return caps.supportsText;
    case 'vision':
      return caps.supportsVision;
    case 'structured':
      return caps.supportsStructuredJson;
    default:
      return false;
  }
}
