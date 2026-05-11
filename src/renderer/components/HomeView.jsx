import React, { useEffect, useState, useRef } from 'react';
import { usePlayer } from '../store/PlayerContext.jsx';
import TrackCard from './TrackCard.jsx';
import logo from '../assets/logo.png';

const FEATURED_QUERIES = ['Quick Picks', 'New Releases', 'Popular Now', 'Recommended'];

const HorizontalScrollContainer = ({ children }) => {
  const scrollRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollBy({ left: e.deltaY * 1.5, behavior: 'auto' });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  return <div className="tracks-scroll" ref={scrollRef}>{children}</div>;
};

export default function HomeView() {
  const { dispatch } = usePlayer();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [featuredTrack, setFeaturedTrack] = useState(null);

  useEffect(() => {
    loadHome();
  }, []);

  const loadHome = async () => {
    setLoading(true);
    try {
      if (!window.ytClient) {
        // Mock data for browser dev mode
        setSections([]);
        setLoading(false);
        return;
      }

      // Fetch multiple genre sections in parallel
      const results = await Promise.all(
        FEATURED_QUERIES.map(q =>
          window.ytClient.search(q)
            .then(r => ({ title: q.replace(/\b\w/g, l => l.toUpperCase()), tracks: r.songs || [] }))
            .catch(() => ({ title: q, tracks: [] }))
        )
      );

      const validSections = results.filter(s => s.tracks.length > 0);
      setSections(validSections);
      if (validSections[0]?.tracks[0]) {
        setFeaturedTrack(validSections[0].tracks[0]);
      }
    } catch (err) {
      console.error('HomeView load error:', err);
    } finally {
      setLoading(false);
    }
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

  const playFeatured = () => {
    if (featuredTrack) playTrack(featuredTrack, sections[0]?.tracks || []);
  };

  return (
    <div className="home-view">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="hero-gradient" />
        <div className="hero-content">
          {featuredTrack ? (
            <>
              <div className="hero-thumb-wrap">
                <img
                  src={featuredTrack.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${featuredTrack.videoId}/hqdefault.jpg`}
                  alt={featuredTrack.name}
                  className="hero-thumb"
                  onError={e => { e.target.style.display='none'; }}
                />
              </div>
              <div className="hero-info">
                <span className="hero-badge">🎵 Trending Now</span>
                <h1 className="hero-title">{featuredTrack.name || 'Featured Track'}</h1>
                <p className="hero-artist">
                  {featuredTrack.artist?.name || featuredTrack.artists?.[0]?.name || 'Unknown Artist'}
                </p>
                <div className="hero-actions">
                  <button className="btn-play-hero" onClick={playFeatured}>
                    ▶ Play Now
                  </button>
                  <button
                    className="btn-queue-hero"
                    onClick={() => {
                      if (featuredTrack) {
                        dispatch({ type: 'ADD_TO_QUEUE', payload: featuredTrack });
                      }
                    }}
                  >
                    + Add to Queue
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="hero-placeholder">
              <div className="hero-logo-big" style={{ background: 'transparent' }}>
                <img src={logo} alt="Aura Logo" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }} />
              </div>
              <h1 className="hero-title">Welcome to Aura Music</h1>
              <p className="hero-artist">Search for any song to start listening</p>
            </div>
          )}
        </div>
      </div>

      {/* Sections */}
      <div className="home-sections">
        {loading ? (
          <div className="loading-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        ) : (
          sections.map((section) => (
            <section key={section.title} className="music-section">
              <h2 className="section-title">{section.title}</h2>
              <HorizontalScrollContainer>
                {section.tracks.slice(0, 10).map((track) => (
                  <TrackCard
                    key={track.videoId}
                    track={track}
                    onClick={() => playTrack(track, section.tracks)}
                    onAddToQueue={() => dispatch({ type: 'ADD_TO_QUEUE', payload: track })}
                  />
                ))}
              </HorizontalScrollContainer>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
