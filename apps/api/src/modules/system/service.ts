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
    // We execute the git pull and docker compose build command on the HOST via mounted volumes!
    // Since the API container will be killed and recreated during this process, we spawn it in the background
    // and immediately return success to the frontend.
    
    // Check if /host_app exists
    if (!fs.existsSync('/host_app')) {
      throw new Error('Direktori /host_app tidak ditemukan. Pastikan volume docker-compose diatur dengan benar.');
    }

    // Command runs inside container BUT affects host volume, and docker.sock affects host daemon!
    const command = `cd /host_app && git pull origin main && docker compose up -d --build`;

    console.log('Menjalankan Pembaruan Mandiri Docker:', command);
    
    // Spawn detached process so it survives when this node server is killed by the docker daemon
    const { spawn } = require('child_process');
    const child = spawn('sh', ['-c', command], {
      detached: true,
      stdio: 'ignore', // detach completely
    });
    
    child.unref();

    return {
      success: true,
      message: 'Perintah pembaruan berhasil dikirim ke VPS! Sistem akan dimuat ulang dalam 1-2 menit ke depan.',
      targetVersion: 'latest-github'
    };
  } catch (error: any) {
    console.error('GitHub Sync Bridge Failed:', error.message);
    throw new Error('Gagal sinkronisasi GitHub: ' + error.message);
  }
};
