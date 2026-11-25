import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Cpu,
  Download,
  KeyRound,
  Layers,
  Loader2,
  PauseCircle,
  Play,
  PlayCircle,
  Plus,
  Plug,
  Terminal,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import {
  AccessPlan,
  ApiKeyItem,
  GatewaySettings,
  LocalModel,
  OrgUser,
  SetupOS,
  SetupTool,
} from '../../types';
import {
  ConnectionCheckStepResult,
  formatTokenCount,
  generateConnectionSnippet,
  getUserEffectiveAccess,
  toPersianDigits,
  validateKeyConnection,
} from '../../utils/logic';

interface UserApiKeysProps {
  user: OrgUser;
  plans: AccessPlan[];
  models: LocalModel[];
  settings: GatewaySettings;
  apiKeys: ApiKeyItem[];
  externalCreateTrigger?: number;
  onCreateKey: (payload: {
    name: string;
    expiresAt: string | null;
    modelScope: string[];
  }) => ApiKeyItem;
  onToggleKeyStatus: (keyId: string) => void;
  onRevokeKey: (keyId: string) => void;
  onCopyText: (text: string, label: string) => void;
}

const TOOLS: { id: SetupTool; label: string }[] = [
  { id: 'cursor', label: 'Cursor' },
  { id: 'continue', label: 'VS Code (Continue)' },
  { id: 'codex', label: 'Codex CLI' },
  { id: 'opencode', label: 'OpenCode' },
  { id: 'python', label: 'Python' },
];

const KEY_TEMPLATES = [
  {
    id: 'cursor',
    label: 'Cursor IDE',
    suggestedName: 'Cursor — لپ‌تاپ کاری',
    icon: Code2,
  },
  {
    id: 'continue',
    label: 'VS Code Continue',
    suggestedName: 'VS Code Continue — بک‌اند',
    icon: Layers,
  },
  {
    id: 'codex',
    label: 'Codex CLI',
    suggestedName: 'Codex CLI — ترمینال توسعه',
    icon: Terminal,
  },
  {
    id: 'python',
    label: 'Python SDK',
    suggestedName: 'اسکریپت Python داخلی',
    icon: Cpu,
  },
];

const EXPIRY_TILES: { id: '30d' | '90d' | '365d' | 'never'; label: string; hint: string }[] = [
  { id: '30d', label: '۳۰ روزه', hint: 'پروژه موقت' },
  { id: '90d', label: '۹۰ روزه', hint: 'پیشنهادی امن' },
  { id: '365d', label: '۱ ساله', hint: 'استفاده دائم' },
  { id: 'never', label: 'بدون انقضا', hint: 'سرویس پایدار' },
];

export function UserApiKeys({
  user,
  plans,
  models,
  settings,
  apiKeys,
  externalCreateTrigger,
  onCreateKey,
  onToggleKeyStatus,
  onRevokeKey,
  onCopyText,
}: UserApiKeysProps) {
  const eff = useMemo(
    () => getUserEffectiveAccess(user, plans, models),
    [user, plans, models]
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('cursor');
  const [keyName, setKeyName] = useState('Cursor — لپ‌تاپ کاری');
  const [expiryPreset, setExpiryPreset] = useState<'30d' | '90d' | '365d' | 'never'>('90d');
  const [scopedModels, setScopedModels] = useState<string[]>([]);
  const [createError, setCreateError] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKeyItem | null>(null);

  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  const [connectKeyId, setConnectKeyId] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<SetupTool>('cursor');
  const [selectedOS, setSelectedOS] = useState<SetupOS>('windows');
  const [selectedModelId, setSelectedModelId] = useState<string>(
    eff.allowedModels[0]?.modelId ?? 'Qwen/Qwen2.5-Coder-32B-Instruct'
  );
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const [testingStepIdx, setTestingStepIdx] = useState<number>(-1);
  const [checkResults, setCheckResults] = useState<ConnectionCheckStepResult[] | null>(null);

  useEffect(() => {
    if (externalCreateTrigger && externalCreateTrigger > 0) {
      setNewlyCreatedKey(null);
      setCreateOpen(true);
    }
  }, [externalCreateTrigger]);

  const connectKey = apiKeys.find((k) => k.id === connectKeyId) ?? null;

  useEffect(() => {
    if (eff.allowedModels.length > 0 && !eff.allowedModels.some((m) => m.modelId === selectedModelId)) {
      setSelectedModelId(eff.allowedModels[0].modelId);
    }
  }, [eff.allowedModels, selectedModelId]);

  const snippet = useMemo(() => {
    if (!connectKey) return null;
    return generateConnectionSnippet(
      selectedTool,
      selectedOS,
      connectKey.fullKey,
      settings.gatewayBaseUrl,
      selectedModelId
    );
  }, [connectKey, selectedTool, selectedOS, settings.gatewayBaseUrl, selectedModelId]);

  const openConnectDrawer = (key: ApiKeyItem) => {
    setConnectKeyId(key.id);
    setTestingStepIdx(-1);
    setCheckResults(null);
    setCopiedSnippet(false);
  };

  const handleRunConnectionTest = () => {
    if (!connectKey) return;
    const expected = validateKeyConnection(
      connectKey,
      user,
      settings,
      eff.allowedModels,
      selectedModelId
    );
    setCheckResults(expected);
    setTestingStepIdx(0);

    setTimeout(() => setTestingStepIdx(1), 420);
    setTimeout(() => setTestingStepIdx(2), 880);
    setTimeout(() => setTestingStepIdx(3), 1350);
  };

  const handleDownloadConfig = () => {
    if (!snippet) return;
    const blob = new Blob([snippet.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = snippet.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onCopyText(snippet.code, `فایل ${snippet.fileName} دانلود و آماده شد`);
  };

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) {
      setCreateError('یک نام مشخص برای کلید وارد کنید یا یکی از ابزارهای بالا را لمس کنید.');
      return;
    }

    let expiresAt: string | null = null;
    if (expiryPreset === '30d') {
      expiresAt = new Date(Date.now() + 30 * 86400 * 1000).toISOString().slice(0, 10);
    } else if (expiryPreset === '90d') {
      expiresAt = new Date(Date.now() + 90 * 86400 * 1000).toISOString().slice(0, 10);
    } else if (expiryPreset === '365d') {
      expiresAt = new Date(Date.now() + 365 * 86400 * 1000).toISOString().slice(0, 10);
    }

    const created = onCreateKey({
      name: keyName.trim(),
      expiresAt,
      modelScope: scopedModels,
    });
    setNewlyCreatedKey(created);
    setKeyName('Cursor — لپ‌تاپ کاری');
    setSelectedTemplate('cursor');
    setScopedModels([]);
    setCreateError('');
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    setNewlyCreatedKey(null);
    setCreateError('');
  };

  return (
    <div className="space-y-5">
      {/* API Base URL Quick Copy Bar */}
      <div className="bg-[#F6F6FA] rounded-[24px] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="w-10 h-10 rounded-full bg-[#1E1E24] text-white flex items-center justify-center shrink-0">
            <Terminal className="w-4.5 h-4.5" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#1C1C24]">
              آدرس درگاه داخلی سازمان (API Base URL)
            </div>
            <div dir="ltr" className="font-mono text-xs text-[#7B70E8] font-medium text-right truncate mt-0.5">
              {settings.gatewayBaseUrl}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => onCopyText(settings.gatewayBaseUrl, 'آدرس API Base URL')}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#1C1C24] bg-white hover:bg-[#EEECFC] rounded-full transition-colors whitespace-nowrap"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>کپی آدرس</span>
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setNewlyCreatedKey(null);
              setCreateOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#7B70E8] hover:bg-[#695DE0] rounded-full transition-colors whitespace-nowrap shadow-[0_8px_18px_-6px_rgba(123,112,232,0.6)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ساخت کلید جدید</span>
          </motion.button>
        </div>
      </div>

      {/* API Keys Deck */}
      <section className="bg-[#F6F6FA] rounded-[26px] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-[#1C1C24]">
            کلیدهای API شما ({toPersianDigits(apiKeys.length)})
          </h2>
          <div className="flex items-center gap-1.5" aria-label="وضعیت کلیدها">
            {apiKeys.map((k) => (
              <span
                key={k.id}
                title={k.name}
                className={`h-2 rounded-full ${
                  k.status === 'active'
                    ? 'w-5 bg-[#059669]'
                    : k.status === 'disabled'
                      ? 'w-3 bg-[#D97706]'
                      : 'w-2.5 bg-[#E11D48]/50'
                }`}
              />
            ))}
          </div>
        </div>

        {apiKeys.length === 0 ? (
          <div className="bg-white rounded-[20px] py-14 px-6 text-center space-y-3">
            <KeyRound className="w-8 h-8 text-[#A59CF7] mx-auto" />
            <div className="text-sm font-bold text-[#1C1C24]">هنوز کلید API نساخته‌اید</div>
            <p className="text-xs text-[#7B7B8F] max-w-sm mx-auto">
              برای اتصال Cursor، VS Code یا اسکریپت‌های پایتون به سرور داخلی، اولین کلید خود را ایجاد کنید.
            </p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#7B70E8] hover:bg-[#695DE0] rounded-full"
            >
              ساخت اولین کلید API
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => {
              const isRevoked = key.status === 'revoked';
              const isDisabled = key.status === 'disabled';
              const scopeNames =
                key.modelScope.length === 0
                  ? 'همه مدل‌های مجاز'
                  : models
                      .filter((m) => key.modelScope.includes(m.id))
                      .map((m) => m.displayName)
                      .join('، ');

              return (
                <motion.div
                  key={key.id}
                  layout
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.16 }}
                  className="bg-white rounded-[20px] px-5 py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-[0_2px_10px_rgba(28,28,36,0.03)]"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[#1C1C24]">{key.name}</span>
                      <span
                        className={`text-xs font-semibold ${
                          isRevoked
                            ? 'text-[#E11D48]'
                            : isDisabled
                              ? 'text-[#D97706]'
                              : 'text-[#16A34A]'
                        }`}
                      >
                        · {isRevoked ? 'باطل شده' : isDisabled ? 'متوقف موقت' : 'فعال'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#7B7B8F]">
                      <span dir="ltr" className="font-mono text-[#1C1C24] font-medium">
                        {key.prefix}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>محدوده: {scopeNames}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        انقضا:{' '}
                        {key.expiresAt ? (
                          <span dir="ltr" className="inline-block font-mono text-[11px] tabular-nums">
                            {key.expiresAt}
                          </span>
                        ) : (
                          'بدون انقضا'
                        )}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums font-semibold text-[#1C1C24]">
                        {formatTokenCount(key.tokensUsed)}
                      </span>
                    </div>
                    <div className="pt-1.5 flex items-center gap-2 max-w-xs">
                      <div className="flex-1 h-1.5 rounded-full bg-[#EFEFF7] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isRevoked ? 'bg-[#E11D48]/40' : isDisabled ? 'bg-[#D97706]' : 'bg-[#7B70E8]'
                          }`}
                          style={{
                            width: `${Math.max(
                              6,
                              Math.min(
                                100,
                                Math.round(
                                  (key.tokensUsed /
                                    Math.max(1, ...apiKeys.map((item) => item.tokensUsed))) *
                                    100
                                )
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => openConnectDrawer(key)}
                      aria-label={`اتصال به ابزارها برای ${key.name}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1E1E24] hover:bg-[#7B70E8] rounded-full transition-colors whitespace-nowrap"
                    >
                      <Plug className="w-3.5 h-3.5" />
                      <span>اتصال به ابزارها</span>
                    </motion.button>

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => onCopyText(key.fullKey, `کلید ${key.name}`)}
                      disabled={isRevoked}
                      aria-label={`کپی کلید ${key.name}`}
                      className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-[#1C1C24] bg-[#F4F4F9] hover:bg-[#EAE9F6] disabled:opacity-40 rounded-full transition-colors whitespace-nowrap"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>کپی</span>
                    </motion.button>

                    {!isRevoked && (
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        onClick={() => onToggleKeyStatus(key.id)}
                        aria-label={isDisabled ? `فعال‌سازی ${key.name}` : `توقف موقت ${key.name}`}
                        className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-[#525264] bg-[#F4F4F9] hover:bg-[#EAE9F6] rounded-full transition-colors whitespace-nowrap"
                      >
                        {isDisabled ? (
                          <>
                            <PlayCircle className="w-3.5 h-3.5 text-[#16A34A]" />
                            <span>فعال‌سازی</span>
                          </>
                        ) : (
                          <>
                            <PauseCircle className="w-3.5 h-3.5 text-[#D97706]" />
                            <span>توقف</span>
                          </>
                        )}
                      </motion.button>
                    )}

                    {!isRevoked &&
                      (confirmRevokeId === key.id ? (
                        <div className="inline-flex items-center gap-1 bg-[#FFF1F2] rounded-full px-2 py-1">
                          <button
                            type="button"
                            onClick={() => {
                              onRevokeKey(key.id);
                              setConfirmRevokeId(null);
                            }}
                            className="px-2.5 py-1 text-xs font-bold text-white bg-[#E11D48] rounded-full"
                          >
                            تایید ابطال
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRevokeId(null)}
                            className="px-2 py-1 text-xs text-[#646476]"
                          >
                            لغو
                          </button>
                        </div>
                      ) : (
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setConfirmRevokeId(key.id)}
                          aria-label={`ابطال دائمی ${key.name}`}
                          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-[#E11D48] bg-[#FFF1F2] hover:bg-[#FFE4E6] rounded-full transition-colors whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ابطال</span>
                        </motion.button>
                      ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Tactile Visual-Tile Create API Key Modal */}
      <AnimatePresence>
        {createOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCreateModal}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1C24]/35 backdrop-blur-[3px]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              role="dialog"
              aria-modal="true"
              aria-label="ساخت کلید API جدید"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-white rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            >
              <div className="px-6 py-4 border-b border-[#F0F0F6] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-[#7B70E8] text-white flex items-center justify-center shrink-0">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <h2 className="text-base font-bold text-[#1C1C24]">
                    {newlyCreatedKey ? 'کلید شما با موفقیت ساخته شد' : 'ساخت کلید API جدید'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  aria-label="بستن پنجره ساخت کلید"
                  className="w-8 h-8 rounded-full bg-[#F4F4F8] text-[#646476] hover:text-[#1C1C24] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {newlyCreatedKey ? (
                <div className="p-6 space-y-5">
                  <div className="p-4 rounded-[18px] bg-[#F0FDF4] text-xs text-[#166534] leading-relaxed">
                    این کلید محرمانه فقط همین یک‌بار به‌صورت کامل نمایش داده می‌شود. اکنون آن را کپی کنید یا مستقیماً وارد راهنمای اتصال ابزارها شوید.
                  </div>

                  <div className="bg-[#1E1E24] text-white rounded-[20px] p-4 flex items-center justify-between gap-3">
                    <code dir="ltr" className="font-mono text-xs text-[#A59CF7] break-all text-left">
                      {newlyCreatedKey.fullKey}
                    </code>
                    <button
                      type="button"
                      onClick={() => onCopyText(newlyCreatedKey.fullKey, 'کلید جدید')}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-white/12 hover:bg-white/20 rounded-full shrink-0 inline-flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>کپی</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={closeCreateModal}
                      className="px-4 py-2 text-xs font-semibold text-[#646476] rounded-full"
                    >
                      بستن
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const created = newlyCreatedKey;
                        closeCreateModal();
                        openConnectDrawer(created);
                      }}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-[#7B70E8] hover:bg-[#695DE0] rounded-full transition-colors"
                    >
                      <Plug className="w-3.5 h-3.5" />
                      <span>اتصال فوری به Cursor / Codex / Python</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitCreate} className="p-6 overflow-y-auto space-y-5">
                  {createError && (
                    <div className="p-3 rounded-[16px] bg-[#FFF1F2] text-xs text-[#BE123C]">
                      {createError}
                    </div>
                  )}

                  {/* Tool Quick-Template Visual Tiles */}
                  <div>
                    <div className="text-xs font-bold text-[#1C1C24] mb-2">
                      ۱. این کلید را برای چه ابزاری می‌سازید؟
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {KEY_TEMPLATES.map((tpl) => {
                        const Icon = tpl.icon;
                        const active = selectedTemplate === tpl.id;
                        return (
                          <motion.button
                            key={tpl.id}
                            whileTap={{ scale: 0.96 }}
                            type="button"
                            onClick={() => {
                              setSelectedTemplate(tpl.id);
                              setKeyName(tpl.suggestedName);
                            }}
                            className={`p-3 rounded-[18px] text-center flex flex-col items-center gap-2 transition-all ${
                              active
                                ? 'bg-[#F3F1FE] ring-2 ring-[#7B70E8]'
                                : 'bg-[#F6F6FA] hover:bg-[#EFEFF6]'
                            }`}
                          >
                            <span
                              className={`w-9 h-9 rounded-full flex items-center justify-center ${
                                active ? 'bg-[#7B70E8] text-white' : 'bg-[#1E1E24] text-white'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </span>
                            <span className="text-[11px] font-bold text-[#1C1C24]">
                              {tpl.label}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Key Name Input */}
                  <div>
                    <label htmlFor="new-key-name" className="block text-xs font-semibold text-[#525264] mb-1.5">
                      نام نمایشی کلید
                    </label>
                    <input
                      id="new-key-name"
                      type="text"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder="مثلاً: VS Code — پروژه سرویس مخابرات"
                      className="w-full px-4 py-2.5 text-sm bg-[#F6F6FA] rounded-[16px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B70E8]/35"
                    />
                  </div>

                  {/* Tactile Expiry Tiles (Zero <select>!) */}
                  <div>
                    <div className="text-xs font-bold text-[#1C1C24] mb-2">۲. مدت اعتبار کلید</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {EXPIRY_TILES.map((exp) => {
                        const active = expiryPreset === exp.id;
                        return (
                          <button
                            key={exp.id}
                            type="button"
                            onClick={() => setExpiryPreset(exp.id)}
                            className={`p-3 rounded-[16px] text-right transition-all ${
                              active
                                ? 'bg-[#1E1E24] text-white'
                                : 'bg-[#F6F6FA] text-[#1C1C24] hover:bg-[#EFEFF6]'
                            }`}
                          >
                            <div className="text-xs font-bold">{exp.label}</div>
                            <div
                              className={`text-[10.5px] mt-0.5 ${
                                active ? 'text-white/70' : 'text-[#8E8EA0]'
                              }`}
                            >
                              {exp.hint}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tactile Model Scope Tiles */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#1C1C24]">
                        ۳. محدودسازی به مدل‌های خاص (اختیاری)
                      </span>
                      <span className="text-[11px] text-[#8E8EA0]">
                        {scopedModels.length === 0
                          ? 'همه مدل‌های مجاز شما'
                          : `${toPersianDigits(scopedModels.length)} مدل انتخاب‌شده`}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {eff.allowedModels.map((mdl) => {
                        const checked = scopedModels.includes(mdl.id);
                        return (
                          <button
                            key={mdl.id}
                            type="button"
                            onClick={() =>
                              setScopedModels((prev) =>
                                prev.includes(mdl.id)
                                  ? prev.filter((id) => id !== mdl.id)
                                  : [...prev, mdl.id]
                              )
                            }
                            className={`text-right p-3 rounded-[16px] flex items-center justify-between gap-2 transition-all ${
                              checked
                                ? 'bg-[#F3F1FE] ring-2 ring-[#7B70E8]'
                                : 'bg-[#F6F6FA] hover:bg-[#EFEFFA]'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[#1C1C24] truncate">
                                {mdl.displayName}
                              </div>
                              <div dir="ltr" className="font-mono text-[10.5px] text-[#7B7B8F] text-right truncate">
                                {mdl.modelId.split('/').pop()}
                              </div>
                            </div>
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                checked
                                  ? 'bg-[#7B70E8] text-white'
                                  : 'bg-white text-transparent ring-1 ring-[#DDDDE8]'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#F0F0F6] flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeCreateModal}
                      className="px-4 py-2 text-xs font-semibold text-[#646476] rounded-full"
                    >
                      انصراف
                    </button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      className="px-5 py-2.5 text-xs font-bold text-white bg-[#7B70E8] hover:bg-[#695DE0] rounded-full transition-colors shadow-[0_8px_18px_-6px_rgba(123,112,232,0.55)]"
                    >
                      ساخت کلید و دریافت کد اتصال
                    </motion.button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO UX FEATURE: Spring-Animated Interactive "How-To Connect" Drawer */}
      <AnimatePresence>
        {connectKey && snippet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-[#1C1C24]/35 backdrop-blur-[2px]"
            onClick={() => setConnectKeyId(null)}
          >
            <motion.div
              initial={{ x: -560 }}
              animate={{ x: 0 }}
              exit={{ x: -560 }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              role="dialog"
              aria-modal="true"
              aria-label="راهنمای تعاملی اتصال به ابزارها"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden rounded-r-[28px]"
            >
              <div className="px-6 py-5 border-b border-[#F0F0F6] flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-[#1C1C24]">
                  اتصال سریع به ابزارها — {connectKey.name}
                </h2>
                <button
                  type="button"
                  onClick={() => setConnectKeyId(null)}
                  aria-label="بستن راهنمای اتصال"
                  className="w-8 h-8 rounded-full bg-[#F4F4F8] text-[#646476] hover:text-[#1C1C24] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Step 1: Tool Selector with animated layoutId pill */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-[#525264]">۱. ابزار خود را انتخاب کنید</div>
                  <div
                    role="tablist"
                    aria-label="انتخاب ابزار اتصال"
                    className="flex flex-wrap gap-2"
                  >
                    {TOOLS.map((tool) => {
                      const active = selectedTool === tool.id;
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => {
                            setSelectedTool(tool.id);
                            setCopiedSnippet(false);
                          }}
                          className={`relative px-4 py-2 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${
                            active ? 'text-white' : 'bg-[#F4F4F9] text-[#525264] hover:text-[#1C1C24]'
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="connect-tool-pill"
                              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                              className="absolute inset-0 rounded-full bg-[#1E1E24]"
                            />
                          )}
                          <span className="relative z-10">{tool.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2 & 3: OS & Target Model Tiles */}
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-bold text-[#525264] mb-2">۲. سیستم‌عامل</div>
                    <div
                      role="tablist"
                      aria-label="انتخاب سیستم عامل"
                      className="grid grid-cols-2 p-1 bg-[#F4F4F9] rounded-full max-w-md"
                    >
                      {(
                        [
                          { id: 'windows', label: 'ویندوز (PowerShell)' },
                          { id: 'unix', label: 'مک / لینوکس' },
                        ] as const
                      ).map((os) => (
                        <button
                          key={os.id}
                          type="button"
                          role="tab"
                          aria-selected={selectedOS === os.id}
                          onClick={() => setSelectedOS(os.id)}
                          className={`relative py-2 px-2 text-xs font-semibold rounded-full transition-colors whitespace-nowrap ${
                            selectedOS === os.id ? 'text-white' : 'text-[#646476] hover:text-[#1C1C24]'
                          }`}
                        >
                          {selectedOS === os.id && (
                            <motion.span
                              layoutId="connect-os-pill"
                              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                              className="absolute inset-0 rounded-full bg-[#7B70E8]"
                            />
                          )}
                          <span className="relative z-10">{os.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-[#525264] mb-2">۳. مدل پیش‌فرض</div>
                    <div className="flex flex-wrap gap-2">
                      {eff.allowedModels.map((m) => {
                        const active = selectedModelId === m.modelId;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedModelId(m.modelId)}
                            className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
                              active
                                ? 'bg-[#F3F1FE] text-[#7B70E8] ring-2 ring-[#7B70E8]'
                                : 'bg-[#F4F4F9] text-[#525264] hover:text-[#1C1C24]'
                            }`}
                          >
                            {m.displayName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Instructions & Ready-to-Copy Code */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-[#1C1C24]">{snippet.title}</div>
                  <ol className="space-y-1.5 text-xs text-[#646476] list-decimal list-inside">
                    {snippet.steps.map((st, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {st}
                      </li>
                    ))}
                  </ol>

                  <div className="rounded-[22px] overflow-hidden bg-[#1E1E24]">
                    <div className="px-4 py-3 bg-[#26262F] flex items-center justify-between gap-2">
                      <span dir="ltr" className="font-mono text-xs text-slate-300">
                        {snippet.fileName}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDownloadConfig}
                          className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:text-white bg-white/8 hover:bg-white/15 rounded-full transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          <span>دانلود فایل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onCopyText(snippet.code, 'کد اتصال آماده');
                            setCopiedSnippet(true);
                            setTimeout(() => setCopiedSnippet(false), 1800);
                          }}
                          className="inline-flex items-center gap-1 px-3.5 py-1 text-[11px] font-bold text-white bg-[#7B70E8] hover:bg-[#695DE0] rounded-full transition-colors"
                        >
                          {copiedSnippet ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>کپی شد</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>کپی کد</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <pre
                      dir="ltr"
                      className="p-4 text-xs font-mono text-slate-100 overflow-x-auto leading-relaxed text-left"
                    >
                      <code>{snippet.code}</code>
                    </pre>
                  </div>
                </div>

                {/* Animated 3-Step Live Connection Tester */}
                <div className="p-5 rounded-[22px] bg-[#F6F6FA] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-[#1C1C24]">تست اتصال زنده (۳ مرحله‌ای)</h3>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={handleRunConnectionTest}
                      disabled={testingStepIdx >= 0 && testingStepIdx < 3}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-[#7B70E8] hover:bg-[#695DE0] disabled:opacity-60 rounded-full transition-colors whitespace-nowrap shrink-0 shadow-[0_8px_18px_-6px_rgba(123,112,232,0.55)]"
                    >
                      {testingStepIdx >= 0 && testingStepIdx < 3 ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>در حال بررسی...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>تست اتصال زنده</span>
                        </>
                      )}
                    </motion.button>
                  </div>

                  {checkResults && (
                    <div className="space-y-2 pt-1">
                      {checkResults.map((step, idx) => {
                        const isDone = testingStepIdx > idx;
                        const isRunning = testingStepIdx === idx;
                        return (
                          <motion.div
                            key={step.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.08 }}
                            className="flex items-start justify-between gap-3 text-xs bg-white rounded-2xl px-4 py-3"
                          >
                            <div className="flex items-start gap-2.5">
                              {isRunning ? (
                                <Loader2 className="w-4 h-4 text-[#7B70E8] animate-spin shrink-0 mt-0.5" />
                              ) : isDone ? (
                                step.passed ? (
                                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-[#E11D48] shrink-0 mt-0.5" />
                                )
                              ) : (
                                <span className="w-4 h-4 rounded-full border-2 border-[#DCDCE6] shrink-0 mt-0.5" />
                              )}
                              <div>
                                <div className="font-bold text-[#1C1C24]">{step.label}</div>
                                {isDone && (
                                  <div
                                    className={`mt-0.5 ${
                                      step.passed ? 'text-[#7B7B8F]' : 'text-[#E11D48]'
                                    }`}
                                  >
                                    {step.detail}
                                  </div>
                                )}
                              </div>
                            </div>
                            {isDone && (
                              <span
                                className={`font-bold whitespace-nowrap ${
                                  step.passed ? 'text-[#16A34A]' : 'text-[#E11D48]'
                                }`}
                              >
                                {step.passed ? 'موفق' : 'خطا'}
                              </span>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
