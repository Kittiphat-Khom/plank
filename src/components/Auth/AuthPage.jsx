import { useState, useEffect } from 'react';
import './auth.css';
import { supabase } from '../../lib/supabase';

// ── Icons ─────────────────────────────────────────────────────
const ICONS = {
  google: (
    <>
      <path d="M21.6 12.2c0-.6-.1-1.3-.2-1.9H12v3.6h5.4c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.2z" fill="#4285F4" stroke="none"/>
      <path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6C4.7 19.8 8.1 22 12 22z" fill="#34A853" stroke="none"/>
      <path d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1C2.4 8.8 2 10.4 2 12s.4 3.2 1.1 4.6L6.4 14z" fill="#FBBC05" stroke="none"/>
      <path d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.9 14.7 2 12 2 8.1 2 4.7 4.2 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z" fill="#EA4335" stroke="none"/>
    </>
  ),
  mail:       "M3 7l9 6 9-6M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z",
  lock:       "M6 11V8a6 6 0 1 1 12 0v3M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z",
  user:       "M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  eye:        "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  eyeOff:     "M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.4 5.2A9.5 9.5 0 0 1 12 5c6 0 10 7 10 7a16 16 0 0 1-2.8 3.4M6.6 6.6A16 16 0 0 0 2 12s4 7 10 7a9.4 9.4 0 0 0 3-.5",
  check:      "M20 6 9 17l-5-5",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  spark:      "M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8Z",
  bolt:       "M13 2 4 14h6l-1 8 9-12h-6l1-8Z",
  users:      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  mail2:      "M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z",
};

function Ico({ name, size = 18, stroke = 2, style }) {
  const d = ICONS[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={style} aria-hidden="true">
      {typeof d === 'string' ? <path d={d} /> : d}
    </svg>
  );
}

// ── Logo ──────────────────────────────────────────────────────
function Logo({ size = 30, withText = true, light = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: size, height: size, borderRadius: size * 0.27,
        background: light ? 'rgba(255,255,255,0.16)' : 'var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: light ? 'none' : 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', gap: size * 0.085, alignItems: 'flex-end' }}>
          <span style={{ width: size * 0.135, height: size * 0.30, background: '#fff', borderRadius: 1, opacity: 0.95 }} />
          <span style={{ width: size * 0.135, height: size * 0.44, background: '#fff', borderRadius: 1 }} />
          <span style={{ width: size * 0.135, height: size * 0.20, background: '#fff', borderRadius: 1, opacity: 0.8 }} />
        </div>
      </div>
      {withText && (
        <span style={{ fontWeight: 800, fontSize: size * 0.58, letterSpacing: '-0.03em', color: light ? '#fff' : 'var(--text)' }}>
          Plank
        </span>
      )}
    </div>
  );
}

// ── Password strength ─────────────────────────────────────────
function strengthOf(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

function PasswordStrength({ pw }) {
  if (!pw) return null;
  const s = strengthOf(pw);
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['var(--c-red)', 'var(--c-red)', 'var(--c-amber)', 'var(--c-teal)', 'var(--c-green)'];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i < s ? colors[s] : 'var(--border-strong)', transition: 'background .25s' }} />
        ))}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: colors[s], marginTop: 4 }}>{labels[s]}</div>
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────
function Field({ icon, type = 'text', label, value, onChange, placeholder, autoComplete, error, onBlur, children, rightSlot }) {
  const [focused, setFocused] = useState(false);
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px', height: 44, borderRadius: 10,
        background: 'var(--surface)', transition: 'box-shadow .15s, border-color .15s',
        border: `1.5px solid ${error ? 'var(--c-red)' : focused ? 'var(--accent)' : 'var(--border)'}`,
        boxShadow: focused && !error ? '0 0 0 3px var(--accent-soft)' : 'none',
      }}>
        <Ico name={icon} size={17} style={{ color: focused ? 'var(--accent)' : 'var(--text-faint)', flexShrink: 0, transition: 'color .15s' }} />
        <input
          type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontWeight: 500, minWidth: 0 }}
        />
        {rightSlot}
      </div>
      {error && <div style={{ fontSize: 11.5, color: 'var(--c-red)', marginTop: 5, fontWeight: 600 }}>{error}</div>}
      {children}
    </label>
  );
}

// ── Checkbox ──────────────────────────────────────────────────
function Checkbox({ checked, onChange, label, error }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 13, fontWeight: 550, color: 'var(--text-muted)' }}>
      <span style={{
        width: 19, height: 19, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        border: checked ? 'none' : `1.6px solid ${error ? 'var(--c-red)' : 'var(--border-strong)'}`,
        background: checked ? 'var(--accent)' : 'transparent', transition: 'all .15s',
      }}>
        {checked && <Ico name="check" size={13} stroke={3} />}
      </span>
      {label}
    </button>
  );
}

// ── Spinner ───────────────────────────────────────────────────
function Spinner({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'spin 0.7s linear infinite' }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />
      <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ── Brand Panel ───────────────────────────────────────────────
const FEATURES = [
  { icon: 'bolt',  title: '60fps drag & drop',        desc: 'Move hundreds of cards without a hint of lag.' },
  { icon: 'users', title: 'Real-time presence',        desc: "See teammates' cursors and edits as they happen." },
  { icon: 'spark', title: 'AI that does the busywork', desc: 'Summarize boards and auto-generate subtasks.' },
];
const TEAM = [
  { initials: 'PS', color: 'var(--c-pink)' },
  { initials: 'TW', color: 'var(--c-teal)' },
  { initials: 'JA', color: 'var(--c-amber)' },
  { initials: 'MD', color: 'var(--c-green)' },
  { initials: 'NK', color: 'var(--c-purple)' },
];

function BrandPanel() {
  return (
    <div className="auth-brand" style={{
      position: 'relative', overflow: 'hidden', padding: '44px 48px',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 40,
      background: 'linear-gradient(155deg, var(--accent) 0%, oklch(0.42 0.16 285) 100%)', color: '#fff',
    }}>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, opacity: 0.13, pointerEvents: 'none' }}>
        <svg width="100%" height="100%" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
          {[20, 145, 270].map((x, ci) => (
            <g key={ci}>
              <rect x={x} y={70 + ci * 18} width="110" height="14" rx="4" fill="#fff" opacity="0.6" />
              {[0, 1, 2, 3].map((r) => (
                <rect key={r} x={x} y={96 + ci * 18 + r * 64} width="110" height={r === 1 && ci === 1 ? 78 : 52} rx="9" fill="#fff" opacity="0.5" />
              ))}
            </g>
          ))}
        </svg>
      </div>
      <div style={{ position: 'absolute', top: 44, left: 48, zIndex: 2 }}><Logo size={34} light /></div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontSize: 34, lineHeight: 1.12, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 14, textWrap: 'balance' }}>
          Where your team's work clicks into place.
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.55, opacity: 0.86, maxWidth: 380, marginBottom: 32 }}>
          The real-time workspace for software teams — boards, sprints, and bugs that everyone can move together.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, textAlign: 'left' }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backdropFilter: 'blur(4px)' }}>
                <Ico name={f.icon} size={19} stroke={2.1} />
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 2 }}>{f.title}</div>
                <div style={{ fontSize: 13, opacity: 0.82, lineHeight: 1.45 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Auth Form ─────────────────────────────────────────────────
function validateEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

function AuthForm() {
  const [mode, setMode]         = useState(() => location.hash.replace('#', '') === 'register' ? 'register' : 'login');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [pw, setPw]             = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [remember, setRemember] = useState(true);
  const [agree, setAgree]       = useState(false);
  const [errors, setErrors]     = useState({});
  const [touched, setTouched]   = useState({});
  const [loading, setLoading]   = useState(false);
  const [apiError, setApiError] = useState('');
  // 'idle' | 'success' | 'confirm_email' | 'forgot' | 'forgot_sent'
  const [status, setStatus]     = useState('idle');

  const isReg = mode === 'register';

  useEffect(() => { location.hash = mode; }, [mode]);
  useEffect(() => {
    try { const s = localStorage.getItem('plank_auth_email'); if (s) setEmail(s); } catch {}
  }, []);

  function validate() {
    const er = {};
    if (isReg && name.trim().length < 2) er.name = 'Tell us your name';
    if (!validateEmail(email)) er.email = 'Enter a valid email';
    if (!pw) er.pw = 'Password required';
    else if (isReg && strengthOf(pw) < 2) er.pw = 'Use at least 8 characters with a number';
    if (isReg && !agree) er.agree = 'Please accept the terms to continue';
    return er;
  }

  async function submit(e) {
    e.preventDefault();
    setApiError('');
    const er = validate();
    setErrors(er);
    setTouched({ name: true, email: true, pw: true });
    if (Object.keys(er).length) return;

    setLoading(true);
    try { if (remember) localStorage.setItem('plank_auth_email', email); else localStorage.removeItem('plank_auth_email'); } catch {}

    if (isReg) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pw,
        options: { data: { full_name: name.trim() } },
      });
      setLoading(false);
      if (error) { setApiError(error.message); return; }
      // If email confirmation required, show confirm screen
      if (data.user && !data.session) {
        setStatus('confirm_email');
      } else {
        setStatus('success'); // auto-confirmed (Supabase disabled confirmation)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      setLoading(false);
      if (error) { setApiError(error.message); return; }
      setStatus('success');
      // onAuthStateChange in App will pick up the session automatically
    }
  }

  async function signInWithGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) { setApiError(error.message); setLoading(false); }
    // On success: browser redirects to Google → comes back → session set
  }

  function switchMode(m) {
    setMode(m); setErrors({}); setTouched({}); setPw(''); setApiError(''); setStatus('idle');
  }

  // ── States ────────────────────────────────────────────────
  if (status === 'confirm_email') {
    return (
      <div style={{ textAlign: 'center', animation: 'pop-in .3s ease-out' }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: 'var(--accent-soft)', border: '1.5px solid var(--accent-soft-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <Ico name="mail2" size={28} stroke={1.8} style={{ color: 'var(--accent-text)' }} />
        </div>
        <h2 style={{ fontSize: 21, fontWeight: 750, letterSpacing: '-0.02em', marginBottom: 8 }}>Check your inbox</h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
          We sent a confirmation link to<br />
          <b style={{ color: 'var(--text)', fontWeight: 650 }}>{email}</b>
        </p>
        <p style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>
          Already confirmed?{' '}
          <button type="button" onClick={() => switchMode('login')} style={{ color: 'var(--accent-text)', fontWeight: 650 }}>
            Sign in
          </button>
        </p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={{ textAlign: 'center', animation: 'pop-in .3s ease-out' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--c-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <Ico name="check" size={30} stroke={3} style={{ color: '#fff' }} />
        </div>
        <h2 style={{ fontSize: 21, fontWeight: 750, letterSpacing: '-0.02em', marginBottom: 6 }}>
          {isReg ? 'Account created!' : 'Welcome back!'}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Taking you to your workspace…</p>
      </div>
    );
  }

  if (status === 'forgot') {
    const sendReset = async () => {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}?reset=1`,
      });
      setLoading(false);
      if (error) { setApiError(error.message); return; }
      setStatus('forgot_sent');
    };

    return (
      <div style={{ animation: 'fade-in .3s' }}>
        {/* Icon */}
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--accent-soft)', border: '1.5px solid var(--accent-soft-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Ico name="lock" size={24} stroke={1.8} style={{ color: 'var(--accent-text)' }} />
        </div>

        <h2 style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.025em', marginBottom: 6 }}>Forgot your password?</h2>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 26 }}>
          No worries — enter your email and we'll send you a reset link right away.
        </p>

        <Field
          icon="mail" type="email" label="Email address"
          value={email} onChange={(v) => { setEmail(v); setApiError(''); }}
          placeholder="you@example.com" autoComplete="email"
          error={apiError}
        />

        <button
          type="button"
          disabled={loading || !validateEmail(email)}
          onClick={sendReset}
          style={{
            width: '100%', height: 46, marginTop: 18, borderRadius: 11,
            background: validateEmail(email) ? 'var(--accent)' : 'var(--surface-hover)',
            color: validateEmail(email) ? '#fff' : 'var(--text-faint)',
            fontSize: 14.5, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            border: 'none', cursor: validateEmail(email) && !loading ? 'pointer' : 'default',
            transition: 'background .15s, opacity .15s',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>

        <button
          type="button"
          onClick={() => { setStatus('idle'); setApiError(''); }}
          style={{ width: '100%', height: 40, marginTop: 10, borderRadius: 11, background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text-muted)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', transition: 'background .15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  if (status === 'forgot_sent') {
    return (
      <div style={{ textAlign: 'center', animation: 'pop-in .3s ease-out' }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: 'var(--accent-soft)', border: '1.5px solid var(--accent-soft-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <Ico name="mail2" size={28} stroke={1.8} style={{ color: 'var(--accent-text)' }} />
        </div>
        <h2 style={{ fontSize: 21, fontWeight: 750, letterSpacing: '-0.02em', marginBottom: 8 }}>Check your inbox</h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
          We sent a reset link to<br />
          <b style={{ color: 'var(--text)', fontWeight: 650 }}>{email}</b>
        </p>
        <p style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>
          <button type="button" onClick={() => switchMode('login')} style={{ color: 'var(--accent-text)', fontWeight: 650 }}>
            Back to sign in
          </button>
        </p>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────
  return (
    <form onSubmit={submit} noValidate style={{ animation: 'fade-in .3s' }}>
      <div style={{ display: 'flex', gap: 3, background: 'var(--bg-sunken)', borderRadius: 11, padding: 4, marginBottom: 26, border: '1px solid var(--border)' }}>
        {[['login', 'Sign in'], ['register', 'Create account']].map(([m, lbl]) => (
          <button key={m} type="button" onClick={() => switchMode(m)} style={{
            flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13.5, fontWeight: 700,
            color: mode === m ? 'var(--text)' : 'var(--text-muted)',
            background: mode === m ? 'var(--surface)' : 'transparent',
            boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
            transition: 'all .15s',
          }}>{lbl}</button>
        ))}
      </div>

      <h2 style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.025em', marginBottom: 6 }}>
        {isReg ? 'Start building with your team' : 'Sign in to Plank'}
      </h2>
      <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 24 }}>
        {isReg ? 'Free for your whole team. No credit card required.' : 'Pick up right where your team left off.'}
      </p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <button type="button" className="auth-social-btn" onClick={signInWithGoogle}>
          <Ico name="google" size={18} stroke={0} /> Google
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 18px' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-faint)' }}>or with email</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {isReg && (
          <Field icon="user" label="Full name" value={name} onChange={setName}
            placeholder="Aroon Suksai" autoComplete="name"
            error={touched.name && errors.name}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))} />
        )}
        <Field icon="mail" type="email" label="Work email" value={email} onChange={setEmail}
          placeholder="you@company.com" autoComplete="email"
          error={touched.email && errors.email}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))} />
        <Field icon="lock" type={showPw ? 'text' : 'password'}
          label={isReg ? 'Create password' : 'Password'} value={pw} onChange={setPw}
          placeholder={isReg ? 'At least 8 characters' : 'Enter your password'}
          autoComplete={isReg ? 'new-password' : 'current-password'}
          error={touched.pw && errors.pw}
          onBlur={() => setTouched((t) => ({ ...t, pw: true }))}
          rightSlot={
            <button type="button" onClick={() => setShowPw((s) => !s)} aria-label="Toggle password"
              style={{ color: 'var(--text-faint)', display: 'flex', padding: 2 }}>
              <Ico name={showPw ? 'eyeOff' : 'eye'} size={17} />
            </button>
          }>
          {isReg && <PasswordStrength pw={pw} />}
        </Field>
      </div>

      {!isReg ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <Checkbox checked={remember} onChange={setRemember} label="Remember me" />
          <button type="button" style={{ fontSize: 13, fontWeight: 650, color: 'var(--accent-text)' }}
            onClick={() => { setApiError(''); setStatus('forgot'); }}>
            Forgot password?
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          <Checkbox checked={agree} onChange={setAgree} error={touched.pw && errors.agree}
            label={
              <span>I agree to the{' '}
                <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--accent-text)', fontWeight: 650 }}>Terms</a>
                {' & '}
                <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--accent-text)', fontWeight: 650 }}>Privacy Policy</a>
              </span>
            } />
          {touched.pw && errors.agree && (
            <div style={{ fontSize: 11.5, color: 'var(--c-red)', marginTop: 5, fontWeight: 600 }}>{errors.agree}</div>
          )}
        </div>
      )}

      {apiError && (
        <div style={{ marginTop: 14, padding: '9px 12px', borderRadius: 9, fontSize: 13, fontWeight: 600, color: 'var(--c-red)', background: 'color-mix(in oklch, var(--c-red) 10%, var(--surface))', border: '1px solid color-mix(in oklch, var(--c-red) 22%, transparent)' }}>
          {apiError}
        </div>
      )}

      <button type="submit" disabled={loading} style={{
        width: '100%', height: 46, marginTop: 22, borderRadius: 11,
        background: 'var(--accent)', color: '#fff', fontSize: 14.5, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
        boxShadow: 'var(--shadow-md)', opacity: loading ? 0.85 : 1, transition: 'opacity .15s',
      }}>
        {loading ? <Spinner /> : <>{isReg ? 'Create account' : 'Sign in'} <Ico name="arrowRight" size={17} stroke={2.3} /></>}
      </button>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 20 }}>
        {isReg ? 'Already have an account? ' : 'New to Plank? '}
        <button type="button" onClick={() => switchMode(isReg ? 'login' : 'register')}
          style={{ color: 'var(--accent-text)', fontWeight: 700 }}>
          {isReg ? 'Sign in' : 'Create one free'}
        </button>
      </p>
    </form>
  );
}

// ── Theme Toggle ──────────────────────────────────────────────
function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light'); }, [dark]);
  return (
    <button onClick={() => setDark((d) => !d)} aria-label="Toggle theme" className="auth-theme-btn">
      {dark
        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>
      }
    </button>
  );
}

// ── AuthPage ──────────────────────────────────────────────────
export function AuthPage() {
  return (
    <div className="auth-root">
      <ThemeToggle />
      <div className="auth-grid">
        <BrandPanel />
        <div className="auth-form-side">
          <div className="auth-form-wrap">
            <div className="auth-mobile-logo" style={{ display: 'none', marginBottom: 28, justifyContent: 'center' }}>
              <Logo size={32} />
            </div>
            <AuthForm />
          </div>
        </div>
      </div>
    </div>
  );
}
