import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../lib/api';
import { Breadcrumbs } from '@mandaapp/ui/src/components/Breadcrumbs';
import { toast } from 'sonner';
import {
  GraduationCap, Users, Trophy, ClipboardList, Settings, BarChart3,
  Search, ChevronDown, Filter, Eye, Check, X, Loader2, RefreshCw,
  CheckCircle, Clock, XCircle, AlertCircle
} from 'lucide-react';

type TabKey = 'overview' | 'pendaftar' | 'konfigurasi';

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'pendaftar', label: 'Data Pendaftar', icon: Users },
  { key: 'konfigurasi', label: 'Konfigurasi Jalur', icon: Settings },
];

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  menunggu: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  terverifikasi: { label: 'Terverifikasi', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  diterima: { label: 'Diterima', color: 'bg-emerald-100 text-emerald-700', icon: Check },
  ditolak: { label: 'Ditolak', color: 'bg-red-100 text-red-700', icon: XCircle },
  cadangan: { label: 'Cadangan', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
};

export const PPDBAdminPage = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiClient<any>('/ppdb/admin/stats');
      setStats(data);
    } catch (err) { console.error(err); }
    finally { setLoadingStats(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'PMB / SIMPMB' }]} />
        <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 dark:from-emerald-400 dark:to-blue-400 bg-clip-text text-transparent mt-1">
          PMB / SIMPMB 2026
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Penerimaan Murid Baru — Tahun Ajaran {stats?.config?.tahunAjaran || '2026/2027'}</p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden">
        <div className="border-b border-gray-100 dark:border-[#222] overflow-x-auto">
          <div className="flex min-w-max">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center gap-1.5 px-5 py-3 text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                  {isActive && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-emerald-500 rounded-t-full" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 md:p-5">
          {activeTab === 'overview' && <OverviewTab stats={stats} loading={loadingStats} />}
          {activeTab === 'pendaftar' && <PendaftarTab stats={stats} />}
          {activeTab === 'konfigurasi' && <KonfigurasiTab onSaved={fetchStats} />}
        </div>
      </div>
    </div>
  );
};

// ============ OVERVIEW TAB ============
const OverviewTab = ({ stats, loading }: { stats: any; loading: boolean }) => {
  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-500" size={24} /></div>;
  if (!stats) return <p className="text-sm text-gray-400 text-center py-12">Belum ada konfigurasi PMB aktif.</p>;

  const metricCards = [
    { label: 'Total Pendaftar', value: stats.totalPendaftar, icon: Users, color: 'from-emerald-500 to-emerald-600' },
    ...(stats.jalurStats || []).map((j: any) => ({
      label: `Jalur ${j.namaJalur}`,
      value: `${j.totalPendaftar} / ${j.kuota}`,
      icon: j.namaJalur === 'PRESTASI' ? Trophy : ClipboardList,
      color: j.namaJalur === 'PRESTASI' ? 'from-amber-500 to-orange-500' : 'from-blue-500 to-indigo-500',
      sub: j.isActive ? '🟢 Aktif' : '⏸️ Nonaktif',
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card: any, i: number) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-[#222] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                  <Icon size={18} className="text-white" />
                </div>
                {card.sub && <span className="text-[10px] font-bold text-gray-500">{card.sub}</span>}
              </div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{card.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Status per jalur */}
      {stats.jalurStats?.map((j: any) => (
        <div key={j.id} className="bg-gray-50 dark:bg-[#0a0a0a] rounded-xl p-4 border border-gray-100 dark:border-[#222]">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
            {j.namaJalur === 'PRESTASI' ? '🏆' : '📋'} Jalur {j.namaJalur} — Detail Status
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(STATUS_MAP).map(([key, meta]) => (
              <div key={key} className="text-center">
                <p className="text-lg font-bold text-gray-800 dark:text-white">{(j as any)[key] || 0}</p>
                <p className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block ${meta.color}`}>{meta.label}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============ PENDAFTAR TAB ============
const PendaftarTab = ({ stats }: { stats: any }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterJalur, setFilterJalur] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterJalur) params.set('jalurId', filterJalur);
      if (filterStatus) params.set('status', filterStatus);
      params.set('page', String(page));
      params.set('limit', '15');
      const result = await apiClient<any>(`/ppdb/admin/pendaftar?${params}`);
      setData(result.data || []);
      setTotal(result.total || 0);
      setTotalPages(result.totalPages || 1);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search, filterJalur, filterStatus, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      const d = await apiClient<any>(`/ppdb/admin/pendaftar/${id}`);
      setDetail(d);
    } catch (err) { toast.error('Gagal memuat detail'); }
    finally { setLoadingDetail(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiClient(`/ppdb/admin/pendaftar/${id}/status`, { data: { status }, method: 'PUT' });
      toast.success(`Status diubah ke: ${status}`);
      fetchData();
      if (selectedId === id) openDetail(id);
    } catch (err: any) { toast.error(err.message); }
  };

  const jalurList = stats?.jalurStats || [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari NISN, Nama, atau No. Pendaftaran..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-[#333] text-sm outline-none focus:border-emerald-400"
          />
        </div>
        <select
          value={filterJalur}
          onChange={e => { setFilterJalur(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-lg border border-gray-200 dark:border-[#333] text-sm outline-none"
        >
          <option value="">Semua Jalur</option>
          {jalurList.map((j: any) => (
            <option key={j.id} value={j.id}>{j.namaJalur}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-lg border border-gray-200 dark:border-[#333] text-sm outline-none"
        >
          <option value="">Semua Status</option>
          {Object.entries(STATUS_MAP).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 dark:bg-[#0a0a0a]">
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600">No</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600">NISN</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Nama</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Jalur</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Nilai</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Status</th>
              <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" size={20} /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-400">Belum ada data pendaftar</td></tr>
            ) : data.map((row: any, i: number) => {
              const statusMeta = STATUS_MAP[row.status] || STATUS_MAP.menunggu;
              return (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-[#0a0a0a] transition-colors">
                  <td className="px-3 py-2.5 text-gray-500">{(page - 1) * 15 + i + 1}</td>
                  <td className="px-3 py-2.5 font-mono text-gray-700 dark:text-gray-300">{row.nisn}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-800 dark:text-white">{row.nama}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.jalurNama === 'PRESTASI' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                      {row.jalurNama}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-gray-700 dark:text-gray-300">{row.nilaiAkhir || '-'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusMeta.color}`}>
                      {statusMeta.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button onClick={() => openDetail(row.id)} className="px-2.5 py-1 bg-gray-100 dark:bg-[#222] rounded text-[10px] font-semibold text-gray-600 hover:text-emerald-600 transition-colors">
                      <Eye size={12} className="inline mr-1" />Detail
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Total: {total} pendaftar</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border rounded disabled:opacity-30">← Prev</button>
          <span>Hal {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border rounded disabled:opacity-30">Next →</button>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedId(null)}>
          <div className="bg-white dark:bg-[#111] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {loadingDetail ? (
              <div className="flex justify-center py-16"><Loader2 className="animate-spin text-emerald-500" size={24} /></div>
            ) : detail ? (
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">{detail.dataDiri?.namaLengkap}</h2>
                    <p className="text-xs text-gray-500">No: {detail.noPendaftaran} • NISN: {detail.nisn}</p>
                  </div>
                  <button onClick={() => setSelectedId(null)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#222] flex items-center justify-center">
                    <X size={16} />
                  </button>
                </div>

                {/* Status & Actions */}
                <div className="flex flex-wrap items-center gap-2 mb-5 p-3 bg-gray-50 dark:bg-[#0a0a0a] rounded-xl">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_MAP[detail.status]?.color || ''}`}>
                    {STATUS_MAP[detail.status]?.label || detail.status}
                  </span>
                  <div className="flex-1" />
                  <button onClick={() => updateStatus(detail.id, 'terverifikasi')} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-[10px] font-bold hover:bg-blue-600 transition-colors">✅ Verifikasi</button>
                  <button onClick={() => updateStatus(detail.id, 'ditolak')} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-[10px] font-bold hover:bg-red-600 transition-colors">❌ Tolak</button>
                </div>

                {/* Data Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="p-4 border border-gray-100 dark:border-[#222] rounded-xl">
                    <h3 className="text-xs font-bold text-gray-600 mb-2">📋 Data Diri</h3>
                    <div className="space-y-1 text-xs text-gray-600">
                      <p>NIK: {detail.dataDiri?.nik}</p>
                      <p>TTL: {detail.dataDiri?.tempatLahir}, {detail.dataDiri?.tanggalLahir}</p>
                      <p>Gender: {detail.dataDiri?.jenisKelamin}</p>
                      <p>Alamat: {detail.dataDiri?.alamat}</p>
                      <p>Ayah: {detail.dataDiri?.namaAyah} ({detail.dataDiri?.pekerjaanAyah})</p>
                      <p>Ibu: {detail.dataDiri?.namaIbu} ({detail.dataDiri?.pekerjaanIbu})</p>
                      <p>HP: {detail.dataDiri?.noHpOrtu}</p>
                    </div>
                  </div>
                  <div className="p-4 border border-gray-100 dark:border-[#222] rounded-xl">
                    <h3 className="text-xs font-bold text-gray-600 mb-2">🏫 Data Sekolah</h3>
                    <div className="space-y-1 text-xs text-gray-600">
                      <p>Sekolah: {detail.dataSekolah?.namaSekolah}</p>
                      <p>NPSN: {detail.dataSekolah?.npsn || '-'}</p>
                      <p>Status: {detail.dataSekolah?.statusSekolah}</p>
                      <p>Tahun Lulus: {detail.dataSekolah?.tahunLulus}</p>
                    </div>
                  </div>
                </div>

                {/* Nilai */}
                {detail.nilaiRaport?.length > 0 && (
                  <div className="p-4 border border-gray-100 dark:border-[#222] rounded-xl mb-4">
                    <h3 className="text-xs font-bold text-gray-600 mb-2">📊 Nilai Raport (Rata-rata: {detail.nilaiAkhir})</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead><tr className="bg-gray-50">
                          <th className="px-2 py-1 border text-left">Mapel</th>
                          {detail.nilaiRaport.map((n: any) => <th key={n.semester} className="px-2 py-1 border text-center">Smt {n.semester}</th>)}
                        </tr></thead>
                        <tbody>
                          {['B. Indo', 'B. Ing', 'MTK', 'IPA', 'IPS'].map((label, i) => {
                            const keys = ['bIndonesia', 'bInggris', 'matematika', 'ipa', 'ips'];
                            return (
                              <tr key={label}><td className="px-2 py-1 border font-medium">{label}</td>
                                {detail.nilaiRaport.map((n: any) => <td key={n.semester} className="px-2 py-1 border text-center">{n[keys[i]] || '-'}</td>)}
                              </tr>
                            );
                          })}
                          <tr className="bg-emerald-50 font-bold"><td className="px-2 py-1 border">Rata²</td>
                            {detail.nilaiRaport.map((n: any) => <td key={n.semester} className="px-2 py-1 border text-center text-emerald-700">{n.rataRata || '-'}</td>)}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Prestasi */}
                {detail.prestasi?.length > 0 && (
                  <div className="p-4 border border-gray-100 dark:border-[#222] rounded-xl mb-4">
                    <h3 className="text-xs font-bold text-gray-600 mb-2">🏆 Prestasi</h3>
                    {detail.prestasi.map((p: any, i: number) => (
                      <div key={i} className="text-xs text-gray-600 mb-1">
                        {i + 1}. {p.peringkat} — {p.namaKegiatan} ({p.tingkat}, {p.tahun})
                        {p.fileSertifikat && <a href={`${API_BASE_URL.replace('/api', '')}${p.fileSertifikat}`} target="_blank" className="ml-2 text-emerald-600 underline">📎 Lihat</a>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Dokumen */}
                {detail.dokumen?.length > 0 && (
                  <div className="p-4 border border-gray-100 dark:border-[#222] rounded-xl">
                    <h3 className="text-xs font-bold text-gray-600 mb-2">📎 Dokumen</h3>
                    <div className="flex flex-wrap gap-2">
                      {detail.dokumen.map((d: any) => (
                        <span key={d.id} className={`px-3 py-1 rounded-full text-[10px] font-bold ${d.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                          {d.isVerified ? '☑️' : '☐'} {d.jenisDokumen}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

// ============ KONFIGURASI TAB ============
const KonfigurasiTab = ({ onSaved }: { onSaved: () => void }) => {
  const [jalurList, setJalurList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await apiClient<any[]>('/ppdb/admin/jalur');
        setJalurList(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const updateJalur = async (id: string, field: string, value: any) => {
    setJalurList(prev => prev.map(j => j.id === id ? { ...j, [field]: value } : j));
  };

  const saveJalur = async (jalur: any) => {
    setSaving(jalur.id);
    try {
      await apiClient(`/ppdb/admin/jalur/${jalur.id}`, {
        method: 'PUT',
        data: {
          kuota: jalur.kuota,
          nilaiMinimum: jalur.nilaiMinimum,
          jadwalBuka: jalur.jadwalBuka,
          jadwalTutup: jalur.jadwalTutup,
          persyaratan: jalur.persyaratan,
          deskripsi: jalur.deskripsi,
          bobotNilai: jalur.bobotNilai,
          bobotPrestasi: jalur.bobotPrestasi,
          isActive: jalur.isActive,
        },
      });
      toast.success(`Jalur ${jalur.namaJalur} berhasil diperbarui`);
      onSaved();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(null); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-500" size={24} /></div>;

  const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[#333] text-sm outline-none focus:border-emerald-400";
  const labelClass = "block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1";

  return (
    <div className="space-y-6">
      {jalurList.map((jalur) => {
        const isPrestasi = jalur.namaJalur === 'PRESTASI';
        return (
          <div key={jalur.id} className={`p-5 rounded-xl border-2 transition-colors ${jalur.isActive ? (isPrestasi ? 'border-amber-300 bg-amber-50/30' : 'border-blue-300 bg-blue-50/30') : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">{isPrestasi ? '🏆' : '📋'}</span>
                <h3 className="font-bold text-gray-800 dark:text-white">Jalur {jalur.namaJalur}</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={jalur.isActive}
                  onChange={e => updateJalur(jalur.id, 'isActive', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-checked:bg-emerald-500 rounded-full peer transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                <span className="ml-2 text-xs font-semibold text-gray-600">{jalur.isActive ? 'Aktif' : 'Nonaktif'}</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className={labelClass}>Kuota</label>
                <input type="number" value={jalur.kuota} onChange={e => updateJalur(jalur.id, 'kuota', Number(e.target.value))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Nilai Minimum</label>
                <input type="number" value={jalur.nilaiMinimum} onChange={e => updateJalur(jalur.id, 'nilaiMinimum', Number(e.target.value))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Bobot Nilai / Prestasi (%)</label>
                <div className="flex gap-2">
                  <input type="number" value={jalur.bobotNilai} onChange={e => updateJalur(jalur.id, 'bobotNilai', Number(e.target.value))} className={inputClass} placeholder="Nilai" />
                  <input type="number" value={jalur.bobotPrestasi} onChange={e => updateJalur(jalur.id, 'bobotPrestasi', Number(e.target.value))} className={inputClass} placeholder="Prestasi" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelClass}>Jadwal Buka</label>
                <input type="datetime-local" value={jalur.jadwalBuka ? new Date(jalur.jadwalBuka).toISOString().slice(0, 16) : ''} onChange={e => updateJalur(jalur.id, 'jadwalBuka', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Jadwal Tutup</label>
                <input type="datetime-local" value={jalur.jadwalTutup ? new Date(jalur.jadwalTutup).toISOString().slice(0, 16) : ''} onChange={e => updateJalur(jalur.id, 'jadwalTutup', e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="mb-4">
              <label className={labelClass}>Persyaratan (pisahkan dengan titik koma ;)</label>
              <textarea rows={2} value={jalur.persyaratan || ''} onChange={e => updateJalur(jalur.id, 'persyaratan', e.target.value)} className={inputClass} />
            </div>

            <div className="mb-4">
              <label className={labelClass}>Deskripsi</label>
              <textarea rows={2} value={jalur.deskripsi || ''} onChange={e => updateJalur(jalur.id, 'deskripsi', e.target.value)} className={inputClass} />
            </div>

            <button
              onClick={() => saveJalur(jalur)}
              disabled={saving === jalur.id}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
            >
              {saving === jalur.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Simpan Perubahan
            </button>
          </div>
        );
      })}
    </div>
  );
};
