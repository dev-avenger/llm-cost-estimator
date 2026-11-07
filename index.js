'use strict';

const fs = require('fs');
const data = require('./pricing.json');

const DEFAULT_CHARS_PER_TOKEN = 4;
// Small per-message overhead (role markers, separators) for chat-style input.
const MESSAGE_OVERHEAD_TOKENS = 4;

function normalizeModel(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/-\d{8}$/, ''); // strip date suffix, e.g. claude-haiku-4-5-20251001
}

function findPricing(model, custom) {
  const key = normalizeModel(model);
  if (custom) {
    for (const k of Object.keys(custom)) {
      if (normalizeModel(k) === key) return { key: k, ...custom[k] };
    }
  }
  if (data.models[key]) return { key, ...data.models[key] };
  return null;
}

/**
 * Rough token estimate (~4 characters per token for English text).
 * Pass a custom `tokenizer` (text => number) for exact counts.
 */
function estimateTokens(input, options = {}) {
  const { charsPerToken = DEFAULT_CHARS_PER_TOKEN, tokenizer } = options;
  if (input == null) return 0;

  if (Array.isArray(input)) {
    return input.reduce(
      (sum, m) => sum + estimateTokens(m && m.content != null ? m.content : '', options) + MESSAGE_OVERHEAD_TOKENS,
      0
    );
  }
  const text = typeof input === 'string' ? input : JSON.stringify(input);
  if (typeof tokenizer === 'function') return Math.max(0, Math.ceil(tokenizer(text)));
  return Math.ceil(text.length / charsPerToken);
}

function round(n) {
  return Math.round(n * 1e8) / 1e8;
}

/**
 * Estimate the cost of a request before sending it.
 * @param {object} opts
 * @param {string} opts.model
 * @param {string|Array<{content:string}>} [opts.prompt]
 * @param {number} [opts.inputTokens]        exact input tokens (overrides prompt estimate)
 * @param {number} [opts.maxOutput]          expected/max output tokens
 * @param {number} [opts.cachedInputTokens]  portion of input billed at the cached rate
 * @param {object} [opts.pricing]            custom/override pricing table
 */
function estimateCost(opts = {}) {
  const { model, prompt, inputTokens, maxOutput = 0, cachedInputTokens = 0, pricing, charsPerToken, tokenizer } = opts;
  if (!model) throw new TypeError('estimateCost: "model" is required');

  const p = findPricing(model, pricing);
  if (!p) {
    throw new Error(`estimateCost: unknown model "${model}". Use listModels() or pass a custom "pricing" option.`);
  }

  const totalInput =
    typeof inputTokens === 'number' ? inputTokens : estimateTokens(prompt, { charsPerToken, tokenizer });
  const cached = Math.min(Math.max(cachedInputTokens, 0), totalInput);
  const fresh = totalInput - cached;

  // Some models have a higher rate once the prompt exceeds a threshold
  // (applied to the whole request).
  const rates = p.longPrompt && totalInput > p.longPrompt.threshold ? { ...p, ...p.longPrompt } : p;
  const cachedRate = typeof rates.cachedInput === 'number' ? rates.cachedInput : rates.input;

  const inputCost = (fresh * rates.input + cached * cachedRate) / 1e6;
  const outputCost = (maxOutput * rates.output) / 1e6;

  return {
    model: p.key,
    provider: p.provider || 'custom',
    inputTokens: totalInput,
    cachedInputTokens: cached,
    outputTokens: maxOutput,
    inputCost: round(inputCost),
    outputCost: round(outputCost),
    totalCost: round(inputCost + outputCost),
    currency: 'USD',
    approximate: typeof inputTokens !== 'number'
  };
}

function getPricing(model, pricing) {
  return findPricing(model, pricing);
}

/**
 * Load a custom pricing table from a JSON file (Node.js only).
 * The file may be either a plain { "model": { input, output } } map
 * or have a top-level "models" key like the bundled pricing.json.
 */
function loadPricing(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return parsed.models && typeof parsed.models === 'object' ? parsed.models : parsed;
}

/**
 * Create an estimator with your own pricing set once, so you don't have to
 * pass `pricing` on every call.
 */
function createEstimator(defaults = {}) {
  const base = defaults.pricing || {};
  const merge = (extra) => ({ ...base, ...(extra || {}) });
  return {
    estimateCost: (opts = {}) => estimateCost({ ...defaults, ...opts, pricing: merge(opts.pricing) }),
    getPricing: (model, extra) => getPricing(model, merge(extra)),
    listModels: (provider) => listModels(provider).concat(Object.keys(base).filter((k) => !data.models[k]))
  };
}

/** Age in days of the bundled price table. Handy for warning when it's stale. */
function pricingAgeDays(now = new Date()) {
  return Math.floor((now - new Date(data.updated)) / 86400000);
}

function listModels(provider) {
  return Object.keys(data.models).filter((k) => !provider || data.models[k].provider === provider);
}

module.exports = {
  estimateCost,
  estimateTokens,
  getPricing,
  listModels,
  loadPricing,
  createEstimator,
  pricingAgeDays,
  pricingUpdated: data.updated
};
