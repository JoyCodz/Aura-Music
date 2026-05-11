import React, { useEffect, useState } from 'react';
import { usePlayer } from '../store/PlayerContext.jsx';
import TrackCard from './TrackCard.jsx';

export default function HistoryView() {
  const { state, dispatch } = usePlayer();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');

  const loadHistory = async () => {
    if (!window.ytClient) return;
    const h = await window.ytClient.getHistory();
    setHistory(h || []);
    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, [state.currentTrack?.videoId]);

  const playTrack = async (track, index) => {
    if (!window.ytClient) return;
    const streamUrl = await window.ytClient.getStreamUrl(track.videoId);
    dispatch({
      type: 'PLAY_TRACK',
      payload: { track: { ...track, streamUrl }, queue: history },
    });
    dispatch({ type: 'JUMP_TO_TRACK', payload: index });
  };

  const clearHistory = async () => {
    if (!window.ytClient) return;
    await window.ytClient.clearHistory();
    setHistory([]);
  };

  const removeTrack = async (videoId, e) => {
    e.stopPropagation();
    if (!window.ytClient?.removeFromHistory) {
      alert("Please restart your 'npm run dev' terminal for the new delete function to load!");
      return;
    }
    await window.ytClient.removeFromHistory(videoId);
    setHistory(prev => prev.filter(t => t.videoId !== videoId));
  };

  return (
    <div className="music-section" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Listening History</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
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
          <button 
            onClick={clearHistory}
            className="btn-secondary" 
            style={{ padding: '8px 16px', borderRadius: '100px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            Clear History
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '48px' }}>
          Your history is empty. Start playing some music!
        </div>
      ) : viewMode === 'list' ? (
        <div className="songs-list">
          {history.map((track, idx) => (
            <button
              key={`${track.videoId}-${idx}`}
              className="song-row"
              onClick={() => playTrack(track, idx)}
            >
              <span className="song-index">{idx + 1}</span>
              <div className="song-thumb">
                <img
                  src={track.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${track.videoId}/default.jpg`}
                  alt={track.name}
                  onError={e => { e.target.style.display='none'; }}
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
                title="Remove from history"
                onClick={(e) => removeTrack(track.videoId, e)}
              >
                ✕
              </button>
            </button>
          ))}
        </div>
      ) : (
        <div className="tracks-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '24px' }}>
          {history.map((track, idx) => (
            <div key={`${track.videoId}-${idx}`} className="history-track-wrapper" style={{ position: 'relative', width: 'max-content' }}>
              <TrackCard
                track={track}
                onClick={() => playTrack(track, idx)}
                onAddToQueue={() => dispatch({ type: 'ADD_TO_QUEUE', payload: track })}
              />
              <button
                className="history-remove-btn"
                onClick={(e) => removeTrack(track.videoId, e)}
                title="Remove from history"
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
