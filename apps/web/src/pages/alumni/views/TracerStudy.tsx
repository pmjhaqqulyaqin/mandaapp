import { useState } from 'react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { 
  ClipboardList, PieChart, Send, CheckCircle2, AlertCircle, 
  Settings2, Download, Search, Users
} from 'lucide-react';

// MOCK DATA
const mockQuestionnaires = [
  { id: 1, title: 'Tracer Study Lulusan 2024', status: 'Aktif', responses: 145, target: 200, lastUpdated: '2 hari lalu' },
  { id: 2, title: 'Tracer Study Lulusan 2023', status: 'Selesai', responses: 180, target: 180, lastUpdated: '1 tahun lalu' },
];

const mockResponses = [
  { id: 1, name: 'Ahmad Fauzi', year: '2024', status: 'Bekerja', company: 'PT. Teknologi Maju', date: '10/05/2026' },
  { id: 2, name: 'Siti Aminah', year: '2024', status: 'Kuliah', company: 'Universitas Indonesia', date: '09/05/2026' },
  { id: 3, name: 'Budi Santoso', year: '2024', status: 'Wirausaha', company: 'Kedai Kopi Budi', date: '08/05/2026' },
  { id: 4, name: 'Rina Melati', year: '2024', status: 'Mencari Kerja', company: '-', date: '08/05/2026' },
];

export const TracerStudy = () => {
  const [activeTab, setActiveTab] = useState<'kuesioner' | 'hasil'>('kuesioner');

  return (
    <div className="flex flex-col gap-4 md:gap-5 animate-in fade-in duration-500">
      
      {/* Header Tabs */}
      <div className="flex bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#222] p-1.5 w-fit shadow-sm">
        <button 
          onClick={() => setActiveTab('kuesioner')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'kuesioner' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:bg-gray-50 dark:hover:bg-[#1a1a1a]'
          }`}
        >
          <ClipboardList size={16} /> Kuesioner
        </button>
        <button 
          onClick={() => setActiveTab('hasil')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'hasil' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:bg-gray-50 dark:hover:bg-[#1a1a1a]'
          }`}
        >
          <PieChart size={16} /> Hasil Tracer
        </button>
      </div>

      {activeTab === 'kuesioner' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 flex justify-between items-center bg-blue-50 dark:bg-blue-500/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30">
            <div>
              <h3 className="font-bold text-blue-800 dark:text-blue-400">Manajemen Kuesioner</h3>
              <p className="text-xs text-blue-600/80 dark:text-blue-300 mt-1">Buat form pelacakan baru atau broadcast via WhatsApp/Email ke alumni.</p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">Buat Kuesioner Baru</Button>
          </div>

          {mockQuestionnaires.map(q => (
            <div key={q.id} className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#222] p-5 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-text-primary dark:text-text-darkPrimary text-lg">{q.title}</h4>
                  <p className="text-xs text-text-secondary mt-1">Diperbarui {q.lastUpdated}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 ${
                  q.status === 'Aktif' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {q.status === 'Aktif' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  {q.status}
                </span>
              </div>
              
              <div>
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="text-text-secondary">Progress Responden</span>
                  <span className="text-primary">{q.responses} / {q.target}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-[#222] rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${(q.responses/q.target)*100}%` }} />
                </div>
              </div>

              <div className="flex gap-2 mt-auto pt-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs"><Settings2 size={14} className="mr-1.5" /> Edit Form</Button>
                <Button size="sm" className="flex-1 text-xs"><Send size={14} className="mr-1.5" /> Broadcast</Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#222] shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-[#222] flex flex-wrap justify-between items-center gap-3">
            <h3 className="font-bold text-text-primary dark:text-text-darkPrimary flex items-center gap-2">
              <Users className="text-primary" size={18} /> Respon Terbaru
            </h3>
            <div className="flex gap-2">
              <div className="relative hidden sm:block">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="h-8 pl-8 pr-3 text-xs rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a]" placeholder="Cari responden..." />
              </div>
              <Button variant="outline" size="sm" className="text-xs h-8"><Download size={14} className="mr-1.5" /> Export Data</Button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-[#222] text-[10px] uppercase tracking-wider text-text-secondary bg-gray-50/50 dark:bg-[#0a0a0a]">
                  <th className="py-3 px-4 font-semibold">Nama Alumni</th>
                  <th className="py-3 px-4 font-semibold">Tahun Lulus</th>
                  <th className="py-3 px-4 font-semibold">Status Saat Ini</th>
                  <th className="py-3 px-4 font-semibold">Instansi / Kampus</th>
                  <th className="py-3 px-4 font-semibold">Tgl Submit</th>
                </tr>
              </thead>
              <tbody>
                {mockResponses.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 dark:border-[#1a1a1a] hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a]">
                    <td className="py-3 px-4 font-semibold text-[13px] text-text-primary dark:text-text-darkPrimary">{r.name}</td>
                    <td className="py-3 px-4 text-xs">{r.year}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                        r.status === 'Bekerja' ? 'bg-emerald-50 text-emerald-600' :
                        r.status === 'Kuliah' ? 'bg-blue-50 text-blue-600' :
                        r.status === 'Wirausaha' ? 'bg-amber-50 text-amber-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-text-secondary">{r.company}</td>
                    <td className="py-3 px-4 text-[11px] text-gray-400">{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
