import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jurnalService } from '../../lib/services/jurnal';

const KEYS = {
  subjects: ['jurnal-subjects'] as const,
  scheduleToday: (eid: string) => ['jurnal-schedule-today', eid] as const,
  entries: (f?: Record<string, string>) => ['jurnal-entries', f] as const,
  entry: (id: string) => ['jurnal-entry', id] as const,
  classStudents: (cid: string, d?: string) => ['jurnal-class-students', cid, d] as const,
  monitoring: (d?: string) => ['jurnal-monitoring', d] as const,
  recap: (f: Record<string, string>) => ['jurnal-recap', f] as const,
  templates: (tid: string) => ['jurnal-templates', tid] as const,
};

export const useTeachingSubjects = (params?: Record<string, string>) => {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: [...KEYS.subjects, params], queryFn: () => jurnalService.getTeachingSubjects(params) });
  const createMut = useMutation({ mutationFn: jurnalService.createTeachingSubject, onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.subjects }) });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => jurnalService.updateTeachingSubject(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.subjects }) });
  const deleteMut = useMutation({ mutationFn: jurnalService.deleteTeachingSubject, onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.subjects }) });
  const bulkMut = useMutation({ mutationFn: jurnalService.bulkCreateTeachingSubjects, onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.subjects }) });
  const importMut = useMutation({ mutationFn: jurnalService.importExcel, onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.subjects }) });
  return { query, createMut, updateMut, deleteMut, bulkMut, importMut };
};

export const useScheduleToday = (employeeId: string) =>
  useQuery({ queryKey: KEYS.scheduleToday(employeeId), queryFn: () => jurnalService.getScheduleToday(employeeId), enabled: !!employeeId });

export const useJurnalEntries = (filters?: Record<string, string>) =>
  useQuery({ queryKey: KEYS.entries(filters), queryFn: () => jurnalService.getEntries(filters) });

export const useJurnalById = (id: string) =>
  useQuery({ queryKey: KEYS.entry(id), queryFn: () => jurnalService.getEntryById(id), enabled: !!id });

export const useClassStudents = (classId: string, date?: string) =>
  useQuery({ queryKey: KEYS.classStudents(classId, date), queryFn: () => jurnalService.getClassStudents(classId, date), enabled: !!classId });

export const useJurnalMonitoring = (date?: string) =>
  useQuery({ queryKey: KEYS.monitoring(date), queryFn: () => jurnalService.getMonitoring(date) });

export const useJurnalRecap = (filters: Record<string, string>) =>
  useQuery({ queryKey: KEYS.recap(filters), queryFn: () => jurnalService.getRecap(filters), enabled: !!filters.dateFrom && !!filters.dateTo });

export const useJurnalTemplates = (teacherId: string) =>
  useQuery({ queryKey: KEYS.templates(teacherId), queryFn: () => jurnalService.getTemplates(teacherId), enabled: !!teacherId });

export const useJurnalMutations = () => {
  const qc = useQueryClient();
  const inv = () => { qc.invalidateQueries({ queryKey: ['jurnal'] }); };

  return {
    createEntry: useMutation({ mutationFn: jurnalService.createEntry, onSuccess: inv }),
    updateEntry: useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => jurnalService.updateEntry(id, data), onSuccess: inv }),
    deleteEntry: useMutation({ mutationFn: jurnalService.deleteEntry, onSuccess: inv }),
    submitEntry: useMutation({ mutationFn: jurnalService.submitEntry, onSuccess: inv }),
    approveEntry: useMutation({ mutationFn: jurnalService.approveEntry, onSuccess: inv }),
    rejectEntry: useMutation({ mutationFn: ({ id, note }: { id: string; note: string }) => jurnalService.rejectEntry(id, note), onSuccess: inv }),
    saveAttendance: useMutation({ mutationFn: ({ entryId, records }: { entryId: string; records: any[] }) => jurnalService.saveStudentAttendance(entryId, records), onSuccess: inv }),
    uploadAttachment: useMutation({ mutationFn: (formData: FormData) => jurnalService.uploadAttachment(formData), onSuccess: inv }),
    deleteAttachment: useMutation({ mutationFn: jurnalService.deleteAttachment, onSuccess: inv }),
    createTemplate: useMutation({ mutationFn: jurnalService.createTemplate, onSuccess: inv }),
    deleteTemplate: useMutation({ mutationFn: jurnalService.deleteTemplate, onSuccess: inv }),
  };
};
