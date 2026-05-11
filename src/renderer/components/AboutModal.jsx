import React, { useState, useEffect } from 'react';
import { usePlayer } from '../store/PlayerContext.jsx';
import logo from '../assets/logo.png';

export default function AboutModal() {
  const { dispatch } = usePlayer();
  const [version, setVersion] = useState('');
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (window.ytClient?.getAppVersion) {
      window.ytClient.getAppVersion().then(v => setVersion(v));
    }
  }, []);

  const checkForUpdates = async () => {
    if (!window.ytClient?.checkForUpdates) return;
    setChecking(true);
    setError('');
    setUpdateInfo(null);
    try {
      const res = await window.ytClient.checkForUpdates();
      if (res.error) {
        setError(res.error);
      } else {
        setUpdateInfo(res);
      }
    } catch (err) {
      setError('Failed to check for updates.');
    } finally {
      setChecking(false);
    }
  };

  const openUrl = (url) => {
    if (window.ytClient?.openExternal) {
      window.ytClient.openExternal(url);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => dispatch({ type: 'TOGGLE_ABOUT_MODAL' })}>
      <div className="modal about-modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '32px', maxWidth: '400px' }}>
        <button className="modal-close" onClick={() => dispatch({ type: 'TOGGLE_ABOUT_MODAL' })}>✕</button>

        <div style={{ marginBottom: '20px' }}>
          <img src={logo} alt="Aura Logo" style={{ width: '72px', height: '72px', borderRadius: '50%', marginBottom: '12px' }} />
          <h2 className="modal-title" style={{ marginBottom: '4px', fontSize: '1.5rem' }}>Aura Music</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Version {version} <span className="beta-badge" style={{ marginLeft: '6px' }}>Beta</span>
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5' }}>
            A premium, ad-free YouTube Music desktop client with dynamic glassmorphism, native OS integration, and seamless offline caching.
          </p>
        </div>

        <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
          {error && <p style={{ color: '#ff4d4f', fontSize: '0.8rem', marginBottom: '12px' }}>{error}</p>}

          {updateInfo && !updateInfo.hasUpdate && (
            <p style={{ color: '#52c41a', fontSize: '0.85rem' }}>✓ You're on the latest version!</p>
          )}

          {updateInfo && updateInfo.hasUpdate && (
            <div>
              <p style={{ color: 'var(--accent-color)', fontWeight: '600', fontSize: '0.9rem', marginBottom: '10px' }}>
                New version available: {updateInfo.latestVersion}
              </p>
              <button
                className="btn-primary"
                onClick={() => openUrl(updateInfo.url)}
                style={{ padding: '8px 20px', fontSize: '0.9rem' }}
              >
                Download Update
              </button>
            </div>
          )}

          {!updateInfo?.hasUpdate && (
            <button
              className="btn-primary"
              onClick={checkForUpdates}
              disabled={checking}
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '8px 20px', fontSize: '0.9rem' }}
            >
              {checking ? 'Checking...' : 'Check for Updates'}
            </button>
          )}
        </div>

        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Made with ♥ by Open Source Community
        </div>
      </div>
    </div>
  );
}
