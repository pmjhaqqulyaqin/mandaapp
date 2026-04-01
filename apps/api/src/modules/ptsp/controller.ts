import { Request, Response } from 'express';
import * as ptspService from './service';

export const handleSubmit = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    let attachmentUrl = null;

    if (req.file) {
      attachmentUrl = `/uploads/${req.file.filename}`;
    }

    // formData comes as a JSON string from the frontend
    const formData = data.formData || null;

    const result = await ptspService.submitServiceRequest({
      ...data,
      attachmentUrl,
      formData
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const handleTrack = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const requestItem = await ptspService.trackServiceRequest(ticketId);
    
    if (!requestItem) {
      return res.status(404).json({ success: false, message: 'Nomor Resi tidak ditemukan.' });
    }

    res.status(200).json({ success: true, data: requestItem });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const handleGetAll = async (req: Request, res: Response) => {
  try {
    const { type, status } = req.query;
    const items = await ptspService.fetchAllRequests(type as string, status as string);
    res.status(200).json({ success: true, data: items });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const handleUpdateStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminReply } = req.body;
    const updated = await ptspService.changeRequestStatus(id, status, adminReply);
    res.status(200).json({ success: true, data: updated, message: "Status dan Feedback berhasil dikirim!" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const handleDelete = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await ptspService.removeRequest(id);
    res.status(200).json({ success: true, data: deleted, message: "Pengajuan berhasil dihapus!" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
