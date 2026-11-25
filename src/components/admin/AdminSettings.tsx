import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  Globe,
  Inbox,
  Moon,
  RefreshCw,
  Save,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { GatewaySettings, QuotaRequest } from '../../types';
import { toPersianDigits } from '../../utils/logic';

interface AdminSettingsProps {
  settings: GatewaySettings;
  quotaRequests: QuotaRequest[];
  onSaveSettings: (next: GatewaySettings) => void;
  onApproveQuotaRequest: (reqId: string) => void;
}

const TIMEOUT_PRESETS = [
  { sec: 30, label: '۳۰ ثانیه', hint: 'پاسخ سریع چت' },
  { sec: 60, label: '۶۰ ثانیه', hint: 'استاندارد' },
  { sec: 90, label: '۹۰ ثانیه', hint: 'پیشنهادی کدنویسی' },
  { sec: 180, label: '۱۸۰ ثانیه', hint: 'استدلال طولانی' },
];

const RETRY_PRESETS = [0, 1, 2, 3];

const OFFPEAK_WINDOWS = [
  { start: '22:00', end: '07:00', label: '۲۲:۰۰ تا ۰۷:۰۰', hint: 'پیش‌فرض اداری' },
  { start: '23:00', end: '06:00', label: '۲۳:۰۰ تا ۰۶:۰۰', hint: 'بازه شبانه کوتاه' },
  { start: '20:00', end: '08:00', label: '۲۰:۰۰ تا ۰۸:۰۰', hint: 'توسعه شبانه R&D' },
];

export function AdminSettings({
  settings,
  quotaRequests,
  onSaveSettings,
  onApproveQuotaRequest,
}: AdminSettingsProps) {
  const [draft, setDraft] = useState<GatewaySettings>(settings);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...draft,
      orgName: draft.orgName.trim() || settings.orgName,
      gatewayBaseUrl: draft.gatewayBaseUrl.trim() || settings.gatewayBaseUrl,
    });
  };

  return (
    <div className="space-y-5">
      {/* Pending Quota Requests Inbox (User -> Admin loop) */}
      <AnimatePresence>
        {quotaRequests.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-[#F3F1FE] rounded-[26px] p-5 space-y-3 ring-1.5 ring-[#7B70E8]/30"
          >
            <div className="flex items-center gap-2.5 text-sm font-bold text-[#1C1C24]">
              <span className="w-8 h-8 rounded-full bg-[#7B70E8] text-white flex items-center justify-center shrink-0">
                <Inbox className="w-4 h-4" />
              </span>
              <span>
                درخواست‌های افزایش سهمیه کارمندان ({toPersianDigits(quotaRequests.length)})
              </span>
            </div>
            <div className="space-y-2.5">
              {quotaRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-[18px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-[#1C1C24]">{req.userName}</span>
                    <span className="text-[#8E8EA0] mx-2">· {req.createdAt}</span>
                    <p className="text-[#525264] mt-1">{req.reason}</p>
                  </div>
                  {req.status === 'approved' ? (
                    <span className="text-[#059669] font-semibold inline-flex items-center gap-1 shrink-0">
                      <Check className="w-3.5 h-3.5" />
                      تایید و اعمال شد (+۲M توکن)
                    </span>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      onClick={() => onApproveQuotaRequest(req.id)}
                      className="px-4 py-2 font-semibold text-white bg-[#7B70E8] hover:bg-[#6B5FE0] rounded-full transition-colors whitespace-nowrap shrink-0"
                    >
                      تایید فوری (+۲M توکن)
                    </motion.button>
                  )}
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Core Gateway Card */}
        <section className="xl:col-span-5 bg-[#F6F6FA] rounded-[26px] p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#1E1E24] text-white flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-[#1C1C24]">آدرس درگاه و هویت سازمان</h2>
          </div>

          <div className="bg-white rounded-[22px] p-5 space-y-4">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="gateway-url-input"
                  className="block text-xs font-semibold text-[#525264] mb-1.5"
                >
                  آدرس پایه API Gateway سازمان
                </label>
                <input
                  id="gateway-url-input"
                  type="url"
                  dir="ltr"
                  value={draft.gatewayBaseUrl}
                  onChange={(e) => setDraft({ ...draft, gatewayBaseUrl: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm font-mono text-left bg-[#F6F6FA] rounded-[16px] text-[#1C1C24] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B70E8]/35"
                />
              </div>

              <div>
                <label
                  htmlFor="org-name-input"
                  className="block text-xs font-semibold text-[#525264] mb-1.5"
                >
                  نام سازمان (برندینگ داخلی پنل)
                </label>
                <input
                  id="org-name-input"
                  type="text"
                  value={draft.orgName}
                  onChange={(e) => setDraft({ ...draft, orgName: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-[#F6F6FA] rounded-[16px] text-[#1C1C24] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B70E8]/35"
                />
              </div>
            </div>

            {/* Live Dark Branding Preview */}
            <div className="p-4 rounded-[20px] bg-gradient-to-l from-[#1E1E24] to-[#2B2938] text-white flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#7B70E8] text-white flex items-center justify-center shrink-0 shadow-[0_6px_16px_-4px_rgba(123,112,232,0.5)]">
                  <Cpu className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">
                    {draft.orgName || 'نام سازمان'}
                  </div>
                  <div dir="ltr" className="font-mono text-xs text-[#C7C1FF] text-right truncate">
                    {draft.gatewayBaseUrl}
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-white/90 bg-white/12 px-3 py-1 rounded-full whitespace-nowrap shrink-0">
                زنده
              </span>
            </div>
          </div>
        </section>

        {/* Governance & Safe Defaults */}
        <section className="xl:col-span-7 bg-[#F6F6FA] rounded-[26px] p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#7B70E8] text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-[#1C1C24]">سیاست ثبت‌نام و حریم خصوصی</h2>
          </div>

          <div className="bg-white rounded-[22px] p-5 space-y-5">
            {/* Animated Spring Switch Tile for Sign-Up */}
            <button
              type="button"
              role="switch"
              aria-checked={draft.allowPublicSignup}
              onClick={() =>
                setDraft({ ...draft, allowPublicSignup: !draft.allowPublicSignup })
              }
              className={`w-full text-right p-4 rounded-[20px] flex items-center justify-between gap-4 transition-all ${
                draft.allowPublicSignup
                  ? 'bg-[#F3F1FE] ring-1.5 ring-[#7B70E8]/40'
                  : 'bg-[#F6F6FA] hover:bg-[#EFEFF6]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    draft.allowPublicSignup
                      ? 'bg-[#7B70E8] text-white'
                      : 'bg-[#1E1E24] text-white'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-sm font-bold text-[#1C1C24]">
                    ثبت‌نام آزاد با ایمیل سازمانی (Sign-up Toggle)
                  </div>
                  <div className="text-xs text-[#646476] mt-0.5">
                    پیشنهاد امن سازمانی: غیرفعال باشد تا فقط ادمین کاربران جدید را اضافه کند.
                  </div>
                </div>
              </div>
              <span
                className={`w-12 h-6.5 rounded-full p-0.5 flex items-center transition-colors shrink-0 ${
                  draft.allowPublicSignup ? 'bg-[#7B70E8] justify-start' : 'bg-[#D5D5E2] justify-end'
                }`}
              >
                <motion.span
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  className="w-5.5 h-5.5 rounded-full bg-white shadow-sm"
                />
              </span>
            </button>

            {/* Privacy Log Mode Visual Tiles */}
            <div className="pt-2">
              <div className="text-xs font-bold text-[#1C1C24] mb-2.5">
                سیاست ثبت لاگ (شفافیت برای کارمندان)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setDraft({ ...draft, privacyLogMode: 'metrics_only' })}
                  className={`text-right p-4 rounded-[20px] transition-all flex items-start gap-3 ${
                    draft.privacyLogMode === 'metrics_only'
                      ? 'bg-[#F3F1FE] ring-2 ring-[#7B70E8]'
                      : 'bg-[#F6F6FA] hover:bg-[#EFEFF6]'
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      draft.privacyLogMode === 'metrics_only'
                        ? 'bg-[#7B70E8] text-white'
                        : 'bg-[#1E1E24] text-white'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="text-xs font-bold text-[#1C1C24]">
                      فقط آمار عددی توکن‌ها (پیشنهادی)
                    </div>
                    <div className="text-[11px] text-[#646476] mt-1 leading-relaxed">
                      متن پیام‌های کارمندان ذخیره نمی‌شود؛ فقط تعداد توکن و زمان پاسخ ثبت می‌گردد.
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setDraft({ ...draft, privacyLogMode: 'full_audit' })}
                  className={`text-right p-4 rounded-[20px] transition-all flex items-start gap-3 ${
                    draft.privacyLogMode === 'full_audit'
                      ? 'bg-[#F3F1FE] ring-2 ring-[#7B70E8]'
                      : 'bg-[#F6F6FA] hover:bg-[#EFEFF6]'
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      draft.privacyLogMode === 'full_audit'
                        ? 'bg-[#7B70E8] text-white'
                        : 'bg-[#1E1E24] text-white'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="text-xs font-bold text-[#1C1C24]">
                      ممیزی کامل امنیتی (نگهداری ۳۰ روزه)
                    </div>
                    <div className="text-[11px] text-[#646476] mt-1 leading-relaxed">
                      لاگ کامل درخواست‌ها برای واحد حراست ذخیره و اعلان شفافیت در پنل کاربر نمایش داده می‌شود.
                    </div>
                  </div>
                </motion.button>
              </div>
            </div>

            {/* Progressive Disclosure: Tactile Advanced Proxy Presets */}
            <div className="pt-4 border-t border-[#F0F0F6]">
              <button
                type="button"
                onClick={() => setAdvancedOpen((v) => !v)}
                aria-expanded={advancedOpen}
                className="flex items-center justify-between w-full text-xs font-bold text-[#525264] hover:text-[#1C1C24] py-1"
              >
                <span>تنظیمات پیشرفته پروکسی، Timeout و ساعات خلوت</span>
                {advancedOpen ? (
                  <ChevronUp className="w-4 h-4 text-[#7B70E8]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#8E8EA0]" />
                )}
              </button>

              <AnimatePresence>
                {advancedOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 space-y-4 pt-1">
                      {/* Timeout Preset Tiles */}
                      <div className="bg-[#F6F6FA] rounded-[20px] p-4 space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#1C1C24]">
                          <Clock className="w-3.5 h-3.5 text-[#7B70E8]" />
                          <span>حداکثر زمان انتظار پاسخ (Request Timeout)</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {TIMEOUT_PRESETS.map((t) => {
                            const active = draft.requestTimeoutSec === t.sec;
                            return (
                              <button
                                key={t.sec}
                                type="button"
                                onClick={() => setDraft({ ...draft, requestTimeoutSec: t.sec })}
                                className={`p-3 rounded-[16px] text-right transition-all ${
                                  active
                                    ? 'bg-white ring-2 ring-[#7B70E8]'
                                    : 'bg-white/65 hover:bg-white'
                                }`}
                              >
                                <div className="text-xs font-bold text-[#1C1C24] tabular-nums">
                                  {t.label}
                                </div>
                                <div className="text-[10.5px] text-[#8E8EA0] mt-0.5">{t.hint}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Retries Tiles */}
                        <div className="bg-[#F6F6FA] rounded-[20px] p-4 space-y-2.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#1C1C24]">
                            <RefreshCw className="w-3.5 h-3.5 text-[#7B70E8]" />
                            <span>تلاش مجدد خودکار (Upstream Retries)</span>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {RETRY_PRESETS.map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setDraft({ ...draft, upstreamRetries: r })}
                                className={`py-2.5 rounded-full text-xs font-bold tabular-nums transition-colors ${
                                  draft.upstreamRetries === r
                                    ? 'bg-[#1E1E24] text-white'
                                    : 'bg-white text-[#525264] hover:text-[#1C1C24]'
                                }`}
                              >
                                {toPersianDigits(r)} بار
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Off-Peak Window Tiles */}
                        <div className="bg-[#F6F6FA] rounded-[20px] p-4 space-y-2.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#1C1C24]">
                            <Moon className="w-3.5 h-3.5 text-[#7B70E8]" />
                            <span>بازه ساعات خلوت (Off-Peak)</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {OFFPEAK_WINDOWS.map((win) => {
                              const active =
                                draft.offPeakStart === win.start && draft.offPeakEnd === win.end;
                              return (
                                <button
                                  key={win.label}
                                  type="button"
                                  onClick={() =>
                                    setDraft({
                                      ...draft,
                                      offPeakStart: win.start,
                                      offPeakEnd: win.end,
                                    })
                                  }
                                  className={`p-2 rounded-[14px] text-center transition-all ${
                                    active
                                      ? 'bg-[#7B70E8] text-white'
                                      : 'bg-white text-[#525264] hover:text-[#1C1C24]'
                                  }`}
                                >
                                  <div className="text-[11px] font-bold tabular-nums">
                                    {win.label}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>
        </div>

        <div className="flex justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#7B70E8] hover:bg-[#6B5FE0] rounded-full transition-colors shadow-[0_10px_24px_-8px_rgba(123,112,232,0.6)]"
          >
            <Save className="w-4 h-4" />
            <span>ذخیره تنظیمات درگاه</span>
          </motion.button>
        </div>
      </form>
    </div>
  );
}
