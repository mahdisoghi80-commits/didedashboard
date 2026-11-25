import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDashboardKpis,
  evaluateGuardrailSample,
  filterRequestLogs,
  filterUsers,
  formatTokenCount,
  generateConnectionSnippet,
  getUserEffectiveAccess,
  simulateRoutingDecision,
  tokensToApproximatePages,
  validateKeyConnection,
} from './logic';
import {
  INITIAL_API_KEYS,
  INITIAL_GUARDRAILS,
  INITIAL_MODELS,
  INITIAL_PLANS,
  INITIAL_REQUEST_LOGS,
  INITIAL_SETTINGS,
  INITIAL_USERS,
} from '../data/seedData';

test('formatTokenCount and humanized page approximation', () => {
  assert.equal(formatTokenCount(14_800_000), '۱۴.۸M');
  assert.equal(formatTokenCount(2_450_000), '۲.۴۵M');
  assert.equal(formatTokenCount(420_000), '۴۲۰K');
  assert.equal(tokensToApproximatePages(100_000), 200);
  assert.equal(tokensToApproximatePages(0), 0);
});

test('getUserEffectiveAccess merges multiple plans and respects concurrency override', () => {
  const user = INITIAL_USERS[0];
  const baseAccess = getUserEffectiveAccess(user, INITIAL_PLANS, INITIAL_MODELS);
  assert.equal(baseAccess.effectiveConcurrency, 2);
  assert.ok(baseAccess.allowedModels.length >= 2);
  assert.equal(baseAccess.offPeakUnlimited, true);

  const throttled = { ...user, concurrencyOverride: 1, status: 'throttled' as const };
  const throttledAccess = getUserEffectiveAccess(throttled, INITIAL_PLANS, INITIAL_MODELS);
  assert.equal(throttledAccess.effectiveConcurrency, 1);

  const suspended = { ...user, status: 'suspended' as const };
  const suspendedAccess = getUserEffectiveAccess(suspended, INITIAL_PLANS, INITIAL_MODELS);
  assert.equal(suspendedAccess.effectiveConcurrency, 0);
});

test('computeDashboardKpis aggregates concurrent slots and traffic light level', () => {
  const kpis = computeDashboardKpis(INITIAL_USERS, 20, null);
  assert.equal(kpis.totalUsersCount, INITIAL_USERS.length);
  assert.ok(kpis.liveConcurrentRequests > 0);
  assert.equal(kpis.todayTotalTokens, kpis.todayInputTokens + kpis.todayOutputTokens);
  assert.equal(kpis.effectiveServerLoad, 'healthy');

  const heavyKpis = computeDashboardKpis(INITIAL_USERS, 20, 'heavy');
  assert.equal(heavyKpis.effectiveServerLoad, 'heavy');
});

test('generateConnectionSnippet injects actual key, base URL, and OS-specific syntax', () => {
  const winCodex = generateConnectionSnippet(
    'codex',
    'windows',
    'mdr-live-test-key-123',
    'https://api.ai.madar-eng.ir/v1/',
    'Qwen/Qwen2.5-Coder-32B-Instruct'
  );
  assert.match(winCodex.code, /\$env:OPENAI_API_KEY = "mdr-live-test-key-123"/);
  assert.match(winCodex.code, /https:\/\/api\.ai\.madar-eng\.ir\/v1/);

  const unixCodex = generateConnectionSnippet(
    'codex',
    'unix',
    'mdr-live-test-key-123',
    'https://api.ai.madar-eng.ir/v1',
    'Qwen/Qwen2.5-Coder-32B-Instruct'
  );
  assert.match(unixCodex.code, /export OPENAI_API_KEY="mdr-live-test-key-123"/);
});

test('validateKeyConnection passes for active key and fails cleanly when revoked', () => {
  const user = INITIAL_USERS[0];
  const key = INITIAL_API_KEYS[0];
  const access = getUserEffectiveAccess(user, INITIAL_PLANS, INITIAL_MODELS);

  const okSteps = validateKeyConnection(
    key,
    user,
    INITIAL_SETTINGS,
    access.allowedModels,
    access.allowedModels[0].modelId
  );
  assert.equal(okSteps.every((s) => s.passed), true);

  const revokedSteps = validateKeyConnection(
    { ...key, status: 'revoked' },
    user,
    INITIAL_SETTINGS,
    access.allowedModels,
    access.allowedModels[0].modelId
  );
  assert.equal(revokedSteps[0].passed, true);
  assert.equal(revokedSteps[1].passed, false);
  assert.equal(revokedSteps[2].passed, false);
});

test('filterUsers filters by search query, team, and status', () => {
  const byTeam = filterUsers(INITIAL_USERS, '', 'تیم بک‌اند', 'all');
  assert.ok(byTeam.length >= 2);
  assert.equal(byTeam.every((u) => u.team === 'تیم بک‌اند'), true);

  const byQuery = filterUsers(INITIAL_USERS, 'آرش', 'all', 'all');
  assert.equal(byQuery.length, 1);
  assert.match(byQuery[0].name, /آرش/);
});

test('evaluateGuardrailSample blocks secrets, redacts PII, and passes clean prompts', () => {
  const secretScan = evaluateGuardrailSample(
    'OPENAI_KEY=sk-prod-94a8f12c9b7e PASSWORD=secret123',
    INITIAL_GUARDRAILS
  );
  assert.equal(secretScan.action, 'blocked');
  assert.match(secretScan.redactedText, /\[REDACTED_SECRET\]/);

  const piiScan = evaluateGuardrailSample(
    'کد ملی 0018472910 و کارت 6037-9918-4421-8890',
    INITIAL_GUARDRAILS
  );
  assert.equal(piiScan.action, 'blocked');
  assert.match(piiScan.redactedText, /\[REDACTED_CARD\]/);
  assert.match(piiScan.redactedText, /\[REDACTED_ID\]/);

  const cleanScan = evaluateGuardrailSample(
    'یک تابع TypeScript برای مرتب‌سازی بنویس.',
    INITIAL_GUARDRAILS
  );
  assert.equal(cleanScan.action, 'allowed');
  assert.equal(cleanScan.triggeredNames.length, 0);
});

test('simulateRoutingDecision handles semantic cache hit, healthy pass, and failover', () => {
  const primary = INITIAL_MODELS[0];
  const fallback = INITIAL_MODELS[1];

  const cached = simulateRoutingDecision({
    primaryModel: primary,
    fallbackModel: fallback,
    faultMode: 'healthy',
    semanticCacheEnabled: true,
    repeatPrompt: true,
  });
  assert.equal(cached.cacheHit, true);
  assert.equal(cached.usedFallback, false);
  assert.equal(cached.estimatedTtftMs, 14);

  const failover = simulateRoutingDecision({
    primaryModel: primary,
    fallbackModel: fallback,
    faultMode: 'queue_full',
    semanticCacheEnabled: false,
    repeatPrompt: false,
  });
  assert.equal(failover.usedFallback, true);
  assert.equal(failover.servedModelId, fallback.modelId);
  assert.equal(failover.hops.length, 4);
});

test('filterRequestLogs filters by status and search text', () => {
  const blocked = filterRequestLogs(INITIAL_REQUEST_LOGS, '', 'blocked');
  assert.ok(blocked.length >= 1);
  assert.equal(blocked.every((l) => l.status === 'blocked'), true);

  const byClient = filterRequestLogs(INITIAL_REQUEST_LOGS, 'cursor', 'all');
  assert.ok(byClient.length >= 1);
});
