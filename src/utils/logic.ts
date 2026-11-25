import {
  AccessPlan,
  ApiKeyItem,
  GatewaySettings,
  LocalModel,
  OrgUser,
  PriorityTier,
  QuotaPeriod,
  ServerLoadLevel,
  SetupOS,
  SetupTool,
} from '../types';

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

export function formatNumberFa(value: number): string {
  return toPersianDigits(Math.round(value).toLocaleString('en-US'));
}

export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    const m = (tokens / 1_000_000).toFixed(tokens >= 10_000_000 ? 1 : 2);
    return `${toPersianDigits(m)}M`;
  }
  if (tokens >= 1_000) {
    const k = Math.round(tokens / 1_000);
    return `${toPersianDigits(k)}K`;
  }
  return toPersianDigits(tokens);
}

export function tokensToApproximatePages(tokens: number): number {
  if (tokens <= 0) return 0;
  return Math.max(1, Math.round(tokens / 500));
}

export function getQuotaPeriodLabel(period: QuotaPeriod): string {
  switch (period) {
    case '5h':
      return '۵ ساعته';
    case 'daily':
      return 'روزانه';
    case 'monthly':
      return 'ماهانه';
  }
}

export function getPriorityLabel(tier: PriorityTier): string {
  switch (tier) {
    case 'vip':
      return 'سطح ۱ · ویژه';
    case 'standard':
      return 'سطح ۲ · استاندارد';
    case 'basic':
      return 'سطح ۳ · عادی';
  }
}

export interface EffectiveUserAccess {
  plans: AccessPlan[];
  allowedModels: LocalModel[];
  effectiveConcurrency: number;
  totalQuota: number;
  remainingTokens: number;
  usagePercent: number;
  highestRpm: number;
  offPeakUnlimited: boolean;
  quotaPeriod: QuotaPeriod;
}

export function getUserEffectiveAccess(
  user: OrgUser,
  plans: AccessPlan[],
  models: LocalModel[]
): EffectiveUserAccess {
  const userPlans = plans.filter((p) => user.planIds.includes(p.id));

  const allowedIdSet = new Set<string>();
  let maxPlanConcurrency = 1;
  let totalPlanQuota = 0;
  let highestRpm = 10;
  let offPeakUnlimited = false;
  let quotaPeriod: QuotaPeriod = 'daily';

  for (const plan of userPlans) {
    for (const mId of plan.allowedModelIds) {
      allowedIdSet.add(mId);
    }
    if (plan.concurrencyLimit > maxPlanConcurrency) {
      maxPlanConcurrency = plan.concurrencyLimit;
    }
    totalPlanQuota += plan.tokenQuota;
    if (plan.rpmLimit > highestRpm) {
      highestRpm = plan.rpmLimit;
    }
    if (plan.offPeakUnlimited) {
      offPeakUnlimited = true;
    }
    quotaPeriod = plan.quotaPeriod;
  }

  const allowedModels = models.filter(
    (m) => m.enabled && allowedIdSet.has(m.id)
  );

  const effectiveConcurrency =
    user.status === 'suspended'
      ? 0
      : user.concurrencyOverride !== null
        ? user.concurrencyOverride
        : maxPlanConcurrency;

  const totalQuota = Math.max(100_000, totalPlanQuota + user.quotaBonusTokens);
  const remainingTokens = Math.max(0, totalQuota - user.tokensUsed);
  const usagePercent = Math.min(100, Math.round((user.tokensUsed / totalQuota) * 100));

  return {
    plans: userPlans,
    allowedModels,
    effectiveConcurrency,
    totalQuota,
    remainingTokens,
    usagePercent,
    highestRpm,
    offPeakUnlimited,
    quotaPeriod,
  };
}

export interface DashboardKpis {
  activeUsersCount: number;
  totalUsersCount: number;
  liveConcurrentRequests: number;
  maxConcurrentCapacity: number;
  todayInputTokens: number;
  todayOutputTokens: number;
  todayTotalTokens: number;
  todayRequests: number;
  utilizationPercent: number;
  effectiveServerLoad: ServerLoadLevel;
}

export function computeDashboardKpis(
  users: OrgUser[],
  maxCapacity: number,
  manualLoadOverride: ServerLoadLevel | null
): DashboardKpis {
  const activeUsersCount = users.filter(
    (u) => u.status !== 'suspended' && u.requestsToday > 0
  ).length;
  const liveConcurrentRequests = users.reduce(
    (sum, u) => sum + (u.status === 'suspended' ? 0 : u.activeConcurrency),
    0
  );
  const todayInputTokens = users.reduce((sum, u) => sum + u.tokensInputToday, 0);
  const todayOutputTokens = users.reduce((sum, u) => sum + u.tokensOutputToday, 0);
  const todayRequests = users.reduce((sum, u) => sum + u.requestsToday, 0);
  const utilizationPercent = Math.min(
    100,
    Math.round((liveConcurrentRequests / Math.max(1, maxCapacity)) * 100)
  );

  let effectiveServerLoad: ServerLoadLevel = 'healthy';
  if (manualLoadOverride) {
    effectiveServerLoad = manualLoadOverride;
  } else if (utilizationPercent >= 75) {
    effectiveServerLoad = 'heavy';
  } else if (utilizationPercent >= 45) {
    effectiveServerLoad = 'moderate';
  }

  return {
    activeUsersCount,
    totalUsersCount: users.length,
    liveConcurrentRequests,
    maxConcurrentCapacity: maxCapacity,
    todayInputTokens,
    todayOutputTokens,
    todayTotalTokens: todayInputTokens + todayOutputTokens,
    todayRequests,
    utilizationPercent,
    effectiveServerLoad,
  };
}

export function filterUsers(
  users: OrgUser[],
  query: string,
  teamFilter: string,
  statusFilter: string
): OrgUser[] {
  const q = query.trim().toLowerCase();
  return users.filter((u) => {
    const matchesQuery =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.team.toLowerCase().includes(q);
    const matchesTeam = teamFilter === 'all' || u.team === teamFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesQuery && matchesTeam && matchesStatus;
  });
}

export interface ConnectionSnippet {
  title: string;
  fileName: string;
  language: string;
  steps: string[];
  code: string;
}

export function generateConnectionSnippet(
  tool: SetupTool,
  os: SetupOS,
  apiKey: string,
  baseUrl: string,
  modelId: string
): ConnectionSnippet {
  const cleanBase = baseUrl.replace(/\/+$/, '');

  switch (tool) {
    case 'cursor':
      return {
        title: 'تنظیمات مدل داخلی در Cursor',
        fileName: 'cursor-madar-config.json',
        language: 'json',
        steps: [
          'در Cursor وارد Settings → Models شوید.',
          'بخش OpenAI API Key را باز کرده و کلید زیر را جایگذاری کنید.',
          'گزینه Override OpenAI Base URL را فعال کرده و آدرس سرور داخلی را وارد کنید.',
          'شناسه مدل زیر را با دکمه Add Model اضافه کرده و تیک آن را فعال کنید.',
        ],
        code: JSON.stringify(
          {
            'cursor.openai.apiKey': apiKey,
            'cursor.openai.baseUrl': cleanBase,
            'cursor.models': [modelId],
          },
          null,
          2
        ),
      };

    case 'continue':
      return {
        title: 'پیکربندی افزونه Continue در VS Code',
        fileName: 'config.yaml',
        language: 'yaml',
        steps: [
          os === 'windows'
            ? 'فایل %USERPROFILE%\\.continue\\config.yaml را در VS Code باز کنید.'
            : 'فایل ~/.continue/config.yaml را در VS Code باز کنید.',
          'قطعه کد زیر را در بخش models اضافه و ذخیره کنید.',
          'در پنل Continue مدل محلی مدار را انتخاب کنید.',
        ],
        code: `name: Madar Local AI
version: 1.0.0
schema: v1
models:
  - name: Madar Local (${modelId.split('/').pop()})
    provider: openai
    model: ${modelId}
    apiBase: ${cleanBase}
    apiKey: ${apiKey}
    roles:
      - chat
      - edit
      - autocomplete`,
      };

    case 'codex':
      return {
        title:
          os === 'windows'
            ? 'راه‌اندازی Codex CLI در Windows PowerShell'
            : 'راه‌اندازی Codex CLI در macOS / Linux',
        fileName: os === 'windows' ? 'setup-codex.ps1' : 'setup-codex.sh',
        language: os === 'windows' ? 'powershell' : 'bash',
        steps: [
          os === 'windows'
            ? 'ترمینال PowerShell را در پوشه پروژه باز کنید.'
            : 'ترمینال (Bash یا Zsh) را در پوشه پروژه باز کنید.',
          'دستورات زیر را کپی و اجرا کنید تا متغیرهای اتصال ست شوند.',
          'از این لحظه تمام درخواست‌های Codex روی سرور داخلی اجرا می‌شوند.',
        ],
        code:
          os === 'windows'
            ? `$env:OPENAI_BASE_URL = "${cleanBase}"
$env:OPENAI_API_KEY = "${apiKey}"
codex --model "${modelId}" "Add unit tests for auth service"`
            : `export OPENAI_BASE_URL="${cleanBase}"
export OPENAI_API_KEY="${apiKey}"
codex --model "${modelId}" "Add unit tests for auth service"`,
      };

    case 'opencode':
      return {
        title: 'پیکربندی OpenCode برای سرور داخلی',
        fileName: 'opencode.json',
        language: 'json',
        steps: [
          os === 'windows'
            ? 'فایل opencode.json را در مسیر پروژه یا %APPDATA%\\opencode ذخیره کنید.'
            : 'فایل opencode.json را در مسیر پروژه یا ~/.config/opencode ذخیره کنید.',
          'دستور opencode را در ترمینال اجرا کرده و پروایدر madar-local را برگزینید.',
        ],
        code: JSON.stringify(
          {
            $schema: 'https://opencode.ai/config.json',
            provider: {
              'madar-local': {
                npm: '@ai-sdk/openai-compatible',
                name: 'Madar On-Prem vLLM',
                options: {
                  baseURL: cleanBase,
                  apiKey: apiKey,
                },
                models: {
                  [modelId]: {
                    name: modelId.split('/').pop() ?? modelId,
                  },
                },
              },
            },
            model: `madar-local/${modelId}`,
          },
          null,
          2
        ),
      };

    case 'python':
      return {
        title: 'اتصال سریع با کتابخانه رسمی OpenAI در Python',
        fileName: 'madar_local_client.py',
        language: 'python',
        steps: [
          'مطمئن شوید پکیج openai نصب است: pip install openai',
          'کد زیر را ذخیره و اجرا کنید (ترافیک کاملاً در شبکه داخلی باقی می‌ماند).',
        ],
        code: `from openai import OpenAI

client = OpenAI(
    base_url="${cleanBase}",
    api_key="${apiKey}",
)

response = client.chat.completions.create(
    model="${modelId}",
    messages=[
        {"role": "system", "content": "پاسخ کوتاه و دقیق به فارسی بده."},
        {"role": "user", "content": "وضعیت اتصال به سرور داخلی مدار را تایید کن."}
    ],
    temperature=0.2,
)

print(response.choices[0].message.content)`,
      };
  }
}

export interface ConnectionCheckStepResult {
  id: 'server' | 'key' | 'model';
  label: string;
  passed: boolean;
  detail: string;
}

export function validateKeyConnection(
  key: ApiKeyItem,
  user: OrgUser,
  settings: GatewaySettings,
  allowedModels: LocalModel[],
  selectedModelId: string
): ConnectionCheckStepResult[] {
  const serverOk = Boolean(settings.gatewayBaseUrl.startsWith('http'));
  const isExpired =
    key.expiresAt !== null && new Date(key.expiresAt).getTime() < Date.now();
  const keyOk =
    key.status === 'active' && user.status !== 'suspended' && !isExpired;

  let keyDetail = 'کلید معتبر، فعال و دارای سهمیه قابل استفاده است';
  if (user.status === 'suspended') {
    keyDetail = 'حساب کاربری شما توسط ادمین تعلیق شده است';
  } else if (key.status === 'revoked') {
    keyDetail = 'این کلید به‌صورت دائمی باطل شده است';
  } else if (key.status === 'disabled') {
    keyDetail = 'این کلید موقتاً غیرفعال شده است';
  } else if (isExpired) {
    keyDetail = 'تاریخ انقضای این کلید گذشته است';
  }

  const targetModel = allowedModels.find((m) => m.modelId === selectedModelId);
  const scopeAllowed =
    key.modelScope.length === 0 ||
    (targetModel !== undefined && key.modelScope.includes(targetModel.id));
  const modelOk = serverOk && keyOk && Boolean(targetModel) && scopeAllowed;

  let modelDetail = targetModel
    ? `پاسخ تستی دریافت شد · سرعت ${toPersianDigits(targetModel.tpsAvg)} توکن بر ثانیه`
    : 'مدل انتخاب‌شده در طرح دسترسی شما فعال نیست';

  if (!keyOk) {
    modelDetail = 'به دلیل خطای احراز هویت کلید، درخواست به مدل ارسال نشد';
  } else if (!scopeAllowed) {
    modelDetail = 'این کلید فقط به مدل‌های محدودتری دسترسی دارد';
  }

  return [
    {
      id: 'server',
      label: 'دسترسی به سرور داخلی vLLM',
      passed: serverOk,
      detail: serverOk
        ? `پاسخ در ۲۲ میلی‌ثانیه از ${settings.gatewayBaseUrl}`
        : 'آدرس درگاه API معتبر نیست',
    },
    {
      id: 'key',
      label: 'اعتبارسنجی کلید API و سهمیه',
      passed: keyOk,
      detail: keyDetail,
    },
    {
      id: 'model',
      label: 'دریافت پاسخ آزمایشی از مدل',
      passed: modelOk,
      detail: modelDetail,
    },
  ];
}

export interface GuardrailScanResult {
  action: 'allowed' | 'audited' | 'blocked';
  triggeredNames: string[];
  redactedText: string;
}

export function evaluateGuardrailSample(
  text: string,
  policies: {
    category: 'pii' | 'secrets' | 'injection' | 'loop_breaker' | 'confidential';
    name: string;
    mode: 'block' | 'audit' | 'off';
  }[]
): GuardrailScanResult {
  const triggered: { name: string; mode: 'block' | 'audit' }[] = [];
  let redacted = text;

  const findPolicy = (cat: string) => policies.find((p) => p.category === cat && p.mode !== 'off');

  // Secrets detection (API keys, private keys, password assignments)
  const secretRegex = /(sk-[a-zA-Z0-9_-]{8,}|mdr-live-[a-zA-Z0-9_-]{8,}|mdr-svc-[a-zA-Z0-9_-]{8,}|AKIA[0-9A-Z]{8,}|PASSWORD\s*=\s*\S+)/gi;
  if (secretRegex.test(text)) {
    const p = findPolicy('secrets');
    if (p) {
      triggered.push({ name: p.name, mode: p.mode as 'block' | 'audit' });
      redacted = redacted.replace(secretRegex, '[REDACTED_SECRET]');
    }
  }

  // PII detection (10-digit national ID or 16-digit card number)
  const cardRegex = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;
  const nationalIdRegex = /\b0\d{9}\b/g;
  if (cardRegex.test(text) || nationalIdRegex.test(text)) {
    const p = findPolicy('pii');
    if (p) {
      triggered.push({ name: p.name, mode: p.mode as 'block' | 'audit' });
      redacted = redacted.replace(cardRegex, '[REDACTED_CARD]').replace(nationalIdRegex, '[REDACTED_ID]');
    }
  }

  // Prompt injection detection
  const injRegex = /(ignore previous instructions|دستورات قبلی را نادیده بگیر|system prompt|jailbreak)/i;
  if (injRegex.test(text)) {
    const p = findPolicy('injection');
    if (p) {
      triggered.push({ name: p.name, mode: p.mode as 'block' | 'audit' });
    }
  }

  // Confidential marker detection
  const confRegex = /(محرمانه|صورت مالی هیئت‌مدیره|قرارداد سری)/i;
  if (confRegex.test(text)) {
    const p = findPolicy('confidential');
    if (p) {
      triggered.push({ name: p.name, mode: p.mode as 'block' | 'audit' });
    }
  }

  const hasBlock = triggered.some((t) => t.mode === 'block');
  const action = hasBlock ? 'blocked' : triggered.length > 0 ? 'audited' : 'allowed';

  return {
    action,
    triggeredNames: triggered.map((t) => t.name),
    redactedText: redacted,
  };
}

export interface RouteSimulationResult {
  usedFallback: boolean;
  servedModelName: string;
  servedModelId: string;
  estimatedTtftMs: number;
  cacheHit: boolean;
  hops: string[];
  summary: string;
}

export function simulateRoutingDecision(params: {
  primaryModel: LocalModel;
  fallbackModel: LocalModel;
  faultMode: 'healthy' | 'queue_full' | 'node_timeout';
  semanticCacheEnabled: boolean;
  repeatPrompt: boolean;
}): RouteSimulationResult {
  const { primaryModel, fallbackModel, faultMode, semanticCacheEnabled, repeatPrompt } = params;

  if (semanticCacheEnabled && repeatPrompt) {
    return {
      usedFallback: false,
      servedModelName: primaryModel.displayName,
      servedModelId: primaryModel.modelId,
      estimatedTtftMs: 14,
      cacheHit: true,
      hops: ['درگاه مدار', 'کش معنایی (Redis)', 'پاسخ فوری بدون مصرف GPU'],
      summary: 'پرامپت مشابه در کش معنایی یافت شد؛ پاسخ در ۱۴ میلی‌ثانیه و با صفر مصرف GPU ارسال گردید.',
    };
  }

  if (faultMode === 'healthy') {
    return {
      usedFallback: false,
      servedModelName: primaryModel.displayName,
      servedModelId: primaryModel.modelId,
      estimatedTtftMs: 132,
      cacheHit: false,
      hops: ['درگاه مدار', 'گاردریل امنیتی', `${primaryModel.displayName} (اصلی)`],
      summary: 'سرور اصلی سالم است و درخواست مستقیماً به مدل اصلی هدایت شد.',
    };
  }

  const reason =
    faultMode === 'queue_full'
      ? 'صف مدل اصلی پر شد (۴۲۹)'
      : 'پاسخ نود اصلی با تایم‌اوت ۵۰۳ مواجه شد';

  return {
    usedFallback: true,
    servedModelName: fallbackModel.displayName,
    servedModelId: fallbackModel.modelId,
    estimatedTtftMs: 248,
    cacheHit: false,
    hops: [
      'درگاه مدار',
      `${primaryModel.displayName} (خطا)`,
      'مدار شکن خودکار',
      `${fallbackModel.displayName} (پشتیبان)`,
    ],
    summary: `${reason}؛ بدون نمایش خطا به کاربر، ترافیک در لحظه به «${fallbackModel.displayName}» منتقل شد.`,
  };
}

export function filterRequestLogs<
  T extends { userName: string; requestedModel: string; status: string; team: string; toolClient: string }
>(logs: T[], query: string, statusFilter: string): T[] {
  const q = query.trim().toLowerCase();
  return logs.filter((item) => {
    const matchesQuery =
      !q ||
      item.userName.toLowerCase().includes(q) ||
      item.requestedModel.toLowerCase().includes(q) ||
      item.team.toLowerCase().includes(q) ||
      item.toolClient.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesQuery && matchesStatus;
  });
}

