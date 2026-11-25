import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bot,
  Briefcase,
  Check,
  Code2,
  Copy,
  FlaskConical,
  GitPullRequest,
  KeyRound,
  PauseCircle,
  PlayCircle,
  Plus,
  Radio,
  Search,
  Server,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';
import { ApiKeyItem, LocalModel, TeamName } from '../../types';
import { formatTokenCount, toPersianDigits } from '../../utils/logic';

interface AdminKeysVaultProps {
  apiKeys: ApiKeyItem[];
  models: LocalModel[];
  onCreateServiceKey: (payload: {
    name: string;
    ownerLabel: string;
    team: TeamName;
    expiresAt: string | null;
    modelScope: string[];
  }) => void;
  onToggleKeyStatus: (keyId: string) => void;
  onRevokeKey: (keyId: string) => void;
  onCopyText: (text: string, label: string) => void;
}

const SERVICE_TEMPLATES = [
  {
    id: 'gitlab',
    title: 'ربات بازبینی کد GitLab CI',
    owner: 'سرویس GitLab CI',
    icon: GitPullRequest,
    defaultTeam: 'تیم بک‌اند' as TeamName,
  },
  {
    id: 'rag',
    title: 'جستجوی هوشمند اسناد (RAG)',
    owner: 'پلتفرم اسناد R&D',
    icon: Bot,
    defaultTeam: 'تحقیق و توسعه (R&D)' as TeamName,
  },
  {
    id: 'gateway',
    title: 'میکروسرویس داخلی تولید گزارش',
    owner: 'سرویس اتوماسیون اداری',
    icon: Server,
    defaultTeam: 'مالی و اداری' as TeamName,
  },
  {
    id: 'custom',
    title: 'کلید سرویس سفارشی تیم',
    owner: 'سرویس داخلی جدید',
    icon: KeyRound,
    defaultTeam: 'پژوهش مخابرات' as TeamName,
  },
];

const TEAM_TILES: { name: TeamName; icon: typeof Code2 }[] = [
  { name: 'تیم بک‌اند', icon: Code2 },
  { name: 'تحقیق و توسعه (R&D)', icon: FlaskConical },
  { name: 'پژوهش مخابرات', icon: Radio },
  { name: 'مالی و اداری', icon: Briefcase },
];

const EXPIRY_TILES = [
  { id: '30', label: '۳۰ روزه', sub: 'پروژه کوتاه‌مدت' },
  { id: '90', label: '۹۰ روزه', sub: 'پیشنهاد امنیتی' },
  { id: '365', label: '۱ ساله', sub: 'سرویس پایدار' },
  { id: 'never', label: 'بدون انقضا', sub: 'چرخشی دستی' },
];

export function AdminKeysVault({
  apiKeys,
  models,
  onCreateServiceKey,
  onToggleKeyStatus,
  onRevokeKey,
  onCopyText,
}: AdminKeysVaultProps) {
  const [filterType, setFilterType] = useState<'all' | 'service' | 'personal'>('all');
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Tile modal state
  const [templateId, setTemplateId] = useState('gitlab');
  const [keyName, setKeyName] = useState(SERVICE_TEMPLATES[0].title);
  const [ownerLabel, setOwnerLabel] = useState(SERVICE_TEMPLATES[0].owner);
  const [team, setTeam] = useState<TeamName>('تیم بک‌اند');
  const [expiryId, setExpiryId] = useState('90');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apiKeys.filter((k) => {
      const kType = k.keyType ?? 'personal';
      const matchesType = filterType === 'all' || kType === filterType;
      const matchesQ =
        !q ||
        k.name.toLowerCase().includes(q) ||
        (k.ownerLabel ?? '').toLowerCase().includes(q) ||
        k.prefix.toLowerCase().includes(q);
      return matchesType && matchesQ;
    });
  }, [apiKeys, filterType, query]);

  const activeCount = apiKeys.filter((k) => k.status === 'active').length;
  const serviceCount = apiKeys.filter((k) => k.keyType === 'service').length;

  const applyTemplate = (tpl: (typeof SERVICE_TEMPLATES)[number]) => {
    setTemplateId(tpl.id);
    setKeyName(tpl.title);
    setOwnerLabel(tpl.owner);
    setTeam(tpl.defaultTeam);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    let expiresAt: string | null = null;
    if (expiryId !== 'never') {
      const d = new Date();
      d.setDate(d.getDate() + Number(expiryId));
      expiresAt = d.toISOString().slice(0, 10);
    }
    onCreateServiceKey({
      name: keyName.trim(),
      ownerLabel: ownerLabel.trim() || 'سرویس سازمانی',
      team,
      expiresAt,
      modelScope: selectedModels,
    });
    setModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Summary & Search Bar */}
      <div className="bg-[#F6F6FA] rounded-[24px] p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all' as const, label: `همه کلیدها (${toPersianDigits(apiKeys.length)})` },
            { id: 'service' as const, label: `سرویس‌ها و CI/CD (${toPersianDigits(serviceCount)})` },
            {
              id: 'personal' as const,
              label: `کارمندان (${toPersianDigits(apiKeys.length - serviceCount)})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={`relative px-4 py-2 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${
                filterType === tab.id ? 'text-white' : 'bg-white text-[#525264] hover:text-[#1C1C24]'
              }`}
            >
              {filterType === tab.id && (
                <motion.span
                  layoutId="vault-filter-pill"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  className="absolute inset-0 rounded-full bg-[#1E1E24]"
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#8E8EA0] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی نام کلید یا مالک..."
              aria-label="جستجو در کلیدهای سازمانی"
              className="w-full pr-10 pl-4 py-2 text-xs bg-white rounded-full text-[#1C1C24] placeholder:text-[#9898AA] focus:outline-none focus:ring-2 focus:ring-[#7B70E8]/35"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#7B70E8] hover:bg-[#6B5FE0] rounded-full transition-colors whitespace-nowrap shadow-[0_8px_18px_-6px_rgba(123,112,232,0.55)]"
          >
            <Plus className="w-4 h-4" />
            <span>ساخت کلید سرویس / تیم</span>
          </motion.button>
        </div>
      </div>

      {/* Vault Deck */}
      <div className="bg-[#F6F6FA] rounded-[26px] p-5 space-y-3">
        <div className="flex items-center justify-between px-1 text-xs">
          <span className="font-bold text-[#1C1C24]">
            کلیدهای مجازی ({toPersianDigits(activeCount)} فعال از {toPersianDigits(apiKeys.length)})
          </span>
          <div className="flex items-center gap-1.5" dir="ltr">
            {apiKeys.map((k) => (
              <span
                key={k.id}
                className={`h-2 w-4 rounded-full ${
                  k.status === 'active'
                    ? 'bg-emerald-500'
                    : k.status === 'disabled'
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                }`}
                title={k.name}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {filtered.map((item, idx) => {
            const isService = item.keyType === 'service';
            const isRevoked = item.status === 'revoked';

            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                whileHover={{ y: -2 }}
                className={`bg-white rounded-[22px] p-5 flex flex-col justify-between gap-4 shadow-[0_2px_12px_-6px_rgba(28,28,36,0.06)] ${
                  isRevoked ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        isService ? 'bg-[#7B70E8] text-white' : 'bg-[#1E1E24] text-white'
                      }`}
                    >
                      {isService ? <Bot className="w-4.5 h-4.5" /> : <UserIcon className="w-4.5 h-4.5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#1C1C24] truncate">{item.name}</div>
                      <div className="text-[11px] text-[#8E8EA0] mt-0.5 truncate">
                        {item.ownerLabel ?? 'کاربر سازمانی'} · {item.team ?? 'تیم بک‌اند'}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold whitespace-nowrap ${
                      item.status === 'active'
                        ? 'text-[#059669]'
                        : item.status === 'disabled'
                          ? 'text-[#D97706]'
                          : 'text-[#DC2626]'
                    }`}
                  >
                    {item.status === 'active'
                      ? 'فعال'
                      : item.status === 'disabled'
                        ? 'متوقف'
                        : 'باطل‌شده'}
                  </span>
                </div>

                <div className="bg-[#F6F6FA] rounded-[16px] px-4 py-3 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span dir="ltr" className="font-mono text-[#1C1C24] font-semibold">
                      {item.prefix}
                    </span>
                    <div className="flex items-center gap-2.5 text-[11px] text-[#646476] tabular-nums">
                      <span className="font-bold text-[#1C1C24]">
                        {formatTokenCount(item.tokensUsed)}
                      </span>
                      <span>·</span>
                      <span dir="ltr" className="font-mono text-[10.5px]">
                        {item.expiresAt ?? '∞'}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isService ? 'bg-[#7B70E8]' : 'bg-[#1E1E24]'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(4, Math.round((item.tokensUsed / 5_000_000) * 100)))}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[#8E8EA0]">آخرین استفاده: {item.lastUsed}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isRevoked}
                      onClick={() => onCopyText(item.fullKey, `کلید ${item.name}`)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#F5F5FA] hover:bg-[#EAEAF4] text-xs font-semibold text-[#1C1C24] disabled:opacity-40 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>کپی</span>
                    </button>
                    {!isRevoked && (
                      <>
                        <button
                          type="button"
                          onClick={() => onToggleKeyStatus(item.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#F5F5FA] hover:bg-[#1E1E24] hover:text-white text-xs font-semibold text-[#525264] transition-colors"
                        >
                          {item.status === 'active' ? (
                            <>
                              <PauseCircle className="w-3.5 h-3.5" />
                              <span>توقف</span>
                            </>
                          ) : (
                            <>
                              <PlayCircle className="w-3.5 h-3.5" />
                              <span>فعال</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onRevokeKey(item.id)}
                          aria-label={`ابطال کلید ${item.name}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FEF2F2] hover:bg-[#EF4444] hover:text-white text-xs font-semibold text-[#DC2626] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ابطال</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>

      {/* Tactile Visual Tile Modal: Create Service Virtual Key */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1C24]/35 backdrop-blur-[3px]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              role="dialog"
              aria-modal="true"
              aria-label="ساخت کلید سرویس جدید"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-white rounded-[28px] shadow-[0_28px_80px_-15px_rgba(28,28,36,0.32)] overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-[#F0F0F6] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#7B70E8] text-white flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-[#1C1C24]">
                    صدور کلید مجازی سرویس / تیم
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  aria-label="بستن پنجره"
                  className="w-8 h-8 rounded-full bg-[#F5F5FA] text-[#646476] hover:text-[#1C1C24] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
                {/* Step 1: Service Template Tiles */}
                <div>
                  <div className="text-xs font-bold text-[#1C1C24] mb-2.5">
                    ۱. نوع سرویس یا کاربرد را انتخاب کنید
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {SERVICE_TEMPLATES.map((tpl) => {
                      const Icon = tpl.icon;
                      const active = templateId === tpl.id;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => applyTemplate(tpl)}
                          className={`p-3.5 rounded-[20px] text-right flex items-center gap-3 transition-all ${
                            active
                              ? 'bg-[#F3F1FE] ring-2 ring-[#7B70E8]'
                              : 'bg-[#F6F6FA] hover:bg-[#EFEFF6]'
                          }`}
                        >
                          <span
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                              active ? 'bg-[#7B70E8] text-white' : 'bg-[#1E1E24] text-white'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="text-xs font-bold text-[#1C1C24] block truncate">
                              {tpl.title}
                            </span>
                            <span className="text-[11px] text-[#8E8EA0] block truncate">
                              {tpl.owner}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Name Input */}
                <div>
                  <label htmlFor="svc-key-name" className="block text-xs font-bold text-[#1C1C24] mb-1.5">
                    عنوان کلید در گزارش‌های مصرف
                  </label>
                  <input
                    id="svc-key-name"
                    type="text"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-[#F6F6FA] rounded-[16px] text-[#1C1C24] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B70E8]/35"
                  />
                </div>

                {/* Team Visual Tiles */}
                <div>
                  <div className="text-xs font-bold text-[#1C1C24] mb-2">۲. تیم مالک بودجه</div>
                  <div className="grid grid-cols-2 gap-2">
                    {TEAM_TILES.map((t) => {
                      const Icon = t.icon;
                      const active = team === t.name;
                      return (
                        <button
                          key={t.name}
                          type="button"
                          onClick={() => setTeam(t.name)}
                          className={`px-3.5 py-2.5 rounded-[16px] text-xs font-bold flex items-center justify-between transition-all ${
                            active
                              ? 'bg-[#1E1E24] text-white'
                              : 'bg-[#F6F6FA] text-[#525264] hover:bg-[#EFEFF6]'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#A9A0F8]' : 'text-[#7B70E8]'}`} />
                            <span>{t.name}</span>
                          </span>
                          {active && <Check className="w-3.5 h-3.5 text-[#A9A0F8]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Expiry Visual Tiles */}
                <div>
                  <div className="text-xs font-bold text-[#1C1C24] mb-2">۳. اعتبار زمانی کلید</div>
                  <div className="grid grid-cols-4 gap-2">
                    {EXPIRY_TILES.map((ex) => {
                      const active = expiryId === ex.id;
                      return (
                        <button
                          key={ex.id}
                          type="button"
                          onClick={() => setExpiryId(ex.id)}
                          className={`p-2.5 rounded-[16px] text-center transition-all ${
                            active
                              ? 'bg-[#7B70E8] text-white shadow-[0_6px_16px_-4px_rgba(123,112,232,0.5)]'
                              : 'bg-[#F6F6FA] text-[#1C1C24] hover:bg-[#EFEFF6]'
                          }`}
                        >
                          <div className="text-xs font-bold">{ex.label}</div>
                          <div className={`text-[10px] mt-0.5 ${active ? 'text-white/80' : 'text-[#8E8EA0]'}`}>
                            {ex.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Model Scope Tiles */}
                <div>
                  <div className="text-xs font-bold text-[#1C1C24] mb-2">
                    ۴. محدودسازی به مدل خاص (اختیاری — خالی = همه مدل‌ها)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {models.map((m) => {
                      const active = selectedModels.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() =>
                            setSelectedModels((prev) =>
                              prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                            )
                          }
                          className={`px-3.5 py-2 rounded-full text-xs font-bold transition-colors ${
                            active
                              ? 'bg-[#1E1E24] text-white'
                              : 'bg-[#F6F6FA] text-[#525264] hover:bg-[#EFEFF6]'
                          }`}
                        >
                          {m.displayName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F0F0F6] flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#646476] rounded-full"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-bold text-white bg-[#7B70E8] hover:bg-[#6B5FE0] rounded-full shadow-[0_8px_18px_-6px_rgba(123,112,232,0.55)]"
                  >
                    تولید و فعال‌سازی کلید
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
