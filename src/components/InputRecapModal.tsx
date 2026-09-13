import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Save, 
  Database, 
  Calculator, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import { MonthlyProductivityRecord, BankDataModel, StyleScheduleRecord } from '../types';
import { calculateEfficiency, calculateProductivityPerOp, generateSmartAnalysis } from '../data/monthlyRecapData';

interface InputRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: MonthlyProductivityRecord) => void;
  initialData?: MonthlyProductivityRecord | null;
  bankDataModels: BankDataModel[];
  preselectedModel?: BankDataModel | null;
  styleSchedules?: StyleScheduleRecord[];
  onUpdateScheduleActual?: (scheduleId: string, addedActualQty: number) => void;
  defaultMonth?: string;
}

export const InputRecapModal: React.FC<InputRecapModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  bankDataModels,
  preselectedModel,
  styleSchedules = [],
  onUpdateScheduleActual,
  defaultMonth
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const initialDate = defaultMonth 
    ? (todayStr.startsWith(defaultMonth) ? todayStr : `${defaultMonth}-01`)
    : todayStr;

  const [formData, setFormData] = useState<Omit<MonthlyProductivityRecord, 'id' | 'efficiencyPercent' | 'productivityPcsPerOp'>>({
    lineId: 1,
    lineName: 'Line 1',
    date: initialDate,
    style: '',
    modelId: '',
    targetDailyPcs: 0,
    actualDailyPcs: 0,
    targetOutputPcs: 0,
    actualOutputPcs: 0,
    manpower: 36,
    workingHours: 8,
    smvStandard: 0,
    defectPercent: 0,
    analysisStatus: 'optimal',
    analysisNote: '',
    note: ''
  });

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [calcEff, setCalcEff] = useState<number>(0);
  const [calcProd, setCalcProd] = useState<number>(0);

  // Initialize data
  useEffect(() => {
    const activeDate = defaultMonth 
      ? (todayStr.startsWith(defaultMonth) ? todayStr : `${defaultMonth}-01`)
      : todayStr;

    if (initialData) {
      setFormData({
        lineId: initialData.lineId,
        lineName: initialData.lineName,
        date: initialData.date || activeDate,
        style: initialData.style,
        modelId: initialData.modelId || '',
        targetDailyPcs: initialData.targetDailyPcs || 0,
        actualDailyPcs: initialData.actualDailyPcs || initialData.actualOutputPcs || 0,
        targetOutputPcs: initialData.targetOutputPcs || 0,
        actualOutputPcs: initialData.actualOutputPcs || 0,
        manpower: initialData.manpower || 36,
        workingHours: initialData.workingHours || 8,
        smvStandard: initialData.smvStandard || 0,
        defectPercent: initialData.defectPercent || 0,
        analysisStatus: initialData.analysisStatus || 'optimal',
        analysisNote: initialData.analysisNote || '',
        note: initialData.note || ''
      });
      // Cari jika ada schedule yang cocok
      const matched = styleSchedules.find(s => s.lineId === initialData.lineId && s.styleName === initialData.style);
      if (matched) setSelectedScheduleId(matched.id);
    } else if (preselectedModel) {
      setFormData({
        lineId: 1,
        lineName: 'Line 1',
        date: activeDate,
        style: preselectedModel.modelCode,
        modelId: preselectedModel.id,
        targetDailyPcs: preselectedModel.targetDailyPcs,
        actualDailyPcs: preselectedModel.targetDailyPcs,
        targetOutputPcs: preselectedModel.targetTotalPcs,
        actualOutputPcs: preselectedModel.targetDailyPcs,
        manpower: preselectedModel.manpowerStandard,
        workingHours: preselectedModel.workingHoursStandard,
        smvStandard: preselectedModel.smvStandard,
        defectPercent: 1.0,
        analysisStatus: 'optimal',
        analysisNote: 'Target awal ditetapkan sesuai standar Bank Data IE.',
        note: preselectedModel.description || ''
      });
    } else {
      // Default to first active schedule on Line 1 if exists
      const line1Sched = styleSchedules.find(s => s.lineId === 1 && s.status !== 'completed');
      if (line1Sched) {
        setSelectedScheduleId(line1Sched.id);
        setFormData({
          lineId: 1,
          lineName: 'Line 1',
          date: activeDate,
          style: line1Sched.styleName,
          modelId: line1Sched.modelId || '',
          targetDailyPcs: line1Sched.dailyTargetQty,
          actualDailyPcs: line1Sched.dailyTargetQty,
          targetOutputPcs: line1Sched.orderQty,
          actualOutputPcs: line1Sched.actualQty + line1Sched.dailyTargetQty,
          manpower: line1Sched.manpower || 36,
          workingHours: line1Sched.standardWorkingHours || 8,
          smvStandard: line1Sched.smv || 15.0,
          defectPercent: 1.0,
          analysisStatus: 'optimal',
          analysisNote: 'Output harian mengurangi target perencanaan PO.',
          note: ''
        });
      } else if (bankDataModels.length > 0) {
        const firstBank = bankDataModels[0];
        setFormData({
          lineId: 1,
          lineName: 'Line 1',
          date: activeDate,
          style: firstBank.modelCode,
          modelId: firstBank.id,
          targetDailyPcs: firstBank.targetDailyPcs,
          actualDailyPcs: firstBank.targetDailyPcs,
          targetOutputPcs: firstBank.targetTotalPcs,
          actualOutputPcs: firstBank.targetDailyPcs,
          manpower: firstBank.manpowerStandard || 36,
          workingHours: firstBank.workingHoursStandard || 8,
          smvStandard: firstBank.smvStandard,
          defectPercent: 1.0,
          analysisStatus: 'optimal',
          analysisNote: '',
          note: ''
        });
      } else {
        setFormData({
          lineId: 1,
          lineName: 'Line 1',
          date: activeDate,
          style: '',
          modelId: '',
          targetDailyPcs: 0,
          actualDailyPcs: 0,
          targetOutputPcs: 0,
          actualOutputPcs: 0,
          manpower: 36,
          workingHours: 8,
          smvStandard: 0,
          defectPercent: 0,
          analysisStatus: 'optimal',
          analysisNote: '',
          note: ''
        });
      }
    }
  }, [initialData, preselectedModel, isOpen, defaultMonth]);

  // Recalculate auto metrics
  useEffect(() => {
    const eff = calculateEfficiency(
      formData.actualDailyPcs,
      formData.smvStandard,
      formData.manpower,
      formData.workingHours
    );
    const prod = calculateProductivityPerOp(formData.actualDailyPcs, formData.manpower);
    setCalcEff(eff);
    setCalcProd(prod);
  }, [formData.actualDailyPcs, formData.smvStandard, formData.manpower, formData.workingHours]);

  if (!isOpen) return null;

  // Active connected plan from styleSchedules
  const activeLinkedPlan = styleSchedules.find(s => s.id === selectedScheduleId);

  // Perhitungan sisa target perencanaan setelah input harian
  const planOrderQty = activeLinkedPlan ? activeLinkedPlan.orderQty : formData.targetOutputPcs;
  const planPrevActual = activeLinkedPlan ? activeLinkedPlan.actualQty : Math.max(0, formData.actualOutputPcs - formData.actualDailyPcs);
  const planRemainingBeforeToday = Math.max(0, planOrderQty - planPrevActual);
  const planRemainingAfterToday = Math.max(0, planRemainingBeforeToday - formData.actualDailyPcs);

  // Quick autofill when choosing a model from Bank Data
  const handleSelectBankModel = (modelId: string) => {
    const found = bankDataModels.find(m => m.id === modelId);
    if (found) {
      setFormData(prev => ({
        ...prev,
        modelId: found.id,
        style: found.modelCode,
        targetDailyPcs: found.targetDailyPcs,
        targetOutputPcs: found.targetTotalPcs,
        smvStandard: found.smvStandard,
        manpower: found.manpowerStandard,
        workingHours: found.workingHoursStandard,
        note: found.description || prev.note
      }));
    }
  };

  // When choosing an active schedule / monthly planning
  const handleSelectSchedule = (schedId: string) => {
    setSelectedScheduleId(schedId);
    const sched = styleSchedules.find(s => s.id === schedId);
    if (sched) {
      setFormData(prev => ({
        ...prev,
        lineId: sched.lineId,
        lineName: sched.lineName,
        style: sched.styleName,
        modelId: sched.modelId || '',
        targetDailyPcs: sched.dailyTargetQty,
        smvStandard: sched.smv,
        targetOutputPcs: sched.orderQty,
        actualDailyPcs: sched.dailyTargetQty,
        actualOutputPcs: sched.actualQty + sched.dailyTargetQty,
        manpower: sched.manpower || prev.manpower,
        workingHours: sched.standardWorkingHours || prev.workingHours
      }));
    }
  };

  // Generate Smart Analysis
  const handleAutoAnalysis = () => {
    const result = generateSmartAnalysis(
      formData.actualDailyPcs,
      formData.targetDailyPcs,
      calcEff,
      formData.defectPercent
    );
    setFormData(prev => ({
      ...prev,
      analysisStatus: result.status,
      analysisNote: result.text
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const record: MonthlyProductivityRecord = {
      id: initialData ? initialData.id : `rec-${Date.now()}`,
      ...formData,
      actualOutputPcs: planPrevActual + formData.actualDailyPcs,
      targetOutputPcs: planOrderQty,
      efficiencyPercent: calcEff,
      productivityPcsPerOp: calcProd
    };

    onSave(record);

    // Update target reduction in linked schedule/plan
    if (selectedScheduleId && onUpdateScheduleActual) {
      onUpdateScheduleActual(selectedScheduleId, formData.actualDailyPcs);
    }

    onClose();
  };

  const isDailyReached = formData.actualDailyPcs >= formData.targetDailyPcs;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Accent Bar */}
        <div className="h-1.5 w-full bg-linear-to-r from-blue-700 via-blue-600 to-red-600"></div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
              <h3 className="text-base font-bold text-slate-900">
                {initialData ? 'Edit Data Produksi Harian' : 'Masukan Data Produksi Harian (Mengurangi Perencanaan)'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              PT Teratai Widjaja • Input harian otomatis mengurangi sisa target order perencanaan
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          
          {/* SECTION: HUBUNGKAN KE PERENCANAAN BULANAN (TARGET PENGURANGAN OTOMATIS) */}
          {styleSchedules.length > 0 && (
            <div className="p-3.5 bg-linear-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-blue-700 shrink-0" />
                  <span className="text-xs font-black text-blue-950 uppercase tracking-wide">
                    Hubungkan ke Perencanaan Bulanan Model:
                  </span>
                </div>
                <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                  Target Berkurang Otomatis
                </span>
              </div>

              <select
                value={selectedScheduleId}
                onChange={(e) => handleSelectSchedule(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 bg-white border border-blue-300 rounded-lg text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="">-- Pilih Rencana / Style yang Sedang Berjalan --</option>
                {styleSchedules.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.lineName} • {s.styleName} ({s.buyer}) • Target Order: {s.orderQty.toLocaleString('id-ID')} pcs • Sisa: {s.remainingQty.toLocaleString('id-ID')} pcs
                  </option>
                ))}
              </select>

              {/* Dynamic Target Reduction Panel */}
              <div className="p-2.5 bg-white/90 border border-blue-200 rounded-lg grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Target Order PO</span>
                  <strong className="font-mono text-slate-800 font-bold block">
                    {planOrderQty.toLocaleString('id-ID')} pcs
                  </strong>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Telah Tercapai</span>
                  <strong className="font-mono text-blue-700 font-bold block">
                    {planPrevActual.toLocaleString('id-ID')} pcs
                  </strong>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded p-1">
                  <span className="text-[10px] text-emerald-800 uppercase block font-black">
                    Sisa Setelah Hari Ini
                  </span>
                  <strong className="font-mono text-emerald-700 font-black text-xs block">
                    {planRemainingAfterToday.toLocaleString('id-ID')} pcs
                  </strong>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 text-[11px] text-blue-900 font-medium pt-0.5">
                <TrendingDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  Input harian <strong>{formData.actualDailyPcs} pcs</strong> akan <strong>hanya mengurangi</strong> sisa target order dari perencanaan.
                </span>
              </div>
            </div>
          )}

          {/* Quick Bank Data Selector Banner */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-slate-700 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Atau Pilih dari Bank Data Model</span>
                <span className="text-[10px] text-slate-500">Otomatis mengisi target harian, SMV standar, dan alokasi operator</span>
              </div>
            </div>
            <select
              value={formData.modelId || ''}
              onChange={(e) => handleSelectBankModel(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="">-- Pilih Model dari Bank Data --</option>
              {bankDataModels.map(m => (
                <option key={m.id} value={m.id}>
                  {m.modelCode} ({m.buyer}) • Target {m.targetDailyPcs} pcs/hr
                </option>
              ))}
            </select>
          </div>

          {/* Row 1: Line & Tanggal Masukan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lini Produksi (Line)
              </label>
              <select
                value={formData.lineId}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFormData(prev => ({
                    ...prev,
                    lineId: val,
                    lineName: `Line ${val}`
                  }));
                }}
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(l => (
                  <option key={l} value={l}>Line {l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tanggal Kerja (Masukan Tanggal)
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                required
              />
            </div>
          </div>

          {/* Row 2: Garment Style */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Model / Style Garment
            </label>
            <input
              type="text"
              value={formData.style}
              onChange={(e) => setFormData(prev => ({ ...prev, style: e.target.value }))}
              placeholder="Contoh: DELAMI H200, IPBO TOGA, UIIA JSU MHS"
              className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          {/* Row 3: Output Harian (Target vs Aktual per Hari) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Output Harian (Aktual & Target per Hari)
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                isDailyReached ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
              }`}>
                {isDailyReached ? 'Target Harian Tercapai' : 'Di Bawah Target Harian'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Target Output per Hari (Pcs/Hari)
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.targetDailyPcs}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetDailyPcs: Number(e.target.value) }))}
                  className="w-full text-xs font-mono font-bold px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Aktual Output per Hari (Pcs/Hari) — Mengurangi Target
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.actualDailyPcs}
                  onChange={(e) => setFormData(prev => ({ ...prev, actualDailyPcs: Number(e.target.value) }))}
                  className={`w-full text-xs font-mono font-black px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 ${
                    isDailyReached ? 'border-blue-300 focus:ring-blue-600 text-blue-700' : 'border-red-300 focus:ring-red-600 text-red-700'
                  }`}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block">Total Target Order PO</span>
                <input
                  type="number"
                  value={planOrderQty}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetOutputPcs: Number(e.target.value) }))}
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg mt-0.5"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Sisa Target Setelah Hari Ini</span>
                <input
                  type="text"
                  readOnly
                  value={`${planRemainingAfterToday.toLocaleString('id-ID')} pcs`}
                  className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg mt-0.5 text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Manpower, Jam Kerja, SMV, Defect */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Manpower (MP)
              </label>
              <input
                type="number"
                min={1}
                value={formData.manpower}
                onChange={(e) => setFormData(prev => ({ ...prev, manpower: Number(e.target.value) }))}
                className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
              <span className="text-[10px] text-slate-400">Jml Operator</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jam Kerja (Jam)
              </label>
              <input
                type="number"
                min={1}
                value={formData.workingHours}
                onChange={(e) => setFormData(prev => ({ ...prev, workingHours: Number(e.target.value) }))}
                className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
              <span className="text-[10px] text-slate-400">Jam/Hari</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                SMV Standar
              </label>
              <input
                type="number"
                step="0.01"
                min={0.1}
                value={formData.smvStandard}
                onChange={(e) => setFormData(prev => ({ ...prev, smvStandard: Number(e.target.value) }))}
                className="w-full text-xs font-mono font-bold px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-blue-700"
                required
              />
              <span className="text-[10px] text-slate-400">Menit/Pcs</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Defect (%)
              </label>
              <input
                type="number"
                step="0.1"
                min={0}
                max={100}
                value={formData.defectPercent}
                onChange={(e) => setFormData(prev => ({ ...prev, defectPercent: Number(e.target.value) }))}
                className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-[10px] text-slate-400">Toleransi ≤2%</span>
            </div>
          </div>

          {/* Row 5: KOLOM ANALISIS OPERASIONAL & STATUS EVALUASI */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <label className="text-xs font-bold text-slate-900 uppercase">
                  Kolom Analisis Operasional & Bottleneck
                </label>
              </div>

              <button
                type="button"
                onClick={handleAutoAnalysis}
                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs font-bold transition-colors self-start sm:self-auto cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-blue-600" />
                <span>Generate Analisis Cerdas</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Status Evaluasi
                </label>
                <select
                  value={formData.analysisStatus}
                  onChange={(e) => setFormData(prev => ({ ...prev, analysisStatus: e.target.value as any }))}
                  className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="optimal">Optimal / On-Track</option>
                  <option value="warning">Perlu Perhatian (Warning)</option>
                  <option value="critical">Kritis (Under Target / Bottleneck)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Hasil Analisis, Bottleneck & Rekomendasi
                </label>
                <textarea
                  rows={2}
                  value={formData.analysisNote}
                  onChange={(e) => setFormData(prev => ({ ...prev, analysisNote: e.target.value }))}
                  placeholder="Contoh: Terdeteksi bottleneck pada proses pasang kerah. Butuh re-balancing 1 operator bantuan."
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
            </div>
          </div>

          {/* Perhitungan Otomatis Banner */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-blue-700" />
              <span className="text-xs font-bold text-blue-900">Hasil Kalkulasi Efisiensi Harian:</span>
            </div>
            <div className="flex items-center space-x-4 text-xs font-mono">
              <div>
                <span className="text-slate-500 mr-1">Efisiensi:</span>
                <strong className={`font-black ${calcEff >= 70 ? 'text-blue-700' : 'text-red-600'}`}>
                  {calcEff}%
                </strong>
              </div>
              <div>
                <span className="text-slate-500 mr-1">Output/Operator:</span>
                <strong className="text-slate-800 font-bold">{calcProd} pcs/hari</strong>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm shadow-blue-200 flex items-center space-x-1.5 active:scale-95 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan & Kurangi Target Rencana</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
