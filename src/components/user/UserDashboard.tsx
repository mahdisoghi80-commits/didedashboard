import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Clock,
  Copy,
  KeyRound,
  Lock,
  MessageSquare,
  Moon,
  Send,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  AccessPlan,
  GatewaySettings,
  LocalModel,
  OrgUser,
  ServerLoadLevel,
} from '../../types';
import { USER_PERSONAL_7D_USAGE } from '../../data/seedData';
import {
  formatNumberFa,
  formatTokenCount,
  getPriorityLabel,
  getQuotaPeriodLabel,
  getUserEffectiveAccess,
  tokensToApproximatePages,
  toPersianDigits,
} from '../../utils/logic';
import { RadialCapacityGauge } from '../RadialCapacityGauge';
import { SpeedSignalBars } from '../VisualPrimitives';

interface UserDashboardProps {
  user: OrgUser;
  plans: AccessPlan[];
  models: LocalModel[];
  settings: GatewaySettings;
  serverLoad: ServerLoadLevel;
  onCopyText: (text: string, label: string) => void;
  onStartChatWithModel: (modelId: string) => void;
  onNavigateKeys: () => void;
  onSubmitQuotaRequest: (reason: string) => void;
}

export function UserDashboard({
  user,
  plans,
  models,
  settings,
  serverLoad,
  onCopyText,
  onStartChatWithModel,
  onNavigateKeys,
  onSubmitQuotaRequest,
}: UserDashboardProps) {
  const [countdownSec, setCountdownSec] = useState(3 * 3600 + 24 * 60 + 18);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestReason, setRequestReason] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdownSec((prev) => (prev > 60 ? prev - 1 : 3 * 3600 + 24 * 60));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const hours = Math.floor(countdownSec / 3600);
  const minutes = Math.floor((countdownSec % 3600) / 60);
  const seconds = countdownSec % 60;

  const eff = getUserEffectiveAccess(user, plans, models);
  const maxPersonalDay = Math.max(...USER_PERSONAL_7D_USAGE.map((d) => d.tokens), 1);

  const concurrencyPct =
    eff.effectiveConcurrency > 0
      ? Math.round((user.activeConcurrency / eff.effectiveConcurrency) * 100)
      : 0;

  const trafficBanner: Record<
    ServerLoadLevel,
    { title: string; bars: number; latency: string; grad: string }
  > = {
    healthy: {
      title: 'سرور داخلی سریع و آماده پاسخ‌گویی است',
      bars: 4,
      latency: '۱۲۵ ms · بدون صف',
      grad: 'from-[#8B80F4] via-[#7B70E8] to-[#685CD8]',
    },
    moderate: {
      title: 'سرور داخلی در وضعیت پایدار است',
      bars: 3,
      latency: '۲۱۰ ms · صف کوتاه',
      grad: 'from-[#F59E0B] via-[#E58E09] to-[#D97706]',
    },
    heavy: {
      title: 'سرور داخلی زیر بار سنگین است',
      bars: 2,
      latency: '۴۶۰ ms · صف هوشمند فعال',
      grad: 'from-[#F43F5E] via-[#E11D48] to-[#BE123C]',
    },
  };

  const banner = trafficBanner[serverLoad];

  const handleCopyModel = (modelId: string) => {
    onCopyText(modelId, 'شناسه مدل');
    setCopiedId(modelId);
    setTimeout(() => setCopiedId((curr) => (curr === modelId ? null : curr)), 1600);
  };

  const handleSendQuotaRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestReason.trim()) return;
    onSubmitQuotaRequest(requestReason.trim());
    setRequestReason('');
    setRequestModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Suspended Alert */}
      {user.status === 'suspended' && (
        <div
          role="alert"
          className="p-4 rounded-[22px] bg-[#FFF1F2] flex items-start gap-3 text-sm text-[#9F1239]"
        >
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-[#E11D48]" />
          <div>
            <div className="font-bold">حساب کاربری شما موقتاً توسط ادمین تعلیق شده است</div>
            <p className="text-xs text-[#BE123C] mt-0.5">
              تمامی کلیدهای API شما در حال حاضر غیرفعال هستند. برای رفع محدودیت با مدیر زیرساخت تماس بگیرید.
            </p>
          </div>
        </div>
      )}

      {/* Signature Gradient Server Traffic Light Hero Banner */}
      <section
        aria-label="وضعیت زنده سرور داخلی"
        className={`rounded-[26px] bg-gradient-to-l ${banner.grad} text-white px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_14px_34px_-14px_rgba(123,112,232,0.55)]`}
      >
        <div className="flex items-center gap-3.5">
          <div className="flex items-end gap-1 h-7 px-2.5 py-1.5 rounded-2xl bg-white/15 shrink-0" aria-hidden="true">
            {[1, 2, 3, 4].map((b) => (
              <span
                key={b}
                style={{ height: `${b * 25}%` }}
                className={`w-1.5 rounded-full ${
                  b <= banner.bars ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
          <div>
            <div className="text-base font-bold">{banner.title}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/90 tabular-nums">
              <span className="px-2.5 py-0.5 rounded-full bg-white/18">{banner.latency}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/18">2× NVIDIA H200 · ۱۰۰٪ داخلی</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={onNavigateKeys}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-[#1C1C24] bg-white hover:bg-[#F5F4FD] rounded-full transition-colors whitespace-nowrap shadow-sm"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#7B70E8]" />
            <span>اتصال سریع به ابزارها</span>
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() =>
              eff.allowedModels[0] && onStartChatWithModel(eff.allowedModels[0].id)
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-white/18 hover:bg-white/25 rounded-full transition-colors whitespace-nowrap"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>شروع چت آزمایشی</span>
          </motion.button>
        </div>
      </section>

      {/* Personal Bento Row: Dual-Ring Quota Dial (4 cols) + Quota Details & 7d Usage (8 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Radial Personal Quota & Concurrency Dial */}
        <section className="xl:col-span-4 bg-[#F6F6FA] rounded-[26px] p-6 flex flex-col justify-between items-center">
          <div className="w-full flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1C1C24]">سهمیه و همزمانی زنده</h2>
            <span className="text-[11px] font-semibold text-[#7B70E8]">
              {getPriorityLabel(user.priorityTier)}
            </span>
          </div>

          <div className="my-3">
            <RadialCapacityGauge
              centerValue={`${toPersianDigits(100 - eff.usagePercent)}٪`}
              centerUnit="سهمیه باقی‌مانده"
              outerPercent={100 - eff.usagePercent}
              innerPercent={concurrencyPct}
              outerLabel={`سهمیه (${formatTokenCount(eff.remainingTokens)})`}
              innerLabel={`همزمانی (${toPersianDigits(user.activeConcurrency)}/${toPersianDigits(eff.effectiveConcurrency)})`}
            />
          </div>

          {/* Interactive Concurrency Slot Pills */}
          <div
            className={`w-full grid gap-2 ${
              eff.effectiveConcurrency <= 1
                ? 'grid-cols-1'
                : eff.effectiveConcurrency === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-3'
            }`}
          >
            {Array.from({ length: Math.max(1, eff.effectiveConcurrency) }).map((_, idx) => {
              const isActive = idx < user.activeConcurrency;
              return (
                <div
                  key={idx}
                  className={`rounded-full px-3 py-2 flex items-center justify-between text-[11px] font-semibold whitespace-nowrap ${
                    isActive
                      ? 'bg-[#1E1E24] text-white'
                      : 'bg-white text-[#7B7B8F]'
                  }`}
                >
                  <span>اسلات {toPersianDigits(idx + 1)}</span>
                  <span className={isActive ? 'text-[#A59CF7]' : 'text-[#9A9AAE]'}>
                    {isActive ? 'فعال' : 'آزاد'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quota Progress, Countdown & 7-Day Activity */}
        <section className="xl:col-span-8 bg-[#F6F6FA] rounded-[26px] p-6 flex flex-col justify-between gap-5">
          <div className="bg-white rounded-[22px] p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs text-[#8A8A9E]">
                  {user.name} · {user.team} · طرح {eff.plans.map((p) => p.name).join('، ') || 'بدون طرح'}
                </div>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-2 tabular-nums">
                  <span className="text-3xl font-bold text-[#1C1C24]">
                    {formatTokenCount(eff.remainingTokens)}
                  </span>
                  <span className="text-xs text-[#7B7B8F]">
                    توکن باقی‌مانده از سهمیه {getQuotaPeriodLabel(eff.quotaPeriod)} (
                    {formatTokenCount(eff.totalQuota)})
                  </span>
                </div>
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => setRequestModalOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-[#7B70E8] bg-[#F2F0FE] hover:bg-[#E7E3FD] rounded-full transition-colors whitespace-nowrap"
              >
                درخواست افزایش سهمیه
              </motion.button>
            </div>

            <div className="h-3.5 w-full rounded-full hatched-track overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${eff.usagePercent}%` }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className={`h-full rounded-full ${
                  eff.usagePercent >= 85
                    ? 'bg-[#E11D48]'
                    : eff.usagePercent >= 65
                      ? 'bg-[#D97706]'
                      : 'bg-[#7B70E8]'
                }`}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6C6C80]">
              <span>
                معادل حدود{' '}
                <strong className="text-[#1C1C24] tabular-nums">
                  {formatNumberFa(tokensToApproximatePages(eff.remainingTokens))} صفحه
                </strong>{' '}
                متن یا کد
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#1C1C24] font-semibold tabular-nums">
                <Clock className="w-3.5 h-3.5 text-[#7B70E8]" />
                <span>
                  بازنشانی تا {toPersianDigits(hours)}:{toPersianDigits(String(minutes).padStart(2, '0'))}:
                  {toPersianDigits(String(seconds).padStart(2, '0'))} دیگر
                </span>
              </span>
            </div>
          </div>

          {/* 7-Day Personal Usage Chart + Off-Peak Banner */}
          <div className="bg-white rounded-[22px] p-5 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
            <div className="space-y-2 sm:max-w-[240px]">
              <div className="text-sm font-bold text-[#1C1C24]">مصرف شخصی ۷ روز اخیر</div>
              <p className="text-xs text-[#7B7B8F] leading-relaxed">
                مصرف امروز شما{' '}
                <strong className="text-[#1C1C24] tabular-nums">
                  {formatTokenCount(user.tokensUsed)} توکن
                </strong>{' '}
                بوده است.
              </p>
              {eff.offPeakUnlimited && (
                <div className="pt-1 text-xs font-semibold text-[#16A34A] inline-flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    ساعت طلایی ({settings.offPeakStart} تا {settings.offPeakEnd}) آزاد است
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 grid grid-cols-7 gap-2 items-end h-24">
              {USER_PERSONAL_7D_USAGE.map((item, idx) => {
                const h = Math.max(20, Math.round((item.tokens / maxPersonalDay) * 100));
                const isToday = idx === USER_PERSONAL_7D_USAGE.length - 1;
                const shortDay =
                  item.day === 'امروز'
                    ? 'امروز'
                    : item.day === 'یک‌شنبه'
                      ? '۱ش'
                      : item.day === 'دوشنبه'
                        ? '۲ش'
                        : item.day === 'سه‌شنبه'
                          ? '۳ش'
                          : item.day === 'چهارشنبه'
                            ? '۴ش'
                            : item.day === 'پنج‌شنبه'
                              ? '۵ش'
                              : 'شنبه';

                return (
                  <div key={item.day} className="h-full flex flex-col items-center justify-end gap-1.5">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.45, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                      className={`w-full max-w-[26px] rounded-t-xl ${
                        isToday ? 'bg-[#7B70E8]' : 'bg-[#E5E3F6]'
                      }`}
                      title={`${item.day}: ${formatTokenCount(item.tokens)}`}
                    />
                    <span
                      className={`text-[10px] tabular-nums ${
                        isToday ? 'text-[#7B70E8] font-bold' : 'text-[#8E8EA0]'
                      }`}
                    >
                      {shortDay}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Human-Friendly Model Catalog (No rounded-square icons!) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <h2 className="text-lg font-bold text-[#1C1C24]">
            کاتالوگ مدل‌های مجاز ({toPersianDigits(eff.allowedModels.length)})
          </h2>
          <span className="text-xs font-semibold text-[#16A34A] inline-flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>۱۰۰٪ داخلی و محرمانه</span>
          </span>
        </div>

        {eff.allowedModels.length === 0 ? (
          <div className="bg-[#F6F6FA] rounded-[24px] p-10 text-center">
            <p className="text-sm font-bold text-[#1C1C24]">
              در حال حاضر هیچ مدل فعالی در طرح دسترسی شما وجود ندارد
            </p>
            <p className="text-xs text-[#7B7B8F] mt-1">
              لطفاً با مدیر IT سازمان تماس بگیرید یا درخواست دسترسی ثبت کنید.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {eff.allowedModels.map((mdl, idx) => (
              <motion.article
                key={mdl.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.28 }}
                whileHover={{ y: -4 }}
                className="bg-[#F6F6FA] rounded-[24px] p-5 flex flex-col justify-between gap-4 transition-shadow hover:shadow-[0_14px_34px_-16px_rgba(28,28,36,0.16)]"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-[#1C1C24] leading-snug">
                        {mdl.displayName}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="px-2.5 py-0.5 rounded-full bg-white font-semibold text-[#1C1C24]">
                          {mdl.bestFor}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-white text-[#646476] tabular-nums">
                          {mdl.contextWindow}
                        </span>
                      </div>
                    </div>
                    <SpeedSignalBars tps={mdl.tpsAvg} compact />
                  </div>

                  <p className="text-xs text-[#6C6C80] leading-relaxed">{mdl.description}</p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 bg-white rounded-full px-3.5 py-2">
                    <span
                      dir="ltr"
                      className="font-mono text-[11px] text-[#525264] truncate text-left"
                    >
                      {mdl.modelId}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyModel(mdl.modelId)}
                      aria-label={`کپی شناسه مدل ${mdl.displayName}`}
                      className="text-xs font-semibold text-[#7B70E8] hover:text-[#5B4ED6] inline-flex items-center gap-1 shrink-0"
                    >
                      {copiedId === mdl.modelId ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                          <span className="text-[#16A34A]">کپی شد</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>کپی</span>
                        </>
                      )}
                    </button>
                  </div>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onStartChatWithModel(mdl.id)}
                    className="w-full py-2.5 px-4 text-xs font-bold text-white bg-[#1E1E24] hover:bg-[#7B70E8] rounded-full inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>آزمایش مستقیم در چت سریع</span>
                  </motion.button>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </section>

      {/* Quota Increase Request Modal */}
      <AnimatePresence>
        {requestModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1C24]/35 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              role="dialog"
              aria-modal="true"
              aria-label="درخواست افزایش سهمیه"
              className="w-full max-w-md bg-white rounded-[26px] shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-[#F0F0F6] flex items-center justify-between">
                <h2 className="text-base font-bold text-[#1C1C24]">درخواست افزایش سهمیه یا مدل جدید</h2>
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(false)}
                  aria-label="بستن پنجره درخواست سهمیه"
                  className="w-7 h-7 rounded-full bg-[#F4F4F8] text-[#646476] hover:text-[#1C1C24] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSendQuotaRequest} className="p-6 space-y-4">
                <div>
                  <label htmlFor="quota-req-reason" className="block text-xs font-semibold text-[#525264] mb-1.5">
                    دلیل نیاز به سهمیه بیشتر (یک خط توضیح کوتاه)
                  </label>
                  <textarea
                    id="quota-req-reason"
                    rows={3}
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder="مثلاً: در حال بازنویسی ماژول پرداخت تا پایان این هفته هستم و به سهمیه بیشتر نیاز دارم."
                    className="w-full px-4 py-3 text-sm bg-[#F6F6FA] rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B70E8]/30"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRequestModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#646476] rounded-full"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={!requestReason.trim()}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-[#7B70E8] hover:bg-[#695DE0] disabled:opacity-50 rounded-full transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ارسال درخواست به ادمین</span>
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
