/**
 * WhatsApp Message Templates — Presensi Siswa
 * Format: WhatsApp markdown (*bold*, _italic_)
 */

const STATUS_CONFIG: Record<string, {
  emoji: string;
  label: string;
  advice: string;
}> = {
  'Hadir':     { emoji: '✅', label: 'HADIR',              advice: 'Alhamdulillah, putra/putri Anda hadir tepat waktu hari ini.' },
  'Terlambat': { emoji: '⏰', label: 'TERLAMBAT',          advice: '⚠️ Mohon memastikan putra/putri Anda berangkat lebih awal agar tidak terlambat.' },
  'Alpa':      { emoji: '❌', label: 'TIDAK HADIR (ALPA)',  advice: '⚠️ Putra/putri Anda tidak hadir tanpa keterangan. Mohon hubungi wali kelas jika ada keperluan.' },
  'Bolos':     { emoji: '🚫', label: 'BOLOS',              advice: '🚨 Putra/putri Anda terdeteksi meninggalkan sekolah tanpa izin. Mohon segera hubungi wali kelas.' },
  'Sakit':     { emoji: '🏥', label: 'SAKIT',              advice: 'Semoga lekas sembuh. Surat keterangan sakit dapat diserahkan saat masuk kembali.' },
  'Izin':      { emoji: '📋', label: 'IZIN',               advice: 'Izin putra/putri Anda telah tercatat oleh pihak sekolah.' },
  'Pulang':    { emoji: '🏠', label: 'PULANG',             advice: 'Putra/putri Anda sudah selesai kegiatan belajar dan pulang dari sekolah.' },
};

export function formatAttendanceWaMessage(params: {
  studentName: string;
  className: string;
  status: string;
  date: string;
  time: string;
  parentName?: string;
}): string {
  const { studentName, className, status, date, time, parentName } = params;
  const config = STATUS_CONFIG[status] || { emoji: '📋', label: status, advice: '' };

  const formattedDate = (() => {
    try {
      return new Date(date).toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    } catch { return date; }
  })();

  const greeting = parentName
    ? `Yth. *${parentName}*,`
    : `Yth. Bapak/Ibu Wali Murid,`;

  return [
    `${config.emoji} *NOTIFIKASI KEHADIRAN SISWA*`,
    `_MAN 2 Lombok Timur_`,
    `━━━━━━━━━━━━━━━━━━`,
    ``,
    `Assalamualaikum Wr. Wb.`,
    greeting,
    ``,
    `Berikut informasi kehadiran putra/putri Anda:`,
    ``,
    `👤 Nama  : *${studentName}*`,
    `🏫 Kelas : ${className}`,
    `📅 Tanggal: ${formattedDate}`,
    `⏰ Waktu : ${time} WITA`,
    ``,
    `📌 Status: *${config.label}* ${config.emoji}`,
    ``,
    config.advice,
    ``,
    `━━━━━━━━━━━━━━━━━━`,
    `_Pesan otomatis dari SIMANDA_`,
    `_MAN 2 Lombok Timur_`,
  ].join('\n');
}
