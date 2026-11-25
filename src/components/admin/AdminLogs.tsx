import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  Database,
  Eye,
  GitBranch,
  Play,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { AuditLogEntry, RequestLogEntry, RequestLogStatus } from '../../types';
import { filterRequestLogs, formatNumberFa, toPersianDigits } from '../../utils/logic';
import { SpeedSignalBars, SplitRatioBar } from '../VisualPrimitives';

interface AdminLogsProps {
  requestLogs: RequestLogEntry[];
  auditLogs: AuditLogEntry[];
  onSimulateLiveRequest: () => void;
}

const STATUS_META: Record<
  RequestLogStatus,
  { label: string; codeLabel: string; accentBar: string; text: string }
> = {
  success: {
    label: 'پاسخ موفق',
    codeLabel: 'HTTP 200',
    accentBar: 'border-[#10B981]',
    text: 'text-[#059669]',
  },
  fallback: {
    label: 'انتقال Fallback',
    codeLabel: '200 · FALLBACK',
    accentBar: 'border-[#7B70E8]',
    text: 'text-[#7B70E8]',
  },
  throttled: {
    label: 'سقف همزمانی',
    codeLabel: 'HTTP 429',
    accentBar: 'border-[#F59E0B]',
    text: 'text-[#D97706]',
  },
  blocked: {
    label: 'مسدود گاردریل',
    codeLabel: 'HTTP 403',
    accentBar: 'border-[#EF4444]',
    text: 'text-[#DC2626]',
  },
};

const AUDIT_CATEGORY_LABELS: Record<AuditLogEntry['category'], string> = {
  access: 'دسترسی و سهمیه',
  security: 'امنیت و گاردریل',
  infra: 'زیرساخت و مسیر',
  keys: 'کلیدهای API',
};

export function AdminLogs({
  requestLogs,
  auditLogs,
  onSimulateLiveRequest,
}: AdminLogsProps) {
  const [subTab, setSubTab] = useState<'requests' | 'audit'>('requests');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<RequestLogEntry | null>(null);

  const filteredRequests = useMemo(
    () => filterRequestLogs(requestLogs, query, statusFilter),
    [requestLogs, query, statusFilter]
  );

  return (
    <div className="space-y-5">
      {/* Top Switcher & Controls Bar */}
      <div className="bg-[#F6F6FA] rounded-[24px] p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="بخش لاگ‌ها و ممیزی"
          className="inline-flex items-center p-1 bg-white rounded-full self-start"
        >
          {[
            { id: 'requests' as const, label: `لاگ زنده درخواست‌ها (${toPersianDigits(requestLogs.length)})`, icon: Activity },
            { id: 'audit' as const, label: `ردپای ممیزی ادمین (${toPersianDigits(auditLogs.length)})`, icon: ClipboardList },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSubTab(tab.id)}
                className={`relative px-4 py-2 text-xs font-bold rounded-full transition-colors whitespace-nowrap flex items-center gap-2 ${
                  active ? 'text-white' : 'text-[#646476] hover:text-[#1C1C24]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="logs-subtab-pill"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-[#1E1E24]"
                  />
                )}
                <Icon className="relative z-10 w-3.5 h-3.5" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {subTab === 'requests' && (
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-[#8E8EA0] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="جستجوی کاربر، ابزار یا مدل..."
                aria-label="جستجو در لاگ درخواست‌ها"
                className="w-full pr-10 pl-4 py-2 text-xs bg-white rounded-full text-[#1C1C24] placeholder:text-[#9898AA] focus:outline-none focus:ring-2 focus:ring-[#7B70E8]/35"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={onSimulateLiveRequest}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#7B70E8] hover:bg-[#6B5FE0] rounded-full transition-colors whitespace-nowrap shadow-[0_8px_18px_-6px_rgba(123,112,232,0.55)]"
            >
              <Play className="w-3.5 h-3.5" />
              <span>ثبت ترافیک زنده</span>
            </motion.button>
          </div>
        )}
      </div>

      {subTab === 'requests' ? (
        <div className="space-y-4">
          {/* Status Filter Tiles */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'همه درخواست‌ها' },
              { id: 'success', label: 'موفق (۲۰۰)' },
              { id: 'fallback', label: 'انتقال Fallback' },
              { id: 'throttled', label: 'سقف همزمانی (۴۲۹)' },
              { id: 'blocked', label: 'مسدود گاردریل (۴۰۳)' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-full transition-colors ${
                  statusFilter === st.id
                    ? 'bg-[#7B70E8] text-white'
                    : 'bg-[#F6F6FA] text-[#525264] hover:bg-[#EBEBF5]'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Live Requests Table */}
          <div className="bg-[#F6F6FA] rounded-[26px] p-4 sm:p-5">
            <div className="bg-white rounded-[22px] overflow-hidden shadow-[0_2px_12px_-6px_rgba(28,28,36,0.06)]">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-[#F0F0F6] text-xs font-semibold text-[#8E8EA0]">
                      <th className="py-3.5 px-5">زمان و کاربر</th>
                      <th className="py-3.5 px-4">ابزار / کلید</th>
                      <th className="py-3.5 px-4">مدل سرویس‌دهنده</th>
                      <th className="py-3.5 px-4">سرعت و تأخیر</th>
                      <th className="py-3.5 px-4">توکن‌ها</th>
                      <th className="py-3.5 px-4">وضعیت</th>
                      <th className="py-3.5 px-5 text-left">جزئیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F4F9] text-xs">
                    {filteredRequests.map((log, idx) => {
                      const st = STATUS_META[log.status];
                      return (
                        <motion.tr
                          key={log.id}
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.02 }}
                          onClick={() => setSelectedLog(log)}
                          className="hover:bg-[#FAFAFE] cursor-pointer transition-colors"
                        >
                          <td className="py-3.5 px-5">
                            <div className="font-bold text-[#1C1C24]">{log.userName}</div>
                            <div className="text-[11px] text-[#8E8EA0] tabular-nums mt-0.5">
                              {log.timestamp} · {log.team}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#1C1C24]">{log.toolClient}</div>
                            <div dir="ltr" className="font-mono text-[11px] text-[#8E8EA0] text-right mt-0.5">
                              {log.keyPrefix}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div dir="ltr" className="font-mono text-[11px] font-semibold text-[#1C1C24] text-right">
                              {log.servedModel === '—' ? log.requestedModel : log.servedModel}
                            </div>
                            <div className="text-[11px] text-[#8E8EA0] mt-0.5 flex items-center gap-1.5">
                              <span>{log.sourceNode}</span>
                              {log.cacheHit && (
                                <span className="text-[#059669] font-semibold">· کش معنایی</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 tabular-nums">
                            {log.tps > 0 ? (
                              <SpeedSignalBars tps={log.tps} ttftMs={log.ttftMs} compact />
                            ) : (
                              <span dir="ltr" className="font-mono text-[11px] text-[#8E8EA0]">
                                {toPersianDigits(log.ttftMs)}ms · متوقف
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 tabular-nums min-w-[145px]">
                            {log.inputTokens + log.outputTokens > 0 ? (
                              <SplitRatioBar
                                input={log.inputTokens}
                                output={log.outputTokens}
                                compact
                              />
                            ) : (
                              <span className="font-mono text-[11px] text-[#8E8EA0]">0 tok</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className={`border-r-2 pr-2.5 whitespace-nowrap ${st.accentBar}`}>
                              <div className={`font-bold text-xs ${st.text}`}>{st.label}</div>
                              <div dir="ltr" className="font-mono text-[10.5px] text-[#8E8EA0] text-right mt-0.5 tabular-nums">
                                {st.codeLabel}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLog(log);
                              }}
                              aria-label={`جزئیات درخواست ${log.id}`}
                              className="w-8 h-8 rounded-full bg-[#F5F5FA] text-[#525264] hover:bg-[#1E1E24] hover:text-white inline-flex items-center justify-center transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Immutable Compliance Audit Trail */
        <div className="bg-[#F6F6FA] rounded-[26px] p-5 space-y-3">
          {auditLogs.map((aud, idx) => (
            <motion.div
              key={aud.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="bg-white rounded-[20px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-full bg-[#1E1E24] text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-[#A9A0F8]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#1C1C24]">{aud.action}</div>
                  <div className="text-xs text-[#8E8EA0] mt-0.5">
                    توسط <strong className="text-[#1C1C24]">{aud.actor}</strong> · هدف:{' '}
                    {aud.target}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-xs">
                <span className="text-[#7B70E8] font-bold">
                  {AUDIT_CATEGORY_LABELS[aud.category]}
                </span>
                <span aria-hidden="true" className="text-[#D4D4E2]">·</span>
                <span className="text-[#8E8EA0] tabular-nums">{aud.timestamp}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Request Trace Inspector Slide-Over Drawer */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedLog(null)}
            className="fixed inset-0 z-50 flex justify-end bg-[#1C1C24]/35 backdrop-blur-[3px]"
          >
            <motion.div
              initial={{ x: -380 }}
              animate={{ x: 0 }}
              exit={{ x: -380 }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              role="dialog"
              aria-modal="true"
              aria-label="جزئیات کامل تریس درخواست"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white h-full shadow-[0_24px_80px_-12px_rgba(28,28,36,0.3)] p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#F0F0F6]">
                  <div>
                    <div dir="ltr" className="font-mono text-xs text-[#7B70E8] text-right font-bold">
                      {selectedLog.id}
                    </div>
                    <h3 className="text-base font-bold text-[#1C1C24] mt-0.5">
                      تریس فنی درخواست روی درگاه
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedLog(null)}
                    aria-label="بستن جزئیات درخواست"
                    className="w-8 h-8 rounded-full bg-[#F5F5FA] text-[#646476] hover:text-[#1C1C24] flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {selectedLog.guardrailNote && (
                  <div className="p-4 rounded-[20px] bg-[#F3F1FE] text-xs text-[#1C1C24] flex items-start gap-2.5 leading-relaxed">
                    <ShieldAlert className="w-4 h-4 text-[#7B70E8] shrink-0 mt-0.5" />
                    <span>{selectedLog.guardrailNote}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-[18px] bg-[#F6F6FA]">
                    <div className="text-[11px] text-[#8E8EA0]">کد وضعیت HTTP</div>
                    <div className="text-lg font-bold text-[#1C1C24] tabular-nums mt-1">
                      {toPersianDigits(selectedLog.httpCode)}
                    </div>
                  </div>
                  <div className="p-4 rounded-[18px] bg-[#F6F6FA]">
                    <div className="text-[11px] text-[#8E8EA0]">زمان شروع پاسخ (TTFT)</div>
                    <div className="text-lg font-bold text-[#1C1C24] tabular-nums mt-1">
                      {toPersianDigits(selectedLog.ttftMs)}ms
                    </div>
                  </div>
                  <div className="p-4 rounded-[18px] bg-[#F6F6FA]">
                    <div className="text-[11px] text-[#8E8EA0]">توکن ورودی / خروجی</div>
                    <div className="text-sm font-bold text-[#1C1C24] tabular-nums mt-1">
                      {formatNumberFa(selectedLog.inputTokens)} /{' '}
                      {formatNumberFa(selectedLog.outputTokens)}
                    </div>
                  </div>
                  <div className="p-4 rounded-[18px] bg-[#F6F6FA]">
                    <div className="text-[11px] text-[#8E8EA0]">کش معنایی</div>
                    <div className="text-sm font-bold text-[#1C1C24] mt-1 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-[#7B70E8]" />
                      <span>{selectedLog.cacheHit ? 'بله (Hit)' : 'خیر (Miss)'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-[20px] bg-[#F6F6FA] space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8E8EA0]">کاربر و واحد</span>
                    <span className="font-bold text-[#1C1C24]">
                      {selectedLog.userName} ({selectedLog.team})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8E8EA0]">ابزار متصل</span>
                    <span className="font-bold text-[#1C1C24]">{selectedLog.toolClient}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8E8EA0]">مسیر نود پردازشی</span>
                    <span className="font-bold text-[#7B70E8] inline-flex items-center gap-1">
                      <GitBranch className="w-3.5 h-3.5" />
                      <span>{selectedLog.sourceNode}</span>
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[#EAEAF4]">
                    <div className="text-[11px] text-[#8E8EA0] mb-1">مدل درخواستی</div>
                    <div dir="ltr" className="font-mono text-[11px] text-[#1C1C24] text-left">
                      {selectedLog.requestedModel}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-full py-2.5 text-xs font-bold text-white bg-[#1E1E24] hover:bg-[#32323D] rounded-full transition-colors mt-6"
              >
                بستن پنجره تریس
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
