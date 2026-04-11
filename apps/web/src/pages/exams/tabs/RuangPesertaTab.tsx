import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Wand2, Download, Search, DoorOpen, Users, RefreshCw, GripVertical, X, ArrowRight, AlertTriangle, Settings, Save } from 'lucide-react';

interface Props {
  ujianId: string;
}

// Helper to format class display name
const formatClassName = (c: any) => {
  const major = c.majorName || c.majorCode;
  if (!major) return c.name;
  return /^\d+$/.test(major) ? `${c.name}-${major}` : `${c.name} ${major}`;
};

export const RuangPesertaTab = ({ ujianId }: Props) => {
  const [ruangList, setRuangList] = useState<any[]>([]);
  const [distribusi, setDistribusi] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [ujian, setUjian] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddRuang, setShowAddRuang] = useState(false);
  const [ruangForm, setRuangForm] = useState({ namaRuang: '', kapasitas: 30 });
  const [editRuangId, setEditRuangId] = useState<string | null>(null);
  const [showDistribusi, setShowDistribusi] = useState(false);
  const [distMode, setDistMode] = useState<'kelas' | 'acak' | 'urut'>('kelas');
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRuang, setFilterRuang] = useState('');

  // Drag & Drop state: map of ruangId -> classId[]
  const [roomAssignments, setRoomAssignments] = useState<Record<string, string[]>>({});
  const [draggedClassId, setDraggedClassId] = useState<string | null>(null);
  const [dropTargetRuangId, setDropTargetRuangId] = useState<string | null>(null);
  const [selectedClassForAssign, setSelectedClassForAssign] = useState<string | null>(null);

  // TTD settings
  const [showTtdSettings, setShowTtdSettings] = useState(false);
  const [ttdForm, setTtdForm] = useState({ tempat: '', tanggal: '', jabatan: 'Ketua Panitia', nama: '', nip: '' });
  const [savingTtd, setSavingTtd] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r, d, c, u] = await Promise.all([
        apiClient<any[]>(`/exams/${ujianId}/ruang`),
        apiClient<any[]>(`/exams/${ujianId}/distribusi`),
        apiClient<any[]>('/classes').catch(() => []),
        apiClient<any>(`/exams/${ujianId}`).catch(() => null),
      ]);
      setRuangList(r);
      setDistribusi(d);
      setClassesList(c);
      setUjian(u);
      // Populate TTD form from saved settings
      if (u?.pengaturan?.distribusiTtd) {
        const t = u.pengaturan.distribusiTtd;
        setTtdForm({
          tempat: t.tempat || '',
          tanggal: t.tanggal || '',
          jabatan: t.jabatan || 'Ketua Panitia',
          nama: t.nama || '',
          nip: t.nip || ''
        });
      }
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [ujianId]);

  // Reset assignments when opening distribution panel
  useEffect(() => {
    if (showDistribusi) {
      setRoomAssignments({});
      setSelectedClassForAssign(null);
    }
  }, [showDistribusi]);

  // Ruang CRUD
  const handleSaveRuang = async () => {
    if (!ruangForm.namaRuang) { toast.error('Nama ruang wajib diisi'); return; }
    try {
      if (editRuangId) {
        await apiClient(`/exams/ruang/${editRuangId}`, { method: 'PUT', data: ruangForm });
        toast.success('Ruang diperbarui');
      } else {
        await apiClient(`/exams/${ujianId}/ruang`, { data: ruangForm });
        toast.success('Ruang ditambahkan');
      }
      fetchAll();
      setShowAddRuang(false);
      setRuangForm({ namaRuang: '', kapasitas: 30 });
      setEditRuangId(null);
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    }
  };

  const handleDeleteRuang = async (id: string) => {
    if (!confirm('Hapus ruang ujian ini?')) return;
    try {
      await apiClient(`/exams/ruang/${id}`, { method: 'DELETE' });
      fetchAll();
    } catch { }
  };

  const handleEditRuang = (r: any) => {
    setRuangForm({ namaRuang: r.namaRuang, kapasitas: r.kapasitas });
    setEditRuangId(r.id);
    setShowAddRuang(true);
  };

  // ===== Drag & Drop handlers =====
  const handleDragStart = (e: React.DragEvent, classId: string) => {
    setDraggedClassId(classId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', classId);
  };

  const handleDragOver = (e: React.DragEvent, ruangId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetRuangId(ruangId);
  };

  const handleDragLeave = () => {
    setDropTargetRuangId(null);
  };

  const handleDrop = (e: React.DragEvent, ruangId: string) => {
    e.preventDefault();
    const classId = e.dataTransfer.getData('text/plain') || draggedClassId;
    if (classId) {
      assignClassToRoom(classId, ruangId);
    }
    setDraggedClassId(null);
    setDropTargetRuangId(null);
  };

  const handleDragEnd = () => {
    setDraggedClassId(null);
    setDropTargetRuangId(null);
  };

  // Click-to-assign (mobile friendly / alternative)
  const handleClassClick = (classId: string) => {
    if (selectedClassForAssign === classId) {
      setSelectedClassForAssign(null);
    } else {
      setSelectedClassForAssign(classId);
    }
  };

  const handleRoomClickForAssign = (ruangId: string) => {
    if (selectedClassForAssign) {
      assignClassToRoom(selectedClassForAssign, ruangId);
      setSelectedClassForAssign(null);
    }
  };

  // Core: assign a class to a room (removing from any previous room)
  const assignClassToRoom = (classId: string, ruangId: string) => {
    setRoomAssignments(prev => {
      const next = { ...prev };
      // Remove from any existing room
      Object.keys(next).forEach(rId => {
        next[rId] = (next[rId] || []).filter(id => id !== classId);
        if (next[rId].length === 0) delete next[rId];
      });
      // Add to target room
      next[ruangId] = [...(next[ruangId] || []), classId];
      return next;
    });
  };

  // Remove a class from a room
  const removeClassFromRoom = (classId: string, ruangId: string) => {
    setRoomAssignments(prev => {
      const next = { ...prev };
      next[ruangId] = (next[ruangId] || []).filter(id => id !== classId);
      if (next[ruangId].length === 0) delete next[ruangId];
      return next;
    });
  };

  // Get unassigned classes
  const assignedClassIds = new Set(Object.values(roomAssignments).flat());
  const unassignedClasses = classesList.filter(c => !assignedClassIds.has(c.id));

  // Quick assign all: distribute classes evenly across rooms
  const handleAutoAssign = () => {
    const newAssignments: Record<string, string[]> = {};
    classesList.forEach((c, idx) => {
      const ruang = ruangList[idx % ruangList.length];
      if (ruang) {
        if (!newAssignments[ruang.id]) newAssignments[ruang.id] = [];
        newAssignments[ruang.id].push(c.id);
      }
    });
    setRoomAssignments(newAssignments);
  };

  // Clear all assignments
  const handleClearAssignments = () => {
    setRoomAssignments({});
  };

  // Generate distribusi using room assignments
  const handleGenerate = async () => {
    const hasAssignments = Object.keys(roomAssignments).length > 0;
    if (!hasAssignments) {
      toast.error('Belum ada kelas yang di-assign ke ruang. Drag kelas ke ruang terlebih dahulu.');
      return;
    }
    if (distribusi.length > 0 && !confirm('Distribusi sebelumnya akan dihapus. Lanjutkan?')) return;
    setGenerating(true);
    try {
      const raPayload = Object.entries(roomAssignments).map(([ruangId, kelasIds]) => ({
        ruangId,
        kelasIds
      }));
      const result = await apiClient<any>(`/exams/${ujianId}/distribusi/generate`, {
        data: { mode: distMode, roomAssignments: raPayload }
      });
      toast.success(`${result.distributed} peserta berhasil didistribusikan`);
      fetchAll();
      setShowDistribusi(false);
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleClearDistribusi = async () => {
    if (!confirm('Hapus semua distribusi peserta?')) return;
    try {
      await apiClient(`/exams/${ujianId}/distribusi`, { method: 'DELETE' });
      toast.success('Distribusi dihapus');
      fetchAll();
    } catch { }
  };

  const handleExport = () => {
    window.open(`${import.meta.env.VITE_API_URL}/exams/${ujianId}/distribusi/export`, '_blank');
  };

  const filtered = distribusi.filter(d => {
    const matchSearch = !search ||
      d.siswa?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      d.siswa?.nis?.includes(search) ||
      d.siswa?.nisn?.includes(search);
    const matchRuang = !filterRuang || d.ruangId === filterRuang;
    return matchSearch && matchRuang;
  });

  // Stats per ruang
  const ruangStats = ruangList.map(r => ({
    ...r,
    pesertaCount: distribusi.filter(d => d.ruangId === r.id).length
  }));

  // Count total assigned students (estimate)
  const totalAssignedClasses = Object.values(roomAssignments).flat().length;
  const totalUnassigned = classesList.length - totalAssignedClasses;

  const inputClass = "w-full h-8 px-3 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-xs outline-none focus:ring-2 focus:ring-indigo-500/30";

  return (
    <div className="space-y-4">
      {/* Ruang Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary flex items-center gap-2">
            <DoorOpen size={14} className="text-indigo-500" /> Master Ruang Ujian
          </h3>
          <button onClick={() => { setEditRuangId(null); setRuangForm({ namaRuang: '', kapasitas: 30 }); setShowAddRuang(!showAddRuang); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-all">
            <Plus size={12} /> Tambah Ruang
          </button>
        </div>

        {showAddRuang && (
          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-lg p-3 mb-3 flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[150px]">
              <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">Nama Ruang</label>
              <input className={inputClass} placeholder="R.01" value={ruangForm.namaRuang} onChange={e => setRuangForm({...ruangForm, namaRuang: e.target.value})} />
            </div>
            <div className="w-24">
              <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">Kapasitas</label>
              <input type="number" className={inputClass} value={ruangForm.kapasitas} onChange={e => setRuangForm({...ruangForm, kapasitas: Number(e.target.value)})} />
            </div>
            <button onClick={handleSaveRuang} className="px-3 py-1.5 text-[10px] font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 h-8">
              {editRuangId ? 'Update' : 'Simpan'}
            </button>
            <button onClick={() => { setShowAddRuang(false); setEditRuangId(null); }} className="px-3 py-1.5 text-[10px] font-medium rounded-md border border-gray-200 dark:border-[#333] h-8">
              Batal
            </button>
          </div>
        )}

        {ruangStats.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {ruangStats.map(r => (
              <div key={r.id} className={`relative bg-white dark:bg-[#0a0a0a] border rounded-lg p-3 group cursor-pointer transition-all hover:border-indigo-400 ${filterRuang === r.id ? 'border-indigo-500 ring-1 ring-indigo-500/30' : 'border-gray-200 dark:border-[#222]'}`}
                onClick={() => setFilterRuang(filterRuang === r.id ? '' : r.id)}>
                <p className="text-sm font-bold text-text-primary dark:text-text-darkPrimary">{r.namaRuang}</p>
                <p className="text-[10px] text-gray-500">{r.pesertaCount}/{r.kapasitas} peserta</p>
                <div className="w-full bg-gray-100 dark:bg-[#222] rounded-full h-1.5 mt-1.5">
                  <div className="bg-indigo-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (r.pesertaCount / r.kapasitas) * 100)}%` }} />
                </div>
                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); handleEditRuang(r); }} className="p-1 rounded hover:bg-blue-50 text-blue-500"><Edit2 size={10} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteRuang(r.id); }} className="p-1 rounded hover:bg-red-50 text-red-500"><Trash2 size={10} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-black/20 rounded-lg p-6 text-center">
            <DoorOpen size={24} className="mx-auto text-gray-300 mb-2" />
            <p className="text-xs text-gray-400">Belum ada ruang ujian. Tambahkan ruang terlebih dahulu.</p>
          </div>
        )}
      </div>

      {/* Distribusi Peserta Section */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary flex items-center gap-2">
            <Users size={14} className="text-violet-500" /> Distribusi Peserta
          </h3>
          <div className="flex gap-2">
            <button onClick={() => setShowDistribusi(!showDistribusi)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold rounded-md bg-violet-600 text-white hover:bg-violet-700 transition-all">
              <Wand2 size={12} /> Distribusi Otomatis
            </button>
            {distribusi.length > 0 && (
              <>
                <button onClick={handleExport}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-md border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#1a1a1a]">
                  <Download size={12} /> Export
                </button>
                <button onClick={handleClearDistribusi}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-md border border-red-200 dark:border-red-800/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10">
                  <Trash2 size={12} /> Reset
                </button>
              </>
            )}
            <button onClick={() => setShowTtdSettings(!showTtdSettings)}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-md border transition-all ${
                showTtdSettings
                  ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20 text-violet-600'
                  : 'border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] text-gray-600 dark:text-gray-400'
              }`}>
              <Settings size={12} /> TTD Export
            </button>
          </div>
        </div>

        {showDistribusi && (
          <div className="bg-violet-50/30 dark:bg-violet-900/5 border border-violet-200 dark:border-violet-800/30 rounded-xl p-4 mb-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-violet-700 dark:text-violet-400 flex items-center gap-2">
                <Wand2 size={14} /> Distribusi Kelas ke Ruang Ujian
              </p>
              <div className="flex items-center gap-2">
                <button onClick={handleAutoAssign}
                  className="text-[10px] font-medium text-violet-600 hover:text-violet-700 px-2 py-1 rounded-md hover:bg-violet-100 dark:hover:bg-violet-900/20 transition-colors">
                  ⚡ Atur Otomatis
                </button>
                {Object.keys(roomAssignments).length > 0 && (
                  <button onClick={handleClearAssignments}
                    className="text-[10px] font-medium text-gray-500 hover:text-red-500 px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                    ↻ Reset
                  </button>
                )}
              </div>
            </div>

            {/* Sorting Mode */}
            <div>
              <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Urutan Siswa dalam Ruang</p>
              <div className="flex gap-2">
                {([
                  ['kelas', '📚 Nama (A-Z)'],
                  ['acak', '🎲 Acak'],
                  ['urut', '📋 NIS'],
                ] as const).map(([mode, label]) => (
                  <button key={mode} onClick={() => setDistMode(mode)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                      distMode === mode
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-400 hover:border-violet-300'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Available Classes Pool */}
            <div>
              <p className="text-[10px] font-semibold text-gray-500 mb-1.5">
                Kelas Tersedia
                {selectedClassForAssign && (
                  <span className="text-violet-600 ml-2">— Klik ruang di bawah untuk memasukkan kelas</span>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 rounded-lg bg-white dark:bg-[#0a0a0a] border border-dashed border-gray-200 dark:border-[#333]">
                {unassignedClasses.length > 0 ? unassignedClasses.map(c => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, c.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleClassClick(c.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold cursor-grab active:cursor-grabbing select-none transition-all ${
                      selectedClassForAssign === c.id
                        ? 'bg-violet-600 text-white ring-2 ring-violet-400 ring-offset-1 scale-105'
                        : draggedClassId === c.id
                          ? 'bg-violet-200 dark:bg-violet-800/50 text-violet-800 dark:text-violet-200 opacity-50'
                          : 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50 hover:scale-[1.02]'
                    }`}>
                    <GripVertical size={10} className="opacity-40" />
                    {formatClassName(c)}
                  </div>
                )) : (
                  <p className="text-[10px] text-gray-400 italic py-1 px-2">
                    {classesList.length === 0 ? 'Tidak ada data kelas.' : '✓ Semua kelas sudah di-assign ke ruang'}
                  </p>
                )}
              </div>
            </div>

            {/* Room Drop Zones */}
            <div>
              <p className="text-[10px] font-semibold text-gray-500 mb-1.5">
                Ruang Ujian — <span className="text-violet-600">Drag kelas ke ruang atau klik kelas lalu klik ruang</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {ruangList.map(r => {
                  const assignedIds = roomAssignments[r.id] || [];
                  const assignedClasses = classesList.filter(c => assignedIds.includes(c.id));
                  const isDropTarget = dropTargetRuangId === r.id;
                  const isClickTarget = selectedClassForAssign !== null;

                  return (
                    <div
                      key={r.id}
                      onDragOver={(e) => handleDragOver(e, r.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, r.id)}
                      onClick={() => handleRoomClickForAssign(r.id)}
                      className={`relative rounded-xl border-2 transition-all min-h-[80px] ${
                        isDropTarget
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 shadow-lg shadow-violet-500/10 scale-[1.01]'
                          : isClickTarget
                            ? 'border-dashed border-violet-300 dark:border-violet-700 bg-violet-50/30 dark:bg-violet-900/5 cursor-pointer hover:border-violet-400'
                            : assignedClasses.length > 0
                              ? 'border-violet-200 dark:border-violet-800/40 bg-white dark:bg-[#0a0a0a]'
                              : 'border-dashed border-gray-200 dark:border-[#333] bg-gray-50/50 dark:bg-[#0a0a0a]'
                      }`}>
                      {/* Room Header */}
                      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${assignedClasses.length > 0 ? 'text-violet-700 dark:text-violet-300' : 'text-gray-600 dark:text-gray-400'}`}>
                            {r.namaRuang}
                          </span>
                          <span className="text-[9px] text-gray-400 bg-gray-100 dark:bg-[#222] px-1.5 py-0.5 rounded-full">
                            Kap. {r.kapasitas}
                          </span>
                        </div>
                        {assignedClasses.length > 0 && (
                          <span className="text-[9px] font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 px-1.5 py-0.5 rounded-full">
                            {assignedClasses.length} kelas
                          </span>
                        )}
                      </div>

                      {/* Assigned Classes */}
                      <div className="px-2.5 pb-2.5 pt-1 flex flex-wrap gap-1 min-h-[32px]">
                        {assignedClasses.length > 0 ? assignedClasses.map(c => (
                          <span key={c.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-[10px] font-semibold group/chip">
                            {formatClassName(c)}
                            <button
                              onClick={(e) => { e.stopPropagation(); removeClassFromRoom(c.id, r.id); }}
                              className="opacity-0 group-hover/chip:opacity-100 hover:text-red-500 transition-all ml-0.5 -mr-0.5">
                              <X size={10} />
                            </button>
                          </span>
                        )) : (
                          <p className="text-[10px] text-gray-300 dark:text-gray-600 italic py-1 w-full text-center">
                            {isDropTarget ? '⬇️ Lepas di sini' : isClickTarget ? '👆 Klik untuk assign' : 'Drag kelas ke sini'}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Warning if classes not assigned */}
            {totalUnassigned > 0 && Object.keys(roomAssignments).length > 0 && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-amber-700 dark:text-amber-400">
                  <strong>{totalUnassigned} kelas</strong> belum di-assign ke ruang dan tidak akan diikutkan dalam distribusi.
                  Klik <strong>"Atur Otomatis"</strong> untuk mendistribusikan semua kelas.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-violet-100 dark:border-violet-800/20">
              <p className="text-[10px] text-gray-500">
                {Object.keys(roomAssignments).length > 0
                  ? `${totalAssignedClasses} kelas → ${Object.keys(roomAssignments).length} ruang`
                  : 'Belum ada kelas yang di-assign'
                }
              </p>
              <div className="flex gap-2">
                <button onClick={() => setShowDistribusi(false)}
                  className="px-3 py-1.5 text-[10px] font-medium rounded-md border border-gray-200 dark:border-[#333] hover:bg-white dark:hover:bg-[#111] transition-colors">Batal</button>
                <button onClick={handleGenerate} disabled={generating || Object.keys(roomAssignments).length === 0}
                  className="px-4 py-1.5 text-[10px] font-semibold rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition-all active:scale-95">
                  {generating ? <RefreshCw size={12} className="animate-spin" /> : <Wand2 size={12} />}
                  Generate Distribusi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TTD Settings Panel */}
        {showTtdSettings && (
          <div className="bg-gray-50/80 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#222] rounded-xl p-4 mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-text-primary dark:text-text-darkPrimary flex items-center gap-2">
                <Settings size={13} className="text-violet-500" /> Pengaturan Tanda Tangan Export
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">Tempat</label>
                <input className={inputClass} placeholder="Wanasaba" value={ttdForm.tempat} onChange={e => setTtdForm({...ttdForm, tempat: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">Tanggal</label>
                <input type="date" className={inputClass} value={ttdForm.tanggal} onChange={e => setTtdForm({...ttdForm, tanggal: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">Jabatan</label>
                <input className={inputClass} placeholder="Ketua Panitia" value={ttdForm.jabatan} onChange={e => setTtdForm({...ttdForm, jabatan: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">Nama Penanda Tangan</label>
                <input className={inputClass} placeholder="Muhammad Yusri, SS" value={ttdForm.nama} onChange={e => setTtdForm({...ttdForm, nama: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">NIP</label>
                <input className={inputClass} placeholder="197905262009011005" value={ttdForm.nip} onChange={e => setTtdForm({...ttdForm, nip: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={async () => {
                  setSavingTtd(true);
                  try {
                    await apiClient(`/exams/${ujianId}`, {
                      method: 'PUT',
                      data: { pengaturan: { distribusiTtd: ttdForm } }
                    });
                    toast.success('Pengaturan tanda tangan disimpan');
                    setShowTtdSettings(false);
                  } catch (err: any) {
                    toast.error('Gagal menyimpan: ' + err.message);
                  } finally {
                    setSavingTtd(false);
                  }
                }}
                disabled={savingTtd}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-all">
                <Save size={12} /> Simpan TTD
              </button>
            </div>
          </div>
        )}

        {/* Peserta table */}
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="h-8 pl-8 pr-3 w-full rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-xs outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Cari nama/NIS..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {filterRuang && (
            <button onClick={() => setFilterRuang('')} className="text-[10px] text-indigo-500 font-medium hover:text-indigo-600">
              × Clear filter ruang
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-[#222]">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 dark:bg-black/20 text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-3 py-2.5 font-semibold">No</th>
                <th className="px-3 py-2.5 font-semibold">Ruang</th>
                <th className="px-3 py-2.5 font-semibold">Meja</th>
                <th className="px-3 py-2.5 font-semibold">NIS</th>
                <th className="px-3 py-2.5 font-semibold">NISN</th>
                <th className="px-3 py-2.5 font-semibold">Nama Peserta</th>
                <th className="px-3 py-2.5 font-semibold">Kelas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#1a1a1a]">
              {filtered.slice(0, 100).map((item: any, i: number) => (
                <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a] transition-colors">
                  <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 text-[10px] font-bold">
                      {item.ruang?.namaRuang || '-'}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-indigo-600">{item.nomorMeja || '-'}</td>
                  <td className="px-3 py-2 font-mono text-gray-500">{item.siswa?.nis || '-'}</td>
                  <td className="px-3 py-2 font-mono text-gray-500">{item.siswa?.nisn || '-'}</td>
                  <td className="px-3 py-2 font-semibold text-text-primary dark:text-text-darkPrimary">{item.siswa?.fullName || '-'}</td>
                  <td className="px-3 py-2 text-gray-500">{item.siswa?.fullClassName || item.siswa?.className || '-'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400 italic">
                  {loading ? 'Memuat...' : 'Belum ada distribusi peserta. Buat ruang, lalu gunakan "Distribusi Otomatis".'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && (
          <p className="text-[10px] text-amber-500 mt-1">Menampilkan 100 dari {filtered.length} peserta. Export Excel untuk data lengkap.</p>
        )}
        <p className="text-[10px] text-gray-400">Total: {filtered.length} peserta • {ruangList.length} ruang</p>
      </div>
    </div>
  );
};
