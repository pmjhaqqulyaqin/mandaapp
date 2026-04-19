import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

const LocalQRCode = ({ data, size = 150, style }: { data: string, size?: number, style?: React.CSSProperties }) => {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (data) {
      QRCode.toDataURL(data, { width: size, margin: 0 })
        .then(setUrl)
        .catch(console.error);
    }
  }, [data, size]);
  return url ? <img src={url} alt="QR Code" style={{ width: size, height: size, ...style }} /> : <div style={{ width: size, height: size, ...style }} />;
};

const LocalBarcode = ({ data, style }: { data: string, style?: React.CSSProperties }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (svgRef.current && data) {
      JsBarcode(svgRef.current, data, {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        height: 50,
        width: 2
      });
    }
  }, [data]);
  return <svg ref={svgRef} style={style} />;
};export type CardOrientation = 'horizontal' | 'vertical';
export type CardTemplateName = 'classic-blue' | 'modern-green' | 'elegant-gold';

export interface PrintableCardTemplate {
  id: CardTemplateName;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headerGradient: string;
}

export interface PrintableCardStudent {
  name: string;
  nisn: string;
  className: string;
  birthPlace: string;
  birthDate: string;
  gender: string;
  major?: string;
  address?: string;
  photoUrl?: string;
}

export interface PrintableCardSettings {
  schoolName: string;
  schoolSubtitle: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  headmasterName?: string;
  headmasterNip?: string;
  termsText?: string;
  schoolLogoUrl?: string;
  headmasterSignatureUrl?: string;
  kemenagLogoUrl?: string;
  schoolStampUrl?: string;
  academicYear: string;
  showQrCode: boolean;
  customTemplateFrontUrl?: string;
  customTemplateBackUrl?: string;
}

export interface PrintableStudentCardProps {
  student: PrintableCardStudent;
  template: PrintableCardTemplate;
  settings: PrintableCardSettings;
  orientation: CardOrientation;
  scale?: number;
  side?: 'front' | 'back' | 'both';
}

const TEMPLATES: Record<CardTemplateName, PrintableCardTemplate> = {
  'classic-blue': {
    id: 'classic-blue',
    name: 'Classic Blue',
    primaryColor: '#1e40af',
    secondaryColor: '#3b82f6',
    accentColor: '#dbeafe',
    headerGradient: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
  },
  'modern-green': {
    id: 'modern-green',
    name: 'Modern Green (Borcelle)',
    primaryColor: '#2b783f',
    secondaryColor: '#88be4f',
    accentColor: '#224a2c',
    headerGradient: '#2b783f',
  },
  'elegant-gold': {
    id: 'elegant-gold',
    name: 'Elegant Gold',
    primaryColor: '#92400e',
    secondaryColor: '#f59e0b',
    accentColor: '#fef3c7',
    headerGradient: 'linear-gradient(135deg, #92400e 0%, #f59e0b 100%)',
  },
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export { TEMPLATES as CARD_TEMPLATES };

export const PrintableStudentCard = ({
  student,
  template,
  settings,
  orientation,
  scale = 1,
  side = 'both',
}: PrintableStudentCardProps) => {
  const qrData = `NISN: ${student.nisn}\nNama: ${student.name}\nTTL: ${student.birthPlace}, ${formatDate(student.birthDate)}\nSekolah: ${settings.schoolName}`;

  // KTP dimensions in mm: 85.6 x 54mm
  // Typical ID Card in pixels at 300 DPI is approx 1011 x 638.
  // We'll use a responsive aspect ratio mapping. CSS dimension: 85.6mm x 54mm = 3.37in x 2.125in. 
  // Let's use 323px x 204px as base size but we actually want high res for printing.
  // At CSS level, we can multiply coordinates by 2 for sharper vector text: 646px x 408px.
  const isHorizontal = orientation === 'horizontal';
  const cardWidth = isHorizontal ? 856 : 408;
  const cardHeight = isHorizontal ? 540 : 646;

  const containerStyle: React.CSSProperties = {
    width: `${cardWidth}px`,
    height: `${cardHeight}px`,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
    position: 'relative',
    backgroundColor: '#ffffff', // Clean white background base
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    borderRadius: '8px', // High fidelity rounded corners (small)
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  };

  const wrapperStyle: React.CSSProperties = {
    width: `${cardWidth * scale}px`,
    height: `${cardHeight * scale}px`,
    position: 'relative',
    flexShrink: 0,
  };

  const backContainerStyle: React.CSSProperties = {
    ...containerStyle,
    marginTop: '24px', // Space between front and back when previewed vertically
    backgroundColor: '#ffffff',
  };

  // --- HORIZONTAL DESIGN COMPONENTS ---
  // A dedicated set of renderers to match the exact newly requested "Formal" layout.
  const HorizontalFront = () => {
    const kemenagLogoUrl = settings.kemenagLogoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Lambang_Kementerian_Agama.svg/300px-Lambang_Kementerian_Agama.svg.png";
    const headerColor = template?.primaryColor || '#14425A';
    const textColor = '#111827';
    
    // Encode essential ID info into the 1D Barcode. Max ~30 chars for highly reliable scanning.
    const barcodeText = `${student.nisn}`;

    const bgUrl = settings.customTemplateFrontUrl;

    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: bgUrl ? 'transparent' : '#ffffff' }}>
        {bgUrl && <img src={bgUrl} alt="Background" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />}
        
        <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <div style={{ width: '100%', height: '130px', backgroundColor: bgUrl ? 'transparent' : headerColor, display: 'flex', alignItems: 'center', padding: '0 30px', justifyContent: 'space-between' }}>
            <img src={kemenagLogoUrl} alt="Kemenag" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
            <div style={{ flex: 1, textAlign: 'center', color: bgUrl ? textColor : '#ffffff', textShadow: bgUrl ? '0 1px 2px rgba(255,255,255,0.8)' : 'none' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '1px' }}>KEMENTERIAN AGAMA REPUBLIK INDONESIA</div>
              <div style={{ fontSize: '26px', fontWeight: 800, margin: '4px 0', letterSpacing: '0.5px' }}>{settings.schoolName || 'MADRASAH ALIYAH NEGERI'}</div>
              <div style={{ fontSize: '13px', fontWeight: 400, opacity: 0.9 }}>{settings.schoolAddress || 'Alamat Sekolah Belum Diatur'}</div>
            </div>
            {settings.schoolLogoUrl ? (
              <img src={settings.schoolLogoUrl} alt="Logo Sekolah" style={{ width: '85px', height: '85px', objectFit: 'contain' }} />
            ) : <div style={{ width: '85px' }} />}
          </div>

          {/* BODY */}
          <div style={{ display: 'flex', padding: '25px 40px', gap: '40px', flex: 1 }}>
            {/* Foto */}
            <div style={{ width: '160px', height: '220px', backgroundColor: bgUrl ? 'rgba(226,232,240,0.5)' : '#e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
              {student.photoUrl ? (
                <img src={student.photoUrl} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '48px', color: '#94a3b8' }}>
                  {student.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Data */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: '32px', color: textColor, fontWeight: 900, fontStyle: 'italic', letterSpacing: '2px', margin: '0 0 25px 0' }}>
                KARTU PELAJAR SISWA
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '120px 15px 1fr', gap: '14px', fontSize: '18px', color: textColor, fontWeight: 700 }}>
                <div>NAMA</div><div>:</div><div style={{ fontWeight: 500, textTransform: 'uppercase' }}>{student.name}</div>
                <div>NIS/NISN</div><div>:</div><div style={{ fontWeight: 500 }}>{student.nisn}</div>
                <div>T.T.L</div><div>:</div><div style={{ fontWeight: 500, textTransform: 'uppercase' }}>{student.birthPlace}, {formatDate(student.birthDate)}</div>
                <div>ALAMAT</div><div>:</div><div style={{ fontWeight: 500, textTransform: 'uppercase', lineHeight: 1.3 }}>{student.address || '-'}</div>
              </div>

              {/* Barcode 1D */}
              <div style={{ marginTop: 'auto', marginBottom: '5px', height: '50px', width: '100%' }}>
                <LocalBarcode data={barcodeText} style={{ height: '100%', width: '250px', objectFit: 'fill' }} />
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM DECORATIONS */}
        {!bgUrl && (
          <>
            <div style={{ position: 'absolute', bottom: 0, left: '-20px', width: '220px', height: '120px', backgroundColor: '#facc15', borderTopRightRadius: '150px', zIndex: 1 }}></div>
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '85%', height: '50px', backgroundColor: headerColor, borderTopLeftRadius: '30px', zIndex: 1 }}></div>
            <div style={{ position: 'absolute', bottom: '15px', right: '-20px', width: '150px', height: '50px', backgroundColor: '#facc15', borderRadius: '40px', zIndex: 2 }}></div>
          </>
        )}
      </div>
    );
  };

  const HorizontalBack = () => {
    const kemenagLogoUrl = settings.kemenagLogoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Lambang_Kementerian_Agama.svg/300px-Lambang_Kementerian_Agama.svg.png";
    const headerColor = template?.primaryColor || '#14425A';
    const textColor = '#111827';

    const termsTextRaw = settings.termsText || "Kartu pelajar ini hanya dikeluarkan kepada siswa yang terdaftar di sekolah.\nKartu pelajar bersifat pribadi dan tidak boleh digunakan oleh orang lain.\nPemegang kartu bertanggung jawab untuk menjaga kebersihan dan keutuhan kartu.\nKartu Pelajar ini berlaku selama masa studi aktif di sekolah yang terdaftar.";
    const termsLines = termsTextRaw.split('\n');

    // Advanced payload for QR Code tracking student legitimacy
    const qrPayload = `Sekolah: ${settings.schoolName}\nNPSN: ${settings.schoolSubtitle || '-'}\nDiterbitkan: ${formatDate(new Date().toISOString())}\nBerlaku: ${settings.academicYear}\nSiswa: ${student.name} (${student.nisn})\nLink: https://mandualotim.sch.id/student/${student.nisn}`;

    const bgUrl = settings.customTemplateBackUrl;

    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: bgUrl ? 'transparent' : '#ffffff' }}>
        {bgUrl && <img src={bgUrl} alt="Background" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />}
        
        <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* HEADER (Identical to Front) */}
          <div style={{ width: '100%', height: '130px', backgroundColor: bgUrl ? 'transparent' : headerColor, display: 'flex', alignItems: 'center', padding: '0 30px', justifyContent: 'space-between' }}>
            <img src={kemenagLogoUrl} alt="Kemenag" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
            <div style={{ flex: 1, textAlign: 'center', color: bgUrl ? textColor : '#ffffff', textShadow: bgUrl ? '0 1px 2px rgba(255,255,255,0.8)' : 'none' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '1px' }}>KEMENTERIAN AGAMA REPUBLIK INDONESIA</div>
              <div style={{ fontSize: '26px', fontWeight: 800, margin: '4px 0', letterSpacing: '0.5px' }}>{settings.schoolName || 'MADRASAH ALIYAH NEGERI'}</div>
              <div style={{ fontSize: '13px', fontWeight: 400, opacity: 0.9 }}>{settings.schoolAddress || 'Alamat Sekolah Belum Diatur'}</div>
            </div>
            {settings.schoolLogoUrl ? (
              <img src={settings.schoolLogoUrl} alt="Logo Sekolah" style={{ width: '85px', height: '85px', objectFit: 'contain' }} />
            ) : <div style={{ width: '85px' }} />}
          </div>

          {/* BODY (Terms and Conditions) */}
          <div style={{ padding: '20px 60px' }}>
             <h3 style={{ fontSize: '24px', fontWeight: 800, fontStyle: 'italic', letterSpacing: '1px', textAlign: 'center', marginBottom: '15px', color: textColor }}>
               SYARAT & KETENTUAN:
             </h3>
             <ul style={{ fontSize: '17px', lineHeight: 1.5, color: textColor, margin: 0, paddingLeft: '20px', fontWeight: 500 }}>
                {termsLines.map((line, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{line}</li>
                ))}
             </ul>
          </div>

          {/* BOTTOM AREA (QR & Signature) */}
          <div style={{ position: 'absolute', bottom: '45px', left: '90px', right: '60px', display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
             {/* QR Section */}
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', paddingTop: '15px' }}>
                <LocalQRCode data={qrPayload} size={105} style={{ border: '4px solid #ffffff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: '#111827', backgroundColor: 'rgba(255,255,255,0.7)', padding: '2px 6px', borderRadius: '4px' }}>MASA BERLAKU</div>
             </div>

             {/* Signature Section */}
             <div style={{ textAlign: 'center', width: '250px', position: 'relative' }}>
                {settings.schoolStampUrl && (
                  <img src={settings.schoolStampUrl} alt="Stempel Sekolah" style={{ position: 'absolute', top: '-10px', left: '-15px', width: '140px', height: '140px', objectFit: 'contain', opacity: 0.85, zIndex: 0 }} />
                )}
                <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '5px', position: 'relative', zIndex: 1, color: textColor }}>KEPALA MADRASAH</div>
                <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
                   {settings.headmasterSignatureUrl ? (
                     <img src={settings.headmasterSignatureUrl} alt="Tanda Tangan" style={{ maxHeight: '100px', maxWidth: '100%', objectFit: 'contain', transform: 'scale(1.3)' }} />
                   ) : (
                     <svg width="150" height="50" viewBox="0 0 200 60" fill="none">
                       <path d="M20 50 C40 30, 60 10, 80 40 S 120 70, 160 30" stroke={textColor} strokeWidth="3" fill="none" strokeLinecap="round" />
                     </svg>
                   )}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 600, textTransform: 'uppercase', color: textColor }}>
                   {settings.headmasterName || 'NAMA KEPALA SEKOLAH'}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: textColor }}>
                   NIP. {settings.headmasterNip || '-'}
                </div>
             </div>
          </div>
        </div>

        {/* BOTTOM DECORATIONS */}
        {!bgUrl && (
          <>
            <div style={{ position: 'absolute', bottom: 0, left: '-20px', width: '220px', height: '120px', backgroundColor: '#facc15', borderTopRightRadius: '150px', zIndex: 1 }}></div>
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '85%', height: '50px', backgroundColor: headerColor, borderTopLeftRadius: '30px', zIndex: 1 }}></div>
            <div style={{ position: 'absolute', bottom: '15px', right: '-20px', width: '150px', height: '50px', backgroundColor: '#facc15', borderRadius: '40px', zIndex: 2 }}></div>
          </>
        )}
      </div>
    );
  };

  const VerticalFront = () => {
    const headerColor = template?.primaryColor || '#3b1c9e'; // Default to deep purple if classic
    const textColor = '#111827';
    const kemenagLogoUrl = settings.kemenagLogoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Lambang_Kementerian_Agama.svg/300px-Lambang_Kementerian_Agama.svg.png";
    const barcodeText = `${student.nisn}`;

    const DotsMatrix = ({ color }: { color: string }) => (
      <svg width="40" height="40" viewBox="0 0 40 40" fill={color}>
        {[0, 10, 20, 30].map(x => [0, 10, 20, 30].map(y => (
          <circle key={`${x}-${y}`} cx={x+4} cy={y+4} r="2.5" />
        )))}
      </svg>
    );

    const bgUrl = settings.customTemplateFrontUrl;

    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: bgUrl ? 'transparent' : '#fcfcfc' }}>
        {bgUrl && <img src={bgUrl} alt="Background" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />}
        
        <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <div style={{ width: '100%', height: '180px', backgroundColor: bgUrl ? 'transparent' : headerColor, borderBottomLeftRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
             {/* Yellow Top Pill */}
             {!bgUrl && <div style={{ position: 'absolute', top: 0, left: 0, width: '140px', height: '24px', backgroundColor: '#facc15', borderBottomRightRadius: '12px' }}></div>}
             
             {/* Yellow Dots Top Right */}
             {!bgUrl && (
               <div style={{ position: 'absolute', top: '15px', right: '15px', opacity: 0.8 }}>
                 <DotsMatrix color="#facc15" />
               </div>
             )}

             <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '0 25px', width: '100%', marginTop: '10px' }}>
                <img src={kemenagLogoUrl} alt="Kemenag" style={{ width: '65px', height: '65px', objectFit: 'contain' }} />
                <div style={{ flex: 1, textAlign: 'center', color: bgUrl ? textColor : '#ffffff', textShadow: bgUrl ? '0 1px 2px rgba(255,255,255,0.8)' : 'none' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>KEMENTERIAN AGAMA REPUBLIK INDONESIA</div>
                  <div style={{ fontSize: '19px', fontWeight: 800, margin: '4px 0', letterSpacing: '0.5px' }}>{settings.schoolName || 'MADRASAH ALIYAH NEGERI'}</div>
                  <div style={{ fontSize: '10px', fontWeight: 400, opacity: 0.9 }}>{settings.schoolAddress || 'Alamat Sekolah Belum Diatur'}</div>
                </div>
                {settings.schoolLogoUrl ? (
                  <img src={settings.schoolLogoUrl} alt="Logo" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
                ) : <div style={{ width: '70px' }} />}
             </div>
          </div>

          {/* BODY */}
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
             
             {/* Title Area with Dots */}
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '15px' }}>
                <div style={{ opacity: bgUrl ? 0 : 0.8 }}><DotsMatrix color={headerColor} /></div>
                <h2 style={{ fontSize: '26px', color: textColor, fontWeight: 900, textAlign: 'center', lineHeight: 1.1, flex: 1 }}>
                  KARTU IDENTITAS<br/>PELAJAR
                </h2>
             </div>

             {/* Photo */}
             <div style={{ width: '170px', height: '230px', backgroundColor: bgUrl ? 'rgba(226,232,240,0.5)' : '#e2e8f0', borderRadius: '4px', border: bgUrl ? 'none' : `3px solid ${headerColor}`, overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
               {student.photoUrl ? (
                 <img src={student.photoUrl} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
               ) : (
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '48px', color: '#94a3b8' }}>
                   {student.name.charAt(0)}
                 </div>
               )}
             </div>

             {/* Data Grid */}
             <div style={{ width: '85%', display: 'grid', gridTemplateColumns: '120px 15px 1fr', gap: '12px', fontSize: '16px', color: textColor, fontWeight: 700, marginBottom: '25px' }}>
                <div>Nama</div><div>:</div><div style={{ fontWeight: 500 }}>{student.name}</div>
                <div>NIS/NISN</div><div>:</div><div style={{ fontWeight: 500 }}>{student.nisn}</div>
                <div>Tanggal Lahir</div><div>:</div><div style={{ fontWeight: 500 }}>{formatDate(student.birthDate)}</div>
                <div>Alamat</div><div>:</div><div style={{ fontWeight: 500, lineHeight: 1.2 }}>{student.address || '-'}</div>
             </div>

             {/* Barcode */}
             <div style={{ marginTop: 'auto', marginBottom: '10px', height: '40px', width: '100%', display: 'flex', justifyContent: 'center' }}>
               <LocalBarcode data={barcodeText} style={{ height: '100%', width: '220px', objectFit: 'fill' }} />
             </div>
          </div>
        </div>

        {/* FOOTER */}
        {!bgUrl && (
          <>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30px', backgroundColor: headerColor, zIndex: 1 }}></div>
            <div style={{ position: 'absolute', bottom: '30px', right: '15px', opacity: 0.8, zIndex: 1 }}><DotsMatrix color={headerColor} /></div>
            
            {/* Yellow Diagonal Stripes Graphic */}
            <div style={{ position: 'absolute', bottom: '30px', left: '15px', width: '120px', height: '40px', display: 'flex', gap: '4px', zIndex: 1 }}>
               {[1,2,3,4].map(i => (
                 <div key={i} style={{ width: '25px', height: '100%', backgroundColor: '#facc15', transform: 'skewX(-30deg)' }}></div>
               ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const VerticalBack = () => {
    const headerColor = template?.primaryColor || '#3b1c9e';
    const textColor = '#111827';
    const kemenagLogoUrl = settings.kemenagLogoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Lambang_Kementerian_Agama.svg/300px-Lambang_Kementerian_Agama.svg.png";
    
    // Fallback terms matching the image specifically
    const termsTextRaw = settings.termsText || "Kartu wajib dipakai selama berada di lingkungan sekolah\nTidak boleh dipinjamkan kepada orang lain.\nJika hilang, segera lapor ke wali kelas.\nMenjaga kartu agar tidak rusak atau kotor.";
    const termsLines = termsTextRaw.split('\n');

    const qrPayload = `Sekolah: ${settings.schoolName}\nNPSN: ${settings.schoolSubtitle || '-'}\nDiterbitkan: ${formatDate(new Date().toISOString())}\nBerlaku: ${settings.academicYear}\nSiswa: ${student.name} (${student.nisn})\nLink: https://mandualotim.sch.id/student/${student.nisn}`;

    const DotsMatrix = ({ color }: { color: string }) => (
      <svg width="40" height="40" viewBox="0 0 40 40" fill={color}>
        {[0, 10, 20, 30].map(x => [0, 10, 20, 30].map(y => (
          <circle key={`${x}-${y}`} cx={x+4} cy={y+4} r="2.5" />
        )))}
      </svg>
    );

    const bgUrl = settings.customTemplateBackUrl;

    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: bgUrl ? 'transparent' : '#fcfcfc' }}>
        {bgUrl && <img src={bgUrl} alt="Background" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />}

        <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <div style={{ width: '100%', height: '180px', backgroundColor: bgUrl ? 'transparent' : headerColor, borderBottomLeftRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
             {/* Yellow Top Pill */}
             {!bgUrl && <div style={{ position: 'absolute', top: 0, left: 0, width: '140px', height: '24px', backgroundColor: '#facc15', borderBottomRightRadius: '12px' }}></div>}
             
             {/* Yellow Dots Top Right */}
             {!bgUrl && (
               <div style={{ position: 'absolute', top: '15px', right: '15px', opacity: 0.8 }}>
                 <DotsMatrix color="#facc15" />
               </div>
             )}

             <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '0 25px', width: '100%', marginTop: '10px' }}>
                <img src={kemenagLogoUrl} alt="Kemenag" style={{ width: '65px', height: '65px', objectFit: 'contain' }} />
                <div style={{ flex: 1, textAlign: 'center', color: bgUrl ? textColor : '#ffffff', textShadow: bgUrl ? '0 1px 2px rgba(255,255,255,0.8)' : 'none' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>KEMENTERIAN AGAMA REPUBLIK INDONESIA</div>
                  <div style={{ fontSize: '19px', fontWeight: 800, margin: '4px 0', letterSpacing: '0.5px' }}>{settings.schoolName || 'MADRASAH ALIYAH NEGERI'}</div>
                  <div style={{ fontSize: '10px', fontWeight: 400, opacity: 0.9 }}>{settings.schoolAddress || 'Alamat Sekolah Belum Diatur'}</div>
                </div>
                {settings.schoolLogoUrl ? (
                  <img src={settings.schoolLogoUrl} alt="Logo" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
                ) : <div style={{ width: '70px' }} />}
             </div>
          </div>

          {/* BODY (Terms & QR) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 40px' }}>
             
             {/* Title Area with Dots */}
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '20px' }}>
                <div style={{ opacity: bgUrl ? 0 : 0.8 }}><DotsMatrix color={headerColor} /></div>
                <h3 style={{ fontSize: '24px', color: textColor, fontWeight: 900, textAlign: 'center', lineHeight: 1.2, flex: 1 }}>
                  SYARAT &<br/>KETENTUAN
                </h3>
                <div style={{ opacity: bgUrl ? 0 : 0.8 }}><DotsMatrix color={headerColor} /></div>
             </div>

             {/* Terms List */}
             <ul style={{ fontSize: '16px', lineHeight: 1.6, color: textColor, margin: '0 0 30px 0', paddingLeft: '20px', fontWeight: 500, alignSelf: 'flex-start' }}>
                {termsLines.map((line, i) => (
                  <li key={i} style={{ marginBottom: '12px' }}>{line}</li>
                ))}
             </ul>

             {/* Central QR Code */}
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: 'auto', marginBottom: '8px' }}>
                <LocalQRCode data={qrPayload} size={110} style={{ borderRadius: '4px' }} />
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: textColor }}>MASA BERLAKU</div>
             </div>

             {/* Center Text Blob */}
             <div style={{ textAlign: 'center', fontSize: '14px', lineHeight: 1.4, fontWeight: 500, textTransform: 'uppercase', color: textColor }}>
               KARTU INI ADALAH MILIK RESMI MADRASAH DAN HANYA<br/>DIGUNAKAN OLEH PEMEGANG YANG TERTERA
             </div>
          </div>

          {/* FOOTER */}
          <div style={{ margin: '15px 25px 30px 25px', padding: '15px 20px', backgroundColor: bgUrl ? 'transparent' : headerColor, borderRadius: '15px', display: 'flex', justifyContent: 'center', gap: '30px', color: bgUrl ? textColor : 'white', alignItems: 'center' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500 }}>
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
               {settings.schoolEmail || 'man2lotim@gmail.com'}
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500 }}>
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
               https://mandualotim.sch.id
             </div>
          </div>
        </div>
      </div>
    );
  };

  // We return a fragment containing both front and back cards if printing, or just front/back components in preview
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .printable-card-wrapper {
            position: relative !important;
            page-break-inside: avoid;
            break-inside: avoid;
            overflow: hidden !important;
            margin: 0 !important;
            box-sizing: border-box !important;
          }
          .printable-card-wrapper.orientation-horizontal {
            width: 85.6mm !important;
            height: 53.98mm !important;
          }
          .printable-card-wrapper.orientation-horizontal > .printable-card-front,
          .printable-card-wrapper.orientation-horizontal > .printable-card-back {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            transform: scale(0.37795) !important;
            transform-origin: top left !important;
            margin: 0 !important;
          }
          .printable-card-wrapper.orientation-vertical {
            width: 53.98mm !important;
            height: 85.6mm !important;
          }
          .printable-card-wrapper.orientation-vertical > .printable-card-front,
          .printable-card-wrapper.orientation-vertical > .printable-card-back {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            transform: scale(0.5002) !important;
            transform-origin: top left !important;
            margin: 0 !important;
          }
        }
      `}} />
      {(side === 'both' || side === 'front') && (
        <div style={wrapperStyle} className={`printable-card-wrapper orientation-${orientation}`}>
          <div style={containerStyle} className="printable-card-front" id={`card-front-${student.nisn}`}>
            {isHorizontal ? <HorizontalFront /> : <VerticalFront />}
          </div>
        </div>
      )}
      {(side === 'both' || side === 'back') && (
        <div style={{ ...wrapperStyle, marginTop: side === 'both' ? '24px' : '0' }} className={`printable-card-wrapper pt-back orientation-${orientation}`}>
          <div style={backContainerStyle} className="printable-card-back" id={`card-back-${student.nisn}`}>
            {isHorizontal ? <HorizontalBack /> : <VerticalBack />}
          </div>
        </div>
      )}
    </>
  );
};
