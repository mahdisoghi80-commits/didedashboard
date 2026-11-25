import { motion } from 'motion/react';

interface RadialCapacityGaugeProps {
  centerValue: string;
  centerUnit: string;
  outerPercent: number; // 0-100 (Iris accent ring)
  innerPercent: number; // 0-100 (Charcoal ink ring)
  outerLabel: string;
  innerLabel: string;
  outerColor?: string;
}

/**
 * Dual-ring segmented circular telemetry gauge inspired by the attached Dropify
 * Speed Statistic dial, with smooth spring fill animations.
 */
export function RadialCapacityGauge({
  centerValue,
  centerUnit,
  outerPercent,
  innerPercent,
  outerLabel,
  innerLabel,
  outerColor = '#7B70E8',
}: RadialCapacityGaugeProps) {
  const segments = 32;
  const cx = 110;
  const cy = 110;
  const outerR = 88;
  const innerR = 68;

  const activeOuter = Math.round((Math.min(100, Math.max(0, outerPercent)) / 100) * segments);
  const activeInner = Math.round((Math.min(100, Math.max(0, innerPercent)) / 100) * segments);

  return (
    <div className="flex flex-col items-center">
      {/* Legend */}
      <div className="flex items-center justify-center gap-5 text-[11px] text-[#646476] mb-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1E1E24] inline-block" />
          <span>{innerLabel}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: outerColor }}
          />
          <span>{outerLabel}</span>
        </span>
      </div>

      {/* Dual-ring SVG Gauge */}
      <div className="relative w-[204px] h-[204px] flex items-center justify-center">
        <svg viewBox="0 0 220 220" className="w-full h-full -rotate-90" aria-hidden="true">
          {Array.from({ length: segments }).map((_, i) => {
            const angle = (i / segments) * 360;
            const rad = (angle * Math.PI) / 180;

            const ox = cx + outerR * Math.cos(rad);
            const oy = cy + outerR * Math.sin(rad);
            const ix = cx + innerR * Math.cos(rad);
            const iy = cy + innerR * Math.sin(rad);

            const isOuterActive = i < activeOuter;
            const isInnerActive = i < activeInner;

            return (
              <g key={i}>
                {/* Outer segment pill */}
                <motion.rect
                  x={ox - 5}
                  y={oy - 3}
                  width={10}
                  height={6}
                  rx={2.5}
                  transform={`rotate(${angle}, ${ox}, ${oy})`}
                  initial={{ opacity: 0.25, fill: '#E7E7EE' }}
                  animate={{
                    opacity: 1,
                    fill: isOuterActive ? outerColor : '#E7E7EE',
                  }}
                  transition={{
                    duration: 0.28,
                    delay: i * 0.012,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />
                {/* Inner segment pill */}
                <motion.rect
                  x={ix - 4.5}
                  y={iy - 2.6}
                  width={9}
                  height={5.2}
                  rx={2}
                  transform={`rotate(${angle}, ${ix}, ${iy})`}
                  initial={{ opacity: 0.25, fill: '#ECECF2' }}
                  animate={{
                    opacity: 1,
                    fill: isInnerActive ? '#1E1E24' : '#ECECF2',
                  }}
                  transition={{
                    duration: 0.28,
                    delay: i * 0.012 + 0.06,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />
              </g>
            );
          })}
        </svg>

        {/* Center Readout */}
        <motion.div
          key={centerValue}
          initial={{ scale: 0.92, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none"
        >
          <span className="text-[32px] font-bold text-[#1C1C24] tabular-nums leading-none tracking-tight">
            {centerValue}
          </span>
          <span className="text-[11px] font-medium text-[#7B7B8F] mt-1.5">{centerUnit}</span>
        </motion.div>
      </div>
    </div>
  );
}
