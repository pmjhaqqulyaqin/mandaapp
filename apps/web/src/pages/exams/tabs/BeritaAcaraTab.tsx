import { useState, useEffect } from 'react';
import { FileText, Download, Printer } from 'lucide-react';
import { apiClient } from '../../../lib/api';

interface Props {
  ujianId: string;
  ujian: any;
}

export const BeritaAcaraTab = ({ ujianId, ujian }: Props) => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('ALL');

  useEffect(() => {
    if (ujianId) {
      apiClient(`/exams/${ujianId}/ruang`).then(res => setRooms(res.data || res)).catch(console.error);
    }
  }, [ujianId]);
  const docTypes = [
    { key: 'ba-sekolah', label: 'Berita Acara Pelaksanaan (Tingkat Sekolah)', desc: 'Berita acara keseluruhan pelaksanaan ujian di tingkat satuan pendidikan', color: 'from-indigo-500 to-violet-500' },
    { key: 'ba-mapel', label: 'Berita Acara per Mata Pelajaran', desc: 'Berita acara otomatis per mata pelajaran sesuai jadwal ujian yang sudah dibuat', color: 'from-violet-500 to-purple-500' },
    { key: 'pakta-pengawas', label: 'Pakta Integritas Pengawas', desc: 'Surat pernyataan integritas untuk seluruh pengawas ujian', color: 'from-blue-500 to-indigo-500' },
    { key: 'pakta-panitia', label: 'Pakta Integritas Panitia', desc: 'Surat pernyataan integritas untuk seluruh anggota panitia ujian', color: 'from-cyan-500 to-blue-500' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Generate dokumen berita acara dan pakta integritas secara otomatis. Template dapat diedit sebelum dicetak.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {docTypes.map(doc => (
          <div key={doc.key} className="bg-white dark:bg-[#0a0a0a] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
            <div className={`h-1 bg-gradient-to-r ${doc.color}`} />
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <FileText size={18} className="text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">{doc.label}</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">{doc.desc}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {doc.key === 'ba-mapel' && (
                  <select 
                    value={selectedRoomId}
                    onChange={e => setSelectedRoomId(e.target.value)}
                    className="h-7 px-2 cursor-pointer text-[10px] font-semibold rounded-lg bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] text-text-primary dark:text-text-darkPrimary focus:ring-1 focus:ring-violet-500 outline-none transition-colors hover:border-gray-300"
                  >
                    <option value="ALL">Semua Ruang</option>
                    {rooms.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.namaRuang}</option>
                    ))}
                  </select>
                )}
                <div className="flex gap-2">
                  <button className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-[10px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all active:scale-95"
                    onClick={() => {
                      if (doc.key === 'ba-mapel') {
                        let url = `/dashboard/print-ba-mapel/${ujianId}`;
                        if (selectedRoomId !== 'ALL') url += `?ruangId=${selectedRoomId}`;
                        window.open(url, '_blank');
                      } else if (doc.key === 'pakta-pengawas') {
                        window.open(`/dashboard/print-pakta/${ujianId}?type=pengawas`, '_blank');
                      } else if (doc.key === 'pakta-panitia') {
                        window.open(`/dashboard/print-pakta/${ujianId}?type=panitia`, '_blank');
                      } else {
                        alert('Fitur ini akan dikerjakan pada tahap selanjutnya.');
                      }
                    }}>
                    <Printer size={12} /> Cetak PDF
                  </button>
                  <button className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-[10px] font-medium border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                    onClick={() => {
                      if (doc.key === 'ba-mapel') {
                        let url = `/dashboard/print-ba-mapel/${ujianId}?export=word`;
                        if (selectedRoomId !== 'ALL') url += `&ruangId=${selectedRoomId}`;
                        window.open(url, '_blank');
                      } else {
                        alert('Fitur export Word hanya tersedia untuk Berita Acara per Mata Pelajaran saat ini. Silakan gunakan Cetak PDF untuk Pakta Integritas.');
                      }
                    }}>
                    <FileText size={12} /> Export Word
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-lg p-3">
        <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
          ⚙️ Pengaturan Kop Ujian diperlukan sebelum mencetak dokumen. 
          Kop ujian meliputi: logo, nama instansi, alamat, dan penandatangan. Fitur ini akan dikonfigurasi pada tahap selanjutnya.
        </p>
      </div>
    </div>
  );
};
