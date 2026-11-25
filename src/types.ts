export type RoleMode = 'admin' | 'user';

export type AdminTab =
  | 'overview'
  | 'logs'
  | 'sources'
  | 'routing'
  | 'guardrails'
  | 'plans'
  | 'users'
  | 'vault'
  | 'settings';

export type UserTab = 'dashboard' | 'keys' | 'chat';

export type TeamName =
  | 'تیم بک‌اند'
  | 'تحقیق و توسعه (R&D)'
  | 'پژوهش مخابرات'
  | 'مالی و اداری';

export type PriorityTier = 'vip' | 'standard' | 'basic';

export type UserStatus = 'active' | 'throttled' | 'suspended';

export type QuotaPeriod = '5h' | 'daily' | 'monthly';

export type ServerLoadLevel = 'healthy' | 'moderate' | 'heavy';

export type SpeedRating = 'بسیار سریع' | 'سریع' | 'متعادل (استدلالی)';

export type InferenceEngine = 'vLLM' | 'SGLang' | 'Ollama' | 'OpenAI-Compatible';

export interface LocalModel {
  id: string;
  modelId: string;
  sourceId: string;
  displayName: string;
  description: string;
  bestFor: string;
  speedRating: SpeedRating;
  contextWindow: string;
  enabled: boolean;
  isLocal: boolean;
  tpsAvg: number;
  trafficShare: number;
}

export interface DiscoverableModel {
  modelId: string;
  suggestedName: string;
  suggestedDescription: string;
  suggestedBestFor: string;
  speedRating: SpeedRating;
  contextWindow: string;
  tpsAvg: number;
}

export interface ModelSource {
  id: string;
  name: string;
  hardware: string;
  baseUrl: string;
  apiKeyHint: string;
  engine: InferenceEngine;
  health: 'healthy' | 'degraded' | 'offline';
  vramUsedGb: number;
  vramTotalGb: number;
  ttftMs: number;
  outputTps: number;
  lastChecked: string;
  maxConcurrentSlots: number;
}

export interface AccessPlan {
  id: string;
  name: string;
  description: string;
  presetType: 'coding' | 'general' | 'vip' | 'custom';
  priorityTier: PriorityTier;
  allowedModelIds: string[];
  concurrencyLimit: number;
  rpmLimit: number;
  tokenQuota: number;
  quotaPeriod: QuotaPeriod;
  offPeakUnlimited: boolean;
}

export interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  team: TeamName;
  planIds: string[];
  priorityTier: PriorityTier;
  status: UserStatus;
  concurrencyOverride: number | null;
  activeConcurrency: number;
  tokensUsed: number;
  tokensInputToday: number;
  tokensOutputToday: number;
  quotaBonusTokens: number;
  lastActive: string;
  requestsToday: number;
}

export interface ApiKeyItem {
  id: string;
  userId: string;
  ownerLabel?: string;
  keyType?: 'personal' | 'service';
  team?: TeamName;
  name: string;
  prefix: string;
  fullKey: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsed: string;
  modelScope: string[];
  status: 'active' | 'disabled' | 'revoked';
  tokensUsed: number;
}

export interface GatewaySettings {
  orgName: string;
  orgShortCode: string;
  gatewayBaseUrl: string;
  requestTimeoutSec: number;
  upstreamRetries: number;
  allowPublicSignup: boolean;
  offPeakStart: string;
  offPeakEnd: string;
  privacyLogMode: 'metrics_only' | 'full_audit';
}

export interface UsageTrendBucket {
  label: string;
  inputTokens: number;
  outputTokens: number;
  requests: number;
  avgTps: number;
}

export type TimeRange = '24h' | '7d' | '30d';

export type SetupTool = 'cursor' | 'continue' | 'codex' | 'opencode' | 'python';
export type SetupOS = 'windows' | 'unix';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'info' | 'warning' | 'error';
}

export interface QuotaRequest {
  id: string;
  userId: string;
  userName: string;
  reason: string;
  createdAt: string;
  status: 'pending' | 'approved';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  modelName?: string;
  tokens?: number;
  timestamp: string;
  streaming?: boolean;
}

/* Enterprise Gateway Modules (Competitor Parity: LiteLLM / Portkey / TrueFoundry) */

export type RoutingStrategy = 'lowest_latency' | 'weighted' | 'priority_queue' | 'circuit_breaker';

export interface RoutingPolicy {
  id: string;
  name: string;
  description: string;
  strategy: RoutingStrategy;
  primaryModelId: string;
  fallbackModelId: string;
  primaryWeight: number; // 50..100 (% routed to primary, remainder to secondary/fallback)
  circuitBreakerThreshold: number; // consecutive 5xx/429 errors before tripping
  circuitBreakerCooldownSec: number; // cooldown seconds before half-open probe
  timeoutMs: number;
  retries: number;
  triggerCondition: string;
  semanticCacheEnabled: boolean;
  cacheSimilarityThreshold: number; // 0.85..0.99
  cacheHitRate: number;
  savedTokensToday: number;
  active: boolean;
}

export type GuardrailMode = 'block' | 'audit' | 'off';

export type GuardrailCategory = 'pii' | 'secrets' | 'injection' | 'loop_breaker' | 'confidential';

export interface GuardrailPolicy {
  id: string;
  category: GuardrailCategory;
  name: string;
  description: string;
  mode: GuardrailMode;
  scope: 'all_org' | 'engineering' | 'office';
  blockedCount24h: number;
  avgLatencyMs: number;
}

export type RequestLogStatus = 'success' | 'fallback' | 'throttled' | 'blocked';

export interface RequestLogEntry {
  id: string;
  timestamp: string;
  userName: string;
  team: TeamName;
  keyPrefix: string;
  toolClient: string;
  requestedModel: string;
  servedModel: string;
  sourceNode: string;
  status: RequestLogStatus;
  httpCode: number;
  ttftMs: number;
  tps: number;
  inputTokens: number;
  outputTokens: number;
  cacheHit: boolean;
  guardrailNote?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  category: 'access' | 'security' | 'infra' | 'keys';
}
