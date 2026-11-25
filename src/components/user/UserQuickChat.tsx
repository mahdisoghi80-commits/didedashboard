import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Cpu,
  Lock,
  RotateCcw,
  Send,
  ShieldAlert,
} from 'lucide-react';
import {
  AccessPlan,
  ChatMessage,
  LocalModel,
  OrgUser,
} from '../../types';
import {
  formatNumberFa,
  getUserEffectiveAccess,
  toPersianDigits,
} from '../../utils/logic';
import { SpeedSignalBars } from '../VisualPrimitives';

interface UserQuickChatProps {
  user: OrgUser;
  plans: AccessPlan[];
  models: LocalModel[];
  initialModelId: string | null;
  onRecordChatUsage: (inputTokens: number, outputTokens: number) => void;
  onSetStreamingActive: (active: boolean) => void;
}

const STARTER_PROMPTS = [
  {
    title: 'بهینه‌سازی کوئری PostgreSQL',
    prompt:
      'یک کوئری PostgreSQL برای یافتن ۱۰ کاربر پرمصرف ۲۴ ساعت گذشته با ایندکس مناسب و بدون قفل کردن جدول بنویس.',
  },
  {
    title: 'خلاصه‌سازی گزارش جلسه فنی',
    prompt:
      'یک قالب خلاصه و مدیریتی برای صورت‌جلسه بررسی ظرفیت سرور GPU داخلی (2× H200) و تقسیم سهمیه بین تیم‌ها آماده کن.',
  },
  {
    title: 'تنظیم ایمیل رسمی سازمانی',
    prompt:
      'متن یک ایمیل کوتاه و حرفه‌ای به تیم مهندسی درباره فعال شدن ساعات خلوت آزاد (۲۲ تا ۷ صبح) روی مدل داخلی بنویس.',
  },
];

function buildSimulatedResponse(prompt: string, model: LocalModel): string {
  const lower = prompt.toLowerCase();
  if (
    lower.includes('sql') ||
    lower.includes('postgres') ||
    lower.includes('کوئری') ||
    lower.includes('کد')
  ) {
    return `پاسخ تولیدشده توسط «${model.displayName}» روی سرور داخلی:\n\nبرای گزارش‌گیری سریع بدون فشار روی جدول اصلی، بهتر است از ایندکس ترکیبی روی (created_at, user_id) استفاده کنید:\n\nCREATE INDEX CONCURRENTLY idx_usage_created_user\n  ON token_usage_logs (created_at DESC, user_id)\n  INCLUDE (input_tokens, output_tokens);\n\nSELECT user_id, SUM(input_tokens + output_tokens) AS total_tokens\nFROM token_usage_logs\nWHERE created_at >= NOW() - INTERVAL '24 hours'\nGROUP BY user_id\nORDER BY total_tokens DESC\nLIMIT 10;\n\nاین کوئری با Index-Only Scan اجرا می‌شود و زیر ۱۵ میلی‌ثانیه پاسخ می‌دهد.`;
  }

  if (lower.includes('ایمیل') || lower.includes('اطلاعیه') || lower.includes('خلوت')) {
    return `موضوع: فعال‌سازی ساعات طلایی مصرف آزاد روی سرور هوش مصنوعی داخلی\n\nهمکاران گرامی،\nبا هدف بهره‌وری حداکثری از ظرفیت سرور داخلی GPU، از امشب بازه زمانی ۲۲:۰۰ تا ۰۷:۰۰ به‌عنوان «ساعات خلوت آزاد» فعال شده است.\n\nدر این بازه:\n۱. مصرف توکن شما از سهمیه روزانه کسر نمی‌شود.\n۲. زمان ایده‌آلی برای اجرای تحلیل‌های حجیم و بازبینی کامل مخازن کد است.\n\nبا احترام — واحد زیرساخت فنی`;
  }

  return `پاسخ تولیدشده روی سرور ۱۰۰٪ داخلی توسط «${model.displayName}»:\n\nخلاصه پیشنهادی برای مدیریت بهینه ظرفیت کلاستر داخلی:\n۱. تعیین سقف همزمانی ۲ اسلات برای تیم‌های توسعه‌دهنده جهت جلوگیری از قفل شدن صف توسط ایجنت‌های موازی.\n۲. اختصاص اولویت سطح ۱ برای تیم تحقیق و توسعه در ساعات اوج کاری (۱۰ تا ۱۷).\n۳. هدایت پردازش‌های دسته‌ای و سنگین به بازه ساعات خلوت آزاد بدون کسر سهمیه.\n\nدر صورت نیاز به جزئیات بیشتر یا خروجی جدول‌دار، بفرمایید تا همین‌جا آماده کنم.`;
}

export function UserQuickChat({
  user,
  plans,
  models,
  initialModelId,
  onRecordChatUsage,
  onSetStreamingActive,
}: UserQuickChatProps) {
  const eff = useMemo(
    () => getUserEffectiveAccess(user, plans, models),
    [user, plans, models]
  );

  const [selectedId, setSelectedId] = useState<string>(
    initialModelId && eff.allowedModels.some((m) => m.id === initialModelId)
      ? initialModelId
      : eff.allowedModels[0]?.id ?? ''
  );
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const streamTimerRef = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialModelId && eff.allowedModels.some((m) => m.id === initialModelId)) {
      setSelectedId(initialModelId);
    } else if (!eff.allowedModels.some((m) => m.id === selectedId) && eff.allowedModels[0]) {
      setSelectedId(eff.allowedModels[0].id);
    }
  }, [initialModelId, eff.allowedModels, selectedId]);

  useEffect(() => {
    return () => {
      if (streamTimerRef.current !== null) {
        window.clearInterval(streamTimerRef.current);
      }
      onSetStreamingActive(false);
    };
  }, [onSetStreamingActive]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeModel = eff.allowedModels.find((m) => m.id === selectedId) ?? eff.allowedModels[0];

  const handleSend = (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isStreaming || !activeModel || user.status === 'suspended') return;

    const nowLabel = new Date().toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: ChatMessage = {
      id: `msg-u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: nowLabel,
    };

    const fullReply = buildSimulatedResponse(trimmed, activeModel);
    const assistantId = `msg-a-${Date.now() + 1}`;

    setMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        modelName: activeModel.displayName,
        timestamp: nowLabel,
        streaming: true,
      },
    ]);
    setInput('');
    setIsStreaming(true);
    onSetStreamingActive(true);

    const words = fullReply.split(' ');
    let cursor = 0;

    streamTimerRef.current = window.setInterval(() => {
      cursor += 3;
      const slice = words.slice(0, cursor).join(' ');
      const finished = cursor >= words.length;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: finished ? fullReply : slice,
                streaming: !finished,
                tokens: finished ? Math.round(fullReply.length * 0.45) : undefined,
              }
            : m
        )
      );

      if (finished) {
        if (streamTimerRef.current !== null) {
          window.clearInterval(streamTimerRef.current);
          streamTimerRef.current = null;
        }
        setIsStreaming(false);
        onSetStreamingActive(false);
        const estIn = Math.max(40, Math.round(trimmed.length * 0.5));
        const estOut = Math.max(120, Math.round(fullReply.length * 0.45));
        onRecordChatUsage(estIn, estOut);
      }
    }, 45);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  return (
    <div className="space-y-4 h-[calc(100vh-190px)] min-h-[540px] flex flex-col">
      {/* Soft Dropify Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F6F6FA] rounded-[24px] px-5 py-3.5 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="radiogroup"
            aria-label="انتخاب مدل داخلی فعال"
            className="flex flex-wrap items-center gap-1.5"
          >
            {eff.allowedModels.map((m) => {
              const active = activeModel?.id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={isStreaming}
                  onClick={() => setSelectedId(m.id)}
                  className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    active
                      ? 'bg-[#1E1E24] text-white shadow-[0_6px_16px_-6px_rgba(28,28,36,0.4)]'
                      : 'bg-white text-[#525264] hover:text-[#1C1C24]'
                  }`}
                >
                  {m.displayName}
                </button>
              );
            })}
          </div>
          {activeModel && (
            <div className="px-3 py-1.5 rounded-full bg-white flex items-center gap-2">
              <SpeedSignalBars tps={activeModel.tpsAvg} compact />
              <span className="text-[11px] text-[#059669] font-semibold inline-flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>داخلی</span>
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMessages([])}
          disabled={messages.length === 0 || isStreaming}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#525264] hover:text-[#1C1C24] disabled:opacity-40 rounded-full bg-white shadow-[0_2px_10px_-4px_rgba(28,28,36,0.06)] self-start sm:self-auto transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>گفت‌وگوی جدید</span>
        </button>
      </div>

      {/* Chat Viewport */}
      <div className="flex-1 bg-[#F6F6FA] rounded-[26px] p-4 flex flex-col overflow-hidden">
        <div className="flex-1 bg-white rounded-[22px] flex flex-col overflow-hidden shadow-[0_2px_12px_-6px_rgba(28,28,36,0.06)]">
          {user.status === 'suspended' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center mb-3">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="text-base font-bold text-[#1C1C24]">
                امکان ارسال پیام در حالت تعلیق وجود ندارد
              </div>
              <p className="text-xs text-[#8E8EA0] mt-1 max-w-sm">
                حساب کاربری شما توسط ادمین تعلیق شده است. پس از فعال‌سازی مجدد می‌توانید بلافاصله از چت داخلی استفاده کنید.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 text-center">
              <div className="w-12 h-12 rounded-full bg-[#7B70E8] text-white flex items-center justify-center mb-4 shadow-[0_10px_24px_-6px_rgba(123,112,232,0.55)]">
                <Cpu className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-[#1C1C24]">
                چت آزمایشی سریع با مدل‌های داخلی مدار
              </h2>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-3xl text-right">
                {STARTER_PROMPTS.map((item, idx) => (
                  <motion.button
                    key={item.title}
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSend(item.prompt)}
                    className="p-4 rounded-[20px] bg-[#F6F6FA] hover:bg-[#F3F1FE] transition-colors text-right space-y-1.5 group"
                  >
                    <div className="text-xs font-bold text-[#1C1C24] group-hover:text-[#7B70E8] transition-colors">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-[#646476] line-clamp-2 leading-relaxed">
                      {item.prompt}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.22 }}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-start' : 'items-end'
                  }`}
                >
                  <div
                    className={`max-w-2xl rounded-[22px] px-4 py-3.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-[#1E1E24] text-white'
                        : 'bg-[#F6F6FA] text-[#1C1C24]'
                    }`}
                  >
                    {msg.role === 'assistant' && msg.modelName && (
                      <div className="text-[11px] font-bold text-[#7B70E8] mb-1.5 flex items-center justify-between gap-4">
                        <span>{msg.modelName}</span>
                        {msg.tokens && (
                          <span className="text-[#8E8EA0] font-medium tabular-nums">
                            {formatNumberFa(msg.tokens)} توکن ·{' '}
                            {toPersianDigits(activeModel?.tpsAvg ?? 68)} tok/s
                          </span>
                        )}
                      </div>
                    )}
                    <div>
                      {msg.content}
                      {msg.streaming && (
                        <span className="inline-block w-2 h-4 bg-[#7B70E8] mr-1 align-middle animate-pulse rounded-full" />
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-[#9898AA] mt-1 px-2 tabular-nums">
                    {msg.timestamp}
                  </span>
                </motion.div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Composer */}
          <form
            onSubmit={handleSubmit}
            className="p-3.5 border-t border-[#F0F0F6] bg-[#FAFAFE] flex items-center gap-2.5 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isStreaming || user.status === 'suspended' || !activeModel}
              placeholder="پیام یا پرسش خود را به فارسی یا انگلیسی بنویسید..."
              aria-label="متن پیام چت سریع"
              className="flex-1 px-4 py-2.5 text-sm bg-white rounded-full text-[#1C1C24] placeholder:text-[#9898AA] focus:outline-none focus:ring-2 focus:ring-[#7B70E8]/35 disabled:opacity-60 shadow-[0_2px_8px_-4px_rgba(28,28,36,0.06)]"
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={!input.trim() || isStreaming || user.status === 'suspended' || !activeModel}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-[#7B70E8] hover:bg-[#6B5FE0] disabled:opacity-45 rounded-full transition-colors whitespace-nowrap shrink-0 shadow-[0_8px_18px_-6px_rgba(123,112,232,0.55)]"
            >
              <Send className="w-4 h-4" />
              <span>{isStreaming ? 'در حال تولید...' : 'ارسال'}</span>
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  );
}
