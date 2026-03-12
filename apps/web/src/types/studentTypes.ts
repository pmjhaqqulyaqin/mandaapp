export interface StudentProfile {
  id: string;
  name: string;
  nisn: string;
  className: string;
  birthPlace: string;
  birthDate: string;
  gender: 'Laki-laki' | 'Perempuan';
  address: string;
  photoUrl?: string;
  status: 'active' | 'inactive';
}

export type CardOrientation = 'horizontal' | 'vertical';

export type CardTemplateName = 'classic-blue' | 'modern-green' | 'elegant-gold';

export interface CardTemplate {
  id: CardTemplateName;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headerGradient: string;
  orientation: CardOrientation;
}

export interface CardSettings {
  schoolName: string;
  schoolSubtitle: string;
  schoolLogoUrl?: string;
  academicYear: string;
  selectedTemplate: CardTemplateName;
  orientation: CardOrientation;
  showQrCode: boolean;
  qrCodeContent: 'nisn' | 'url' | 'custom';
  qrCodeCustomData?: string;
}

export interface IdentityRevisionRequest {
  id: string;
  studentId: string;
  studentName: string;
  field: keyof StudentProfile;
  oldValue: string;
  newValue: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
}
