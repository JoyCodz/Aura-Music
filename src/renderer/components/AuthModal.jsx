import React, { useState } from 'react';
import { usePlayer } from '../store/PlayerContext.jsx';
import { useLibrary } from '../store/LibraryContext.jsx';

export default function AuthModal() {
  const { dispatch } = usePlayer();
  const { login, logout, isAuthenticated } = useLibrary();
  const [cookies, setCookies] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const close = () => dispatch({ type: 'TOGGLE_AUTH_MODAL' });

  const handleLogin = async () => {
    if (!cookies.trim()) {
      setError('Please paste your cookie string.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(cookies.trim());
      close();
    } catch (err) {
      setError('Failed to authenticate. Please check your cookies and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    close();
  };

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={close}>✕</button>

        <div className="modal-header">
          <div className="modal-icon">🔐</div>
          <h2 className="modal-title">Connect Your Account</h2>
          <p className="modal-subtitle">
            Access your playlists, liked songs, and personalized recommendations.
          </p>
        </div>

        {isAuthenticated ? (
          <div className="modal-body">
            <div className="auth-success">
              <div className="auth-success-icon">✅</div>
              <p>You're connected! Your library is available in the sidebar.</p>
            </div>
            <button className="btn-danger" onClick={handleLogout}>
              Disconnect Account
            </button>
          </div>
        ) : (
          <div className="modal-body">
            {/* Steps */}
            <div className="auth-steps">
              <div className={`auth-step ${step >= 1 ? 'active' : ''}`}>
                <div className="step-num">1</div>
                <div className="step-content">
                  <strong>Open YouTube Music</strong>
                  <span>Go to <a href="#" onClick={() => window.open?.('https://music.youtube.com')}>music.youtube.com</a> in your browser and sign in.</span>
                </div>
              </div>
              <div className={`auth-step ${step >= 2 ? 'active' : ''}`}>
                <div className="step-num">2</div>
                <div className="step-content">
                  <strong>Open DevTools</strong>
                  <span>Press <kbd>F12</kbd> → Network tab → Reload the page → Click any request to <code>music.youtube.com</code></span>
                </div>
              </div>
              <div className={`auth-step ${step >= 3 ? 'active' : ''}`}>
                <div className="step-num">3</div>
                <div className="step-content">
                  <strong>Copy Cookie Header</strong>
                  <span>In Request Headers, find <code>cookie:</code> and copy its full value.</span>
                </div>
              </div>
              <div className={`auth-step ${step >= 4 ? 'active' : ''}`}>
                <div className="step-num">4</div>
                <div className="step-content">
                  <strong>Paste Below</strong>
                  <span>Paste the cookie string into the field below and click Connect.</span>
                </div>
              </div>
            </div>

            <div className="auth-input-wrap">
              <label className="auth-label">Cookie String</label>
              <textarea
                className="auth-textarea"
                placeholder="Paste your cookie string here... (starts with VISITOR_INFO1_LIVE=...)"
                value={cookies}
                onChange={e => { setCookies(e.target.value); setStep(4); }}
                rows={4}
              />
              {error && <span className="auth-error">{error}</span>}
            </div>

            <div className="auth-note">
              🔒 Your cookies are stored locally only and never sent anywhere except YouTube's servers.
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                className="btn-secondary"
                onClick={close}
                style={{ flex: 1, padding: '12px', borderRadius: '100px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                Skip (Local Mode)
              </button>
              <button
                className="btn-primary"
                onClick={handleLogin}
                disabled={loading || !cookies.trim()}
                style={{ flex: 1.5, padding: '12px', borderRadius: '100px', backgroundColor: 'var(--accent-color)', color: 'var(--accent-text)', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {loading ? 'Connecting...' : 'Connect Account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
