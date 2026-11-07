export interface ModelPricing {
  provider?: string;
  /** USD per 1M input tokens */
  input: number;
  /** USD per 1M output tokens */
  output: number;
  /** USD per 1M cached input tokens */
  cachedInput?: number;
}

export type PricingTable = Record<string, ModelPricing>;
export interface ChatMessage { role?: string; content: string }

export interface TokenOptions {
  charsPerToken?: number;
  tokenizer?: (text: string) => number;
}

export interface EstimateCostOptions extends TokenOptions {
  model: string;
  prompt?: string | ChatMessage[];
  inputTokens?: number;
  maxOutput?: number;
  cachedInputTokens?: number;
  pricing?: PricingTable;
}

export interface CostEstimate {
  model: string;
  provider: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: 'USD';
  /** true when input tokens were estimated rather than supplied */
  approximate: boolean;
}

export function estimateCost(options: EstimateCostOptions): CostEstimate;
export function estimateTokens(input: string | ChatMessage[], options?: TokenOptions): number;
export function getPricing(model: string, pricing?: PricingTable): (ModelPricing & { key: string }) | null;
export function listModels(provider?: 'openai' | 'anthropic'): string[];
export const pricingUpdated: string;
