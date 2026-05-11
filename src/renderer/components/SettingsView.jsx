import React, { useState, useEffect } from 'react';

export default function SettingsView() {
  const [settings, setSettings] = useState({ maxHistoryItems: 50 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      if (!window.ytClient) return;
      const s = await window.ytClient.getSettings();
      if (s) setSettings(s);
      setLoading(false);
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!window.ytClient) return;
    await window.ytClient.saveSettings(settings);
    alert('Settings saved!');
  };

  if (loading) return <div className="loading-grid"><div className="spinner" /></div>;

  return (
    <div className="music-section" style={{ padding: '24px' }}>
      <h2 className="section-title">Settings</h2>
      
      <div style={{ background: 'var(--bg-glass)', padding: '24px', borderRadius: 'var(--radius-lg)', maxWidth: '600px' }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Local Storage Configuration</h3>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
            Max History Track Cache Limit
          </label>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Determine how many songs the app remembers in your history. Lower values save disk space.
          </p>
          <input 
            type="number" 
            min="10" max="1000"
            value={settings.maxHistoryItems} 
            onChange={(e) => setSettings({ ...settings, maxHistoryItems: parseInt(e.target.value, 10) || 50 })}
            style={{ 
              padding: '12px', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)', 
              background: 'rgba(0,0,0,0.2)', 
              color: 'var(--text-primary)',
              width: '100%',
              fontSize: '1rem'
            }}
          />
        </div>

        <button 
          className="btn-primary" 
          onClick={handleSave}
          style={{ width: '100%', padding: '12px', borderRadius: '100px', border: 'none', background: 'var(--accent-color)', color: 'var(--accent-text)', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
