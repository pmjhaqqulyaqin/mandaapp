import { Info, User, Trophy, History, Users, Link as LinkIcon, MapPin, Phone, Mail, Facebook, Twitter, Instagram, Globe } from 'lucide-react';

export interface FooterProps {
  schoolName?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  relatedWebsites?: { label: string; url: string }[];
  footerCreditText?: string;
}

export const Footer = ({
  schoolName = 'MAN 2 LOMBOK TIMUR',
  address = 'Jln. Pendidikan No. 1, Selong',
  phone = '0376-21xxx',
  email = 'info@man2lotim.sch.id',
  logoUrl,
  facebookUrl,
  twitterUrl,
  instagramUrl,
  youtubeUrl,
  relatedWebsites,
  footerCreditText = 'Humas Mandalotim',
}: FooterProps) => {
  const defaultLinks = [
    { label: 'Perpustakaan Digital', url: '#' },
    { label: 'OSIS MAN 2 LOMBOK TIMUR', url: '#' },
    { label: 'E-Learning Madrasah', url: '#' },
  ];
  const websites = relatedWebsites && relatedWebsites.length > 0 ? relatedWebsites : defaultLinks;

  const socialLinks = [
    { url: facebookUrl, icon: <Facebook className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
    { url: twitterUrl, icon: <Twitter className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
    { url: youtubeUrl, icon: <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
    { url: instagramUrl, icon: <Instagram className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
  ];

  return (
    <footer className="bg-white dark:bg-[#050505] border-t border-border-light dark:border-border-dark" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Footer</h2>
      <div className="mx-auto max-w-5xl px-6 pb-4 pt-10 sm:pt-12 lg:pt-14">
        
        {/* 3-Column Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          
          {/* Box 1: Tentang */}
          <div className="border border-emerald-200 dark:border-gray-800 rounded-xl pt-8 px-6 pb-8 flex flex-col items-center min-h-[300px] md:aspect-square bg-white dark:bg-[#0A0A0A] shadow-sm">
            <h3 className="flex items-center gap-2 text-xl font-bold mb-4 border-b border-emerald-200 dark:border-gray-800 w-full pb-3 justify-center text-text-primary dark:text-text-darkPrimary">
              <Info className="w-5 h-5 text-emerald-600" /> Tentang
            </h3>
            <div className="flex flex-col items-center gap-2 w-full">
              <a href="#" className="w-fit bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-800/30 dark:border-emerald-800/50 rounded-md py-2 px-4 inline-flex items-center justify-center gap-2 transition-colors shadow-sm font-medium text-sm">
                <User className="w-4 h-4" /> Kepala Madrasah
              </a>
              <a href="#" className="w-fit bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-800/30 dark:border-emerald-800/50 rounded-md py-2 px-4 inline-flex items-center justify-center gap-2 transition-colors shadow-sm font-medium text-sm">
                <Trophy className="w-4 h-4" /> Visi dan Misi
              </a>
              <a href="#" className="w-fit bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-800/30 dark:border-emerald-800/50 rounded-md py-2 px-4 inline-flex items-center justify-center gap-2 transition-colors shadow-sm font-medium text-sm">
                <History className="w-4 h-4" /> Sejarah
              </a>
              <a href="#" className="w-fit bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-800/30 dark:border-emerald-800/50 rounded-md py-2 px-4 inline-flex items-center justify-center gap-2 transition-colors shadow-sm font-medium text-sm">
                <Users className="w-4 h-4" /> Pengembang Website
              </a>
            </div>
          </div>

          {/* Box 2: Website Terkait */}
          <div className="border border-emerald-200 dark:border-gray-800 rounded-xl pt-8 px-6 pb-8 flex flex-col items-center min-h-[300px] md:aspect-square bg-white dark:bg-[#0A0A0A] shadow-sm">
            <h3 className="flex items-center gap-2 text-xl font-bold mb-4 border-b border-emerald-200 dark:border-gray-800 w-full pb-3 justify-center text-text-primary dark:text-text-darkPrimary">
              <LinkIcon className="w-5 h-5 text-emerald-600" /> Website Terkait
            </h3>
            <div className="flex flex-col items-center gap-2 w-full">
              {websites.map((site, i) => (
                <a key={i} href={site.url || '#'} target="_blank" rel="noopener noreferrer" className="w-fit bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-800/30 dark:border-emerald-800/50 rounded-md py-2 px-4 inline-flex items-center justify-center gap-2 transition-colors shadow-sm font-medium text-sm text-center">
                  {site.label}
                </a>
              ))}
            </div>
          </div>

          {/* Box 3: Identitas & Kontak */}
          <div className="border border-emerald-200 dark:border-gray-800 rounded-xl pt-8 px-4 sm:px-6 pb-6 flex flex-col items-center text-center min-h-[300px] md:aspect-square bg-white dark:bg-[#0A0A0A] shadow-sm overflow-hidden">
            {/* Logo */}
            <div className="w-16 h-16 shrink-0 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-xs text-gray-400">Logo</span>
              )}
            </div>
            
            <h4 className="text-base sm:text-lg font-bold text-text-primary dark:text-text-darkPrimary mb-2 leading-tight">
              {schoolName}
            </h4>
            
            <div className="space-y-2 mb-3 flex-grow flex flex-col justify-center w-full">
              <p className="flex items-center justify-center gap-2 text-xs sm:text-sm text-text-secondary">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-[200px] sm:max-w-none">{address}</span>
              </p>
              <p className="flex items-center justify-center gap-2 text-xs sm:text-sm text-text-secondary">
                <Phone className="w-4 h-4 shrink-0" />
                <span>{phone}</span>
              </p>
              <p className="flex items-center justify-center gap-2 text-xs sm:text-sm text-text-secondary">
                <Mail className="w-4 h-4 shrink-0" />
                <span>{email}</span>
              </p>
            </div>

            {/* Social Media Icons */}
            <div className="flex gap-1.5 sm:gap-2 justify-center w-full pt-3 border-t border-gray-200 dark:border-gray-800 shrink-0">
              {socialLinks.map((s, i) => (
                <a key={i} href={s.url || '#'} target="_blank" rel="noopener noreferrer" className="p-1.5 sm:p-2 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-text-secondary hover:text-primary transition-colors">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
          
        </div>
        <div className="mt-6 border-t border-border-light dark:border-border-dark pt-4 sm:mt-8 lg:mt-10 flex flex-col items-center justify-center text-center">
          <p className="text-sm font-medium leading-6 text-text-primary dark:text-text-darkPrimary">
            &copy; 2026{new Date().getFullYear() > 2026 ? ` - ${new Date().getFullYear()}` : ''} | Sistem Informasi Manajemen {schoolName}
          </p>
          <p className="text-sm leading-6 text-text-secondary mt-1">
            Powered by <span className="font-semibold text-text-primary dark:text-text-darkPrimary">{footerCreditText}</span> Created by <span className="text-green-500">❤</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
