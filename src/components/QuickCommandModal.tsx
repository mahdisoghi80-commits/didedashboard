import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Cpu, KeyRound, Layers, Search, User as UserIcon, X } from 'lucide-react';
import { AccessPlan, LocalModel, OrgUser, RoleMode } from '../types';

interface QuickCommandModalProps {
  open: boolean;
  onClose: () => void;
  roleMode: RoleMode;
  users: OrgUser[];
  models: LocalModel[];
  plans: AccessPlan[];
  onSelectUser: (userId: string) => void;
  onJumpToSources: () => void;
  onJumpToPlans: () => void;
  onJumpToKeys: () => void;
  onJumpToChatModel: (modelId: string) => void;
}

export function QuickCommandModal({
  open,
  onClose,
  roleMode,
  users,
  models,
  plans,
  onSelectUser,
  onJumpToSources,
  onJumpToPlans,
  onJumpToKeys,
  onJumpToChatModel,
}: QuickCommandModalProps) {
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  const matchedUsers = useMemo(
    () =>
      users
        .filter((u) => !q || u.name.toLowerCase().includes(q) || u.team.toLowerCase().includes(q))
        .slice(0, 4),
    [users, q]
  );

  const matchedModels = useMemo(
    () =>
      models
        .filter(
          (m) =>
            !q ||
            m.displayName.toLowerCase().includes(q) ||
            m.modelId.toLowerCase().includes(q)
        )
        .slice(0, 4),
    [models, q]
  );

  const matchedPlans = useMemo(
    () => plans.filter((p) => !q || p.name.toLowerCase().includes(q)).slice(0, 3),
    [plans, q]
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] p-4 bg-[#1C1C24]/35 backdrop-blur-[3px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            role="dialog"
            aria-modal="true"
            aria-label="جستجو و دسترسی سریع"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-[26px] shadow-[0_28px_70px_-15px_rgba(28,28,36,0.3)] overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[#F0F0F6] flex items-center gap-3">
              <Search className="w-4.5 h-4.5 text-[#7B70E8] shrink-0" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="جستجوی سریع کاربر، مدل، طرح دسترسی یا اتصال ابزار..."
                aria-label="جستجوی سریع در پنل"
                className="flex-1 text-sm text-[#1C1C24] placeholder:text-[#9898AA] focus:outline-none bg-transparent"
              />
              <button
                type="button"
                onClick={onClose}
                aria-label="بستن جستجوی سریع"
                className="w-7 h-7 rounded-full bg-[#F4F4F8] text-[#646476] hover:text-[#1C1C24] flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3 max-h-[60vh] overflow-y-auto space-y-4">
              {roleMode === 'admin' && matchedUsers.length > 0 && (
                <div>
                  <div className="px-3 pb-1.5 text-[11px] font-semibold text-[#8E8EA0]">
                    کاربران سازمانی
                  </div>
                  <div className="space-y-1">
                    {matchedUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          onSelectUser(u.id);
                          onClose();
                        }}
                        className="w-full px-3 py-2.5 rounded-2xl hover:bg-[#F5F5FA] flex items-center justify-between text-right transition-colors group"
                      >
                        <span className="flex items-center gap-3">
                          <UserIcon className="w-4 h-4 text-[#7B70E8]" />
                          <span>
                            <span className="text-sm font-semibold text-[#1C1C24] block">
                              {u.name}
                            </span>
                            <span className="text-[11px] text-[#8E8EA0]">{u.team}</span>
                          </span>
                        </span>
                        <ArrowLeft className="w-3.5 h-3.5 text-[#B4B4C6] group-hover:text-[#7B70E8] transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {matchedModels.length > 0 && (
                <div>
                  <div className="px-3 pb-1.5 text-[11px] font-semibold text-[#8E8EA0]">
                    مدل‌های داخلی روی H200
                  </div>
                  <div className="space-y-1">
                    {matchedModels.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          if (roleMode === 'admin') {
                            onJumpToSources();
                          } else {
                            onJumpToChatModel(m.id);
                          }
                          onClose();
                        }}
                        className="w-full px-3 py-2.5 rounded-2xl hover:bg-[#F5F5FA] flex items-center justify-between text-right transition-colors group"
                      >
                        <span className="flex items-center gap-3">
                          <Cpu className="w-4 h-4 text-[#1E1E24]" />
                          <span>
                            <span className="text-sm font-semibold text-[#1C1C24] block">
                              {m.displayName}
                            </span>
                            <span dir="ltr" className="font-mono text-[11px] text-[#8E8EA0] block text-right">
                              {m.modelId}
                            </span>
                          </span>
                        </span>
                        <ArrowLeft className="w-3.5 h-3.5 text-[#B4B4C6] group-hover:text-[#7B70E8] transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {roleMode === 'admin' && matchedPlans.length > 0 && (
                <div>
                  <div className="px-3 pb-1.5 text-[11px] font-semibold text-[#8E8EA0]">
                    طرح‌های دسترسی
                  </div>
                  <div className="space-y-1">
                    {matchedPlans.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          onJumpToPlans();
                          onClose();
                        }}
                        className="w-full px-3 py-2.5 rounded-2xl hover:bg-[#F5F5FA] flex items-center justify-between text-right transition-colors group"
                      >
                        <span className="flex items-center gap-3">
                          <Layers className="w-4 h-4 text-[#7B70E8]" />
                          <span className="text-sm font-semibold text-[#1C1C24]">{p.name}</span>
                        </span>
                        <ArrowLeft className="w-3.5 h-3.5 text-[#B4B4C6] group-hover:text-[#7B70E8] transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {roleMode === 'user' && (
                <button
                  type="button"
                  onClick={() => {
                    onJumpToKeys();
                    onClose();
                  }}
                  className="w-full px-3 py-2.5 rounded-2xl bg-[#F5F4FD] hover:bg-[#ECEAFE] flex items-center justify-between text-right transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <KeyRound className="w-4 h-4 text-[#7B70E8]" />
                    <span className="text-sm font-semibold text-[#1C1C24]">
                      ساخت کلید جدید و اتصال به Cursor / Codex / Python
                    </span>
                  </span>
                  <ArrowLeft className="w-3.5 h-3.5 text-[#7B70E8]" />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
