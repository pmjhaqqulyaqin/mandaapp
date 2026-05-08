import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  GraduationCap, CalendarDays, BookOpen, Clock, TrendingUp,
  UserPlus, Trash2, Bell, BellOff, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, AlertTriangle, Heart
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  Hadir: 'bg-emerald-500', Terlambat: 'bg-amber-500', Sakit: 'bg-blue-500',
  Izin: 'bg-sky-500', Alpa: 'bg-red-500', Bolos: 'bg-red-700',
};
const STATUS_BG: Record<string, string> = {
  Hadir: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  Terlambat: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  Sakit: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  Izin: 'bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
  Alpa: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  Bolos: 'bg-red-200 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export const ParentPortal = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [studentDetail, setStudentDetail] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [jurnals, setJurnals] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPairModal, setShowPairModal] = useState(false);
  const [pairNisn, setPairNisn] = useState('');
  const [pairRelation, setPairRelation] = useState('wali');
  const [pairPhone, setPairPhone] = useState('');
  const [pairError, setPairError] = useState('');
  const [pairLoading, setPairLoading] = useState(false);

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchChildren = async () => {
    try {
      const data = await apiClient<any[]>('/parent-portal/children');
      setChildren(data || []);
      if (data && data.length > 0 && !selectedChild) {
        setSelectedChild(data[0]);
      }
    } catch { }
  };

  const fetchChildData = async (child: any) => {
    if (!child) return;
    setIsLoading(true);
    const sid = child.studentId;
    const results = await Promise.allSettled([
      apiClient<any>(`/parent-portal/student/${sid}`),
      apiClient<any>(`/parent-portal/student/${sid}/attendance?month=${month}&year=${year}`),
      apiClient<any[]>(`/parent-portal/student/${sid}/jurnal`),
      apiClient<any[]>(`/parent-portal/student/${sid}/schedule`),
      apiClient<any[]>(`/parent-portal/student/${sid}/trend`),
    ]);
    if (results[0].status === 'fulfilled') setStudentDetail(results[0].value);
    if (results[1].status === 'fulfilled') setAttendance(results[1].value);
    if (results[2].status === 'fulfilled') setJurnals(results[2].value || []);
    if (results[3].status === 'fulfilled') setSchedule(results[3].value || []);
    if (results[4].status === 'fulfilled') setTrend(results[4].value || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchChildren(); }, []);
  useEffect(() => { if (selectedChild) fetchChildData(selectedChild); }, [selectedChild, month, year]);

  const handlePair = async () => {
    if (!pairNisn.trim()) { setPairError('NISN wajib diisi.'); return; }
    setPairLoading(true); setPairError('');
    try {
      await apiClient('/parent-portal/pair', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nisn: pairNisn.trim(), relation: pairRelation, phone: pairPhone }),
      });
      setShowPairModal(false); setPairNisn(''); setPairPhone('');
      await fetchChildren();
    } catch (err: any) {
      setPairError(err?.message || 'Gagal menghubungkan. Pastikan NISN benar.');
    } finally { setPairLoading(false); }
  };

  const handleUnlink = async (linkId: string) => {
    if (!confirm('Yakin ingin memutus koneksi dengan anak ini?')) return;
    try {
      await apiClient(`/parent-portal/link/${linkId}`, { method: 'DELETE' });
      const remaining = children.filter(c => c.linkId !== linkId);
      setChildren(remaining);
      if (selectedChild?.linkId === linkId) setSelectedChild(remaining[0] || null);
    } catch { }
  };

  const calendarDays = useMemo(() => {
    if (!attendance?.records) return [];
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    const grid: any[] = [];
    for (let i = 0; i < firstDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const record = attendance.records.find((r: any) => r.date === dateStr);
      grid.push({ day: d, status: record?.status || null, checkIn: record?.checkIn });
    }
    return grid;
  }, [attendance, month, year]);

  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  // No children paired yet
  if (!isLoading && children.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <div className="bg-white dark:bg-[#111] rounded-2xl p-8 text-center border border-gray-100 dark:border-[#222] shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center">
            <Heart size={28} className="text-indigo-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Portal Orang Tua</h2>
          <p className="text-sm text-gray-500 mb-6">Hubungkan akun Anda dengan anak untuk memantau kehadiran dan pembelajaran.</p>
          <button onClick={() => setShowPairModal(true)}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors inline-flex items-center gap-2">
            <UserPlus size={16} /> Hubungkan Anak
          </button>
        </div>
        {renderPairModal()}
      </div>
    );
  }

  function renderPairModal() {
    if (!showPairModal) return null;
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPairModal(false)}>
        <div className="bg-white dark:bg-[#111] rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-[#333]" onClick={e => e.stopPropagation()}>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <UserPlus size={18} className="text-indigo-600" /> Hubungkan Anak
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400">NISN Anak *</label>
              <input type="text" value={pairNisn} onChange={e => setPairNisn(e.target.value)} placeholder="Masukkan NISN"
                className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-[#333] rounded-lg text-sm bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Hubungan</label>
              <select value={pairRelation} onChange={e => setPairRelation(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-[#333] rounded-lg text-sm bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white">
                <option value="ayah">Ayah</option>
                <option value="ibu">Ibu</option>
                <option value="wali">Wali</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400">No. HP/WA (opsional)</label>
              <input type="text" value={pairPhone} onChange={e => setPairPhone(e.target.value)} placeholder="08..."
                className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-[#333] rounded-lg text-sm bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white" />
            </div>
            {pairError && <p className="text-xs text-red-500 font-semibold">{pairError}</p>}
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setShowPairModal(false)} className="flex-1 py-2 border border-gray-200 dark:border-[#333] rounded-lg text-sm font-semibold text-gray-600 dark:text-gray-400">Batal</button>
            <button onClick={handlePair} disabled={pairLoading}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
              {pairLoading ? 'Menghubungkan...' : 'Hubungkan'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/70 uppercase tracking-wider font-bold">Portal Orang Tua</p>
            <h1 className="text-lg font-bold mt-0.5">{user?.name || 'Orang Tua'}</h1>
          </div>
          <button onClick={() => setShowPairModal(true)}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors" title="Tambah Anak">
            <UserPlus size={18} />
          </button>
        </div>
        {/* Child Selector */}
        {children.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {children.map(child => (
              <button key={child.linkId} onClick={() => setSelectedChild(child)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedChild?.linkId === child.linkId ? 'bg-white text-indigo-700' : 'bg-white/20 text-white hover:bg-white/30'
                }`}>
                {child.fullName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Student Profile Card */}
      {studentDetail && (
        <div className="bg-white dark:bg-[#111] rounded-xl p-4 border border-gray-100 dark:border-[#222] shadow-sm">
          <div className="flex items-center gap-4">
            {studentDetail.photoUrl ? (
              <img src={studentDetail.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-indigo-200" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-black text-xl">
                {studentDetail.fullName?.charAt(0) || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">{studentDetail.fullName}</h2>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-gray-500">
                <span>NIS: <b>{studentDetail.nis || '-'}</b></span>
                <span>NISN: <b>{studentDetail.nisn}</b></span>
                <span>Kelas: <b>{studentDetail.className || '-'}</b></span>
                {studentDetail.waliKelas && <span>Wali Kelas: <b>{studentDetail.waliKelas}</b></span>}
              </div>
            </div>
            <button onClick={() => handleUnlink(selectedChild?.linkId)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Putus koneksi">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Attendance Calendar */}
      <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-100 dark:border-[#222] shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-[#222] flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <CalendarDays size={16} className="text-emerald-500" /> Kehadiran
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222]"><ChevronLeft size={16} /></button>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 min-w-[100px] text-center">{monthNames[month]} {year}</span>
            <button onClick={() => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222]"><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="p-3">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayNames.map(d => <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>)}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, i) => (
              <div key={i} className={`aspect-square flex items-center justify-center rounded-lg text-xs font-bold relative
                ${!cell ? '' : cell.status ? `${STATUS_BG[cell.status] || 'bg-gray-100 text-gray-600'}` : 'text-gray-400'}`}
                title={cell?.status ? `${cell.status}${cell.checkIn ? ' (' + cell.checkIn.slice(0,5) + ')' : ''}` : ''}>
                {cell?.day || ''}
              </div>
            ))}
          </div>
          {/* Legend + Stats */}
          {attendance && (
            <div className="mt-3 flex flex-wrap gap-3 text-[10px]">
              {Object.entries(attendance.summary).map(([key, val]) => (
                val as number > 0 && (
                  <span key={key} className="flex items-center gap-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[key]}`}></span>
                    <span className="text-gray-600 dark:text-gray-400">{key}: <b>{val as number}</b></span>
                  </span>
                )
              ))}
              <span className="ml-auto font-bold text-gray-700 dark:text-gray-300">
                Kehadiran: {attendance.persenHadir}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Row: Schedule + Jurnal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Today's Schedule */}
        <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-100 dark:border-[#222] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-[#222]">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Clock size={16} className="text-blue-500" /> Jadwal Hari Ini
            </h3>
          </div>
          <div className="p-3">
            {schedule.length === 0 ? (
              <p className="text-center text-gray-400 text-xs py-4">Tidak ada jadwal hari ini</p>
            ) : (
              <div className="space-y-1.5">
                {schedule.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50/50 dark:bg-white/[0.02]">
                    <span className="text-xs font-mono text-gray-500 w-10">{s.time?.slice(0, 5)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{s.subject}</p>
                      <p className="text-[10px] text-gray-500 truncate">{s.teacherName || '-'}{s.location ? ` • ${s.location}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Today's Jurnal */}
        <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-100 dark:border-[#222] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-[#222]">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <BookOpen size={16} className="text-violet-500" /> Jurnal Pembelajaran Hari Ini
            </h3>
          </div>
          <div className="p-3 max-h-[350px] overflow-y-auto">
            {jurnals.length === 0 ? (
              <p className="text-center text-gray-400 text-xs py-4">Belum ada jurnal hari ini</p>
            ) : (
              <div className="space-y-2">
                {jurnals.map((j, i) => (
                  <details key={i} className="group rounded-lg border border-gray-100 dark:border-[#222] overflow-hidden">
                    <summary className="px-3 py-2 cursor-pointer flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{j.subjectName}</span>
                        {j.jamKe && <span className="text-[10px] text-gray-400">Jam ke-{j.jamKe}</span>}
                      </div>
                      <span className="text-[10px] text-gray-500">{j.teacherName}</span>
                    </summary>
                    <div className="px-3 py-2 space-y-1.5 text-xs border-t border-gray-100 dark:border-[#222]">
                      {j.materiPembelajaran && <div><span className="font-bold text-gray-600 dark:text-gray-400">Materi:</span> <span className="text-gray-800 dark:text-gray-200">{j.materiPembelajaran}</span></div>}
                      {j.metode && <div><span className="font-bold text-gray-600 dark:text-gray-400">Metode:</span> <span className="text-gray-800 dark:text-gray-200">{j.metode}</span></div>}
                      {j.capaianPembelajaran && <div><span className="font-bold text-gray-600 dark:text-gray-400">Capaian:</span> <span className="text-gray-800 dark:text-gray-200">{j.capaianPembelajaran}</span></div>}
                      {j.kendalaDanSolusi && <div><span className="font-bold text-gray-600 dark:text-gray-400">Kendala & Solusi:</span> <span className="text-gray-800 dark:text-gray-200">{j.kendalaDanSolusi}</span></div>}
                      {j.catatan && <div><span className="font-bold text-gray-600 dark:text-gray-400">Catatan:</span> <span className="text-gray-800 dark:text-gray-200">{j.catatan}</span></div>}
                      {j.evaluasi && <div><span className="font-bold text-gray-600 dark:text-gray-400">Evaluasi:</span> <span className="text-gray-800 dark:text-gray-200">{j.evaluasi}</span></div>}
                      {(j.jumlahHadir != null) && <div className="text-[10px] text-gray-500">Siswa hadir: {j.jumlahHadir}/{j.totalSiswa}</div>}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Trend */}
      {trend.length > 0 && (
        <div className="bg-white dark:bg-[#111] rounded-xl p-4 border border-gray-100 dark:border-[#222] shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-500" /> Tren Kehadiran 4 Minggu
          </h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '12px' }} formatter={(v: any) => `${v}%`} />
                <Bar dataKey="persen" fill="#6366f1" radius={[6, 6, 0, 0]} name="Kehadiran" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {renderPairModal()}
    </div>
  );
};
