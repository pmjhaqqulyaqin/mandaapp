import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { pipeline } from 'stream/promises';

// Target Frontend URL host in production
const DEWAHOSTER_URL = process.env.FRONTEND_URL || 'https://mandalotim.sch.id';
const UPDATE_SECRET = process.env.UPDATE_SECRET || 'MandaApp_Secret_Key_Update_2026!';
const GITHUB_REPO = 'pmjhaqqulyaqin/mandaapp';

export const getSystemStatus = async () => {
  let currentVersion = '1.0.0';
  try {
    const versionRes = await axios.get(`${DEWAHOSTER_URL}/version.json?t=${Date.now()}`);
    if (versionRes.data?.version) currentVersion = versionRes.data.version;
  } catch (e) {
    // silently fallback to 1.0.0
  }

  return {
    version: currentVersion,
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    lastUpdate: null,
  };
};

export const checkForUpdates = async () => {
  try {
    const status = await getSystemStatus();
    const currentVersion = status.version;

    const ghRes = await axios.get(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
      timeout: 10000
    });

    const latestRelease = ghRes.data;
    const remoteVersion = latestRelease.tag_name.replace(/^v/, '');

    return {
      currentVersion: currentVersion,
      latestVersion: remoteVersion,
      hasUpdate: remoteVersion !== currentVersion,
      releaseNotes: latestRelease.body || "Pembaruan GitHub ditemukan.",
      updateType: 'System',
      downloadUrl: latestRelease.assets.find((a: any) => a.name.endsWith('.zip'))?.url || null
    };
  } catch (error: any) {
    console.error('Check updates failed:', error.message);
    throw new Error('Gagal memeriksa pembaruan dari GitHub: ' + (error.response?.data?.message || error.message));
  }
};

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

export const syncGithubUpdate = async () => {
  try {
    const updateInfo = await checkForUpdates();
    if (!updateInfo.downloadUrl) {
      throw new Error('Tidak ada file .zip yang dilampirkan pada Release GitHub terbaru.');
    }

    const tempDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const tempFilePath = path.join(tempDir, `github-update-${Date.now()}.zip`);

    console.log('Downloading GitHub Asset:', updateInfo.downloadUrl);
    const downloadRes = await axios({
      url: updateInfo.downloadUrl,
      method: 'GET',
      responseType: 'stream',
      headers: {
        'Accept': 'application/octet-stream' // Required by GitHub API for downloading assets
      } // If it's a private repo, we would need to pass Auth header here. Since it's public, it's fine.
    });

    const writer = fs.createWriteStream(tempFilePath);
    await pipeline(downloadRes.data, writer);

    // Forward the downloaded zip directly through the existing pipeline
    const result = await processUpdatePackage(tempFilePath);
    return {
      ...result,
      message: 'Sukses! Aplikasi berhasil disinkronisasi dengan GitHub Release terbaru.'
    };
  } catch (error: any) {
    throw new Error('Gagal sinkronisasi GitHub: ' + (error.response?.data?.message || error.message));
  }
};
