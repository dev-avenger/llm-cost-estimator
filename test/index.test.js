'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { estimateCost, estimateTokens, listModels, getPricing, loadPricing, createEstimator, pricingAgeDays } = require('..');

test('estimateTokens uses ~4 chars/token', () => {
  assert.strictEqual(estimateTokens('abcdefgh'), 2);
  assert.strictEqual(estimateTokens(''), 0);
  assert.strictEqual(estimateTokens(null), 0);
});

test('estimateTokens supports custom tokenizer and messages', () => {
  assert.strictEqual(estimateTokens('hello', { tokenizer: () => 7 }), 7);
  assert.strictEqual(estimateTokens([{ role: 'user', content: 'abcd' }]), 1 + 4);
});

test('estimateCost computes input + output cost', () => {
  const r = estimateCost({ model: 'claude-sonnet-5-5', inputTokens: 1_000_000, maxOutput: 1_000_000 });
  assert.strictEqual(r.inputCost, 2);
  assert.strictEqual(r.outputCost, 10);
  assert.strictEqual(r.totalCost, 12);
  assert.strictEqual(r.approximate, false);
});

test('cached input tokens use the cached rate', () => {
  const r = estimateCost({ model: 'chat-latest', inputTokens: 1_000_000, cachedInputTokens: 1_000_000 });
  assert.strictEqual(r.inputCost, 0.5);
});

test('model lookup is case-insensitive and ignores date suffix', () => {
  assert.ok(getPricing('Claude-Haiku-4-5-20251001'));
});

test('custom pricing overrides and adds models', () => {
  const r = estimateCost({
    model: 'my-model',
    inputTokens: 1000,
    maxOutput: 1000,
    pricing: { 'my-model': { input: 1, output: 2 } }
  });
  assert.strictEqual(r.totalCost, 0.003);
});

test('unknown model throws; listModels filters by provider', () => {
  assert.throws(() => estimateCost({ model: 'nope', prompt: 'x' }), /unknown model/);
  assert.ok(listModels('openai').includes('gpt-6-luna') && !listModels('openai').includes('claude-opus-5'));
  assert.throws(() => estimateCost({}), /required/);
});

test('long-prompt tier applies above the threshold', () => {
  const small = estimateCost({ model: 'claude-haiku-5-5', inputTokens: 100000 });
  const large = estimateCost({ model: 'claude-haiku-5-5', inputTokens: 100001, maxOutput: 1000000 });
  assert.strictEqual(small.inputCost, 0.01);
  assert.strictEqual(large.outputCost, 2.5);
});

test('createEstimator applies user pricing once', () => {
  const est = createEstimator({ pricing: { 'claude-sonnet-5-5': { input: 100, output: 200 }, mine: { input: 1, output: 1 } } });
  assert.strictEqual(est.estimateCost({ model: 'claude-sonnet-5-5', inputTokens: 1000000 }).inputCost, 100);
  assert.strictEqual(est.estimateCost({ model: 'mine', inputTokens: 1000000 }).inputCost, 1);
  assert.ok(est.listModels().includes('mine'));
});

test('loadPricing reads a JSON file in both shapes', () => {
  const f = path.join(os.tmpdir(), `prices-${Date.now()}.json`);
  fs.writeFileSync(f, JSON.stringify({ models: { x: { input: 1, output: 2 } } }));
  assert.deepStrictEqual(loadPricing(f), { x: { input: 1, output: 2 } });
  fs.writeFileSync(f, JSON.stringify({ y: { input: 3, output: 4 } }));
  assert.deepStrictEqual(loadPricing(f), { y: { input: 3, output: 4 } });
  fs.unlinkSync(f);
});

test('pricingAgeDays counts days since the table date', () => {
  assert.strictEqual(pricingAgeDays(new Date('2026-11-17')), 10);
});
