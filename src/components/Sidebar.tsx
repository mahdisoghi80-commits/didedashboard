import { motion } from 'motion/react';
import {
  Activity,
  ChevronLeft,
  Cpu,
  GitBranch,
  KeyRound,
  Layers,
  LayoutDashboard,
  MessageSquare,
  ScrollText,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { AdminTab, GatewaySettings, OrgUser, RoleMode, UserTab } from '../types';
import { toPersianDigits } from '../utils/logic';

interface SidebarProps {
  roleMode: RoleMode;
  onChangeRoleMode: (role: RoleMode) => void;
  adminTab: AdminTab;
  onSelectAdminTab: (tab: AdminTab) => void;
  userTab: UserTab;
  onSelectUserTab: (tab: UserTab) => void;
  settings: GatewaySettings;
  users: OrgUser[];
  activeDemoUserId: string;
  onChangeDemoUser: (id: string) => void;
  pendingRequestsCount: number;
  activeGuardrailsCount?: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface AdminNavGroup {
  title: string;
  items: {
    id: AdminTab;
    label: string;
    icon: typeof LayoutDashboard;
    count?: number;
  }[];
}

export function Sidebar({
  roleMode,
  onChangeRoleMode,
  adminTab,
  onSelectAdminTab,
  userTab,
  onSelectUserTab,
  settings,
  users,
  activeDemoUserId,
  onChangeDemoUser,
  pendingRequestsCount,
  activeGuardrailsCount,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const activeDemoUser = users.find((u) => u.id === activeDemoUserId) ?? users[0];

  const adminNavGroups: AdminNavGroup[] = [
    {
      title: 'عملیات و پایش',
      items: [
        { id: 'overview', label: 'داشبورد وضعیت', icon: Activity },
        { id: 'logs', label: 'لاگ‌ها و ممیزی', icon: ScrollText },
      ],
    },
    {
      title: 'زیرساخت و امنیت',
      items: [
        { id: 'sources', label: 'منابع مدل', icon: Server },
        { id: 'routing', label: 'مسیریابی و پایداری', icon: GitBranch },
        {
          id: 'guardrails',
          label: 'گاردریل و امنیت',
          icon: ShieldAlert,
          count: activeGuardrailsCount,
        },
      ],
    },
    {
      title: 'دسترسی و سازمان',
      items: [
        { id: 'plans', label: 'طرح‌های دسترسی', icon: Layers },
        { id: 'users', label: 'کاربران و تیم‌ها', icon: Users },
        { id: 'vault', label: 'کلیدهای سازمانی', icon: KeyRound },
        { id: 'settings', label: 'تنظیمات درگاه', icon: Settings, count: pendingRequestsCount },
      ],
    },
  ];

  const userNav: { id: UserTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'داشبورد و مدل‌ها', icon: LayoutDashboard },
    { id: 'keys', label: 'کلیدهای API و اتصال', icon: KeyRound },
    { id: 'chat', label: 'چت آزمایشی سریع', icon: MessageSquare },
  ];

  const content = (
    <aside
      aria-label="منوی اصلی سامانه"
      className="h-full w-[256px] bg-white flex flex-col px-4 py-5 select-none"
    >
      {/* Circular Dropify-style Brand Lockup */}
      <div className="px-2 pb-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-[#7B70E8] text-white flex items-center justify-center shrink-0 shadow-[0_6px_16px_-4px_rgba(123,112,232,0.55)]">
            <Cpu className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[15.5px] font-bold text-[#1C1C24] truncate leading-tight">
              {settings.orgName}
            </div>
            <div className="text-[11px] text-[#8E8EA0] truncate mt-0.5">
              درگاه هوش داخلی
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="بستن منو"
          className="lg:hidden p-1.5 text-[#7B7B8F] hover:text-[#1C1C24] rounded-full"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation with smooth animated layoutId sliding capsule */}
      <nav className="flex-1 overflow-y-auto space-y-3.5 pl-0.5">
        {roleMode === 'admin' ? (
          adminNavGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-3.5 text-[10.5px] font-bold text-[#9A9AAC] tracking-wide">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = adminTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectAdminTab(item.id);
                        onCloseMobile();
                      }}
                      className={`relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap ${
                        active
                          ? 'text-white'
                          : 'text-[#525264] hover:text-[#1C1C24] hover:bg-[#F5F5F9]'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="admin-sidebar-pill"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                          className="absolute inset-0 rounded-full bg-[#7B70E8] shadow-[0_8px_20px_-6px_rgba(123,112,232,0.65)]"
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2.5">
                        <Icon className="w-[17px] h-[17px] shrink-0 stroke-[1.9]" />
                        <span>{item.label}</span>
                      </span>
                      <span className="relative z-10 flex items-center gap-1.5">
                        {item.count !== undefined && item.count > 0 && (
                          <span
                            className={`min-w-5 h-5 px-1.5 rounded-full text-[10.5px] font-bold flex items-center justify-center tabular-nums ${
                              active
                                ? 'bg-white/25 text-white'
                                : item.id === 'settings'
                                  ? 'bg-[#7B70E8] text-white'
                                  : 'bg-[#F0EFFB] text-[#7B70E8]'
                            }`}
                          >
                            {toPersianDigits(item.count)}
                          </span>
                        )}
                        {active && <ChevronLeft className="w-3.5 h-3.5 shrink-0" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-1.5">
            {userNav.map((item) => {
              const Icon = item.icon;
              const active = userTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectUserTab(item.id);
                    onCloseMobile();
                  }}
                  className={`relative w-full flex items-center justify-between px-4 py-3 rounded-full text-[13.5px] font-medium transition-colors whitespace-nowrap ${
                    active ? 'text-white' : 'text-[#525264] hover:text-[#1C1C24] hover:bg-[#F5F5F9]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="user-sidebar-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 rounded-full bg-[#7B70E8] shadow-[0_8px_20px_-6px_rgba(123,112,232,0.65)]"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-3">
                    <Icon className="w-[18px] h-[18px] shrink-0 stroke-[1.9]" />
                    <span>{item.label}</span>
                  </span>
                  {active && <ChevronLeft className="relative z-10 w-4 h-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Bottom Profile + Dropify-style Animated Pill Role Switcher */}
      <div className="space-y-3.5 pt-4 mt-2 border-t border-[#F2F2F8] shrink-0">
        {roleMode === 'admin' ? (
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-[#1E1E24] text-white text-xs font-bold flex items-center justify-center shrink-0">
              مح
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-[#1C1C24] truncate">مهدی حسینی</div>
              <div className="text-[11px] text-[#8E8EA0] truncate">مدیر زیرساخت IT</div>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 px-1">
            <div className="flex items-center gap-3 px-1">
              <div className="w-9 h-9 rounded-full bg-[#7B70E8] text-white text-xs font-bold flex items-center justify-center shrink-0">
                {activeDemoUser.name.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-[#1C1C24] truncate">
                  {activeDemoUser.name}
                </div>
                <div className="text-[11px] text-[#8E8EA0] truncate">{activeDemoUser.team}</div>
              </div>
            </div>
            <select
              aria-label="مشاهده پنل با حساب کاربر"
              value={activeDemoUserId}
              onChange={(e) => onChangeDemoUser(e.target.value)}
              className="w-full text-xs bg-[#F5F5F9] rounded-full pr-3.5 pl-6 py-2 text-[#1C1C24] font-medium focus:outline-none focus:ring-2 focus:ring-[#7B70E8]/30"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.team})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Dropify bottom Role Switcher Capsule */}
        <div
          role="tablist"
          aria-label="تغییر نمای ادمین و کاربر نهایی"
          className="grid grid-cols-2 p-1 bg-[#F3F3F8] rounded-full"
        >
          <button
            type="button"
            role="tab"
            aria-selected={roleMode === 'admin'}
            onClick={() => {
              onChangeRoleMode('admin');
              onCloseMobile();
            }}
            className={`relative py-2 px-2.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap flex items-center justify-center gap-1.5 ${
              roleMode === 'admin' ? 'text-white' : 'text-[#646476] hover:text-[#1C1C24]'
            }`}
          >
            {roleMode === 'admin' && (
              <motion.span
                layoutId="role-switch-pill"
                transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                className="absolute inset-0 rounded-full bg-[#1E1E24]"
              />
            )}
            <ShieldCheck className="relative z-10 w-3.5 h-3.5 shrink-0" />
            <span className="relative z-10">ادمین</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={roleMode === 'user'}
            onClick={() => {
              onChangeRoleMode('user');
              onCloseMobile();
            }}
            className={`relative py-2 px-2.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap flex items-center justify-center gap-1.5 ${
              roleMode === 'user' ? 'text-white' : 'text-[#646476] hover:text-[#1C1C24]'
            }`}
          >
            {roleMode === 'user' && (
              <motion.span
                layoutId="role-switch-pill"
                transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                className="absolute inset-0 rounded-full bg-[#1E1E24]"
              />
            )}
            <UserIcon className="relative z-10 w-3.5 h-3.5 shrink-0" />
            <span className="relative z-10">کاربر نهایی</span>
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block shrink-0 border-l border-[#F0F0F5]">{content}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <motion.div
            initial={{ x: 260 }}
            animate={{ x: 0 }}
            exit={{ x: 260 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className="relative z-10 h-full shadow-2xl"
          >
            {content}
          </motion.div>
          <button
            type="button"
            aria-label="بستن پس‌زمینه منو"
            onClick={onCloseMobile}
            className="flex-1 bg-[#1C1C24]/35 backdrop-blur-[2px]"
          />
        </div>
      )}
    </>
  );
}
