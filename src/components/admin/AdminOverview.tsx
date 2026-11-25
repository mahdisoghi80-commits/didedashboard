import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowLeft,
  Cpu,
  Gauge,
  ShieldAlert,
  Users,
  Zap,
} from 'lucide-react';
import {
  AccessPlan,
  LocalModel,
  ModelSource,
  OrgUser,
  ServerLoadLevel,
  TimeRange,
} from '../../types';
import { USAGE_TREND_DATA } from '../../data/seedData';
import {
  computeDashboardKpis,
  formatNumberFa,
  formatTokenCount,
  getUserEffectiveAccess,
  toPersianDigits,
} from '../../utils/logic';
import { RadialCapacityGauge } from '../RadialCapacityGauge';
import { SlotPipBar, SpeedSignalBars, SplitRatioBar } from '../VisualPrimitives';

interface AdminOverviewProps {
  users: OrgUser[];
  plans: AccessPlan[];
  models: LocalModel[];
  sources: ModelSource[];
  manualServerLoad: ServerLoadLevel | null;
  onChangeManualServerLoad: (load: ServerLoadLevel | null) => void;
  onThrottleUser: (userId: string) => void;
  onViewUser: (userId: string) => void;
  onNavigateSources: () => void;
  onNavigateUsers: () => void;
  onNavigatePlans: () => void;
}

const MINI_TOKEN_BARS = [
  { label: 'ش', val: 38 },
  { label: '۱ش', val: 72 },
  { label: '۲ش', val: 56 },
  { label: '۳ش', val: 48 },
  { label: 'امروز', val: 94 },
];

const MINI_CAPSULE_BARS = [
  { label: 'بک', top: 28, height: 42 },
  { label: 'پژو', top: 18, height: 55 },
  { label: 'مخا', top: 35, height: 34 },
  { label: 'مال', top: 44, height: 24 },
  { label: 'آرش', top: 22, height: 48 },
];

const SPARKLINE_POINTS = [
  { x: 10, y: 40 },
  { x: 30, y: 24 },
  { x: 52, y: 34 },
  { x: 74, y: 18 },
  { x: 96, y: 26 },
  { x: 118, y: 10 },
];

export function AdminOverview({
  users,
  plans,
  models,
  sources,
  manualServerLoad,
  onChangeManualServerLoad,
  onThrottleUser,
  onViewUser,
  onNavigateSources,
  onNavigateUsers,
}: AdminOverviewProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [selectedBucketIdx, setSelectedBucketIdx] = useState<number>(8);

  const primarySource = sources[0];
  const maxCapacity = sources.reduce((sum, s) => sum + s.maxConcurrentSlots, 0) || 20;

  const kpis = useMemo(
    () => computeDashboardKpis(users, maxCapacity, manualServerLoad),
    [users, maxCapacity, manualServerLoad]
  );

  const buckets = USAGE_TREND_DATA[timeRange];
  const safeSelectedIdx = Math.min(selectedBucketIdx, buckets.length - 1);
  const activeBucket = buckets[safeSelectedIdx];

  const maxBucketTotal = useMemo(
    () => Math.max(...buckets.map((b) => b.inputTokens + b.outputTokens), 1),
    [buckets]
  );

  const topConsumers = useMemo(() => {
    return [...users].sort((a, b) => b.tokensUsed - a.tokensUsed).slice(0, 5);
  }, [users]);

  const vramPercent = primarySource
    ? Math.round((primarySource.vramUsedGb / Math.max(1, primarySource.vramTotalGb)) * 100)
    : 76;

  // Dynamic visual reflection when admin tests server load simulator
  const visualConcurrencyPct =
    kpis.effectiveServerLoad === 'heavy'
      ? 88
      : kpis.effectiveServerLoad === 'moderate'
        ? 58
        : kpis.utilizationPercent;

  const visualSlotsActive =
    kpis.effectiveServerLoad === 'heavy'
      ? Math.max(kpis.liveConcurrentRequests, Math.round(maxCapacity * 0.85))
      : kpis.effectiveServerLoad === 'moderate'
        ? Math.max(kpis.liveConcurrentRequests, Math.round(maxCapacity * 0.55))
        : kpis.liveConcurrentRequests;

  const loadTheme: Record<
    ServerLoadLevel,
    { label: string; sub: string; ring: string; grad: string; text: string }
  > = {
    healthy: {
      label: 'سالم و خلوت',
      sub: 'زمان پاسخ‌دهی ایده‌آل · بدون صف انتظار',
      ring: '#7B70E8',
      grad: 'from-[#8B80F4] via-[#7B70E8] to-[#685CD8]',
      text: 'text-[#16A34A]',
    },
    moderate: {
      label: 'زیر فشار عادی',
      sub: 'بار کاری متعادل · صف کوتاه ۲ ثانیه‌ای',
      ring: '#D97706',
      grad: 'from-[#F59E0B] via-[#E58E09] to-[#D97706]',
      text: 'text-[#D97706]',
    },
    heavy: {
      label: 'شلوغ (تراکم صف)',
      sub: 'ظرفیت GPU نزدیک به سقف · اعمال اولویت صف',
      ring: '#E11D48',
      grad: 'from-[#F43F5E] via-[#E11D48] to-[#BE123C]',
      text: 'text-[#E11D48]',
    },
  };

  const activeTheme = loadTheme[kpis.effectiveServerLoad];

  return (
    <div className="space-y-5">
      {/* Row 1: Exact Dropify 3 Tactile KPI Bento Cards (No rounded-square icons!) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1: Today's Total Tokens + Animated 5-bar mini histogram */}
        <motion.button
          type="button"
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.985 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          onClick={onNavigateSources}
          className="text-right bg-[#F6F6FA] hover:bg-[#F1F0F8] rounded-[24px] p-5 flex items-center justify-between gap-4 transition-colors group"
        >
          <div className="space-y-3 min-w-0">
            <div className="text-xs font-medium text-[#6C6C80]">مجموع توکن‌های امروز</div>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-[#1E1E24] text-white flex items-center justify-center shrink-0">
                <Zap className="w-4.5 h-4.5" />
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[26px] font-bold text-[#1C1C24] tabular-nums leading-none">
                    {formatTokenCount(kpis.todayTotalTokens)}
                  </span>
                  <span className="text-[11px] font-semibold text-[#16A34A] tabular-nums">
                    ↑ ۱۸٪
                  </span>
                </div>
                <SplitRatioBar
                  input={kpis.todayInputTokens}
                  output={kpis.todayOutputTokens}
                  compact
                  className="mt-2 min-w-[148px]"
                />
              </div>
            </div>
          </div>

          {/* Mini vertical bars (Dropify Card 1 signature) */}
          <div className="flex items-end gap-1.5 h-16 shrink-0 pt-2" aria-hidden="true">
            {MINI_TOKEN_BARS.map((bar, idx) => {
              const isLast = idx === MINI_TOKEN_BARS.length - 1;
              return (
                <div key={bar.label} className="flex flex-col items-center gap-1 h-full justify-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${bar.val}%` }}
                    transition={{ duration: 0.45, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    className={`w-2.5 rounded-t-md ${
                      isLast
                        ? 'bg-[#7B70E8]'
                        : 'bg-[#DDD9F7] group-hover:bg-[#C6BFF3] transition-colors'
                    }`}
                  />
                  <span className="text-[9px] text-[#9A9AAE]">{bar.label}</span>
                </div>
              );
            })}
          </div>
        </motion.button>

        {/* KPI 2: Active Users & Requests + Vertical Capsule Track Bars */}
        <motion.button
          type="button"
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.985 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          onClick={onNavigateUsers}
          className="text-right bg-[#F6F6FA] hover:bg-[#F1F0F8] rounded-[24px] p-5 flex items-center justify-between gap-4 transition-colors group"
        >
          <div className="space-y-3 min-w-0">
            <div className="text-xs font-medium text-[#6C6C80]">کاربران فعال امروز</div>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-[#1E1E24] text-white flex items-center justify-center shrink-0">
                <Users className="w-4.5 h-4.5" />
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[26px] font-bold text-[#1C1C24] tabular-nums leading-none">
                    {toPersianDigits(kpis.activeUsersCount)}
                  </span>
                  <span className="text-sm font-medium text-[#8A8A9E] tabular-nums">
                    /{toPersianDigits(kpis.totalUsersCount)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="w-16 h-1.5 rounded-full bg-[#E5E4F0] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1E1E24]"
                      style={{
                        width: `${Math.round(
                          (kpis.activeUsersCount / Math.max(1, kpis.totalUsersCount)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10.5px] font-bold text-[#646476] tabular-nums">
                    {formatNumberFa(kpis.todayRequests)} req
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Vertical capsule equalizer tracks (Dropify Card 2 signature) */}
          <div className="flex items-end gap-2 h-16 shrink-0 pt-1" aria-hidden="true">
            {MINI_CAPSULE_BARS.map((cap, idx) => (
              <div key={cap.label} className="flex flex-col items-center gap-1 h-full justify-end">
                <div className="relative w-1.5 h-12 rounded-full bg-[#E5E4F0] overflow-hidden">
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.4, delay: idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-x-0 rounded-full bg-[#7B70E8] origin-bottom"
                    style={{ top: `${cap.top}%`, height: `${cap.height}%` }}
                  />
                </div>
                <span className="text-[9px] text-[#9A9AAE]">{cap.label}</span>
              </div>
            ))}
          </div>
        </motion.button>

        {/* KPI 3: Live Speed & Latency + Animated Dotted Sparkline */}
        <motion.button
          type="button"
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.985 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          onClick={onNavigateSources}
          className="text-right bg-[#F6F6FA] hover:bg-[#F1F0F8] rounded-[24px] p-5 flex items-center justify-between gap-4 transition-colors group"
        >
          <div className="space-y-3 min-w-0">
            <div className="text-xs font-medium text-[#6C6C80]">سرعت پاسخ سرور داخلی</div>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-[#1E1E24] text-white flex items-center justify-center shrink-0">
                <Gauge className="w-4.5 h-4.5" />
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[26px] font-bold text-[#1C1C24] tabular-nums leading-none">
                    {toPersianDigits(primarySource?.outputTps ?? 64)}
                  </span>
                  <span className="text-xs font-mono font-medium text-[#8A8A9E]">tok/s</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <SpeedSignalBars ttftMs={primarySource?.ttftMs ?? 145} compact />
                  <span className="text-[10px] font-mono text-[#8E8EA0]">TTFT</span>
                </div>
              </div>
            </div>
          </div>

          {/* Animated dotted sparkline (Dropify Card 3 signature) */}
          <svg viewBox="0 0 128 54" className="w-28 h-14 shrink-0 overflow-visible" aria-hidden="true">
            <motion.polyline
              fill="none"
              stroke="#B5AEF3"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={SPARKLINE_POINTS.map((p) => `${p.x},${p.y}`).join(' ')}
              initial={{ pathLength: 0, opacity: 0.4 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
            {SPARKLINE_POINTS.map((pt, i) => (
              <motion.circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={i === SPARKLINE_POINTS.length - 1 ? 4 : 3}
                fill={i === SPARKLINE_POINTS.length - 1 ? '#7B70E8' : '#8B81EE'}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15 + i * 0.06, type: 'spring', stiffness: 400 }}
              />
            ))}
          </svg>
        </motion.button>
      </div>

      {/* Row 2: Dropify-inspired Bento Split — Radial Capacity Dial (4 cols) + Interactive Gateway Flow & Token Trend (8 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Radial Capacity & Server Health Card (Dropify "Speed Statistic" signature) */}
        <section className="xl:col-span-4 bg-[#F6F6FA] rounded-[26px] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#1C1C24]">ظرفیت زنده و سلامت GPU</h2>
              <p className={`text-xs font-semibold mt-0.5 ${activeTheme.text}`}>
                {activeTheme.label}
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateSources}
              className="text-xs font-semibold text-[#7B70E8] hover:text-[#5B4ED6] inline-flex items-center gap-1 whitespace-nowrap"
            >
              <span>سرورها</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="my-4">
            <RadialCapacityGauge
              centerValue={`${toPersianDigits(visualSlotsActive)}/${toPersianDigits(maxCapacity)}`}
              centerUnit="اسلات همزمان فعال"
              outerPercent={visualConcurrencyPct}
              innerPercent={vramPercent}
              outerLabel={`همزمانی (${toPersianDigits(visualConcurrencyPct)}٪)`}
              innerLabel={`حافظه VRAM (${toPersianDigits(vramPercent)}٪)`}
              outerColor={activeTheme.ring}
            />
          </div>

          {/* Interactive Server Load Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2" aria-hidden="true">
              <span
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  kpis.effectiveServerLoad === 'healthy' ? 'bg-emerald-500' : 'bg-[#E2E2EC]'
                }`}
              />
              <span
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  kpis.effectiveServerLoad === 'moderate' ? 'bg-amber-500' : 'bg-[#E2E2EC]'
                }`}
              />
              <span
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  kpis.effectiveServerLoad === 'heavy' ? 'bg-rose-500' : 'bg-[#E2E2EC]'
                }`}
              />
            </div>
            <div
              role="group"
              aria-label="وضعیت بار سرور"
              className="grid grid-cols-3 p-1 bg-white rounded-full shadow-[0_2px_8px_rgba(28,28,36,0.04)]"
            >
              {(
                [
                  { id: 'healthy', label: 'خلوت' },
                  { id: 'moderate', label: 'عادی' },
                  { id: 'heavy', label: 'شلوغ' },
                ] as const
              ).map((lvl) => {
                const isSelected = kpis.effectiveServerLoad === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => onChangeManualServerLoad(lvl.id)}
                    className={`relative py-1.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap ${
                      isSelected ? 'text-white' : 'text-[#646476] hover:text-[#1C1C24]'
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="server-load-pill"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        className="absolute inset-0 rounded-full bg-[#1E1E24]"
                      />
                    )}
                    <span className="relative z-10">{lvl.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right 8 Cols: Signature Iris Gradient Cluster Flow + Interactive Token Trend Chart */}
        <section className="xl:col-span-8 bg-[#F6F6FA] rounded-[26px] p-6 flex flex-col justify-between gap-5">
          {/* Top Half: Dropify-inspired Gradient Gateway Card + Model Traffic Share */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Soft Iris Gradient Flow Card (Exact Dropify NYC->PHI motif!) */}
            <div
              className={`md:col-span-5 rounded-[22px] bg-gradient-to-br ${activeTheme.grad} text-white p-5 flex flex-col justify-between shadow-[0_14px_32px_-12px_rgba(123,112,232,0.55)]`}
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>درگاه مدار</span>
                <span className="opacity-80">۱۰۰٪ داخلی</span>
                <span dir="ltr" className="font-mono">
                  2× H200
                </span>
              </div>

              <div className="my-4 space-y-2.5">
                <div className="flex items-center justify-center gap-2 text-xs text-white/90">
                  <Cpu className="w-4.5 h-4.5" />
                  <span>گاردریل ضد Multi-Agent فعال</span>
                </div>
                {/* Animated route progress slider */}
                <div className="relative h-1.5 rounded-full bg-white/25 overflow-hidden">
                  <motion.div
                    animate={{ x: ['100%', '-100%'] }}
                    transition={{ repeat: Infinity, duration: 2.6, ease: 'linear' }}
                    className="absolute inset-y-0 w-1/2 rounded-full bg-white/80"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-white/90 tabular-nums">
                <div>
                  <div className="opacity-75">حافظه VRAM</div>
                  <div dir="ltr" className="font-bold text-xs mt-0.5 text-right">
                    {toPersianDigits(primarySource?.vramUsedGb ?? 214)} /{' '}
                    {toPersianDigits(primarySource?.vramTotalGb ?? 282)} GB
                  </div>
                </div>
                <div className="text-left">
                  <div className="opacity-75">مدل‌های فعال</div>
                  <div className="font-bold text-xs mt-0.5">
                    {toPersianDigits(models.filter((m) => m.enabled).length)} مدل vLLM
                  </div>
                </div>
              </div>
            </div>

            {/* White Inner Island: Interactive Model Distribution (Click any model to manage!) */}
            <div className="md:col-span-7 bg-white rounded-[22px] p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-sm font-bold text-[#1C1C24]">سهم مدل‌های داخلی</span>
                <span dir="ltr" className="font-mono text-[11px] text-[#8A8A9E]">
                  {primarySource?.hardware ?? '2× NVIDIA H200'}
                </span>
              </div>
              <div className="space-y-3">
                {models.slice(0, 3).map((mdl, idx) => (
                  <button
                    key={mdl.id}
                    type="button"
                    onClick={onNavigateSources}
                    className="w-full text-right group block"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-[#1C1C24] group-hover:text-[#7B70E8] transition-colors truncate">
                        {mdl.displayName}
                      </span>
                      <span className="tabular-nums text-[#646476] shrink-0">
                        <strong className="text-[#1C1C24]">
                          {mdl.enabled ? `${toPersianDigits(mdl.trafficShare)}٪` : 'خاموش'}
                        </strong>{' '}
                        · {toPersianDigits(mdl.tpsAvg)} tok/s
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#F0EFF8] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: mdl.enabled ? `${mdl.trafficShare}%` : '0%' }}
                        transition={{ duration: 0.55, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                        className={`h-full rounded-full ${
                          idx === 0 ? 'bg-[#7B70E8]' : idx === 1 ? 'bg-[#1E1E24]' : 'bg-[#A69EF2]'
                        }`}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Half: Interactive Animated Token Usage Trend Chart */}
          <div className="bg-white rounded-[22px] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#1C1C24]">
                  روند مصرف توکن و درخواست‌ها
                </h2>
                <div className="text-xs text-[#7B7B8F] mt-0.5 tabular-nums">
                  بازه <strong className="text-[#1C1C24]">{activeBucket.label}</strong>:{' '}
                  <strong className="text-[#7B70E8]">
                    {formatTokenCount(activeBucket.inputTokens + activeBucket.outputTokens)}
                  </strong>{' '}
                  توکن · {formatNumberFa(activeBucket.requests)} درخواست ·{' '}
                  {toPersianDigits(activeBucket.avgTps)} tok/s
                </div>
              </div>

              {/* Animated Segmented Time Range Tabs */}
              <div
                role="tablist"
                aria-label="فیلتر بازه زمانی نمودار"
                className="inline-flex items-center p-1 bg-[#F4F4F9] rounded-full self-start sm:self-auto"
              >
                {(
                  [
                    { id: '24h', label: '۲۴ ساعت' },
                    { id: '7d', label: '۷ روز' },
                    { id: '30d', label: '۳۰ روز' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={timeRange === t.id}
                    onClick={() => {
                      setTimeRange(t.id);
                      setSelectedBucketIdx(t.id === '24h' ? 8 : t.id === '7d' ? 4 : 3);
                    }}
                    className={`relative px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap ${
                      timeRange === t.id ? 'text-white' : 'text-[#646476] hover:text-[#1C1C24]'
                    }`}
                  >
                    {timeRange === t.id && (
                      <motion.span
                        layoutId="chart-range-pill"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        className="absolute inset-0 rounded-full bg-[#7B70E8]"
                      />
                    )}
                    <span className="relative z-10">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Bar Chart */}
            <div
              className="grid gap-2 items-end h-36 pt-5"
              style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}
            >
              {buckets.map((bucket, idx) => {
                const total = bucket.inputTokens + bucket.outputTokens;
                const heightPct = Math.max(14, Math.round((total / maxBucketTotal) * 100));
                const outputPct = Math.round((bucket.outputTokens / Math.max(1, total)) * 100);
                const isSelected = idx === safeSelectedIdx;

                return (
                  <button
                    key={`${timeRange}-${bucket.label}`}
                    type="button"
                    onMouseEnter={() => setSelectedBucketIdx(idx)}
                    onClick={() => setSelectedBucketIdx(idx)}
                    aria-label={`بازه ${bucket.label} با مجموع ${formatTokenCount(total)} توکن`}
                    className="group h-full flex flex-col items-center justify-end gap-1.5 focus:outline-none"
                  >
                    <div className="w-full flex-1 flex flex-col items-center justify-end">
                      {isSelected && (
                        <motion.span
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-1 px-2 py-0.5 rounded-full bg-[#1E1E24] text-white text-[10px] font-bold tabular-nums whitespace-nowrap"
                        >
                          {formatTokenCount(total)}
                        </motion.span>
                      )}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPct}%` }}
                        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                        className={`w-full max-w-[30px] rounded-t-xl overflow-hidden flex flex-col justify-end transition-opacity ${
                          isSelected ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
                        }`}
                      >
                        <div
                          className={isSelected ? 'bg-[#7B70E8]' : 'bg-[#B9B2F4]'}
                          style={{ height: `${outputPct}%` }}
                        />
                        <div
                          className={isSelected ? 'bg-[#1E1E24]' : 'bg-[#E2E0F2]'}
                          style={{ height: `${100 - outputPct}%` }}
                        />
                      </motion.div>
                    </div>
                    <span
                      className={`text-[10px] tabular-nums ${
                        isSelected ? 'text-[#7B70E8] font-bold' : 'text-[#8E8EA0]'
                      }`}
                    >
                      {bucket.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Row 3: Interactive Top Consumers Deck (Clickable rows + 1-click Throttle) */}
      <section className="bg-[#F6F6FA] rounded-[26px] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-base font-bold text-[#1C1C24]">
            پرمصرف‌ترین کاربران و ردیاب گلوگاه سرور
          </h2>
          <button
            type="button"
            onClick={onNavigateUsers}
            className="text-xs font-semibold text-[#7B70E8] hover:text-[#5B4ED6] inline-flex items-center gap-1 self-start sm:self-auto"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>مشاهده همه کاربران</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {topConsumers.map((user) => {
            const eff = getUserEffectiveAccess(user, plans, models);
            const isThrottled = user.status === 'throttled';
            const isSuspended = user.status === 'suspended';

            return (
              <motion.div
                key={user.id}
                whileHover={{ x: -3 }}
                transition={{ duration: 0.15 }}
                className="bg-white rounded-[18px] px-4 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 shadow-[0_2px_10px_rgba(28,28,36,0.03)]"
              >
                {/* Clickable User Identity */}
                <button
                  type="button"
                  onClick={() => onViewUser(user.id)}
                  className="flex items-center gap-3 text-right min-w-[210px] group"
                >
                  <span className="w-9 h-9 rounded-full bg-[#EFEFFC] text-[#5B4ED6] text-xs font-bold flex items-center justify-center shrink-0 group-hover:bg-[#7B70E8] group-hover:text-white transition-colors">
                    {user.name.slice(0, 2)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#1C1C24] group-hover:text-[#7B70E8] transition-colors truncate">
                      {user.name}
                    </div>
                    <div className="text-xs text-[#8A8A9E] truncate">
                      {user.team} · {eff.plans.map((p) => p.name).join('، ') || 'بدون طرح'}
                    </div>
                  </div>
                </button>

                {/* Live Concurrency & Quota Bar */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <div className="flex items-center">
                    <SlotPipBar
                      active={user.activeConcurrency}
                      max={Math.max(1, eff.effectiveConcurrency)}
                      tone={isThrottled ? 'amber' : isSuspended ? 'rose' : 'iris'}
                      labelSuffix="اسلات"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] tabular-nums mb-1">
                      <span className="font-bold text-[#1C1C24]">
                        {formatTokenCount(user.tokensUsed)}
                      </span>
                      <span className="text-[#8A8A9E]">
                        {toPersianDigits(eff.usagePercent)}٪ از {formatTokenCount(eff.totalQuota)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full hatched-track overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${eff.usagePercent}%` }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className={`h-full rounded-full ${
                          eff.usagePercent >= 85
                            ? 'bg-[#E11D48]'
                            : eff.usagePercent >= 65
                              ? 'bg-[#D97706]'
                              : 'bg-[#7B70E8]'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="text-xs flex items-center gap-3 tabular-nums">
                    <span className="text-[#646476]">{formatNumberFa(user.requestsToday)} درخواست</span>
                    <span
                      className={`font-semibold ${
                        isSuspended
                          ? 'text-[#E11D48]'
                          : isThrottled
                            ? 'text-[#D97706]'
                            : 'text-[#16A34A]'
                      }`}
                    >
                      · {isSuspended ? 'مسدود' : isThrottled ? 'محدود شده' : 'فعال'}
                    </span>
                  </div>
                </div>

                {/* 1-Click Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onThrottleUser(user.id)}
                    disabled={isSuspended || (isThrottled && eff.effectiveConcurrency <= 1)}
                    aria-label={`محدودسازی سریع ${user.name}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-full bg-[#FFF7ED] text-[#C2410C] hover:bg-[#FFEDD5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>محدودسازی</span>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onViewUser(user.id)}
                    aria-label={`مشاهده کاربر ${user.name}`}
                    className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-full bg-[#F4F4F9] text-[#1C1C24] hover:bg-[#EAE9F6] transition-colors whitespace-nowrap"
                  >
                    <span>مشاهده</span>
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
