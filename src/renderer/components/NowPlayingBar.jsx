import React, { useRef, useState, useEffect } from 'react';
import { usePlayer } from '../store/PlayerContext.jsx';
import { useLibrary } from '../store/LibraryContext.jsx';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const QUALITY_LABELS = {
  high: 'HQ',
  medium: 'MQ',
  low: 'LQ',
  lowest: 'LQ'
};

export default function NowPlayingBar({ onSeek }) {
  const { state, dispatch } = usePlayer();
  const { localFavorites = [], addLocalFavorite, removeLocalFavorite } = useLibrary();
  const progressRef = useRef(null);
  const [audioQuality, setAudioQuality] = useState('high');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (!window.ytClient?.getSettings) return;
      const settings = await window.ytClient.getSettings();
      if (settings?.audioQuality) setAudioQuality(settings.audioQuality);
    };
    loadSettings();
  }, []);

  const track = state.currentTrack;
  const isFavorite = track ? localFavorites.some(t => t.videoId === track.videoId) : false;

  const toggleFavorite = () => {
    if (!track) return;
    if (isFavorite) {
      removeLocalFavorite(track.videoId);
    } else {
      addLocalFavorite(track);
    }
  };

  const handleDownload = async () => {
    if (!track || !window.ytClient) return;
    alert(`Downloading ${track.name}... It will be saved to Downloads/AuraMusic.`);
    const success = await window.ytClient.downloadTrack(track);
    if (success) {
      alert(`Download complete: ${track.name}`);
    } else {
      alert(`Download failed for: ${track.name}`);
    }
  };

  const handleShare = () => {
    if (!track?.videoId) return;
    const url = `https://music.youtube.com/watch?v=${track.videoId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }).catch(() => {
      // Fallback for environments without clipboard API
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  const handleProgressClick = (e) => {
    if (!progressRef.current || !state.duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(ratio * state.duration);
  };

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  return (
    <div className={`now-playing-bar ${track ? 'has-track' : ''}`}>
      {/* Track Info */}
      <div className="npb-left">
        {track ? (
          <>
            <div className="npb-thumb">
              <img
                src={track.thumbnails?.[track.thumbnails.length - 1]?.url || track.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`}
                alt={track.name}
                onError={e => { 
                  if (e.target.src.includes('default.jpg')) {
                    e.target.style.display = 'none';
                  } else {
                    e.target.src = `https://i.ytimg.com/vi/${track.videoId}/default.jpg`;
                  }
                }}
              />
              {state.isPlaying && (
                <div className="npb-thumb-playing">
                  <div className="playing-bars-small">
                    <span /><span /><span />
                  </div>
                </div>
              )}
            </div>
            <div className="npb-info">
              <div className="marquee-container">
                <span className="npb-track-name marquee-content">{track.name || 'Unknown Track'}</span>
              </div>
              <div className="marquee-container">
                <span 
                  className="npb-artist marquee-content"
                  style={{ cursor: (track.artist?.artistId || track.artists?.[0]?.artistId) ? 'pointer' : 'default' }}
                  onClick={() => {
                    const aId = track.artist?.artistId || track.artists?.[0]?.artistId;
                    if (aId) dispatch({ type: 'SET_VIEW', payload: { view: 'artist', data: aId } });
                  }}
                >
                  {track.artist?.name || track.artists?.[0]?.name || 'Unknown Artist'}
                </span>
              </div>
            </div>
            <button 
              className={`ctrl-btn ${isFavorite ? 'ctrl-btn--active' : ''}`} 
              onClick={toggleFavorite}
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              style={{ color: isFavorite ? 'var(--accent-color)' : 'var(--text-secondary)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                {isFavorite ? (
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                ) : (
                  <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/>
                )}
              </svg>
            </button>
            <button 
              className="ctrl-btn" 
              onClick={handleDownload}
              title="Download Track (MP3)"
              style={{ color: 'var(--text-secondary)', marginLeft: '-8px' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
            </button>
            {/* Share button */}
            <div className="npb-share-wrap">
              <button 
                className={`ctrl-btn ${copied ? 'ctrl-btn--active' : ''}`}
                onClick={handleShare}
                title="Share Song Link"
                style={{ color: copied ? 'var(--accent-color)' : 'var(--text-secondary)', marginLeft: '-8px' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
                </svg>
              </button>
              {copied && <div className="npb-copied-toast">Copied!</div>}
            </div>
            <div className="npb-quality-badge">{QUALITY_LABELS[audioQuality] || 'HQ'}</div>
          </>
        ) : (
          <div className="npb-empty">
            <span>No track playing</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="npb-center">
        <div className="npb-controls">
          <button
            className={`ctrl-btn ${state.shuffle ? 'ctrl-btn--active' : ''}`}
            onClick={() => dispatch({ type: 'TOGGLE_SHUFFLE' })}
            title="Shuffle"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
            </svg>
          </button>

          <button
            className="ctrl-btn ctrl-btn--md"
            onClick={() => {
              if (state.currentTime > 3) {
                onSeek(0);
              } else {
                dispatch({ type: 'PREV_TRACK' });
              }
            }}
            title="Previous"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          <button
            className="ctrl-btn ctrl-btn--play"
            onClick={() => dispatch({ type: 'TOGGLE_PLAY' })}
            title={state.isPlaying ? 'Pause' : 'Play'}
          >
            {state.isPlaying ? (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          <button
            className="ctrl-btn ctrl-btn--md"
            onClick={() => dispatch({ type: 'NEXT_TRACK' })}
            title="Next"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>

          <button
            className={`ctrl-btn ${state.repeat !== 'none' ? 'ctrl-btn--active' : ''}`}
            onClick={() => dispatch({ type: 'TOGGLE_REPEAT' })}
            title={`Repeat: ${state.repeat}`}
          >
            {state.repeat === 'one' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
              </svg>
            )}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="npb-progress-wrap">
          <span className="npb-time">{formatTime(state.currentTime)}</span>
          <div
            ref={progressRef}
            className="npb-progress"
            onClick={handleProgressClick}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="npb-progress-bg" />
            <div className="npb-progress-fill" style={{ width: `${progress}%` }} />
            <div className="npb-progress-thumb" style={{ left: `${progress}%` }} />
          </div>
          <span className="npb-time">{formatTime(state.duration)}</span>
        </div>
      </div>

      {/* Volume & Queue */}
      <div className="npb-right">
        <button
          className={`ctrl-btn ${state.queueOpen ? 'ctrl-btn--active' : ''}`}
          onClick={() => dispatch({ type: 'TOGGLE_QUEUE' })}
          title="Queue"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
          </svg>
        </button>

        <div className="npb-volume">
          <button className="ctrl-btn" onClick={() => dispatch({ type: 'SET_VOLUME', payload: state.volume === 0 ? 0.8 : 0 })} title="Mute">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              {state.volume === 0 ? (
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
              ) : state.volume < 0.5 ? (
                <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
              ) : (
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              )}
            </svg>
          </button>
          <input
            type="range"
            className="volume-slider"
            min={0}
            max={1}
            step={0.01}
            value={state.volume}
            onChange={e => dispatch({ type: 'SET_VOLUME', payload: parseFloat(e.target.value) })}
            title={`Volume: ${Math.round(state.volume * 100)}%`}
          />
        </div>
      </div>
    </div>
  );
}
