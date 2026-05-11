import React from 'react';
import { usePlayer } from '../store/PlayerContext.jsx';

export default function QueuePanel() {
  const { state, dispatch } = usePlayer();

  return (
    <div className="queue-panel">
      <div className="queue-header">
        <h3 className="queue-title">Queue</h3>
        <button className="queue-close-btn" onClick={() => dispatch({ type: 'TOGGLE_QUEUE' })}>✕</button>
      </div>

      <div className="queue-list-section">
        <span className="queue-section-label">Up Next ({state.queue.length})</span>
        <div className="queue-list">
          {state.queue.length === 0 && (
            <div className="queue-empty">
              <span>Queue is empty</span>
              <p>Add songs to start building your queue.</p>
            </div>
          )}
          {state.queue.map((track, idx) => {
            const isCurrent = state.currentTrack?.videoId === track.videoId;
            return (
              <div
                key={`${track.videoId}-${idx}`}
                className={`queue-item ${isCurrent ? 'queue-item--active' : ''}`}
                onClick={() => dispatch({ type: 'JUMP_TO_TRACK', payload: idx })}
                style={{ cursor: 'pointer' }}
              >
                <img
                  src={track.thumbnails?.[track.thumbnails.length - 1]?.url || track.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`}
                  alt={track.name}
                  className="queue-item-thumb"
                  onError={e => { 
                    if (!e.target.src.includes('default.jpg')) {
                      e.target.src = `https://i.ytimg.com/vi/${track.videoId}/default.jpg`;
                    }
                  }}
                />
                <div className="queue-item-info">
                  <span className="queue-item-name">{track.name}</span>
                  <span className="queue-item-artist">
                    {track.artist?.name || track.artists?.[0]?.name || 'Unknown'}
                  </span>
                </div>
                <button
                  className="queue-item-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'REMOVE_FROM_QUEUE', payload: idx });
                  }}
                  title="Remove from queue"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
