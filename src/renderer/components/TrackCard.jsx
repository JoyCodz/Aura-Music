import React, { useState } from 'react';
import { usePlayer } from '../store/PlayerContext.jsx';

export default function TrackCard({ track, onClick, onAddToQueue }) {
  const { state, dispatch } = usePlayer();
  const [hovered, setHovered] = useState(false);
  const isPlaying = state.currentTrack?.videoId === track.videoId && state.isPlaying;

  const thumb = track.thumbnails?.[0]?.url
    || `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`;

  const getArtists = () => {
    if (track.artists && track.artists.length > 0) {
      return track.artists.map(a => ({
        name: a.name || a,
        id: a.artistId || null
      }));
    }
    if (track.artist) {
      if (typeof track.artist === 'string') {
        const artistStr = track.artist;
        const parts = artistStr.split(/,\s*|\s+&\s*|\s+ft\.?\s*|\s+feat\.?\s*|\s+featuring\s*/i);
        return parts.map(name => ({ name: name.trim(), id: null })).filter(a => a.name);
      }
      return [{ name: track.artist.name, id: track.artist.artistId || null }];
    }
    return [{ name: 'Unknown Artist', id: null }];
  };

  const artists = getArtists();

  const handleArtistClick = (e, artist) => {
    e.stopPropagation();
    if (artist.id) {
      dispatch({ type: 'SET_VIEW', payload: { view: 'artist', data: artist.id } });
    }
  };

  return (
    <div
      className={`track-card ${isPlaying ? 'track-card--playing' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="track-card__thumb" onClick={onClick}>
        <img
          src={thumb}
          alt={track.name}
          onError={e => { e.target.src = `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`; }}
        />
        {(hovered || isPlaying) && (
          <div className="track-card__overlay">
            {isPlaying ? (
              <div className="playing-bars">
                <span /><span /><span />
              </div>
            ) : (
              <div className="play-btn-overlay">▶</div>
            )}
          </div>
        )}
        {isPlaying && <div className="now-playing-indicator" />}
        {hovered && (
          <button
            className="track-card__queue-btn"
            onClick={e => { e.stopPropagation(); onAddToQueue?.(); }}
            title="Add to queue"
          >
            +
          </button>
        )}
      </div>
      <div className="track-card__info">
        <span className="track-card__name" title={track.name}>{track.name}</span>
        <span className="track-card__artist">
          {artists.map((artist, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span style={{ opacity: 0.6 }}>, </span>}
              {artist.id ? (
                <button
                  className="artist-link"
                  onClick={(e) => handleArtistClick(e, artist)}
                >
                  {artist.name}
                </button>
              ) : (
                <span>{artist.name}</span>
              )}
            </React.Fragment>
          ))}
        </span>
      </div>
    </div>
  );
}
