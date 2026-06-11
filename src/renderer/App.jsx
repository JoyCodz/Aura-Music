import React, { useRef, useEffect, useCallback } from 'react';
import { PlayerProvider, usePlayer } from './store/PlayerContext.jsx';
import { LibraryProvider } from './store/LibraryContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import HomeView from './components/HomeView.jsx';
import SearchView from './components/SearchView.jsx';
import HistoryView from './components/HistoryView.jsx';
import SettingsView from './components/SettingsView.jsx';
import FavoritesView from './components/FavoritesView.jsx';
import ArtistView from './components/ArtistView.jsx';
import NowPlayingBar from './components/NowPlayingBar.jsx';
import QueuePanel from './components/QueuePanel.jsx';
import LyricsPanel from './components/LyricsPanel.jsx';
import AuthModal from './components/AuthModal.jsx';
import AboutModal from './components/AboutModal.jsx';

function AppShell() {
  const { state, dispatch } = usePlayer();
  const audioRef = useRef(null);

  // Expose audioRef globally so LyricsPanel can seek on line click
  useEffect(() => {
    window.__audioRef = audioRef;
  }, []);

  // Sync audio element with player state
  // We also track a "playKey" so repeat-one (same videoId) still triggers a re-fetch.
  useEffect(() => {
    if (!audioRef.current || !state.currentTrack?.videoId) return;

    let isCancelled = false;
    
    // Pause immediately so we don't hear the previous track while fetching
    audioRef.current.pause();
    audioRef.current.src = '';

    const loadStream = async () => {
      try {
        const url = await window.ytClient.getStreamUrl(state.currentTrack.videoId);
        if (isCancelled) return;
        
        audioRef.current.src = url;
        if (state.isPlaying) {
          audioRef.current.play().catch(e => console.warn('Play error:', e));
        }
      } catch (err) {
        console.error('Failed to get stream URL:', err);
      }
    };

    loadStream();

    // --- OS Media Session API (Linux MPRIS + Windows media overlay) ---
    if ('mediaSession' in navigator && state.currentTrack) {
      const track = state.currentTrack;
      const artwork = [];
      if (track.thumbnails?.length) {
        track.thumbnails.forEach(t => {
          if (t?.url) artwork.push({ src: t.url, sizes: '512x512', type: 'image/jpeg' });
        });
      } else if (track.videoId) {
        artwork.push({ src: `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`, sizes: '480x360', type: 'image/jpeg' });
      }
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.name || 'Unknown Track',
        artist: track.artist?.name || track.artists?.[0]?.name || 'Unknown Artist',
        album: track.album?.name || '',
        artwork,
      });
    }

    return () => {
      isCancelled = true;
    };
  }, [state.currentTrack?.videoId, state.currentTrack]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (state.isPlaying) {
      audioRef.current.play().catch(console.warn);
    } else {
      audioRef.current.pause();
    }
    // Update OS media session playback state
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = state.isPlaying ? 'playing' : 'paused';
    }
  }, [state.isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.volume;
    }
  }, [state.volume]);

  // Media key support (Electron globalShortcut) + navigator.mediaSession action handlers
  useEffect(() => {
    if (window.ytClient?.onMediaKey) {
      window.ytClient.onMediaKey((action) => {
        if (action === 'playpause') dispatch({ type: 'TOGGLE_PLAY' });
        if (action === 'next') dispatch({ type: 'NEXT_TRACK' });
        if (action === 'prev') dispatch({ type: 'PREV_TRACK' });
      });
    }
    // Register navigator.mediaSession handlers for OS media controls
    // Works on Linux (MPRIS2) and Windows (system media transport controls)
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => dispatch({ type: 'SET_PLAYING', payload: true }));
      navigator.mediaSession.setActionHandler('pause', () => dispatch({ type: 'SET_PLAYING', payload: false }));
      navigator.mediaSession.setActionHandler('nexttrack', () => dispatch({ type: 'NEXT_TRACK' }));
      navigator.mediaSession.setActionHandler('previoustrack', () => dispatch({ type: 'PREV_TRACK' }));
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (audioRef.current && details.seekTime != null) {
          audioRef.current.currentTime = details.seekTime;
        }
      });
    }
  }, []);

  useEffect(() => {
    if (state.currentTrack) {
      window.ytClient?.addToHistory(state.currentTrack);
    }
  }, [state.currentTrack?.videoId]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      dispatch({
        type: 'SET_PROGRESS',
        payload: {
          currentTime: audioRef.current.currentTime,
          duration: audioRef.current.duration || 0,
        },
      });
    }
  };

  const handleEnded = () => {
    // For repeat-one: replay directly on the audio element (same videoId, no re-fetch needed)
    if (state.repeat === 'one') {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.warn);
      return;
    }
    dispatch({ type: 'NEXT_TRACK' });
  };

  const handleSeek = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  // Update media session position state whenever time changes
  useEffect(() => {
    if ('mediaSession' in navigator && state.duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: state.duration,
          playbackRate: 1,
          position: Math.min(state.currentTime, state.duration),
        });
      } catch (_) { /* setPositionState not supported on all platforms */ }
    }
  }, [state.currentTime, state.duration]);

  const track = state.currentTrack;
  const bgImage = track?.thumbnails?.[0]?.url || (track?.videoId ? `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg` : null);

  return (
    <div className="app-container">
      <div 
        className="dynamic-bg" 
        style={{ backgroundImage: bgImage ? `url(${bgImage})` : 'none' }}
      />
      <div className="dynamic-bg-overlay" />

      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          {state.currentView === 'home' && <HomeView />}
          {state.currentView === 'search' && <SearchView />}
          {state.currentView === 'history' && <HistoryView />}
          {state.currentView === 'favorites' && <FavoritesView />}
          {state.currentView === 'settings' && <SettingsView />}
          {state.currentView === 'artist' && <ArtistView artistId={state.viewData} />}
        </main>

        {state.queueOpen && <QueuePanel />}
        {state.lyricsOpen && <LyricsPanel />}
      </div>

      <NowPlayingBar onSeek={handleSeek} />

      {state.authModalOpen && <AuthModal />}
      {state.aboutModalOpen && <AboutModal />}

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={(e) => console.error('Audio error:', e)}
        preload="none"
        style={{ display: 'none' }}
      />
    </div>
  );
}

export default function App() {
  return (
    <LibraryProvider>
      <PlayerProvider>
        <AppShell />
      </PlayerProvider>
    </LibraryProvider>
  );
}
