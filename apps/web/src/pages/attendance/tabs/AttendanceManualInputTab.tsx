import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { Save, Calendar, Users, AlertCircle, Lock } from 'lucide-react';

const STATUS_OPTIONS = ['Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpa', 'Bolos'];

export const AttendanceManualInputTab = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [lockedStudents, setLockedStudents] = useState<Record<string, { method: string; checkIn?: string; checkOut?: string }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('Hadir');

  // Fetch classes
  useEffect(() => {
    apiClient<any[]>('/classes').then(data => {
      setClasses(data);
      if (data.length > 0) setSelectedClass(data[0].id);
    });
  }, []);

  const fetchData = async () => {
    if (!selectedClass || !selectedDate) return;
    setIsLoading(true);
    try {
      // Fetch students in class
      const studentsList = await apiClient<any[]>(`/students?classId=${selectedClass}`);
      
      // Fetch existing attendance for the date
      const recapData = await apiClient<any[]>(`/attendance/recap/daily?date=${selectedDate}&classId=${selectedClass}`);
      
      const recordsMap: Record<string, string> = {};
      const notesMap: Record<string, string> = {};
      const lockedMap: Record<string, { method: string; checkIn?: string; checkOut?: string }> = {};
      
      recapData.forEach(r => {
        recordsMap[r.studentId] = r.status;
        if (r.note) notesMap[r.studentId] = r.note;
        // Lock if recorded by scan (not manual)
        if (r.method && r.method !== 'manual') {
          lockedMap[r.studentId] = { method: r.method, checkIn: r.checkIn, checkOut: r.checkOut };
        }
      });

      setStudents(studentsList.sort((a: any, b: any) => a.fullName.localeCompare(b.fullName)));
      setAttendanceRecords(recordsMap);
      setNotes(notesMap);
      setLockedStudents(lockedMap);
    } catch (err) {
      toast.error('Gagal mengambil data siswa');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedClass, selectedDate]);

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceRecords(prev => ({ ...prev, [studentId]: status }));
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setNotes(prev => ({ ...prev, [studentId]: note }));
  };

  const applyBulkStatus = () => {
    const updated = { ...attendanceRecords };
    students.forEach(stu => {
      if (!updated[stu.id]) {
        updated[stu.id] = bulkStatus;
      }
    });
    setAttendanceRecords(updated);
    toast.success(`Mengisi ${bulkStatus} untuk siswa yang belum memiliki status`);
  };

  const handleSave = async () => {
    const payload = {
      date: selectedDate,
      records: Object.keys(attendanceRecords).map(studentId => ({
        studentId,
        status: attendanceRecords[studentId],
        note: notes[studentId] || undefined
      }))
    };

    if (payload.records.length === 0) {
      toast.error('Tidak ada data yang diubah');
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiClient<any>('/attendance/manual/bulk', {
        method: 'POST',
        data: payload
      });
      if (res.success) {
        toast.success(`Berhasil menyimpan ${res.count} data absensi`);
        fetchData();
      } else {
        toast.error(res.message || 'Gagal menyimpan data');
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-[#1a1a1a] p-3 rounded-xl border border-gray-200 dark:border-[#222] shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 mb-3">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Users size={12} /> Pilih Kelas
            </label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full px-2 py-1.5 bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-[#333] rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
            >
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Calendar size={12} /> Tanggal Absensi
            </label>
            <input
              type="date"
              value={selectedDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full px-2 py-1.5 bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-[#333] rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {students.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-lg gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">Set Siswa Kosong ke:</span>
              <select
                value={bulkStatus}
                onChange={e => setBulkStatus(e.target.value)}
                className="px-2 py-1 text-xs rounded bg-white dark:bg-[#222] border border-indigo-200 dark:border-indigo-800"
              >
                {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <button 
                onClick={applyBulkStatus}
                className="px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-700 transition"
              >
                Terapkan
              </button>
            </div>
            
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
              Simpan Presensi
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            Memuat data siswa...
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <AlertCircle size={32} className="mx-auto mb-3 opacity-50" />
            <p>Pilih kelas terlebih dahulu atau tidak ada siswa di kelas ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-[#222] border-b border-gray-200 dark:border-[#333]">
                <tr>
                  <th className="p-2 font-semibold text-gray-600 dark:text-gray-300 w-10 text-center">No</th>
                  <th className="p-2 font-semibold text-gray-600 dark:text-gray-300">Nama Siswa</th>
                  <th className="p-2 font-semibold text-gray-600 dark:text-gray-300 w-40">Status</th>
                  <th className="p-2 font-semibold text-gray-600 dark:text-gray-300 min-w-[150px]">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                {students.map((stu, index) => {
                  const status = attendanceRecords[stu.id] || '';
                  const locked = lockedStudents[stu.id];
                  return (
                    <tr key={stu.id} className={`hover:bg-gray-50/50 dark:hover:bg-[#1f1f1f] ${locked ? 'bg-gray-50/30 dark:bg-[#181818]' : ''}`}>
                      <td className="p-2 text-center text-gray-500">{index + 1}</td>
                      <td className="p-2">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{stu.fullName}</div>
                        <div className="text-[10px] text-gray-500">{stu.nis}</div>
                        {locked && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Lock size={9} className="text-amber-500" />
                            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">
                              Scan {locked.checkIn?.slice(0,5)}{locked.checkOut ? ` → ${locked.checkOut.slice(0,5)}` : ''}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        <select
                          value={status}
                          onChange={(e) => handleStatusChange(stu.id, e.target.value)}
                          disabled={!!locked}
                          className={`w-full px-2 py-1 rounded text-xs border font-medium outline-none focus:ring-2 focus:ring-indigo-500 ${
                            locked ? 'opacity-60 cursor-not-allowed ' : ''
                          }${
                            status === 'Hadir' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' :
                            status === 'Terlambat' ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400' :
                            status === 'Sakit' ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400' :
                            status === 'Izin' ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' :
                            status === 'Alpa' || status === 'Bolos' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' :
                            'bg-gray-50 border-gray-200 text-gray-500 dark:bg-[#333] dark:border-[#444]'
                          }`}
                        >
                          <option value="" disabled>- Pilih Status -</option>
                          {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          placeholder={locked ? 'Terkunci (dari scan)' : 'Tambahkan catatan (opsional)'}
                          value={notes[stu.id] || ''}
                          onChange={(e) => handleNoteChange(stu.id, e.target.value)}
                          disabled={!!locked}
                          className={`w-full px-2 py-1 text-xs rounded border border-gray-200 dark:border-[#333] bg-white dark:bg-[#222] focus:ring-2 focus:ring-indigo-500 outline-none ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
