import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, Award, GraduationCap } from 'lucide-react';

import { TracerStudyWizard } from './components/TracerStudyWizard';

// Use standard fetch to the backend (since it's a public endpoint)
const fetchPublicAlumni = async () => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const res = await fetch(`${API_URL}/students/public-alumni`);
  if (!res.ok) throw new Error('Failed to fetch alumni');
  return res.json();
};

export const PublicAlumniDirectory = () => {
  const [search, setSearch] = useState('');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  
  const { data: alumni, isLoading, isError } = useQuery({
    queryKey: ['publicAlumni'],
    queryFn: fetchPublicAlumni
  });

  const filteredAlumni = alumni?.filter((a: any) => 
    a.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    a.className?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <TracerStudyWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
      
      <header className="bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-between shadow-sm">
        <div className="text-xl font-bold text-primary flex items-center gap-2">
          <GraduationCap size={24} /> Alumni MandaApp
        </div>
      </header>

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
            Direktori <span className="text-primary">Alumni</span>
          </h1>
          <p className="mt-4 text-xl text-gray-500 max-w-2xl mx-auto">
            Temukan dan jalin relasi dengan jaringan alumni unggulan kami yang tersebar di berbagai institusi dan industri.
          </p>
          <div className="mt-8 flex justify-center">
            <button 
              onClick={() => setIsWizardOpen(true)}
              className="bg-primary hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2"
            >
              <Award size={20} /> Isi Kuesioner Tracer Study
            </button>
          </div>
        </div>

        <div className="max-w-xl mx-auto mb-10">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
              <Search size={20} />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-4 rounded-2xl border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-primary focus:border-primary text-base transition-all hover:shadow-md"
              placeholder="Cari nama atau jurusan alumni..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : isError ? (
          <div className="text-center py-20 text-red-500">
            Gagal memuat data direktori. Silakan coba lagi nanti.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAlumni.map((alum: any, idx: number) => (
              <div 
                key={alum.id} 
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="h-24 bg-gradient-to-r from-primary/10 to-primary/30 relative">
                  {alum.isNotable && (
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-bold text-amber-600 flex items-center gap-1 shadow-sm">
                      <Award size={12} className="fill-amber-500" /> Alumni Berprestasi
                    </div>
                  )}
                </div>
                <div className="px-5 pb-6 relative">
                  <div className="-mt-12 mb-3 flex justify-center">
                    {alum.photoUrl ? (
                      <img src={alum.photoUrl} alt={alum.fullName} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-primary/10 border-4 border-white shadow-md flex items-center justify-center text-3xl font-bold text-primary group-hover:scale-105 transition-transform">
                        {alum.fullName?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">{alum.fullName}</h3>
                    <p className="text-sm font-medium text-primary flex items-center justify-center gap-1.5 mb-3">
                      <GraduationCap size={14} /> {alum.className || 'Alumni'}
                    </p>
                    <div className="text-xs text-gray-500 flex items-center justify-center gap-1 bg-gray-50 py-1.5 rounded-lg">
                      NISN: {alum.nisn || '-'}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredAlumni.length === 0 && (
              <div className="col-span-full text-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4">
                  <Search size={32} />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Tidak ada alumni ditemukan</h3>
                <p className="text-gray-500 mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
              </div>
            )}
          </div>
        )}
      </main>
      
      <footer className="bg-white border-t border-gray-200 py-6 text-center text-sm text-gray-500 mt-auto">
        &copy; {new Date().getFullYear()} MandaApp. Hak Cipta Dilindungi.
      </footer>
    </div>
  );
};
