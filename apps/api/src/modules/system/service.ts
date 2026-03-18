import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';

// Mock version for now - in real world this might come from package.json or a version file
const CURRENT_VERSION = '1.0.0';

export const getSystemStatus = async () => {
  return {
    version: CURRENT_VERSION,
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    lastUpdate: null, // Hardcoded for now
  };
};

export const checkForUpdates = async () => {
  // Simulating an API call to GitHub or an update server
  const remoteVersion = '1.1.0';
  
  return {
    currentVersion: CURRENT_VERSION as string,
    latestVersion: remoteVersion as string,
    hasUpdate: (remoteVersion as string) !== (CURRENT_VERSION as string),
    releaseNotes: "Update besar Phase 1 & 2 telah dirilis! Menambahkan fitur Section Builder dan Unified Update Center.",
    updateType: 'System'
  };
};

// Target Frontend URL host in production
const DEWAHOSTER_URL = process.env.FRONTEND_URL || 'https://mandalotim.sch.id';
const UPDATE_SECRET = process.env.UPDATE_SECRET || 'MandaApp_Secret_Key_Update_2026!';

export const processUpdatePackage = async (filePath: string) => {
  try {
    const fileStream = fs.createReadStream(filePath);
    const formData = new FormData();
    formData.append('package', fileStream);

    const targetUrl = `${DEWAHOSTER_URL}/system-updater.php?action=update`;

    const response = await axios.post(targetUrl, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${UPDATE_SECRET}`,
      },
      timeout: 120000 // 2 minutes timeout for large file transfer & extraction
    });

    return {
      success: true,
      message: response.data.message || 'Paket update berhasil diterapkan ke server Frontend!',
      targetVersion: 'manual-update'
    };
  } catch (error: any) {
    console.error('Update bridge failed:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || 'Gagal mengirim paket pembaruan ke server Dewahoster.');
  } finally {
    // Bersihkan file sementara .zip jika berhasil maupun gagal
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.error('Failed to cleanup temp upload file', e);
    }
  }
};

export const rollbackUpdatePackage = async () => {
  try {
    const targetUrl = `${DEWAHOSTER_URL}/system-updater.php?action=rollback`;

    const response = await axios.get(targetUrl, {
      headers: {
        'Authorization': `Bearer ${UPDATE_SECRET}`,
      },
      timeout: 60000 
    });

    return {
      success: true,
      message: response.data.message || 'Sistem berhasil di-rollback ke versi sebelumnya!'
    };
  } catch (error: any) {
    console.error('Rollback bridge failed:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || 'Sedang tidak ada backup untuk di-rollback atau terjadi kegagalan.');
  }
};
