import React, { useState, useRef } from 'react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { Modal } from '@mandaapp/ui/src/components/Modal';
import { Upload, Download, FileSpreadsheet, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  apiClient: any;
  onSuccess: () => void;
}

interface ValidationError { row: number; message: string; }

export const ImportExcelModal: React.FC<Props> = ({ isOpen, onClose, apiClient, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [validRows, setValidRows] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const REQUIRED_COLS = ['NamaSiswa', 'NISN', 'NIS', 'Kelas', 'TempatLahir', 'TanggalLahir', 'JenisKelamin'];

  const reset = () => {
    setFile(null); setErrors([]); setTotalRows(0); setValidRows(0);
  };

  const validateRow = (row: any, idx: number): ValidationError | null => {
    if (!row.NamaSiswa) return { row: idx + 2, message: 'Kolom Nama Siswa tidak boleh kosong.' };
    if (row.NISN && String(row.NISN).length !== 10) return { row: idx + 2, message: `NISN harus 10 digit (ditemukan: ${String(row.NISN).length} digit).` };
    if (row.JenisKelamin && !['Laki-laki', 'Perempuan', 'L', 'P'].includes(row.JenisKelamin))
      return { row: idx + 2, message: `Kolom Jenis Kelamin tidak valid (harus Laki-laki/Perempuan).` };
    if (row.TanggalLahir) {
      const d = new Date(row.TanggalLahir);
      if (isNaN(d.getTime())) return { row: idx + 2, message: 'Format Tanggal Lahir tidak valid (harus YYYY-MM-DD).' };
    }
    return null;
  };

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];
        const errs: ValidationError[] = [];
        data.forEach((row, i) => {
          const err = validateRow(row, i);
          if (err) errs.push(err);
        });
        setTotalRows(data.length);
        setValidRows(data.length - errs.length);
        setErrors(errs);
      } catch {
        alert('Gagal membaca file. Pastikan format file benar.');
      }
    };
    reader.readAsBinaryString(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await apiClient('/students/upload', { method: 'POST', data: fd });
      alert(res.message || `${validRows} siswa berhasil diimport!`);
      reset(); onSuccess(); onClose();
    } catch (err: any) {
      alert('Gagal import: ' + err.message);
    } finally { setUploading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }}
      title="Import Data via Excel"
      description="Unggah data siswa dalam jumlah besar secara efisien menggunakan format standar Academic Curator."
      className="max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        {/* Left panel - Template Info */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-gray-50 dark:bg-[#0a0a0a] rounded-xl p-4 border border-gray-200 dark:border-[#222]">
            <h4 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary mb-1">Template Excel</h4>
            <p className="text-[11px] text-text-secondary mb-3">Pastikan format file sesuai dengan template resmi kami.</p>
            <div className="bg-white dark:bg-[#111] rounded-lg p-3 border border-gray-100 dark:border-[#222] mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-2">Kolom Wajib (Mandatory)</p>
              <ul className="space-y-1">
                {REQUIRED_COLS.map(c => (
                  <li key={c} className="text-xs text-text-primary dark:text-text-darkPrimary flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-primary shrink-0" /> {c}
                  </li>
                ))}
              </ul>
            </div>
            <a href={`${API_BASE_URL}/students/template`}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border-2 border-dashed border-gray-300 dark:border-[#333] text-sm font-medium text-text-primary dark:text-text-darkPrimary hover:border-primary hover:text-primary transition-colors">
              <Download size={16} /> Download Template (.xlsx)
            </a>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3 border border-amber-200 dark:border-amber-800/30">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 mb-1 flex items-center gap-1"><AlertCircle size={12} /> Tips Validasi</p>
            <ul className="text-[11px] text-amber-700 dark:text-amber-400/80 space-y-0.5">
              <li>• Pastikan tidak ada baris kosong di antara data.</li>
              <li>• Format tanggal harus menggunakan YYYY-MM-DD.</li>
              <li>• NISN harus 10 digit angka.</li>
            </ul>
          </div>
        </div>

        {/* Right panel - Upload & Preview */}
        <div className="md:col-span-3 space-y-4">
          {!file ? (
            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-[#333] hover:border-primary/50'}`}
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}>
              <FileSpreadsheet size={40} className="mx-auto mb-3 text-gray-400" />
              <p className="font-semibold text-sm text-text-primary dark:text-text-darkPrimary">Seret & Lepas File Excel</p>
              <p className="text-xs text-text-secondary mt-1">atau klik untuk menelusuri dari perangkat Anda</p>
              <p className="text-[10px] text-text-secondary mt-2 uppercase tracking-wider">Maksimum Ukuran File: 10MB (.XLSX)</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Rows', value: totalRows, color: 'text-text-primary dark:text-text-darkPrimary' },
                  { label: 'Valid', value: validRows, color: 'text-emerald-600' },
                  { label: 'Errors', value: errors.length, color: 'text-red-600' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 dark:bg-[#0a0a0a] rounded-lg p-3 text-center border border-gray-200 dark:border-[#222]">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-text-secondary">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {/* Error List */}
              {errors.length > 0 && (
                <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-100 dark:border-[#222] flex items-center justify-between">
                    <p className="text-xs font-semibold text-red-600 flex items-center gap-1"><AlertCircle size={12} /> Detail Laporan Error</p>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-gray-50 dark:divide-[#1a1a1a]">
                    {errors.slice(0, 10).map((err, i) => (
                      <div key={i} className="px-4 py-2 flex items-center gap-3">
                        <span className="text-xs font-mono text-text-secondary whitespace-nowrap">Baris {err.row}</span>
                        <span className="text-xs text-red-600">{err.message}</span>
                      </div>
                    ))}
                  </div>
                  {errors.length > 10 && (
                    <div className="px-4 py-2 text-xs text-text-secondary text-center border-t border-gray-100 dark:border-[#222]">
                      Menampilkan 10 dari {errors.length} error.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      {file && (
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100 dark:border-[#222]">
          <p className="text-xs text-text-secondary">
            {errors.length > 0
              ? <span className="flex items-center gap-1"><AlertCircle size={12} className="text-amber-500" /> {errors.length} baris bermasalah akan dilewati otomatis jika Anda melanjutkan.</span>
              : <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={12} /> Semua data valid.</span>
            }
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Batal</Button>
            <Button onClick={handleImport} disabled={uploading || validRows === 0} className="flex items-center gap-1.5">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Import {validRows.toLocaleString()} Siswa
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
