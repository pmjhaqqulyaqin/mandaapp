import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const GITHUB_REPO = 'pmjhaqqulyaqin/mandaapp';

export const getSystemStatus = async () => {
  let currentVersion = 'Unknown';
  try {
    // Try to get git commit hash if running in Docker-in-Docker host mount
    const { stdout } = await execPromise('cd /host_app && git rev-parse --short HEAD');
    currentVersion = stdout.trim();
  } catch (e) {
    // fallback to package.json version if git is unavailable
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
      currentVersion = pkg.version;
    } catch (err) {}
  }

  return {
    version: currentVersion,
    environment: process.env.NODE_ENV || 'production',
    uptime: process.uptime(),
    lastUpdate: null,
  };
};

export const checkForUpdates = async () => {
  try {
    const status = await getSystemStatus();
    const currentVersion = status.version;

    const headers: any = { 
      'Accept': 'application/vnd.github.v3+json',
      'Cache-Control': 'no-cache',
    };
    
    // Optional: Personal Access Token if provided in env
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    // Check latest commit on main branch instead of releases (since user is pushing directly to main)
    const ghRes = await axios.get(`https://api.github.com/repos/${GITHUB_REPO}/commits/main?t=${Date.now()}`, {
      headers,
      timeout: 10000
    });

    const latestCommitSha = ghRes.data.sha.substring(0, 7);
    const commitMessage = ghRes.data.commit.message;

    return {
      currentVersion: currentVersion,
      latestVersion: latestCommitSha,
      hasUpdate: currentVersion.length === 7 ? latestCommitSha !== currentVersion : true, // If version is 1.0.0, force update available
      releaseNotes: `Pembaruan terbaru: ${commitMessage}`,
      updateType: 'System',
      downloadUrl: null // Not needed for Docker git pull
    };
  } catch (error: any) {
    throw new Error('Gagal memeriksa pembaruan dari GitHub: ' + (error.response?.data?.message || error.message));
  }
};

export const processUpdatePackage = async (filePath: string) => {
  // Zip update in Docker is disabled for safety, git pull is preferred.
  // We throw an amicable error to guide the user.
  throw new Error('Fitur Upload ZIP Dinonaktifkan pada versi Docker. Silakan gunakan Update via GitHub.');
};

export const rollbackUpdatePackage = async () => {
  throw new Error('Fitur Rollback Dinonaktifkan pada versi Docker. Gunakan Terminal VPS atau Git Revert.');
};

export const syncGithubUpdate = async () => {
  try {
    if (!fs.existsSync('/host_app')) {
      throw new Error('Direktori /host_app tidak ditemukan. Pastikan volume docker-compose diatur dengan benar.');
    }

    console.log('Menginisiasi protokol Sibling Container Inception untuk Update...');

    // 1. Dapatkan lokasi fisik host (VPS path) dari volume /host_app
    const { stdout: mountStr } = await execPromise(`docker inspect --format='{{json .Mounts}}' mandaapp_api`);
    const mounts = JSON.parse(mountStr.trim());
    const hostMount = mounts.find((m: any) => m.Destination === '/host_app');
    
    if (!hostMount || !hostMount.Source) {
      throw new Error("Gagal melacak direktori asal di VPS Host.");
    }
    const hostPath = hostMount.Source; // e.g. /root/mandaapp

    // 2. Dapatkan Image Asli dari mandaapp_api yang punya git & docker-cli
    const { stdout: imgStr } = await execPromise(`docker inspect --format='{{.Image}}' mandaapp_api`);
    const apiImageId = imgStr.trim();

    // 3. Bangun Sibiling Container yang berdiri sendiri untuk mengeksekusi bunuh diri & kebangkitan API kita
    // Menggunakan -d agar Docker daemon yang menjalankan, dan --rm agar kontainer buang sendiri kalau selesai.
    const updaterCommand = `docker run -d --rm --name mandaapp_auto_updater \
      -v /var/run/docker.sock:/var/run/docker.sock \
      -v "${hostPath}:${hostPath}" \
      -w "${hostPath}" \
      ${apiImageId} \
      sh -c "git config --global --add safe.directory '${hostPath}' && git pull origin main && docker compose up -d --build"`;

    await execPromise(updaterCommand);

    return {
      success: true,
      message: 'Perintah pembaruan berhasil dikirim ke VPS! Sistem akan dimuat ulang dalam 1-2 menit.',
      targetVersion: 'latest-github'
    };
  } catch (error: any) {
    console.error('GitHub Sync Bridge Failed:', error.message);
    throw new Error('Gagal mengeksekusi Git Pull/Rebuild via Daemon: ' + error.message);
  }
};
