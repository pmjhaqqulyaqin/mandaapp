import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Search, FileText, User, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

// Define the field configuration
type FormField = {
  name: string;
  label: string;
  type: 'text' | 'email' | 'date' | 'select' | 'textarea' | 'student-autocomplete' | 'time' | 'file';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  autoFillTarget?: string; // auto-fill another field when this one is selected
  helpText?: string; // guidance text below the field
  group?: string; // visual group header
  halfWidth?: boolean; // render side-by-side
  accept?: string; // for file input, e.g. '.pdf,.jpg,.png'
};

// Define the service configuration
type ServiceType = {
  id: string;
  slug: string;
  title: string;
  shortName: string;
  description: string;
  requirements: string[];
  fields?: FormField[];
  submitLabel?: string; // custom submit button text (default: 'KIRIM PERMOHONAN')
  showServiceLinks?: boolean; // show 'Layanan Kami' links in sidebar instead of requirements
  sidebarTitle?: string; // custom sidebar heading (default: 'Berkas Persyaratan')
};

const DEFAULT_FIELDS: FormField[] = [
  { name: 'applicantName', label: 'Nama Lengkap Siswa / Pemohon', type: 'text', required: true },
  { name: 'nisn', label: 'Nomor Identitas (NISN / NIK) - Opsional', type: 'text' },
  { name: 'birthPlace', label: 'Tempat Lahir', type: 'text' },
  { name: 'birthDate', label: 'Tanggal Lahir', type: 'date' },
  { name: 'address', label: 'Alamat Lengkap', type: 'text', required: true },
  { name: 'email', label: 'E-Mail Pemohon (Email Aktif)', type: 'email', required: true },
  { name: 'phone', label: 'No Handphone (HP)', type: 'text', required: true },
  { name: 'purpose', label: 'Hal/Keperluan Spesifik', type: 'text', required: true, placeholder: 'Misal: Surat Keterangan Aktif untuk beasiswa' },
];

const IZIN_SISWA_FIELDS: FormField[] = [
  // === Data Siswa ===
  { name: 'studentName', label: 'Nama Siswa/Siswi', type: 'student-autocomplete', required: true,
    helpText: 'Masukan nama panggilan Siswa/i sebagai kata kunci, dan pilih siswa/i yang muncul.',
    autoFillTarget: 'nis', group: 'Data Siswa' },
  { name: 'nis', label: 'Nomor Induk Siswa (NIS)', type: 'text', required: true, halfWidth: true },

  // === Data Pemohon ===
  { name: 'applicantName', label: 'Nama Lengkap Pemohon', type: 'text', required: true, group: 'Data Pemohon (Orang Tua / Wali)' },
  { name: 'nisn', label: 'No Identitas Pemohon (No KTP)', type: 'text', required: true },

  // === Detail Izin ===
  { name: 'purpose', label: 'Izin untuk Keperluan?', type: 'select', required: true, group: 'Detail Permohonan Izin', options: [
      'Izin Keluarga Inti Meninggal',
      'Izin Acara Keluarga Inti',
      'Izin Karena Sakit',
      'Izin Urusan Penting Lainnya',
      'Izin Pembinaan/TC'
  ]},
  { name: 'phone', label: 'No HP Pemohon', type: 'text', required: true },
  { name: 'description', label: 'Keterangan/Alasan Permohonan Izin', type: 'textarea', required: true },

  // === Waktu Izin ===
  { name: 'startDate', label: 'Mulai Tanggal', type: 'date', required: true, group: 'Periode Izin', halfWidth: true },
  { name: 'startTime', label: 'Mulai Jam', type: 'time', required: true, halfWidth: true },
  { name: 'endDate', label: 'Sampai Tanggal', type: 'date', required: true, halfWidth: true },
  { name: 'endTime', label: 'Sampai Jam', type: 'time', required: true, halfWidth: true },

  // === Kontak ===
  { name: 'email', label: 'E-Mail Orang Tua/Wali Siswa/i', type: 'email', required: true, group: 'Kontak',
    helpText: 'E-Mail diperlukan untuk mendapatkan Notifikasi Status Izin secara Real Time',
    placeholder: 'Contoh: jagungodak@gmail.com' },
];

const IZIN_PENELITIAN_FIELDS: FormField[] = [
  // === Identitas Pemohon ===
  { name: 'applicantName', label: 'Nama Lengkap', type: 'text', required: true, group: 'Identitas Pemohon', halfWidth: true },
  { name: 'nisn', label: 'Nomor Induk Mahasiswa (NIM)', type: 'text', required: true, halfWidth: true },
  { name: 'address', label: 'Alamat', type: 'text', required: true },
  { name: 'institution', label: 'Asal Lembaga', type: 'text', required: true },
  { name: 'major', label: 'Jurusan', type: 'text', required: true, halfWidth: true },
  { name: 'educationLevel', label: 'Jenjang', type: 'select', required: true, halfWidth: true, options: [
    'D3', 'D4 / S1 Terapan', 'S1', 'S2', 'S3', 'Lainnya'
  ]},
  { name: 'email', label: 'E-Mail', type: 'email', required: true, halfWidth: true },
  { name: 'phone', label: 'No Handphone (HP)', type: 'text', required: true, halfWidth: true },

  // === Detail Penelitian ===
  { name: 'purpose', label: 'Judul Penelitian', type: 'text', required: true, group: 'Detail Penelitian' },
  { name: 'startDate', label: 'Kurun Waktu Penelitian — Mulai', type: 'date', required: true, halfWidth: true },
  { name: 'endDate', label: 'S/d', type: 'date', required: true, halfWidth: true },
  { name: 'respondent', label: 'Responden/Narasumber/Sasaran yang dibutuhkan', type: 'text', required: true },

  // === Upload Berkas ===
  { name: 'fileKtp', label: 'Upload File KTP', type: 'file', required: true, group: 'Upload Berkas', accept: '.pdf,.jpg,.jpeg,.png' },
  { name: 'fileKartuMahasiswa', label: 'Upload File Kartu Mahasiswa', type: 'file', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
  { name: 'fileSuratPermohonan', label: 'Upload File Surat Permohonan Penelitian', type: 'file', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
];

const IZIN_SOSIALISASI_FIELDS: FormField[] = [
  // === Identitas Pemohon ===
  { name: 'applicantName', label: 'Nama Lengkap Pemohon', type: 'text', required: true, group: 'Identitas Pemohon', halfWidth: true },
  { name: 'nisn', label: 'No Identitas (KTP/NIDN/NIP)', type: 'text', required: true, halfWidth: true },
  { name: 'institution', label: 'Nama Lembaga Yang akan Melakukan Sosialisasi', type: 'text', required: true },
  { name: 'address', label: 'Alamat Lembaga', type: 'text', required: true },
  { name: 'email', label: 'E-Mail Pemohon/Lembaga', type: 'email', required: true, halfWidth: true },
  { name: 'phone', label: 'No Handphone (HP) yang dapat dihubungi', type: 'text', required: true, halfWidth: true },

  // === Detail Sosialisasi ===
  { name: 'purpose', label: 'Sosialisasi dalam rangka apa?', type: 'textarea', required: true, group: 'Detail Sosialisasi' },
  { name: 'startDate', label: 'Rencana Waktu Sosialisasi', type: 'date', required: true },
  { name: 'respondent', label: 'Responden/Sasaran yang dibutuhkan. Misalnya Siswa Kelas XII, Guru dll.', type: 'text', required: true },

  // === Upload Berkas ===
  { name: 'fileSuratPermohonan', label: 'Upload File Surat Permohonan Izin Sosialisasi', type: 'file', required: true, group: 'Upload Berkas', accept: '.pdf,.jpg,.jpeg,.png' },
];

const IZIN_MAGANG_FIELDS: FormField[] = [
  // === Identitas Pemohon ===
  { name: 'applicantName', label: 'Nama Lengkap Pemohon', type: 'text', required: true, group: 'Identitas Pemohon', halfWidth: true },
  { name: 'nisn', label: 'No Identitas (KTP/NIM)', type: 'text', required: true, halfWidth: true },
  { name: 'institution', label: 'Nama Lembaga Asal Pemohon Magang', type: 'text', required: true },
  { name: 'address', label: 'Alamat Lembaga', type: 'text', required: true },
  { name: 'email', label: 'E-Mail Pemohon/Lembaga', type: 'email', required: true, halfWidth: true },
  { name: 'phone', label: 'No Handphone (HP) yang dapat dihubungi', type: 'text', required: true, halfWidth: true },

  // === Detail Magang ===
  { name: 'purpose', label: 'Magang dalam rangka apa?', type: 'textarea', required: true, group: 'Detail Magang' },
  { name: 'startDate', label: 'Rencana Waktu Magang — Mulai', type: 'date', required: true, halfWidth: true },
  { name: 'endDate', label: 'S/d', type: 'date', required: true, halfWidth: true },

  // === Upload Berkas ===
  { name: 'fileSuratPermohonan', label: 'Upload File Surat Permohonan Izin Magang', type: 'file', required: true, group: 'Upload Berkas', accept: '.pdf,.jpg,.jpeg,.png' },
];

export const SERVICES: ServiceType[] = [
  {
    id: 'surat-keterangan',
    slug: 'izin-pembuatan-surat-keterangan',
    title: 'Layanan Pengajuan Pembuatan Surat Keterangan',
    shortName: 'Surat Keterangan',
    description: 'Layanan prima untuk pembuatan Surat Keterangan Aktif, Keterangan Berkelakuan Baik, dll.',
    requirements: ['Kartu Pelajar/Siswa', 'Data Diri Lengkap'],
    fields: DEFAULT_FIELDS
  },
  {
    id: 'legalisir-online',
    slug: 'legalisir-online',
    title: 'Layanan Pengajuan Legalisir Ijazah Online',
    shortName: 'Legalisir',
    description: 'Layanan legalisir dokumen resmi madrasah.',
    requirements: ['Hasil Scan Kualitas Terbaik Berkas/Dokumen Yang akan dilegalisir'],
    fields: [
      { name: 'applicantName', label: 'Nama Lengkap Siswa/Alumni', type: 'text', required: true },
      { name: 'nisn', label: 'No Induk Siswa Nasional (NISN)', type: 'text', required: true },
      { name: 'birthPlace', label: 'Tempat Lahir', type: 'text', required: true },
      { name: 'birthDate', label: 'Tanggal Lahir', type: 'date', required: true },
      { name: 'address', label: 'Alamat Lengkap Pengiriman Dokumen Legalisir', type: 'text', required: true },
      { name: 'email', label: 'E-Mail Pemohon (Email Aktif)', type: 'email', required: true },
      { name: 'phone', label: 'No Handphone (HP) yang dapat dihubungi', type: 'text', required: true },
      { name: 'documentType', label: 'Jenis Dokumen yang akan dilegalisir (Ijazah/Transkrip Nilai/Rapor/SKHUN/SKHUAM)', type: 'select', required: true, options: ['Ijazah', 'Transkrip Nilai', 'Rapor', 'SKHUN', 'SKHUAM', 'Lainnya'] },
      { name: 'purpose', label: 'Keterangan Tambahan Jika Diperlukan (Misalnya Butuh Soft Copy)', type: 'text', required: true, placeholder: '-' },
    ]
  },
  {
    id: 'izin-siswa',
    slug: 'izin-siswa',
    title: 'Permohonan Izin Siswa',
    shortName: 'Izin Siswa',
    description: 'Layanan permohonan izin tidak masuk sekolah bagi siswa/siswi.',
    requirements: [
      'Permohonan Izin hanya bisa dilakukan oleh orang tua/wali siswa/i',
      'Permohonan Izin dilakukan paling lambat sehari sebelum hari izin (hari H)'
    ],
    fields: IZIN_SISWA_FIELDS
  },
  {
    id: 'izin-penelitian',
    slug: 'izin-penelitian',
    title: 'Layanan Pengajuan Izin Penelitian',
    shortName: 'Izin Penelitian',
    description: 'Layanan izin observasi/penelitian untuk mahasiswa/umum.',
    requirements: [
      'Kartu Tanda Penduduk (KTP)',
      'Kartu Mahasiswa atau sejenisnya',
      'Surat Permohonan Penelitian dari Fakultas atau Lembaga Terkait'
    ],
    fields: IZIN_PENELITIAN_FIELDS
  },
  {
    id: 'izin-sosialisasi',
    slug: 'izin-sosialisasi',
    title: 'Layanan Pengajuan Izin Sosialisasi',
    shortName: 'Izin Sosialisasi',
    description: 'Layanan izin penyuluhan, sosialisasi, atau kunjungan edukatif.',
    requirements: [
      'Surat Permohonan Sosialisasi dari Fakultas atau Lembaga Terkait'
    ],
    fields: IZIN_SOSIALISASI_FIELDS
  },
  {
    id: 'izin-magang',
    slug: 'izin-magang',
    title: 'Layanan Pengajuan Izin Magang',
    shortName: 'Izin Magang',
    description: 'Layanan izin Praktik Kerja Industri (Prakerin) / Magang.',
    requirements: [
      'Surat Permohonan Magang dari Fakultas atau Lembaga Terkait'
    ],
    fields: IZIN_MAGANG_FIELDS
  },
  {
    id: 'buku-tamu',
    slug: 'buku-tamu',
    title: 'Buku Tamu',
    shortName: 'Buku Tamu',
    description: 'Registrasi kedatangan tamu resmi atau wali murid.',
    requirements: [],
    submitLabel: 'SIMPAN',
    showServiceLinks: true,
    fields: [
      { name: 'applicantName', label: 'Nama Lengkap', type: 'text', required: true },
      { name: 'nisn', label: 'No Identitas (KTP/SIM/NIP)', type: 'text', required: true },
      { name: 'institution', label: 'Nama Lembaga/Instansi', type: 'text', required: true },
      { name: 'purpose', label: 'Keperluan', type: 'text', required: true },
      { name: 'email', label: 'E-Mail', type: 'email', required: true },
      { name: 'phone', label: 'No Handphone (HP)', type: 'text', required: true },
    ]
  },
  {
    id: 'layanan-pengaduan',
    slug: 'layanan-pengaduan',
    title: 'Layanan Pengaduan Masyarakat',
    shortName: 'Pengaduan Masyarakat',
    description: 'Saluran pelaporan keluhan/saran bagi warga madrasah dan masyarakat umum.',
    submitLabel: 'KIRIM',
    sidebarTitle: 'KETENTUAN:',
    requirements: [
      'Mohon menyampaikan keluhan/permasalahan dengan detail dan jelas',
      'Isi E-Mail dan No HP Aktif agar mudah dihubungi atas tindak lanjut dari keluhan/permasalahan dimaksud'
    ],
    fields: [
      { name: 'applicantName', label: 'Nama Lengkap Pemohon', type: 'text', required: true, halfWidth: true },
      { name: 'nisn', label: 'No Identitas (KTP/SIM)', type: 'text', required: true, halfWidth: true },
      { name: 'email', label: 'E-Mail', type: 'email', required: true, halfWidth: true },
      { name: 'phone', label: 'No Handphone (HP) Aktif', type: 'text', required: true, halfWidth: true },
      { name: 'purpose', label: 'Permasalahan?', type: 'textarea', required: true },
    ]
  }
];

// ============================================================
// Student Autocomplete Sub-Component
// ============================================================
type StudentResult = {
  id: string;
  fullName: string;
  nis: string;
  nisn: string;
  className: string;
};

const StudentAutocomplete = ({
  value,
  onChange,
  onSelect,
  required,
  helpText,
}: {
  value: string;
  onChange: (val: string) => void;
  onSelect: (student: StudentResult) => void;
  required?: boolean;
  helpText?: string;
}) => {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/students/search-autocomplete?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
      setIsOpen(true);
      setHighlightIdx(-1);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (val: string) => {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault();
      handleSelect(results[highlightIdx]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (student: StudentResult) => {
    onChange(student.nis + ' ' + student.fullName);
    onSelect(student);
    setIsOpen(false);
  };

  // Highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part)
        ? <span key={i} className="bg-yellow-200 text-yellow-900 font-bold rounded px-0.5">{part}</span>
        : part
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          required={required}
          value={value}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Ketik nama siswa..."
          className="w-full px-4 py-3 pl-11 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none"
        />
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
          {isLoading
            ? <span className="block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            : <Search className="w-4 h-4" />}
        </div>
      </div>
      {helpText && (
        <p className="mt-1.5 text-xs text-red-500 italic">{helpText}</p>
      )}

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1.5 w-full bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-64 overflow-y-auto">
            {results.map((student, idx) => (
              <button
                key={student.id}
                type="button"
                onClick={() => handleSelect(student)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-b-0 ${
                  idx === highlightIdx
                    ? 'bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 text-sm truncate">
                    {highlightMatch(student.fullName || '', value)}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                    <span>NIS: {student.nis || '-'}</span>
                    {student.className && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {student.className}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && results.length === 0 && !isLoading && value.trim().length >= 2 && (
        <div className="absolute z-50 mt-1.5 w-full bg-white rounded-xl shadow-xl border border-gray-100 p-5 text-center text-sm text-gray-400">
          Tidak ditemukan siswa dengan nama tersebut.
        </div>
      )}
    </div>
  );
};

// ============================================================
// Main ServiceForm Component
// ============================================================
export const ServiceForm = ({ pageSlug }: { pageSlug: string }) => {
  const navigate = useNavigate();
  const service = SERVICES.find(s => pageSlug.includes(s.slug) || s.slug.includes(pageSlug)) || SERVICES[0];
  const fields = service.fields || DEFAULT_FIELDS;

  const [isLoading, setIsLoading] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  
  // Track Status State
  const [trackInput, setTrackInput] = useState('');
  const [trackResult, setTrackResult] = useState<any>(null);

  // Dynamic Form State
  const [formData, setFormData] = useState<Record<string, string>>({});

  // File state: supports multiple named file fields
  const [files, setFiles] = useState<Record<string, File>>({});

  // Check if this service has its own file fields in the config
  const hasCustomFileFields = fields.some(f => f.type === 'file');

  const setField = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Standard core fields to keep in separate columns
      const CORE_FIELDS = ['applicantName', 'nisn', 'birthPlace', 'birthDate', 'address', 'email', 'phone', 'purpose'];
      
      const payload = new FormData();
      payload.append('type', service.shortName);
      
      const dynamicFields: Record<string, string> = {};
      
      Object.entries(formData).forEach(([key, value]) => {
        if (CORE_FIELDS.includes(key)) {
          payload.append(key, value);
        } else {
          dynamicFields[key] = value;
        }
      });
      
      // Add formData as JSON string if there are any extra fields
      if (Object.keys(dynamicFields).length > 0) {
        payload.append('formData', JSON.stringify(dynamicFields));
      }

      // Append files: named file fields or single attachment
      Object.entries(files).forEach(([fieldName, fileObj]) => {
        payload.append(fieldName, fileObj);
      });

      const res = await fetch('/api/ptsp/submit', {
        method: 'POST',
        body: payload
      });
      
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.message || 'Gagal mengirim form');

      setTicketId(json.data.ticketId);
      toast.success('Permohonan berhasil dikirim!');
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackInput.trim()) return;

    try {
      const res = await fetch(`/api/ptsp/track/${trackInput.trim()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setTrackResult(json.data);
      toast.success('Status ditemukan');
    } catch (err: any) {
      toast.error(err.message || 'Resi tidak ditemukan');
      setTrackResult(null);
    }
  };

  // Group fields by their 'group' property for visual sections
  const renderFields = () => {
    let currentGroup: string | null = null;
    const rendered: React.ReactNode[] = [];
    let halfWidthBuffer: FormField[] = [];

    const flushHalfWidth = () => {
      if (halfWidthBuffer.length > 0) {
        const pair = halfWidthBuffer.splice(0, 2);
        rendered.push(
          <div key={`hw-${pair[0].name}`} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pair.map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                </label>
                {renderInput(f)}
              </div>
            ))}
          </div>
        );
      }
    };

    fields.forEach((field) => {
      // If we hit a new group, flush pending halfWidth fields first
      if (field.group && field.group !== currentGroup) {
        flushHalfWidth();
        currentGroup = field.group;
        rendered.push(
          <div key={`group-${field.group}`} className="pt-4 first:pt-0">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-2 mb-4">
              {field.group}
            </h3>
          </div>
        );
      }

      if (field.halfWidth) {
        halfWidthBuffer.push(field);
        if (halfWidthBuffer.length === 2) {
          flushHalfWidth();
        }
      } else {
        flushHalfWidth();
        rendered.push(
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            {renderInput(field)}
          </div>
        );
      }
    });

    // Flush any remaining halfWidth
    flushHalfWidth();

    return rendered;
  };

  const renderInput = (field: FormField) => {
    const baseClass = "w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none";

    switch (field.type) {
      case 'student-autocomplete':
        return (
          <StudentAutocomplete
            value={formData[field.name] || ''}
            onChange={(val) => setField(field.name, val)}
            onSelect={(student) => {
              if (field.autoFillTarget) {
                setField(field.autoFillTarget, student.nis || '');
              }
            }}
            required={field.required}
            helpText={field.helpText}
          />
        );

      case 'select':
        return (
          <>
            <div className="relative">
              <select
                required={field.required}
                value={formData[field.name] || ''}
                onChange={e => setField(field.name, e.target.value)}
                className={`${baseClass} bg-white font-medium appearance-none pr-10`}
              >
                <option value="" disabled>-- Pilih {field.label} --</option>
                {field.options?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {field.helpText && <p className="mt-1.5 text-xs text-gray-500 italic">{field.helpText}</p>}
          </>
        );

      case 'textarea':
        return (
          <>
            <textarea
              required={field.required}
              placeholder={field.placeholder}
              value={formData[field.name] || ''}
              onChange={e => setField(field.name, e.target.value)}
              rows={4}
              className={`${baseClass} resize-y`}
            />
            {field.helpText && <p className="mt-1.5 text-xs text-gray-500 italic">{field.helpText}</p>}
          </>
        );

      case 'time':
        return (
          <>
            <input
              required={field.required}
              type="time"
              value={formData[field.name] || ''}
              onChange={e => setField(field.name, e.target.value)}
              className={`${baseClass}`}
            />
            {field.helpText && <p className="mt-1.5 text-xs text-gray-500 italic">{field.helpText}</p>}
          </>
        );

      case 'file':
        return (
          <>
            <div className="flex flex-col gap-2 w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white">
              <input
                required={field.required && !files[field.name]}
                type="file"
                accept={field.accept}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setFiles(prev => ({ ...prev, [field.name]: f }));
                  }
                }}
                className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 transition-all outline-none text-sm"
              />
              {files[field.name] && (
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-medium text-gray-700">{files[field.name].name}</span>
                  <span className="text-gray-400">—</span>
                  <span>{(files[field.name].size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              )}
            </div>
            {field.helpText && <p className="mt-1.5 text-xs text-gray-500 italic">{field.helpText}</p>}
          </>
        );

      default:
        return (
          <>
            <input
              required={field.required}
              type={field.type}
              placeholder={field.placeholder}
              value={formData[field.name] || ''}
              onChange={e => setField(field.name, e.target.value)}
              className={baseClass}
            />
            {field.helpText && <p className="mt-1.5 text-xs text-gray-500 italic">{field.helpText}</p>}
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FBFF] pb-20">
      
      {/* Top Header */}
      <div className="bg-white border-b sticky top-0 md:relative z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-700">{service.title}</h1>
          
          <div className="text-sm font-medium flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            <span className="text-blue-500 cursor-pointer hover:underline" onClick={() => navigate('/')}>Home</span>
            <span className="text-gray-400">/</span>
            <span className="text-blue-500 cursor-pointer hover:underline" onClick={() => navigate('/services')}>Layanan</span>
            <span className="text-gray-400">/</span>
            <span className="text-gray-500">{service.shortName}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: Main Form Column */}
          <div className="lg:col-span-2">
            {!ticketId ? (
              <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <h2 className="font-semibold text-gray-700">Form Permohonan {service.shortName}</h2>
                  <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-600">
                    <ArrowLeft size={20} />
                  </button>
                </div>

                <div className="p-6 md:p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {renderFields()}

                    {/* Only show generic upload if service does NOT have custom file fields */}
                    {!hasCustomFileFields && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload File Pendukung (seperti Surat Keterangan Sakit/KTP Pemohon/Bukti izin lainnya) <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white">
                         <input required type="file" onChange={e => {
                           const f = e.target.files?.[0];
                           if (f) setFiles(prev => ({ ...prev, attachment: f }));
                         }} className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 transition-all outline-none text-sm" />
                      </div>
                    </div>
                    )}

                    <div className="pt-4 border-t border-gray-100">
                      <button disabled={isLoading} type="submit" 
                        className="w-full sm:w-auto px-8 py-3.5 bg-[#1A73E8] hover:bg-blue-600 active:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading ? 'MENGIRIM...' : (service.submitLabel || 'KIRIM PERMOHONAN')}
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden text-center p-12">
                <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Berhasil Terkirim!</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Permohonan Anda sedang kami proses. 
                  Silakan simpan nomor identitas tiket di bawah ini untuk melacak statusnya.
                </p>
                <div className="inline-block bg-blue-50 border-2 border-blue-200 rounded-xl px-10 py-5">
                  <span className="block text-sm text-blue-600 font-medium mb-1 uppercase tracking-wider">Nomor Resi / Tiket Lacak</span>
                  <span className="text-4xl font-black text-blue-900 tracking-widest">{ticketId}</span>
                </div>
                <div className="mt-10">
                  <button onClick={() => setTicketId(null)} className="text-blue-500 font-medium hover:underline">
                    Buat Permohonan Baru
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Sidebar Columns */}
          <div className="lg:col-span-1 space-y-6">
            
            {service.showServiceLinks ? (
            <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 pb-3 border-b border-gray-100 mb-4">Layanan Kami</h3>
              <ul className="space-y-2.5">
                {SERVICES.filter(s => s.id !== service.id).map(s => (
                  <li key={s.id}>
                    <span
                      onClick={() => navigate(`/services/${s.slug}`)}
                      className="text-sm text-blue-500 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
                    >
                      {s.title}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            ) : (
            <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 pb-3 border-b border-gray-100 mb-4 whitespace-nowrap">{service.sidebarTitle || 'Berkas Persyaratan'}</h3>
              <ul className="space-y-3">
                {service.requirements.map((req, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-gray-600">
                    <span className="font-bold text-gray-800">{idx + 1}.</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
            )}

            <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 pb-3 border-b border-gray-100 mb-4">Survey Pelayanan</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                Mohon kesediaan pengguna layanan melalui sistem ini dapat memberikan Feedback berupa saran/kritik yang membangun untuk pelayanan kami.
              </p>
              <button className="px-5 py-2.5 bg-[#1A73E8] hover:bg-blue-600 active:bg-blue-700 text-white font-medium rounded shadow-md text-sm transition-colors">
                Isi Survey
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 pb-3 border-b border-gray-100 mb-4">Layanan Pengaduan Masyarakat</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                Jika ada kendala/permasalahan terkait pelayanan sekolah yang perlu Anda sampaikan, lapor melalui tautan berikut.
              </p>
              <button className="px-5 py-2.5 bg-[#1A73E8] hover:bg-blue-600 active:bg-blue-700 text-white font-medium rounded shadow-md text-sm transition-colors">
                Ajukan Permasalahan
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* TRACKING SECTION = BOTTOM */}
      <div className="mt-20 pt-16 bg-[#eef5fd] pb-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Cek Status Permohonan</h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed max-w-lg mx-auto">
            Cek Status Permohonan yang pernah diajukan dengan memasukkan Nomor Resi Layanan.
            <br/><span className="italic text-xs">Note: Nomor Resi didapatkan setelah sukses membuat form.</span>
          </p>

          <form onSubmit={handleTrackSubmit} className="flex flex-col sm:flex-row gap-0 shadow-lg shadow-blue-500/10 rounded-lg overflow-hidden max-w-xl mx-auto">
            <input 
              required
              type="text" 
              placeholder="Masukkan Nomor Resi (misal: MDT-X9B21)"
              value={trackInput}
              onChange={e => setTrackInput(e.target.value)}
              className="flex-1 px-6 py-4 outline-none text-gray-700 border-none min-w-0"
            />
            <button type="submit" className="bg-[#1A73E8] hover:bg-blue-600 active:bg-blue-700 text-white font-semibold px-10 py-4 transition-colors">
              Cek
            </button>
          </form>

          {/* Render Result Timeline */}
          {trackResult && (
             <div className="mt-10 bg-white p-8 rounded-2xl shadow-xl text-left border border-gray-100 transition-all animate-in slide-in-from-bottom-4">
               <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
                 <div>
                   <h3 className="font-bold text-gray-800 text-lg">Resi: {trackResult.ticketId}</h3>
                   <p className="text-sm text-gray-500">{trackResult.type} • {trackResult.applicantName}</p>
                 </div>
                 <div className={`px-4 py-1.5 rounded-full text-sm font-bold capitalize ${
                    trackResult.status === 'completed' ? 'bg-green-100 text-green-700' :
                    trackResult.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                    trackResult.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                 }`}>
                   {trackResult.status === 'completed' ? 'Selesai' :
                    trackResult.status === 'processing' ? 'Diproses' :
                    trackResult.status === 'rejected' ? 'Ditolak' : 'Antrean'}
                 </div>
               </div>

               <div className="relative border-l-2 border-gray-100 ml-3 space-y-8">
                  <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_0_4px_white]"></div>
                    <div className="font-semibold text-gray-800">Ajuan Diterima</div>
                    <div className="text-sm text-gray-500 mt-1">Sistem Mandaapp telah menampung berkas pengajuan Anda.</div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(trackResult.createdAt).toLocaleString('id-ID')}</div>
                  </div>

                  {(trackResult.status === 'processing' || trackResult.status === 'completed' || trackResult.status === 'rejected') && (
                    <div className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_0_4px_white]"></div>
                      <div className="font-semibold text-gray-800">Tinjauan Admin</div>
                      <div className="text-sm text-gray-500 mt-1">Staff Tata Usaha sedang meninjau kelengkapan Anda.</div>
                      <div className="text-xs text-gray-400 mt-1">{new Date(trackResult.updatedAt).toLocaleString('id-ID')}</div>
                    </div>
                  )}

                  {(trackResult.status === 'completed') && (
                    <div className="relative pl-6">
                       <div className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-green-500 shadow-[0_0_0_4px_white] flex items-center justify-center">
                         <CheckCircle className="w-3 h-3 text-white" />
                       </div>
                       <div className="font-semibold text-gray-800">Permohonan Selesai</div>
                       <div className="text-sm text-gray-500 mt-1">Proses telah rampung! Silakan cek catatan admin:</div>
                       {trackResult.adminReply && (
                         <div className="mt-3 p-4 bg-green-50 border border-green-100 rounded-lg text-sm text-green-800 whitespace-pre-wrap flex gap-3">
                           <FileText className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-50" />
                           {trackResult.adminReply}
                         </div>
                       )}
                    </div>
                  )}

                  {(trackResult.status === 'rejected') && (
                    <div className="relative pl-6">
                       <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-red-500 shadow-[0_0_0_4px_white]"></div>
                       <div className="font-semibold text-gray-800">Permohonan Ditolak / Divalidasi Ulang</div>
                       <div className="text-sm text-gray-500 mt-1">Syarat Anda kurang lengkap atau ditolak:</div>
                       {trackResult.adminReply && (
                         <div className="mt-3 p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-800 whitespace-pre-wrap">
                           {trackResult.adminReply}
                         </div>
                       )}
                    </div>
                  )}

               </div>

             </div>
          )}

        </div>
      </div>

    </div>
  );
};
