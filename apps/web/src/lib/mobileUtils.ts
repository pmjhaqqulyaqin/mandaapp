import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

/**
 * Mendownload atau membagikan blob file.
 * Di native android/iOS, fitur Download standard HTML5 diblokir oleh WebView.
 * Jadi kita menggunakan Web Share API untuk memunculkan dialog "Simpan ke / Bagikan"
 */
export const downloadOrShareBlob = async (blob: Blob, filename: string) => {
  if (Capacitor.isNativePlatform() && navigator.share) {
    try {
      // Konversi Blob menjadi File object yang didukung Web Share API
      const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
      
      // Mengecek apakah browser mensupport sharing file ini
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Simpan/Bagikan ${filename}`,
        });
        return;
      }
    } catch (error: any) {
      // User membatalkan dialog share (AbortError) bukanlah error yang harus dilaporkan
      if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
        console.error('Share error:', error);
        toast.error('Gagal membagikan atau menyimpan file.');
      }
      return; 
    }
  }

  // Fallback ke perilaku browser standar (PC / Chrome Mobile)
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

/**
 * Fetch file dari URL, lalu trigger download/share.
 * Ini untuk mengatasi window.open() yang memblokir proses download di Webview APK.
 */
export const downloadFileFromUrl = async (url: string, filename: string) => {
  // Jika desktop, cukup pakai window.open untuk simple trigger download (jika URL tsb diset attachment oleh server)
  if (!Capacitor.isNativePlatform()) {
    window.open(url, '_blank');
    return;
  }

  try {
    toast.loading('Menyiapkan file...', { id: 'download-file' });
    const response = await fetch(url);
    if (!response.ok) throw new Error('Gagal mengambil file dari server');
    
    const blob = await response.blob();
    toast.dismiss('download-file');
    await downloadOrShareBlob(blob, filename);
  } catch (error) {
    console.error('Download fetch error:', error);
    toast.error('Gagal menyiapkan file dari server.', { id: 'download-file' });
    // Fallback buka url biasa jika gagal
    window.open(url, '_blank');
  }
};
