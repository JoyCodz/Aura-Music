import React, { useEffect, useState } from 'react';
import { usePlayer } from '../store/PlayerContext.jsx';
import TrackCard from './TrackCard.jsx';

export default function ArtistView({ artistId }) {
  const { dispatch } = usePlayer();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArtist = async () => {
      if (!window.ytClient || !artistId) return;
      setLoading(true);
      try {
        const data = await window.ytClient.getArtist(artistId);
        setArtist(data);
      } catch (err) {
        console.error('Failed to fetch artist:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchArtist();
  }, [artistId]);

  const playTrack = async (track, index) => {
    if (!window.ytClient) return;
    try {
      const streamUrl = await window.ytClient.getStreamUrl(track.videoId);
      dispatch({
        type: 'PLAY_TRACK',
        payload: { track: { ...track, streamUrl }, queue: artist.topSongs },
      });
      dispatch({ type: 'JUMP_TO_TRACK', payload: index });
    } catch (err) {
      console.error('Play track error:', err);
    }
  };

  const playAlbum = async (albumId) => {
    if (!window.ytClient) return;
    try {
      const album = await window.ytClient.getAlbum(albumId);
      if (album && album.songs && album.songs.length > 0) {
        const streamUrl = await window.ytClient.getStreamUrl(album.songs[0].videoId);
        dispatch({
          type: 'PLAY_TRACK',
          payload: { track: { ...album.songs[0], streamUrl }, queue: album.songs },
        });
      }
    } catch (err) {
      console.error('Play album error:', err);
    }
  };

  if (loading) {
    return (
      <div className="view-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div className="spinner-large" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="view-container">
        <div className="empty-state">
          <p>Artist not found.</p>
        </div>
      </div>
    );
  }

  const bannerUrl = artist.thumbnails?.[artist.thumbnails.length - 1]?.url || '';

  return (
    <div className="artist-view">
      {/* Artist Banner */}
      <div className="artist-header" style={{ backgroundImage: `url(${bannerUrl})` }}>
        <div className="artist-header-overlay">
          <h1 className="artist-name-large">{artist.name}</h1>
        </div>
      </div>

      <div className="artist-content" style={{ padding: '0 24px 40px 24px' }}>
        {/* Top Songs */}
        {artist.topSongs && artist.topSongs.length > 0 && (
          <div className="music-section">
            <h2 className="section-title">Top Songs</h2>
            <div className="songs-list">
              {artist.topSongs.map((track, idx) => (
                <button
                  key={track.videoId || idx}
                  className="song-row"
                  onClick={() => playTrack(track, idx)}
                >
                  <span className="song-index">{idx + 1}</span>
                  <div className="song-thumb">
                    <img
                      src={track.thumbnails?.[0]?.url || ''}
                      alt={track.name}
                      onError={e => { e.target.style.display='none'; }}
                    />
                    <div className="song-thumb-overlay">▶</div>
                  </div>
                  <div className="song-info">
                    <span className="song-name">{track.name}</span>
                    <span className="song-artist">{artist.name}</span>
                  </div>
                  <button
                    className="song-queue-btn"
                    title="Add to queue"
                    onClick={e => { e.stopPropagation(); dispatch({ type: 'ADD_TO_QUEUE', payload: track }); }}
                  >
                    +
                  </button>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Albums */}
        {artist.topAlbums && artist.topAlbums.length > 0 && (
          <div className="music-section" style={{ marginTop: '40px' }}>
            <h2 className="section-title">Albums</h2>
            <div className="albums-grid">
              {artist.topAlbums.map((album, idx) => (
                <div key={album.albumId || idx} className="album-card" onClick={() => playAlbum(album.albumId)}>
                  <div className="album-art">
                    <img
                      src={album.thumbnails?.[0]?.url || ''}
                      alt={album.title}
                      onError={e => { e.target.style.display='none'; }}
                    />
                    <div className="album-play-overlay">▶</div>
                  </div>
                  <span className="album-name">{album.title}</span>
                  <span className="album-artist">{album.year || ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Singles */}
        {artist.topSingles && artist.topSingles.length > 0 && (
          <div className="music-section" style={{ marginTop: '40px' }}>
            <h2 className="section-title">Singles</h2>
            <div className="albums-grid">
              {artist.topSingles.map((single, idx) => (
                <div key={single.albumId || idx} className="album-card" onClick={() => playAlbum(single.albumId)}>
                  <div className="album-art">
                    <img
                      src={single.thumbnails?.[0]?.url || ''}
                      alt={single.title}
                      onError={e => { e.target.style.display='none'; }}
                    />
                    <div className="album-play-overlay">▶</div>
                  </div>
                  <span className="album-name">{single.title}</span>
                  <span className="album-artist">{single.year || ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Similar Artists */}
        {artist.similarArtists && artist.similarArtists.length > 0 && (
          <div className="music-section" style={{ marginTop: '40px' }}>
            <h2 className="section-title">Fans Also Like</h2>
            <div className="artists-grid">
              {artist.similarArtists.map((sim, idx) => (
                <div 
                  key={sim.artistId || idx} 
                  className="artist-card"
                  onClick={() => dispatch({ type: 'SET_VIEW', payload: { view: 'artist', data: sim.artistId } })}
                >
                  <div className="artist-avatar">
                    <img
                      src={sim.thumbnails?.[0]?.url || ''}
                      alt={sim.title || sim.name}
                      onError={e => { e.target.style.display='none'; }}
                    />
                  </div>
                  <span className="artist-name">{sim.title || sim.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
