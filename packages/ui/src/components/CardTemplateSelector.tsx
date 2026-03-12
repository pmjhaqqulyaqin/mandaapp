import React from 'react';
import {
  PrintableStudentCard,
  CARD_TEMPLATES,
  type PrintableCardTemplate,
  type CardOrientation,
  type CardTemplateName,
} from './PrintableStudentCard';

export interface CardTemplateSelectorProps {
  selectedTemplate: CardTemplateName;
  orientation: CardOrientation;
  onTemplateChange: (template: CardTemplateName) => void;
  onOrientationChange: (orientation: CardOrientation) => void;
}

const previewStudent = {
  name: 'Contoh Siswa',
  nisn: '0012345678',
  className: 'X-A',
  birthPlace: 'Kota',
  birthDate: '2010-01-01',
  gender: 'Laki-laki',
};

const previewSettings = {
  schoolName: 'SMA NEGERI 1',
  schoolSubtitle: 'Kab. Contoh',
  academicYear: '2025/2026',
  showQrCode: true,
};

export const CardTemplateSelector = ({
  selectedTemplate,
  orientation,
  onTemplateChange,
  onOrientationChange,
}: CardTemplateSelectorProps) => {
  const templates = Object.values(CARD_TEMPLATES);

  return (
    <div className="space-y-6">
      {/* Orientation Toggle */}
      <div>
        <label className="block text-xs font-semibold text-text-secondary mb-2">Orientasi Kartu</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onOrientationChange('horizontal')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
              orientation === 'horizontal'
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-white dark:bg-[#111] text-text-secondary border-border-light dark:border-border-dark hover:border-primary/50'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="14" x="2" y="5" rx="2"/>
            </svg>
            Horizontal
          </button>
          <button
            type="button"
            onClick={() => onOrientationChange('vertical')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
              orientation === 'vertical'
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-white dark:bg-[#111] text-text-secondary border-border-light dark:border-border-dark hover:border-primary/50'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="14" height="20" x="5" y="2" rx="2"/>
            </svg>
            Vertikal
          </button>
        </div>
      </div>

      {/* Template Grid */}
      <div>
        <label className="block text-xs font-semibold text-text-secondary mb-3">Pilih Template</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {templates.map((tmpl) => (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => onTemplateChange(tmpl.id)}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left
                ${selectedTemplate === tmpl.id
                  ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                  : 'border-border-light dark:border-border-dark hover:border-primary/30 bg-white dark:bg-[#0a0a0a]'
                }`}
            >
              {selectedTemplate === tmpl.id && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              )}

              {/* Color Preview Bar */}
              <div className="h-2.5 rounded-full mb-3 overflow-hidden" style={{ background: tmpl.headerGradient }} />

              {/* Mini Card Preview */}
              <div className="flex justify-center mb-3" style={{ transform: 'scale(0.75)', transformOrigin: 'center' }}>
                <PrintableStudentCard
                  student={previewStudent}
                  template={tmpl}
                  settings={previewSettings}
                  orientation={orientation}
                  scale={0.65}
                />
              </div>

              <h4 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">{tmpl.name}</h4>
              <p className="text-[11px] text-text-secondary mt-0.5">
                {tmpl.id === 'classic-blue' && 'Formal, cocok sekolah negeri'}
                {tmpl.id === 'modern-green' && 'Modern, fresh & clean'}
                {tmpl.id === 'elegant-gold' && 'Elegan, nuansa hangat'}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
