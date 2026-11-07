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
- `listModels(provider?)` returns the supported model IDs
- `pricingUpdated` is the date the bundled price table was last updated

## Custom pricing

Prices change often. Override or add any model:

```js
estimateCost({
  model: 'my-fine-tune',
  prompt,
  maxOutput: 200,
  pricing: { 'my-fine-tune': { input: 3, output: 6 } } // USD per 1M tokens
});
```

## Accuracy

Without a tokenizer, tokens are estimated at about 4 characters per token, which is reasonable for English text and rougher for code and non-Latin scripts. Treat results as a pre-flight estimate, not an invoice. Bundled prices are in `pricing.json` and should be checked against the providers' official pricing pages.

## Need AI in your product?

I build SaaS platforms with RAG pipelines, AI agents and MCP integrations. [Work with me](https://faisalnadeem.net).

## License

MIT
