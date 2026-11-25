import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Ban,
  Briefcase,
  Check,
  CheckCircle2,
  Code2,
  Cpu,
  Crown,
  FlaskConical,
  Layers,
  LayoutGrid,
  List,
  PencilLine,
  Plus,
  Radio,
  RotateCcw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  User as UserIcon,
  X,
  Zap,
} from 'lucide-react';
import {
  AccessPlan,
  LocalModel,
  OrgUser,
  PriorityTier,
  TeamName,
  UserStatus,
} from '../../types';
import {
  filterUsers,
  formatTokenCount,
  getPriorityLabel,
  getQuotaPeriodLabel,
  getUserEffectiveAccess,
  tokensToApproximatePages,
  toPersianDigits,
} from '../../utils/logic';
import { SlotPipBar, SpeedSignalBars } from '../VisualPrimitives';

export interface UpdateUserPayload {
  name: string;
  email: string;
  team: TeamName;
  role: 'admin' | 'member';
  priorityTier: PriorityTier;
  planIds: string[];
  status: UserStatus;
  bonusDelta: number;
  concurrencyOverride: number | null;
}

interface AdminUsersProps {
  users: OrgUser[];
  plans: AccessPlan[];
  models: LocalModel[];
  highlightedUserId: string | null;
  onClearHighlight: () => void;
  onAddUser: (payload: {
    name: string;
    email: string;
    team: TeamName;
    role: 'admin' | 'member';
    planIds: string[];
    priorityTier: PriorityTier;
  }) => void;
  onUpdateUser: (userId: string, payload: UpdateUserPayload) => void;
  onToggleSuspend: (userId: string) => void;
  onResetQuota: (userId: string) => void;
}

const AVATAR_TONES = [
  'bg-[#1E1E24] text-white',
  'bg-[#7B70E8] text-white',
  'bg-[#323244] text-white',
  'bg-[#5D52D6] text-white',
];

const TEAM_CARDS: { name: TeamName; short: string; icon: typeof Code2 }[] = [
  { name: 'تیم بک‌اند', short: 'تیم بک‌اند', icon: Code2 },
  { name: 'تحقیق و توسعه (R&D)', short: 'تحقیق و توسعه', icon: FlaskConical },
  { name: 'پژوهش مخابرات', short: 'پژوهش مخابرات', icon: Radio },
  { name: 'مالی و اداری', short: 'مالی و اداری', icon: Briefcase },
];

const PRIORITY_TILES: {
  id: PriorityTier;
  title: string;
  short: string;
  sub: string;
  icon: typeof Crown;
}[] = [
  { id: 'vip', title: 'سطح ۱ · ویژه', short: 'ویژه (VIP)', sub: 'اولویت اول صف GPU', icon: Crown },
  { id: 'standard', title: 'سطح ۲ · استاندارد', short: 'استاندارد', sub: 'تعادل سرعت و ظرفیت', icon: Zap },
  { id: 'basic', title: 'سطح ۳ · عادی', short: 'عادی', sub: 'مصرف روزمره اداری', icon: Shield },
];

const BONUS_TILES = [
  { val: 0, label: 'بدون تغییر', sub: 'حفظ سهمیه فعلی' },
  { val: 1, label: '+۱M توکن', sub: 'تقویت موقت' },
  { val: 2, label: '+۲M توکن', sub: 'پیشنهادی اسپرینت' },
  { val: 5, label: '+۵M توکن', sub: 'پروژه سنگین' },
  { val: -1, label: '−۱M کاهش', sub: 'کنترل مصرف' },
];

export function AdminUsers({
  users,
  plans,
  models,
  highlightedUserId,
  onClearHighlight,
  onAddUser,
  onUpdateUser,
  onToggleSuspend,
  onResetQuota,
}: AdminUsersProps) {
  const [query, setQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(highlightedUserId);

  // Add user visual tile modal state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTeam, setNewTeam] = useState<TeamName>('تیم بک‌اند');
  const [newRole, setNewRole] = useState<'admin' | 'member'>('member');
  const [newPlanIds, setNewPlanIds] = useState<string[]>(plans[0] ? [plans[0].id] : []);
  const [newPriority, setNewPriority] = useState<PriorityTier>('standard');
  const [formError, setFormError] = useState('');

  // Full User Edit Studio draft state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTeam, setEditTeam] = useState<TeamName>('تیم بک‌اند');
  const [editRole, setEditRole] = useState<'admin' | 'member'>('member');
  const [editPriority, setEditPriority] = useState<PriorityTier>('standard');
  const [editPlanIds, setEditPlanIds] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<UserStatus>('active');
  const [editBonusMillions, setEditBonusMillions] = useState<number>(0);
  const [editConcurrency, setEditConcurrency] = useState<string>('auto');
  const [editError, setEditError] = useState('');

  const editingUser = useMemo(
    () => users.find((u) => u.id === editingUserId) ?? null,
    [users, editingUserId]
  );

  // Sync draft when entering user edit studio
  const loadEditDraft = (u: OrgUser) => {
    setEditName(u.name);
    setEditEmail(u.email);
    setEditTeam(u.team);
    setEditRole(u.role);
    setEditPriority(u.priorityTier);
    setEditPlanIds(u.planIds);
    setEditStatus(u.status);
    setEditBonusMillions(0);
    setEditConcurrency(u.concurrencyOverride !== null ? String(u.concurrencyOverride) : 'auto');
    setEditError('');
  };

  useEffect(() => {
    if (highlightedUserId) {
      const target = users.find((u) => u.id === highlightedUserId);
      if (target) {
        setEditingUserId(target.id);
        loadEditDraft(target);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedUserId]);

  const openUserEditPage = (u: OrgUser) => {
    setEditingUserId(u.id);
    loadEditDraft(u);
  };

  const closeUserEditPage = () => {
    setEditingUserId(null);
    onClearHighlight();
  };

  const filtered = useMemo(
    () => filterUsers(users, query, teamFilter, statusFilter),
    [users, query, teamFilter, statusFilter]
  );

  const liveSelectedPlans = plans.filter((p) => newPlanIds.includes(p.id));
  const previewConcurrency = liveSelectedPlans.reduce(
    (max, p) => Math.max(max, p.concurrencyLimit),
    0
  );
  const previewQuota = liveSelectedPlans.reduce((sum, p) => sum + p.tokenQuota, 0);

  // Live effective preview for the User Edit Studio
  const liveEditedUserPreview: OrgUser | null = useMemo(() => {
    if (!editingUser) return null;
    const concOverride =
      editStatus === 'suspended'
        ? 0
        : editConcurrency === 'auto'
          ? null
          : Math.max(1, Math.min(6, Number(editConcurrency) || 1));
    return {
      ...editingUser,
      name: editName.trim() || editingUser.name,
      email: editEmail.trim() || editingUser.email,
      team: editTeam,
      role: editRole,
      priorityTier: editPriority,
      planIds: editPlanIds,
      status: editStatus,
      quotaBonusTokens: editingUser.quotaBonusTokens + editBonusMillions * 1_000_000,
      concurrencyOverride: concOverride,
    };
  }, [
    editingUser,
    editName,
    editEmail,
    editTeam,
    editRole,
    editPriority,
    editPlanIds,
    editStatus,
    editBonusMillions,
    editConcurrency,
  ]);

  const liveEditEff = useMemo(() => {
    if (!liveEditedUserPreview) return null;
    return getUserEffectiveAccess(liveEditedUserPreview, plans, models);
  }, [liveEditedUserPreview, plans, models]);

  const handleSaveUserEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim() || !editEmail.trim() || !editEmail.includes('@')) {
      setEditError('نام کاربر و ایمیل سازمانی معتبر الزامی است.');
      return;
    }
    if (editPlanIds.length === 0) {
      setEditError('کاربر باید حداقل عضو یک طرح دسترسی باشد.');
      return;
    }
    const conc =
      editStatus === 'suspended'
        ? 0
        : editConcurrency === 'auto'
          ? null
          : Math.max(1, Math.min(6, Number(editConcurrency) || 1));

    onUpdateUser(editingUser.id, {
      name: editName.trim(),
      email: editEmail.trim().toLowerCase(),
      team: editTeam,
      role: editRole,
      priorityTier: editPriority,
      planIds: editPlanIds,
      status: editStatus,
      bonusDelta: editBonusMillions * 1_000_000,
      concurrencyOverride: conc,
    });
    setEditBonusMillions(0);
    setEditError('');
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newEmail.includes('@')) {
      setFormError('لطفاً نام کامل و ایمیل سازمانی معتبر وارد کنید.');
      return;
    }
    if (newPlanIds.length === 0) {
      setFormError('حداقل یک طرح دسترسی برای کاربر انتخاب کنید.');
      return;
    }
    onAddUser({
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      team: newTeam,
      role: newRole,
      planIds: newPlanIds,
      priorityTier: newPriority,
    });
    setNewName('');
    setNewEmail('');
    setFormError('');
    setAddModalOpen(false);
  };

  /* ============================================================================
     REDESIGNED FULL-PAGE USER EDIT & ACCESS STUDIO
     ============================================================================ */
  if (editingUser && liveEditedUserPreview && liveEditEff) {
    const initials = liveEditedUserPreview.name
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0])
      .join('');

    return (
      <motion.form
        key={`edit-studio-${editingUser.id}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onSubmit={handleSaveUserEdit}
        className="space-y-5"
      >
        {/* Top Studio Breadcrumb & Save Bar */}
        <div className="bg-[#F6F6FA] rounded-[24px] px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              type="button"
              onClick={closeUserEditPage}
              aria-label="بازگشت به فهرست کاربران"
              className="w-10 h-10 rounded-full bg-[#1E1E24] hover:bg-[#32323E] text-white flex items-center justify-center shrink-0 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </motion.button>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-[#7B70E8]">
                استودیو ویرایش و حاکمیت کاربر
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[#1C1C24] truncate">
                {liveEditedUserPreview.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => onResetQuota(editingUser.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-[#525264] bg-white hover:bg-[#EEECFC] hover:text-[#7B70E8] rounded-full transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ریست مصرف دوره</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#7B70E8] hover:bg-[#6B5FE0] rounded-full transition-colors whitespace-nowrap shadow-[0_10px_24px_-8px_rgba(123,112,232,0.65)]"
            >
              <Save className="w-4 h-4" />
              <span>ذخیره تغییرات کاربر</span>
            </motion.button>
          </div>
        </div>

        {editError && (
          <div className="p-4 rounded-[18px] bg-[#FEF2F2] text-xs font-bold text-[#DC2626] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{editError}</span>
          </div>
        )}

        {/* 12-Col Bento Split Workspace */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Right / Primary Editor Column (8 cols) */}
          <div className="xl:col-span-8 space-y-5">
            {/* Section 1: Identity & Live Account Status */}
            <section className="bg-[#F6F6FA] rounded-[26px] p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-full bg-[#1E1E24] text-white flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-[#1C1C24]">هویت و وضعیت حساب کاربری</h3>
                </div>

                {/* Animated 3-state Account Status Switcher */}
                <div
                  role="radiogroup"
                  aria-label="وضعیت حساب کاربر"
                  className="inline-flex items-center p-1 bg-white rounded-full"
                >
                  {(
                    [
                      { id: 'active', label: 'فعال', activeBg: 'bg-[#059669]' },
                      { id: 'throttled', label: 'محدود (۱ اسلات)', activeBg: 'bg-[#D97706]' },
                      { id: 'suspended', label: 'مسدود آنی', activeBg: 'bg-[#DC2626]' },
                    ] as const
                  ).map((st) => {
                    const active = editStatus === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          setEditStatus(st.id);
                          if (st.id === 'throttled') setEditConcurrency('1');
                          if (st.id === 'active' && editConcurrency === '0') setEditConcurrency('auto');
                        }}
                        className={`relative px-3.5 py-1.5 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${
                          active ? 'text-white' : 'text-[#646476] hover:text-[#1C1C24]'
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="edit-user-status-pill"
                            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                            className={`absolute inset-0 rounded-full ${st.activeBg}`}
                          />
                        )}
                        <span className="relative z-10">{st.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-[20px] p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-user-name" className="block text-xs font-bold text-[#525264] mb-1.5">
                    نام و نام خانوادگی
                  </label>
                  <input
                    id="edit-user-name"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-[#F6F6FA] rounded-[16px] text-[#1C1C24] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B70E8]/35"
                  />
                </div>
                <div>
                  <label htmlFor="edit-user-email" className="block text-xs font-bold text-[#525264] mb-1.5">
                    ایمیل سازمانی
                  </label>
                  <input
                    id="edit-user-email"
                    type="email"
                    dir="ltr"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm font-mono text-left bg-[#F6F6FA] rounded-[16px] text-[#1C1C24] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B70E8]/35"
                  />
                </div>
              </div>
            </section>

            {/* Section 2: Team, GPU Priority & Role Visual Tiles */}
            <section className="bg-[#F6F6FA] rounded-[26px] p-5 sm:p-6 space-y-5">
              <div>
                <div className="text-xs font-bold text-[#1C1C24] mb-2.5">
                  واحد سازمانی (دپارتمان)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {TEAM_CARDS.map((tc) => {
                    const Icon = tc.icon;
                    const active = editTeam === tc.name;
                    return (
                      <motion.button
                        key={tc.name}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={() => setEditTeam(tc.name)}
                        className={`p-3.5 rounded-[20px] text-right flex flex-col gap-3 transition-all ${
                          active
                            ? 'bg-white ring-2 ring-[#7B70E8] shadow-[0_10px_22px_-12px_rgba(123,112,232,0.45)]'
                            : 'bg-white/65 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                              active ? 'bg-[#7B70E8] text-white' : 'bg-[#1E1E24] text-white'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </span>
                          {active && (
                            <span className="w-5 h-5 rounded-full bg-[#7B70E8] text-white flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-[#1C1C24] truncate">{tc.short}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">
                <div className="md:col-span-8">
                  <div className="text-xs font-bold text-[#1C1C24] mb-2.5">اولویت صف GPU داخلی</div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {PRIORITY_TILES.map((pt) => {
                      const Icon = pt.icon;
                      const active = editPriority === pt.id;
                      return (
                        <motion.button
                          key={pt.id}
                          whileTap={{ scale: 0.97 }}
                          type="button"
                          onClick={() => setEditPriority(pt.id)}
                          className={`p-3.5 rounded-[20px] text-right transition-all ${
                            active
                              ? 'bg-[#1E1E24] text-white shadow-[0_10px_22px_-10px_rgba(28,28,36,0.45)]'
                              : 'bg-white text-[#1C1C24] hover:bg-white/90'
                          }`}
                        >
                          <span
                            className={`w-8 h-8 rounded-full flex items-center justify-center mb-2.5 ${
                              active ? 'bg-[#7B70E8] text-white' : 'bg-[#F3F1FE] text-[#7B70E8]'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </span>
                          <div className="text-xs font-bold">{pt.short}</div>
                          <div
                            className={`text-[10.5px] mt-0.5 leading-snug ${
                              active ? 'text-white/70' : 'text-[#8E8EA0]'
                            }`}
                          >
                            {pt.sub}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div className="md:col-span-4">
                  <div className="text-xs font-bold text-[#1C1C24] mb-2.5">نقش دسترسی پنل</div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {(
                      [
                        { id: 'member', label: 'عضو تیم (کاربر نهایی)', icon: UserIcon },
                        { id: 'admin', label: 'مدیر زیرساخت (ادمین)', icon: ShieldCheck },
                      ] as const
                    ).map((r) => {
                      const Icon = r.icon;
                      const active = editRole === r.id;
                      return (
                        <motion.button
                          key={r.id}
                          whileTap={{ scale: 0.97 }}
                          type="button"
                          onClick={() => setEditRole(r.id)}
                          className={`p-3.5 rounded-[20px] text-xs font-bold flex items-center justify-between gap-2 transition-all ${
                            active
                              ? 'bg-[#7B70E8] text-white shadow-[0_8px_18px_-6px_rgba(123,112,232,0.55)]'
                              : 'bg-white text-[#525264] hover:text-[#1C1C24]'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <span
                              className={`w-7 h-7 rounded-full flex items-center justify-center ${
                                active ? 'bg-white/20 text-white' : 'bg-[#F5F5FA] text-[#1C1C24]'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </span>
                            <span>{r.label}</span>
                          </span>
                          {active && <Check className="w-4 h-4 shrink-0" />}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Assigned Access Plans (Multi-Select Cards) */}
            <section className="bg-[#F6F6FA] rounded-[26px] p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-full bg-[#7B70E8] text-white flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-[#1C1C24]">
                    طرح‌های دسترسی متصل به کاربر
                  </h3>
                </div>
                <span className="text-xs font-bold text-[#7B70E8] tabular-nums">
                  {toPersianDigits(editPlanIds.length)} طرح انتخاب‌شده
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {plans.map((plan) => {
                  const checked = editPlanIds.includes(plan.id);
                  return (
                    <motion.button
                      key={plan.id}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() =>
                        setEditPlanIds((prev) =>
                          prev.includes(plan.id)
                            ? prev.filter((id) => id !== plan.id)
                            : [...prev, plan.id]
                        )
                      }
                      className={`p-4 rounded-[22px] text-right transition-all flex flex-col justify-between gap-3 ${
                        checked
                          ? 'bg-white ring-2 ring-[#7B70E8] shadow-[0_10px_22px_-12px_rgba(123,112,232,0.45)]'
                          : 'bg-white/65 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-[#1C1C24]">{plan.name}</div>
                          <div className="text-[11px] text-[#8E8EA0] mt-0.5">
                            {toPersianDigits(plan.allowedModelIds.length)} مدل داخلی
                          </div>
                        </div>
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            checked
                              ? 'bg-[#7B70E8] text-white'
                              : 'bg-[#F2F2F8] text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      </div>
                      <div className="pt-2 border-t border-[#F2F2F8] flex items-center justify-between text-[11px] font-semibold text-[#525264] tabular-nums">
                        <span>{formatTokenCount(plan.tokenQuota)}</span>
                        <span>سقف {toPersianDigits(plan.concurrencyLimit)} همزمان</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </section>

            {/* Section 4: Quota Bonus & Concurrency Guardrail Override */}
            <section className="bg-[#F6F6FA] rounded-[26px] p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-[#1E1E24] text-white flex items-center justify-center shrink-0">
                  <Sliders className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-[#1C1C24]">
                  تعدیل سهمیه و گاردریل اختصاصی (Overrides)
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-xs font-bold text-[#1C1C24] mb-2">
                    افزایش یا کاهش آنی سهمیه توکن دوره
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {BONUS_TILES.map((b) => {
                      const active = editBonusMillions === b.val;
                      return (
                        <motion.button
                          key={b.val}
                          whileTap={{ scale: 0.96 }}
                          type="button"
                          onClick={() => setEditBonusMillions(b.val)}
                          className={`p-3 rounded-[18px] text-right transition-all ${
                            active
                              ? 'bg-[#7B70E8] text-white shadow-[0_8px_18px_-6px_rgba(123,112,232,0.55)]'
                              : 'bg-white text-[#1C1C24] hover:bg-white/90'
                          }`}
                        >
                          <div className="text-xs font-bold tabular-nums">{b.label}</div>
                          <div
                            className={`text-[10px] mt-0.5 ${
                              active ? 'text-white/75' : 'text-[#8E8EA0]'
                            }`}
                          >
                            {b.sub}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-[#1C1C24] mb-2">
                    سقف اختصاصی درخواست همزمان (ضد Multi-Agent)
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { id: 'auto', label: 'خودکار (طرح)' },
                      { id: '1', label: '۱ اسلات' },
                      { id: '2', label: '۲ اسلات' },
                      { id: '3', label: '۳ اسلات' },
                      { id: '4', label: '۴ اسلات' },
                      { id: '6', label: '۶ اسلات' },
                    ].map((opt) => {
                      const active = editConcurrency === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setEditConcurrency(opt.id)}
                          className={`py-2.5 px-2 rounded-full text-xs font-bold tabular-nums transition-all ${
                            active
                              ? 'bg-[#1E1E24] text-white'
                              : 'bg-white text-[#525264] hover:text-[#1C1C24]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Left / Live Effective Telemetry Column (4 cols) */}
          <aside className="xl:col-span-4 space-y-4">
            {/* Dark Live User Identity & Effective Telemetry Card */}
            <div className="rounded-[26px] bg-gradient-to-br from-[#1E1E24] via-[#252436] to-[#2F2B4B] p-5 text-white space-y-5 shadow-[0_18px_40px_-16px_rgba(28,28,36,0.4)]">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-full bg-[#7B70E8] text-white text-base font-bold flex items-center justify-center shrink-0 shadow-[0_8px_20px_-6px_rgba(123,112,232,0.8)]">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="text-base font-bold truncate">{liveEditedUserPreview.name}</div>
                  <div dir="ltr" className="font-mono text-[11px] text-white/65 text-right truncate mt-0.5">
                    {liveEditedUserPreview.email}
                  </div>
                  <div className="text-[11px] text-[#C5BEFF] mt-1 font-semibold">
                    {liveEditedUserPreview.team} · {getPriorityLabel(liveEditedUserPreview.priorityTier)}
                  </div>
                </div>
              </div>

              {/* Live Computed Stats Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-[18px] bg-white/8 p-3.5 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between text-[11px] text-white/60">
                    <span>همزمانی نهایی</span>
                    <span className="font-bold text-white tabular-nums">
                      {toPersianDigits(editingUser.activeConcurrency)}/{toPersianDigits(liveEditEff.effectiveConcurrency)}
                    </span>
                  </div>
                  <SlotPipBar
                    active={editingUser.activeConcurrency}
                    max={Math.max(1, liveEditEff.effectiveConcurrency)}
                    dark
                    showLabel={false}
                  />
                </div>
                <div className="rounded-[18px] bg-white/8 p-3.5">
                  <div className="text-[11px] text-white/60">درخواست‌های امروز</div>
                  <div className="text-lg font-bold tabular-nums mt-1 text-white">
                    {toPersianDigits(editingUser.requestsToday)}
                  </div>
                  <div className="text-[10.5px] text-white/55 mt-0.5 truncate">
                    {editingUser.lastActive}
                  </div>
                </div>
              </div>

              {/* Live Animated Quota Bar */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs tabular-nums">
                  <span className="text-white/70">
                    سهمیه {getQuotaPeriodLabel(liveEditEff.quotaPeriod)}
                  </span>
                  <span className="font-bold">
                    {formatTokenCount(editingUser.tokensUsed)} از{' '}
                    <span className="text-[#B8B0FF]">{formatTokenCount(liveEditEff.totalQuota)}</span>
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-white/12 overflow-hidden">
                  <motion.div
                    animate={{ width: `${liveEditEff.usagePercent}%` }}
                    transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                    className={`h-full rounded-full ${
                      liveEditEff.usagePercent >= 85
                        ? 'bg-[#FB7185]'
                        : liveEditEff.usagePercent >= 65
                          ? 'bg-[#FBBF24]'
                          : 'bg-[#8E83F5]'
                    }`}
                  />
                </div>
                <div className="text-[11px] text-white/65 tabular-nums flex items-center justify-between">
                  <span>
                    باقی‌مانده: {formatTokenCount(liveEditEff.remainingTokens)} توکن
                  </span>
                  <span>
                    ≈ {toPersianDigits(tokensToApproximatePages(liveEditEff.remainingTokens))} صفحه
                  </span>
                </div>
              </div>
            </div>

            {/* Live Effective Models Card */}
            <div className="bg-[#F6F6FA] rounded-[26px] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#1C1C24]">
                  پیش‌نمایش زنده مدل‌های مجاز ({toPersianDigits(liveEditEff.allowedModels.length)})
                </h3>
                <span className="text-[11px] font-semibold text-[#059669]">۱۰۰٪ داخلی</span>
              </div>

              {liveEditEff.allowedModels.length === 0 ? (
                <div className="bg-white rounded-[18px] p-4 text-xs text-[#DC2626] font-semibold text-center">
                  حداقل یک طرح دسترسی انتخاب کنید تا مدل‌ها فعال شوند
                </div>
              ) : (
                <ul className="space-y-2">
                  {liveEditEff.allowedModels.map((m) => (
                    <li
                      key={m.id}
                      className="bg-white rounded-[18px] p-3.5 flex items-center gap-3"
                    >
                      <span className="w-8 h-8 rounded-full bg-[#1E1E24] text-white flex items-center justify-center shrink-0">
                        <Cpu className="w-3.5 h-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[#1C1C24] truncate">
                          {m.displayName}
                        </div>
                        <div
                          dir="ltr"
                          className="font-mono text-[10.5px] text-[#8E8EA0] text-right truncate mt-0.5"
                        >
                          {m.modelId}
                        </div>
                      </div>
                      <SpeedSignalBars tps={m.tpsAvg} compact />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </motion.form>
    );
  }

  /* ============================================================================
     MAIN USERS & TEAMS DIRECTORY VIEW
     ============================================================================ */
  return (
    <div className="space-y-5">
      {/* Interactive Team Visual Filter Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {TEAM_CARDS.map((tc) => {
          const Icon = tc.icon;
          const teamUsers = users.filter((u) => u.team === tc.name);
          const teamTokens = teamUsers.reduce((s, u) => s + u.tokensUsed, 0);
          const active = teamFilter === tc.name;

          return (
            <motion.button
              key={tc.name}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setTeamFilter(active ? 'all' : tc.name)}
              className={`rounded-[22px] p-4 text-right flex items-center justify-between gap-3 transition-all ${
                active
                  ? 'bg-[#7B70E8] text-white shadow-[0_12px_26px_-10px_rgba(123,112,232,0.65)]'
                  : 'bg-[#F6F6FA] hover:bg-[#EFEFF7] text-[#1C1C24]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    active ? 'bg-white/20 text-white' : 'bg-[#1E1E24] text-white'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{tc.short}</div>
                  <div
                    className={`text-[11px] tabular-nums mt-0.5 ${
                      active ? 'text-white/80' : 'text-[#8E8EA0]'
                    }`}
                  >
                    {toPersianDigits(teamUsers.length)} عضو · {formatTokenCount(teamTokens)}
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Filter, View Switcher & Add User Bar */}
      <div className="bg-[#F6F6FA] rounded-[24px] p-3.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8E8EA0] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی نام، ایمیل یا واحد سازمانی..."
            aria-label="جستجوی کاربران"
            className="w-full pr-11 pl-4 py-2.5 text-sm bg-white rounded-full text-[#1C1C24] placeholder:text-[#9898AA] focus:outline-none focus:ring-2 focus:ring-[#7B70E8]/30 shadow-[0_2px_10px_-4px_rgba(28,28,36,0.06)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="tablist"
            aria-label="فیلتر وضعیت کاربر"
            className="inline-flex items-center p-1 bg-white rounded-full shadow-[0_2px_10px_-4px_rgba(28,28,36,0.06)]"
          >
            {(
              [
                { id: 'all', label: 'همه' },
                { id: 'active', label: 'فعال' },
                { id: 'throttled', label: 'محدود' },
                { id: 'suspended', label: 'مسدود' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={statusFilter === tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`relative px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'text-white'
                    : 'text-[#646476] hover:text-[#1C1C24]'
                }`}
              >
                {statusFilter === tab.id && (
                  <motion.span
                    layoutId="users-status-filter-pill"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-[#1E1E24]"
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Cards vs Table Toggle */}
          <div className="inline-flex items-center p-1 bg-white rounded-full">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              aria-label="نمای کارتی"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                viewMode === 'cards' ? 'bg-[#7B70E8] text-white' : 'text-[#8E8EA0] hover:text-[#1C1C24]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="نمای جدولی"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                viewMode === 'table' ? 'bg-[#7B70E8] text-white' : 'text-[#8E8EA0] hover:text-[#1C1C24]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#7B70E8] hover:bg-[#6B5FE0] rounded-full transition-colors whitespace-nowrap shrink-0 shadow-[0_8px_18px_-6px_rgba(123,112,232,0.55)]"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن کاربر</span>
          </motion.button>
        </div>
      </div>

      {/* Users Deck: Live Cards or Crisp Table */}
      {filtered.length === 0 ? (
        <div className="bg-[#F6F6FA] rounded-[26px] p-5">
          <div className="bg-white rounded-[22px] py-16 px-6 text-center">
            <p className="text-sm font-bold text-[#1C1C24]">
              هیچ کاربری با فیلترهای انتخاب‌شده پیدا نشد
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setTeamFilter('all');
                setStatusFilter('all');
              }}
              className="mt-4 px-5 py-2 text-xs font-bold text-white bg-[#1E1E24] rounded-full"
            >
              پاک کردن فیلترها
            </button>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((user, idx) => {
            const eff = getUserEffectiveAccess(user, plans, models);
            const isSuspended = user.status === 'suspended';
            const initials = user.name
              .split(' ')
              .slice(0, 2)
              .map((part) => part[0])
              .join('');

            return (
              <motion.article
                key={user.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, delay: idx * 0.02 }}
                whileHover={{ y: -3 }}
                className="bg-[#F6F6FA] rounded-[26px] p-5 flex flex-col justify-between gap-4 transition-all"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openUserEditPage(user)}
                      className="flex items-center gap-3 text-right group min-w-0"
                    >
                      <span
                        className={`w-11 h-11 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                          AVATAR_TONES[idx % AVATAR_TONES.length]
                        }`}
                      >
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#1C1C24] group-hover:text-[#7B70E8] transition-colors truncate flex items-center gap-1.5">
                          <span>{user.name}</span>
                          {user.role === 'admin' && (
                            <span className="text-[10px] font-bold text-[#7B70E8]">· ادمین</span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#8E8EA0] truncate mt-0.5">
                          {user.team} · {getPriorityLabel(user.priorityTier)}
                        </div>
                      </div>
                    </button>

                    <span
                      className={`text-[11px] font-bold whitespace-nowrap ${
                        user.status === 'active'
                          ? 'text-[#059669]'
                          : user.status === 'throttled'
                            ? 'text-[#D97706]'
                            : 'text-[#DC2626]'
                      }`}
                    >
                      {user.status === 'active'
                        ? 'فعال'
                        : user.status === 'throttled'
                          ? 'محدود'
                          : 'مسدود'}
                    </span>
                  </div>

                  {/* White Inner Telemetry Island */}
                  <div className="bg-white rounded-[18px] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-xs tabular-nums">
                      <span className="text-[#8E8EA0]">سهمیه دوره</span>
                      <span className="font-bold text-[#1C1C24]">
                        {formatTokenCount(user.tokensUsed)} / {formatTokenCount(eff.totalQuota)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full hatched-track overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${eff.usagePercent}%` }}
                        transition={{ duration: 0.45 }}
                        className={`h-full rounded-full ${
                          eff.usagePercent >= 85
                            ? 'bg-[#EF4444]'
                            : eff.usagePercent >= 65
                              ? 'bg-[#F59E0B]'
                              : 'bg-[#7B70E8]'
                        }`}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#646476] pt-0.5">
                      <SlotPipBar
                        active={user.activeConcurrency}
                        max={Math.max(1, eff.effectiveConcurrency)}
                      />
                      <span className="truncate max-w-[140px] font-medium">
                        {eff.plans[0]?.name ?? 'بدون طرح'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      type="button"
                      onClick={() => openUserEditPage(user)}
                      aria-label={`ویرایش کاربر ${user.name}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1E1E24] hover:bg-[#7B70E8] text-white text-xs font-bold transition-colors"
                    >
                      <PencilLine className="w-3.5 h-3.5" />
                      <span>ویرایش و مدیریت</span>
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={() => onResetQuota(user.id)}
                      aria-label={`ریست سهمیه ${user.name}`}
                      title="ریست سهمیه"
                      className="w-8 h-8 rounded-full bg-white text-[#7B70E8] hover:bg-[#7B70E8] hover:text-white flex items-center justify-center transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    type="button"
                    onClick={() => onToggleSuspend(user.id)}
                    aria-label={isSuspended ? `فعال‌سازی ${user.name}` : `تعلیق آنی ${user.name}`}
                    className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors inline-flex items-center gap-1 ${
                      isSuspended
                        ? 'bg-[#ECFDF5] text-[#059669] hover:bg-[#D1FAE5]'
                        : 'bg-white text-[#DC2626] hover:bg-[#FEF2F2]'
                    }`}
                  >
                    {isSuspended ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>فعال‌سازی</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-3.5 h-3.5" />
                        <span>تعلیق</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.article>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#F6F6FA] rounded-[26px] p-4 sm:p-5">
          <div className="bg-white rounded-[22px] overflow-hidden shadow-[0_2px_12px_-6px_rgba(28,28,36,0.06)]">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-[#F0F0F6] text-xs font-semibold text-[#8E8EA0]">
                    <th className="py-4 px-5">کاربر</th>
                    <th className="py-4 px-4">واحد و طرح</th>
                    <th className="py-4 px-4">همزمانی</th>
                    <th className="py-4 px-4">سهمیه مصرفی</th>
                    <th className="py-4 px-4">وضعیت</th>
                    <th className="py-4 px-5 text-left">مداخله سریع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F4F9] text-sm">
                  {filtered.map((user, idx) => {
                    const eff = getUserEffectiveAccess(user, plans, models);
                    const isSuspended = user.status === 'suspended';
                    return (
                      <tr
                        key={user.id}
                        onClick={() => openUserEditPage(user)}
                        className="hover:bg-[#FAFAFE] cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3 text-right">
                            <span
                              className={`w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                                AVATAR_TONES[idx % AVATAR_TONES.length]
                              }`}
                            >
                              {user.name.slice(0, 2)}
                            </span>
                            <div>
                              <div className="font-bold text-[#1C1C24]">{user.name}</div>
                              <div dir="ltr" className="font-mono text-[11px] text-[#8E8EA0] text-right">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <div className="font-bold text-[#1C1C24]">{user.team}</div>
                          <div className="text-[11px] text-[#8E8EA0]">
                            {eff.plans.map((p) => p.name).join(' · ')}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <SlotPipBar
                            active={user.activeConcurrency}
                            max={Math.max(1, eff.effectiveConcurrency)}
                          />
                        </td>
                        <td className="py-3.5 px-4 min-w-[160px] text-xs tabular-nums">
                          <div className="flex justify-between mb-1">
                            <span className="font-bold">{formatTokenCount(user.tokensUsed)}</span>
                            <span className="text-[#8E8EA0]">{formatTokenCount(eff.totalQuota)}</span>
                          </div>
                          <div className="h-2 rounded-full hatched-track overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#7B70E8]"
                              style={{ width: `${eff.usagePercent}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-bold">
                          <span
                            className={
                              user.status === 'active'
                                ? 'text-[#059669]'
                                : user.status === 'throttled'
                                  ? 'text-[#D97706]'
                                  : 'text-[#DC2626]'
                            }
                          >
                            {user.status === 'active'
                              ? 'فعال'
                              : user.status === 'throttled'
                                ? 'محدود'
                                : 'مسدود'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-left">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openUserEditPage(user);
                              }}
                              aria-label={`ویرایش کاربر ${user.name}`}
                              className="px-3 py-1.5 text-xs font-bold rounded-full bg-[#1E1E24] hover:bg-[#7B70E8] text-white transition-colors"
                            >
                              ویرایش
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleSuspend(user.id);
                              }}
                              className={`px-3 py-1.5 text-xs font-bold rounded-full ${
                                isSuspended
                                  ? 'bg-[#ECFDF5] text-[#059669]'
                                  : 'bg-[#FEF2F2] text-[#DC2626]'
                              }`}
                            >
                              {isSuspended ? 'فعال‌سازی' : 'تعلیق'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Visual Tile "Add User" Studio Modal */}
      <AnimatePresence>
        {addModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAddModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1C24]/40 backdrop-blur-[4px]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 14 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              role="dialog"
              aria-modal="true"
              aria-label="افزودن کاربر جدید"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white rounded-[30px] shadow-[0_28px_80px_-15px_rgba(28,28,36,0.35)] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-[#F0F0F6] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#7B70E8] text-white flex items-center justify-center">
                    <Plus className="w-4.5 h-4.5" />
                  </div>
                  <h2 className="text-base font-bold text-[#1C1C24]">دعوت و تعریف کاربر جدید</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  aria-label="بستن پنجره افزودن کاربر"
                  className="w-8 h-8 rounded-full bg-[#F5F5FA] text-[#646476] hover:text-[#1C1C24] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-6 space-y-5 overflow-y-auto flex-1">
                {formError && (
                  <div className="p-3.5 rounded-[16px] bg-[#FEF2F2] text-xs font-bold text-[#DC2626]">
                    {formError}
                  </div>
                )}

                {/* Live Interactive Identity Preview Card */}
                <div className="rounded-[22px] bg-gradient-to-br from-[#1E1E24] to-[#2F2E41] p-4 text-white flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-[#7B70E8] text-white text-sm font-bold flex items-center justify-center shrink-0">
                      {newName.trim() ? newName.trim().slice(0, 2) : 'کا'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">
                        {newName.trim() || 'نام کاربر جدید'}
                      </div>
                      <div className="text-xs text-white/70 truncate mt-0.5">
                        {newTeam} · {getPriorityLabel(newPriority)} ·{' '}
                        {newRole === 'admin' ? 'ادمین' : 'عضو تیم'}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0 tabular-nums">
                    <div className="text-sm font-bold text-[#A9A0F8]">
                      {formatTokenCount(previewQuota)}
                    </div>
                    <SlotPipBar
                      active={0}
                      max={Math.max(1, previewConcurrency)}
                      dark
                    />
                  </div>
                </div>

                {/* Name & Email clean inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="user-name-input"
                      className="block text-xs font-bold text-[#1C1C24] mb-1.5"
                    >
                      نام و نام خانوادگی
                    </label>
                    <input
                      id="user-name-input"
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="مثلاً: رضا اکبری"
                      className="w-full px-4 py-2.5 text-sm bg-[#F6F6FA] rounded-[16px] text-[#1C1C24] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B70E8]/35"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="user-email-input"
                      className="block text-xs font-bold text-[#1C1C24] mb-1.5"
                    >
                      ایمیل سازمانی
                    </label>
                    <input
                      id="user-email-input"
                      type="email"
                      dir="ltr"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="r.akbari@madar-eng.ir"
                      className="w-full px-4 py-2.5 text-sm font-mono bg-[#F6F6FA] rounded-[16px] text-left text-[#1C1C24] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B70E8]/35"
                    />
                  </div>
                </div>

                {/* Visual Team Selector Tiles (2x2) */}
                <div>
                  <div className="text-xs font-bold text-[#1C1C24] mb-2">۱. واحد سازمانی را انتخاب کنید</div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {TEAM_CARDS.map((tc) => {
                      const Icon = tc.icon;
                      const active = newTeam === tc.name;
                      return (
                        <motion.button
                          key={tc.name}
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setNewTeam(tc.name)}
                          className={`p-3 rounded-[18px] text-right flex items-center justify-between gap-2 transition-all ${
                            active
                              ? 'bg-[#F3F1FE] ring-2 ring-[#7B70E8]'
                              : 'bg-[#F6F6FA] hover:bg-[#EFEFF6]'
                          }`}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                active ? 'bg-[#7B70E8] text-white' : 'bg-[#1E1E24] text-white'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </span>
                            <span className="text-xs font-bold text-[#1C1C24] truncate">
                              {tc.name}
                            </span>
                          </span>
                          {active && <Check className="w-4 h-4 text-[#7B70E8] shrink-0" />}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Visual Priority & Role Tiles */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-8">
                    <div className="text-xs font-bold text-[#1C1C24] mb-2">۲. اولویت صف GPU</div>
                    <div className="grid grid-cols-3 gap-2">
                      {PRIORITY_TILES.map((pt) => {
                        const Icon = pt.icon;
                        const active = newPriority === pt.id;
                        return (
                          <button
                            key={pt.id}
                            type="button"
                            onClick={() => setNewPriority(pt.id)}
                            className={`p-3 rounded-[18px] text-right transition-all ${
                              active
                                ? 'bg-[#1E1E24] text-white'
                                : 'bg-[#F6F6FA] text-[#1C1C24] hover:bg-[#EFEFF6]'
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 mb-1.5 ${
                                active ? 'text-[#A9A0F8]' : 'text-[#7B70E8]'
                              }`}
                            />
                            <div className="text-xs font-bold">{pt.short}</div>
                            <div
                              className={`text-[10px] mt-0.5 ${
                                active ? 'text-white/70' : 'text-[#8E8EA0]'
                              }`}
                            >
                              {pt.sub}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="sm:col-span-4">
                    <div className="text-xs font-bold text-[#1C1C24] mb-2">۳. نقش سامانه</div>
                    <div className="grid grid-cols-1 gap-2">
                      {(
                        [
                          { id: 'member', label: 'کاربر تیم', icon: UserIcon },
                          { id: 'admin', label: 'ادمین سامانه', icon: ShieldCheck },
                        ] as const
                      ).map((r) => {
                        const Icon = r.icon;
                        const active = newRole === r.id;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setNewRole(r.id)}
                            className={`px-3.5 py-2.5 rounded-[16px] text-xs font-bold flex items-center justify-between transition-all ${
                              active
                                ? 'bg-[#7B70E8] text-white'
                                : 'bg-[#F6F6FA] text-[#525264] hover:bg-[#EFEFF6]'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <Icon className="w-3.5 h-3.5" />
                              <span>{r.label}</span>
                            </span>
                            {active && <Check className="w-3.5 h-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Visual Plan Selection Tiles */}
                <div>
                  <div className="text-xs font-bold text-[#1C1C24] mb-2">
                    ۴. تخصیص طرح‌های دسترسی (امکان انتخاب چند طرح)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {plans.map((plan) => {
                      const checked = newPlanIds.includes(plan.id);
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() =>
                            setNewPlanIds((prev) =>
                              prev.includes(plan.id)
                                ? prev.filter((id) => id !== plan.id)
                                : [...prev, plan.id]
                            )
                          }
                          className={`p-3.5 rounded-[20px] text-right transition-all flex flex-col justify-between gap-2 ${
                            checked
                              ? 'bg-[#F3F1FE] ring-2 ring-[#7B70E8]'
                              : 'bg-[#F6F6FA] hover:bg-[#EFEFF6]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-[#1C1C24]">{plan.name}</span>
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                checked ? 'bg-[#7B70E8] text-white' : 'bg-white text-transparent'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                            </span>
                          </div>
                          <div className="text-[11px] text-[#646476] tabular-nums">
                            {toPersianDigits(plan.concurrencyLimit)} همزمان ·{' '}
                            {formatTokenCount(plan.tokenQuota)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F0F0F6] flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#646476] hover:text-[#1C1C24] rounded-full"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-bold text-white bg-[#7B70E8] hover:bg-[#6B5FE0] rounded-full transition-colors shadow-[0_8px_18px_-6px_rgba(123,112,232,0.55)]"
                  >
                    ایجاد حساب کاربری
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
