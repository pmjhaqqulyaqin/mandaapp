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
    const headerColor = template?.primaryColor || '#2b783f';
    const darkAccent = template?.accentColor || '#1a4e28';
    const textColor = '#0f172a';
    
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        {/* Background decorative wave (Optional) */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, overflow: 'hidden', zIndex: 0, opacity: 0.05 }}>
           <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
              <path d="M0,50 Q25,30 50,50 T100,50 L100,100 L0,100 Z" fill={headerColor} />
              <path d="M0,70 Q25,50 50,70 T100,70 L100,100 L0,100 Z" fill={darkAccent} />
           </svg>
        </div>

        {/* Content Container */}
        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
          
          {/* HEADER ROW */}
          <div style={{ display: 'flex', position: 'relative', height: '130px' }}>
            {/* Logo Badge (Top Left overhang) */}
            <div style={{ 
              width: '120px', 
              height: '140px', 
              background: darkAccent, 
              marginLeft: '30px',
              borderBottomLeftRadius: '60px',
              borderBottomRightRadius: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
              position: 'relative'
            }}>
               {settings.schoolLogoUrl ? (
                 <img src={settings.schoolLogoUrl} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', backgroundColor: 'white', borderRadius: '50%', border: '4px solid #facc15' }} />
               ) : (
                 <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#facc15', border: '4px solid white' }}></div>
               )}
            </div>

            {/* Main Header Text Background */}
            <div style={{ 
              flex: 1, 
              background: headerColor, 
              borderBottomLeftRadius: '30px', 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center',
              paddingLeft: '30px',
              paddingRight: '20px',
            }}>
               <h1 style={{ color: '#facc15', fontSize: '26px', fontWeight: 800, margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>
                 {settings.schoolName}
               </h1>
               <div style={{ color: '#ffffff', fontSize: '13px', marginTop: '4px', opacity: 0.9, fontWeight: 500, lineHeight: 1.4 }}>
                 {settings.schoolAddress || '123 Anywhere St., Any City'}
                 <br />
                 {settings.schoolPhone || settings.schoolSubtitle}
               </div>
            </div>
          </div>

          {/* MAIN BODY */}
          <div style={{ flex: 1, display: 'flex', padding: '20px 30px', gap: '24px' }}>
            
            {/* Left Column (Photo & Barcode) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '120px' }}>
               <div style={{ 
                 width: '120px', 
                 height: '140px', 
                 backgroundColor: '#e2e8f0', 
                 border: '2px solid white', 
                 boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                 overflow: 'hidden',
                 borderRadius: '8px'
               }}>
                  {student.photoUrl ? (
                    <img src={student.photoUrl} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '48px', color: '#94a3b8' }}>
                      {student.name.charAt(0)}
                    </div>
                  )}
               </div>

               <div style={{
                 border: `2px solid ${textColor}`,
                 borderRadius: '4px',
                 height: '60px',
                 width: '60px',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 fontWeight: 800,
                 letterSpacing: '1px',
                 color: textColor,
                 fontSize: '10px',
                 backgroundColor: 'white',
                 overflow: 'hidden',
                 alignSelf: isHorizontal ? 'center' : 'flex-start'
               }}>
                 {qrUrl ? (
                   <img src={qrUrl} alt="QR Code" style={{ height: '90%', width: '90%', objectFit: 'contain' }} />
                 ) : (
                   'QR CODE'
                 )}
               </div>
            </div>

            {/* Right Column (Data & Signature) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
               <h2 style={{ fontSize: '28px', color: textColor, fontWeight: 800, margin: '0 0 12px 0' }}>
                 {student.name}
               </h2>

               <div style={{ display: 'grid', gridTemplateColumns: '120px 10px 1fr', gap: '4px', fontSize: '14px', color: textColor, fontWeight: 600, flex: 1, paddingBottom: '10px' }}>
                 <div>NIS/NISN</div><div>:</div><div>{student.nisn}</div>
                 <div>Jenis Kelamin</div><div>:</div><div>{student.gender}</div>
                 <div>T.T.L</div><div>:</div><div>{student.birthPlace}, {formatDate(student.birthDate)}</div>
                 <div>Alamat</div><div>:</div><div style={{ lineHeight: 1.3 }}>{student.address || '-'}</div>
               </div>

               {/* Signature Area */}
               <div style={{ alignSelf: 'flex-end', textAlign: 'center', marginTop: '-35px', marginRight: '10px', position: 'relative', zIndex: 10 }}>
                 <div style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>
                   Any City, {formatDate(new Date().toISOString())}<br/>
                   Kepala Sekolah
                 </div>
                 {/* Signature Vector or Image */}
                 <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', margin: '2px 0 0 0', opacity: settings.headmasterSignatureUrl ? 1 : 0.8 }}>
                    {settings.headmasterSignatureUrl ? (
                      <img src={settings.headmasterSignatureUrl} alt="Tanda Tangan" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                    ) : (
                      <svg width="120" height="40" viewBox="0 0 200 60" fill="none">
                        <path d="M20 50 C40 30, 60 10, 80 40 S 120 70, 160 30" stroke={textColor} strokeWidth="3" fill="none" strokeLinecap="round" />
                        <path d="M40 40 L180 20" stroke={textColor} strokeWidth="2" fill="none" opacity="0.5" />
                      </svg>
                    )}
                 </div>
                 <div style={{ fontSize: '14px', color: textColor, fontWeight: 700, textTransform: 'uppercase' }}>
                   {settings.headmasterName || '-'}
                 </div>
                 {settings.headmasterNip && (
                   <div style={{ fontSize: '12px', color: textColor, fontWeight: 600 }}>
                     NIP. {settings.headmasterNip}
                   </div>
                 )}
               </div>
            </div>
          </div>

          {/* Bottom decorative shape */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '250px', height: '30px', background: template?.secondaryColor || '#88be4f', borderTopRightRadius: '30px' }}></div>
        </div>
      </div>
    );
  };

  const VerticalBack = () => {
    const textColor = '#0f172a';
    
    // Layout for the back of the card
    const termsTextRaw = settings.termsText || "1. Kartu ini adalah identitas resmi siswa.\n2. Kartu ini tidak boleh dipindahtangankan.\n3. Apabila menemukan kartu ini, harap mengembalikan ke sekolah.\n4. Berlaku selama menjadi siswa aktif.";
    const termsLines = termsTextRaw.split('\n');

    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
         {/* Subtle watermark logo */}
         <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.05, zIndex: 0 }}>
             {settings.schoolLogoUrl && (
               <img src={settings.schoolLogoUrl} alt="" style={{ width: '300px', height: '300px', objectFit: 'contain' }} />
             )}
         </div>

         <div style={{ width: '100%', backgroundColor: template.primaryColor || '#2b783f', color: '#facc15', padding: '16px 0', textAlign: 'center', fontWeight: 800, fontSize: '20px', letterSpacing: '2px', zIndex: 1 }}>
           KETENTUAN PENGGUNAAN KARTU
         </div>

         <div style={{ flex: 1, padding: '30px 40px', zIndex: 1, fontSize: '14px', lineHeight: 1.8, color: '#1e293b', fontWeight: 500 }}>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {termsLines.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
           </div>
         </div>

         <div style={{ padding: '20px 40px', backgroundColor: '#f1f5f9', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
           <div style={{ fontSize: '12px', color: '#64748b' }}>
             Masa Berlaku: {settings.academicYear}
           </div>
           <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
             {settings.schoolName}
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
