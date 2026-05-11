const path = require('path');
const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');
const os = require('os');
const { app } = require('electron');

function getResourcesDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'resources')
    : path.join(__dirname, '../../resources');
}

function getYtdlpFilename() {
  const platform = os.platform();
  if (platform === 'win32') return 'yt-dlp.exe';
  if (platform === 'darwin') return 'yt-dlp_macos';
  return 'yt-dlp'; // Linux
}

function getYtdlpPath() {
  const resourcesDir = getResourcesDir();
  return path.join(resourcesDir, getYtdlpFilename());
}

function getDownloadUrl() {
  const platform = os.platform();
  const base = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/';
  if (platform === 'win32') return `${base}yt-dlp.exe`;
  if (platform === 'darwin') return `${base}yt-dlp_macos`;
  return `${base}yt-dlp`;
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    try {
      execSync(`curl -L "${url}" -o "${dest}"`, { stdio: 'ignore' });
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

async function ensureYtdlp() {
  const resourcesDir = getResourcesDir();
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
  }

  const ytdlpPath = getYtdlpPath();

  // Check if system yt-dlp is available first
  try {
    const systemPath = execSync('which yt-dlp || where yt-dlp', { encoding: 'utf8' }).trim();
    if (systemPath) {
      console.log('[ytdlp-manager] Using system yt-dlp at:', systemPath);
      // Create a symlink or copy path reference
      if (!fs.existsSync(ytdlpPath)) {
        try {
          fs.symlinkSync(systemPath, ytdlpPath);
        } catch {
          // If symlink fails, just use system path (update getYtdlpPath fallback)
        }
      }
      return;
    }
  } catch {
    // System yt-dlp not found, download it
  }

  if (fs.existsSync(ytdlpPath)) {
    console.log('[ytdlp-manager] yt-dlp already at:', ytdlpPath);
    return;
  }

  console.log('[ytdlp-manager] Downloading yt-dlp...');
  const downloadUrl = getDownloadUrl();

  try {
    await downloadFile(downloadUrl, ytdlpPath);
    // Make executable on Unix
    if (os.platform() !== 'win32') {
      fs.chmodSync(ytdlpPath, '755');
    }
    console.log('[ytdlp-manager] yt-dlp downloaded to:', ytdlpPath);
  } catch (err) {
    console.error('[ytdlp-manager] Download failed:', err.message);
    throw err;
  }
}

// Fallback: check system yt-dlp at runtime if bundled binary missing
function getYtdlpPathSafe() {
  const bundled = getYtdlpPath();
  if (fs.existsSync(bundled)) return bundled;

  // Try system install
  try {
    const systemPath = execSync('which yt-dlp', { encoding: 'utf8' }).trim();
    if (systemPath) return systemPath;
  } catch {}

  return bundled; // Will fail gracefully with error message
}

module.exports = { ensureYtdlp, getYtdlpPath: getYtdlpPathSafe };
