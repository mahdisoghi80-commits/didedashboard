import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Boxes,
  Check,
  CheckCircle2,
  Cloud,
  Cpu,
  Edit3,
  Flame,
  HeartPulse,
  Layers,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Server,
  Terminal,
  X,
  Zap,
} from 'lucide-react';
import {
  DiscoverableModel,
  InferenceEngine,
  LocalModel,
  ModelSource,
  SpeedRating,
} from '../../types';
import { DISCOVERABLE_VLLM_MODELS } from '../../data/seedData';
import { toPersianDigits } from '../../utils/logic';
import { SlotPipBar, SpeedSignalBars, VramSegmentBar } from '../VisualPrimitives';

interface AdminSourcesProps {
  sources: ModelSource[];
  models: LocalModel[];
  onAddDiscoveredModel: (model: Omit<LocalModel, 'id'>) => void;
  onUpdateModel: (id: string, patch: Partial<LocalModel>) => void;
  onAddSource: (source: Omit<ModelSource, 'id'>) => void;
  onHealthCheckSource: (sourceId: string) => void;
}

const ENGINE_TILES: {
  id: InferenceEngine;
  label: string;
  sub: string;
  defaultUrl: string;
  icon: typeof Zap;
}[] = [
  {
    id: 'vLLM',
    label: 'vLLM',
    sub: 'پیشنهادی برای H200 / H100',
    defaultUrl: 'https://vllm-node2.madar-eng.ir/v1',
    icon: Zap,
  },
  {
    id: 'SGLang',
    label: 'SGLang',
    sub: 'فوق‌سریع برای Prefix Cache',
    defaultUrl: 'https://sglang-rd.madar-eng.ir/v1',
    icon: Flame,
  },
  {
    id: 'Ollama',
    label: 'Ollama',
    sub: 'راه‌اندازی سریع مدل‌های سبک',
    defaultUrl: 'http://10.20.4.18:11434/v1',
    icon: Boxes,
  },
  {
    id: 'OpenAI-Compatible',
    label: 'OpenAI API',
    sub: 'هر سرور سازگار استاندارد',
    defaultUrl: 'https://llm-gateway.madar-eng.ir/v1',
    icon: Terminal,
  },
];

const HARDWARE_TILES = [
  {
    id: 'h200',
    label: '2× NVIDIA H200',
    vram: 282,
    slots: 20,
    spec: '2× NVIDIA H200 · 282GB VRAM',
  },
  {
    id: 'h100',
    label: '4× NVIDIA H100',
    vram: 320,
    slots: 28,
    spec: '4× NVIDIA H100 · 320GB VRAM',
  },
  {
    id: 'a100',
    label: '2× NVIDIA A100',
    vram: 160,
    slots: 12,
    spec: '2× NVIDIA A100 · 160GB VRAM',
  },
  {
    id: 'l40s',
    label: '2× NVIDIA L40S',
    vram: 96,
    slots: 8,
    spec: '2× NVIDIA L40S · 96GB VRAM',
  },
];

const SPEED_TILES: SpeedRating[] = ['بسیار سریع', 'سریع', 'متعادل (استدلالی)'];

export function AdminSources({
  sources,
  models,
  onAddDiscoveredModel,
  onUpdateModel,
  onAddSource,
  onHealthCheckSource,
}: AdminSourcesProps) {
  const [discoveringSourceId, setDiscoveringSourceId] = useState<string | null>(null);
  const [checkingSourceId, setCheckingSourceId] = useState<string | null>(null);
  const [discoveredList, setDiscoveredList] = useState<DiscoverableModel[] | null>(null);
  const [draftNames, setDraftNames] = useState<
    Record<string, { name: string; desc: string; bestFor: string }>
  >({});

  const [editingModel, setEditingModel] = useState<LocalModel | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editBestFor, setEditBestFor] = useState('');
  const [editSpeed, setEditSpeed] = useState<SpeedRating>('بسیار سریع');

  // Visual tile Add Server modal state
  const [addServerOpen, setAddServerOpen] = useState(false);
  const [srvEngine, setSrvEngine] = useState<InferenceEngine>('vLLM');
  const [srvHwId, setSrvHwId] = useState('h100');
  const [srvName, setSrvName] = useState('');
  const [srvUrl, setSrvUrl] = useState('https://vllm-node2.madar-eng.ir/v1');
  const [srvSlots, setSrvSlots] = useState(16);
  const [srvError, setSrvError] = useState('');

  const handleAutoDiscover = (sourceId: string) => {
    setDiscoveringSourceId(sourceId);
    setTimeout(() => {
      const existingIds = new Set(models.map((m) => m.modelId));
      const candidates = DISCOVERABLE_VLLM_MODELS.filter((d) => !existingIds.has(d.modelId));
      const initialDrafts: Record<string, { name: string; desc: string; bestFor: string }> = {};
      for (const c of candidates) {
        initialDrafts[c.modelId] = {
          name: c.suggestedName,
          desc: c.suggestedDescription,
          bestFor: c.suggestedBestFor,
        };
      }
      setDraftNames(initialDrafts);
      setDiscoveredList(candidates);
      setDiscoveringSourceId(null);
    }, 600);
  };

  const handleHealthCheck = (sourceId: string) => {
    setCheckingSourceId(sourceId);
    setTimeout(() => {
      onHealthCheckSource(sourceId);
      setCheckingSourceId(null);
    }, 500);
  };

  const handleImportModel = (candidate: DiscoverableModel) => {
    const draft = draftNames[candidate.modelId];
    onAddDiscoveredModel({
      modelId: candidate.modelId,
      sourceId: sources[0]?.id ?? 'src-h200-main',
      displayName: draft?.name.trim() || candidate.suggestedName,
      description: draft?.desc.trim() || candidate.suggestedDescription,
      bestFor: draft?.bestFor.trim() || candidate.suggestedBestFor,
      speedRating: candidate.speedRating,
      contextWindow: candidate.contextWindow,
      enabled: true,
      isLocal: true,
      tpsAvg: candidate.tpsAvg,
      trafficShare: 10,
    });
    setDiscoveredList((prev) =>
      prev ? prev.filter((item) => item.modelId !== candidate.modelId) : null
    );
  };

  const openEditModel = (mdl: LocalModel) => {
    setEditingModel(mdl);
    setEditName(mdl.displayName);
    setEditDesc(mdl.description);
    setEditBestFor(mdl.bestFor);
    setEditSpeed(mdl.speedRating);
  };

  const saveEditModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModel || !editName.trim()) return;
    onUpdateModel(editingModel.id, {
      displayName: editName.trim(),
      description: editDesc.trim(),
      bestFor: editBestFor.trim(),
      speedRating: editSpeed,
    });
    setEditingModel(null);
  };

  const handleCreateServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!srvName.trim() || !srvUrl.trim().startsWith('http')) {
      setSrvError('نام سرور و آدرس معتبر اندپوینت (شروع با http/https) را وارد کنید.');
      return;
    }
    const hw = HARDWARE_TILES.find((h) => h.id === srvHwId) ?? HARDWARE_TILES[1];
    onAddSource({
      name: srvName.trim(),
      hardware: hw.spec,
      baseUrl: srvUrl.trim(),
      apiKeyHint: `${srvEngine.toLowerCase()}-int-••••••7b2e`,
      engine: srvEngine,
      health: 'healthy',
      vramUsedGb: Math.round(hw.vram * 0.42),
      vramTotalGb: hw.vram,
      ttftMs: 112,
      outputTps: 76,
      lastChecked: 'هم‌اکنون',
      maxConcurrentSlots: srvSlots,
    });
    setSrvName('');
    setSrvError('');
    setAddServerOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Compact Context Bar */}
      <div className="bg-[#F6F6FA] rounded-[24px] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-[#1C1C24]">
            کلاسترها و منابع مدل داخلی ({toPersianDigits(sources.length)})
          </h2>
          <span className="px-3 py-1 rounded-full bg-white text-[11px] font-bold text-[#059669] inline-flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            <span>۱۰۰٪ درون‌سازمانی</span>
          </span>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={() => setAddServerOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#1E1E24] hover:bg-[#32323D] rounded-full transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>اتصال سرور لوکال جدید</span>
        </motion.button>
      </div>

      {/* Connected Local GPU Server Cards */}
      <div className="space-y-4">
        {sources.map((src, idx) => {
          const isDiscovering = discoveringSourceId === src.id;
          const isChecking = checkingSourceId === src.id;

          return (
            <motion.section
              key={src.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.05 }}
              className="bg-[#F6F6FA] rounded-[26px] p-5 space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-[#1E1E24] text-white flex items-center justify-center shrink-0">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-[#1C1C24]">{src.name}</h3>
                      <span className="text-xs font-bold text-[#7B70E8]">· {src.engine}</span>
                      <span className="text-xs font-semibold text-[#059669]">· ۱۰۰٪ داخلی</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#646476]">
                      <span dir="ltr" className="inline-block font-semibold">
                        {src.hardware}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span dir="ltr" className="font-mono text-[#1C1C24]">
                        {src.baseUrl}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => handleHealthCheck(src.id)}
                    disabled={isChecking}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-[#1C1C24] bg-white hover:bg-[#EFEFF6] rounded-full transition-colors whitespace-nowrap shadow-[0_2px_10px_-4px_rgba(28,28,36,0.08)]"
                  >
                    {isChecking ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7B70E8]" />
                    ) : (
                      <HeartPulse className="w-3.5 h-3.5 text-[#10B981]" />
                    )}
                    <span>{isChecking ? 'در حال بررسی...' : 'تست سلامت'}</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => handleAutoDiscover(src.id)}
                    disabled={isDiscovering}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-[#7B70E8] hover:bg-[#6B5FE0] rounded-full transition-colors whitespace-nowrap shadow-[0_8px_18px_-6px_rgba(123,112,232,0.55)]"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin' : ''}`} />
                    <span>{isDiscovering ? 'در حال کشف...' : 'کشف خودکار مدل‌ها'}</span>
                  </motion.button>
                </div>
              </div>

              {/* Health & Hardware visual metric islands */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 text-xs items-stretch">
                <div className="lg:col-span-3 bg-white rounded-[18px] p-3.5 flex flex-col justify-between">
                  <div className="text-[#8E8EA0] text-[11px]">وضعیت اتصال</div>
                  <div className="font-bold text-[#059669] mt-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>سالم · {src.lastChecked}</span>
                  </div>
                </div>
                <div className="lg:col-span-3 bg-white rounded-[18px] p-3.5 flex flex-col justify-between">
                  <div className="text-[#8E8EA0] text-[11px]">سرعت و تأخیر استنتاج</div>
                  <div className="mt-2">
                    <SpeedSignalBars tps={src.outputTps} ttftMs={src.ttftMs} />
                  </div>
                </div>
                <div className="lg:col-span-6 bg-white rounded-[18px] p-3.5">
                  <VramSegmentBar
                    usedGb={src.vramUsedGb}
                    totalGb={src.vramTotalGb}
                    segments={
                      models
                        .filter((m) => m.sourceId === src.id && m.enabled)
                        .map((m, mIdx) => {
                          const colors = ['#7B70E8', '#1E1E24', '#A69EF2', '#059669'];
                          const shareGb = Math.max(
                            24,
                            Math.round((src.vramUsedGb * (m.trafficShare || 20)) / 100)
                          );
                          return {
                            id: m.id,
                            label: m.displayName,
                            gb: shareGb,
                            color: colors[mIdx % colors.length],
                          };
                        })
                    }
                  />
                </div>
              </div>
            </motion.section>
          );
        })}
      </div>

      {/* Interactive Auto-Discovery Results Panel */}
      <AnimatePresence>
        {discoveredList !== null && (
          <motion.section
            initial={{ opacity: 0, y: -10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            aria-label="نتایج کشف خودکار مدل‌ها"
            className="bg-[#F3F1FE] rounded-[26px] p-5 space-y-4 ring-2 ring-[#7B70E8]/40"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#1C1C24]">
                  مدل‌های کشف‌شده از اندپوینت{' '}
                  <span dir="ltr" className="font-mono text-xs text-[#7B70E8] inline-block">
                    /v1/models
                  </span>
                </h3>
                <p className="text-xs text-[#646476] mt-0.5">
                  {discoveredList.length > 0
                    ? `${toPersianDigits(discoveredList.length)} مدل جدید شناسایی شد. نام ساده فارسی آن را تایید کنید تا در کاتالوگ منتشر شود.`
                    : 'تمام مدل‌های موجود روی سرور پیش‌تر به کاتالوگ اضافه شده‌اند.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDiscoveredList(null)}
                aria-label="بستن نتایج کشف مدل"
                className="w-8 h-8 rounded-full bg-white text-[#646476] hover:text-[#1C1C24] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {discoveredList.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {discoveredList.map((cand) => {
                  const draft = draftNames[cand.modelId] ?? {
                    name: cand.suggestedName,
                    desc: cand.suggestedDescription,
                    bestFor: cand.suggestedBestFor,
                  };
                  return (
                    <div
                      key={cand.modelId}
                      className="bg-white rounded-[22px] p-4 space-y-3 shadow-[0_2px_12px_-6px_rgba(28,28,36,0.08)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span dir="ltr" className="font-mono text-xs font-bold text-[#7B70E8]">
                          {cand.modelId}
                        </span>
                        <span className="text-[11px] text-[#8E8EA0] tabular-nums">
                          {cand.contextWindow} · {toPersianDigits(cand.tpsAvg)} tok/s
                        </span>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          value={draft.name}
                          aria-label={`نام فارسی برای ${cand.modelId}`}
                          onChange={(e) =>
                            setDraftNames((prev) => ({
                              ...prev,
                              [cand.modelId]: { ...draft, name: e.target.value },
                            }))
                          }
                          className="w-full px-3.5 py-2 text-xs font-bold bg-[#F6F6FA] rounded-[14px] text-[#1C1C24]"
                        />
                        <input
                          type="text"
                          value={draft.desc}
                          aria-label={`توضیح کاربرد برای ${cand.modelId}`}
                          onChange={(e) =>
                            setDraftNames((prev) => ({
                              ...prev,
                              [cand.modelId]: { ...draft, desc: e.target.value },
                            }))
                          }
                          className="w-full px-3.5 py-2 text-xs bg-[#F6F6FA] rounded-[14px] text-[#525264]"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleImportModel(cand)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#7B70E8] hover:bg-[#6B5FE0] rounded-full transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>انتشار در کاتالوگ</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Active Models Visual Tile Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-bold text-[#1C1C24]">
            کاتالوگ مدل‌های فعال ({toPersianDigits(models.length)})
          </h3>
          <SlotPipBar
            active={models.filter((m) => m.enabled).length}
            max={Math.max(models.length, 4)}
            tone="emerald"
            labelSuffix="مدل آماده"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {models.map((mdl, idx) => (
            <motion.article
              key={mdl.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              whileHover={{ y: -3 }}
              className="bg-[#F6F6FA] rounded-[26px] p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        mdl.enabled ? 'bg-[#7B70E8] text-white' : 'bg-white text-[#8E8EA0]'
                      }`}
                    >
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-[#1C1C24] truncate">
                        {mdl.displayName}
                      </h4>
                      <div className="text-[11px] text-[#8E8EA0] truncate">
                        {mdl.bestFor} · {mdl.speedRating}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={mdl.enabled}
                    aria-label={`تغییر وضعیت فعال بودن ${mdl.displayName}`}
                    onClick={() => onUpdateModel(mdl.id, { enabled: !mdl.enabled })}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${
                      mdl.enabled
                        ? 'bg-[#ECFDF5] text-[#059669]'
                        : 'bg-white text-[#8E8EA0]'
                    }`}
                  >
                    {mdl.enabled ? 'فعال' : 'خاموش'}
                  </button>
                </div>

                <p className="text-xs text-[#525264] leading-relaxed">{mdl.description}</p>

                {/* White inner telemetry strip */}
                <div className="bg-white rounded-[18px] p-3.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span dir="ltr" className="font-mono text-[#1C1C24] font-semibold truncate max-w-[220px]">
                    {mdl.modelId}
                  </span>
                  <div className="flex items-center gap-3 text-[#646476] tabular-nums">
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-[#7B70E8]">
                      <Layers className="w-3 h-3" />
                      {mdl.contextWindow}
                    </span>
                    <SpeedSignalBars tps={mdl.tpsAvg} compact />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 flex-1 max-w-[180px]">
                  <div className="flex-1 h-1.5 rounded-full bg-white overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#7B70E8]"
                      style={{ width: `${mdl.enabled ? mdl.trafficShare : 0}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-[#1C1C24] tabular-nums">
                    {toPersianDigits(mdl.trafficShare)}٪
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openEditModel(mdl)}
                  aria-label={`ویرایش توضیحات ${mdl.displayName}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#1C1C24] bg-white hover:bg-[#1E1E24] hover:text-white rounded-full transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>ویرایش برچسب</span>
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Subtle Phase 2 Cloud Provider Roadmap Strip */}
      <section className="bg-[#F6F6FA] rounded-[24px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-white text-[#7B70E8] flex items-center justify-center shrink-0">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-[#1C1C24]">
                اتصال منبع ابری هیبریدی (OpenAI / Anthropic / Gemini)
              </h3>
              <span className="text-xs font-bold text-[#7B70E8]">· فاز ۲</span>
            </div>
            <p className="text-xs text-[#646476] mt-0.5 leading-relaxed">
              کنترل بودجه دلاری مجزا با تفکیک کامل از ترافیک محرمانه داخلی در نسخه بعدی فعال می‌شود.
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-[#646476] px-4 py-2 rounded-full bg-white whitespace-nowrap shrink-0">
          نقشه راه فاز ۲
        </span>
      </section>

      {/* Visual Tile Edit Human Metadata Modal */}
      <AnimatePresence>
        {editingModel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingModel(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1C24]/40 backdrop-blur-[4px]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              role="dialog"
              aria-modal="true"
              aria-label="ویرایش مشخصات انسانی مدل"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-[28px] shadow-[0_28px_70px_-15px_rgba(28,28,36,0.3)] overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-[#F0F0F6] flex items-center justify-between">
                <h2 className="text-base font-bold text-[#1C1C24]">
                  ویرایش برچسب انسانی مدل
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingModel(null)}
                  aria-label="بستن پنجره ویرایش مدل"
                  className="w-8 h-8 rounded-full bg-[#F5F5FA] text-[#646476] hover:text-[#1C1C24] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={saveEditModel} className="p-6 space-y-4">
                <div
                  dir="ltr"
                  className="font-mono text-xs bg-[#F6F6FA] rounded-[14px] px-3.5 py-2.5 text-left text-[#7B70E8] font-bold"
                >
                  {editingModel.modelId}
                </div>
                <div>
                  <label htmlFor="edit-model-name" className="block text-xs font-bold text-[#1C1C24] mb-1.5">
                    نام نمایشی ساده
                  </label>
                  <input
                    id="edit-model-name"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-[#F6F6FA] rounded-[16px] text-[#1C1C24] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B70E8]/35"
                  />
                </div>
                <div>
                  <label htmlFor="edit-model-best" className="block text-xs font-bold text-[#1C1C24] mb-1.5">
                    کاربرد پیشنهادی کوتاه
                  </label>
                  <input
                    id="edit-model-best"
                    type="text"
                    value={editBestFor}
                    onChange={(e) => setEditBestFor(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-[#F6F6FA] rounded-[16px] text-[#1C1C24] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B70E8]/35"
                  />
                </div>
                <div>
                  <label htmlFor="edit-model-desc" className="block text-xs font-bold text-[#1C1C24] mb-1.5">
                    توضیح به زبان ساده
                  </label>
                  <textarea
                    id="edit-model-desc"
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-[#F6F6FA] rounded-[16px] text-[#1C1C24] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B70E8]/35"
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#1C1C24] mb-2">رتبه‌بندی سرعت</div>
                  <div className="grid grid-cols-3 gap-2">
                    {SPEED_TILES.map((sp) => (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => setEditSpeed(sp)}
                        className={`py-2 px-2 rounded-[14px] text-[11px] font-bold transition-all ${
                          editSpeed === sp
                            ? 'bg-[#1E1E24] text-white'
                            : 'bg-[#F6F6FA] text-[#525264] hover:bg-[#EFEFF6]'
                        }`}
                      >
                        {sp}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F0F0F6] flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingModel(null)}
                    className="px-4 py-2 text-xs font-semibold text-[#646476] rounded-full"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-bold text-white bg-[#7B70E8] hover:bg-[#6B5FE0] rounded-full"
                  >
                    ذخیره تغییرات
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* COMPLETELY REDESIGNED Visual Tile "Add Local Server" Modal (NO boring Word form!) */}
      <AnimatePresence>
        {addServerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAddServerOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1C24]/40 backdrop-blur-[4px]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 14 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              role="dialog"
              aria-modal="true"
              aria-label="افزودن سرور لوکال جدید"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white rounded-[30px] shadow-[0_28px_80px_-15px_rgba(28,28,36,0.35)] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-[#F0F0F6] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1E1E24] text-white flex items-center justify-center">
                    <Server className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#1C1C24]">
                      اتصال کلاستر یا سرور پردازش داخلی
                    </h2>
                    <p className="text-[11px] text-[#8E8EA0]">
                      موتور استنتاج و پروفایل سخت‌افزار GPU را انتخاب کنید تا ظرفیت خودکار محاسبه شود
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAddServerOpen(false)}
                  aria-label="بستن پنجره افزودن سرور"
                  className="w-8 h-8 rounded-full bg-[#F5F5FA] text-[#646476] hover:text-[#1C1C24] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateServer} className="p-6 space-y-5 overflow-y-auto flex-1">
                {srvError && (
                  <div className="p-3.5 rounded-[16px] bg-[#FEF2F2] text-xs font-bold text-[#DC2626]">
                    {srvError}
                  </div>
                )}

                {/* Step 1: Inference Engine Visual Tiles */}
                <div>
                  <div className="text-xs font-bold text-[#1C1C24] mb-2.5">
                    ۱. موتور استنتاج (Inference Engine)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {ENGINE_TILES.map((eng) => {
                      const Icon = eng.icon;
                      const active = srvEngine === eng.id;
                      return (
                        <motion.button
                          key={eng.id}
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            setSrvEngine(eng.id);
                            setSrvUrl(eng.defaultUrl);
                          }}
                          className={`p-3.5 rounded-[20px] text-right transition-all flex flex-col justify-between gap-2.5 ${
                            active
                              ? 'bg-[#F3F1FE] ring-2 ring-[#7B70E8]'
                              : 'bg-[#F6F6FA] hover:bg-[#EFEFF6]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                active ? 'bg-[#7B70E8] text-white' : 'bg-[#1E1E24] text-white'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </span>
                            {active && <Check className="w-4 h-4 text-[#7B70E8]" />}
                          </div>
                          <div>
                            <div dir="ltr" className="text-xs font-bold text-[#1C1C24] text-right">
                              {eng.label}
                            </div>
                            <div className="text-[10px] text-[#8E8EA0] mt-0.5 leading-snug">
                              {eng.sub}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: GPU Hardware Profile Tiles */}
                <div>
                  <div className="text-xs font-bold text-[#1C1C24] mb-2.5">
                    ۲. پروفایل سخت‌افزار GPU سرور
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {HARDWARE_TILES.map((hw) => {
                      const active = srvHwId === hw.id;
                      return (
                        <button
                          key={hw.id}
                          type="button"
                          onClick={() => {
                            setSrvHwId(hw.id);
                            setSrvSlots(hw.slots);
                          }}
                          className={`p-3 rounded-[18px] text-right transition-all ${
                            active
                              ? 'bg-[#1E1E24] text-white'
                              : 'bg-[#F6F6FA] text-[#1C1C24] hover:bg-[#EFEFF6]'
                          }`}
                        >
                          <div dir="ltr" className="text-xs font-bold text-right">
                            {hw.label}
                          </div>
                          <div
                            className={`text-[11px] tabular-nums mt-1 ${
                              active ? 'text-[#A9A0F8]' : 'text-[#8E8EA0]'
                            }`}
                          >
                            {toPersianDigits(hw.vram)}GB VRAM
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Name & Endpoint URL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="srv-name-input"
                      className="block text-xs font-bold text-[#1C1C24] mb-1.5"
                    >
                      نام نمایشی سرور
                    </label>
                    <input
                      id="srv-name-input"
                      type="text"
                      value={srvName}
                      onChange={(e) => setSrvName(e.target.value)}
                      placeholder="مثلاً: نود کمکی GPU پژوهش"
                      className="w-full px-4 py-2.5 text-sm bg-[#F6F6FA] rounded-[16px] text-[#1C1C24] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B70E8]/35"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="srv-url-input"
                      className="block text-xs font-bold text-[#1C1C24] mb-1.5"
                    >
                      آدرس Base URL داخلی
                    </label>
                    <input
                      id="srv-url-input"
                      type="url"
                      dir="ltr"
                      value={srvUrl}
                      onChange={(e) => setSrvUrl(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm font-mono text-left bg-[#F6F6FA] rounded-[16px] text-[#1C1C24] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B70E8]/35"
                    />
                  </div>
                </div>

                {/* Concurrency Slot Capacity Tiles */}
                <div>
                  <div className="text-xs font-bold text-[#1C1C24] mb-2">
                    ۳. ظرفیت اسلات همزمان این سرور (برای گاردریل صف)
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[8, 12, 20, 28].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSrvSlots(val)}
                        className={`py-2.5 rounded-[16px] text-xs font-bold tabular-nums transition-all ${
                          srvSlots === val
                            ? 'bg-[#7B70E8] text-white shadow-[0_6px_16px_-4px_rgba(123,112,232,0.5)]'
                            : 'bg-[#F6F6FA] text-[#525264] hover:bg-[#EFEFF6]'
                        }`}
                      >
                        {toPersianDigits(val)} اسلات همزمان
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F0F0F6] flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAddServerOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#646476] rounded-full"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-bold text-white bg-[#1E1E24] hover:bg-[#32323D] rounded-full"
                  >
                    ثبت و اتصال سرور
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
