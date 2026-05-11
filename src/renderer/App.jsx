import React, { useRef, useEffect } from 'react';
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
import AuthModal from './components/AuthModal.jsx';
import AboutModal from './components/AboutModal.jsx';

function AppShell() {
  const { state, dispatch } = usePlayer();
  const audioRef = useRef(null);

  // Sync audio element with player state
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

    return () => {
      isCancelled = true;
    };
  }, [state.currentTrack?.videoId]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (state.isPlaying) {
      audioRef.current.play().catch(console.warn);
    } else {
      audioRef.current.pause();
    }
  }, [state.isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.volume;
    }
  }, [state.volume]);

  // Media key support
  useEffect(() => {
    if (window.ytClient?.onMediaKey) {
      window.ytClient.onMediaKey((action) => {
        if (action === 'playpause') dispatch({ type: 'TOGGLE_PLAY' });
        if (action === 'next') dispatch({ type: 'NEXT_TRACK' });
        if (action === 'prev') dispatch({ type: 'PREV_TRACK' });
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
    dispatch({ type: 'NEXT_TRACK' });
  };

  const handleSeek = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

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
