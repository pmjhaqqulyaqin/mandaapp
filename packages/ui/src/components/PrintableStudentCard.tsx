import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';

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

export type CardOrientation = 'horizontal' | 'vertical';
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

    const bgUrl = settings.customTemplateFrontUrl;

    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: bgUrl ? 'transparent' : '#ffffff' }}>
        {bgUrl && <img src={bgUrl} alt="Background" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />}
        
        <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <div style={{ width: '100%', height: '130px', backgroundColor: bgUrl ? 'transparent' : headerColor, display: 'flex', alignItems: 'center', padding: '0 65px', justifyContent: 'space-between' }}>
            <img src={kemenagLogoUrl} alt="Kemenag" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
            <div style={{ flex: 1, textAlign: 'center', color: '#ffffff', textShadow: bgUrl ? '0 1px 3px rgba(0,0,0,0.6)' : 'none' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '1px' }}>KEMENTERIAN AGAMA REPUBLIK INDONESIA</div>
              <div style={{ fontSize: '26px', fontWeight: 800, margin: '4px 0', letterSpacing: '0.5px' }}>{settings.schoolName || 'MADRASAH ALIYAH NEGERI'}</div>
              <div style={{ fontSize: '13px', fontWeight: 400, opacity: 0.9 }}>{settings.schoolAddress || 'Alamat Sekolah Belum Diatur'}</div>
            </div>
            {settings.schoolLogoUrl ? (
              <img src={settings.schoolLogoUrl} alt="Logo Sekolah" style={{ width: '85px', height: '85px', objectFit: 'contain' }} />
            ) : <div style={{ width: '85px' }} />}
          </div>

          {/* TITLE - Centered */}
          <div style={{ textAlign: 'center', padding: '8px 30px 0 30px' }}>
            <h2 style={{ fontSize: '44px', color: textColor, fontWeight: 900, fontStyle: 'italic', letterSpacing: '3px', margin: 0 }}>
              KARTU PELAJAR
            </h2>
          </div>

          {/* BODY - 3 columns: Photo | Identity Text | QR Code */}
          <div style={{ display: 'flex', padding: '10px 30px 15px 30px', flex: 1, alignItems: 'flex-start' }}>
            {/* Left Column: Photo */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px', flexShrink: 0 }}>
              {/* Foto */}
              <div style={{ width: '160px', height: '190px', backgroundColor: bgUrl ? 'rgba(226,232,240,0.5)' : '#e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                {student.photoUrl ? (
                  <img src={student.photoUrl} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '48px', color: '#94a3b8' }}>
                    {student.name.charAt(0)}
                  </div>
                )}
              </div>
            </div>

            {/* Middle Column: Identity Data */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px', marginTop: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 15px 1fr', gap: '10px', fontSize: '16px', color: textColor, fontWeight: 700 }}>
                <div>NAMA</div><div>:</div><div style={{ fontWeight: 500, textTransform: 'uppercase' }}>{student.name}</div>
                <div>NIS/NISN</div><div>:</div><div style={{ fontWeight: 500 }}>{student.nisn}</div>
                <div>T.T.L</div><div>:</div><div style={{ fontWeight: 500, textTransform: 'uppercase' }}>{student.birthPlace}, {formatDate(student.birthDate)}</div>
                <div>ALAMAT</div><div>:</div><div style={{ fontWeight: 500, textTransform: 'uppercase', lineHeight: 1.3, fontSize: '14px' }}>{student.address || '-'}</div>
              </div>
            </div>

            {/* Right Column: Large QR Code for Presensi */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginLeft: '15px', marginTop: '8px', flexShrink: 0 }}>
              <LocalQRCode data={student.nisn} size={180} style={{ width: '180px', height: '180px', borderRadius: '8px' }} />
              <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px', color: textColor, marginTop: '4px', textAlign: 'center' }}>SCAN PRESENSI</div>
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

    // QR payload: NIS only for fast attendance scanning
    const qrPayload = student.nisn;

    const bgUrl = settings.customTemplateBackUrl;

    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: bgUrl ? 'transparent' : '#ffffff' }}>
        {bgUrl && <img src={bgUrl} alt="Background" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />}
        
        <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* HEADER (Identical to Front) */}
          <div style={{ width: '100%', height: '130px', backgroundColor: bgUrl ? 'transparent' : headerColor, display: 'flex', alignItems: 'center', padding: '0 65px', justifyContent: 'space-between' }}>
            <img src={kemenagLogoUrl} alt="Kemenag" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
            <div style={{ flex: 1, textAlign: 'center', color: '#ffffff', textShadow: bgUrl ? '0 1px 3px rgba(0,0,0,0.6)' : 'none' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '1px' }}>KEMENTERIAN AGAMA REPUBLIK INDONESIA</div>
              <div style={{ fontSize: '26px', fontWeight: 800, margin: '4px 0', letterSpacing: '0.5px' }}>{settings.schoolName || 'MADRASAH ALIYAH NEGERI'}</div>
              <div style={{ fontSize: '13px', fontWeight: 400, opacity: 0.9 }}>{settings.schoolAddress || 'Alamat Sekolah Belum Diatur'}</div>
            </div>
            {settings.schoolLogoUrl ? (
              <img src={settings.schoolLogoUrl} alt="Logo Sekolah" style={{ width: '85px', height: '85px', objectFit: 'contain' }} />
            ) : <div style={{ width: '85px' }} />}
          </div>

          {/* BODY - Terms + Pengesahan Right */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 30px 10px 30px' }}>
            {/* Title */}
            <h3 style={{ fontSize: '30px', fontWeight: 800, fontStyle: 'italic', letterSpacing: '1px', textAlign: 'center', marginBottom: '15px', margin: '0 0 15px 0', color: textColor }}>
              SYARAT & KETENTUAN:
            </h3>
            {/* Terms List */}
            <ul style={{ fontSize: '17px', lineHeight: 1.5, color: textColor, margin: '0 0 12px 0', paddingLeft: '20px', fontWeight: 500 }}>
               {termsLines.map((line, i) => (
                 <li key={i} style={{ marginBottom: '4px' }}>{line}</li>
               ))}
            </ul>

            {/* Bottom Section: Pengesahan Right */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', flex: 1, marginTop: 'auto' }}>

              {/* Pengesahan - Kepala Madrasah - Right Side */}
              <div style={{ textAlign: 'center', width: '240px', position: 'relative', zIndex: 5, flexShrink: 0 }}>
                {settings.schoolStampUrl && (
                  <img src={settings.schoolStampUrl} alt="Stempel Sekolah" style={{ position: 'absolute', top: '-5px', left: '10px', width: '90px', height: '90px', objectFit: 'contain', opacity: 0.85, zIndex: 0 }} />
                )}
                <div style={{ fontSize: '11px', fontWeight: 800, marginBottom: '1px', position: 'relative', zIndex: 1, color: textColor }}>KEPALA MADRASAH</div>
                <div style={{ height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
                   {settings.headmasterSignatureUrl ? (
                     <img src={settings.headmasterSignatureUrl} alt="Tanda Tangan" style={{ maxHeight: '50px', maxWidth: '100%', objectFit: 'contain', transform: 'scale(1.1)' }} />
                   ) : (
                     <svg width="100" height="35" viewBox="0 0 200 60" fill="none">
                       <path d="M20 50 C40 30, 60 10, 80 40 S 120 70, 160 30" stroke={textColor} strokeWidth="3" fill="none" strokeLinecap="round" />
                     </svg>
                   )}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: textColor, textDecoration: 'underline' }}>
                   {settings.headmasterName || 'NAMA KEPALA SEKOLAH'}
                </div>
                <div style={{ fontSize: '10px', fontWeight: 500, color: textColor }}>
                   NIP. {settings.headmasterNip || '-'}
                </div>
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
    const headerColor = template?.primaryColor || '#3b1c9e';
    const textColor = '#111827';

    const bgUrl = settings.customTemplateFrontUrl;

    // SVG Icons for info rows (matching reference image style)
    const IconNIS = () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={headerColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="18" rx="2" /><line x1="2" y1="8" x2="22" y2="8" /><line x1="7" y1="3" x2="7" y2="8" />
      </svg>
    );
    const IconCalendar = () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={headerColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
    const IconLocation = () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={headerColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
      </svg>
    );

    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: bgUrl ? 'transparent' : '#fcfcfc' }}>
        {bgUrl && <img src={bgUrl} alt="Background" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />}
        
        <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* 1. LOGO SEKOLAH - paling atas, centered */}
          <div style={{ marginTop: '28px', marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
            {settings.schoolLogoUrl ? (
              <img src={settings.schoolLogoUrl} alt="Logo Sekolah" style={{ width: '72px', height: '72px', objectFit: 'contain' }} />
            ) : (
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: bgUrl ? 'rgba(255,255,255,0.3)' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#94a3b8' }}>Logo</div>
            )}
          </div>

          {/* 2. NAMA SEKOLAH & ALAMAT */}
          <div style={{ textAlign: 'center', marginBottom: '18px', padding: '0 25px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: bgUrl ? '#ffffff' : textColor, textTransform: 'uppercase', letterSpacing: '0.5px', textShadow: bgUrl ? '0 1px 3px rgba(0,0,0,0.5)' : 'none', lineHeight: 1.3 }}>
              KEMENTERIAN AGAMA RI
            </div>
            <div style={{ fontSize: '17px', fontWeight: 900, color: bgUrl ? '#ffffff' : textColor, textTransform: 'uppercase', letterSpacing: '0.3px', textShadow: bgUrl ? '0 1px 4px rgba(0,0,0,0.5)' : 'none', margin: '3px 0', lineHeight: 1.2 }}>
              {settings.schoolName || 'MAN 2 LOMBOK TIMUR'}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 400, color: bgUrl ? 'rgba(255,255,255,0.9)' : '#6b7280', textShadow: bgUrl ? '0 1px 2px rgba(0,0,0,0.4)' : 'none', lineHeight: 1.3 }}>
              {settings.schoolAddress || 'Alamat Sekolah'}
            </div>
          </div>

          {/* 3. PHOTO SISWA - large, centered */}
          <div style={{
            width: '160px', height: '210px',
            backgroundColor: bgUrl ? 'rgba(226,232,240,0.5)' : '#e2e8f0',
            borderRadius: '8px',
            border: bgUrl ? '3px solid rgba(255,255,255,0.6)' : `3px solid ${headerColor}`,
            overflow: 'hidden',
            boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
            marginBottom: '18px',
            flexShrink: 0,
          }}>
            {student.photoUrl ? (
              <img src={student.photoUrl} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '48px', color: '#94a3b8', fontWeight: 700 }}>
                {student.name.charAt(0)}
              </div>
            )}
          </div>

          {/* 4. NAMA SISWA - huruf kapital, bold */}
          <div style={{
            fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', textAlign: 'center',
            color: bgUrl ? '#ffffff' : textColor,
            textShadow: bgUrl ? '0 1px 3px rgba(0,0,0,0.5)' : 'none',
            marginBottom: '14px', padding: '0 20px', lineHeight: 1.2,
            letterSpacing: '0.3px',
          }}>
            {student.name}
          </div>

          {/* 5-7. INFO ROWS with icons */}
          <div style={{ width: '85%', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            {/* NIS/NISN */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
              <IconNIS />
              <span style={{ fontSize: '14px', fontWeight: 600, color: bgUrl ? '#ffffff' : textColor, textShadow: bgUrl ? '0 1px 2px rgba(0,0,0,0.4)' : 'none' }}>
                NISN {student.nisn}
              </span>
            </div>
            {/* Tempat & Tanggal Lahir */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
              <IconCalendar />
              <span style={{ fontSize: '14px', fontWeight: 600, color: bgUrl ? '#ffffff' : textColor, textShadow: bgUrl ? '0 1px 2px rgba(0,0,0,0.4)' : 'none' }}>
                {student.birthPlace || '-'}, {formatDate(student.birthDate)}
              </span>
            </div>
            {/* Alamat */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', justifyContent: 'center' }}>
              <div style={{ flexShrink: 0, marginTop: '2px' }}><IconLocation /></div>
              <span style={{ fontSize: '13px', fontWeight: 500, color: bgUrl ? '#ffffff' : textColor, textShadow: bgUrl ? '0 1px 2px rgba(0,0,0,0.4)' : 'none', textAlign: 'center', lineHeight: 1.3 }}>
                {student.address || '-'}
              </span>
            </div>
          </div>

          {/* 8. QR CODE - centered at bottom */}
          <div style={{ marginTop: 'auto', marginBottom: '25px', display: 'flex', justifyContent: 'center' }}>
            <LocalQRCode data={student.nisn} size={75} style={{ borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
          </div>
        </div>

        {/* FOOTER DECORATIONS (only when no custom template) */}
        {!bgUrl && (
          <>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '25px', backgroundColor: headerColor, zIndex: 1 }}></div>
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

    // QR payload: NIS only for fast attendance scanning
    const qrPayload = student.nisn;

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

             <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '0 50px', width: '100%', marginTop: '10px' }}>
                <img src={kemenagLogoUrl} alt="Kemenag" style={{ width: '65px', height: '65px', objectFit: 'contain' }} />
                <div style={{ flex: 1, textAlign: 'center', color: '#ffffff', textShadow: bgUrl ? '0 1px 3px rgba(0,0,0,0.6)' : 'none' }}>
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
