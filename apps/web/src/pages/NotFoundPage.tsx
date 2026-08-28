import { Link } from 'react-router-dom';

export const NotFoundPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] p-6">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
        </div>

        <h1 className="text-6xl font-bold font-heading text-gray-900 dark:text-white mb-2">404</h1>
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Halaman Tidak Ditemukan
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.history.back()}
            className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
            aria-label="Kembali ke halaman sebelumnya"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            Kembali
          </button>
          <Link
            to="/"
            className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors flex items-center gap-2"
            aria-label="Kembali ke beranda"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Beranda
          </Link>
        </div>
      </div>
    </div>
  );
};
