import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../lib/api';
import { Loader2 } from 'lucide-react';
import QRCode from 'qrcode';

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr || '-';
  }
}

/**
 * QR Code rendered as a pre-generated data URL image
 */
const QrCodeImg = ({ dataUrl, size = 46 }: { dataUrl: string; size?: number }) => (
  <img
    src={dataUrl}
    alt="QR"
    width={size}
    height={size}
    style={{ width: size, height: size, imageRendering: 'pixelated' }}
    className="mix-blend-multiply"
  />
);

export const PrintKartuLogin = () => {
  const { ujianId } = useParams();
  const [searchParams] = useSearchParams();
  const ruangId = searchParams.get('ruangId');

  const [loading, setLoading] = useState(true);
  const [ujian, setUjian] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [qrMap, setQrMap] = useState<Map<string, string>>(new Map());
  const [qrReady, setQrReady] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let endpoint = `/exams/${ujianId}/login-cards`;
        if (ruangId && ruangId !== 'ALL') {
          endpoint += `?ruangId=${ruangId}`;
        }

        const [uRes, cRes, sRes] = await Promise.all([
          apiClient(`/exams/${ujianId}`),
          apiClient(endpoint),
          apiClient('/settings').catch(() => null)
        ]);

        setUjian(uRes);
        setCards(Array.isArray(cRes) ? cRes : []);

        const settingsArr = Array.isArray((sRes as any)?.data || sRes) ? ((sRes as any)?.data || sRes) : [];
        const settingsMap: Record<string, string> = {};
        for (const s of settingsArr) {
          if (s.key && s.value) settingsMap[s.key] = s.value;
        }
        setGlobalSettings(settingsMap);
      } catch (err) {
        console.error('Error fetching login card data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ujianId, ruangId]);

  // Batch QR Code Generation
  useEffect(() => {
    if (loading || !ujian || cards.length === 0) return;

    const generateAll = async () => {
      const map = new Map<string, string>();
      const chunkSize = 25;

      for (let i = 0; i < cards.length; i += chunkSize) {
        const chunk = cards.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (card) => {
            const s = card.siswa || {};
            const ruang = card.ruang?.namaRuang || card.ruangId || '-';
            const kelas = s.fullClassName || s.className || '-';

            const qrData = `Nama: ${s.fullName || '-'}\nNIS: ${s.nis || '-'}\nNISN: ${s.nisn || '-'}\nUsername: ${card.username}\nKelas: ${kelas}\nRuang: ${ruang}`;

            try {
              const url = await QRCode.toDataURL(qrData, {
                width: 92,
                margin: 0,
                errorCorrectionLevel: 'M',
              });
              map.set(card.id, url);
            } catch (e) {
              console.error('Failed to generate QR for card:', card.id, e);
            }
          })
        );

        if (i + chunkSize < cards.length) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      setQrMap(map);
      setQrReady(true);
    };

    generateAll();
  }, [loading, ujian, cards]);

  // Auto-print after QR codes are ready
  useEffect(() => {
    if (!qrReady || !ujian || searchParams.get('preview') === 'true') return;
    const timer = setTimeout(() => {
      window.print();
    }, 800);
    return () => clearTimeout(timer);
  }, [qrReady, ujian, searchParams]);

  if (loading || (!qrReady && cards.length > 0)) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 flex-col gap-3">
        <Loader2 className="animate-spin text-amber-500" size={32} />
        <p className="text-sm text-gray-600 font-medium">
          {loading ? 'Memuat data kartu login...' : `Menyiapkan QR Code (${qrMap.size}/${cards.length})...`}
        </p>
      </div>
    );
  }

  if (!ujian) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500 font-bold">
        Data Ujian Tidak Ditemukan
      </div>
    );
  }

  // Header and School info
  const config = ujian.pengaturan?.kartuPeserta || {};
  const kop = ujian.pengaturan?.kop || {};
  // 1 Logo Kanan (Madrasah / Sekolah)
  const logoSekolah = globalSettings?.logo_url || config.logoKanan || '';
  const namaSekolah = kop.instansi || globalSettings?.school_name || 'MAN 2 LOMBOK TIMUR';
  const namaUjian = (ujian.namaUjian || ujian.jenis || 'ASESMEN SUMATIF').toUpperCase();

  // Jadwal Ujian (Format rentang tanggal)
  let jadwalText = '-';
  if (ujian.tanggalMulai) {
    const tglMulai = formatDate(ujian.tanggalMulai);
    const tglSelesai = ujian.tanggalSelesai ? formatDate(ujian.tanggalSelesai) : '';
    jadwalText = tglSelesai && tglSelesai !== tglMulai ? `${tglMulai} - ${tglSelesai}` : tglMulai;
  }

  // 10 kartu per halaman (2 kolom x 5 baris)
  const cardsPerPage = 10;
  const pages: any[][] = [];
  for (let i = 0; i < cards.length; i += cardsPerPage) {
    pages.push(cards.slice(i, i + cardsPerPage));
  }

  const CardItem = ({ card }: { card: any }) => {
    const s = card.siswa || {};
    const ruang = card.ruang?.namaRuang || card.ruangId || '-';
    const kelas = s.fullClassName || s.className || '-';
    const qrDataUrl = qrMap.get(card.id) || '';

    const nisNisn = [s.nis, s.nisn].filter(Boolean).join(' / ') || '-';
    const birthDate = s.birthDate ? formatDate(s.birthDate) : '';
    const ttl = s.birthPlace && birthDate ? `${s.birthPlace}, ${birthDate}` : (s.birthPlace || birthDate || '-');

    return (
      <div
        className="relative border-[1.5px] border-black px-2.5 py-2 flex flex-col font-sans box-border overflow-hidden bg-white text-black"
        style={{ width: '86mm', height: '54mm' }}
      >
        {/* HEADER KARTU */}
        <div className="flex items-center gap-1.5 pb-1 border-b-[1.5px] border-black">
          {/* Logo Sekolah (1 logo kanan ditaruh di sisi kiri header kartu) */}
          <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center">
            {logoSekolah ? (
              <img src={logoSekolah} alt="Logo" className="max-w-full max-h-full object-contain" />
            ) : (
              <div className="w-9 h-9 rounded border border-gray-300 flex items-center justify-center text-[8px] text-gray-400">
                LOGO
              </div>
            )}
          </div>

          {/* Teks Judul */}
          <div className="flex-1 px-1 flex flex-col justify-center text-center leading-tight">
            <h1 className="text-[11px] font-black tracking-wider uppercase m-0 leading-tight">KARTU LOGIN</h1>
            <h2 className="text-[9px] font-bold uppercase m-0 line-clamp-1 leading-tight">{namaUjian}</h2>
            <h3 className="text-[8.5px] font-bold uppercase text-gray-800 m-0 line-clamp-1 leading-tight">{namaSekolah}</h3>
          </div>

          {/* QR Code di kanan atas */}
          <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center border border-black/40 overflow-hidden bg-white">
            {qrDataUrl ? (
              <QrCodeImg dataUrl={qrDataUrl} size={40} />
            ) : (
              <div className="w-10 h-10" />
            )}
          </div>
        </div>

        {/* BODY IDENTITAS PESERTA (Distribusi vertikal penuh mengisi seluruh ruang kartu) */}
        <div className="flex-1 flex flex-col justify-center pt-1 overflow-hidden">
          <table className="w-full h-full text-[9px] font-medium tracking-tight text-left border-collapse">
            <tbody>
              <tr>
                <td className="w-[96px] align-middle text-gray-800 font-semibold">Nama Peserta</td>
                <td className="w-2 align-middle font-bold text-center">:</td>
                <td className="align-middle font-bold uppercase truncate max-w-[170px] text-black text-[10px]">
                  {s.fullName || '-'}
                </td>
              </tr>
              <tr>
                <td className="align-middle text-gray-800 font-semibold">NIS / NISN</td>
                <td className="align-middle font-bold text-center">:</td>
                <td className="align-middle font-semibold text-black tracking-wider text-[9.5px]">{nisNisn}</td>
              </tr>
              <tr>
                <td className="align-middle text-gray-800 font-semibold">Tempat, Tanggal Lahir</td>
                <td className="align-middle font-bold text-center">:</td>
                <td className="align-middle uppercase truncate max-w-[170px] text-black text-[9px]">{ttl}</td>
              </tr>
              <tr className="bg-amber-50/70 print:bg-transparent">
                <td className="align-middle text-gray-950 font-bold">Username</td>
                <td className="align-middle font-bold text-center">:</td>
                <td className="align-middle font-black text-black tracking-widest text-[10.5px] font-mono">
                  {card.username}
                </td>
              </tr>
              <tr className="bg-amber-50/70 print:bg-transparent">
                <td className="align-middle text-gray-950 font-bold">Password</td>
                <td className="align-middle font-bold text-center">:</td>
                <td className="align-middle font-black text-black tracking-widest text-[11px] font-mono">
                  {card.password}
                </td>
              </tr>
              <tr>
                <td className="align-middle text-gray-800 font-semibold">Ruang / Kelas</td>
                <td className="align-middle font-bold text-center">:</td>
                <td className="align-middle font-bold uppercase text-black text-[9.5px]">
                  {ruang} / {kelas}
                </td>
              </tr>
              <tr>
                <td className="align-middle text-gray-800 font-semibold">Jadwal</td>
                <td className="align-middle font-bold text-center">:</td>
                <td className="align-middle text-black font-semibold text-[9px]">{jadwalText}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @page {
          size: A4 portrait;
          margin: 7mm 8mm;
        }
        @media print {
          html, body {
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
        }
        .page-container {
          background-color: white;
          width: 210mm;
          min-height: 297mm;
          padding: 7mm 8mm;
          margin: 0 auto;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          box-sizing: border-box;
        }
        @media print {
          .page-container {
            margin: 0;
            padding: 0;
            box-shadow: none;
            width: auto;
            min-height: 0;
            height: auto;
          }
        }
      `,
        }}
      />

      <div className="min-h-screen bg-gray-300 py-10 print:py-0 print:bg-white print:min-h-0">
        {pages.map((pageCards, pageIdx) => (
          <div
            key={pageIdx}
            className={`page-container ${
              pageIdx < pages.length - 1 ? 'page-break mb-10 print:mb-0' : ''
            }`}
          >
            <div className="grid grid-cols-2 gap-x-2 gap-y-[3mm]">
              {pageCards.map((card: any) => (
                <CardItem key={card.id} card={card} />
              ))}
            </div>
          </div>
        ))}

        {cards.length === 0 && (
          <div className="page-container flex flex-col items-center justify-center text-gray-500 print:hidden shadow-lg p-12 gap-3">
            <p className="font-semibold text-base">Belum ada Kartu Login yang di-generate</p>
            <p className="text-xs text-gray-400">
              Silakan klik tombol <b>Generate Akun</b> pada tab Kartu & ID untuk membuat username dan password peserta.
            </p>
          </div>
        )}
      </div>
    </>
  );
};
