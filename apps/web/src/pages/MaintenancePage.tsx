
import { useSiteSettings } from '../hooks/api/useSettings';
import { Link } from 'react-router-dom';

export const MaintenancePage = () => {
  const { get } = useSiteSettings();

  const title = get('maintenance_title') || 'SITUS SEDANG DALAM PEMELIHARAAN';
  const message = get('maintenance_message') || 'Kami sedang melakukan pembaruan untuk meningkatkan performa dan fitur. Mohon maaf atas ketidaknyamanan ini.';
  const estimate = get('maintenance_estimate') || '± 30 menit';
  const contactText = get('maintenance_contact_text') || 'HUBUNGI KAMI';
  const contactUrl = get('maintenance_contact_url') || '/';

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* Decorative Blob Backgrounds */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-slate-100 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div className="max-w-3xl w-full z-10 flex flex-col items-center text-center">
        
        {/* Animated Crane & Construction Illustration (CSS/SVG mix to match reference) */}
        <div className="relative w-full max-w-sm h-64 mb-10 flex justify-center items-end border-b-2 border-amber-200">
          {/* Subtle Backstage Trees / Reeds */}
          <div className="absolute bottom-0 left-4 w-1 bg-emerald-700/30 h-16 origin-bottom transform -rotate-12 rounded" />
          <div className="absolute bottom-0 left-8 w-1 bg-emerald-700/30 h-24 origin-bottom transform rotate-6 rounded" />
          <div className="absolute bottom-0 right-8 w-1 bg-emerald-700/30 h-20 origin-bottom transform -rotate-6 rounded" />
          <div className="absolute bottom-0 right-12 w-1 bg-emerald-700/30 h-12 origin-bottom transform rotate-12 rounded" />
          
          {/* The Tow Truck SVG representation */}
          <svg viewBox="0 0 400 300" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            {/* The Crane Boom & Cord */}
            <g className="animate-[wiggle_4s_ease-in-out_infinite]">
              <path d="M 180 200 L 150 80" stroke="#d97706" strokeWidth="8" strokeLinecap="round" />
              <path d="M 150 80 L 250 120" stroke="#d97706" strokeWidth="8" strokeLinecap="round" />
              <circle cx="150" cy="80" r="10" fill="#f59e0b" />
              <line x1="150" y1="90" x2="150" y2="180" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
              <line x1="250" y1="120" x2="250" y2="210" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
            </g>
            
            {/* The Towed Car */}
            <g className="translate-y-4 origin-center animate-[bounce_2s_ease-in-out_infinite]">
              <rect x="80" y="180" width="100" height="40" rx="10" fill="#0ea5e9" transform="rotate(-15 130 200)" />
              <rect x="90" y="160" width="60" height="25" rx="5" fill="#bae6fd" transform="rotate(-15 130 200)" />
              <circle cx="100" cy="220" r="14" fill="#334155" />
              <circle cx="160" cy="205" r="14" fill="#334155" />
              <circle cx="100" cy="220" r="6" fill="#f1f5f9" />
              <circle cx="160" cy="205" r="6" fill="#f1f5f9" />
            </g>

            {/* The Tow Truck Body */}
            <g className="translate-x-4">
              <path d="M 160 250 L 320 250 L 320 210 L 290 210 L 280 180 L 230 180 L 230 250" fill="#f43f5e" />
              <rect x="150" y="240" width="80" height="15" fill="#facc15" />
              <rect x="240" y="190" width="30" height="20" rx="3" fill="#fecdd3" />
              <circle cx="200" cy="260" r="16" fill="#0d9488" />
              <circle cx="290" cy="260" r="16" fill="#0d9488" />
              <circle cx="200" cy="260" r="6" fill="#ccfbf1" />
              <circle cx="290" cy="260" r="6" fill="#ccfbf1" />
            </g>
          </svg>
        </div>

        {/* Text Content */}
        <h1 className="text-3xl md:text-5xl font-extrabold text-[#064E3B] uppercase tracking-wide mb-6">
          {title}
        </h1>

        <div className="max-w-2xl mx-auto space-y-4">
          <p className="text-gray-500 text-sm md:text-base leading-relaxed">
            {message}
          </p>

          {(estimate && estimate.trim() !== '') && (
            <div className="flex flex-col items-center mt-6">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
                Estimasi Selesai
              </span>
              <span className="text-gray-700 font-semibold px-4 py-1.5 bg-gray-100 rounded-full text-sm">
                {estimate}
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        {(contactText && contactUrl) && (
          <div className="mt-12">
            {contactUrl.startsWith('http') ? (
              <a 
                href={contactUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex px-8 py-3.5 bg-[#00A896] hover:bg-[#028F80] text-white font-bold rounded-full transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-teal-500/30 font-sans tracking-wide text-sm"
              >
                {contactText}
              </a>
            ) : (
              <Link 
                to={contactUrl} 
                className="inline-flex px-8 py-3.5 bg-[#00A896] hover:bg-[#028F80] text-white font-bold rounded-full transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-teal-500/30 font-sans tracking-wide text-sm"
              >
                {contactText}
              </Link>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
