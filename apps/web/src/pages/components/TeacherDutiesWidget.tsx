import React, { useState } from 'react';
import { useTeacherDuties, useMasterDutyTypes, useCreateTeacherDuty, useUpdateTeacherDuty, useDeleteTeacherDuty, TeacherDuty, useCreateMasterDutyType, useDeleteMasterDutyType } from '../../hooks/api/useTeacherDuties';
import { useAuth } from '../../contexts/AuthContext';
import { Settings, Plus, X, Calendar, Edit2, Trash2 } from 'lucide-react';
import { useEmployees } from '../../hooks/api/useEmployeeProfile';

export const TeacherDutiesWidget: React.FC<{ academicYear: string }> = ({ academicYear }) => {
  const { data: duties, isLoading } = useTeacherDuties({ academicYear });
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'kepsek';
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get duties from today onwards (all upcoming duties)
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingDuties = duties
    ?.filter(d => d.dutyDate >= todayStr)
    .sort((a, b) => a.dutyDate.localeCompare(b.dutyDate))
    .slice(0, 10) || [];

  return (
    <>
      <div className="bg-white dark:bg-[#1a1a1a] rounded-[24px] p-5 shadow-sm border border-gray-100 dark:border-gray-800 mt-4 md:mt-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
            👨‍🏫 Jadwal Tugas Guru
          </h3>
          {isAdmin && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-semibold text-primary hover:bg-primary/10 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Settings size={14} />
              Atur
            </button>
          )}
        </div>
        
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            ))}
          </div>
        ) : upcomingDuties.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-2">Belum ada jadwal tugas mendatang</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {upcomingDuties.map(duty => {
              const d = new Date(duty.dutyDate);
              return (
                <div 
                  key={duty.id} 
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: `${duty.dutyTypeColor}20`, color: duty.dutyTypeColor }}
                  >
                    {duty.dutyTypeIcon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-gray-800 dark:text-white truncate">
                      {duty.teacherName}
                    </div>
                    <div className="text-[11px] font-medium mt-0.5 flex items-center gap-1.5" style={{ color: duty.dutyTypeColor }}>
                      {duty.dutyTypeName}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      {d.getDate()} {d.toLocaleString('id-ID', { month: 'short' })}
                    </div>
                    {duty.notes && (
                      <div className="text-[9px] text-gray-500 max-w-[80px] truncate mt-0.5" title={duty.notes}>
                        {duty.notes}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <TeacherDutiesManagerModal 
          onClose={() => setIsModalOpen(false)} 
          academicYear={academicYear}
          duties={duties || []}
        />
      )}
    </>
  );
};

// ─── MODAL MANAGER ───
const TeacherDutiesManagerModal: React.FC<{ onClose: () => void, academicYear: string, duties: TeacherDuty[] }> = ({ onClose, academicYear, duties }) => {
  const { data: types } = useMasterDutyTypes();
  const { data: employees } = useEmployees();
  
  const createMutation = useCreateTeacherDuty();
  const updateMutation = useUpdateTeacherDuty();
  const deleteMutation = useDeleteTeacherDuty();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showTypesManager, setShowTypesManager] = useState(false);
  
  const defaultDate = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    dutyDate: defaultDate,
    teacherId: '',
    dutyTypeId: '',
    notes: '',
  });

  const resetForm = () => {
    setFormData({ dutyDate: defaultDate, teacherId: '', dutyTypeId: '', notes: '' });
    setEditingId(null);
  };

  const handleEdit = (duty: TeacherDuty) => {
    setEditingId(duty.id);
    setFormData({
      dutyDate: duty.dutyDate,
      teacherId: duty.teacherId,
      dutyTypeId: duty.dutyTypeId,
      notes: duty.notes || '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teacherId || !formData.dutyTypeId) return;
    
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, ...formData, academicYear });
    } else {
      await createMutation.mutateAsync({ ...formData, academicYear });
    }
    resetForm();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#111] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-border-light dark:border-border-dark">
        
        {/* Left Side: Form */}
        <div className="w-full md:w-1/3 bg-gray-50 dark:bg-black/20 p-5 border-b md:border-b-0 md:border-r border-border-light dark:border-border-dark flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              {editingId ? <Edit2 size={18} className="text-primary" /> : <Plus size={18} className="text-primary" />}
              {editingId ? 'Edit Jadwal' : 'Tambah Jadwal'}
            </h2>
            <button onClick={onClose} className="md:hidden p-1 text-gray-500 hover:text-gray-800">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 flex-1">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Tanggal Tugas *</label>
              <input 
                type="date" 
                required
                value={formData.dutyDate}
                onChange={e => setFormData(f => ({ ...f, dutyDate: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">Jenis Tugas *</label>
                <button type="button" onClick={() => setShowTypesManager(true)} className="text-[10px] text-primary hover:underline flex items-center gap-1">
                  <Settings size={10} /> Kelola Jenis
                </button>
              </div>
              <select 
                required
                value={formData.dutyTypeId}
                onChange={e => setFormData(f => ({ ...f, dutyTypeId: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
              >
                <option value="">-- Pilih Tugas --</option>
                {types?.map(t => (
                  <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Pilih Guru *</label>
              <select 
                required
                value={formData.teacherId}
                onChange={e => setFormData(f => ({ ...f, teacherId: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
              >
                <option value="">-- Pilih Guru --</option>
                {employees?.filter(e => e.type === 'Guru' && e.status === 'active').map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Keterangan (Opsional)</label>
              <textarea 
                value={formData.notes}
                onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                placeholder="Tambahkan catatan khusus..."
                className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 min-h-[80px]"
              />
            </div>
            <div className="pt-2 flex gap-2">
              <button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 bg-primary text-white font-medium py-2 rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {editingId ? 'Simpan' : 'Tambahkan'}
              </button>
              {editingId && (
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Side: List */}
        <div className="w-full md:w-2/3 flex flex-col p-5 h-[50vh] md:h-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Daftar Jadwal (TA {academicYear})</h2>
            <button onClick={onClose} className="hidden md:block p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-2">
            {duties.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Calendar size={48} className="mb-2 opacity-20" />
                <p>Belum ada jadwal tersimpan.</p>
              </div>
            ) : (
              duties.map(duty => {
                const d = new Date(duty.dutyDate);
                return (
                  <div key={duty.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1a1a]">
                    <div className="w-12 h-12 rounded-lg flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 shrink-0 border border-gray-100 dark:border-gray-700">
                      <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">{d.toLocaleString('id-ID', { month: 'short' })}</span>
                      <span className="text-lg font-bold leading-none">{d.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-800 dark:text-white truncate">{duty.teacherName}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide" style={{ backgroundColor: `${duty.dutyTypeColor}20`, color: duty.dutyTypeColor }}>
                          {duty.dutyTypeIcon} {duty.dutyTypeName}
                        </span>
                      </div>
                      {duty.notes && <p className="text-[11px] text-gray-500 truncate">{duty.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleEdit(duty)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('Yakin ingin menghapus jadwal ini?')) {
                            deleteMutation.mutate(duty.id);
                          }
                        }} 
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      
      {showTypesManager && <DutyTypesManagerModal onClose={() => setShowTypesManager(false)} />}
    </div>
  );
};

// ─── MASTER DUTY TYPES MANAGER ───
const DutyTypesManagerModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { data: types } = useMasterDutyTypes();
  const createType = useCreateMasterDutyType();
  const deleteType = useDeleteMasterDutyType();
  
  const [formData, setFormData] = useState({ name: '', color: '#14b8a6', icon: '📋' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    await createType.mutateAsync(formData);
    setFormData({ name: '', color: '#14b8a6', icon: '📋' });
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#111] w-full max-w-md rounded-2xl shadow-2xl p-5 border border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Kelola Jenis Tugas</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-800">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mb-6 flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Ikon</label>
            <input type="text" maxLength={2} value={formData.icon} onChange={e => setFormData(f => ({ ...f, icon: e.target.value }))} className="w-full px-2 py-1.5 border rounded-lg text-center" />
          </div>
          <div className="flex-[3]">
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Nama Tugas</label>
            <input type="text" required value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} className="w-full px-2 py-1.5 border rounded-lg" placeholder="Misal: Upacara" />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Warna</label>
            <input type="color" value={formData.color} onChange={e => setFormData(f => ({ ...f, color: e.target.value }))} className="w-full h-8 border rounded-lg p-0.5 cursor-pointer" />
          </div>
          <button type="submit" disabled={createType.isPending} className="h-8 px-3 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90">
            +
          </button>
        </form>

        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          {types?.map(t => (
            <div key={t.id} className="flex items-center justify-between p-2 rounded-lg border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded flex items-center justify-center text-xs" style={{ backgroundColor: `${t.color}20`, color: t.color }}>{t.icon}</span>
                <span className="text-sm font-medium">{t.name}</span>
              </div>
              <button 
                onClick={() => { if (confirm('Hapus jenis tugas ini?')) deleteType.mutate(t.id); }}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
