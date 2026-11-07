'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { estimateCost, estimateTokens, listModels, getPricing } = require('..');

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
  const r = estimateCost({ model: 'gpt-5.5', inputTokens: 1_000_000, cachedInputTokens: 1_000_000 });
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
  assert.ok(listModels('openai').every((m) => m.startsWith('gpt')));
  assert.throws(() => estimateCost({}), /required/);
});
