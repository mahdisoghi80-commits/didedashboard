import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Briefcase,
  Check,
  Code2,
  Copy,
  Cpu,
  Crown,
  FlaskConical,
  Gauge,
  Layers,
  Moon,
  Plus,
  Radio,
  Shield,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  AccessPlan,
  LocalModel,
  OrgUser,
  PriorityTier,
  QuotaPeriod,
  TeamName,
} from '../../types';
import {
  formatTokenCount,
  getPriorityLabel,
  getQuotaPeriodLabel,
  toPersianDigits,
} from '../../utils/logic';

interface AdminPlansProps {
  plans: AccessPlan[];
  models: LocalModel[];
  users: OrgUser[];
  externalCreateTrigger?: number;
  onCreatePlan: (
    plan: Omit<AccessPlan, 'id'>,
    assignedUserIds: string[],
    assignedTeams: TeamName[]
  ) => void;
  onDuplicatePlan: (planId: string) => void;
  onDeletePlan: (planId: string) => void;
}

const PLAN_PRESETS = [
  {
    id: 'coding' as const,
    title: 'تیم برنامه‌نویسی',
    subtitle: '۲ همزمان · ۳M روزانه · ساعات خلوت آزاد',
    icon: Code2,
    priority: 'standard' as PriorityTier,
    concurrency: 2,
    rpm: 30,
    quotaMillions: 3,
    period: 'daily' as QuotaPeriod,
    offPeak: true,
  },
  {
    id: 'general' as const,
    title: 'کارکنان عمومی',
    subtitle: '۱ همزمان · ۱M روزانه · ساده و کنترل‌شده',
    icon: Briefcase,
    priority: 'basic' as PriorityTier,
    concurrency: 1,
    rpm: 15,
    quotaMillions: 1,
    period: 'daily' as QuotaPeriod,
    offPeak: false,
  },
  {
    id: 'vip' as const,
    title: 'پژوهش و R&D (VIP)',
    subtitle: 'اولویت ۱ · ۳ همزمان · ۶M روزانه',
    icon: Crown,
    priority: 'vip' as PriorityTier,
    concurrency: 3,
    rpm: 45,
    quotaMillions: 6,
    period: 'daily' as QuotaPeriod,
    offPeak: true,
  },
];

const PRIORITY_TILES: {
  id: PriorityTier;
  title: string;
  desc: string;
  icon: typeof Crown;
}[] = [
  {
    id: 'vip',
    title: 'سطح ۱ · ویژه (VIP)',
    desc: 'پیشی گرفتن در صف اوج مصرف GPU',
    icon: Crown,
  },
  {
    id: 'standard',
    title: 'سطح ۲ · استاندارد',
    desc: 'صف متعادل برای تیم‌های فنی',
    icon: Zap,
  },
  {
    id: 'basic',
    title: 'سطح ۳ · عادی',
    desc: 'مناسب کاربری روزمره و اداری',
    icon: Shield,
  },
];

const QUOTA_PRESETS = [
  { value: 1, label: '۱M توکن', hint: 'کاربری سبک' },
  { value: 3, label: '۳M توکن', hint: 'استاندارد فنی' },
  { value: 6, label: '۶M توکن', hint: 'تیم سنگین' },
  { value: 12, label: '۱۲M توکن', hint: 'پژوهش و Agent' },
];

const PERIOD_TILES: { id: QuotaPeriod; label: string; hint: string }[] = [
  { id: '5h', label: '۵ ساعته', hint: 'ریست سریع' },
  { id: 'daily', label: 'روزانه', hint: 'پیشنهادی' },
  { id: 'monthly', label: 'ماهانه', hint: 'سهمیه منعطف' },
];

const RPM_PRESETS = [15, 30, 45, 60];

const TEAM_TILES: { name: TeamName; icon: typeof Code2 }[] = [
  { name: 'تیم بک‌اند', icon: Code2 },
  { name: 'تحقیق و توسعه (R&D)', icon: FlaskConical },
  { name: 'پژوهش مخابرات', icon: Radio },
  { name: 'مالی و اداری', icon: Briefcase },
];

export function AdminPlans({
  plans,
  models,
  users,
  externalCreateTrigger,
  onCreatePlan,
  onDuplicatePlan,
  onDeletePlan,
}: AdminPlansProps) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [presetType, setPresetType] = useState<'coding' | 'general' | 'vip' | 'custom'>('coding');
  const [priorityTier, setPriorityTier] = useState<PriorityTier>('standard');
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>(
    models.filter((m) => m.enabled).map((m) => m.id)
  );
  const [concurrencyLimit, setConcurrencyLimit] = useState(2);
  const [rpmLimit, setRpmLimit] = useState(30);
  const [quotaMillions, setQuotaMillions] = useState(3);
  const [quotaPeriod, setQuotaPeriod] = useState<QuotaPeriod>('daily');
  const [offPeakUnlimited, setOffPeakUnlimited] = useState(true);
  const [selectedTeams, setSelectedTeams] = useState<TeamName[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [wizardError, setWizardError] = useState('');

  const resetWizard = () => {
    setStep(1);
    setName('');
    setDescription('');
    setPresetType('coding');
    setPriorityTier('standard');
    setSelectedModelIds(models.filter((m) => m.enabled).map((m) => m.id));
    setConcurrencyLimit(2);
    setRpmLimit(30);
    setQuotaMillions(3);
    setQuotaPeriod('daily');
    setOffPeakUnlimited(true);
    setSelectedTeams([]);
    setSelectedUserIds([]);
    setWizardError('');
  };

  useEffect(() => {
    if (externalCreateTrigger && externalCreateTrigger > 0) {
      resetWizard();
      setWizardOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalCreateTrigger]);

  const applyPreset = (presetId: 'coding' | 'general' | 'vip') => {
    const preset = PLAN_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setPresetType(presetId);
    setPriorityTier(preset.priority);
    setConcurrencyLimit(preset.concurrency);
    setRpmLimit(preset.rpm);
    setQuotaMillions(preset.quotaMillions);
    setQuotaPeriod(preset.period);
    setOffPeakUnlimited(preset.offPeak);
    if (!name.trim() || PLAN_PRESETS.some((p) => `طرح ${p.title}` === name.trim())) {
      setName(`طرح ${preset.title}`);
    }
    if (!description.trim() || PLAN_PRESETS.some((p) => p.subtitle === description.trim())) {
      setDescription(preset.subtitle);
    }
  };

  const handleNextStep = () => {
    setWizardError('');
    if (step === 1) {
      if (!name.trim()) {
        setWizardError('نام طرح دسترسی را وارد کنید یا یکی از الگوهای آماده را لمس کنید.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (selectedModelIds.length === 0) {
        setWizardError('حداقل یک مدل داخلی برای این طرح انتخاب کنید.');
        return;
      }
      setStep(3);
    }
  };

  const handleFinishWizard = () => {
    onCreatePlan(
      {
        name: name.trim(),
        description: description.trim() || 'طرح دسترسی سفارشی برای مدیریت منابع داخلی GPU',
        presetType,
        priorityTier,
        allowedModelIds: selectedModelIds,
        concurrencyLimit,
        rpmLimit,
        tokenQuota: Math.max(200_000, Math.round(quotaMillions * 1_000_000)),
        quotaPeriod,
        offPeakUnlimited,
      },
      selectedUserIds,
      selectedTeams
    );
    setWizardOpen(false);
    resetWizard();
  };

  return (
    <div className="space-y-5">
      {/* Compact Context Bar */}
      <div className="bg-[#F6F6FA] rounded-[24px] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-[#1C1C24]">
            طرح‌های دسترسی ({toPersianDigits(plans.length)})
          </h2>
          <span className="px-3 py-1 rounded-full bg-white text-[11px] font-bold text-[#7B70E8] inline-flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            <span>گاردریل ضد Multi-Agent</span>
          </span>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={() => {
            resetWizard();
            setWizardOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#7B70E8] hover:bg-[#6B5FE0] rounded-full transition-colors whitespace-nowrap shrink-0 shadow-[0_8px_18px_-6px_rgba(123,112,232,0.55)]"
        >
          <Plus className="w-4 h-4" />
          <span>ایجاد طرح دسترسی</span>
        </motion.button>
      </div>

      {/* Active Plans Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {plans.map((plan, idx) => {
          const assignedUsers = users.filter((u) => u.planIds.includes(plan.id));
          const planModels = models.filter((m) => plan.allowedModelIds.includes(m.id));
          const isVip = plan.priorityTier === 'vip';

          return (
            <motion.article
              key={plan.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: idx * 0.05 }}
              whileHover={{ y: -3 }}
              className="bg-[#F6F6FA] rounded-[26px] p-5 flex flex-col justify-between gap-4 transition-shadow hover:shadow-[0_14px_30px_-14px_rgba(123,112,232,0.22)]"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div
                      className={`text-xs font-semibold ${
                        isVip ? 'text-[#7B70E8]' : 'text-[#646476]'
                      }`}
                    >
                      {getPriorityLabel(plan.priorityTier)}
                    </div>
                    <h3 className="text-[17px] font-bold text-[#1C1C24] mt-0.5">{plan.name}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={() => onDuplicatePlan(plan.id)}
                      aria-label={`کپی طرح ${plan.name}`}
                      title="کپی کردن این طرح"
                      className="w-8 h-8 rounded-full bg-white text-[#525264] hover:bg-[#1E1E24] hover:text-white flex items-center justify-center transition-colors shadow-[0_2px_8px_-4px_rgba(28,28,36,0.1)]"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </motion.button>
                    {plans.length > 1 && (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => onDeletePlan(plan.id)}
                        aria-label={`حذف طرح ${plan.name}`}
                        title="حذف طرح"
                        className="w-8 h-8 rounded-full bg-white text-[#EF4444] hover:bg-[#EF4444] hover:text-white flex items-center justify-center transition-colors shadow-[0_2px_8px_-4px_rgba(28,28,36,0.1)]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Highlighted Anti-Multi-Agent Concurrency Guardrail */}
                <div
                  className={`mt-4 p-4 rounded-[20px] text-white space-y-2.5 ${
                    isVip
                      ? 'bg-gradient-to-br from-[#8D82F4] to-[#6E62DF] shadow-[0_10px_24px_-10px_rgba(123,112,232,0.6)]'
                      : 'bg-[#1E1E24]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-xs font-bold">
                      <Shield className="w-4 h-4 text-white/90 shrink-0" />
                      <span>سقف همزمانی کاربر</span>
                    </span>
                    <span className="text-sm font-bold tabular-nums whitespace-nowrap">
                      {toPersianDigits(plan.concurrencyLimit)} اسلات
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5" dir="ltr">
                    {Array.from({ length: 6 }).map((_, slotIdx) => (
                      <span
                        key={slotIdx}
                        className={`h-1.5 flex-1 rounded-full ${
                          slotIdx < plan.concurrencyLimit ? 'bg-white' : 'bg-white/20'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* White Inner Metric Islands */}
                <div className="mt-3 grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3.5 rounded-[18px] bg-white">
                    <div className="text-[#8E8EA0] text-[11px]">
                      سهمیه توکن ({getQuotaPeriodLabel(plan.quotaPeriod)})
                    </div>
                    <div className="text-sm font-bold text-[#1C1C24] tabular-nums mt-1">
                      {formatTokenCount(plan.tokenQuota)}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-[18px] bg-white">
                    <div className="text-[#8E8EA0] text-[11px]">محدودیت نرخ (RPM)</div>
                    <div className="text-sm font-bold text-[#1C1C24] tabular-nums mt-1">
                      {toPersianDigits(plan.rpmLimit)} در دقیقه
                    </div>
                  </div>
                </div>

                {/* Allowed Local Models White Island */}
                <div className="mt-3 p-3.5 rounded-[18px] bg-white">
                  <div className="text-[11px] font-semibold text-[#8E8EA0] mb-2">
                    مدل‌های داخلی مجاز ({toPersianDigits(planModels.length)})
                  </div>
                  <ul className="space-y-1.5 text-xs text-[#1C1C24]">
                    {planModels.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold">{m.displayName}</span>
                        <span
                          className={`text-[11px] font-semibold shrink-0 ${
                            m.enabled ? 'text-[#059669]' : 'text-[#8E8EA0]'
                          }`}
                        >
                          {m.enabled ? 'فعال' : 'خاموش'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Footer stats */}
              <div className="pt-2 px-1 flex items-center justify-between text-xs text-[#646476]">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#7B70E8]" />
                  <strong className="text-[#1C1C24] tabular-nums">
                    {toPersianDigits(assignedUsers.length)}
                  </strong>{' '}
                  کاربر عضو
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-[#1E1E24]" />
                  <span>
                    ساعات خلوت:{' '}
                    <strong className={plan.offPeakUnlimited ? 'text-[#059669]' : 'text-[#8E8EA0]'}>
                      {plan.offPeakUnlimited ? 'نامحدود' : 'معمولی'}
                    </strong>
                  </span>
                </span>
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* Tactile 3-Step Visual-Tile Create Access Plan Wizard Modal */}
      <AnimatePresence>
        {wizardOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setWizardOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1C24]/35 backdrop-blur-[3px]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              role="dialog"
              aria-modal="true"
              aria-label="ویزارد ایجاد طرح دسترسی"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white rounded-[28px] shadow-[0_28px_80px_-15px_rgba(28,28,36,0.32)] overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Wizard Header */}
              <div className="px-6 py-4 border-b border-[#F0F0F6] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#7B70E8] text-white flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-[#1C1C24]">
                    ساخت طرح دسترسی جدید
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setWizardOpen(false)}
                  aria-label="بستن ویزارد طرح دسترسی"
                  className="w-8 h-8 rounded-full bg-[#F5F5FA] text-[#646476] hover:text-[#1C1C24] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Interactive Stepper Progress */}
              <div className="px-6 py-3.5 bg-[#F6F6FA] grid grid-cols-3 gap-2 text-xs">
                {[
                  { num: 1 as const, label: '۱. الگو و اولویت' },
                  { num: 2 as const, label: '۲. مدل‌های مجاز' },
                  { num: 3 as const, label: '۳. گاردریل و اعضا' },
                ].map((s) => (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => {
                      if (s.num < step) setStep(s.num);
                    }}
                    className={`flex items-center gap-2 font-semibold text-right ${
                      step === s.num
                        ? 'text-[#7B70E8]'
                        : step > s.num
                          ? 'text-[#059669] cursor-pointer'
                          : 'text-[#9898AA] cursor-default'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${
                        step === s.num
                          ? 'bg-[#7B70E8] text-white'
                          : step > s.num
                            ? 'bg-[#10B981] text-white'
                            : 'bg-white text-[#8E8EA0]'
                      }`}
                    >
                      {step > s.num ? <Check className="w-3.5 h-3.5" /> : toPersianDigits(s.num)}
                    </span>
                    <span className="truncate">{s.label}</span>
                  </button>
                ))}
              </div>

              {/* Wizard Body */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {wizardError && (
                  <div className="p-3.5 rounded-[16px] bg-[#FEF2F2] text-xs font-medium text-[#DC2626]">
                    {wizardError}
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div
                      key="wizard-step-1"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-5"
                    >
                      {/* Archetype Preset Visual Tiles */}
                      <div>
                        <div className="text-xs font-bold text-[#1C1C24] mb-2.5">
                          الگوی آماده را انتخاب کنید (Preset)
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {PLAN_PRESETS.map((preset) => {
                            const Icon = preset.icon;
                            const selected = presetType === preset.id;
                            return (
                              <motion.button
                                key={preset.id}
                                whileTap={{ scale: 0.97 }}
                                type="button"
                                onClick={() => applyPreset(preset.id)}
                                className={`text-right p-4 rounded-[22px] transition-all flex flex-col gap-3 ${
                                  selected
                                    ? 'bg-[#F3F1FE] ring-2 ring-[#7B70E8] shadow-[0_10px_22px_-12px_rgba(123,112,232,0.5)]'
                                    : 'bg-[#F6F6FA] hover:bg-[#EFEFF6]'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                                      selected
                                        ? 'bg-[#7B70E8] text-white'
                                        : 'bg-[#1E1E24] text-white'
                                    }`}
                                  >
                                    <Icon className="w-4.5 h-4.5" />
                                  </span>
                                  {selected && (
                                    <span className="w-5 h-5 rounded-full bg-[#7B70E8] text-white flex items-center justify-center">
                                      <Check className="w-3 h-3" />
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-[#1C1C24]">
                                    {preset.title}
                                  </div>
                                  <div className="text-[11px] text-[#646476] mt-1 leading-relaxed">
                                    {preset.subtitle}
                                  </div>
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Plan Name & Short Note */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label
                            htmlFor="plan-name-input"
                            className="block text-xs font-semibold text-[#525264] mb-1.5"
                          >
                            نام طرح دسترسی
                          </label>
                          <input
                            id="plan-name-input"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="مثلاً: تیم توسعه موبایل"
                            className="w-full px-4 py-2.5 text-sm bg-[#F6F6FA] rounded-[16px] text-[#1C1C24] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B70E8]/35"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="plan-desc-input"
                            className="block text-xs font-semibold text-[#525264] mb-1.5"
                          >
                            توضیح کوتاه مدیریتی
                          </label>
                          <input
                            id="plan-desc-input"
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="کاربرد این طرح را کوتاه بنویسید..."
                            className="w-full px-4 py-2.5 text-sm bg-[#F6F6FA] rounded-[16px] text-[#1C1C24] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B70E8]/35"
                          />
                        </div>
                      </div>

                      {/* Priority Tier Visual Tiles (Zero <select>!) */}
                      <div>
                        <div className="text-xs font-bold text-[#1C1C24] mb-2.5">
                          اولویت در صف GPU داخلی
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {PRIORITY_TILES.map((tier) => {
                            const Icon = tier.icon;
                            const active = priorityTier === tier.id;
                            return (
                              <motion.button
                                key={tier.id}
                                whileTap={{ scale: 0.97 }}
                                type="button"
                                onClick={() => setPriorityTier(tier.id)}
                                className={`text-right p-3.5 rounded-[18px] transition-all flex items-start gap-2.5 ${
                                  active
                                    ? 'bg-[#1E1E24] text-white'
                                    : 'bg-[#F6F6FA] text-[#1C1C24] hover:bg-[#EFEFF6]'
                                }`}
                              >
                                <span
                                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                    active
                                      ? 'bg-[#7B70E8] text-white'
                                      : 'bg-white text-[#1E1E24]'
                                  }`}
                                >
                                  <Icon className="w-4 h-4" />
                                </span>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold truncate">{tier.title}</div>
                                  <div
                                    className={`text-[10.5px] mt-0.5 leading-snug ${
                                      active ? 'text-white/70' : 'text-[#7B7B8F]'
                                    }`}
                                  >
                                    {tier.desc}
                                  </div>
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="wizard-step-2"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-[#646476]">
                          کاشی مدل‌های کشف‌شده روی سرور vLLM را برای فعال‌سازی لمس کنید:
                        </p>
                        <span className="text-xs font-bold text-[#7B70E8] tabular-nums">
                          {toPersianDigits(selectedModelIds.length)} مدل انتخاب‌شده
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {models.map((mdl) => {
                          const checked = selectedModelIds.includes(mdl.id);
                          return (
                            <motion.button
                              key={mdl.id}
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={() =>
                                setSelectedModelIds((prev) =>
                                  prev.includes(mdl.id)
                                    ? prev.filter((id) => id !== mdl.id)
                                    : [...prev, mdl.id]
                                )
                              }
                              className={`text-right p-4 rounded-[22px] transition-all flex flex-col justify-between gap-3 ${
                                checked
                                  ? 'bg-[#F3F1FE] ring-2 ring-[#7B70E8]'
                                  : 'bg-[#F6F6FA] hover:bg-[#EFEFF6]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2.5">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span
                                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                      checked
                                        ? 'bg-[#7B70E8] text-white'
                                        : 'bg-[#1E1E24] text-white'
                                    }`}
                                  >
                                    <Cpu className="w-4 h-4" />
                                  </span>
                                  <div className="min-w-0">
                                    <div className="text-sm font-bold text-[#1C1C24] truncate">
                                      {mdl.displayName}
                                    </div>
                                    <div className="text-[11px] font-semibold text-[#059669]">
                                      {mdl.speedRating}
                                    </div>
                                  </div>
                                </div>
                                <span
                                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                    checked
                                      ? 'bg-[#7B70E8] text-white'
                                      : 'bg-white text-transparent ring-1 ring-[#DDDDE8]'
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </span>
                              </div>
                              <div>
                                <div className="text-xs text-[#646476] leading-relaxed line-clamp-2">
                                  {mdl.description}
                                </div>
                                <div
                                  dir="ltr"
                                  className="font-mono text-[10.5px] text-[#8E8EA0] text-right mt-2 truncate"
                                >
                                  {mdl.modelId}
                                </div>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div
                      key="wizard-step-3"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-5"
                    >
                      {/* Anti-Multi-Agent Concurrency Guardrail */}
                      <div className="p-5 rounded-[22px] bg-[#1E1E24] text-white space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-full bg-[#7B70E8] text-white flex items-center justify-center shrink-0">
                              <Shield className="w-4 h-4" />
                            </span>
                            <span className="text-sm font-bold">
                              سقف همزمانی هر کاربر (گاردریل ضد Multi-Agent)
                            </span>
                          </div>
                          <span className="text-base font-bold text-[#A9A0F8] tabular-nums whitespace-nowrap">
                            حداکثر {toPersianDigits(concurrencyLimit)} اسلات
                          </span>
                        </div>
                        <p className="text-xs text-white/65 leading-relaxed">
                          مانع قفل شدن کل ظرفیت GPU توسط یک کاربر هنگام اجرای همزمان چندین ایجنت کدنویسی می‌شود.
                        </p>
                        <div className="grid grid-cols-5 gap-2">
                          {[1, 2, 3, 4, 6].map((val) => (
                            <motion.button
                              key={val}
                              whileTap={{ scale: 0.95 }}
                              type="button"
                              onClick={() => setConcurrencyLimit(val)}
                              className={`py-2.5 text-xs font-bold rounded-full tabular-nums transition-colors ${
                                concurrencyLimit === val
                                  ? 'bg-[#7B70E8] text-white shadow-[0_6px_16px_-4px_rgba(123,112,232,0.6)]'
                                  : 'bg-white/10 text-white/80 hover:bg-white/15'
                              }`}
                            >
                              {toPersianDigits(val)} اسلات
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      {/* Tactile Token Quota & Period Tiles (Zero <select> or raw numbers!) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[#F6F6FA] rounded-[20px] p-4 space-y-2.5">
                          <div className="text-xs font-bold text-[#1C1C24]">سقف سهمیه توکن</div>
                          <div className="grid grid-cols-2 gap-2">
                            {QUOTA_PRESETS.map((q) => {
                              const active = quotaMillions === q.value;
                              return (
                                <button
                                  key={q.value}
                                  type="button"
                                  onClick={() => setQuotaMillions(q.value)}
                                  className={`p-2.5 rounded-[14px] text-right transition-all ${
                                    active
                                      ? 'bg-white ring-2 ring-[#7B70E8]'
                                      : 'bg-white/65 hover:bg-white'
                                  }`}
                                >
                                  <div className="text-xs font-bold text-[#1C1C24] tabular-nums">
                                    {q.label}
                                  </div>
                                  <div className="text-[10.5px] text-[#8E8EA0]">{q.hint}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="bg-[#F6F6FA] rounded-[20px] p-4 space-y-2">
                            <div className="text-xs font-bold text-[#1C1C24]">دوره ریست سهمیه</div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {PERIOD_TILES.map((p) => {
                                const active = quotaPeriod === p.id;
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setQuotaPeriod(p.id)}
                                    className={`py-2 px-2 rounded-[14px] text-center transition-all ${
                                      active
                                        ? 'bg-[#7B70E8] text-white'
                                        : 'bg-white text-[#525264] hover:text-[#1C1C24]'
                                    }`}
                                  >
                                    <div className="text-xs font-bold">{p.label}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="bg-[#F6F6FA] rounded-[20px] p-4 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-[#1C1C24]">
                              <span className="inline-flex items-center gap-1.5">
                                <Gauge className="w-3.5 h-3.5 text-[#7B70E8]" />
                                سقف درخواست در دقیقه (RPM)
                              </span>
                              <span className="text-[#7B70E8] tabular-nums">
                                {toPersianDigits(rpmLimit)}/min
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5">
                              {RPM_PRESETS.map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setRpmLimit(val)}
                                  className={`py-1.5 rounded-full text-xs font-bold tabular-nums transition-colors ${
                                    rpmLimit === val
                                      ? 'bg-[#1E1E24] text-white'
                                      : 'bg-white text-[#525264] hover:text-[#1C1C24]'
                                  }`}
                                >
                                  {toPersianDigits(val)}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Animated Off-Peak Unlimited Switch Tile */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={offPeakUnlimited}
                        onClick={() => setOffPeakUnlimited((v) => !v)}
                        className={`w-full text-right flex items-center justify-between gap-4 p-4 rounded-[20px] transition-all ${
                          offPeakUnlimited
                            ? 'bg-[#F3F1FE] ring-1.5 ring-[#7B70E8]/45'
                            : 'bg-[#F6F6FA]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                              offPeakUnlimited
                                ? 'bg-[#7B70E8] text-white'
                                : 'bg-[#1E1E24] text-white'
                            }`}
                          >
                            <Moon className="w-4 h-4" />
                          </span>
                          <div>
                            <div className="text-xs font-bold text-[#1C1C24]">
                              حالت ساعات خلوت آزاد (Off-Peak Unlimited)
                            </div>
                            <div className="text-[11px] text-[#646476] mt-0.5">
                              ساعات ۲۲ تا ۰۷ بدون کسر از سهمیه برای بهره‌وری ۱۰۰٪ سخت‌افزار داخلی
                            </div>
                          </div>
                        </div>
                        <span
                          className={`w-11 h-6 rounded-full p-0.5 flex items-center transition-colors shrink-0 ${
                            offPeakUnlimited ? 'bg-[#7B70E8] justify-start' : 'bg-[#D5D5E2] justify-end'
                          }`}
                        >
                          <motion.span
                            layout
                            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                            className="w-5 h-5 rounded-full bg-white shadow-sm"
                          />
                        </span>
                      </button>

                      {/* Assign Teams Visual Tiles */}
                      <div className="space-y-3">
                        <div className="text-xs font-bold text-[#1C1C24]">
                          تخصیص سریع به واحدهای سازمانی (اختیاری)
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {TEAM_TILES.map((t) => {
                            const Icon = t.icon;
                            const active = selectedTeams.includes(t.name);
                            return (
                              <motion.button
                                key={t.name}
                                whileTap={{ scale: 0.96 }}
                                type="button"
                                onClick={() =>
                                  setSelectedTeams((prev) =>
                                    prev.includes(t.name)
                                      ? prev.filter((item) => item !== t.name)
                                      : [...prev, t.name]
                                  )
                                }
                                className={`p-3 rounded-[18px] text-right flex items-center gap-2 transition-all ${
                                  active
                                    ? 'bg-[#7B70E8] text-white shadow-[0_8px_18px_-8px_rgba(123,112,232,0.65)]'
                                    : 'bg-[#F6F6FA] text-[#1C1C24] hover:bg-[#EFEFF6]'
                                }`}
                              >
                                <span
                                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                    active ? 'bg-white/20 text-white' : 'bg-[#1E1E24] text-white'
                                  }`}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                </span>
                                <span className="text-[11px] font-bold truncate">{t.name}</span>
                              </motion.button>
                            );
                          })}
                        </div>

                        <div className="text-xs font-semibold text-[#525264] pt-1">
                          یا انتخاب مستقیم کاربران خاص
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto py-0.5">
                          {users.map((u) => {
                            const checked = selectedUserIds.includes(u.id);
                            return (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() =>
                                  setSelectedUserIds((prev) =>
                                    prev.includes(u.id)
                                      ? prev.filter((id) => id !== u.id)
                                      : [...prev, u.id]
                                  )
                                }
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                                  checked
                                    ? 'bg-[#1E1E24] text-white'
                                    : 'bg-[#F6F6FA] text-[#525264] hover:bg-[#EBEBF4]'
                                }`}
                              >
                                {checked && <Check className="w-3 h-3 text-[#A9A0F8]" />}
                                <span>{u.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Wizard Footer */}
              <div className="px-6 py-4 border-t border-[#F0F0F6] bg-[#FAFAFE] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    step === 1 ? setWizardOpen(false) : setStep((s) => (s - 1) as 1 | 2)
                  }
                  className="px-4 py-2 text-xs font-semibold text-[#646476] hover:text-[#1C1C24] rounded-full"
                >
                  {step === 1 ? 'انصراف' : 'مرحله قبل'}
                </button>

                {step < 3 ? (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={handleNextStep}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-[#1E1E24] hover:bg-[#32323D] rounded-full transition-colors"
                  >
                    ادامه به مرحله بعد
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={handleFinishWizard}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-[#7B70E8] hover:bg-[#6B5FE0] rounded-full transition-colors shadow-[0_8px_18px_-6px_rgba(123,112,232,0.55)]"
                  >
                    ذخیره و انتشار طرح دسترسی
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
