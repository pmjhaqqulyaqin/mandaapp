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
  photoUrl?: string;
}

export interface PrintableCardSettings {
  schoolName: string;
  schoolSubtitle: string;
  schoolLogoUrl?: string;
  academicYear: string;
  showQrCode: boolean;
}

export interface PrintableStudentCardProps {
  student: PrintableCardStudent;
  template: PrintableCardTemplate;
  settings: PrintableCardSettings;
  orientation: CardOrientation;
  scale?: number;
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
    name: 'Modern Green',
    primaryColor: '#166534',
    secondaryColor: '#22c55e',
    accentColor: '#dcfce7',
    headerGradient: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)',
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
}: PrintableStudentCardProps) => {
  const qrUrl = settings.showQrCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=mandalotim:student:${student.nisn}`
    : null;

  // KTP dimensions in mm: 85.6 x 54mm
  // At 96 DPI: 1mm ≈ 3.78px
  // Horizontal: 323px × 204px; Vertical: 204px × 323px
  const isHorizontal = orientation === 'horizontal';
  const cardWidth = isHorizontal ? 323 : 204;
  const cardHeight = isHorizontal ? 204 : 323;

  const containerStyle: React.CSSProperties = {
    width: `${cardWidth}px`,
    height: `${cardHeight}px`,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    overflow: 'hidden',
    borderRadius: '8px',
    border: `1.5px solid ${template.primaryColor}40`,
    position: 'relative',
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  };

  if (isHorizontal) {
    return (
      <div style={containerStyle} className="printable-card" id={`card-${student.nisn}`}>
        {/* Header */}
        <div
          style={{
            background: template.headerGradient,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {settings.schoolLogoUrl && (
            <img
              src={settings.schoolLogoUrl}
              alt="Logo"
              style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'contain', backgroundColor: 'white', padding: '2px' }}
            />
          )}
          <div>
            <div style={{ color: '#ffffff', fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px', lineHeight: 1.2 }}>
              KARTU PELAJAR
            </div>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '7px', fontWeight: 500, lineHeight: 1.3 }}>
              {settings.schoolName}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', padding: '10px 12px', gap: '10px', flex: 1 }}>
          {/* Photo */}
          <div
            style={{
              width: '68px',
              height: '90px',
              borderRadius: '6px',
              overflow: 'hidden',
              border: `1.5px solid ${template.primaryColor}30`,
              flexShrink: 0,
              backgroundColor: template.accentColor,
            }}
          >
            {student.photoUrl ? (
              <img src={student.photoUrl} alt={student.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', fontWeight: 700, color: template.primaryColor,
              }}>
                {student.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Data */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#1a1a1a', marginBottom: '4px', lineHeight: 1.2 }}>
              {student.name}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <DataRow label="NISN" value={student.nisn} color={template.primaryColor} />
              <DataRow label="Kelas" value={student.className} color={template.primaryColor} />
              <DataRow label="TTL" value={`${student.birthPlace}, ${formatDate(student.birthDate)}`} color={template.primaryColor} />
              <DataRow label="JK" value={student.gender} color={template.primaryColor} />
            </div>
          </div>

          {/* QR Code */}
          {qrUrl && (
            <div style={{
              width: '62px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <div style={{
                width: '56px', height: '56px', backgroundColor: '#ffffff', borderRadius: '4px',
                border: `1px solid ${template.primaryColor}20`, padding: '3px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img src={qrUrl} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ fontSize: '5px', color: '#999', marginTop: '2px', textAlign: 'center' }}>Scan untuk verifikasi</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            background: template.accentColor,
            borderTop: `1px solid ${template.primaryColor}20`,
            padding: '4px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          }}
        >
          <div style={{ fontSize: '6px', color: template.primaryColor, fontWeight: 500 }}>
            Masa Berlaku: {settings.academicYear}
          </div>
          <div style={{ fontSize: '5px', color: '#999' }}>
            {settings.schoolSubtitle}
          </div>
        </div>
      </div>
    );
  }

  // VERTICAL layout
  return (
    <div style={containerStyle} className="printable-card" id={`card-${student.nisn}`}>
      {/* Header */}
      <div
        style={{
          background: template.headerGradient,
          padding: '10px 12px',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          {settings.schoolLogoUrl && (
            <img
              src={settings.schoolLogoUrl}
              alt="Logo"
              style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'contain', backgroundColor: 'white', padding: '2px' }}
            />
          )}
          <div>
            <div style={{ color: '#ffffff', fontSize: '8px', fontWeight: 700, letterSpacing: '0.5px' }}>
              KARTU PELAJAR
            </div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '6.5px', fontWeight: 500 }}>
              {settings.schoolName}
            </div>
          </div>
        </div>
      </div>

      {/* Photo */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
        <div
          style={{
            width: '72px',
            height: '96px',
            borderRadius: '6px',
            overflow: 'hidden',
            border: `2px solid ${template.primaryColor}30`,
            backgroundColor: template.accentColor,
          }}
        >
          {student.photoUrl ? (
            <img src={student.photoUrl} alt={student.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', fontWeight: 700, color: template.primaryColor,
            }}>
              {student.name.charAt(0)}
            </div>
          )}
        </div>
      </div>

      {/* Data */}
      <div style={{ padding: '0 14px', textAlign: 'center' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#1a1a1a', marginBottom: '5px', lineHeight: 1.2 }}>
          {student.name}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
          <DataRow label="NISN" value={student.nisn} color={template.primaryColor} />
          <DataRow label="Kelas" value={student.className} color={template.primaryColor} />
          <DataRow label="TTL" value={`${student.birthPlace}, ${formatDate(student.birthDate)}`} color={template.primaryColor} />
          <DataRow label="JK" value={student.gender} color={template.primaryColor} />
        </div>
      </div>

      {/* QR Code */}
      {qrUrl && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
          <div style={{
            width: '48px', height: '48px', backgroundColor: '#ffffff', borderRadius: '4px',
            border: `1px solid ${template.primaryColor}20`, padding: '3px',
          }}>
            <img src={qrUrl} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          background: template.accentColor,
          borderTop: `1px solid ${template.primaryColor}20`,
          padding: '5px 12px',
          textAlign: 'center',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        }}
      >
        <div style={{ fontSize: '6px', color: template.primaryColor, fontWeight: 500 }}>
          Masa Berlaku: {settings.academicYear}
        </div>
        <div style={{ fontSize: '5px', color: '#999', marginTop: '1px' }}>
          {settings.schoolSubtitle}
        </div>
      </div>
    </div>
  );
};


/* Helper: single row of data on the card */
const DataRow = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div style={{ display: 'flex', gap: '4px', lineHeight: 1.3 }}>
    <span style={{ fontSize: '6.5px', fontWeight: 600, color, minWidth: '28px', flexShrink: 0 }}>{label}</span>
    <span style={{ fontSize: '6.5px', color: '#444' }}>: {value}</span>
  </div>
);
