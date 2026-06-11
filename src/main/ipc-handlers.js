const { ipcMain, BrowserWindow, app, shell } = require('electron');
const axios = require('axios');
const YTMusic = require('ytmusic-api');
const Store = require('electron-store');

const store = new Store({ name: 'yt-client-config' });
let ytmusic = null;

async function getYTMusicInstance() {
  if (!ytmusic) {
    ytmusic = new YTMusic();
    const cookies = store.get('cookies', null);
    try {
      await ytmusic.initialize(cookies ? { cookies } : undefined);
    } catch (err) {
      console.warn('[ipc] YTMusic init error:', err.message);
      await ytmusic.initialize();
    }
  }
  return ytmusic;
}

function registerIpcHandlers(streamPort) {
  // --- Search ---
  ipcMain.handle('search', async (_, query) => {
    try {
      const yt = await getYTMusicInstance();
      const [songs, albums, artists, playlists, videos] = await Promise.all([
        yt.searchSongs(query).catch(() => []),
        yt.searchAlbums(query).catch(() => []),
        yt.searchArtists(query).catch(() => []),
        yt.searchPlaylists(query).catch(() => []),
        yt.searchVideos(query).catch(() => []),
      ]);
      return {
        songs: songs.slice(0, 20),
        albums: albums.slice(0, 10),
        artists: artists.slice(0, 8),
        playlists: playlists.slice(0, 8),
        videos: videos.slice(0, 20)
      };
    } catch (err) {
      console.error('[ipc] search error:', err.message);
      return { songs: [], albums: [], artists: [], playlists: [], videos: [] };
    }
  });

  // --- Get Stream URL (Direct) ---
  ipcMain.handle('get-stream-url', async (_, videoId, quality) => {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      const { getYtdlpPath } = require('./ytdlp-manager');
      const ytdlpPath = getYtdlpPath();

      // Get quality from settings if not provided
      let audioQuality = quality;
      if (!audioQuality) {
        const settings = store.get('settings', {});
        audioQuality = settings.audioQuality || 'high';
      }

      // Quality format mappings
      const qualityFormats = {
        high: 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
        medium: 'bestaudio',
        low: 'bestaudio[abr<=128]/bestaudio',
        lowest: 'bestaudio[abr<=64]/bestaudio'
      };

      const format = qualityFormats[audioQuality] || qualityFormats.high;

      exec(`"${ytdlpPath}" -g -f "${format}" https://www.youtube.com/watch?v=${videoId}`,
        (error, stdout, stderr) => {
          if (error) {
            console.error('[ipc] yt-dlp -g error:', error.message);
            resolve(null);
            return;
          }
          const urls = stdout.trim().split('\n');
          // Get the last valid http URL (in case of warnings)
          const validUrl = urls.reverse().find(line => line.startsWith('http'));
          resolve(validUrl || null);
        }
      );
    });
  });

  // --- Get Track Info ---
  ipcMain.handle('get-track-info', async (_, videoId) => {
    try {
      const yt = await getYTMusicInstance();
      const song = await yt.getSong(videoId);
      return song;
    } catch (err) {
      console.error('[ipc] getTrackInfo error:', err.message);
      return null;
    }
  });

  // --- Get Home ---
  ipcMain.handle('get-home', async () => {
    try {
      const yt = await getYTMusicInstance();
      // Get trending/charts
      const [charts] = await Promise.all([
        yt.getCharts('IN').catch(() => ({ songs: [] })),
      ]);
      return { charts };
    } catch (err) {
      console.warn('[ipc] getHome error:', err.message);
      return { charts: { songs: [] } };
    }
  });

  // --- Cookie management ---
  ipcMain.handle('save-cookies', async (_, cookies) => {
    try {
      const yt = new YTMusic();
      await yt.initialize({ cookies });
      
      // If initialization passes without throwing, cookies are valid
      store.set('cookies', cookies);
      ytmusic = yt;
      return true;
    } catch (err) {
      console.warn('[ipc] Invalid cookie provided:', err.message);
      ytmusic = null;
      store.delete('cookies');
      await getYTMusicInstance(); // Re-init anonymously
      throw new Error('Invalid cookies provided. Please check your cookie string and try again.');
    }
  });

  ipcMain.handle('load-cookies', async () => {
    return store.get('cookies', null);
  });

  ipcMain.handle('clear-cookies', async () => {
    store.delete('cookies');
    ytmusic = null;
    return true;
  });

  // --- Library (requires auth) ---
  ipcMain.handle('get-library', async () => {
    try {
      const yt = await getYTMusicInstance();
      const playlists = await yt.getLibraryPlaylists().catch(() => []);
      return { playlists };
    } catch (err) {
      console.warn('[ipc] getLibrary error:', err.message);
      return { playlists: [] };
    }
  });

  // --- Playlist tracks ---
  ipcMain.handle('get-playlist-tracks', async (_, playlistId) => {
    try {
      const yt = await getYTMusicInstance();
      const playlist = await yt.getPlaylist(playlistId);
      return playlist;
    } catch (err) {
      console.error('[ipc] getPlaylistTracks error:', err.message);
      return null;
    }
  });

  // --- Album info ---
  ipcMain.handle('get-album', async (_, albumId) => {
    try {
      const yt = await getYTMusicInstance();
      const album = await yt.getAlbum(albumId);
      return album;
    } catch (err) {
      console.error('[ipc] getAlbum error:', err.message);
      return null;
    }
  });

  // --- Artist info ---
  ipcMain.handle('get-artist', async (_, artistId) => {
    try {
      const yt = await getYTMusicInstance();
      const artist = await yt.getArtist(artistId);
      return artist;
    } catch (err) {
      console.error('[ipc] getArtist error:', err.message);
      return null;
    }
  });

  // --- Up Next / Recommendations ---
  ipcMain.handle('get-up-nexts', async (_, videoId) => {
    try {
      const yt = await getYTMusicInstance();
      const upNexts = await yt.getUpNexts(videoId);
      // Map to standardized track schema
      return upNexts.map(t => ({
        videoId: t.videoId,
        name: t.title || t.name || 'Unknown Track',
        artist: { name: t.artists || 'Unknown Artist' },
        thumbnails: t.thumbnail ? [{ url: t.thumbnail }] : [],
        duration: t.duration
      }));
    } catch (err) {
      console.warn('[ipc] getUpNexts error:', err.message);
      return [];
    }
  });

  // --- Thumbnail proxy URL ---
  ipcMain.handle('get-thumbnail-url', async (_, videoId) => {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  });

  // --- Window controls ---
  ipcMain.on('window-minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  ipcMain.on('window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) win.unmaximize();
    else win?.maximize();
  });
  ipcMain.on('window-close', (event) => {
    require('electron').app.quit();
  });

  // --- Local Favorites (Anonymous Mode) ---
  ipcMain.handle('add-local-favorite', async (_, track) => {
    const favs = store.get('local-favorites', []);
    if (!favs.find(t => t.videoId === track.videoId)) {
      favs.push(track);
      store.set('local-favorites', favs);
    }
    return true;
  });

  ipcMain.handle('remove-local-favorite', async (_, videoId) => {
    let favs = store.get('local-favorites', []);
    favs = favs.filter(t => t.videoId !== videoId);
    store.set('local-favorites', favs);
    return true;
  });

  ipcMain.handle('get-local-favorites', async () => {
    return store.get('local-favorites', []);
  });

  // --- Search History ---
  ipcMain.handle('get-search-history', async () => {
    return store.get('search-history', []);
  });

  ipcMain.handle('add-search-history', async (_, query) => {
    if (!query || typeof query !== 'string') return;
    let history = store.get('search-history', []);
    // Remove if exists to move to top
    history = history.filter(q => q !== query);
    history.unshift(query);
    // Keep only last 20
    if (history.length > 20) history = history.slice(0, 20);
    store.set('search-history', history);
    return history;
  });

  ipcMain.handle('remove-search-history', async (_, query) => {
    let history = store.get('search-history', []);
    history = history.filter(q => q !== query);
    store.set('search-history', history);
    return history;
  });

  ipcMain.handle('clear-search-history', async () => {
    store.set('search-history', []);
    return true;
  });

  // --- Settings & History ---
  ipcMain.handle('get-settings', async () => {
    return store.get('settings', { maxHistoryItems: 50 });
  });

  ipcMain.handle('save-settings', async (_, newSettings) => {
    store.set('settings', newSettings);
    let history = store.get('history', []);
    if (history.length > newSettings.maxHistoryItems) {
      history = history.slice(0, newSettings.maxHistoryItems);
      store.set('history', history);
    }
    return true;
  });

  ipcMain.handle('get-history', async () => {
    return store.get('history', []);
  });

  ipcMain.handle('add-to-history', async (_, track) => {
    let history = store.get('history', []);
    const settings = store.get('settings', { maxHistoryItems: 50 });
    
    // Remove if already exists to push it to the top
    history = history.filter(t => t.videoId !== track.videoId);
    history.unshift(track);
    
    if (history.length > settings.maxHistoryItems) {
      history = history.slice(0, settings.maxHistoryItems);
    }
    
    store.set('history', history);
    return true;
  });

  ipcMain.handle('remove-from-history', async (_, videoId) => {
    let history = store.get('history', []);
    history = history.filter(t => t.videoId !== videoId);
    store.set('history', history);
    return true;
  });

  ipcMain.handle('clear-history', async () => {
    store.set('history', []);
    return true;
  });

  // --- Downloads ---
  ipcMain.handle('download-track', async (_, track) => {
    const { getYtdlpPath } = require('./ytdlp-manager');
    const { exec } = require('child_process');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');
    
    const downloadsDir = path.join(os.homedir(), 'Downloads', 'AuraMusic');
    if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });
    
    const ytdlp = getYtdlpPath();
    const url = `https://youtube.com/watch?v=${track.videoId}`;
    const safeTitle = (track.name || 'Unknown_Track').replace(/[^a-zA-Z0-9]/g, '_');
    const output = path.join(downloadsDir, `${safeTitle}.mp3`);
    
    const cmd = `"${ytdlp}" -x --audio-format mp3 "${url}" -o "${output}"`;
    
    return new Promise((resolve) => {
      exec(cmd, (error) => {
        if (error) {
          console.error('[ipc] Download error:', error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  });

  // --- App Info & Updates ---
  ipcMain.handle('get-app-version', () => app.getVersion());

  ipcMain.handle('check-for-updates', async () => {
    try {
      // GitHub repo for update checks
      const REPO = 'JoyCodz/Aura-Music';
      const response = await axios.get(`https://api.github.com/repos/${REPO}/releases/latest`, {
        headers: { 'User-Agent': 'AuraMusicApp' }
      });
      const latestVersion = response.data.tag_name;
      const currentVersion = app.getVersion();
      
      const cleanLatest = latestVersion.replace(/^v/, '');
      const cleanCurrent = currentVersion.replace(/^v/, '');

      if (cleanLatest !== cleanCurrent) {
        return { hasUpdate: true, latestVersion, url: response.data.html_url };
      }
      return { hasUpdate: false, currentVersion };
    } catch (err) {
      console.warn('[ipc] Update check failed:', err.message);
      return { error: 'Failed to check for updates. Ensure the GitHub repository exists and is public.' };
    }
  });

  ipcMain.handle('open-external', (_, url) => {
    shell.openExternal(url);
  });

  // --- Lyrics (lrclib.net) ---
  ipcMain.handle('get-lyrics', async (_, track) => {
    try {
      const trackName = track.name || track.title || '';
      const artistName = track.artist?.name || track.artists?.[0]?.name || '';
      const albumName = track.album?.name || '';
      const duration = track.duration ? Math.round(track.duration) : undefined;

      // Strategy 1: /api/get with full metadata (most accurate — uses duration to avoid wrong covers)
      if (trackName && artistName && duration) {
        const params = new URLSearchParams({
          track_name: trackName,
          artist_name: artistName,
          ...(albumName ? { album_name: albumName } : {}),
          duration: String(duration),
        });
        const res = await axios.get(`https://lrclib.net/api/get?${params}`, {
          headers: { 'User-Agent': 'AuraMusic/1.0 (https://github.com/JoyCodz/Aura-Music)' },
          timeout: 8000,
        }).catch(() => null);

        if (res?.data && (res.data.syncedLyrics || res.data.plainLyrics)) {
          return {
            synced: res.data.syncedLyrics || null,
            plain: res.data.plainLyrics || null,
            source: 'lrclib',
          };
        }
      }

      // Strategy 2: /api/search fallback (keyword search)
      if (trackName) {
        const q = [trackName, artistName].filter(Boolean).join(' ');
        const searchRes = await axios.get(`https://lrclib.net/api/search`, {
          params: { q },
          headers: { 'User-Agent': 'AuraMusic/1.0 (https://github.com/JoyCodz/Aura-Music)' },
          timeout: 8000,
        }).catch(() => null);

        if (searchRes?.data?.length > 0) {
          // Pick best match: prefer one with synced lyrics and closest duration
          const results = searchRes.data;
          let best = results.find(r => r.syncedLyrics) || results[0];
          if (duration) {
            const withSynced = results.filter(r => r.syncedLyrics);
            if (withSynced.length > 0) {
              best = withSynced.reduce((a, b) =>
                Math.abs((a.duration || 0) - duration) < Math.abs((b.duration || 0) - duration) ? a : b
              );
            }
          }
          return {
            synced: best.syncedLyrics || null,
            plain: best.plainLyrics || null,
            source: 'lrclib',
          };
        }
      }

      return { synced: null, plain: null, source: null };
    } catch (err) {
      console.warn('[ipc] getLyrics error:', err.message);
      return { synced: null, plain: null, source: null };
    }
  });
}

module.exports = { registerIpcHandlers };
