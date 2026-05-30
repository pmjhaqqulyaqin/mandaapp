import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api";

export interface MasterDutyType {
  id: string;
  name: string;
  color: string;
  icon: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherDuty {
  id: string;
  dutyDate: string;
  teacherId: string;
  dutyTypeId: string;
  notes?: string;
  academicYear?: string;
  teacherName?: string;
  dutyTypeName?: string;
  dutyTypeColor?: string;
  dutyTypeIcon?: string;
}

export function useMasterDutyTypes() {
  return useQuery({
    queryKey: ["master-duty-types"],
    queryFn: () => apiClient<MasterDutyType[]>("/teacher-duties/master-types"),
  });
}

export function useCreateMasterDutyType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<MasterDutyType>) => 
      apiClient<MasterDutyType>("/teacher-duties/master-types", { method: "POST", data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master-duty-types"] }),
  });
}

export function useUpdateMasterDutyType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<MasterDutyType> & { id: string }) => 
      apiClient<MasterDutyType>(`/teacher-duties/master-types/${id}`, { method: "PUT", data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master-duty-types"] }),
  });
}

export function useDeleteMasterDutyType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => 
      apiClient<{ success: boolean }>(`/teacher-duties/master-types/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master-duty-types"] }),
  });
}

export function useTeacherDuties(filters?: { startDate?: string; endDate?: string; teacherId?: string; academicYear?: string }) {
  const queryParams = new URLSearchParams();
  if (filters?.startDate) queryParams.append("startDate", filters.startDate);
  if (filters?.endDate) queryParams.append("endDate", filters.endDate);
  if (filters?.teacherId) queryParams.append("teacherId", filters.teacherId);
  if (filters?.academicYear) queryParams.append("academicYear", filters.academicYear);

  return useQuery({
    queryKey: ["teacher-duties", filters],
    queryFn: () => apiClient<TeacherDuty[]>(`/teacher-duties?${queryParams.toString()}`),
  });
}

export function useCreateTeacherDuty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TeacherDuty>) => 
      apiClient<TeacherDuty>("/teacher-duties", { method: "POST", data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teacher-duties"] }),
  });
}

export function useUpdateTeacherDuty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<TeacherDuty> & { id: string }) => 
      apiClient<TeacherDuty>(`/teacher-duties/${id}`, { method: "PUT", data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teacher-duties"] }),
  });
}

export function useDeleteTeacherDuty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => 
      apiClient<{ success: boolean }>(`/teacher-duties/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teacher-duties"] }),
  });
}
