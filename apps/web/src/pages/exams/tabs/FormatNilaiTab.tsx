import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import {
  FileSpreadsheet, Download, Printer, Save, Settings2,
  Search, ChevronDown, ChevronUp, BookOpen, RotateCcw,
  CheckCircle2, Loader2, Filter
} from 'lucide-react';

interface Props {
  ujianId: string;
  ujian: any;
}

interface FormatConfig {
  tipe: 'pilihan_ganda' | 'esai' | 'campuran';
  jumlahPG: number;
  jumlahEsai: number;
  bobotPG: number;
  bobotEsai: number;
  kolomRemedial: boolean;
}

const DEFAULT_FORMAT: FormatConfig = {
  tipe: 'campuran',
  jumlahPG: 40,
  jumlahEsai: 5,
  bobotPG: 60,
  bobotEsai: 40,
  kolomRemedial: false,
};

const TIPE_OPTIONS = [
  { value: 'pilihan_ganda', label: 'Pilihan Ganda', icon: '🔘', color: 'indigo' },
  { value: 'esai', label: 'Esai', icon: '📝', color: 'emerald' },
  { value: 'campuran', label: 'Campuran (PG + Esai)', icon: '📋', color: 'violet' },
];

export const FormatNilaiTab = ({ ujianId, ujian }: Props) => {
  const [jadwal, setJadwal] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [distribusi, setDistribusi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Format config
  const [globalFormat, setGlobalFormat] = useState<FormatConfig>({ ...DEFAULT_FORMAT });
  const [perMapelFormat, setPerMapelFormat] = useState<Record<string, FormatConfig>>({});
  const [showConfig, setShowConfig] = useState(true);

  // Preview
  const [selectedMapel, setSelectedMapel] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Extract unique mapel from jadwal
  const uniqueMapelList = Array.from(
    new Set(jadwal.map(j => j.mataPelajaran).filter(Boolean))
  ).sort();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [jData, rData, dData] = await Promise.all([
        apiClient<any[]>(`/exams/${ujianId}/jadwal`),
        apiClient<any[]>(`/exams/${ujianId}/ruang`),
        apiClient<any[]>(`/exams/${ujianId}/distribusi`),
      ]);
      setJadwal(Array.isArray(jData) ? jData : []);
      const roomArr = Array.isArray(rData) ? (rData as any).data || rData : [];
      setRooms(roomArr);
      setDistribusi(Array.isArray(dData) ? dData : []);

      // Load saved format from pengaturan
      const pengaturan = ujian?.pengaturan || {};
      if (pengaturan.formatNilai) {
        if (pengaturan.formatNilai.default) {
          setGlobalFormat({ ...DEFAULT_FORMAT, ...pengaturan.formatNilai.default });
        }
        if (pengaturan.formatNilai.perMapel) {
          setPerMapelFormat(pengaturan.formatNilai.perMapel);
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [ujianId, ujian]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-select first mapel
  useEffect(() => {
    if (uniqueMapelList.length > 0 && !selectedMapel) {
      setSelectedMapel(uniqueMapelList[0]);
    }
  }, [uniqueMapelList, selectedMapel]);

  const getFormatForMapel = (mapel: string): FormatConfig => {
    return perMapelFormat[mapel] || globalFormat;
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const formatNilai = {
        default: globalFormat,
        perMapel: perMapelFormat,
      };
      await apiClient(`/exams/${ujianId}`, {
        method: 'PUT',
        data: { pengaturan: { formatNilai } },
      });
      toast.success('Konfigurasi format nilai berhasil disimpan');
    } catch (err: any) {
      toast.error('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSetPerMapel = (mapel: string, config: Partial<FormatConfig>) => {
    setPerMapelFormat(prev => ({
      ...prev,
      [mapel]: { ...(prev[mapel] || globalFormat), ...config },
    }));
  };

  const handleResetMapel = (mapel: string) => {
    setPerMapelFormat(prev => {
      const next = { ...prev };
      delete next[mapel];
      return next;
    });
  };

  const handleExportExcel = (mapel?: string) => {
    const baseUrl = import.meta.env.VITE_API_URL;
    let url = `${baseUrl}/exams/${ujianId}/format-nilai/export`;
    const params: string[] = [];
    if (mapel) params.push(`mapel=${encodeURIComponent(mapel)}`);
    if (selectedRoomId !== 'ALL') params.push(`ruangId=${selectedRoomId}`);
    if (params.length > 0) url += '?' + params.join('&');
    window.open(url, '_blank');
    toast.success(mapel ? `Mengunduh Format Nilai ${mapel}...` : 'Mengunduh Format Nilai seluruh mapel...');
  };

  const handlePrintPDF = (mapel?: string) => {
    let url = `/dashboard/print-format-nilai/${ujianId}`;
    const params: string[] = [];
    if (mapel) params.push(`mapel=${encodeURIComponent(mapel)}`);
    if (selectedRoomId !== 'ALL') params.push(`ruangId=${selectedRoomId}`);
    if (params.length > 0) url += '?' + params.join('&');
    window.open(url, '_blank');
  };

  // Get preview data
  const jadwalForMapel = jadwal.filter(j => j.mataPelajaran === selectedMapel);
  const previewStudents = distribusi.filter(d => {
    const matchRoom = selectedRoomId === 'ALL' || d.ruangId === selectedRoomId;
    const matchSearch = !search ||
      d.siswa?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      d.siswa?.nis?.includes(search) ||
      d.siswa?.nisn?.includes(search);
    return matchRoom && matchSearch;
  });

  const currentFormat = selectedMapel ? getFormatForMapel(selectedMapel) : globalFormat;
  const hasCustomFormat = selectedMapel && perMapelFormat[selectedMapel];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin text-emerald-500" size={24} />
      </div>
    );
  }

  // Generate nomor peserta helper
  const getNomorPeserta = (item: any, idx: number) => {
    const lastYearStr = (ujian?.tahunAjaran || '').length >= 2 ? (ujian?.tahunAjaran || '').slice(-2) : '00';
    const semesterLower = (ujian?.semester || '').toLowerCase();
    const semCode = semesterLower.includes('ganjil') ? '01' : semesterLower.includes('genap') ? '02' : '00';
    const kelasStr2 = (item.siswa?.fullClassName || item.siswa?.className || '').toUpperCase();
    let gradeCode = '00';
    if (kelasStr2.includes('XII') || kelasStr2.includes('12')) gradeCode = '12';
    else if (kelasStr2.includes('XI') || kelasStr2.includes('11')) gradeCode = '11';
    else if (kelasStr2.includes('X') || kelasStr2.includes('10')) gradeCode = '10';
    const ruangMatch = (item.ruang?.namaRuang || '').match(/\d+/);
    const ruangNumber = ruangMatch ? parseInt(ruangMatch[0], 10) : 0;
    const ruangCode = ruangNumber.toString().padStart(2, '0');
    const urutCode = (item.urutRuang || idx + 1).toString().padStart(3, '0');
    return `${lastYearStr}-${semCode}-${gradeCode}-${ruangCode}-${urutCode}`;
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Konfigurasi dan generate lembar penilaian per mata ujian. Format otomatis berdasarkan jadwal ujian.
      </p>

      {/* Mapel Summary Cards */}
      {uniqueMapelList.length === 0 ? (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-lg p-4 text-center">
          <BookOpen size={32} className="mx-auto text-amber-400 mb-2" />
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Belum ada jadwal ujian
          </p>
          <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1">
            Tambahkan jadwal ujian terlebih dahulu di tab "Jadwal Ujian" agar mata pelajaran otomatis muncul.
          </p>
        </div>
      ) : (
        <>
          {/* Quick Mapel Chips */}
          <div className="flex flex-wrap gap-2">
            {uniqueMapelList.map(mapel => {
              const fmt = getFormatForMapel(mapel);
              const isActive = selectedMapel === mapel;
              const jadwalInfo = jadwal.find(j => j.mataPelajaran === mapel);
              const tipeBadge = TIPE_OPTIONS.find(t => t.value === fmt.tipe);

              return (
                <button
                  key={mapel}
                  onClick={() => setSelectedMapel(mapel)}
                  className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'bg-white dark:bg-[#111] border-gray-200 dark:border-[#333] hover:border-emerald-300 dark:hover:border-emerald-700'
                  }`}
                >
                  <div>
                    <div className={`text-xs font-semibold ${isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-text-primary dark:text-text-darkPrimary'}`}>
                      {mapel}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        fmt.tipe === 'pilihan_ganda' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' :
                        fmt.tipe === 'esai' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                        'bg-violet-100 dark:bg-violet-900/30 text-violet-600'
                      }`}>
                        {tipeBadge?.icon} {tipeBadge?.label}
                      </span>
                      {jadwalInfo?.tanggal && (
                        <span className="text-[9px] text-gray-400">
                          {new Date(jadwalInfo.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                  {perMapelFormat[mapel] && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-white dark:border-[#111]" title="Custom format" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Config Panel */}
          <div className="bg-white dark:bg-[#0a0a0a] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#111] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings2 size={16} className="text-emerald-500" />
                <span className="text-xs font-semibold text-text-primary dark:text-text-darkPrimary">
                  Pengaturan Format {selectedMapel ? `— ${selectedMapel}` : '(Default)'}
                </span>
                {hasCustomFormat && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-900/20 text-amber-600">
                    CUSTOM
                  </span>
                )}
              </div>
              {showConfig ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </button>

            {showConfig && (
              <div className="border-t border-gray-100 dark:border-[#222] p-4 space-y-4">
                {/* Tipe soal */}
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Tipe Format Soal</label>
                  <div className="flex gap-2">
                    {TIPE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          const update = { tipe: opt.value as FormatConfig['tipe'] };
                          if (selectedMapel) {
                            handleSetPerMapel(selectedMapel, update);
                          } else {
                            setGlobalFormat(prev => ({ ...prev, ...update }));
                          }
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                          currentFormat.tipe === opt.value
                            ? `bg-${opt.color}-50 dark:bg-${opt.color}-900/20 border-${opt.color}-300 dark:border-${opt.color}-700 text-${opt.color}-700 dark:text-${opt.color}-400 ring-1 ring-${opt.color}-500/20`
                            : 'bg-gray-50 dark:bg-[#111] border-gray-200 dark:border-[#333] text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <span>{opt.icon}</span> {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detail config */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(currentFormat.tipe === 'pilihan_ganda' || currentFormat.tipe === 'campuran') && (
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Jumlah Soal PG</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={currentFormat.jumlahPG}
                        onChange={e => {
                          const val = { jumlahPG: parseInt(e.target.value) || 0 };
                          selectedMapel ? handleSetPerMapel(selectedMapel, val) : setGlobalFormat(p => ({ ...p, ...val }));
                        }}
                        className="w-full h-8 px-3 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-xs text-center font-mono outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>
                  )}
                  {(currentFormat.tipe === 'esai' || currentFormat.tipe === 'campuran') && (
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Jumlah Soal Esai</label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={currentFormat.jumlahEsai}
                        onChange={e => {
                          const val = { jumlahEsai: parseInt(e.target.value) || 0 };
                          selectedMapel ? handleSetPerMapel(selectedMapel, val) : setGlobalFormat(p => ({ ...p, ...val }));
                        }}
                        className="w-full h-8 px-3 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-xs text-center font-mono outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>
                  )}
                  {currentFormat.tipe === 'campuran' && (
                    <>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Bobot PG (%)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={currentFormat.bobotPG}
                          onChange={e => {
                            const pg = parseInt(e.target.value) || 0;
                            const val = { bobotPG: pg, bobotEsai: 100 - pg };
                            selectedMapel ? handleSetPerMapel(selectedMapel, val) : setGlobalFormat(p => ({ ...p, ...val }));
                          }}
                          className="w-full h-8 px-3 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-xs text-center font-mono outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Bobot Esai (%)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={currentFormat.bobotEsai}
                          disabled
                          className="w-full h-8 px-3 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-100 dark:bg-[#111] text-xs text-center font-mono text-gray-400 cursor-not-allowed"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Kolom Remedial */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="kolom-remedial"
                    checked={currentFormat.kolomRemedial}
                    onChange={e => {
                      const val = { kolomRemedial: e.target.checked };
                      selectedMapel ? handleSetPerMapel(selectedMapel, val) : setGlobalFormat(p => ({ ...p, ...val }));
                    }}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="kolom-remedial" className="text-[11px] text-gray-600 dark:text-gray-400">
                    Sertakan kolom Remedial
                  </label>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleSaveConfig}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Simpan Konfigurasi
                  </button>
                  {selectedMapel && hasCustomFormat && (
                    <button
                      onClick={() => handleResetMapel(selectedMapel)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-medium border border-gray-200 dark:border-[#333] text-gray-500 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                    >
                      <RotateCcw size={12} /> Reset ke Default
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bulk Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handlePrintPDF()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all active:scale-95"
            >
              <Printer size={12} /> Cetak Semua PDF
            </button>
            <button
              onClick={() => handleExportExcel()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-gray-900 dark:bg-white text-white dark:text-black hover:opacity-90 transition-colors"
            >
              <Download size={12} /> Export Semua Excel
            </button>

            <div className="flex-1" />

            {/* Room filter */}
            <div className="flex items-center gap-1.5">
              <Filter size={12} className="text-gray-400" />
              <select
                value={selectedRoomId}
                onChange={e => setSelectedRoomId(e.target.value)}
                className="h-7 px-2 cursor-pointer text-[10px] font-semibold rounded-lg bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-text-primary dark:text-text-darkPrimary focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                <option value="ALL">Semua Ruang</option>
                {rooms.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.namaRuang}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected Mapel Detail */}
          {selectedMapel && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                  <h3 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">
                    Preview: {selectedMapel}
                  </h3>
                  {jadwalForMapel.length > 0 && (
                    <span className="text-[10px] text-gray-400">
                      {new Date(jadwalForMapel[0].tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                      {' • '}
                      {jadwalForMapel[0].waktuMulai} – {jadwalForMapel[0].waktuSelesai}
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handlePrintPDF(selectedMapel)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-text-primary dark:text-text-darkPrimary hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                  >
                    <Printer size={11} /> Cetak PDF
                  </button>
                  <button
                    onClick={() => handleExportExcel(selectedMapel)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-text-primary dark:text-text-darkPrimary hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                  >
                    <Download size={11} /> Excel
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="h-8 pl-8 pr-3 w-full rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-xs outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="Cari nama / NIS / NISN..." value={search} onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-[#222]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 dark:bg-black/20 text-[10px] uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold w-10">No</th>
                      <th className="px-3 py-2.5 font-semibold">No. Peserta</th>
                      <th className="px-3 py-2.5 font-semibold">Nama Peserta</th>
                      {(currentFormat.tipe === 'pilihan_ganda' || currentFormat.tipe === 'campuran') && (
                        <th className="px-3 py-2.5 font-semibold text-center w-20">PG</th>
                      )}
                      {(currentFormat.tipe === 'esai' || currentFormat.tipe === 'campuran') && (
                        <th className="px-3 py-2.5 font-semibold text-center w-20">Esai</th>
                      )}
                      <th className="px-3 py-2.5 font-semibold text-center w-24">Nilai Akhir</th>
                      {currentFormat.kolomRemedial && (
                        <th className="px-3 py-2.5 font-semibold text-center w-20">Remedial</th>
                      )}
                      <th className="px-3 py-2.5 font-semibold">Ruang</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-[#1a1a1a]">
                    {previewStudents.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-3 py-8 text-center text-gray-400 italic">
                          {distribusi.length === 0
                            ? 'Belum ada peserta terdistribusi. Distribusikan peserta ke ruang terlebih dahulu.'
                            : 'Tidak ada data yang cocok dengan filter.'}
                        </td>
                      </tr>
                    ) : (
                      previewStudents.slice(0, 50).map((item, i) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a] transition-colors">
                          <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-2 font-mono text-emerald-600 font-semibold text-[10px]">
                            {getNomorPeserta(item, i)}
                          </td>
                          <td className="px-3 py-2 font-semibold text-text-primary dark:text-text-darkPrimary">
                            {item.siswa?.fullName || '-'}
                          </td>
                          {(currentFormat.tipe === 'pilihan_ganda' || currentFormat.tipe === 'campuran') && (
                            <td className="px-3 py-2 text-center text-gray-300 dark:text-gray-600">—</td>
                          )}
                          {(currentFormat.tipe === 'esai' || currentFormat.tipe === 'campuran') && (
                            <td className="px-3 py-2 text-center text-gray-300 dark:text-gray-600">—</td>
                          )}
                          <td className="px-3 py-2 text-center text-gray-300 dark:text-gray-600">—</td>
                          {currentFormat.kolomRemedial && (
                            <td className="px-3 py-2 text-center text-gray-300 dark:text-gray-600">—</td>
                          )}
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 text-[10px] font-bold">
                              {item.ruang?.namaRuang || '-'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {previewStudents.length > 50 && (
                <p className="text-[10px] text-amber-500">Menampilkan 50 dari {previewStudents.length} peserta. Export untuk data lengkap.</p>
              )}
              <p className="text-[10px] text-gray-400">
                Total: {previewStudents.length} peserta • Format: {TIPE_OPTIONS.find(t => t.value === currentFormat.tipe)?.label}
                {currentFormat.tipe === 'campuran' && ` (PG ${currentFormat.bobotPG}% + Esai ${currentFormat.bobotEsai}%)`}
              </p>
            </div>
          )}
        </>
      )}

      {/* Info */}
      <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 space-y-0.5">
            <p className="font-medium">Petunjuk Penggunaan:</p>
            <ul className="list-disc list-inside text-emerald-600 dark:text-emerald-500 space-y-0.5 ml-1">
              <li>Mata pelajaran otomatis dari jadwal ujian</li>
              <li>Konfigurasi format berlaku global, atau per-mapel dengan klik chip mapel</li>
              <li>Kolom nilai PG dan Esai diisi oleh guru mapel (1 kolom per jenis)</li>
              <li>Cetak PDF untuk lembar fisik, Export Excel untuk pengolahan digital</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
