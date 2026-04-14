import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { CheckCircle, XCircle, Loader2, ShieldCheck, QrCode } from 'lucide-react';

export const PPDBVerifikasiPage = () => {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') || '';
  
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) {
      setLoading(false);
      setError(true);
      return;
    }
    verifyCode();
  }, [code]);

  const verifyCode = async () => {
    try {
      setLoading(true);
      const response = await apiClient<any>(`/ppdb/verify/${encodeURIComponent(code)}`);
      if (response.valid) {
        setResult(response.data);
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f0f8f4] to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-emerald-500 mx-auto mb-4" size={40} />
          <p className="text-sm text-gray-500 font-medium">Memverifikasi dokumen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f8f4] to-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={32} className="text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Verifikasi Dokumen</h1>
          <p className="text-xs text-gray-500 mt-1">Sistem Panitia PPDB MAN 2 Lombok Timur</p>
        </div>

        {error ? (
          /* Invalid Code */
          <div className="bg-white rounded-2xl border-2 border-red-200 shadow-xl p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <XCircle size={40} className="text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-red-700 mb-2">Dokumen Tidak Valid</h2>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              Kode validasi yang Anda gunakan tidak ditemukan dalam sistem kami. 
              Pastikan QR Code yang Anda pindai berasal dari dokumen resmi Panitia PPDB MAN 2 Lombok Timur.
            </p>
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-600">
              Kode: <span className="font-mono font-bold">{code || '(kosong)'}</span>
            </div>
          </div>
        ) : result ? (
          /* Valid Code - Show Student Data */
          <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-xl overflow-hidden">
            
            {/* Success Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle size={20} className="text-emerald-200" />
                <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Dokumen Terverifikasi</span>
              </div>
              <h2 className="text-white text-lg font-bold">Surat Kelulusan SAH</h2>
            </div>

            {/* Student Info */}
            <div className="p-6">
              <div className="space-y-4">
                <InfoRow label="Nama Lengkap" value={result.namaLengkap} highlight />
                <InfoRow label="NISN" value={result.nisn} mono />
                <InfoRow label="No. Pendaftaran" value={result.noPendaftaran} mono />
                <InfoRow label="Sekolah Asal" value={result.sekolahAsal} />
                <InfoRow label="Jalur Seleksi" value={`Jalur ${result.jalurSeleksi}`} />
                <div className="pt-2 border-t border-gray-100">
                  <InfoRow 
                    label="Status Kelulusan" 
                    value={
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        result.status === 'diterima' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        <CheckCircle size={12} />
                        {result.status === 'diterima' ? 'DITERIMA / LULUS' : result.status?.toUpperCase()}
                      </span>
                    } 
                  />
                </div>
              </div>

              {/* Validation Code Footer */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <QrCode size={14} />
                  <span className="font-mono">{result.validationCode}</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <p className="text-center text-[10px] text-gray-400 mt-6 leading-relaxed">
          Halaman ini merupakan bagian dari sistem verifikasi dokumen digital<br/>
          PPDB MAN 2 Lombok Timur Tahun Ajaran 2026/2027
        </p>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value, highlight, mono }: { label: string; value: any; highlight?: boolean; mono?: boolean }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
    <span className="text-xs text-gray-500 font-medium sm:w-40 shrink-0">{label}</span>
    <span className={`text-sm ${highlight ? 'font-bold text-gray-900' : 'text-gray-700'} ${mono ? 'font-mono' : ''}`}>
      {typeof value === 'string' ? value || '-' : value}
    </span>
  </div>
);
