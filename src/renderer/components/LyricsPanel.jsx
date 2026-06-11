import React, { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../store/PlayerContext.jsx';

// Parse LRC format: [mm:ss.xx] lyric line
function parseLRC(lrc) {
  if (!lrc) return [];
  const lines = lrc.split('\n');
  const parsed = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

  for (const line of lines) {
    const matches = [...line.matchAll(timeRegex)];
    if (!matches.length) continue;
    const text = line.replace(timeRegex, '').trim();
    for (const match of matches) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const frac = parseInt(match[3], 10);
      const divisor = match[3].length === 3 ? 1000 : 100;
      const time = minutes * 60 + seconds + frac / divisor;
      parsed.push({ time, text });
    }
  }

  return parsed.sort((a, b) => a.time - b.time);
}

// Binary-search for the active line index given a timestamp
function getActiveLine(lines, currentTime) {
  if (!lines.length) return -1;
  let lo = 0, hi = lines.length - 1, idx = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= currentTime) {
      idx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return idx;
}

export default function LyricsPanel() {
  const { state, dispatch } = usePlayer();
  const track = state.currentTrack;

  const [lyrics, setLyrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('synced');
  const [lastVideoId, setLastVideoId] = useState(null);
  // Use RAF-driven local time for tight sync (avoids ~250ms state lag)
  const [liveTime, setLiveTime] = useState(0);

  const containerRef = useRef(null);
  const activeLineRef = useRef(null);
  const rafRef = useRef(null);
  const parsedLines = lyrics?.synced ? parseLRC(lyrics.synced) : [];
  const activeIndex = mode === 'synced' ? getActiveLine(parsedLines, liveTime) : -1;

  // RAF loop: read currentTime directly from audio element for frame-accurate sync
  useEffect(() => {
    const tick = () => {
      const audio = window.__audioRef?.current;
      if (audio && !audio.paused && !audio.ended) {
        setLiveTime(audio.currentTime);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Fetch lyrics when track changes
  useEffect(() => {
    if (!track?.videoId || track.videoId === lastVideoId) return;

    setLastVideoId(track.videoId);
    setLyrics(null);
    setLoading(true);
    setMode('synced');
    setLiveTime(0);

    const fetchLyrics = async () => {
      try {
        const result = await window.ytClient.getLyrics(track);
        setLyrics(result);
        if (!result?.synced && result?.plain) setMode('plain');
      } catch (err) {
        console.warn('[LyricsPanel] fetch error:', err);
        setLyrics({ synced: null, plain: null, source: null });
      } finally {
        setLoading(false);
      }
    };

    fetchLyrics();
  }, [track?.videoId]);

  // Auto-scroll: center the active line smoothly
  useEffect(() => {
    if (mode !== 'synced' || !activeLineRef.current || !containerRef.current) return;
    
    const container = containerRef.current;
    const line = activeLineRef.current;
    
    // Safely calculate target scroll position to avoid whole-page scrolling bugs with scrollIntoView
    const containerRect = container.getBoundingClientRect();
    const lineRect = line.getBoundingClientRect();
    
    const relativeTop = lineRect.top - containerRect.top;
    const targetScrollTop = container.scrollTop + relativeTop - (container.clientHeight / 2) + (line.clientHeight / 2);
    
    container.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });
  }, [activeIndex, mode]);

  const hasSynced = Boolean(lyrics?.synced);
  const hasPlain = Boolean(lyrics?.plain);
  const hasAnything = hasSynced || hasPlain;

  return (
    <div className="lyrics-panel">
      {/* Header */}
      <div className="lyrics-header">
        <div className="lyrics-header-left">
          <span className="lyrics-title">Lyrics</span>
          {hasAnything && <span className="lyrics-source">lrclib.net</span>}
        </div>
        <div className="lyrics-header-right">
          {hasSynced && hasPlain && (
            <div className="lyrics-mode-toggle">
              <button
                className={`lyrics-mode-btn ${mode === 'synced' ? 'active' : ''}`}
                onClick={() => setMode('synced')}
              >Synced</button>
              <button
                className={`lyrics-mode-btn ${mode === 'plain' ? 'active' : ''}`}
                onClick={() => setMode('plain')}
              >Plain</button>
            </div>
          )}
          <button
            className="lyrics-close-btn"
            onClick={() => dispatch({ type: 'TOGGLE_LYRICS' })}
            title="Close Lyrics"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Now Playing mini-info */}
      {track && (
        <div className="lyrics-track-info">
          <img
            className="lyrics-track-thumb"
            src={
              track.thumbnails?.[track.thumbnails.length - 1]?.url ||
              `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`
            }
            alt={track.name}
            onError={e => { e.target.src = `https://i.ytimg.com/vi/${track.videoId}/default.jpg`; }}
          />
          <div className="lyrics-track-meta">
            <span className="lyrics-track-name">{track.name || 'Unknown Track'}</span>
            <span className="lyrics-track-artist">
              {track.artist?.name || track.artists?.[0]?.name || 'Unknown Artist'}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="lyrics-body" ref={containerRef}>
        {loading && (
          <div className="lyrics-state">
            <div className="spinner-large" />
            <p className="lyrics-state-text">Finding lyrics…</p>
          </div>
        )}

        {!loading && !hasAnything && (
          <div className="lyrics-state">
            <div className="lyrics-not-found-icon">🎵</div>
            <p className="lyrics-state-text">No lyrics found</p>
            <p className="lyrics-state-sub">for "{track?.name || 'this track'}"</p>
          </div>
        )}

        {!loading && hasAnything && mode === 'synced' && parsedLines.length > 0 && (
          <div className="lyrics-lines">
            <div className="lyrics-spacer" />
            {parsedLines.map((line, i) => {
              const dist = Math.abs(i - activeIndex);
              const isActive = i === activeIndex;
              const isPast = i < activeIndex;
              return (
                <div
                  key={i}
                  ref={isActive ? activeLineRef : null}
                  className={`lyrics-line ${isActive ? 'lyrics-line--active' : ''} ${isPast ? 'lyrics-line--past' : ''}`}
                  style={{
                    opacity: isActive ? 1 : Math.max(0.18, 1 - dist * 0.17),
                    transform: isActive
                      ? 'scale(1) translateX(0)'
                      : `scale(${Math.max(0.85, 1 - dist * 0.03)}) translateX(0)`,
                  }}
                  onClick={() => {
                    if (window.__audioRef?.current) {
                      window.__audioRef.current.currentTime = line.time;
                      setLiveTime(line.time);
                    }
                  }}
                >
                  {line.text || <span className="lyrics-instrumental">♪</span>}
                </div>
              );
            })}
            <div className="lyrics-spacer" />
          </div>
        )}

        {!loading && hasAnything && mode === 'plain' && (
          <div className="lyrics-plain">
            {(lyrics.plain || '').split('\n').map((line, i) => (
              <p key={i} className={`lyrics-plain-line ${line === '' ? 'lyrics-plain-break' : ''}`}>
                {line || '\u00A0'}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
