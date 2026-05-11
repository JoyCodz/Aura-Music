const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ytClient', {
  // Search for tracks, artists, albums
  search: (query) => ipcRenderer.invoke('search', query),

  // Get stream URL for a video ID (returns localhost URL)
  getStreamUrl: (videoId) => ipcRenderer.invoke('get-stream-url', videoId),

  // Get full track metadata
  getTrackInfo: (videoId) => ipcRenderer.invoke('get-track-info', videoId),

  // Get home/trending content
  getHome: () => ipcRenderer.invoke('get-home'),

  // Save/load cookies for authenticated requests
  saveCookies: (cookies) => ipcRenderer.invoke('save-cookies', cookies),
  loadCookies: () => ipcRenderer.invoke('load-cookies'),
  clearCookies: () => ipcRenderer.invoke('clear-cookies'),

  // Local Favorites
  addLocalFavorite: (track) => ipcRenderer.invoke('add-local-favorite', track),
  removeLocalFavorite: (videoId) => ipcRenderer.invoke('remove-local-favorite', videoId),
  getLocalFavorites: () => ipcRenderer.invoke('get-local-favorites'),

  // Settings & History
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getHistory: () => ipcRenderer.invoke('get-history'),
  addToHistory: (track) => ipcRenderer.invoke('add-to-history', track),
  removeFromHistory: (videoId) => ipcRenderer.invoke('remove-from-history', videoId),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  // Search History
  getSearchHistory: () => ipcRenderer.invoke('get-search-history'),
  addSearchHistory: (query) => ipcRenderer.invoke('add-search-history', query),
  removeSearchHistory: (query) => ipcRenderer.invoke('remove-search-history', query),
  clearSearchHistory: () => ipcRenderer.invoke('clear-search-history'),

  // Downloads
  downloadTrack: (track) => ipcRenderer.invoke('download-track', track),

  // Get user playlists (requires auth)
  getLibrary: () => ipcRenderer.invoke('get-library'),

  // Get playlist tracks
  getPlaylistTracks: (playlistId) => ipcRenderer.invoke('get-playlist-tracks', playlistId),

  // Get album
  getAlbum: (albumId) => ipcRenderer.invoke('get-album', albumId),

  // Get artist info
  getArtist: (artistId) => ipcRenderer.invoke('get-artist', artistId),

  // Up Next / Recommendations
  getUpNexts: (videoId) => ipcRenderer.invoke('get-up-nexts', videoId),

  // Window controls (for custom title bar)
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // Listen for media key events from main process
  onMediaKey: (callback) => {
    ipcRenderer.on('media-key', (_, action) => callback(action));
  },

  // Thumbnail proxy URL
  getThumbnailUrl: (videoId) => ipcRenderer.invoke('get-thumbnail-url', videoId),

  // App Info & Updates
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});
