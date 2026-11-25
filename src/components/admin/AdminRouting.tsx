import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  ArrowUpDown,
  Check,
  Clock,
  Cpu,
  Crown,
  Database,
  GitBranch,
  Plus,
  RefreshCw,
  Scale,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  X,
  Zap,
} from 'lucide-react';
import { LocalModel, ModelSource, RoutingPolicy, RoutingStrategy } from '../../types';
import { formatTokenCount, toPersianDigits } from '../../utils/logic';
import { SpeedSignalBars } from '../VisualPrimitives';

interface AdminRoutingProps {
  policies: RoutingPolicy[];
  models: LocalModel[];
  sources: ModelSource[];
  onTogglePolicyActive: (id: string) => void;
  onToggleSemanticCache: (id: string) => void;
  onChangeStrategy: (id: string, strategy: RoutingStrategy) => void;
  onUpdatePolicy: (id: string, patch: Partial<RoutingPolicy>) => void;
  onAddPolicy: (policy: Omit<RoutingPolicy, 'id'>) => void;
}

const STRATEGIES: {
  id: RoutingStrategy;
  title: string;
  shortTitle: string;
  metricHint: string;
  icon: typeof Zap;
}[] = [
  {
    id: 'lowest_latency',
    title: 'کمترین تأخیر (TTFT)',
    shortTitle: 'کمترین تأخیر',
    metricHint: 'TTFT-First',
    icon: Zap,
  },
  {
    id: 'priority_queue',
    title: 'اولویت صف VIP',
    shortTitle: 'اولویت VIP',
    metricHint: 'Tier 1→3',
    icon: Crown,
  },
  {
    id: 'weighted',
    title: 'توزیع وزن‌دار GPU',
    shortTitle: 'توزیع وزن‌دار',
    metricHint: 'Canary / Split',
    icon: Scale,
  },
  {
    id: 'circuit_breaker',
    title: 'مدار شکن خودکار',
    shortTitle: 'مدار شکن',
    metricHint: 'Auto-Trip',
    icon: ShieldCheck,
  },
];

const CB_THRESHOLDS = [3, 5, 10] as const;
const CB_COOLDOWNS = [30, 60, 120] as const;
const RETRY_OPTIONS = [0, 1, 2, 3] as const;
const TIMEOUT_OPTIONS = [800, 1200, 2400, 4000] as const;

export function AdminRouting({
  policies,
  models,
  sources,
  onTogglePolicyActive,
  onToggleSemanticCache,
  onChangeStrategy,
  onUpdatePolicy,
  onAddPolicy,
}: AdminRoutingProps) {
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(policies[0]?.id ?? '');
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Add Rule visual tile modal state
  const [newName, setNewName] = useState('');
  const [newStrategy, setNewStrategy] = useState<RoutingStrategy>('lowest_latency');
  const [newPrimaryId, setNewPrimaryId] = useState(models[0]?.id ?? '');
  const [newFallbackId, setNewFallbackId] = useState(models[1]?.id ?? models[0]?.id ?? '');
  const [newPrimaryWeight, setNewPrimaryWeight] = useState(85);
  const [newCache, setNewCache] = useState(true);
  const [formErr, setFormErr] = useState('');

  const activePolicy = policies.find((p) => p.id === selectedPolicyId) ?? policies[0];
  const primaryModel =
    models.find((m) => m.id === activePolicy?.primaryModelId) ?? models[0];
  const fallbackModel =
    models.find((m) => m.id === activePolicy?.fallbackModelId) ?? models[1] ?? models[0];
  const primarySource = sources[0];

  const primaryWeight = activePolicy?.primaryWeight ?? 85;
  const secondaryWeight = Math.max(0, 100 - primaryWeight);
  const activePoliciesCount = policies.filter((p) => p.active).length;

  const totalSavedTokens = policies.reduce(
    (sum, p) => sum + (p.semanticCacheEnabled ? p.savedTokensToday : 0),
    0
  );
  const avgHitRate = Math.round(
    policies.reduce((sum, p) => sum + (p.semanticCacheEnabled ? p.cacheHitRate : 0), 0) /
      Math.max(1, policies.length)
  );

  const handleSwapPrimaryFallback = () => {
    if (!activePolicy) return;
    onUpdatePolicy(activePolicy.id, {
      primaryModelId: activePolicy.fallbackModelId,
      fallbackModelId: activePolicy.primaryModelId,
    });
  };

  const handleWeightChange = (weight: number) => {
    if (!activePolicy) return;
    onUpdatePolicy(activePolicy.id, {
      primaryWeight: weight,
      strategy: weight < 100 && activePolicy.strategy !== 'weighted' ? 'weighted' : activePolicy.strategy,
    });
  };

  const handleSimilarityChange = (sim: number) => {
    if (!activePolicy) return;
    // Lower similarity threshold = slightly higher hit rate (purely reactive telemetry preview)
    const estimatedHit = Math.max(8, Math.min(42, Math.round((1.04 - sim) * 240)));
    const estimatedSaved = Math.round(estimatedHit * 155_000);
    onUpdatePolicy(activePolicy.id, {
      cacheSimilarityThreshold: sim,
      cacheHitRate: estimatedHit,
      savedTokensToday: estimatedSaved,
    });
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setFormErr('یک نام کوتاه برای خط لوله مسیریابی انتخاب کنید.');
      return;
    }
    if (newPrimaryId === newFallbackId && models.length > 1) {
      setFormErr('مدل پشتیبان (Fallback) باید متفاوت از مدل اصلی باشد.');
      return;
    }
    onAddPolicy({
      name: newName.trim(),
      description: 'قانون مسیریابی هوشمند با انتقال خودکار هنگام شلوغی یا خطای نود.',
      strategy: newStrategy,
      primaryModelId: newPrimaryId,
      fallbackModelId: newFallbackId,
      primaryWeight: newPrimaryWeight,
      circuitBreakerThreshold: 5,
      circuitBreakerCooldownSec: 60,
      timeoutMs: 1200,
      retries: 2,
      triggerCondition: 'خطای ۴۲۹/۵۰۳ یا TTFT > 1200ms',
      semanticCacheEnabled: newCache,
      cacheSimilarityThreshold: 0.94,
      cacheHitRate: newCache ? 19 : 0,
      savedTokensToday: newCache ? 920_000 : 0,
      active: true,
    });
    setNewName('');
    setFormErr('');
    setAddModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Gateway Telemetry Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#F6F6FA] rounded-[24px] p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-[#1E1E24] text-white flex items-center justify-center shrink-0">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-[#7B7B8F]">خطوط لوله فعال</div>
              <div className="flex items-baseline gap-2 mt-0.5 tabular-nums">
                <span className="text-2xl font-bold text-[#1C1C24]">
                  {toPersianDigits(activePoliciesCount)}/{toPersianDigits(policies.length)}
                </span>
                <span className="text-xs font-bold text-[#059669]">۹۹.۹۴٪ SLA</span>
              </div>
            </div>
          </div>
          {/* Visual route status pips */}
          <div className="flex items-center gap-1.5" dir="ltr">
            {policies.map((p) => (
              <span
                key={p.id}
                className={`h-6 w-2 rounded-full transition-colors ${
                  p.active ? 'bg-[#059669]' : 'bg-[#DDDDE8]'
                }`}
                title={p.name}
              />
            ))}
          </div>
        </div>

        <div className="bg-[#F6F6FA] rounded-[24px] p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-[#7B70E8] text-white flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-[#7B7B8F]">صرفه‌جویی کش معنایی</div>
              <div className="flex items-baseline gap-2 mt-0.5 tabular-nums">
                <span className="text-2xl font-bold text-[#1C1C24]">
                  {formatTokenCount(totalSavedTokens)}
                </span>
                <span className="text-xs font-bold text-[#7B70E8]">
                  {toPersianDigits(avgHitRate)}٪ Hit
                </span>
              </div>
            </div>
          </div>
          {/* Mini circular hit-rate ring */}
          <svg viewBox="0 0 40 40" className="w-11 h-11 shrink-0 -rotate-90" aria-hidden="true">
            <circle cx="20" cy="20" r="15" fill="none" stroke="#E5E4F0" strokeWidth="4" />
            <circle
              cx="20"
              cy="20"
              r="15"
              fill="none"
              stroke="#7B70E8"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${(avgHitRate / 100) * 94.2} 94.2`}
            />
          </svg>
        </div>

        <div className="bg-gradient-to-br from-[#8D82F4] to-[#6D61DF] rounded-[24px] p-5 text-white flex items-center justify-between gap-4 shadow-[0_14px_30px_-14px_rgba(123,112,232,0.65)]">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-white/80 font-mono" dir="ltr">
                Zero-Downtime Gateway
              </div>
              <div className="text-sm font-bold mt-0.5 truncate">مدیریت مسیر و Failover</div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white text-[#1C1C24] text-xs font-bold whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 text-[#7B70E8]" />
            <span>مسیر جدید</span>
          </motion.button>
        </div>
      </div>

      {/* Main Real AI Gateway Traffic Control Studio (12-Col Full-Width Bento) */}
      {activePolicy && primaryModel && fallbackModel && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
          {/* Right/Main 7 Columns: Live Visual Topology Pipeline */}
          <section className="xl:col-span-7 bg-[#F6F6FA] rounded-[28px] p-5 sm:p-6 flex flex-col justify-between gap-5">
            {/* Pipeline Header + Policy Quick Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1E1E24] text-white flex items-center justify-center shrink-0">
                  <GitBranch className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1C1C24]">{activePolicy.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-[#7B7B8F]" dir="ltr">
                    <span>TIMEOUT {activePolicy.timeoutMs}ms</span>
                    <span>·</span>
                    <span>RETRY {activePolicy.retries}×</span>
                    <span>·</span>
                    <span>CB {activePolicy.circuitBreakerThreshold}err/{activePolicy.circuitBreakerCooldownSec}s</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={activePolicy.active}
                aria-label={`تغییر وضعیت ${activePolicy.name}`}
                onClick={() => onTogglePolicyActive(activePolicy.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  activePolicy.active
                    ? 'bg-[#1E1E24] text-white'
                    : 'bg-white text-[#8E8EA0]'
                }`}
              >
                {activePolicy.active ? 'مسیر فعال' : 'مسیر متوقف'}
              </button>
            </div>

            {/* Interactive Topology Flow Graph (RTL 3-Stage Architecture) */}
            <div className="bg-white rounded-[24px] p-5 sm:p-6 relative overflow-hidden">
              {/* Subtle architectural dot grid background */}
              <div
                className="absolute inset-0 opacity-40 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(#D8D6EC 1px, transparent 1px)',
                  backgroundSize: '18px 18px',
                }}
              />

              <div className="relative z-10 grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
                {/* Stage 1: Gateway Ingress & Cache */}
                <div className="md:col-span-3 space-y-3">
                  {/* Ingress Node */}
                  <div className="rounded-[20px] bg-[#1E1E24] text-white p-4 space-y-2 shadow-[0_12px_26px_-10px_rgba(28,28,36,0.4)]">
                    <div className="flex items-center justify-between">
                      <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
                        <Server className="w-3.5 h-3.5 text-[#C7C1FA]" />
                      </span>
                      <span className="font-mono text-[10px] text-emerald-400">200 OK</span>
                    </div>
                    <div className="text-xs font-bold">درگاه ورودی مدار</div>
                    <div dir="ltr" className="font-mono text-[10px] text-white/60 truncate">
                      /v1/chat/completions
                    </div>
                  </div>

                  {/* Interactive Semantic Cache Node */}
                  <button
                    type="button"
                    onClick={() => onToggleSemanticCache(activePolicy.id)}
                    className={`w-full text-right rounded-[20px] p-3.5 transition-all border ${
                      activePolicy.semanticCacheEnabled
                        ? 'bg-[#F3F1FE] border-[#7B70E8]/30'
                        : 'bg-[#F8F8FC] border-dashed border-[#D8D8E6] opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            activePolicy.semanticCacheEnabled
                              ? 'bg-[#7B70E8] text-white'
                              : 'bg-[#E4E4EE] text-[#8E8EA0]'
                          }`}
                        >
                          <Database className="w-3 h-3" />
                        </span>
                        <span className="text-xs font-bold text-[#1C1C24]">کش معنایی</span>
                      </div>
                      <span
                        className={`text-[10.5px] font-bold tabular-nums ${
                          activePolicy.semanticCacheEnabled ? 'text-[#7B70E8]' : 'text-[#8E8EA0]'
                        }`}
                      >
                        {activePolicy.semanticCacheEnabled
                          ? `${toPersianDigits(activePolicy.cacheHitRate)}٪`
                          : 'خاموش'}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-white overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#7B70E8] transition-all duration-300"
                        style={{
                          width: activePolicy.semanticCacheEnabled
                            ? `${Math.min(100, activePolicy.cacheHitRate * 2.2)}%`
                            : '0%',
                        }}
                      />
                    </div>
                  </button>
                </div>

                {/* Animated SVG Connectors (Stage 1 -> Stage 2) */}
                <div className="hidden md:flex md:col-span-2 flex-col items-center justify-center relative h-44">
                  <svg
                    viewBox="0 0 120 180"
                    className="w-full h-full overflow-visible"
                    aria-hidden="true"
                  >
                    {/* Primary Stream Path */}
                    <path
                      d="M 120 90 C 75 90, 65 44, 0 44"
                      fill="none"
                      stroke={activePolicy.active ? '#7B70E8' : '#D4D4E0'}
                      strokeWidth={Math.max(2, (primaryWeight / 100) * 4.5)}
                      strokeLinecap="round"
                    />
                    {activePolicy.active && (
                      <path
                        d="M 120 90 C 75 90, 65 44, 0 44"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        strokeDasharray="6 14"
                        className="animate-dash-flow"
                      />
                    )}

                    {/* Fallback / Secondary Stream Path */}
                    <path
                      d="M 120 90 C 75 90, 65 138, 0 138"
                      fill="none"
                      stroke={
                        !activePolicy.active
                          ? '#D4D4E0'
                          : secondaryWeight > 0
                            ? '#1E1E24'
                            : '#B9B6CE'
                      }
                      strokeWidth={secondaryWeight > 0 ? Math.max(2, (secondaryWeight / 100) * 4.5) : 1.75}
                      strokeDasharray={secondaryWeight === 0 ? '5 5' : undefined}
                      strokeLinecap="round"
                    />
                    {activePolicy.active && secondaryWeight > 0 && (
                      <path
                        d="M 120 90 C 75 90, 65 138, 0 138"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                        strokeDasharray="5 14"
                        className="animate-dash-flow-slow"
                      />
                    )}

                    {/* Center Router Junction */}
                    <circle cx="76" cy="90" r="11" fill="#1E1E24" />
                    <circle
                      cx="76"
                      cy="90"
                      r="4"
                      fill={activePolicy.active ? '#7B70E8' : '#8E8EA0'}
                    />
                  </svg>

                  {/* Live Split Percentages Overlaid Cleanly */}
                  <span className="absolute top-5 left-1 px-2 py-0.5 rounded-full bg-[#7B70E8] text-white text-[10px] font-bold tabular-nums">
                    {toPersianDigits(primaryWeight)}٪
                  </span>
                  <span className="absolute bottom-5 left-1 px-2 py-0.5 rounded-full bg-[#1E1E24] text-white text-[10px] font-bold tabular-nums">
                    {secondaryWeight > 0 ? `${toPersianDigits(secondaryWeight)}٪` : 'Failover'}
                  </span>
                </div>

                {/* Stage 2: Upstream Primary & Fallback Target Nodes + Swap Button */}
                <div className="md:col-span-6 relative space-y-3">
                  {/* Primary Model Node */}
                  <div className="rounded-[20px] bg-[#F6F6FA] p-4 ring-2 ring-[#7B70E8]/35 transition-all">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-[#7B70E8] text-white flex items-center justify-center shrink-0">
                          <Cpu className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-[11px] font-bold text-[#7B70E8]">
                          مدل اصلی (Primary)
                        </span>
                      </div>
                      <span className="text-xs font-bold tabular-nums text-[#1C1C24]">
                        {toPersianDigits(primaryWeight)}٪ ترافیک
                      </span>
                    </div>
                    <div className="text-sm font-bold text-[#1C1C24] truncate">
                      {primaryModel.displayName}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <span
                        dir="ltr"
                        className="font-mono text-[10.5px] text-[#7B7B8F] truncate max-w-[200px]"
                      >
                        {primaryModel.modelId}
                      </span>
                      <SpeedSignalBars tps={primaryModel.tpsAvg} compact />
                    </div>
                  </div>

                  {/* Tactile Primary <-> Fallback Swap Action */}
                  <div className="flex items-center justify-center -my-1.5 relative z-20">
                    <motion.button
                      whileHover={{ scale: 1.08, rotate: 180 }}
                      whileTap={{ scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                      type="button"
                      onClick={handleSwapPrimaryFallback}
                      aria-label="جابه‌جایی مدل اصلی و پشتیبان"
                      title="جابه‌جایی مدل اصلی و پشتیبان"
                      className="w-9 h-9 rounded-full bg-[#1E1E24] hover:bg-[#7B70E8] text-white flex items-center justify-center shadow-[0_6px_16px_rgba(28,28,36,0.22)] transition-colors"
                    >
                      <ArrowUpDown className="w-4 h-4" />
                    </motion.button>
                  </div>

                  {/* Fallback / Secondary Model Node */}
                  <div className="rounded-[20px] bg-[#F6F6FA] p-4 border border-[#E6E6F2] transition-all">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-[#1E1E24] text-white flex items-center justify-center shrink-0">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-[11px] font-bold text-[#525264]">
                          {secondaryWeight > 0 ? 'مدل دوم / پشتیبان' : 'پشتیبان خودکار (Failover)'}
                        </span>
                      </div>
                      <span className="text-xs font-bold tabular-nums text-[#525264]">
                        {secondaryWeight > 0 ? `${toPersianDigits(secondaryWeight)}٪ ترافیک` : 'در خطا/تایم‌اوت'}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-[#1C1C24] truncate">
                      {fallbackModel.displayName}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <span
                        dir="ltr"
                        className="font-mono text-[10.5px] text-[#7B7B8F] truncate max-w-[200px]"
                      >
                        {fallbackModel.modelId}
                      </span>
                      <SpeedSignalBars tps={fallbackModel.tpsAvg} compact />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Hardware & Health Strip inside Topology Card */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-[18px] px-4 py-3 flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#8E8EA0]">کلاستر مقصد</span>
                <span dir="ltr" className="font-mono text-xs font-bold text-[#1C1C24] truncate">
                  {primarySource?.engine ?? 'vLLM'} · H200
                </span>
              </div>
              <div className="bg-white rounded-[18px] px-4 py-3 flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#8E8EA0]">شرط Failover</span>
                <span dir="ltr" className="font-mono text-[11px] font-bold text-[#7B70E8]">
                  429 / 503
                </span>
              </div>
              <div className="bg-white rounded-[18px] px-4 py-3 flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#8E8EA0]">شباهت کش</span>
                <span dir="ltr" className="font-mono text-xs font-bold text-[#1C1C24] tabular-nums">
                  ≥ {activePolicy.cacheSimilarityThreshold.toFixed(2)}
                </span>
              </div>
            </div>
          </section>

          {/* Left 5 Columns: Real Live Gateway Controls Inspector */}
          <section className="xl:col-span-5 bg-[#F6F6FA] rounded-[28px] p-5 sm:p-6 flex flex-col justify-between gap-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-[#7B70E8] text-white flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="w-4 h-4" />
                </span>
                <h2 className="text-base font-bold text-[#1C1C24]">تنظیمات زنده خط لوله</h2>
              </div>
              {/* Policy switcher pills */}
              <div className="flex items-center gap-1.5">
                {policies.map((pol, idx) => (
                  <button
                    key={pol.id}
                    type="button"
                    onClick={() => setSelectedPolicyId(pol.id)}
                    className={`w-7 h-7 rounded-full text-xs font-bold tabular-nums transition-colors ${
                      pol.id === activePolicy.id
                        ? 'bg-[#1E1E24] text-white'
                        : 'bg-white text-[#646476] hover:text-[#1C1C24]'
                    }`}
                    title={pol.name}
                  >
                    {toPersianDigits(idx + 1)}
                  </button>
                ))}
              </div>
            </div>

            {/* 1. Traffic Weight Split Control */}
            <div className="bg-white rounded-[20px] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1C1C24]">توزیع وزن ترافیک (Traffic Split)</span>
                <span className="font-mono text-[11px] font-bold tabular-nums text-[#7B70E8]" dir="ltr">
                  {primaryWeight}% / {secondaryWeight}%
                </span>
              </div>

              {/* Dual-segment live weight bar */}
              <div className="h-2.5 w-full rounded-full bg-[#ECECF4] overflow-hidden flex gap-[2px]" dir="ltr">
                <div
                  className="h-full bg-[#7B70E8] rounded-l-full transition-all duration-200"
                  style={{ width: `${primaryWeight}%` }}
                />
                {secondaryWeight > 0 && (
                  <div
                    className="h-full bg-[#1E1E24] rounded-r-full transition-all duration-200"
                    style={{ width: `${secondaryWeight}%` }}
                  />
                )}
              </div>

              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={primaryWeight}
                aria-label="سهم ترافیک مدل اصلی"
                onChange={(e) => handleWeightChange(Number(e.target.value))}
                className="w-full accent-[#7B70E8] cursor-pointer"
              />

              <div className="flex items-center justify-between text-[10.5px] font-semibold text-[#7B7B8F]">
                <span>{primaryModel.displayName}</span>
                <span>{secondaryWeight === 0 ? '۱۰۰٪ اصلی (Failover خالص)' : fallbackModel.displayName}</span>
              </div>
            </div>

            {/* 2. Strategy Visual Tile Grid */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#1C1C24] px-1">الگوریتم توزیع</div>
              <div className="grid grid-cols-2 gap-2">
                {STRATEGIES.map((st) => {
                  const Icon = st.icon;
                  const active = activePolicy.strategy === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => onChangeStrategy(activePolicy.id, st.id)}
                      className={`p-3 rounded-[18px] text-right transition-all flex items-center justify-between gap-2 ${
                        active
                          ? 'bg-[#1E1E24] text-white'
                          : 'bg-white text-[#525264] hover:bg-[#EFEFF7]'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            active ? 'text-[#A9A0F8]' : 'text-[#7B70E8]'
                          }`}
                        />
                        <span className="text-xs font-bold truncate">{st.shortTitle}</span>
                      </span>
                      <span
                        dir="ltr"
                        className={`font-mono text-[9.5px] shrink-0 ${
                          active ? 'text-white/60' : 'text-[#9A9AAE]'
                        }`}
                      >
                        {st.metricHint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Circuit Breaker & Timeout Controls */}
            <div className="bg-white rounded-[20px] p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1C1C24] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#7B70E8]" />
                  <span>مدار شکن و تایم‌اوت</span>
                </span>
                <span className="text-[10.5px] font-bold text-emerald-600">بسته (سالم)</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Error Threshold */}
                <div>
                  <div className="text-[10.5px] font-semibold text-[#7B7B8F] mb-1.5">
                    آستانه خطای پیاپی
                  </div>
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-full bg-[#F5F5FA]">
                    {CB_THRESHOLDS.map((val) => {
                      const sel = activePolicy.circuitBreakerThreshold === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() =>
                            onUpdatePolicy(activePolicy.id, { circuitBreakerThreshold: val })
                          }
                          className={`py-1 rounded-full text-[11px] font-bold tabular-nums transition-colors ${
                            sel ? 'bg-[#1E1E24] text-white' : 'text-[#646476] hover:text-[#1C1C24]'
                          }`}
                        >
                          {toPersianDigits(val)}×
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cooldown Seconds */}
                <div>
                  <div className="text-[10.5px] font-semibold text-[#7B7B8F] mb-1.5">
                    زمان بازیابی (Cooldown)
                  </div>
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-full bg-[#F5F5FA]" dir="ltr">
                    {CB_COOLDOWNS.map((sec) => {
                      const sel = activePolicy.circuitBreakerCooldownSec === sec;
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() =>
                            onUpdatePolicy(activePolicy.id, { circuitBreakerCooldownSec: sec })
                          }
                          className={`py-1 rounded-full text-[11px] font-mono font-bold transition-colors ${
                            sel ? 'bg-[#7B70E8] text-white' : 'text-[#646476] hover:text-[#1C1C24]'
                          }`}
                        >
                          {sec}s
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Timeout & Retries inline row */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="text-[10.5px] font-semibold text-[#7B7B8F] mb-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>تایم‌اوت شروع پاسخ</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 p-1 rounded-full bg-[#F5F5FA]" dir="ltr">
                    {TIMEOUT_OPTIONS.map((ms) => {
                      const sel = activePolicy.timeoutMs === ms;
                      return (
                        <button
                          key={ms}
                          type="button"
                          onClick={() => onUpdatePolicy(activePolicy.id, { timeoutMs: ms })}
                          className={`py-1 rounded-full text-[10px] font-mono font-bold transition-colors ${
                            sel ? 'bg-[#1E1E24] text-white' : 'text-[#646476]'
                          }`}
                        >
                          {ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-[10.5px] font-semibold text-[#7B7B8F] mb-1.5">
                    تلاش مجدد خودکار
                  </div>
                  <div className="grid grid-cols-4 gap-1 p-1 rounded-full bg-[#F5F5FA]">
                    {RETRY_OPTIONS.map((r) => {
                      const sel = activePolicy.retries === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => onUpdatePolicy(activePolicy.id, { retries: r })}
                          className={`py-1 rounded-full text-[11px] font-bold tabular-nums transition-colors ${
                            sel ? 'bg-[#7B70E8] text-white' : 'text-[#646476]'
                          }`}
                        >
                          {toPersianDigits(r)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Semantic Cache Similarity Control */}
            <div className="bg-white rounded-[20px] p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#1C1C24] flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-[#7B70E8]" />
                  <span>کش معنایی Redis</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={activePolicy.semanticCacheEnabled}
                  onClick={() => onToggleSemanticCache(activePolicy.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                    activePolicy.semanticCacheEnabled
                      ? 'bg-[#7B70E8] text-white'
                      : 'bg-[#F2F2F8] text-[#8E8EA0]'
                  }`}
                >
                  {activePolicy.semanticCacheEnabled ? 'فعال' : 'خاموش'}
                </button>
              </div>

              {activePolicy.semanticCacheEnabled && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] tabular-nums">
                    <span className="text-[#7B7B8F]">آستانه شباهت برداری (Cosine)</span>
                    <span dir="ltr" className="font-mono font-bold text-[#1C1C24]">
                      {activePolicy.cacheSimilarityThreshold.toFixed(2)} ·{' '}
                      <span className="text-[#7B70E8]">{activePolicy.cacheHitRate}% hit</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.88}
                    max={0.99}
                    step={0.01}
                    value={activePolicy.cacheSimilarityThreshold}
                    aria-label="آستانه شباهت کش معنایی"
                    onChange={(e) => handleSimilarityChange(Number(e.target.value))}
                    className="w-full accent-[#7B70E8] cursor-pointer"
                  />
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* All Configured Routing Pipelines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {policies.map((pol) => {
          const primary = models.find((m) => m.id === pol.primaryModelId);
          const fallback = models.find((m) => m.id === pol.fallbackModelId);
          const isSelected = activePolicy?.id === pol.id;
          const pWeight = pol.primaryWeight ?? 100;
          const sWeight = Math.max(0, 100 - pWeight);
          const strat = STRATEGIES.find((s) => s.id === pol.strategy) ?? STRATEGIES[0];
          const StratIcon = strat.icon;

          return (
            <motion.article
              key={pol.id}
              whileHover={{ y: -2 }}
              onClick={() => setSelectedPolicyId(pol.id)}
              className={`bg-[#F6F6FA] rounded-[24px] p-4 space-y-3.5 cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-[#7B70E8] bg-[#F3F1FE]/60' : 'hover:bg-[#F0EFF8]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-[#7B70E8] text-white' : 'bg-[#1E1E24] text-white'
                    }`}
                  >
                    <StratIcon className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-[#1C1C24] truncate">{pol.name}</h3>
                </div>
                <span
                  className={`text-[11px] font-bold shrink-0 ${
                    pol.active ? 'text-[#059669]' : 'text-[#8E8EA0]'
                  }`}
                >
                  {pol.active ? 'فعال' : 'متوقف'}
                </span>
              </div>

              {/* Visual Traffic Split Strip */}
              <div className="bg-white rounded-[16px] p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#1C1C24]">
                  <span className="truncate max-w-[46%]">{primary?.displayName}</span>
                  <span className="truncate max-w-[46%] text-[#646476]">{fallback?.displayName}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#ECECF4] overflow-hidden flex gap-[2px]" dir="ltr">
                  <div className="h-full bg-[#7B70E8]" style={{ width: `${pWeight}%` }} />
                  {sWeight > 0 && (
                    <div className="h-full bg-[#1E1E24]" style={{ width: `${sWeight}%` }} />
                  )}
                </div>
                <div className="flex items-center justify-between text-[10.5px] font-mono text-[#7B7B8F]" dir="ltr">
                  <span>{pWeight}% Primary</span>
                  <span>
                    {pol.semanticCacheEnabled ? `Cache ${pol.cacheHitRate}%` : 'No Cache'} · CB {pol.circuitBreakerThreshold}×
                  </span>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* Visual Tile Modal: Add New Routing Policy */}
      <AnimatePresence>
        {addModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAddModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1C24]/35 backdrop-blur-[3px]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              role="dialog"
              aria-modal="true"
              aria-label="ایجاد خط لوله مسیریابی جدید"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-white rounded-[28px] shadow-[0_28px_80px_-15px_rgba(28,28,36,0.32)] overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-[#F0F0F6] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#7B70E8] text-white flex items-center justify-center">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-[#1C1C24]">ساخت خط لوله مسیریابی جدید</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  aria-label="بستن پنجره"
                  className="w-8 h-8 rounded-full bg-[#F5F5FA] text-[#646476] hover:text-[#1C1C24] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRule} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                {formErr && (
                  <div className="p-3 rounded-[16px] bg-[#FEF2F2] text-xs font-semibold text-[#DC2626]">
                    {formErr}
                  </div>
                )}

                <div>
                  <label htmlFor="route-name-input" className="block text-xs font-bold text-[#1C1C24] mb-1.5">
                    نام خط لوله
                  </label>
                  <input
                    id="route-name-input"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="مثلاً: خط لوله تحلیل مالی و اداری"
                    className="w-full px-4 py-2.5 text-sm bg-[#F6F6FA] rounded-[16px] text-[#1C1C24] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B70E8]/35"
                  />
                </div>

                {/* Visual Strategy Tiles */}
                <div className="grid grid-cols-2 gap-2.5">
                  {STRATEGIES.map((st) => {
                    const Icon = st.icon;
                    const selected = newStrategy === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setNewStrategy(st.id)}
                        className={`p-3.5 rounded-[20px] text-right transition-all flex items-center gap-3 ${
                          selected
                            ? 'bg-[#F3F1FE] ring-2 ring-[#7B70E8]'
                            : 'bg-[#F6F6FA] hover:bg-[#EFEFF6]'
                        }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            selected ? 'bg-[#7B70E8] text-white' : 'bg-[#1E1E24] text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="text-xs font-bold text-[#1C1C24] block">
                            {st.title}
                          </span>
                          <span dir="ltr" className="font-mono text-[10px] text-[#8E8EA0] block">
                            {st.metricHint}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Visual Primary & Fallback Model Tiles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-[#1C1C24]">۱. مدل اصلی</div>
                    {models.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setNewPrimaryId(m.id)}
                        className={`w-full p-3 rounded-[16px] text-right flex items-center justify-between gap-2 transition-all ${
                          newPrimaryId === m.id
                            ? 'bg-[#1E1E24] text-white'
                            : 'bg-[#F6F6FA] text-[#1C1C24] hover:bg-[#EFEFF6]'
                        }`}
                      >
                        <span className="text-xs font-bold truncate">{m.displayName}</span>
                        {newPrimaryId === m.id && <Check className="w-3.5 h-3.5 text-[#A9A0F8] shrink-0" />}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-bold text-[#1C1C24]">۲. مدل پشتیبان (Fallback)</div>
                    {models.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setNewFallbackId(m.id)}
                        className={`w-full p-3 rounded-[16px] text-right flex items-center justify-between gap-2 transition-all ${
                          newFallbackId === m.id
                            ? 'bg-[#7B70E8] text-white'
                            : 'bg-[#F6F6FA] text-[#1C1C24] hover:bg-[#EFEFF6]'
                        }`}
                      >
                        <span className="text-xs font-bold truncate">{m.displayName}</span>
                        {newFallbackId === m.id && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weight & Cache row */}
                <div className="bg-[#F6F6FA] rounded-[20px] p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1C1C24]">
                    <span>سهم اولیه مدل اصلی</span>
                    <span dir="ltr" className="font-mono text-[#7B70E8]">
                      {newPrimaryWeight}% / {100 - newPrimaryWeight}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    step={5}
                    value={newPrimaryWeight}
                    onChange={(e) => setNewPrimaryWeight(Number(e.target.value))}
                    className="w-full accent-[#7B70E8]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setNewCache((v) => !v)}
                  className={`w-full p-4 rounded-[20px] flex items-center justify-between gap-3 transition-all ${
                    newCache ? 'bg-[#F3F1FE] ring-2 ring-[#7B70E8]' : 'bg-[#F6F6FA]'
                  }`}
                >
                  <span className="text-xs font-bold text-[#1C1C24]">
                    کش معنایی Redis (Cosine ≥ 0.94)
                  </span>
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      newCache ? 'bg-[#7B70E8] text-white' : 'bg-white text-[#8E8EA0]'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </span>
                </button>

                <div className="pt-3 border-t border-[#F0F0F6] flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#646476] rounded-full"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-semibold text-white bg-[#7B70E8] hover:bg-[#6B5FE0] rounded-full shadow-[0_8px_18px_-6px_rgba(123,112,232,0.55)]"
                  >
                    ذخیره و فعال‌سازی مسیر
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
