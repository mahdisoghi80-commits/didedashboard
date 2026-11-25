import React from 'react';
import { formatTokenCount, toPersianDigits } from '../utils/logic';

/**
 * Visual segmented slot meter replacing text like "همزمانی: ۲ از ۳ اسلات"
 */
export const SlotPipBar: React.FC<{
  active: number;
  max: number;
  size?: 'xs' | 'sm' | 'md';
  tone?: 'iris' | 'dark' | 'emerald' | 'amber' | 'rose';
  dark?: boolean;
  showLabel?: boolean;
  labelSuffix?: string;
  className?: string;
}> = ({
  active,
  max,
  size = 'sm',
  tone = 'iris',
  dark = false,
  showLabel = true,
  labelSuffix = '',
  className = '',
}) => {
  const safeMax = Math.max(1, Math.min(max, 20));
  const safeActive = Math.max(0, Math.min(active, safeMax));

  const activeColor =
    tone === 'rose'
      ? 'bg-rose-500'
      : tone === 'amber'
        ? 'bg-amber-500'
        : tone === 'emerald'
          ? 'bg-emerald-500'
          : tone === 'dark'
            ? 'bg-[#1E1E24]'
            : dark
              ? 'bg-[#9E95F5]'
              : 'bg-[#7B70E8]';

  const pipSize =
    size === 'xs'
      ? 'h-2 w-1.5 rounded-full'
      : size === 'md'
        ? 'h-3.5 w-2 rounded-full'
        : 'h-2.5 w-1.5 rounded-full';

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      title={`${toPersianDigits(active)} از ${toPersianDigits(max)} اسلات فعال`}
    >
      <div className="inline-flex items-center gap-[3px]" dir="ltr">
        {Array.from({ length: safeMax }).map((_, i) => {
          const isLit = i < safeActive;
          return (
            <span
              key={i}
              className={`${pipSize} transition-all duration-300 ${
                isLit ? activeColor : dark ? 'bg-white/20' : 'bg-[#E2E2EC]'
              }`}
            />
          );
        })}
      </div>
      {showLabel && (
        <span
          className={`text-[11px] font-bold tabular-nums whitespace-nowrap ${
            dark ? 'text-white/80' : 'text-[#4E4E5E]'
          }`}
        >
          {toPersianDigits(active)}/{toPersianDigits(max)}
          {labelSuffix ? ` ${labelSuffix}` : ''}
        </span>
      )}
    </div>
  );
};

/**
 * Dual-segment proportional bar for Input vs Output token ratios
 */
export const SplitRatioBar: React.FC<{
  input: number;
  output: number;
  compact?: boolean;
  className?: string;
}> = ({ input, output, compact = false, className = '' }) => {
  const total = Math.max(1, input + output);
  const inputPct = Math.round((input / total) * 100);
  const outputPct = Math.max(0, 100 - inputPct);

  return (
    <div className={`w-full ${className}`}>
      <div
        className={`w-full ${compact ? 'h-1.5' : 'h-2'} rounded-full bg-[#ECECF4] overflow-hidden flex gap-[2px]`}
        dir="ltr"
      >
        <div
          className="h-full bg-[#7B70E8] rounded-l-full transition-all duration-500"
          style={{ width: `${inputPct}%` }}
          title={`ورودی: ${formatTokenCount(input)} (${toPersianDigits(inputPct)}٪)`}
        />
        <div
          className="h-full bg-[#1C1C24] rounded-r-full transition-all duration-500"
          style={{ width: `${outputPct}%` }}
          title={`خروجی: ${formatTokenCount(output)} (${toPersianDigits(outputPct)}٪)`}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[10.5px] font-semibold tabular-nums text-[#6E6E80]">
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7B70E8]" />
          {compact ? 'ورودی' : 'ورودی'} {formatTokenCount(input)}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1C1C24]" />
          {compact ? 'خروجی' : 'خروجی'} {formatTokenCount(output)}
        </span>
      </div>
    </div>
  );
};

/**
 * 4-bar rising throughput/latency signal visualizer
 */
export const SpeedSignalBars: React.FC<{
  tps?: number;
  ttftMs?: number;
  compact?: boolean;
  className?: string;
}> = ({ tps, ttftMs, compact = false, className = '' }) => {
  // Compute strength 1..4 based on tps (higher better) or ttftMs (lower better)
  let level = 3;
  if (typeof tps === 'number' && tps > 0) {
    if (tps >= 75) level = 4;
    else if (tps >= 50) level = 3;
    else if (tps >= 30) level = 2;
    else level = 1;
  } else if (typeof ttftMs === 'number') {
    if (ttftMs <= 120) level = 4;
    else if (ttftMs <= 200) level = 3;
    else if (ttftMs <= 350) level = 2;
    else level = 1;
  } else {
    level = 0;
  }

  const activeColor =
    level >= 4
      ? 'bg-emerald-500'
      : level === 3
        ? 'bg-[#7B70E8]'
        : level === 2
          ? 'bg-amber-500'
          : 'bg-rose-500';

  const heights = compact ? ['h-1.5', 'h-2', 'h-2.5', 'h-3'] : ['h-2', 'h-2.5', 'h-3.5', 'h-4'];

  return (
    <div className={`inline-flex items-end gap-2 ${className}`}>
      <div className="inline-flex items-end gap-[2.5px] pb-0.5" dir="ltr">
        {heights.map((h, i) => (
          <span
            key={i}
            className={`w-[3px] ${h} rounded-full transition-colors ${
              i < level ? activeColor : 'bg-[#E2E2EC]'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] font-bold tabular-nums text-[#2A2A35]">
        {typeof tps === 'number' && tps > 0 && (
          <span>
            {toPersianDigits(tps)} <span className="font-mono text-[10px] text-[#8E8EA0]">tok/s</span>
          </span>
        )}
        {typeof tps === 'number' && tps > 0 && typeof ttftMs === 'number' && (
          <span className="text-[#D4D4E0]">·</span>
        )}
        {typeof ttftMs === 'number' && (
          <span className="font-mono text-[11px] text-[#646476]">
            {toPersianDigits(ttftMs)}ms
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Multi-model proportional GPU VRAM segment bar
 */
export interface VramSegmentItem {
  id: string;
  label: string;
  gb: number;
  color: string;
}

export const VramSegmentBar: React.FC<{
  segments: VramSegmentItem[];
  totalGb: number;
  usedGb: number;
  className?: string;
}> = ({ segments, totalGb, usedGb, className = '' }) => {
  const safeTotal = Math.max(1, totalGb);
  const freeGb = Math.max(0, safeTotal - usedGb);
  const usedPct = Math.min(100, Math.round((usedGb / safeTotal) * 100));

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between text-[11px] font-bold tabular-nums mb-2">
        <span className="text-[#1C1C24]">
          حافظه GPU · {toPersianDigits(usedGb)} / {toPersianDigits(totalGb)} GB
        </span>
        <span className="text-[#7B70E8]">{toPersianDigits(usedPct)}٪ اشغال</span>
      </div>
      <div
        className="w-full h-3 rounded-full bg-[#ECECF4] p-0.5 flex gap-[3px] overflow-hidden"
        dir="ltr"
      >
        {segments.map((seg) => {
          const pct = Math.max(4, Math.round((seg.gb / safeTotal) * 100));
          return (
            <div
              key={seg.id}
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: seg.color }}
              title={`${seg.label}: ${toPersianDigits(seg.gb)} GB`}
            />
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[10.5px] font-semibold text-[#646476]">
        {segments.map((seg) => (
          <span key={seg.id} className="inline-flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="truncate max-w-[140px]">{seg.label}</span>
            <span className="font-mono text-[10px] text-[#8E8EA0] tabular-nums">
              {toPersianDigits(seg.gb)}G
            </span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-[#8E8EA0]">
          <span className="w-2 h-2 rounded-full bg-[#DDDDE8] shrink-0" />
          آزاد {toPersianDigits(freeGb)}G
        </span>
      </div>
    </div>
  );
};

/**
 * Compact visual pattern signature for Guardrail categories
 */
export const PatternPreviewChip: React.FC<{
  category: 'pii' | 'secrets' | 'injection' | 'loop_breaker' | 'confidential';
}> = ({ category }) => {
  switch (category) {
    case 'pii':
      return (
        <div
          dir="ltr"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-[11px] font-mono text-[#3A3A48] shadow-[0_1px_2px_rgba(28,28,36,0.04)]"
        >
          <span className="text-[#8E8EA0]">6037</span>
          <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-600 font-bold tracking-widest">
            ••••
          </span>
          <span className="text-[#8E8EA0]">8890</span>
          <span className="text-[#D4D4E0]">|</span>
          <span className="text-[#7B70E8]">ID:001••••</span>
        </div>
      );
    case 'secrets':
      return (
        <div
          dir="ltr"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-[11px] font-mono text-[#3A3A48] shadow-[0_1px_2px_rgba(28,28,36,0.04)]"
        >
          <span className="text-amber-600 font-bold">sk-</span>
          <span className="px-1.5 rounded bg-amber-50 text-amber-700 tracking-widest">••••••</span>
          <span className="text-[#D4D4E0]">|</span>
          <span className="text-[#7B70E8] font-bold">.env</span>
        </div>
      );
    case 'loop_breaker':
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-[11px] font-bold text-[#3A3A48] shadow-[0_1px_2px_rgba(28,28,36,0.04)]">
          <span className="font-mono text-[#7B70E8]">6× ↻</span>
          <span className="text-[#D4D4E0]">→</span>
          <span className="text-rose-600">قطع خودکار</span>
        </div>
      );
    case 'injection':
      return (
        <div
          dir="ltr"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-[11px] font-mono text-[#3A3A48] shadow-[0_1px_2px_rgba(28,28,36,0.04)]"
        >
          <span className="line-through text-rose-500">ignore_sys</span>
          <span className="text-[#D4D4E0]">|</span>
          <span className="text-[#7B70E8] font-bold">RAG Shield</span>
        </div>
      );
    case 'confidential':
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-[11px] font-bold text-[#3A3A48] shadow-[0_1px_2px_rgba(28,28,36,0.04)]">
          <span className="text-emerald-600">۱۰۰٪ داخلی</span>
          <span className="text-[#D4D4E0]">·</span>
          <span className="text-[#646476]">اسناد مالی و حقوقی</span>
        </div>
      );
  }
};

/**
 * 7-bar micro activity sparkline
 */
export const MiniSparkBars: React.FC<{
  values: number[];
  color?: string;
  className?: string;
}> = ({ values, color = '#7B70E8', className = '' }) => {
  const maxVal = Math.max(1, ...values);
  return (
    <div className={`inline-flex items-end gap-[3px] h-5 ${className}`} dir="ltr">
      {values.map((v, i) => {
        const pct = Math.max(18, Math.round((v / maxVal) * 100));
        const isLast = i === values.length - 1;
        return (
          <span
            key={i}
            className="w-1 rounded-full transition-all duration-300"
            style={{
              height: `${pct}%`,
              backgroundColor: isLast ? color : '#D6D4EC',
            }}
          />
        );
      })}
    </div>
  );
};
