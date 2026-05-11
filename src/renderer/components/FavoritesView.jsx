import React, { useState, useEffect, useRef } from 'react';
import { useLibrary } from '../store/LibraryContext.jsx';
import { usePlayer } from '../store/PlayerContext.jsx';
import TrackCard from './TrackCard.jsx';

export default function FavoritesView() {
  const { localFavorites, toggleFavorite } = useLibrary();
  const { dispatch } = usePlayer();
  const [viewMode, setViewMode] = useState('list');
  const [scrolled, setScrolled] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current?.parentElement;
    if (!container) return;
    const handleScroll = () => setScrolled(container.scrollTop > 10);
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const playAll = async () => {
    if (!localFavorites || localFavorites.length === 0) return;
    
    // Play the first track and queue the rest
    const firstTrack = localFavorites[0];
    try {
      const streamUrl = await window.ytClient.getStreamUrl(firstTrack.videoId);
      dispatch({
        type: 'PLAY_TRACK',
        payload: { track: { ...firstTrack, streamUrl }, queue: localFavorites },
      });
    } catch (err) {
      console.error('Failed to play favorites:', err);
    }
  };

  const playTrack = async (track, index) => {
    try {
      const streamUrl = await window.ytClient.getStreamUrl(track.videoId);
      
      // If clicking a specific track, we play it and queue the rest of the favorites starting from this track
      const newQueue = localFavorites.slice(index);
      dispatch({
        type: 'PLAY_TRACK',
        payload: { track: { ...track, streamUrl }, queue: newQueue },
      });
    } catch (err) {
      console.error('Failed to play track:', err);
    }
  };

  return (
    <div className="favorites-view" ref={containerRef} style={{ padding: '24px' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '8px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        paddingTop: '16px',
        paddingBottom: '16px',
        marginTop: '-24px',
        marginLeft: '-24px',
        marginRight: '-24px',
        paddingLeft: '24px',
        paddingRight: '24px',
        background: scrolled ? 'rgba(15, 15, 19, 0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : 'none',
        transition: 'all 0.2s ease'
      }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '2rem', fontWeight: 800 }}>Local Favorites</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {localFavorites?.length > 0 ? `${localFavorites.length} saved track${localFavorites.length !== 1 ? 's' : ''}` : 'Your saved tracks'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>
          {localFavorites && localFavorites.length > 0 && (
            <button className="btn-primary" onClick={playAll}>
              <span style={{ marginRight: '8px' }}>▶</span> Play All
            </button>
          )}
        </div>
      </div>

      {!localFavorites || localFavorites.length === 0 ? (
        <div className="empty-state" style={{ marginTop: '64px' }}>
          <div className="empty-state-icon" style={{ fontSize: '3rem' }}>⭐</div>
          <h3 style={{ margin: '16px 0 8px', color: 'var(--text-primary)' }}>No favorites yet</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Add some tracks to your local favorites!</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="songs-list" style={{ marginTop: '24px' }}>
          {localFavorites.map((track, i) => (
            <button
              key={`${track.videoId}-${i}`}
              className="song-row"
              onClick={() => playTrack(track, i)}
            >
              <span className="song-index">{i + 1}</span>
              <div className="song-thumb">
                <img
                  src={track.thumbnails?.[track.thumbnails.length - 1]?.url || track.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`}
                  alt={track.name}
                  onError={e => { e.target.src = `https://i.ytimg.com/vi/${track.videoId}/default.jpg`; }}
                />
                <div className="song-thumb-overlay">▶</div>
              </div>
              <div className="song-info">
                <span className="song-name">{track.name}</span>
                <span className="song-artist">
                  {track.artist?.name || track.artists?.[0]?.name || 'Unknown'}
                </span>
              </div>
              <button
                className="song-queue-btn"
                title="Remove from favorites"
                onClick={e => { 
                  e.stopPropagation(); 
                  toggleFavorite(track); 
                }}
              >
                ✕
              </button>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '24px', marginTop: '24px' }}>
          {localFavorites.map((track, i) => (
            <div key={`${track.videoId}-${i}`} className="history-track-wrapper" style={{ position: 'relative' }}>
              <TrackCard 
                track={track} 
                onClick={() => playTrack(track, i)}
                onAddToQueue={() => dispatch({ type: 'ADD_TO_QUEUE', payload: track })}
              />
              <button
                className="history-remove-btn"
                title="Remove from favorites"
                onClick={e => { 
                  e.stopPropagation(); 
                  toggleFavorite(track); 
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
