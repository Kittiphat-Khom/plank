import { useState, useCallback } from 'react';
import './setup.css';
import { usePlank } from '../../providers/PlankProvider';

const ACCENT_OPTIONS = [
  { label: 'Indigo',  hue: 264 },
  { label: 'Blue',    hue: 250 },
  { label: 'Violet',  hue: 300 },
  { label: 'Rose',    hue: 350 },
  { label: 'Green',   hue: 155 },
  { label: 'Amber',   hue: 55  },
  { label: 'Teal',    hue: 195 },
  { label: 'Pink',    hue: 340 },
];

function accentColor(hue) {
  return `oklch(0.55 0.18 ${hue})`;
}


function generateKey(name) {
  const words = name.trim().toUpperCase().split(/[\s\-_]+/).filter(Boolean);
  if (!words.length) return '';
  if (words.length === 1) return words[0].slice(0, 4);
  if (words.length === 2) return (words[0].slice(0, 2) + words[1].slice(0, 2)).slice(0, 4);
  return words.slice(0, 4).map((w) => w[0]).join('').slice(0, 5);
}


function Logo() {
  return (
    <div className="setup-logo">
      <div className="setup-logo-bars">
        <span className="setup-logo-bar setup-logo-bar--sm" />
        <span className="setup-logo-bar setup-logo-bar--lg" />
        <span className="setup-logo-bar setup-logo-bar--md" />
      </div>
    </div>
  );
}


export function ProjectSetup({ onDone, modal = false }) {
  const { createProject } = usePlank();

  const [name, setName]           = useState('');
  const [key, setKey]             = useState('');
  const [keyEdited, setKeyEdited] = useState(false);
  const [desc, setDesc]           = useState('');
  const [hue, setHue]             = useState(264);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const handleNameChange = useCallback((val) => {
    setName(val);
    if (!keyEdited) setKey(generateKey(val));
  }, [keyEdited]);

  const handleKeyChange = useCallback((val) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setKey(clean);
    setKeyEdited(clean.length > 0);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Project name is required.'); return; }
    if (key.length < 2) { setError('Project key must be at least 2 characters.'); return; }

    setSaving(true);
    const result = await createProject({
      name: name.trim(),
      description: desc.trim(),
      key: key.trim(),
      color: accentColor(hue),
    });
    if (!result) {
      setError('Failed to create project. Check your Supabase connection.');
      setSaving(false);
    } else {
      onDone?.();
    }
  };

  const canSubmit = name.trim().length > 0 && key.length >= 2 && !saving;

  const card = (
    <div className="setup-card">
      {modal && (
        <button
          type="button"
          onClick={onDone}
          aria-label="Close"
          style={{ position: 'absolute', top: 14, right: 14, width: 28, height: 28, borderRadius: 8, background: 'var(--surface-hover)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      )}
        <Logo />

        <h1 className="setup-heading">Create your project</h1>
        <p className="setup-sub">
          Set up your workspace. You'll be the owner and can invite teammates later.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="setup-fields">

            <div className="setup-field-row">
              <div className="setup-field">
                <label className="setup-label">
                  Project name <span>*</span>
                </label>
                <input
                  className="setup-input"
                  type="text"
                  placeholder="Mobile App Q3"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  autoFocus
                  maxLength={60}
                />
              </div>
              <div className="setup-field">
                <label className="setup-label">
                  Key <span>*</span>
                </label>
                <input
                  className="setup-input setup-input--key"
                  type="text"
                  placeholder="MOB"
                  value={key}
                  onChange={(e) => handleKeyChange(e.target.value)}
                />
                <span className="setup-hint">e.g. {key || 'PLK'}-1, {key || 'PLK'}-2</span>
              </div>
            </div>


            <div className="setup-field">
              <label className="setup-label">Description</label>
              <textarea
                className="setup-textarea"
                placeholder="What is this project about? (optional)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                maxLength={300}
              />
            </div>


            <div className="setup-field">
              <label className="setup-label">Accent color</label>
              <div className="setup-colors">
                {ACCENT_OPTIONS.map((a) => (
                  <button
                    key={a.hue}
                    type="button"
                    className="setup-color-btn"
                    title={a.label}
                    data-selected={hue === a.hue ? 'true' : undefined}
                    style={{ background: accentColor(a.hue), '--color': accentColor(a.hue) }}
                    onClick={() => setHue(a.hue)}
                  />
                ))}
              </div>
            </div>
          </div>

          {error && <div className="setup-error">{error}</div>}

          <button type="submit" className="setup-submit" disabled={!canSubmit}>
            {saving ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
                  <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.3" />
                  <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                Creating…
              </>
            ) : (
              <>
                Create project
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </>
            )}
          </button>
        </form>
    </div>
  );

  return modal ? card : (
    <div className="setup-screen">
      {card}
    </div>
  );
}
