import { useState, useEffect } from 'react';
import { X, Save, Copy, Plus, Trash2, BookOpen } from 'lucide-react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { apiClient } from '../../lib/api';

interface ClassMapelModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: Array<{ id: string; name: string }>;
}

export function ClassMapelModal({ isOpen, onClose, classes }: ClassMapelModalProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [mapels, setMapels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // For copy feature
  const [copyFromClassId, setCopyFromClassId] = useState<string>('');
  const [isCopying, setIsCopying] = useState(false);
  const [masterSubjects, setMasterSubjects] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && !selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].id);
    }
  }, [isOpen, classes, selectedClassId]);

  useEffect(() => {
    if (!selectedClassId) return;
    
    const fetchMapels = async () => {
      setIsLoading(true);
      try {
        const [data, subjectsData] = await Promise.all([
          apiClient<any>(`/students/class-mapels/${selectedClassId}`),
          apiClient<any[]>('/subjects')
        ]);
        setMapels(data.mapels || []);
        setMasterSubjects(subjectsData || []);
      } catch (err) {
        console.error("Failed to load mapels", err);
        setMapels([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMapels();
  }, [selectedClassId]);

  const handleSave = async () => {
    if (!selectedClassId) return;
    setIsSaving(true);
    try {
      // Filter out empty mapels
      const validMapels = mapels.map(m => m.trim()).filter(m => m.length > 0);
      await apiClient(`/students/class-mapels/${selectedClassId}`, {
        method: 'PUT',
        data: { mapels: validMapels }
      });
      // Optionally show a toast here
      onClose();
    } catch (err) {
      console.error("Failed to save mapels", err);
      alert("Gagal menyimpan mapel kelas.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!selectedClassId || !copyFromClassId) return;
    if (selectedClassId === copyFromClassId) {
      alert("Pilih kelas yang berbeda untuk disalin.");
      return;
    }
    
    if (!confirm("Apakah Anda yakin ingin menyalin mapel dari kelas tersebut? Ini akan menimpa mapel saat ini.")) {
      return;
    }

    setIsCopying(true);
    try {
      await apiClient(`/students/class-mapels/copy`, {
        method: 'POST',
        data: {
          sourceClassId: copyFromClassId,
          targetClassId: selectedClassId
        }
      });
      
      // Reload mapels
      const data = await apiClient<any>(`/students/class-mapels/${selectedClassId}`);
      setMapels(data.mapels || []);
      setCopyFromClassId('');
    } catch (err: any) {
      console.error("Failed to copy mapels", err);
      alert(err.message || "Gagal menyalin mapel kelas.");
    } finally {
      setIsCopying(false);
    }
  };

  const addMapelRow = () => {
    setMapels([...mapels, '']);
  };

  const updateMapel = (index: number, value: string) => {
    const newMapels = [...mapels];
    newMapels[index] = value;
    setMapels(newMapels);
  };

  const removeMapel = (index: number) => {
    const newMapels = [...mapels];
    newMapels.splice(index, 1);
    setMapels(newMapels);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Pengaturan Mapel Kelas</h2>
              <p className="text-sm text-slate-500">Atur daftar Mata Pelajaran untuk Buku Induk</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Class Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Pilih Kelas</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Copy From */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Copy Dari Kelas</label>
              <div className="flex gap-2">
                <select
                  value={copyFromClassId}
                  onChange={(e) => setCopyFromClassId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
                >
                  <option value="">Pilih...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id} disabled={c.id === selectedClassId}>{c.name}</option>
                  ))}
                </select>
                <Button 
                  onClick={handleCopy} 
                  disabled={!copyFromClassId || isCopying || isLoading}
                  variant="outline"
                  className="shrink-0"
                >
                  <Copy size={16} className="mr-2" /> Copy
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-800 dark:text-white">Daftar Mata Pelajaran</h3>
              <Button onClick={addMapelRow} variant="outline" size="sm">
                <Plus size={16} className="mr-2" /> Tambah Mapel
              </Button>
            </div>

            {isLoading ? (
              <div className="py-12 flex justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : mapels.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400">Belum ada mata pelajaran untuk kelas ini.</p>
                <p className="text-sm text-slate-400 mt-1">Gunakan fitur Copy atau tambah manual.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mapels.map((mapel, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 font-medium">
                      {index + 1}
                    </div>
                    <select
                      value={mapel}
                      onChange={(e) => updateMapel(index, e.target.value)}
                      className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
                    >
                      <option value="">Pilih Mata Pelajaran...</option>
                      {masterSubjects.map(s => (
                        <option key={s.id} value={s.nama}>{s.nama}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeMapel(index)}
                      className="w-10 h-10 shrink-0 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? 'Menyimpan...' : (
              <>
                <Save size={18} className="mr-2" />
                Simpan
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}
