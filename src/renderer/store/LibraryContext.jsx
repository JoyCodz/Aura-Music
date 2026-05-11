import React, { createContext, useContext, useState, useEffect } from 'react';

const LibraryContext = createContext(null);

export function LibraryProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [localFavorites, setLocalFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if cookies are saved
    const checkAuth = async () => {
      if (!window.ytClient) return;
      
      // Load local favorites first
      loadLocalFavorites();
      
      const cookies = await window.ytClient.loadCookies();
      setIsAuthenticated(!!cookies);
      if (cookies) {
        loadLibrary();
      }
    };
    checkAuth();
  }, []);

  const loadLocalFavorites = async () => {
    if (!window.ytClient) return;
    const favs = await window.ytClient.getLocalFavorites();
    setLocalFavorites(favs || []);
  };

  const addLocalFavorite = async (track) => {
    if (!window.ytClient) return;
    await window.ytClient.addLocalFavorite(track);
    await loadLocalFavorites();
  };

  const removeLocalFavorite = async (videoId) => {
    if (!window.ytClient) return;
    await window.ytClient.removeLocalFavorite(videoId);
    await loadLocalFavorites();
  };

  const loadLibrary = async () => {
    if (!window.ytClient) return;
    setLoading(true);
    try {
      const lib = await window.ytClient.getLibrary();
      setPlaylists(lib.playlists || []);
    } catch (err) {
      console.warn('Library load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (cookies) => {
    if (!window.ytClient) return false;
    try {
      await window.ytClient.saveCookies(cookies);
      setIsAuthenticated(true);
      await loadLibrary();
      return true;
    } catch (err) {
      throw err;
    }
  };

  const logout = async () => {
    if (!window.ytClient) return;
    await window.ytClient.clearCookies();
    setIsAuthenticated(false);
    setPlaylists([]);
  };

  return (
    <LibraryContext.Provider value={{ 
      isAuthenticated, 
      playlists, 
      localFavorites,
      loading, 
      login, 
      logout, 
      loadLibrary,
      addLocalFavorite,
      removeLocalFavorite
    }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider');
  return ctx;
}
