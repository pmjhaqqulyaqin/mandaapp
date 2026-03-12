import React from 'react';

// Struktur data berita
export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  categoryIcon?: React.ReactNode;
}

const dummyNews: NewsItem[] = [
  {
    id: '1',
    title: 'Pengumuman Libur Semester Ganjil',
    excerpt: 'Diberitahukan kepada seluruh siswa dan orang tua, libur semester ganjil akan dimulai sesuai kalender akademik mulai tanggal 18 Desember hingga awal tahun depan. Harap persiapkan diri untuk remedial bagi yang membutuhkan.',
    imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=600&auto=format&fit=crop',
    categoryIcon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>
    )
  },
  {
    id: '2',
    title: 'Prestasi Gemilang Siswa di Olimpiade Sains Nasional',
    excerpt: 'Kabar membanggakan! Tim perwakilan sains sekolah kita berhasil menyabet medali emas di tingkat nasional setelah melalui persaingan sengit selama 3 hari berturut-turut. Selamat kepada para peraih medali.',
    imageUrl: 'https://images.unsplash.com/photo-1567168544813-cc03465b4fa8?q=80&w=600&auto=format&fit=crop',
    categoryIcon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
    )
  },
  {
    id: '3',
    title: 'Pembaruan Kurikulum dan Sosialisasi Tahun Ajaran Baru',
    excerpt: 'Tahun ajaran depan akan menerapkan kurikulum baru sesuai arahan kementerian. Pihak sekolah akan menggelar sosialisasi daring untuk orang tua murid agar dapat memahami metode pembelajaran yang dianut.',
    imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=600&auto=format&fit=crop',
    categoryIcon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    )
  }
];

interface NewsSectionProps {
  items?: NewsItem[];
  onReadMore?: (id: string) => void;
}

export const NewsSection = ({ items, onReadMore }: NewsSectionProps) => {
  const newsList = items && items.length > 0 ? items : dummyNews;
  // Gunakan ref untuk mengambil elemen kontainer scroll
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      // Dapatkan lebar satu kartu + gap
      const scrollAmount = scrollContainerRef.current.firstElementChild?.clientWidth || 300;
      scrollContainerRef.current.scrollBy({ left: -(scrollAmount + 32), behavior: 'smooth' }); // 32 adalah nilai gap-8 (2rem)
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.firstElementChild?.clientWidth || 300;
      scrollContainerRef.current.scrollBy({ left: scrollAmount + 32, behavior: 'smooth' });
    }
  };

  return (
    <section id="news" className="py-8 sm:py-12 bg-background-light dark:bg-background-dark relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border-light dark:via-border-dark to-transparent" />
      
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl sm:text-center">
          <h2 className="text-base font-semibold leading-7 text-primary">Berita Terbaru</h2>
          <p className="mt-2 text-3xl font-heading font-bold tracking-tight text-text-primary dark:text-text-darkPrimary sm:text-4xl text-balance">
            Informasi Terupdate Seputar Sekolah
          </p>
        </div>
        <div className="mx-auto mt-10 sm:mt-16 relative max-w-6xl group">
          {/* Slider Container */}
          <div 
            ref={scrollContainerRef}
            className="flex gap-6 sm:gap-8 overflow-x-auto snap-x snap-mandatory pb-8 pt-4 -mx-4 px-4 scrollbar-hide"
            style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
          >
            {newsList.map((news) => (
              <div key={news.id} className="snap-start w-[88vw] sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.33rem)] shrink-0 flex flex-col bg-white dark:bg-[#111] p-6 shadow-sm ring-1 ring-border-light dark:ring-border-dark rounded-2xl hover:-translate-y-1 hover:shadow-md transition-all">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-text-primary dark:text-text-darkPrimary">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    {news.categoryIcon || (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>
                    )}
                  </div>
                  <span className="line-clamp-2">{news.title}</span>
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-sm leading-6 text-text-secondary">
                  {/* Thumbnail Gambar Utama Berita */}
                  {news.imageUrl && (
                    <div className="w-full aspect-video mb-4 rounded-xl overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800">
                      <img src={news.imageUrl} alt={news.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 ease-in-out" />
                    </div>
                  )}
                  {/* Intisari Berita */}
                  <p className="flex-auto text-justify line-clamp-4">{news.excerpt}</p>
                  
                  {/* Read More Link */}
                  <div 
                    className="mt-4 flex items-center text-primary font-medium hover:text-primary/80 transition-colors group cursor-pointer w-fit"
                    onClick={() => onReadMore?.(news.id)}
                  >
                    Baca Selengkapnya
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 group-hover:translate-x-1 transition-transform">
                      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                    </svg>
                  </div>
                </dd>
              </div>
            ))}
            </div>
          
          {/* Slider Navigation Buttons */}
          <div className="hidden sm:block z-10 absolute inset-0 pointer-events-none">
            {/* Tombol Kiri */}
            <button 
              onClick={scrollLeft}
              className={`absolute top-1/2 -left-4 lg:-left-12 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full shadow-lg border border-border-light dark:border-border-dark transition-all bg-white text-primary dark:bg-background-dark dark:text-text-darkPrimary hover:scale-110 hover:shadow-xl cursor-pointer pointer-events-auto`}
              aria-label="Berita Sebelumnya"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            
            {/* Tombol Kanan */}
            <button 
              onClick={scrollRight}
              className={`absolute top-1/2 -right-4 lg:-right-12 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full shadow-lg border border-border-light dark:border-border-dark transition-all bg-white text-primary dark:bg-background-dark dark:text-text-darkPrimary hover:scale-110 hover:shadow-xl cursor-pointer pointer-events-auto`}
              aria-label="Berita Selanjutnya"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
