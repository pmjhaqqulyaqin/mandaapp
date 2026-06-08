import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { toast } from 'sonner';
import {
  ClipboardCheck, Plus, ChevronDown, Calendar, Users, DoorOpen,
  CreditCard, FileText, ListChecks, FileSpreadsheet, Loader2,
  ArrowLeft, Settings as SettingsIcon
} from 'lucide-react';

// Tabs
import { MasterUjianTab } from './tabs/MasterUjianTab';
import { JadwalUjianTab } from './tabs/JadwalUjianTab';
import { PengawasTab } from './tabs/PengawasTab';
import { RuangPesertaTab } from './tabs/RuangPesertaTab';
import { KartuIdTab } from './tabs/KartuIdTab';
import { BeritaAcaraTab } from './tabs/BeritaAcaraTab';
import { DaftarHadirTab } from './tabs/DaftarHadirTab';
import { FormatNilaiTab } from './tabs/FormatNilaiTab';

// Modals
import { CreateUjianModal } from './components/CreateUjianModal';

type TabKey = 'master' | 'jadwal' | 'pengawas' | 'ruang' | 'kartu' | 'ba' | 'dh' | 'nilai';

const TABS: { key: TabKey; label: string; icon: any; shortLabel: string }[] = [
  { key: 'master', label: 'Master Ujian', icon: ClipboardCheck, shortLabel: 'Master' },
  { key: 'jadwal', label: 'Jadwal Ujian', icon: Calendar, shortLabel: 'Jadwal' },
  { key: 'pengawas', label: 'Pengawas', icon: Users, shortLabel: 'Pengawas' },
  { key: 'ruang', label: 'Ruang & Peserta', icon: DoorOpen, shortLabel: 'Ruang' },
  { key: 'kartu', label: 'Kartu & ID', icon: CreditCard, shortLabel: 'Kartu' },
  { key: 'ba', label: 'Berita Acara', icon: FileText, shortLabel: 'BA' },
  { key: 'dh', label: 'Daftar Hadir', icon: ListChecks, shortLabel: 'DH' },
  { key: 'nilai', label: 'Format Nilai', icon: FileSpreadsheet, shortLabel: 'Nilai' },
];

export const ExamManagementPage = () => {
  const [ujianList, setUjianList] = useState<any[]>([]);
  const [selectedUjianId, setSelectedUjianId] = useState<string>('');
  const [selectedUjian, setSelectedUjian] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Derive active tab from URL path (URL-driven tabs for sidebar navigation)
  const location = useLocation();
  const navigate = useNavigate();
  const tabSegment = location.pathname.split('/').filter(Boolean).pop();
  const activeTab: TabKey = (['jadwal', 'pengawas', 'ruang', 'kartu', 'ba', 'dh', 'nilai'].includes(tabSegment || ''))
    ? tabSegment as TabKey
    : 'master';

  const fetchUjianList = useCallback(async () => {
    try {
      const data = await apiClient<any[]>('/exams');
      setUjianList(data);
      // Auto-select first active exam
      if (data.length > 0 && !selectedUjianId) {
        const active = data.find((u: any) => u.status === 'aktif') || data[0];
        setSelectedUjianId(active.id);
        setSelectedUjian(active);
      }
    } catch (err) {
      console.error('Failed to fetch ujian:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUjianList(); }, [fetchUjianList]);

  useEffect(() => {
    if (selectedUjianId && ujianList.length > 0) {
      const found = ujianList.find(u => u.id === selectedUjianId);
      setSelectedUjian(found || null);
    }
  }, [selectedUjianId, ujianList]);

  const handleUjianCreated = (newUjian: any) => {
    fetchUjianList();
    setSelectedUjianId(newUjian.id);
    setCreateModalOpen(false);
    toast.success('Ujian berhasil dibuat!');
  };

  const handleSelectUjian = (id: string) => {
    setSelectedUjianId(id);
    setDropdownOpen(false);
  };

  const refreshUjian = () => fetchUjianList();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  const statusColor = selectedUjian?.status === 'aktif' ? 'bg-emerald-500' :
    selectedUjian?.status === 'draft' ? 'bg-amber-500' : 'bg-gray-400';

  // Tab icon map for mobile context nav
  const tabIcons: Record<string, React.ReactNode> = {
    master: <ClipboardCheck size={13} />,
    jadwal: <Calendar size={13} />,
    pengawas: <Users size={13} />,
    ruang: <DoorOpen size={13} />,
    kartu: <CreditCard size={13} />,
    ba: <FileText size={13} />,
    dh: <ListChecks size={13} />,
    nilai: <FileSpreadsheet size={13} />,
  };

  return (
    <div className="flex flex-col gap-3 md:gap-4">

      {/* ── Mobile Context Navigation (md:hidden) ── */}
      {/* Desktop uses sidebar from DashboardLayout; mobile needs inline sub-nav */}
      <div className="md:hidden -mx-3 px-3 sticky top-0 z-10">
        <div className="bg-white dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm overflow-hidden">
          {/* Header row: back button + title */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border-light/60 dark:border-border-dark/60">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors active:scale-90"
            >
              <ArrowLeft size={16} />
            </button>
            <ClipboardCheck size={16} className="text-indigo-500 shrink-0" />
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 truncate">Manajemen Ujian</span>
          </div>
          {/* Scrollable tab pills */}
          <div className="flex overflow-x-auto hide-scrollbar px-2 py-2 gap-1.5">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => navigate(tab.key === 'master' ? '/dashboard/exams' : `/dashboard/exams/${tab.key}`)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95 ${
                  activeTab === tab.key
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                    : 'bg-gray-100 dark:bg-white/5 text-text-secondary hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
              >
                {tabIcons[tab.key]}
                {tab.shortLabel}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Exam Selector Bar */}
      <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] p-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Exam Dropdown */}
          <div className="relative flex-1 min-w-0">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-[#333] rounded-lg text-sm hover:border-indigo-400 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ClipboardCheck size={16} className="text-indigo-500 shrink-0" />
                {selectedUjian ? (
                  <div className="text-left min-w-0">
                    <span className="font-semibold text-text-primary dark:text-text-darkPrimary truncate block">
                      {selectedUjian.namaUjian}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {selectedUjian.jenis} • {selectedUjian.tahunAjaran} • {selectedUjian.semester}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-400 italic">Pilih atau buat ujian...</span>
                )}
              </div>
              <ChevronDown size={16} className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                  {ujianList.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-400 text-sm">
                      Belum ada ujian. Buat ujian baru untuk memulai.
                    </div>
                  ) : (
                    ujianList.map(u => (
                      <button
                        key={u.id}
                        onClick={() => handleSelectUjian(u.id)}
                        className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#222] transition-colors flex items-center justify-between gap-2 ${u.id === selectedUjianId ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary dark:text-text-darkPrimary truncate">{u.namaUjian}</p>
                          <p className="text-[10px] text-gray-500">{u.jenis} • {u.tahunAjaran} • {u.semester}</p>
                        </div>
                        <span className={`shrink-0 w-2 h-2 rounded-full ${u.status === 'aktif' ? 'bg-emerald-500' : u.status === 'draft' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Status badge */}
          {selectedUjian && (
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white ${statusColor}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                {selectedUjian.status}
              </span>
              {selectedUjian.tanggalMulai && (
                <span className="text-[11px] text-gray-500 hidden sm:inline">
                  {new Date(selectedUjian.tanggalMulai).toLocaleDateString('id-ID')} — {new Date(selectedUjian.tanggalSelesai).toLocaleDateString('id-ID')}
                </span>
              )}
            </div>
          )}

          {/* New exam button */}
          <button
            onClick={() => setCreateModalOpen(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-sm"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Ujian Baru</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {selectedUjian && (
        <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden">
          <div className="p-4">
            {activeTab === 'master' && (
              <MasterUjianTab ujian={selectedUjian} onRefresh={refreshUjian} />
            )}
            {activeTab === 'jadwal' && (
              <JadwalUjianTab ujianId={selectedUjianId} />
            )}
            {activeTab === 'pengawas' && (
              <PengawasTab ujianId={selectedUjianId} />
            )}
            {activeTab === 'ruang' && (
              <RuangPesertaTab ujianId={selectedUjianId} />
            )}
            {activeTab === 'kartu' && (
              <KartuIdTab ujianId={selectedUjianId} ujian={selectedUjian} />
            )}
            {activeTab === 'ba' && (
              <BeritaAcaraTab ujianId={selectedUjianId} ujian={selectedUjian} />
            )}
            {activeTab === 'dh' && (
              <DaftarHadirTab ujianId={selectedUjianId} ujian={selectedUjian} />
            )}
            {activeTab === 'nilai' && (
              <FormatNilaiTab ujianId={selectedUjianId} ujian={selectedUjian} />
            )}
          </div>
        </div>
      )}

      {/* Empty state when no exam selected */}
      {!selectedUjian && !loading && (
        <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
            <ClipboardCheck size={32} className="text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary dark:text-text-darkPrimary mb-1">
            Mulai Kelola Ujian
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
            Buat ujian baru untuk mulai menyiapkan jadwal, ruang, pengawas, dan seluruh administrasi ujian.
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-lg shadow-indigo-500/25"
          >
            <Plus size={16} />
            Buat Ujian Baru
          </button>
        </div>
      )}

      {/* Create Ujian Modal */}
      <CreateUjianModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleUjianCreated}
      />
    </div>
  );
};
