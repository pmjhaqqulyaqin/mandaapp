import { apiClient } from '../api';

const BASE = '/jurnal';

export const jurnalService = {
  // Teaching Subjects
  getTeachingSubjects: (params?: Record<string, string>) => apiClient<any[]>(`${BASE}/teaching-subjects${params ? '?' + new URLSearchParams(params).toString() : ''}`),
  getScheduleToday: (employeeId: string) => apiClient<any[]>(`${BASE}/schedule-today?employeeId=${employeeId}`),
  createTeachingSubject: (data: any) => apiClient<any>(`${BASE}/teaching-subjects`, { method: 'POST', data }),
  updateTeachingSubject: (id: string, data: any) => apiClient<any>(`${BASE}/teaching-subjects/${id}`, { method: 'PUT', data }),
  deleteTeachingSubject: (id: string) => apiClient<any>(`${BASE}/teaching-subjects/${id}`, { method: 'DELETE' }),
  bulkCreateTeachingSubjects: (records: any[]) => apiClient<any>(`${BASE}/teaching-subjects/bulk`, { method: 'POST', data: { records } }),
  importExcel: (formData: FormData) => apiClient<any>(`${BASE}/teaching-subjects/import`, { method: 'POST', data: formData }),

  // Teacher Codes
  getTeacherCodes: () => apiClient<any[]>(`${BASE}/teacher-codes`),
  updateTeacherCodes: (codes: { employeeId: string; kodeGuru: string }[]) => apiClient<any>(`${BASE}/teacher-codes`, { method: 'PUT', data: { codes } }),

  // Mapel Codes
  getMapelCodes: () => apiClient<any[]>(`${BASE}/mapel-codes`),
  upsertMapelCodes: (codes: { id?: string; kode: string; subjectName: string }[]) => apiClient<any>(`${BASE}/mapel-codes`, { method: 'PUT', data: { codes } }),
  deleteMapelCode: (id: string) => apiClient<any>(`${BASE}/mapel-codes/${id}`, { method: 'DELETE' }),

  // Jurnal Entries
  getEntries: (params?: Record<string, string>) => apiClient<any[]>(`${BASE}/entries${params ? '?' + new URLSearchParams(params).toString() : ''}`),
  getEntryById: (id: string) => apiClient<any>(`${BASE}/entries/${id}`),
  createEntry: (data: any) => apiClient<any>(`${BASE}/entries`, { method: 'POST', data }),
  updateEntry: (id: string, data: any) => apiClient<any>(`${BASE}/entries/${id}`, { method: 'PUT', data }),
  deleteEntry: (id: string) => apiClient<any>(`${BASE}/entries/${id}`, { method: 'DELETE' }),
  submitEntry: (id: string) => apiClient<any>(`${BASE}/entries/${id}/submit`, { method: 'POST' }),
  approveEntry: (id: string) => apiClient<any>(`${BASE}/entries/${id}/approve`, { method: 'POST' }),
  rejectEntry: (id: string, note: string) => apiClient<any>(`${BASE}/entries/${id}/reject`, { method: 'POST', data: { note } }),

  // Student Attendance
  getClassStudents: (classId: string, date?: string) => apiClient<any[]>(`${BASE}/class-students/${classId}${date ? '?date=' + date : ''}`),
  getStudentAttendance: (entryId: string) => apiClient<any[]>(`${BASE}/entries/${entryId}/attendance`),
  saveStudentAttendance: (entryId: string, records: any[]) => apiClient<any>(`${BASE}/entries/${entryId}/attendance`, { method: 'POST', data: { records } }),

  // Attachments
  uploadAttachment: (formData: FormData) => apiClient<any>(`${BASE}/attachments`, { method: 'POST', data: formData }),
  deleteAttachment: (id: string) => apiClient<any>(`${BASE}/attachments/${id}`, { method: 'DELETE' }),

  // Monitoring & Recap
  getMonitoring: (date?: string) => apiClient<any>(`${BASE}/monitoring${date ? '?date=' + date : ''}`),
  getRecap: (params: Record<string, string>) => apiClient<any>(`${BASE}/recap?${new URLSearchParams(params).toString()}`),

  // Templates
  getTemplates: (teacherId: string) => apiClient<any[]>(`${BASE}/templates?teacherId=${teacherId}`),
  createTemplate: (data: any) => apiClient<any>(`${BASE}/templates`, { method: 'POST', data }),
  useTemplate: (id: string) => apiClient<any>(`${BASE}/templates/${id}/use`, { method: 'POST' }),
  deleteTemplate: (id: string) => apiClient<any>(`${BASE}/templates/${id}`, { method: 'DELETE' }),
};
