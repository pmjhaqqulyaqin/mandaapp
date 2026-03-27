import { forwardRef } from 'react';
import { useSiteSettings } from '../../../hooks/api/useSettings';

interface LembarDisposisiPrintProps {
  surat: any;
}

export const LembarDisposisiPrint = forwardRef<HTMLDivElement, LembarDisposisiPrintProps>(({ surat }, ref) => {
  const { get } = useSiteSettings();
  const principalName = get('principal_name');
  const principalNip = get('principal_nip');

  if (!surat) return null;

  return (
    <div className="hidden print:block absolute inset-0 bg-white" ref={ref}>
      <div className="p-8 font-serif" style={{ width: '100%', maxWidth: '210mm', margin: '0 auto' }}>
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold uppercase tracking-wide">Lembar Disposisi</h2>
          <h3 className="font-bold uppercase">Kementerian Agama Republik Indonesia</h3>
          <p className="text-sm">Madrasah Aliyah Negeri 2 Lombok Timur</p>
          <div className="w-full border-b-[3px] border-double border-black mt-2 mb-4"></div>
        </div>

        <table className="w-full border-collapse border border-black text-sm mb-6">
          <tbody>
            <tr>
              <td className="border border-black p-3 w-1/3 font-semibold">Indeks Berkas</td>
              <td className="border border-black p-3" colSpan={2}></td>
              <td className="border border-black p-3 w-1/4 font-semibold">Tingkat Keamanan</td>
              <td className="border border-black p-3 w-1/4">{surat.derajat || 'Biasa'}</td>
            </tr>
            <tr>
              <td className="border border-black p-3 font-semibold">Tanggal Penyelesaian</td>
              <td className="border border-black p-3" colSpan={2}></td>
              <td className="border border-black p-3 font-semibold">Sifat Penyelesaian</td>
              <td className="border border-black p-3">{surat.sifat || 'Biasa'}</td>
            </tr>
            <tr>
              <td className="border border-black p-3 font-semibold">Tanggal/Nomor Surat</td>
              <td className="border border-black p-3" colSpan={4}>
                {new Date(surat.tanggalSurat).toLocaleDateString('id-ID')} / {surat.nomorSuratAsli}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-3 font-semibold">Asal Surat</td>
              <td className="border border-black p-3" colSpan={4}>{surat.pengirim}</td>
            </tr>
            <tr>
              <td className="border border-black p-3 font-semibold">Perihal Surat</td>
              <td className="border border-black p-3" colSpan={4}>{surat.perihal}</td>
            </tr>
            <tr>
              <td className="border border-black p-3 font-semibold">Diterima Tanggal</td>
              <td className="border border-black p-3" colSpan={2}>{new Date(surat.tanggalDiterima).toLocaleDateString('id-ID')}</td>
              <td className="border border-black p-3 font-semibold">Nomor Agenda</td>
              <td className="border border-black p-3 font-bold text-lg">{surat.nomorAgenda}</td>
            </tr>
          </tbody>
        </table>

        <table className="w-full border-collapse border border-black text-sm text-left">
          <thead>
            <tr>
              <th className="border border-black p-3 w-1/3">Diteruskan Kepada Yth:</th>
              <th className="border border-black p-3 w-1/3">Dengan Hormat Harap:</th>
              <th className="border border-black p-3 w-1/3">Petunjuk / Catatan Kepala:</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-3 align-top min-h-[150px]">
                <ul className="list-none space-y-2">
                  <li>[ &nbsp; ] Kepala TU</li>
                  <li>[ &nbsp; ] Wakamad Kurikulum</li>
                  <li>[ &nbsp; ] Wakamad Kesiswaan</li>
                  <li>[ &nbsp; ] Wakamad Humas</li>
                  <li>[ &nbsp; ] Wakamad Sarpras</li>
                  <li>[ &nbsp; ] ..........................</li>
                </ul>
              </td>
              <td className="border border-black p-3 align-top">
                <ul className="list-none space-y-2">
                  <li>[ &nbsp; ] Tanggapan dan Saran</li>
                  <li>[ &nbsp; ] Proses Lebih Lanjut</li>
                  <li>[ &nbsp; ] Koordinasi / Konfirmasi</li>
                  <li>[ &nbsp; ] Untuk Diketahui / Arsip</li>
                  <li>[ &nbsp; ] ..........................</li>
                </ul>
              </td>
              <td className="border border-black p-3 align-top">
                <div className="h-full min-h-[150px]"></div>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-12 flex justify-end">
          <div className="w-64 text-center">
            <div className="mb-16">Kepala Madrasah,</div>
            <div className="font-bold underline uppercase">{principalName || '..........................'}</div>
            <div>NIP. {principalNip || '..........................'}</div>
          </div>
        </div>

      </div>
    </div>
  );
});
LembarDisposisiPrint.displayName = 'LembarDisposisiPrint';
