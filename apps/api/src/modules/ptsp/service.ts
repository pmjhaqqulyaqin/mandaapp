import * as model from './model';
import { sendServiceEmail } from '../../lib/mailer';

export const submitServiceRequest = async (data: any) => {
  if (!data.type || !data.applicantName || !data.email) {
    throw new Error('Kolom Tipe, Nama Pemohon, dan Email wajib diisi.');
  }

  const result = await model.createServiceRequest({
    type: data.type,
    applicantName: data.applicantName,
    nisn: data.nisn || null,
    birthPlace: data.birthPlace || null,
    birthDate: data.birthDate || null,
    address: data.address || null,
    email: data.email,
    phone: data.phone || null,
    purpose: data.purpose || null,
    attachmentUrl: data.attachmentUrl || null
  });

  // Try to send an initial email confirming we received it
  await sendServiceEmail(data.email, result.ticketId, 'pending', 'Permohonan Anda berhasil masuk ke sistem kami.', data.applicantName, data.type);

  return result;
};

export const trackServiceRequest = async (ticketId: string) => {
  return await model.getServiceRequestByTicket(ticketId);
};

export const fetchAllRequests = async (type?: string, status?: string) => {
  const data = await model.getAllServiceRequests(type, status);
  // Optional: Sanitize sensitive data if necessary
  return data;
};

export const changeRequestStatus = async (id: string, status: string, adminReply?: string) => {
  const result = await model.updateServiceRequestStatus(id, status, adminReply);
  
  if (!result) {
      throw new Error("Permohonan gagal diperbarui atau tidak ditemukan");
  }

  // Trigger Nodemailer
  // It runs asynchronously so it doesn't block the API response
  sendServiceEmail(result.email, result.ticketId, result.status || status, adminReply, result.applicantName, result.type).catch(e => console.error(e));
  
  return result;
};

export const removeRequest = async (id: string) => {
  const result = await model.deleteServiceRequest(id);
  return result;
};
