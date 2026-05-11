import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayer } from '../store/PlayerContext.jsx';
import TrackCard from './TrackCard.jsx';

export default function SearchView() {
  const { dispatch } = usePlayer();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ songs: [], albums: [], artists: [], playlists: [], videos: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchHistory, setSearchHistory] = useState([]);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    if (!window.ytClient?.getSearchHistory) return;
    const history = await window.ytClient.getSearchHistory();
    setSearchHistory(history || []);
  };

  const doSearch = useCallback(async (q, saveToHistory = false) => {
    if (!q.trim()) {
      setResults({ songs: [], albums: [], artists: [], playlists: [], videos: [] });
      return;
    }
    setLoading(true);
    try {
      if (window.ytClient) {
        const data = await window.ytClient.search(q);
        setResults(data);
        // Only persist to history if the user explicitly submitted (Enter or click)
        if (saveToHistory && window.ytClient.addSearchHistory) {
          const newHistory = await window.ytClient.addSearchHistory(q.trim());
          setSearchHistory(newHistory);
        }
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 450);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      clearTimeout(debounceRef.current);
      // Pass saveToHistory=true so this explicit submit is recorded
      doSearch(query, true);
    }
    if (e.key === 'Escape') {
      setQuery('');
      setResults({ songs: [], albums: [], artists: [], playlists: [], videos: [] });
    }
  };

  const handleHistoryClick = (q) => {
    setQuery(q);
    // Re-running a history search counts as an explicit submit
    doSearch(q, true);
  };

  const removeHistoryItem = async (e, q) => {
    e.stopPropagation();
    if (!window.ytClient?.removeSearchHistory) return;
    const newHistory = await window.ytClient.removeSearchHistory(q);
    setSearchHistory(newHistory);
  };

  const clearAllHistory = async () => {
    if (!window.ytClient?.clearSearchHistory) return;
    await window.ytClient.clearSearchHistory();
    setSearchHistory([]);
  };

  const playTrack = async (track) => {
    if (!window.ytClient) return;
    try {
      const streamUrl = await window.ytClient.getStreamUrl(track.videoId);
      const startTrack = { ...track, streamUrl };
      
      dispatch({
        type: 'PLAY_TRACK',
        payload: { track: startTrack, queue: [startTrack] },
      });

      const upNextTracks = await window.ytClient.getUpNexts(track.videoId);
      if (upNextTracks && upNextTracks.length > 0) {
        const recommendations = upNextTracks.filter(t => t.videoId !== track.videoId);
        dispatch({ type: 'APPEND_TO_QUEUE', payload: recommendations });
      }
    } catch (err) {
      console.error('Play error:', err);
    }
  };

  const hasResults = results.songs.length > 0 || results.albums.length > 0 || results.artists.length > 0 || results.playlists.length > 0 || results.videos.length > 0;

  const playAlbum = async (albumId) => {
    if (!window.ytClient) return;
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const playPlaylist = async (playlistId) => {
    if (!window.ytClient) return;
    setLoading(true);
    try {
      const playlist = await window.ytClient.getPlaylistTracks(playlistId);
      // Handle different return formats from yt-music-api
      const tracks = playlist?.tracks || playlist?.songs || playlist?.videos || [];
      if (tracks && tracks.length > 0) {
        const streamUrl = await window.ytClient.getStreamUrl(tracks[0].videoId);
        dispatch({
          type: 'PLAY_TRACK',
          payload: { track: { ...tracks[0], streamUrl }, queue: tracks },
        });
      }
    } catch (err) {
      console.error('Play playlist error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-view">
      {/* Search Header */}
      <div className="search-header">
        <div className="search-bar-wrap">
          <span className="search-icon-input">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search songs, artists, albums..."
            value={query}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button className="search-clear" onClick={() => { setQuery(''); setResults({ songs: [], albums: [], artists: [], playlists: [], videos: [] }); }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {hasResults && (
        <div className="search-tabs">
          {[
            { id: 'all', label: 'All', count: results.songs.length + results.albums.length + results.artists.length + results.playlists.length + results.videos.length },
            { id: 'songs', label: 'Songs', count: results.songs.length },
            { id: 'videos', label: 'Videos', count: results.videos.length },
            { id: 'albums', label: 'Albums', count: results.albums.length },
            { id: 'artists', label: 'Artists', count: results.artists.length },
            { id: 'playlists', label: 'Playlists', count: results.playlists.length },
          ].map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.count > 0 && <span className="tab-count">{tab.count}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="search-results">
        {loading && (
          <div className="search-loading">
            <div className="spinner-large" />
            <p>Searching...</p>
          </div>
        )}

        {!loading && !hasResults && query && (
          <div className="no-results">
            <div className="no-results-icon">🎵</div>
            <h3>No results for "{query}"</h3>
            <p>Try different keywords or check your spelling.</p>
          </div>
        )}

        {!loading && !query && (
          <div className="search-empty">
            {searchHistory.length > 0 ? (
              <div className="search-history-container" style={{ width: '100%', maxWidth: '600px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>Recent Searches</h3>
                  <button onClick={clearAllHistory} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}>Clear All</button>
                </div>
                <div className="songs-list">
                  {searchHistory.map((q, idx) => (
                    <button key={idx} className="song-row" onClick={() => handleHistoryClick(q)} style={{ gridTemplateColumns: '40px 1fr 40px' }}>
                      <span className="song-index" style={{ color: 'var(--text-muted)' }}>🕒</span>
                      <div className="song-info">
                        <span className="song-name" style={{ fontSize: '1rem' }}>{q}</span>
                      </div>
                      <button className="song-queue-btn" title="Remove" onClick={(e) => removeHistoryItem(e, q)}>✕</button>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="search-empty-icon">🔍</div>
                <h2>Find your music</h2>
                <p>Search for songs, artists, albums, and more.</p>
                <div className="search-suggestions">
                  {['Lo-fi beats', 'Drake', 'Taylor Swift', 'Phonk', 'Jazz', 'Bollywood'].map(s => (
                    <button
                      key={s}
                      className="suggestion-chip"
                      onClick={() => { setQuery(s); doSearch(s); }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {!loading && hasResults && activeTab === 'songs' && (
          <div className="songs-list">
            {results.songs.map((track, idx) => (
              <button
                key={track.videoId || idx}
                className="song-row"
                onClick={() => playTrack(track, results.songs)}
              >
                <span className="song-index">{idx + 1}</span>
                <div className="song-thumb">
                  <img
                    src={track.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${track.videoId}/default.jpg`}
                    alt={track.name}
                    onError={e => { e.target.src = `https://i.ytimg.com/vi/${track.videoId}/default.jpg`; }}
                  />
                  <div className="song-thumb-overlay">▶</div>
                </div>
                <div className="song-info">
                  <span className="song-name">{track.name}</span>
                  <span className="song-artist">
                    {(() => {
                      const artists = track.artists?.length > 0 ? track.artists : (track.artist ? (typeof track.artist === 'string' ? [{ name: track.artist }] : [track.artist]) : []);
                      return artists.map((a, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span style={{ opacity: 0.6 }}>, </span>}
                          {a.artistId ? (
                            <button
                              className="artist-link"
                              style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', padding: 0 }}
                              onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_VIEW', payload: { view: 'artist', data: a.artistId } }); }}
                            >
                              {a.name || a}
                            </button>
                          ) : (a.name || a)}
                        </React.Fragment>
                      ));
                    })() || 'Unknown'}
                  </span>
                </div>
                <span className="song-album">{track.album?.name || ''}</span>
                <span className="song-duration">{track.duration || ''}</span>
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
        )}

        {/* All Tab - Show everything */}
        {!loading && hasResults && activeTab === 'all' && (
          <div className="search-all-results">
            {/* Videos Section */}
            {results.videos.length > 0 && (
              <div className="music-section">
                <h3 className="section-title">Videos</h3>
                <div className="songs-list">
                  {results.videos.map((track, idx) => (
                    <button
                      key={track.videoId || idx}
                      className="song-row"
                      onClick={() => playTrack(track, results.videos)}
                    >
                      <span className="song-index">{idx + 1}</span>
                      <div className="song-thumb">
                        <img
                          src={track.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${track.videoId}/default.jpg`}
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
                      <span className="song-duration">{track.duration || ''}</span>
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

            {/* Songs Section */}
            {results.songs.length > 0 && (
              <div className="music-section" style={{ marginTop: results.videos.length > 0 ? '32px' : '0' }}>
                <h3 className="section-title">Songs</h3>
                <div className="songs-list">
                  {results.songs.map((track, idx) => (
                    <button
                      key={track.videoId || idx}
                      className="song-row"
                      onClick={() => playTrack(track, results.songs)}
                    >
                      <span className="song-index">{idx + 1}</span>
                      <div className="song-thumb">
                        <img
                          src={track.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${track.videoId}/default.jpg`}
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
                      <span className="song-duration">{track.duration || ''}</span>
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

            {/* Albums Section */}
            {results.albums.length > 0 && (
              <div className="music-section" style={{ marginTop: '32px' }}>
                <h3 className="section-title">Albums</h3>
                <div className="albums-grid">
                  {results.albums.map((album, idx) => (
                    <div key={album.albumId || idx} className="album-card" onClick={() => playAlbum(album.albumId)}>
                      <div className="album-art">
                        <img
                          src={album.thumbnails?.[0]?.url || ''}
                          alt={album.name}
                          onError={e => { e.target.style.display='none'; }}
                        />
                        <div className="album-play-overlay">▶</div>
                      </div>
                      <span className="album-name">{album.name}</span>
                      <span className="album-artist">{album.artist?.name || ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Artists Section */}
            {results.artists.length > 0 && (
              <div className="music-section" style={{ marginTop: '32px' }}>
                <h3 className="section-title">Artists</h3>
                <div className="artists-grid">
                  {results.artists.map((artist, idx) => (
                    <div
                      key={artist.artistId || idx}
                      className="artist-card"
                      onClick={() => {
                        if (artist.artistId) {
                          dispatch({ type: 'SET_VIEW', payload: { view: 'artist', data: artist.artistId } });
                        }
                      }}
                    >
                      <div className="artist-avatar">
                        <img
                          src={artist.thumbnails?.[0]?.url || ''}
                          alt={artist.name}
                          onError={e => { e.target.style.display='none'; }}
                        />
                      </div>
                      <span className="artist-name">{artist.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Playlists Section */}
            {results.playlists.length > 0 && (
              <div className="music-section" style={{ marginTop: '32px' }}>
                <h3 className="section-title">Playlists</h3>
                <div className="albums-grid">
                  {results.playlists.map((playlist, idx) => (
                    <div key={playlist.playlistId || idx} className="album-card" onClick={() => playPlaylist(playlist.playlistId)}>
                      <div className="album-art">
                        <img
                          src={playlist.thumbnails?.[0]?.url || ''}
                          alt={playlist.title}
                          onError={e => { e.target.style.display='none'; }}
                        />
                        <div className="album-play-overlay">▶</div>
                      </div>
                      <span className="album-name">{playlist.title}</span>
                      <span className="album-artist">{playlist.author || 'Playlist'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Videos Tab */}
        {!loading && hasResults && activeTab === 'videos' && (
          <div className="songs-list">
            {results.videos.map((track, idx) => (
              <button
                key={track.videoId || idx}
                className="song-row"
                onClick={() => playTrack(track, results.videos)}
              >
                <span className="song-index">{idx + 1}</span>
                <div className="song-thumb">
                  <img
                    src={track.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${track.videoId}/default.jpg`}
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
                <span className="song-duration">{track.duration || ''}</span>
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
        )}

        {!loading && hasResults && activeTab === 'albums' && (
          <div className="albums-grid">
            {results.albums.map((album, idx) => (
              <div key={album.albumId || idx} className="album-card" onClick={() => playAlbum(album.albumId)}>
                <div className="album-art">
                  <img
                    src={album.thumbnails?.[0]?.url || ''}
                    alt={album.name}
                    onError={e => { e.target.style.display='none'; }}
                  />
                  <div className="album-play-overlay">▶</div>
                </div>
                <span className="album-name">{album.name}</span>
                <span className="album-artist">{album.artist?.name || ''}</span>
              </div>
            ))}
          </div>
        )}

        {!loading && hasResults && activeTab === 'artists' && (
          <div className="artists-grid">
            {results.artists.map((artist, idx) => (
              <div 
                key={artist.artistId || idx} 
                className="artist-card"
                onClick={() => {
                  if (artist.artistId) {
                    dispatch({ type: 'SET_VIEW', payload: { view: 'artist', data: artist.artistId } });
                  }
                }}
              >
                <div className="artist-avatar">
                  <img
                    src={artist.thumbnails?.[0]?.url || ''}
                    alt={artist.name}
                    onError={e => { e.target.style.display='none'; }}
                  />
                </div>
                <span className="artist-name">{artist.name}</span>
                <span className="artist-label">Artist</span>
              </div>
            ))}
          </div>
        )}
        {!loading && hasResults && activeTab === 'playlists' && (
          <div className="albums-grid">
            {results.playlists.map((playlist, idx) => (
              <div key={playlist.playlistId || idx} className="album-card" onClick={() => playPlaylist(playlist.playlistId)}>
                <div className="album-art">
                  <img
                    src={playlist.thumbnails?.[0]?.url || ''}
                    alt={playlist.title}
                    onError={e => { e.target.style.display='none'; }}
                  />
                  <div className="album-play-overlay">▶</div>
                </div>
                <span className="album-name">{playlist.title}</span>
                <span className="album-artist">{playlist.author || 'Playlist'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
