import React from 'react';
import { usePlayer } from '../store/PlayerContext.jsx';
import { useLibrary } from '../store/LibraryContext.jsx';
import logo from '../assets/logo.png';

const NavItem = ({ icon, label, viewId, currentView, onClick }) => (
  <button
    className={`nav-item ${currentView === viewId ? 'active' : ''}`}
    onClick={() => onClick(viewId)}
    title={label}
  >
    <span className="nav-icon">{icon}</span>
    <span className="nav-label">{label}</span>
  </button>
);

export default function Sidebar() {
  const { state, dispatch } = usePlayer();
  const { isAuthenticated, playlists, loading, localFavorites = [] } = useLibrary();

  const navigate = (view) => dispatch({ type: 'SET_VIEW', payload: view });

  const playPlaylist = async (playlistId) => {
    if (!window.ytClient) return;
    try {
      const playlist = await window.ytClient.getPlaylistTracks(playlistId);
      if (playlist?.tracks?.length > 0) {
        const firstTrack = playlist.tracks[0];
        const streamUrl = await window.ytClient.getStreamUrl(firstTrack.videoId);
        dispatch({
          type: 'PLAY_TRACK',
          payload: {
            track: { ...firstTrack, streamUrl },
            queue: playlist.tracks,
          },
        });
      }
    } catch (err) {
      console.error('Playlist play error:', err);
    }
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon" style={{ background: 'transparent' }}>
          <img src={logo} alt="Aura Logo" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
        </div>
        <span className="logo-text">Aura Music <span className="beta-badge">Beta</span></span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <NavItem icon="🏠" label="Home" viewId="home" currentView={state.currentView} onClick={navigate} />
        <NavItem icon="🔍" label="Search" viewId="search" currentView={state.currentView} onClick={navigate} />
        <NavItem icon="🕒" label="History" viewId="history" currentView={state.currentView} onClick={navigate} />
        <NavItem icon="⚙️" label="Settings" viewId="settings" currentView={state.currentView} onClick={navigate} />
      </nav>

      {/* Library Section */}
      <div className="sidebar-library">
        <div className="library-header">
          <span className="library-title">Your Library</span>
          <button
            className="btn-connect"
            onClick={() => dispatch({ type: 'TOGGLE_AUTH_MODAL' })}
            title={isAuthenticated ? "Manage Account" : "Connect account"}
            style={{ opacity: isAuthenticated ? 0.7 : 1 }}
          >
            {isAuthenticated ? 'Manage' : 'Connect'}
          </button>
        </div>

        {!isAuthenticated && localFavorites.length === 0 && (
          <div className="library-empty">
            <div className="library-empty-icon">🔐</div>
            <p>Connect your account or save songs locally to see them here.</p>
            <button
              className="btn-primary"
              onClick={() => dispatch({ type: 'TOGGLE_AUTH_MODAL' })}
            >
              Connect Account
            </button>
          </div>
        )}

        {isAuthenticated && loading && (
          <div className="library-loading">
            <div className="spinner" />
          </div>
        )}

        <div className="playlist-list">
          {/* Always show Local Favorites if it exists */}
          {localFavorites && localFavorites.length > 0 && (
            <button
              className="playlist-item"
              onClick={() => navigate('favorites')}
              title="Local Favorites"
            >
              <div className="playlist-thumb">
                <span style={{ fontSize: '1.5rem' }}>❤️</span>
              </div>
              <div className="playlist-info">
                <span className="playlist-name">Local Favorites</span>
                <span className="playlist-count">{localFavorites.length} tracks</span>
              </div>
            </button>
          )}

          {/* Show Cloud Playlists if authenticated */}
          {isAuthenticated && !loading && playlists.map((pl) => (
            <button
              key={pl.playlistId || pl.id}
              className="playlist-item"
              onClick={() => playPlaylist(pl.playlistId || pl.id)}
              title={pl.title || pl.name}
            >
              <div className="playlist-thumb">
                {pl.thumbnails?.[0]?.url ? (
                  <img src={pl.thumbnails[0].url} alt={pl.title} />
                ) : (
                  <span>🎵</span>
                )}
              </div>
              <div className="playlist-info">
                <span className="playlist-name">{pl.title || pl.name}</span>
                <span className="playlist-count">{pl.count || ''} tracks</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-bottom" style={{ marginTop: 'auto', padding: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_ABOUT_MODAL' })}
          title="About Aura"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            background: 'linear-gradient(135deg, rgba(208,188,255,0.1) 0%, rgba(147,112,219,0.05) 100%)',
            border: '1px solid rgba(208,188,255,0.2)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textAlign: 'left'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(208,188,255,0.2) 0%, rgba(147,112,219,0.1) 100%)';
            e.currentTarget.style.borderColor = 'rgba(208,188,255,0.4)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(208,188,255,0.1) 0%, rgba(147,112,219,0.05) 100%)';
            e.currentTarget.style.borderColor = 'rgba(208,188,255,0.2)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.1rem', filter: 'grayscale(0)' }}>✨</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>About Aura</span>
          </div>
          <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>→</span>
        </button>
      </div>
    </aside>
  );
}
