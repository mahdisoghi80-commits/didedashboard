/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  ArrowLeftRight,
  Bell,
  Menu,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  AccessPlan,
  AdminTab,
  ApiKeyItem,
  AuditLogEntry,
  GatewaySettings,
  GuardrailMode,
  GuardrailPolicy,
  LocalModel,
  ModelSource,
  OrgUser,
  PriorityTier,
  QuotaRequest,
  RequestLogEntry,
  RoleMode,
  RoutingPolicy,
  RoutingStrategy,
  ServerLoadLevel,
  TeamName,
  ToastMessage,
  UserTab,
} from './types';
import {
  INITIAL_API_KEYS,
  INITIAL_AUDIT_LOGS,
  INITIAL_GUARDRAILS,
  INITIAL_MODELS,
  INITIAL_PLANS,
  INITIAL_REQUEST_LOGS,
  INITIAL_ROUTING_POLICIES,
  INITIAL_SETTINGS,
  INITIAL_SOURCES,
  INITIAL_USERS,
} from './data/seedData';
import { computeDashboardKpis, toPersianDigits } from './utils/logic';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { QuickCommandModal } from './components/QuickCommandModal';
import { SlotPipBar } from './components/VisualPrimitives';
import { AdminOverview } from './components/admin/AdminOverview';
import { AdminUsers, UpdateUserPayload } from './components/admin/AdminUsers';
import { AdminPlans } from './components/admin/AdminPlans';
import { AdminSources } from './components/admin/AdminSources';
import { AdminRouting } from './components/admin/AdminRouting';
import { AdminGuardrails } from './components/admin/AdminGuardrails';
import { AdminLogs } from './components/admin/AdminLogs';
import { AdminKeysVault } from './components/admin/AdminKeysVault';
import { AdminSettings } from './components/admin/AdminSettings';
import { UserDashboard } from './components/user/UserDashboard';
import { UserApiKeys } from './components/user/UserApiKeys';
import { UserQuickChat } from './components/user/UserQuickChat';

const ADMIN_TAB_TITLES: Record<AdminTab, string> = {
  overview: 'سلام مهدی!',
  logs: 'لاگ درخواست‌ها و ممیزی',
  sources: 'منابع مدل داخلی',
  routing: 'مسیریابی، Fallback و کش',
  guardrails: 'گاردریل و امنیت داده (DLP)',
  plans: 'طرح‌های دسترسی',
  users: 'کاربران و تیم‌ها',
  vault: 'خزانه کلیدهای سازمانی',
  settings: 'تنظیمات درگاه',
};

const USER_TAB_TITLES: Record<UserTab, string> = {
  dashboard: 'داشبورد و مدل‌های داخلی',
  keys: 'کلیدهای API و اتصال ابزارها',
  chat: 'چت آزمایشی سریع',
};

export default function App() {
  const [roleMode, setRoleMode] = useState<RoleMode>('admin');
  const [adminTab, setAdminTab] = useState<AdminTab>('overview');
  const [userTab, setUserTab] = useState<UserTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  // Trigger counters for Dropify top-bar primary CTA
  const [planCreateTrigger, setPlanCreateTrigger] = useState(0);
  const [keyCreateTrigger, setKeyCreateTrigger] = useState(0);

  // Core shared application state
  const [settings, setSettings] = useState<GatewaySettings>(INITIAL_SETTINGS);
  const [sources, setSources] = useState<ModelSource[]>(INITIAL_SOURCES);
  const [models, setModels] = useState<LocalModel[]>(INITIAL_MODELS);
  const [plans, setPlans] = useState<AccessPlan[]>(INITIAL_PLANS);
  const [users, setUsers] = useState<OrgUser[]>(INITIAL_USERS);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(INITIAL_API_KEYS);
  const [quotaRequests, setQuotaRequests] = useState<QuotaRequest[]>([]);

  // Enterprise control-plane state (Routing, Guardrails, Logs & Audit)
  const [routingPolicies, setRoutingPolicies] = useState<RoutingPolicy[]>(
    INITIAL_ROUTING_POLICIES
  );
  const [guardrails, setGuardrails] = useState<GuardrailPolicy[]>(INITIAL_GUARDRAILS);
  const [requestLogs, setRequestLogs] = useState<RequestLogEntry[]>(INITIAL_REQUEST_LOGS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  const [manualServerLoad, setManualServerLoad] = useState<ServerLoadLevel | null>(null);
  const [activeDemoUserId, setActiveDemoUserId] = useState<string>('usr-arash');
  const [highlightedUserId, setHighlightedUserId] = useState<string | null>(null);
  const [chatPreselectedModelId, setChatPreselectedModelId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Keyboard shortcut Ctrl/Cmd + K for Quick Search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const pushToast = useCallback(
    (title: string, description?: string, variant: ToastMessage['variant'] = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, title, description, variant }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const appendAudit = useCallback(
    (action: string, target: string, category: AuditLogEntry['category']) => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      const entry: AuditLogEntry = {
        id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        timestamp: `امروز · ${toPersianDigits(timeStr)}`,
        actor: 'مهدی حسینی (ادمین)',
        action,
        target,
        category,
      };
      setAuditLogs((prev) => [entry, ...prev]);
    },
    []
  );

  const copyText = useCallback(
    (text: string, label: string) => {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      pushToast(`${label} کپی شد`, 'آماده جایگذاری در ابزار شماست.', 'info');
    },
    [pushToast]
  );

  const activeDemoUser = useMemo(
    () => users.find((u) => u.id === activeDemoUserId) ?? users[0],
    [users, activeDemoUserId]
  );

  const userApiKeys = useMemo(
    () => apiKeys.filter((k) => k.userId === activeDemoUser.id && k.keyType !== 'service'),
    [apiKeys, activeDemoUser.id]
  );

  const maxCapacity = useMemo(
    () => sources.reduce((sum, s) => sum + s.maxConcurrentSlots, 0) || 20,
    [sources]
  );

  const kpis = useMemo(
    () => computeDashboardKpis(users, maxCapacity, manualServerLoad),
    [users, maxCapacity, manualServerLoad]
  );

  // Admin handlers
  const handleThrottleUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              status: 'throttled',
              concurrencyOverride: 1,
              activeConcurrency: Math.min(u.activeConcurrency, 1),
            }
          : u
      )
    );
    appendAudit('محدودسازی همزمانی به ۱ اسلات', target.name, 'access');
    pushToast(
      `محدودسازی فوری برای ${target.name} اعمال شد`,
      'سقف همزمانی کاربر به ۱ اسلات کاهش یافت تا ظرفیت GPU آزاد شود.',
      'warning'
    );
  };

  const handleViewUser = (userId: string) => {
    setHighlightedUserId(userId);
    setAdminTab('users');
  };

  const handleAddUser = (payload: {
    name: string;
    email: string;
    team: TeamName;
    role: 'admin' | 'member';
    planIds: string[];
    priorityTier: PriorityTier;
  }) => {
    const newUser: OrgUser = {
      id: `usr-${Date.now()}`,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      team: payload.team,
      planIds: payload.planIds,
      priorityTier: payload.priorityTier,
      status: 'active',
      concurrencyOverride: null,
      activeConcurrency: 0,
      tokensUsed: 0,
      tokensInputToday: 0,
      tokensOutputToday: 0,
      quotaBonusTokens: 0,
      lastActive: 'تازه ایجاد شده',
      requestsToday: 0,
    };
    setUsers((prev) => [newUser, ...prev]);
    appendAudit('تعریف و دعوت کاربر جدید', `${payload.name} (${payload.team})`, 'access');
    pushToast('کاربر جدید اضافه شد', `${payload.name} به واحد ${payload.team} پیوست.`);
  };

  const handleToggleSuspend = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const willSuspend = target.status !== 'suspended';

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              status: willSuspend ? 'suspended' : 'active',
              activeConcurrency: willSuspend ? 0 : u.activeConcurrency,
              concurrencyOverride: willSuspend ? 0 : null,
            }
          : u
      )
    );

    if (willSuspend) {
      appendAudit('تعلیق فوری دسترسی و مسدودسازی کلیدها', target.name, 'security');
      pushToast(
        `دسترسی ${target.name} فوراً تعلیق شد`,
        'تمامی کلیدهای فعال این کاربر هم‌اکنون مسدود شدند.',
        'error'
      );
    } else {
      appendAudit('رفع تعلیق و فعال‌سازی مجدد حساب', target.name, 'access');
      pushToast(`حساب ${target.name} مجدداً فعال شد`, 'دسترسی کاربر طبق طرح‌های فعال برقرار شد.');
    }
  };

  const handleResetQuota = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              tokensUsed: 0,
              status: u.status === 'throttled' ? 'active' : u.status,
              concurrencyOverride: u.status === 'throttled' ? null : u.concurrencyOverride,
            }
          : u
      )
    );
    appendAudit('ریست کامل سهمیه دوره جاری', target.name, 'access');
    pushToast(`سهمیه ${target.name} ریست شد`, 'مصرف دوره جاری صفر شد و کاربر مجدداً ظرفیت کامل دارد.');
  };

  const handleUpdateUser = (userId: string, payload: UpdateUserPayload) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              name: payload.name,
              email: payload.email,
              team: payload.team,
              role: payload.role,
              priorityTier: payload.priorityTier,
              planIds: payload.planIds,
              status: payload.status,
              quotaBonusTokens: u.quotaBonusTokens + payload.bonusDelta,
              concurrencyOverride: payload.concurrencyOverride,
              activeConcurrency:
                payload.status === 'suspended'
                  ? 0
                  : payload.concurrencyOverride !== null
                    ? Math.min(u.activeConcurrency, payload.concurrencyOverride)
                    : u.activeConcurrency,
            }
          : u
      )
    );
    appendAudit('ویرایش مشخصات و دسترسی کاربر', `${payload.name} (${payload.team})`, 'access');
    pushToast(
      `تغییرات حساب ${payload.name} ذخیره شد`,
      'طرح‌های دسترسی، اولویت صف و محدودیت‌ها فوراً روی درگاه اعمال شدند.'
    );
  };

  const handleCreatePlan = (
    planData: Omit<AccessPlan, 'id'>,
    assignedUserIds: string[],
    assignedTeams: TeamName[]
  ) => {
    const newPlan: AccessPlan = {
      ...planData,
      id: `plan-${Date.now()}`,
    };
    setPlans((prev) => [newPlan, ...prev]);

    if (assignedUserIds.length > 0 || assignedTeams.length > 0) {
      setUsers((prev) =>
        prev.map((u) => {
          const matches =
            assignedUserIds.includes(u.id) || assignedTeams.includes(u.team);
          if (!matches) return u;
          return {
            ...u,
            planIds: u.planIds.includes(newPlan.id) ? u.planIds : [...u.planIds, newPlan.id],
          };
        })
      );
    }

    appendAudit('ایجاد و انتشار طرح دسترسی جدید', newPlan.name, 'access');
    pushToast(
      `طرح «${newPlan.name}» ایجاد شد`,
      `سقف همزمانی ${toPersianDigits(newPlan.concurrencyLimit)} اسلات برای هر کاربر فعال گردید.`
    );
  };

  const handleDuplicatePlan = (planId: string) => {
    const original = plans.find((p) => p.id === planId);
    if (!original) return;
    const clone: AccessPlan = {
      ...original,
      id: `plan-${Date.now()}`,
      name: `${original.name} (کپی)`,
    };
    setPlans((prev) => [clone, ...prev]);
    appendAudit('کپی‌برداری از طرح دسترسی', clone.name, 'access');
    pushToast('طرح دسترسی کپی شد', `«${clone.name}» به لیست طرح‌ها اضافه شد.`, 'info');
  };

  const handleDeletePlan = (planId: string) => {
    const target = plans.find((p) => p.id === planId);
    if (!target || plans.length <= 1) return;
    setPlans((prev) => prev.filter((p) => p.id !== planId));
    setUsers((prev) =>
      prev.map((u) => ({
        ...u,
        planIds: u.planIds.filter((id) => id !== planId),
      }))
    );
    appendAudit('حذف طرح دسترسی', target.name, 'access');
    pushToast(`طرح «${target.name}» حذف شد`, undefined, 'warning');
  };

  const handleAddDiscoveredModel = (modelData: Omit<LocalModel, 'id'>) => {
    const created: LocalModel = {
      ...modelData,
      id: `mdl-${Date.now()}`,
    };
    setModels((prev) => [...prev, created]);
    setPlans((prev) =>
      prev.map((p) =>
        p.presetType === 'coding' || p.presetType === 'vip'
          ? { ...p, allowedModelIds: [...p.allowedModelIds, created.id] }
          : p
      )
    );
    appendAudit('افزودن مدل کشف‌شده به کاتالوگ', created.displayName, 'infra');
    pushToast(
      `مدل «${created.displayName}» به کاتالوگ اضافه شد`,
      'اکنون در طرح‌های فنی و داشبورد کارمندان در دسترس است.'
    );
  };

  const handleUpdateModel = (id: string, patch: Partial<LocalModel>) => {
    const target = models.find((m) => m.id === id);
    setModels((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    if (target) {
      appendAudit('ویرایش تنظیمات مدل داخلی', patch.displayName ?? target.displayName, 'infra');
    }
    pushToast('مشخصات مدل به‌روزرسانی شد');
  };

  const handleAddSource = (sourceData: Omit<ModelSource, 'id'>) => {
    const created: ModelSource = {
      ...sourceData,
      id: `src-${Date.now()}`,
    };
    setSources((prev) => [...prev, created]);
    appendAudit('اتصال کلاستر پردازش جدید', created.name, 'infra');
    pushToast(`سرور «${created.name}» متصل شد`, 'ظرفیت همزمانی کل سازمان افزایش یافت.');
  };

  const handleHealthCheckSource = (sourceId: string) => {
    setSources((prev) =>
      prev.map((s) =>
        s.id === sourceId
          ? {
              ...s,
              health: 'healthy',
              ttftMs: 132 + Math.floor(Math.random() * 24),
              lastChecked: 'هم‌اکنون',
            }
          : s
      )
    );
    pushToast('اتصال سرور داخلی سالم است', 'پاسخ اندپوینت vLLM با موفقیت تایید شد.');
  };

  // Enterprise Routing handlers
  const handleToggleRoutingActive = (id: string) => {
    const target = routingPolicies.find((p) => p.id === id);
    setRoutingPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
    if (target) {
      appendAudit(
        target.active ? 'توقف موقت زنجیره مسیریابی' : 'فعال‌سازی زنجیره مسیریابی',
        target.name,
        'infra'
      );
    }
    pushToast('وضعیت قانون مسیریابی به‌روزرسانی شد', undefined, 'info');
  };

  const handleToggleSemanticCache = (id: string) => {
    const target = routingPolicies.find((p) => p.id === id);
    setRoutingPolicies((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, semanticCacheEnabled: !p.semanticCacheEnabled } : p
      )
    );
    if (target) {
      appendAudit(
        target.semanticCacheEnabled ? 'غیرفعال‌سازی کش معنایی' : 'فعال‌سازی کش معنایی Redis',
        target.name,
        'infra'
      );
    }
    pushToast('تنظیمات کش معنایی اعمال شد', undefined, 'info');
  };

  const handleChangeRoutingStrategy = (id: string, strategy: RoutingStrategy) => {
    const target = routingPolicies.find((p) => p.id === id);
    setRoutingPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, strategy } : p))
    );
    if (target) {
      appendAudit('تغییر استراتژی توزیع ترافیک', `${target.name} → ${strategy}`, 'infra');
    }
    pushToast('استراتژی مسیریابی تغییر کرد');
  };

  const handleAddRoutingPolicy = (policyData: Omit<RoutingPolicy, 'id'>) => {
    const created: RoutingPolicy = {
      ...policyData,
      id: `rt-${Date.now()}`,
    };
    setRoutingPolicies((prev) => [created, ...prev]);
    appendAudit('ساخت خط لوله مسیریابی و Fallback جدید', created.name, 'infra');
    pushToast(`خط لوله «${created.name}» فعال شد`, 'ترافیک در صورت خطا به‌صورت خودکار منتقل می‌شود.');
  };

  const handleUpdateRoutingPolicy = (id: string, patch: Partial<RoutingPolicy>) => {
    setRoutingPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  // Enterprise Guardrails handler
  const handleChangeGuardrailMode = (id: string, mode: GuardrailMode) => {
    const target = guardrails.find((g) => g.id === id);
    setGuardrails((prev) => prev.map((g) => (g.id === id ? { ...g, mode } : g)));
    if (target) {
      const modeFa = mode === 'block' ? 'مسدودسازی' : mode === 'audit' ? 'فقط ممیزی' : 'خاموش';
      appendAudit(`تغییر وضعیت گاردریل به ${modeFa}`, target.name, 'security');
    }
    pushToast('سیاست امنیتی درگاه به‌روزرسانی شد');
  };

  // Enterprise Live Logs simulator
  const handleSimulateLiveRequest = () => {
    const activeUsers = users.filter((u) => u.status !== 'suspended');
    const pickedUser = activeUsers[Math.floor(Math.random() * activeUsers.length)] ?? users[0];
    const pickedModel = models[Math.floor(Math.random() * models.length)] ?? models[0];
    const roll = Math.random();
    const status: RequestLogEntry['status'] =
      roll < 0.62 ? 'success' : roll < 0.78 ? 'fallback' : roll < 0.9 ? 'throttled' : 'blocked';
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
      2,
      '0'
    )}:${String(now.getSeconds()).padStart(2, '0')}`;
    const cacheHit = status === 'success' && Math.random() > 0.6;
    const httpCode =
      status === 'blocked' ? 403 : status === 'throttled' ? 429 : 200;
    const entry: RequestLogEntry = {
      id: `req-${Date.now()}`,
      timestamp: ts,
      userName: pickedUser.name,
      team: pickedUser.team,
      keyPrefix: 'mdr-live-9a4e...81b2',
      toolClient: ['Cursor IDE', 'VS Code Continue', 'Codex CLI', 'Python SDK'][
        Math.floor(Math.random() * 4)
      ],
      requestedModel: pickedModel.modelId,
      servedModel:
        status === 'fallback'
          ? 'meta-llama/Llama-3.3-70B-Instruct (Fallback)'
          : pickedModel.modelId,
      sourceNode: sources[0]?.name ?? 'کلاستر مرکزی H200',
      status,
      httpCode,
      ttftMs: cacheHit ? 14 : status === 'fallback' ? 236 : 118 + Math.floor(Math.random() * 65),
      tps: status === 'blocked' || status === 'throttled' ? 0 : pickedModel.tpsAvg,
      inputTokens: status === 'blocked' ? 680 : 1200 + Math.floor(Math.random() * 3400),
      outputTokens: status === 'blocked' || status === 'throttled' ? 0 : 420 + Math.floor(Math.random() * 1100),
      cacheHit,
      guardrailNote:
        status === 'blocked'
          ? 'شناسایی الگوی API Key محرمانه توسط گاردریل DLP'
          : status === 'throttled'
            ? 'سقف همزمانی کاربر پر شده بود (HTTP 429)'
            : status === 'fallback'
              ? 'صف مدل اصلی پر بود؛ انتقال خودکار به مدل پشتیبان انجام شد'
              : undefined,
    };
    setRequestLogs((prev) => [entry, ...prev]);
    pushToast('درخواست زنده جدید در درگاه ثبت شد', `${pickedUser.name} · ${pickedModel.displayName}`, 'info');
  };

  // Enterprise Org Vault Service Key creation
  const handleCreateServiceKey = (payload: {
    name: string;
    ownerLabel: string;
    team: TeamName;
    expiresAt: string | null;
    modelScope: string[];
  }) => {
    const rand =
      Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    const fullKey = `mdr-svc-${rand}`;
    const prefix = `${fullKey.slice(0, 12)}...${fullKey.slice(-4)}`;
    const created: ApiKeyItem = {
      id: `key-svc-${Date.now()}`,
      userId: 'svc-org',
      ownerLabel: payload.ownerLabel,
      keyType: 'service',
      team: payload.team,
      name: payload.name,
      prefix,
      fullKey,
      createdAt: 'امروز',
      expiresAt: payload.expiresAt,
      lastUsed: 'تازه صادر شده',
      modelScope: payload.modelScope,
      status: 'active',
      tokensUsed: 0,
    };
    setApiKeys((prev) => [created, ...prev]);
    appendAudit('صدور کلید سرویس / CI-CD جدید', `${payload.name} (${payload.team})`, 'keys');
    pushToast('کلید سرویس سازمانی صادر شد', `${payload.ownerLabel} اکنون آماده اتصال به درگاه است.`);
  };

  const handleSaveSettings = (next: GatewaySettings) => {
    setSettings(next);
    appendAudit('ذخیره تنظیمات درگاه و حریم خصوصی', next.orgName, 'infra');
    pushToast('تنظیمات درگاه ذخیره شد', 'آدرس درگاه و برندینگ در سراسر پنل به‌روزرسانی گردید.');
  };

  const handleApproveQuotaRequest = (reqId: string) => {
    const req = quotaRequests.find((r) => r.id === reqId);
    if (!req) return;
    setQuotaRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: 'approved' } : r))
    );
    setUsers((prev) =>
      prev.map((u) =>
        u.id === req.userId
          ? { ...u, quotaBonusTokens: u.quotaBonusTokens + 2_000_000 }
          : u
      )
    );
    appendAudit('تایید درخواست افزایش سهمیه (+۲M توکن)', req.userName, 'access');
    pushToast(`سهمیه ${req.userName} افزایش یافت`, '۲ میلیون توکن جدید به سهمیه دوره اضافه شد.');
  };

  // End-user handlers
  const handleCreateApiKey = (payload: {
    name: string;
    expiresAt: string | null;
    modelScope: string[];
  }): ApiKeyItem => {
    const rand =
      Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    const fullKey = `mdr-live-${rand}`;
    const prefix = `${fullKey.slice(0, 12)}...${fullKey.slice(-4)}`;
    const created: ApiKeyItem = {
      id: `key-${Date.now()}`,
      userId: activeDemoUser.id,
      ownerLabel: activeDemoUser.name,
      keyType: 'personal',
      team: activeDemoUser.team,
      name: payload.name,
      prefix,
      fullKey,
      createdAt: 'امروز',
      expiresAt: payload.expiresAt,
      lastUsed: 'هنوز استفاده نشده',
      modelScope: payload.modelScope,
      status: 'active',
      tokensUsed: 0,
    };
    setApiKeys((prev) => [created, ...prev]);
    pushToast('کلید API جدید ساخته شد', 'کلید آماده اتصال به ابزارهای شماست.');
    return created;
  };

  const handleToggleKeyStatus = (keyId: string) => {
    const target = apiKeys.find((k) => k.id === keyId);
    setApiKeys((prev) =>
      prev.map((k) =>
        k.id === keyId
          ? { ...k, status: k.status === 'active' ? 'disabled' : 'active' }
          : k
      )
    );
    if (target && roleMode === 'admin') {
      appendAudit('تغییر وضعیت کلید API', target.name, 'keys');
    }
    pushToast('وضعیت کلید به‌روزرسانی شد', undefined, 'info');
  };

  const handleRevokeKey = (keyId: string) => {
    const target = apiKeys.find((k) => k.id === keyId);
    setApiKeys((prev) =>
      prev.map((k) => (k.id === keyId ? { ...k, status: 'revoked' } : k))
    );
    if (target && roleMode === 'admin') {
      appendAudit('ابطال دائمی کلید API', target.name, 'keys');
    }
    pushToast(
      'کلید به‌صورت دائمی باطل شد',
      'درخواست‌های جدید با این کلید بلافاصله رد می‌شوند.',
      'warning'
    );
  };

  const handleSubmitQuotaRequest = (reason: string) => {
    const created: QuotaRequest = {
      id: `qreq-${Date.now()}`,
      userId: activeDemoUser.id,
      userName: activeDemoUser.name,
      reason,
      createdAt: 'هم‌اکنون',
      status: 'pending',
    };
    setQuotaRequests((prev) => [created, ...prev]);
    pushToast(
      'درخواست افزایش سهمیه ثبت شد',
      'مدیر IT در بخش تنظیمات درگاه می‌تواند آن را با یک کلیک تایید کند.'
    );
  };

  const handleRecordChatUsage = useCallback(
    (inputTokens: number, outputTokens: number) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === activeDemoUserId
            ? {
                ...u,
                tokensUsed: u.tokensUsed + inputTokens + outputTokens,
                tokensInputToday: u.tokensInputToday + inputTokens,
                tokensOutputToday: u.tokensOutputToday + outputTokens,
                requestsToday: u.requestsToday + 1,
                lastActive: 'هم‌اکنون آنلاین',
              }
            : u
        )
      );
    },
    [activeDemoUserId]
  );

  const handleSetStreamingActive = useCallback(
    (active: boolean) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === activeDemoUserId
            ? {
                ...u,
                activeConcurrency: active
                  ? Math.min(4, u.activeConcurrency + 1)
                  : Math.max(0, u.activeConcurrency - 1),
              }
            : u
        )
      );
    },
    [activeDemoUserId]
  );

  const pendingReqCount = quotaRequests.filter((r) => r.status === 'pending').length;
  const activeGuardrailsCount = guardrails.filter((g) => g.mode !== 'off').length;

  const firstName = activeDemoUser.name.split(' ')[0];
  const headerTitle =
    roleMode === 'admin'
      ? ADMIN_TAB_TITLES[adminTab]
      : userTab === 'dashboard'
        ? `سلام ${firstName}!`
        : USER_TAB_TITLES[userTab];

  const handlePrimaryHeaderAction = () => {
    if (roleMode === 'admin') {
      setAdminTab('plans');
      setPlanCreateTrigger((c) => c + 1);
    } else {
      setUserTab('keys');
      setKeyCreateTrigger((c) => c + 1);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#E6E5F1] text-[#1C1C24] sm:p-2 lg:p-2.5">
        {/* Full-Width Dropify Floating Pure-White Application Shell */}
        <div className="w-full min-h-screen sm:min-h-[calc(100vh-1rem)] lg:h-[calc(100vh-1.25rem)] bg-white sm:rounded-[24px] lg:rounded-[26px] shadow-[0_24px_70px_-20px_rgba(28,28,36,0.14)] flex overflow-hidden">
          <Sidebar
            roleMode={roleMode}
            onChangeRoleMode={setRoleMode}
            adminTab={adminTab}
            onSelectAdminTab={(t) => {
              setAdminTab(t);
              if (t !== 'users') setHighlightedUserId(null);
            }}
            userTab={userTab}
            onSelectUserTab={setUserTab}
            settings={settings}
            users={users}
            activeDemoUserId={activeDemoUserId}
            onChangeDemoUser={setActiveDemoUserId}
            pendingRequestsCount={pendingReqCount}
            activeGuardrailsCount={activeGuardrailsCount}
            mobileOpen={mobileMenuOpen}
            onCloseMobile={() => setMobileMenuOpen(false)}
          />

          {/* Main Workspace Inside Floating Shell */}
          <div className="flex-1 min-w-0 flex flex-col bg-white">
            {/* Dropify Header */}
            <header className="px-5 sm:px-7 pt-4 pb-3.5 flex items-center justify-between gap-4 border-b border-[#F4F4F9]">
              <div className="flex items-center gap-3.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="باز کردن منوی ناوبری"
                  className="lg:hidden w-10 h-10 rounded-full bg-[#F5F5FA] text-[#1C1C24] flex items-center justify-center shrink-0"
                >
                  <Menu className="w-5 h-5" />
                </button>

                <div className="min-w-0 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <h1 className="text-xl sm:text-[22px] font-bold text-[#1C1C24] tracking-tight truncate">
                    {headerTitle}
                  </h1>
                  {roleMode === 'admin' ? (
                    <div className="hidden sm:inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-[#F6F6FA]">
                      <SlotPipBar
                        active={kpis.liveConcurrentRequests}
                        max={kpis.maxConcurrentCapacity}
                        size="xs"
                        tone={
                          kpis.effectiveServerLoad === 'heavy'
                            ? 'rose'
                            : kpis.effectiveServerLoad === 'moderate'
                              ? 'amber'
                              : 'iris'
                        }
                        labelSuffix="اسلات"
                      />
                      <span className="h-3 w-px bg-[#E2E2EC]" />
                      <span dir="ltr" className="font-mono text-[10.5px] font-semibold text-[#646476]">
                        2× H200
                      </span>
                    </div>
                  ) : (
                    <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F6F6FA] text-[11px] font-semibold text-[#4E4E5E]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-emerald-700 font-bold">۱۰۰٪ داخلی</span>
                      <span className="h-3 w-px bg-[#E2E2EC]" />
                      <span>{activeDemoUser.team}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Circular Dark Action Buttons + Iris Pill CTA */}
              <div className="flex items-center gap-2.5 shrink-0">
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  type="button"
                  onClick={() => {
                    if (roleMode === 'admin') {
                      setAdminTab('settings');
                    } else {
                      setUserTab('dashboard');
                    }
                  }}
                  aria-label="اعلان‌ها و درخواست‌های سهمیه"
                  title={
                    roleMode === 'admin'
                      ? 'اعلان‌ها و درخواست‌های افزایش سهمیه'
                      : 'وضعیت سهمیه و سرور'
                  }
                  className="relative w-10 h-10 rounded-full bg-[#1E1E24] hover:bg-[#30303B] text-white flex items-center justify-center transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  {pendingReqCount > 0 && roleMode === 'admin' && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#7B70E8] text-[10px] font-bold flex items-center justify-center ring-2 ring-white tabular-nums">
                      {toPersianDigits(pendingReqCount)}
                    </span>
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  type="button"
                  onClick={() => setCommandOpen(true)}
                  aria-label="جستجوی سریع در پنل"
                  title="جستجو و پرش سریع (Ctrl+K)"
                  className="w-10 h-10 rounded-full bg-[#1E1E24] hover:bg-[#30303B] text-white flex items-center justify-center transition-colors"
                >
                  <Search className="w-4 h-4" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  type="button"
                  onClick={() => setRoleMode((m) => (m === 'admin' ? 'user' : 'admin'))}
                  aria-label={
                    roleMode === 'admin'
                      ? 'تغییر سریع به نمای کاربر نهایی'
                      : 'تغییر سریع به نمای ادمین'
                  }
                  title={
                    roleMode === 'admin'
                      ? 'تغییر سریع به نمای کاربر نهایی'
                      : 'بازگشت سریع به نمای ادمین'
                  }
                  className="w-10 h-10 rounded-full bg-[#1E1E24] hover:bg-[#30303B] text-white flex items-center justify-center transition-colors"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={handlePrimaryHeaderAction}
                  className="hidden sm:inline-flex items-center gap-2 px-5 h-10 rounded-full bg-[#7B70E8] hover:bg-[#6B5FE0] text-white text-xs font-semibold transition-colors whitespace-nowrap shadow-[0_10px_24px_-8px_rgba(123,112,232,0.65)]"
                >
                  <Plus className="w-4 h-4" />
                  <span>{roleMode === 'admin' ? 'ایجاد طرح دسترسی' : 'ساخت کلید جدید'}</span>
                </motion.button>
              </div>
            </header>

            {/* Animated Active View Area */}
            <main className="flex-1 px-5 sm:px-7 pb-7 pt-1 overflow-y-auto">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${roleMode}-${roleMode === 'admin' ? adminTab : userTab}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.14, ease: 'easeOut' }}
                >
                  {roleMode === 'admin' ? (
                    <>
                      {adminTab === 'overview' && (
                        <AdminOverview
                          users={users}
                          plans={plans}
                          models={models}
                          sources={sources}
                          manualServerLoad={manualServerLoad}
                          onChangeManualServerLoad={setManualServerLoad}
                          onThrottleUser={handleThrottleUser}
                          onViewUser={handleViewUser}
                          onNavigateSources={() => setAdminTab('sources')}
                          onNavigateUsers={() => setAdminTab('users')}
                          onNavigatePlans={() => setAdminTab('plans')}
                        />
                      )}
                      {adminTab === 'logs' && (
                        <AdminLogs
                          requestLogs={requestLogs}
                          auditLogs={auditLogs}
                          onSimulateLiveRequest={handleSimulateLiveRequest}
                        />
                      )}
                      {adminTab === 'sources' && (
                        <AdminSources
                          sources={sources}
                          models={models}
                          onAddDiscoveredModel={handleAddDiscoveredModel}
                          onUpdateModel={handleUpdateModel}
                          onAddSource={handleAddSource}
                          onHealthCheckSource={handleHealthCheckSource}
                        />
                      )}
                      {adminTab === 'routing' && (
                        <AdminRouting
                          policies={routingPolicies}
                          models={models}
                          sources={sources}
                          onTogglePolicyActive={handleToggleRoutingActive}
                          onToggleSemanticCache={handleToggleSemanticCache}
                          onChangeStrategy={handleChangeRoutingStrategy}
                          onUpdatePolicy={handleUpdateRoutingPolicy}
                          onAddPolicy={handleAddRoutingPolicy}
                        />
                      )}
                      {adminTab === 'guardrails' && (
                        <AdminGuardrails
                          policies={guardrails}
                          onChangeMode={handleChangeGuardrailMode}
                        />
                      )}
                      {adminTab === 'plans' && (
                        <AdminPlans
                          plans={plans}
                          models={models}
                          users={users}
                          externalCreateTrigger={planCreateTrigger}
                          onCreatePlan={handleCreatePlan}
                          onDuplicatePlan={handleDuplicatePlan}
                          onDeletePlan={handleDeletePlan}
                        />
                      )}
                      {adminTab === 'users' && (
                        <AdminUsers
                          users={users}
                          plans={plans}
                          models={models}
                          highlightedUserId={highlightedUserId}
                          onClearHighlight={() => setHighlightedUserId(null)}
                          onAddUser={handleAddUser}
                          onUpdateUser={handleUpdateUser}
                          onToggleSuspend={handleToggleSuspend}
                          onResetQuota={handleResetQuota}
                        />
                      )}
                      {adminTab === 'vault' && (
                        <AdminKeysVault
                          apiKeys={apiKeys}
                          models={models}
                          onCreateServiceKey={handleCreateServiceKey}
                          onToggleKeyStatus={handleToggleKeyStatus}
                          onRevokeKey={handleRevokeKey}
                          onCopyText={copyText}
                        />
                      )}
                      {adminTab === 'settings' && (
                        <AdminSettings
                          settings={settings}
                          quotaRequests={quotaRequests}
                          onSaveSettings={handleSaveSettings}
                          onApproveQuotaRequest={handleApproveQuotaRequest}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      {userTab === 'dashboard' && (
                        <UserDashboard
                          user={activeDemoUser}
                          plans={plans}
                          models={models}
                          settings={settings}
                          serverLoad={kpis.effectiveServerLoad}
                          onCopyText={copyText}
                          onStartChatWithModel={(modelId) => {
                            setChatPreselectedModelId(modelId);
                            setUserTab('chat');
                          }}
                          onNavigateKeys={() => setUserTab('keys')}
                          onSubmitQuotaRequest={handleSubmitQuotaRequest}
                        />
                      )}
                      {userTab === 'keys' && (
                        <UserApiKeys
                          user={activeDemoUser}
                          plans={plans}
                          models={models}
                          settings={settings}
                          apiKeys={userApiKeys}
                          externalCreateTrigger={keyCreateTrigger}
                          onCreateKey={handleCreateApiKey}
                          onToggleKeyStatus={handleToggleKeyStatus}
                          onRevokeKey={handleRevokeKey}
                          onCopyText={copyText}
                        />
                      )}
                      {userTab === 'chat' && (
                        <UserQuickChat
                          user={activeDemoUser}
                          plans={plans}
                          models={models}
                          initialModelId={chatPreselectedModelId}
                          onRecordChatUsage={handleRecordChatUsage}
                          onSetStreamingActive={handleSetStreamingActive}
                        />
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>

        <QuickCommandModal
          open={commandOpen}
          onClose={() => setCommandOpen(false)}
          roleMode={roleMode}
          users={users}
          models={models}
          plans={plans}
          onSelectUser={(uid) => {
            setRoleMode('admin');
            handleViewUser(uid);
          }}
          onJumpToSources={() => {
            setRoleMode('admin');
            setAdminTab('sources');
          }}
          onJumpToPlans={() => {
            setRoleMode('admin');
            setAdminTab('plans');
          }}
          onJumpToKeys={() => {
            setRoleMode('user');
            setUserTab('keys');
          }}
          onJumpToChatModel={(modelId) => {
            setRoleMode('user');
            setChatPreselectedModelId(modelId);
            setUserTab('chat');
          }}
        />

        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </MotionConfig>
  );
}
