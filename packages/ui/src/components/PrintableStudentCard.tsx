import React from 'react';

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
  academicYear: string;
  showQrCode: boolean;
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
  const qrUrl = settings.showQrCode !== false
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`
    : null;

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
    const kemenagLogoUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Lambang_Kementerian_Agama.svg/300px-Lambang_Kementerian_Agama.svg.png";
    const headerColor = template?.primaryColor || '#14425A';
    const textColor = '#111827';
    
    // Encode essential ID info into the 1D Barcode. Max ~30 chars for highly reliable scanning.
    const barcodeText = `${student.nisn}`;
    const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(barcodeText)}&scale=3&height=12&includetext=false`;

    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#ffffff' }}>
        {/* HEADER */}
        <div style={{ width: '100%', height: '130px', backgroundColor: headerColor, display: 'flex', alignItems: 'center', padding: '0 30px', justifyContent: 'space-between', zIndex: 10, position: 'relative' }}>
          <img src={kemenagLogoUrl} alt="Kemenag" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
          <div style={{ flex: 1, textAlign: 'center', color: '#ffffff' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '1px' }}>KEMENTERIAN AGAMA REPUBLIK INDONESIA</div>
            <div style={{ fontSize: '26px', fontWeight: 800, margin: '4px 0', letterSpacing: '0.5px' }}>{settings.schoolName || 'MADRASAH ALIYAH NEGERI'}</div>
            <div style={{ fontSize: '13px', fontWeight: 400, opacity: 0.9 }}>{settings.schoolAddress || 'Alamat Sekolah Belum Diatur'}</div>
          </div>
          {settings.schoolLogoUrl ? (
            <img src={settings.schoolLogoUrl} alt="Logo Sekolah" style={{ width: '85px', height: '85px', objectFit: 'contain' }} />
          ) : <div style={{ width: '85px' }} />}
        </div>

        {/* BODY */}
        <div style={{ display: 'flex', padding: '25px 40px', gap: '40px', zIndex: 10, position: 'relative' }}>
          {/* Foto */}
          <div style={{ width: '160px', height: '220px', backgroundColor: '#e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
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
            <div style={{ marginTop: '35px', marginBottom: '5px', height: '50px', width: '100%' }}>
              <img src={barcodeUrl} alt="Barcode" style={{ height: '100%', width: '250px', objectFit: 'fill' }} />
            </div>
          </div>
        </div>

        {/* BOTTOM DECORATIONS */}
        <div style={{ position: 'absolute', bottom: 0, left: '-20px', width: '220px', height: '120px', backgroundColor: '#facc15', borderTopRightRadius: '150px', zIndex: 1 }}></div>
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '85%', height: '50px', backgroundColor: headerColor, borderTopLeftRadius: '30px', zIndex: 1 }}></div>
        <div style={{ position: 'absolute', bottom: '15px', right: '-20px', width: '150px', height: '50px', backgroundColor: '#facc15', borderRadius: '40px', zIndex: 2 }}></div>
      </div>
    );
  };

  const HorizontalBack = () => {
    const kemenagLogoUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Lambang_Kementerian_Agama.svg/300px-Lambang_Kementerian_Agama.svg.png";
    const headerColor = template?.primaryColor || '#14425A';
    const textColor = '#111827';

    const termsTextRaw = settings.termsText || "Kartu pelajar ini hanya dikeluarkan kepada siswa yang terdaftar di sekolah.\nKartu pelajar bersifat pribadi dan tidak boleh digunakan oleh orang lain.\nPemegang kartu bertanggung jawab untuk menjaga kebersihan dan keutuhan kartu.\nKartu Pelajar ini berlaku selama masa studi aktif di sekolah yang terdaftar.";
    const termsLines = termsTextRaw.split('\n');

    // Advanced payload for QR Code tracking student legitimacy
    const qrPayload = `Sekolah: ${settings.schoolName}\nNPSN: ${settings.schoolSubtitle || '-'}\nDiterbitkan: ${formatDate(new Date().toISOString())}\nBerlaku: ${settings.academicYear}\nSiswa: ${student.name} (${student.nisn})\nLink: https://mandalotim.sch.id/student/${student.nisn}`;
    const advancedQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(qrPayload)}`;

    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#ffffff' }}>
        {/* HEADER (Identical to Front) */}
        <div style={{ width: '100%', height: '130px', backgroundColor: headerColor, display: 'flex', alignItems: 'center', padding: '0 30px', justifyContent: 'space-between', zIndex: 10, position: 'relative' }}>
          <img src={kemenagLogoUrl} alt="Kemenag" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
          <div style={{ flex: 1, textAlign: 'center', color: '#ffffff' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '1px' }}>KEMENTERIAN AGAMA REPUBLIK INDONESIA</div>
            <div style={{ fontSize: '26px', fontWeight: 800, margin: '4px 0', letterSpacing: '0.5px' }}>{settings.schoolName || 'MADRASAH ALIYAH NEGERI'}</div>
            <div style={{ fontSize: '13px', fontWeight: 400, opacity: 0.9 }}>{settings.schoolAddress || 'Alamat Sekolah Belum Diatur'}</div>
          </div>
          {settings.schoolLogoUrl ? (
            <img src={settings.schoolLogoUrl} alt="Logo Sekolah" style={{ width: '85px', height: '85px', objectFit: 'contain' }} />
          ) : <div style={{ width: '85px' }} />}
        </div>

        {/* BODY (Terms and Conditions) */}
        <div style={{ padding: '20px 60px', zIndex: 10, position: 'relative' }}>
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
              <img src={advancedQrUrl} alt="QR Code Belakang" style={{ width: '105px', height: '105px', border: '4px solid #ffffff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: '#111827', backgroundColor: 'rgba(255,255,255,0.7)', padding: '2px 6px', borderRadius: '4px' }}>MASA BERLAKU</div>
           </div>

           {/* Signature Section */}
           <div style={{ textAlign: 'center', width: '250px' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '5px' }}>KEPALA MADRASAH</div>
              <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 {settings.headmasterSignatureUrl ? (
                   <img src={settings.headmasterSignatureUrl} alt="Tanda Tangan" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                 ) : (
                   <svg width="150" height="50" viewBox="0 0 200 60" fill="none">
                     <path d="M20 50 C40 30, 60 10, 80 40 S 120 70, 160 30" stroke={textColor} strokeWidth="3" fill="none" strokeLinecap="round" />
                   </svg>
                 )}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 600, textTransform: 'uppercase' }}>
                 {settings.headmasterName || 'NAMA KEPALA SEKOLAH'}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 500 }}>
                 NIP. {settings.headmasterNip || '-'}
              </div>
           </div>
        </div>

        {/* BOTTOM DECORATIONS */}
        <div style={{ position: 'absolute', bottom: 0, left: '-20px', width: '220px', height: '120px', backgroundColor: '#facc15', borderTopRightRadius: '150px', zIndex: 1 }}></div>
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '85%', height: '50px', backgroundColor: headerColor, borderTopLeftRadius: '30px', zIndex: 1 }}></div>
        <div style={{ position: 'absolute', bottom: '15px', right: '-20px', width: '150px', height: '50px', backgroundColor: '#facc15', borderRadius: '40px', zIndex: 2 }}></div>
      </div>
    );
  };

  const VerticalFront = () => {
    const kemenagLogoUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Lambang_Kementerian_Agama.svg/300px-Lambang_Kementerian_Agama.svg.png";
    const headerColor = template?.primaryColor || '#4F14A0';
    const textColor = '#0a0a0a';
    
    // Barcode specifically configured for highly rigorous scanning.
    const barcodeText = `${student.nisn}`;
    const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(barcodeText)}&scale=3&height=12&includetext=false`;

    const DotMatrix = ({ rows=4, cols=4, color=headerColor }) => (
      <svg width={cols*14} height={rows*14} viewBox={`0 0 ${cols*14} ${rows*14}`}>
         <defs>
           <pattern id={`dots-${color}`} x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
             <circle cx="3" cy="3" r="3" fill={color} />
           </pattern>
         </defs>
         <rect x="0" y="0" width="100%" height="100%" fill={`url(#dots-${color})`} />
      </svg>
    );

    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#f8f9fa', display: 'flex', flexDirection: 'column' }}>
        {/* HEADER */}
        <div style={{ width: '100%', height: '180px', backgroundColor: headerColor, position: 'relative', overflow: 'hidden', borderBottom: '4px solid #facc15' }}>
           {/* Top Background Ornaments */}
           <div style={{ position: 'absolute', top: 0, left: 0, width: '60%', height: '35px', backgroundColor: '#e2e8f0', borderBottomRightRadius: '20px' }}></div>
           <div style={{ position: 'absolute', top: '15px', left: '-10px', width: '200px', height: '20px', backgroundColor: '#facc15', borderRadius: '10px' }}></div>
           <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
              <DotMatrix rows={4} cols={8} color="#facc15" />
           </div>

           {/* Core Header Content */}
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', height: '100%', marginTop: '10px' }}>
             <img src={kemenagLogoUrl} alt="Klogo" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
             <div style={{ flex: 1, textAlign: 'center', color: '#ffffff', padding: '0 15px' }}>
               <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '4px' }}>KEMENTERIAN AGAMA REPUBLIK INDONESIA</div>
               <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>{settings.schoolName || 'MAN 2 LOMBOK TIMUR'}</div>
               <div style={{ fontSize: '11px', fontWeight: 400, opacity: 0.9, lineHeight: 1.4 }}>{settings.schoolAddress || 'Alamat Sekolah Belum Diatur'}</div>
             </div>
             {settings.schoolLogoUrl ? (
               <img src={settings.schoolLogoUrl} alt="SLogo" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
             ) : <div style={{ width: '70px' }} />}
           </div>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '30px 40px', position: 'relative' }}>
          
          <div style={{ position: 'absolute', top: '30px', left: '20px' }}>
             <DotMatrix rows={5} cols={3} color={headerColor} />
          </div>

          <div style={{ textAlign: 'center', marginBottom: '25px', zIndex: 10 }}>
             <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: '#0a0a0a', letterSpacing: '1px', lineHeight: 1.2 }}>
               KARTU IDENTITAS<br/>PELAJAR
             </h2>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
             <div style={{ width: '180px', height: '230px', border: `3px solid ${headerColor}`, padding: '0px', backgroundColor: '#ffffff', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
               {student.photoUrl ? (
                 <img src={student.photoUrl} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
               ) : (
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '48px', color: '#94a3b8', backgroundColor: '#e2e8f0' }}>
                   {student.name.charAt(0)}
                 </div>
               )}
             </div>
          </div>

          {/* Info Grid */}
          <div style={{ alignSelf: 'center', width: '90%', display: 'grid', gridTemplateColumns: '120px 15px 1fr', gap: '12px', fontSize: '16px', color: textColor, fontWeight: 700, marginBottom: '25px' }}>
              <div style={{ fontWeight: 600 }}>Nama</div><div style={{ fontWeight: 600 }}>:</div><div style={{ fontWeight: 600, textTransform: 'uppercase' }}>{student.name}</div>
              <div style={{ fontWeight: 600 }}>NIS</div><div style={{ fontWeight: 600 }}>:</div><div style={{ fontWeight: 600 }}>{student.nisn}</div>
              <div style={{ fontWeight: 600 }}>Tanggal Lahir</div><div style={{ fontWeight: 600 }}>:</div><div style={{ fontWeight: 600, textTransform: 'uppercase' }}>{formatDate(student.birthDate)}</div>
              <div style={{ fontWeight: 600 }}>Alamat</div><div style={{ fontWeight: 600 }}>:</div><div style={{ fontWeight: 600, lineHeight: 1.4, textTransform: 'uppercase' }}>{student.address || '-'}</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'auto', marginBottom: '10px' }}>
             <img src={barcodeUrl} alt="Barcode" style={{ width: '220px', height: '50px', objectFit: 'fill' }} />
          </div>

        </div>

        {/* FOOTER */}
        <div style={{ height: '70px', width: '100%', position: 'relative' }}>
           <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30px', backgroundColor: headerColor }}></div>
           
           <div style={{ position: 'absolute', bottom: '30px', left: 0, width: '150px', height: '15px', backgroundColor: headerColor, borderTopRightRadius: '15px' }}></div>
           
           <div style={{ position: 'absolute', bottom: '15px', left: '20px', zIndex: 10 }}>
              <svg width="100" height="30" viewBox="0 0 120 40">
                 <path d="M0,40 L30,0 L50,0 L20,40 Z" fill="#facc15" />
                 <path d="M30,40 L60,0 L80,0 L50,40 Z" fill="#facc15" />
                 <path d="M60,40 L90,0 L110,0 L80,40 Z" fill="#facc15" />
              </svg>
           </div>
           
           <div style={{ position: 'absolute', bottom: '40px', right: '30px' }}>
              <DotMatrix rows={4} cols={5} color={headerColor} />
           </div>
        </div>
      </div>
    );
  };

  const VerticalBack = () => {
    const kemenagLogoUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Lambang_Kementerian_Agama.svg/300px-Lambang_Kementerian_Agama.svg.png";
    const headerColor = template?.primaryColor || '#4F14A0';
    const textColor = '#111827';
    
    // Default fallback rules mirroring user snippet
    const termsTextRaw = settings.termsText || "Kartu wajib dipakai selama berada di lingkungan sekolah\nTidak boleh dipinjamkan kepada orang lain.\nJika hilang, segera lapor ke wali kelas.\nMenjaga kartu agar tidak rusak atau kotor.";
    const termsLines = termsTextRaw.split('\n');

    // Advanced QR Code payload
    const qrPayload = `Sekolah: ${settings.schoolName}\nNPSN: ${settings.schoolSubtitle || '-'}\nDiterbitkan: ${formatDate(new Date().toISOString())}\nBerlaku: ${settings.academicYear}\nSiswa: ${student.name} (${student.nisn})\nLink: https://mandalotim.sch.id/student/${student.nisn}`;
    const advancedQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(qrPayload)}`;

    const DotMatrix = ({ rows=4, cols=4, color=headerColor }) => (
      <svg width={cols*14} height={rows*14} viewBox={`0 0 ${cols*14} ${rows*14}`}>
         <defs>
           <pattern id={`dots-${color}-back`} x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
             <circle cx="3" cy="3" r="3" fill={color} />
           </pattern>
         </defs>
         <rect x="0" y="0" width="100%" height="100%" fill={`url(#dots-${color}-back)`} />
      </svg>
    );

    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#f8f9fa', display: 'flex', flexDirection: 'column' }}>
        {/* HEADER (Identical replication of Front Header) */}
        <div style={{ width: '100%', height: '180px', backgroundColor: headerColor, position: 'relative', overflow: 'hidden', borderBottom: '4px solid #facc15' }}>
           <div style={{ position: 'absolute', top: 0, left: 0, width: '60%', height: '35px', backgroundColor: '#e2e8f0', borderBottomRightRadius: '20px' }}></div>
           <div style={{ position: 'absolute', top: '15px', left: '-10px', width: '200px', height: '20px', backgroundColor: '#facc15', borderRadius: '10px' }}></div>
           <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
              <DotMatrix rows={4} cols={8} color="#facc15" />
           </div>

           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', height: '100%', marginTop: '10px' }}>
             <img src={kemenagLogoUrl} alt="Klogo" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
             <div style={{ flex: 1, textAlign: 'center', color: '#ffffff', padding: '0 15px' }}>
               <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '4px' }}>KEMENTERIAN AGAMA REPUBLIK INDONESIA</div>
               <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>{settings.schoolName || 'MAN 2 LOMBOK TIMUR'}</div>
               <div style={{ fontSize: '11px', fontWeight: 400, opacity: 0.9, lineHeight: 1.4 }}>{settings.schoolAddress || 'Alamat Sekolah Belum Diatur'}</div>
             </div>
             {settings.schoolLogoUrl ? (
               <img src={settings.schoolLogoUrl} alt="SLogo" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
             ) : <div style={{ width: '70px' }} />}
           </div>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '30px 40px', position: 'relative' }}>
          
          <div style={{ position: 'absolute', top: '30px', left: '25px' }}><DotMatrix rows={4} cols={3} color={headerColor} /></div>
          <div style={{ position: 'absolute', top: '30px', right: '25px' }}><DotMatrix rows={4} cols={3} color={headerColor} /></div>

          <div style={{ textAlign: 'center', marginBottom: '40px', zIndex: 10 }}>
             <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: '#0a0a0a', letterSpacing: '1px', lineHeight: 1.3 }}>
               SYARAT &<br/>KETENTUAN
             </h2>
          </div>

          <div style={{ padding: '0 10px', marginBottom: '30px' }}>
            <ul style={{ fontSize: '17px', lineHeight: 1.6, color: textColor, margin: 0, paddingLeft: '20px', fontWeight: 500 }}>
              {termsLines.map((line, i) => (
                <li key={i} style={{ marginBottom: '12px' }}>{line}</li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 'auto', marginBottom: '30px' }}>
             <img src={advancedQrUrl} alt="QR Code Belakang" style={{ width: '130px', height: '130px', border: '5px solid #ffffff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
             <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', color: textColor, marginTop: '8px' }}>MASA BERLAKU</div>
             
             <div style={{ fontSize: '12px', textAlign: 'center', fontWeight: 500, color: '#334155', marginTop: '30px', lineHeight: 1.5, padding: '0 10px' }}>
               KARTU INI ADALAH MILIK RESMI MADRASAH DAN HANYA<br/>DIGUNAKAN OLEH PEMEGANG YANG TERTERA
             </div>
          </div>
        </div>

        {/* FOOTER PILL */}
        <div style={{ padding: '0 20px 20px 20px' }}>
           <div style={{ backgroundColor: headerColor, borderRadius: '15px', height: '55px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', color: '#ffffff', fontSize: '13px', fontWeight: 500 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                 <span>{settings.schoolEmail || 'man2lotim@gmail.com'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                 <span>https://mandalotim.sch.id</span>
              </div>
           </div>
        </div>
      </div>
    );
  };

  // We return a fragment containing both front and back cards if printing, or just front/back components in preview
  return (
    <>
      {(side === 'both' || side === 'front') && (
        <div style={wrapperStyle}>
          <div style={containerStyle} className="printable-card-front" id={`card-front-${student.nisn}`}>
            {isHorizontal ? <HorizontalFront /> : <VerticalFront />}
          </div>
        </div>
      )}
      {(side === 'both' || side === 'back') && (
        <div style={{ ...wrapperStyle, marginTop: side === 'both' ? '24px' : '0' }}>
          <div style={backContainerStyle} className="printable-card-back" id={`card-back-${student.nisn}`}>
            {isHorizontal ? <HorizontalBack /> : <VerticalBack />}
          </div>
        </div>
      )}
    </>
  );
};
