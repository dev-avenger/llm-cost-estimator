# @faisal-nadeem/llm-cost-estimator

Estimate token counts and API cost for **OpenAI** and **Anthropic (Claude)** models *before* you send a request. Zero dependencies, TypeScript types included.

Built by [Faisal Nadeem](https://faisalnadeem.net), full-stack and AI integration engineer.

## Install

```bash
npm install @faisal-nadeem/llm-cost-estimator
```

## Usage

```js
const { estimateCost } = require('@faisal-nadeem/llm-cost-estimator');

const result = estimateCost({
  model: 'claude-sonnet-5-5',
  prompt: 'Summarize this document...',
  maxOutput: 500
});

console.log(result.totalCost); // USD
```

Chat-style input and cached tokens:

```js
estimateCost({
  model: 'gpt-5.5',
  prompt: [
    { role: 'system', content: 'You are helpful.' },
    { role: 'user', content: 'Explain RAG.' }
  ],
  cachedInputTokens: 1000,
  maxOutput: 800
});
```

Use exact token counts from your own tokenizer or the API's usage field:

```js
estimateCost({ model: 'gpt-5.4-mini', inputTokens: 12000, maxOutput: 1000 });
// or plug in a tokenizer
estimateCost({ model: 'gpt-5.4', prompt, tokenizer: (text) => myCount(text) });
```

## API

- `estimateCost({ model, prompt?, inputTokens?, maxOutput?, cachedInputTokens?, pricing?, tokenizer?, charsPerToken? })` returns `{ model, provider, inputTokens, cachedInputTokens, outputTokens, inputCost, outputCost, totalCost, currency, approximate }`
- `estimateTokens(textOrMessages, { tokenizer?, charsPerToken? })` returns a number
- `getPricing(model)` returns the price entry, or `null`
- `createEstimator({ pricing, ... })` returns `estimateCost`, `getPricing` and `listModels` using your prices
- `loadPricing(filePath)` loads a custom pricing JSON file (Node.js)
- `pricingAgeDays()` returns the age in days of the bundled table
- `listModels(provider?)` returns the supported model IDs
- `pricingUpdated` is the date the bundled price table was last updated

## Keeping prices up to date

Providers change prices often, so the bundled table is a snapshot (see `pricingUpdated`; prices were checked against the official [Anthropic](https://platform.claude.com/docs/en/about-claude/pricing) and [OpenAI](https://developers.openai.com/api/docs/pricing) pricing pages on that date). You are never stuck waiting for a new release. There are four ways to use your own prices, from quickest to most permanent:

**1. Override per call.** Pass a `pricing` object (USD per 1M tokens). It can change a bundled model or add a new one:

```js
estimateCost({
  model: 'my-fine-tune',
  prompt,
  maxOutput: 200,
  pricing: { 'my-fine-tune': { input: 3, output: 6, cachedInput: 0.3 } }
});
```

**2. Set your prices once with `createEstimator`.**

```js
const { createEstimator } = require('@faisal-nadeem/llm-cost-estimator');

const estimator = createEstimator({
  pricing: {
    'claude-sonnet-5-5': { input: 2.5, output: 12 }, // your negotiated or updated rate
    'my-fine-tune': { input: 3, output: 6 }
  }
});

estimator.estimateCost({ model: 'claude-sonnet-5-5', prompt, maxOutput: 500 });
```

**3. Keep prices in your own JSON file (Node.js).** Copy `pricing.json` from this package (or start from `{ "model-name": { "input": 1, "output": 2 } }`), edit it whenever prices change, and load it:

```js
const { createEstimator, loadPricing } = require('@faisal-nadeem/llm-cost-estimator');

const estimator = createEstimator({ pricing: loadPricing('./my-prices.json') });
```

**4. Update the package.** New releases refresh the bundled table: `npm update @faisal-nadeem/llm-cost-estimator`.

Your own entries always win over the bundled ones. To warn yourself when the snapshot gets old:

```js
const { pricingAgeDays } = require('@faisal-nadeem/llm-cost-estimator');
if (pricingAgeDays() > 60) console.warn('Bundled LLM prices may be out of date');
```

Price entry fields: `input` and `output` (required), `cachedInput` (optional, falls back to `input`), and `longPrompt: { threshold, input, output, cachedInput }` (optional higher rates applied to the whole request when input tokens exceed `threshold`; used for Claude Haiku 5.5 above 100K prompt tokens). Standard-tier text prices only: batch, priority, data-residency uplifts, cache-write surcharges and non-text modalities are not included.

## Accuracy

Without a tokenizer, tokens are estimated at about 4 characters per token, which is reasonable for English text and rougher for code and non-Latin scripts. Treat results as a pre-flight estimate, not an invoice. Bundled prices are in `pricing.json`; see "Keeping prices up to date" above.

## Need AI in your product?

I build SaaS platforms with RAG pipelines, AI agents and MCP integrations. [Work with me](https://faisalnadeem.net).

## License

MIT
