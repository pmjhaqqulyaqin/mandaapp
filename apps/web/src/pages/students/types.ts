export interface Student {
  id: string;
  fullName: string;
  nisn: string;
  nis: string;
  classId: string;
  className: string;
  gender: string;
  birthPlace: string;
  birthDate: string;
  address: string;
  status: string;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassItem {
  id: string;
  name: string;
  majorId: string;
  homeroomTeacherId?: string;
  homeroomTeacherName?: string;
  studentCount?: number;
}

export interface Major {
  id: string;
  name: string;
  studentCount?: number;
}

export interface NISStudent {
  id: string;
  fullName: string;
  nis: string;
  nisn: string;
  asalSekolah?: string;
  createdAt: string;
}

export interface ExcelValidationResult {
  totalRows: number;
  validRows: number;
  errors: { row: number; message: string }[];
  data: any[];
}
