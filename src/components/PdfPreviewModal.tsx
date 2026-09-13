import React, { useState, useMemo } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Layers,
  ChevronRight,
  Calendar,
  User,
  Sliders
} from 'lucide-react';
import { LineData, DashboardSummary, MonthlyProductivityRecord, LineIncident } from '../types';
import { PdfReportTemplate } from './PdfReportTemplate';
import { IncidentPdfTemplate } from './IncidentPdfTemplate';
import { exportReportToPdf } from '../utils/pdfExport';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  lines: LineData[];
  summary: DashboardSummary;
  monthlyRecap: MonthlyProductivityRecord[];
  incidents: LineIncident[];
  initialReportType?: 'productivity' | 'incidents';
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  lines,
  summary,
  monthlyRecap,
  incidents,
  initialReportType = 'productivity'
}) => {
  const [reportMode, setReportMode] = useState<'daily' | 'monthly' | 'incidents'>(
    initialReportType === 'incidents' ? 'incidents' : 'daily'
  );
  
  // Available dates for daily reports
  const availableDates = useMemo(() => {
    const dates = Array.from(new Set(monthlyRecap.map(r => r.date).filter(Boolean))).sort().reverse();
    return dates.length > 0 ? dates : ['2026-06-25'];
  }, [monthlyRecap]);

  const [selectedDate, setSelectedDate] = useState<string>(availableDates[0] || '2026-06-25');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isExporting, setIsExporting] = useState(false);
  const [showSignOptions, setShowSignOptions] = useState(false);

  // Manual Name inputs (Default empty string per user request: "untuk semua nama dihilangkan sehingga akan disi manual")
  const [supervisorName, setSupervisorName] = useState<string>('');
  const [peName, setPeName] = useState<string>('');
  const [fmName, setFmName] = useState<string>('');

  // Sync initial report type and mobile responsive zoom when opening
  React.useEffect(() => {
    if (isOpen) {
      if (initialReportType === 'incidents') {
        setReportMode('incidents');
      } else {
        setReportMode('daily');
      }
      if (typeof window !== 'undefined' && window.innerWidth < 640) {
        setZoomLevel(45);
      } else {
        setZoomLevel(100);
      }
    }
  }, [isOpen, initialReportType]);

  if (!isOpen) return null;

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 15, 140));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 15, 60));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const elementId = reportMode === 'incidents' ? 'printable-incident-report' : 'printable-pdf-report';
      const filename = reportMode === 'incidents'
        ? `Laporan_Disposisi_Hambatan_Line_${Date.now()}.pdf`
        : reportMode === 'daily'
          ? `Laporan_Produksi_Harian_${selectedDate}_${Date.now()}.pdf`
          : `Laporan_Rekapitulasi_Bulanan_${Date.now()}.pdf`;

      await exportReportToPdf(elementId, filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Gagal membuat file PDF secara otomatis. Membuka dialog cetak browser sebagai alternatif...');
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/85 backdrop-blur-sm flex flex-col animate-in fade-in duration-150 pdf-preview-modal-backdrop">
      
      {/* Top Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 text-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md z-10 pdf-preview-toolbar">
        
        {/* Left: Document Info */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold tracking-tight">Cetak & Pratinjau Dokumen PDF</h3>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold border border-blue-400/30">
                A4 Landscape
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Laporan harian per tanggal, laporan bulanan, dan nama penandatangan manual
            </p>
          </div>
        </div>

        {/* Center: Mode Switcher (Harian per tanggal vs Bulanan vs Disposisi) */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs w-full sm:w-auto">
          <button
            onClick={() => setReportMode('daily')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              reportMode === 'daily'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Laporan Harian</span>
          </button>

          <button
            onClick={() => setReportMode('monthly')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              reportMode === 'monthly'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Laporan Bulanan</span>
          </button>

          <button
            onClick={() => setReportMode('incidents')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              reportMode === 'incidents'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
            <span>Disposisi Hambatan ({incidents.length})</span>
          </button>
        </div>

        {/* Right: Zoom Controls & Action Buttons */}
        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto space-x-2 sm:space-x-3">
          
          {/* Zoom Buttons */}
          <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 text-xs text-slate-300 px-1 py-0.5">
            <button
              onClick={handleZoomOut}
              className="p-1 sm:p-1.5 hover:text-white rounded hover:bg-slate-700 transition-colors cursor-pointer"
              title="Perkecil (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={handleResetZoom}
              className="px-1.5 sm:px-2 font-mono text-[10px] sm:text-[11px] font-bold hover:text-white cursor-pointer"
              title="Reset ke 100%"
            >
              {zoomLevel}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1 sm:p-1.5 hover:text-white rounded hover:bg-slate-700 transition-colors cursor-pointer"
              title="Perbesar (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Toggle Isi Nama Manual */}
            <button
              onClick={() => setShowSignOptions(!showSignOptions)}
              className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                showSignOptions ? 'bg-amber-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Isi nama penandatangan manual"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Nama Manual</span>
            </button>

            {/* Cetak Sekarang (Print Dialog) */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-colors active:scale-95 cursor-pointer"
              title="Cetak dokumen langsung menggunakan printer browser"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
              <span className="hidden sm:inline">Cetak</span>
            </button>

            {/* Unduh File PDF */}
            <button
              onClick={handleDownload}
              disabled={isExporting}
              className="inline-flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-900/40 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              title="Download dokumen sebagai file PDF"
            >
              <Download className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isExporting ? 'animate-bounce' : ''}`} />
              <span className="sm:hidden">{isExporting ? 'Proses...' : 'Unduh'}</span>
              <span className="hidden sm:inline">{isExporting ? 'Memproses PDF...' : 'Unduh PDF'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
              title="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

      </div>

      {/* Filter / Customization Sub-bar */}
      <div className="bg-slate-900/95 border-b border-slate-800/80 px-6 py-2 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3 no-print">
        
        {/* Date Selector for Daily Report */}
        {reportMode === 'daily' ? (
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-semibold flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Pilih Tanggal Laporan Harian:</span>
            </span>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {availableDates.map(d => (
                <option key={d} value={d}>
                  Tanggal: {d}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-blue-300 bg-blue-950/60 border border-blue-800 px-2 py-0.5 rounded">
              Menampilkan {monthlyRecap.filter(r => r.date === selectedDate).length} data lini pada tanggal ini
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>
              {reportMode === 'monthly'
                ? 'Menampilkan Rekapitulasi Akumulasi Bulanan Semua Tanggal & Evaluasi Target Order'
                : 'Menampilkan Formulir Disposisi Khusus Hambatan Line Sewing & Tindakan Penyelesaian (CAPA)'}
            </span>
          </div>
        )}

        {/* Quick status of manual signatures */}
        <div className="flex items-center space-x-2 text-[11px] text-slate-400">
          <span>Status Nama Penandatangan:</span>
          <span className={`px-2 py-0.5 rounded font-bold ${
            supervisorName || peName || fmName ? 'bg-amber-900/60 text-amber-300 border border-amber-700' : 'bg-slate-800 text-slate-400'
          }`}>
            {supervisorName || peName || fmName ? 'Telah Diisi Manual' : 'Kosong (Untuk Tanda Tangan Basah)'}
          </span>
        </div>
      </div>

      {/* Collapsible Manual Signatures Setup Bar */}
      {showSignOptions && (
        <div className="bg-slate-800/90 border-b border-slate-700 px-6 py-3 text-xs animate-in slide-in-from-top-2 duration-150 no-print">
          <div className="flex items-center justify-between mb-2">
            <span className="font-extrabold text-white text-xs uppercase tracking-wide flex items-center space-x-1.5">
              <User className="w-4 h-4 text-amber-400" />
              <span>Input Manual Nama Pejabat Penandatangan:</span>
            </span>
            <span className="text-[11px] text-slate-400">
              *Bila dikosongkan, PDF akan menampilkan garis kosong <code>( ............................. )</code>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                1. Supervisor Sewing / Chief Line
              </label>
              <input
                type="text"
                placeholder="Kosong untuk tanda tangan basah..."
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                2. Production Engineer (PE)
              </label>
              <input
                type="text"
                placeholder="Kosong untuk tanda tangan basah..."
                value={peName}
                onChange={(e) => setPeName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                3. Factory Manager (FM)
              </label>
              <input
                type="text"
                placeholder="Kosong untuk tanda tangan basah..."
                value={fmName}
                onChange={(e) => setFmName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Preview Canvas (Paper Workspace) */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-950/70 flex justify-center items-start">
        <div 
          className="transition-transform duration-150 origin-top flex flex-col items-center pdf-preview-paper"
          style={{ transform: `scale(${zoomLevel / 100})` }}
        >
          {reportMode === 'incidents' ? (
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-300 w-full max-w-[1040px]">
              <IncidentPdfTemplate
                incidents={incidents}
                supervisorName={supervisorName}
                peName={peName}
                fmName={fmName}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-300 w-full max-w-[1040px]">
              <PdfReportTemplate
                lines={lines}
                summary={summary}
                monthlyRecap={monthlyRecap}
                incidents={incidents}
                reportMode={reportMode}
                selectedDate={selectedDate}
                supervisorName={supervisorName}
                peName={peName}
                fmName={fmName}
              />
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
