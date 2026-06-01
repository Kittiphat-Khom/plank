import { useState, useEffect, useMemo, useCallback } from 'react';
import { PlankProvider, usePlank } from './providers/PlankProvider';
import { PresenceProvider } from './providers/PresenceProvider';
import { dueInfo } from './helpers';
import { Board } from './components/Board/Board';
import { CardModal } from './components/Modals/CardModal';
import { CommandPalette } from './components/Modals/CommandPalette';
import { Sidebar, ProjectSettingsModal } from './components/Layout/Sidebar';
import { Topbar } from './components/Layout/Topbar';
import { ActivityFeed } from './components/Layout/ActivityFeed';
import { ListView } from './components/Views/ListView';
import { CalendarView } from './components/Views/CalendarView';
import { TimelineView } from './components/Views/TimelineView';
import { InboxView } from './components/Views/InboxView';
import { useInboxUnread } from './hooks/useInboxUnread';

function MyWorkView({ onOpen, groupBy }) {
  const { currentUserId } = usePlank();
  return <ListView filterFn={(c) => c.assignees?.includes(currentUserId)} groupBy={groupBy} onOpen={onOpen} />;
}

function DueSoonView({ onOpen, groupBy }) {
  return <ListView filterFn={(c) => Boolean(c.due)} groupBy={groupBy} onOpen={onOpen} />;
}
import { useTweaks, TweaksPanel, TweakSection, TweakToggle, TweakRadio } from './tweaks';
import { ProjectSetup } from './components/Setup/ProjectSetup';
import { LiveCursors } from './components/Modals/LiveCursors';
import { onToast } from './lib/toast';
import { AuthPage } from './components/Auth/AuthPage';
import { supabase } from './lib/supabase';

const TWEAK_DEFAULTS = { accentHue: 264, theme: "light", density: "regular", defaultView: "kanban", showCursors: true };

const ACCENTS = [
  { hue: 264, name: "Indigo" }, { hue: 250, name: "Blue" }, { hue: 300, name: "Violet" },
  { hue: 350, name: "Rose" },  { hue: 155, name: "Green" }, { hue: 55,  name: "Amber" },
];

function applyTheme(t) {
  const root = document.documentElement;
  root.setAttribute("data-theme",   t.theme === "dark" ? "dark" : "light");
  root.setAttribute("data-density", t.density === "dense" ? "dense" : "regular");
  const H = t.accentHue;
  const set = (k, v) => root.style.setProperty(k, v);
  if (t.theme === "dark") {
    set("--accent", `oklch(0.64 0.17 ${H})`); set("--accent-hover", `oklch(0.7 0.16 ${H})`);
    set("--accent-soft", `oklch(0.33 0.06 ${H})`); set("--accent-soft-border", `oklch(0.44 0.09 ${H})`);
    set("--accent-text", `oklch(0.83 0.1 ${H})`);
  } else {
    set("--accent", `oklch(0.55 0.18 ${H})`); set("--accent-hover", `oklch(0.5 0.19 ${H})`);
    set("--accent-soft", `oklch(0.95 0.04 ${H})`); set("--accent-soft-border", `oklch(0.88 0.07 ${H})`);
    set("--accent-text", `oklch(0.48 0.18 ${H})`);
  }
}

function buildFilterFn(filters, search) {
  const { assignees, labels, priority, due } = filters;
  const q = search.trim().toLowerCase();
  return (card) => {
    if (!card) return false;
    if (assignees.size && !card.assignees.some((a) => assignees.has(a))) return false;
    if (labels.size   && !card.labels.some((l) => labels.has(l)))         return false;
    if (priority.size && !priority.has(card.priority))                     return false;
    if (due !== "any") {
      const info = dueInfo(card.due);
      if (!info) return false;
      if (due === "overdue" && info.tone !== "over")              return false;
      if (due === "today"   && info.days !== 0)                   return false;
      if (due === "week"    && !(info.days >= 0 && info.days <= 7)) return false;
    }
    if (q && !(card.title.toLowerCase().includes(q) || card.key.toLowerCase().includes(q))) return false;
    return true;
  };
}

function Workspace() {
  const plank = usePlank();

  // ── All hooks must be called unconditionally ─────────────
  const [t, setTweak]               = useTweaks(TWEAK_DEFAULTS);
  const [view, setView]             = useState(t.defaultView);
  const [filters, setFilters]       = useState({ assignees: new Set(), labels: new Set(), priority: new Set(), due: "any" });
  const [search, setSearch]         = useState("");
  const [groupBy, setGroupBy]       = useState("none");
  const [openCardId, setOpenCardId] = useState(null);
  const [cmdOpen, setCmdOpen]       = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [menuOpen, setMenuOpen]     = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [draftOpen, setDraftOpen]           = useState(false);
  const [shareOpen, setShareOpen]           = useState(false);
  const [toast, setToast]                   = useState(null);
  const { total: inboxBadge, markRead: markDmRead } = useInboxUnread(plank.currentUserId);

  useEffect(() => {
    return onToast(({ message, type }) => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
    });
  }, []);

  useEffect(() => { applyTheme(t); }, [t.theme, t.density, t.accentHue]);
  // Signal to PresenceProvider whether user is on a board view
  useEffect(() => { document.documentElement.dataset.view = view; }, [view]);

  const filterFn = useMemo(() => buildFilterFn(filters, search), [filters, search]);

  const newCard = useCallback(() => { setDraftOpen(true); }, []);

  const actions = useMemo(() => [
    { id: "v_kanban", icon: "kanban",   title: "Go to Board view",    shortcut: "B", run: () => setView("kanban") },
    { id: "v_list",   icon: "list",     title: "Go to List view",     shortcut: "L", run: () => setView("list") },
    { id: "v_cal",    icon: "calendar", title: "Go to Calendar view", shortcut: "C", run: () => setView("calendar") },
    { id: "v_time",   icon: "timeline", title: "Go to Timeline view", shortcut: "T", run: () => setView("timeline") },
    { id: "new",      icon: "plus",     title: "Create new task",     shortcut: "N", run: newCard },
    { id: "act",      icon: "timeline", title: "Toggle activity feed", run: () => setActivityOpen((v) => !v) },
    { id: "theme", icon: t.theme === "dark" ? "sun" : "moon", title: t.theme === "dark" ? "Switch to light mode" : "Switch to dark mode", run: () => setTweak("theme", t.theme === "dark" ? "light" : "dark") },
    { id: "dense", icon: "grid", title: t.density === "dense" ? "Comfortable density" : "Compact density", run: () => setTweak("density", t.density === "dense" ? "regular" : "dense") },
    { id: "reset", icon: "trash", title: "Reset board", hint: "Reload from database", run: () => plank.reset() },
  ], [t.theme, t.density, newCard]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || e.target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmdOpen((v) => !v); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "b") setView("kanban");
      else if (k === "l") setView("list");
      else if (k === "c") setView("calendar");
      else if (k === "t") setView("timeline");
      else if (k === "n") { e.preventDefault(); newCard(); }
      else if (k === "/") { e.preventDefault(); setCmdOpen(true); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [newCard]);

  // ── Guard: show loading / project setup ──────────────────
  if (plank.projectLoading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="app-loading">
          <svg width="32" height="32" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
            <circle cx="12" cy="12" r="9" fill="none" stroke="var(--accent-soft-border)" strokeWidth="2.5" />
            <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span className="app-loading__label">Loading…</span>
        </div>
      </div>
    );
  }
  if (!plank.project) return <ProjectSetup />;

  return (
    <div className="app-shell" data-menu={menuOpen ? "open" : "closed"}>
      <div className="sidebar-wrap">
        <Sidebar onOpenCmd={() => setCmdOpen(true)} onClose={() => setMenuOpen(false)} onNewProject={() => setNewProjectOpen(true)} view={view} onSetView={setView} inboxBadge={inboxBadge} />
      </div>
      {menuOpen && <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} />}

      <main className="app-main">
        <Topbar
          view={view} setView={setView}
          filters={filters} setFilters={setFilters}
          search={search} setSearch={setSearch}
          groupBy={groupBy} setGroupBy={setGroupBy}
          onOpenCmd={() => setCmdOpen(true)}
          onToggleActivity={() => setActivityOpen((v) => !v)}
          activityOpen={activityOpen}
          onToggleMenu={() => setMenuOpen((v) => !v)}
          onNewCard={newCard}
          onShare={() => setShareOpen(true)}
        />

        <div className="app-content">
          <div className="app-view">
            {plank.loading ? (
              <div className="app-loading">
                <svg width="32" height="32" viewBox="0 0 24 24" style={{ animation: "spin 0.8s linear infinite" }}>
                  <circle cx="12" cy="12" r="9" fill="none" stroke="var(--accent-soft-border)" strokeWidth="2.5" />
                  <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <span className="app-loading__label">Loading Plank…</span>
              </div>
            ) : (
              <>
                {view === "kanban"   && <Board onOpenCard={setOpenCardId} filterFn={filterFn} />}
                {view === "list"     && <ListView filterFn={filterFn} groupBy={groupBy} onOpen={setOpenCardId} />}
                {view === "calendar" && <CalendarView filterFn={filterFn} onOpen={setOpenCardId} />}
                {view === "timeline" && <TimelineView filterFn={filterFn} onOpen={setOpenCardId} />}
                {view === "inbox"    && <InboxView onMarkRead={markDmRead} />}
                {view === "mywork"   && <MyWorkView onOpen={setOpenCardId} groupBy={groupBy} />}
                {view === "due"      && <DueSoonView onOpen={setOpenCardId} groupBy={groupBy} />}
              </>
            )}
          </div>
          <ActivityFeed open={activityOpen} onClose={() => setActivityOpen(false)} onClear={plank.clearActivity} />
        </div>
      </main>

      {draftOpen && <CardModal draft onClose={() => setDraftOpen(false)} onCreated={() => setDraftOpen(false)} />}
      {openCardId && <CardModal cardId={openCardId} onClose={() => setOpenCardId(null)} />}
      {shareOpen && plank.project && <ProjectSettingsModal project={plank.project} onClose={() => setShareOpen(false)} />}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} actions={actions} onOpenCard={setOpenCardId} />
      {newProjectOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setNewProjectOpen(false); }}
        >
          <ProjectSetup modal onDone={() => setNewProjectOpen(false)} />
        </div>
      )}

      {t.showCursors && ["kanban","list","calendar","timeline"].includes(view) && <LiveCursors />}
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 99999, background: toast.type === 'error' ? 'var(--c-red)' : 'oklch(22% 0.02 264)', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, boxShadow: 'var(--shadow-lg)', animation: 'pop-in .18s ease-out', whiteSpace: 'nowrap' }}>
          {toast.message}
        </div>
      )}
      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakToggle label="Dark mode" value={t.theme === "dark"} onChange={(v) => setTweak("theme", v ? "dark" : "light")} />
        <div style={{ padding: "8px 2px 4px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Accent color</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ACCENTS.map((a) => (
              <button key={a.hue} title={a.name} onClick={() => setTweak("accentHue", a.hue)}
                style={{ width: 30, height: 30, borderRadius: "50%", background: `oklch(0.58 0.18 ${a.hue})`, cursor: "pointer", boxShadow: t.accentHue === a.hue ? `0 0 0 2px var(--surface), 0 0 0 4px oklch(0.58 0.18 ${a.hue})` : "inset 0 0 0 1px rgba(0,0,0,0.1)", border: "none" }} />
            ))}
          </div>
        </div>
        <TweakSection label="Layout" />
        <TweakRadio label="Density" value={t.density} options={["regular", "dense"]} onChange={(v) => setTweak("density", v)} />
        <TweakRadio label="Default view" value={t.defaultView} options={["kanban", "list"]} onChange={(v) => { setTweak("defaultView", v); setView(v); }} />
        <TweakSection label="Collaboration" />
        <TweakToggle label="Show live cursors" value={t.showCursors} onChange={(v) => setTweak("showCursors", v)} />
      </TweaksPanel>
    </div>
  );
}

async function upsertCurrentUser(authUser) {
  const meta = authUser.user_metadata || {};
  const derivedName = meta.full_name || meta.name || authUser.email.split('@')[0];
  const handle = `${authUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')}_${authUser.id.slice(0, 4)}`;
  const memberId = `u_${authUser.id.replace(/-/g, '').slice(0, 12)}`;

  // Check if member already exists with a user-set name (has space)
  const { data: existing } = await supabase
    .from('members').select('*').eq('auth_id', authUser.id).single();

  const nameAlreadySet = existing?.name && /\s/.test(existing.name.trim());
  const fullName = nameAlreadySet ? existing.name : derivedName;
  const words = fullName.trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
    : fullName.slice(0, 2).toUpperCase();

  const { data, error } = await supabase
    .from('members')
    .upsert({
      id: memberId,
      auth_id: authUser.id,
      name: fullName,
      handle: nameAlreadySet ? (existing.handle ?? handle) : handle,
      color: existing?.color ?? 'var(--accent)',
      initials,
      is_you: true,
      role: existing?.role ?? 'owner',
    }, { onConflict: 'auth_id' })
    .select()
    .single();

  if (error) { console.error('upsertCurrentUser:', error); return null; }

  // Auto-accept pending invites for this email
  const { data: invites } = await supabase
    .from('project_invites')
    .select('id, project_id, role')
    .eq('email', authUser.email)
    .eq('status', 'pending');

  if (invites?.length) {
    const memberId = data.id;
    await Promise.all(invites.map(async (inv) => {
      await supabase.from('project_members').upsert(
        { project_id: inv.project_id, member_id: memberId, role: inv.role },
        { onConflict: 'project_id,member_id' }
      );
      await supabase.from('project_invites').update({ status: 'accepted' }).eq('id', inv.id);
    }));
  }

  return data;
}

export default function App() {
  // undefined = loading, null = not authed, object = session
  const [session, setSession]           = useState(undefined);
  const [currentUser, setCurrentUser]   = useState(null);

  useEffect(() => {
    async function handleSession(session) {
      setSession(session ?? null);
      if (session?.user) {
        try {
          const member = await upsertCurrentUser(session.user);
          setCurrentUser(member);
        } catch (err) {
          console.error('upsertCurrentUser failed:', err);
          // still let the app render even if upsert fails
        }
      } else {
        setCurrentUser(null);
      }
    }

    supabase.auth.getSession()
      .then(({ data: { session } }) => handleSession(session))
      .catch((err) => { console.error('getSession failed:', err); setSession(null); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="app-loading">
          <svg width="32" height="32" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
            <circle cx="12" cy="12" r="9" fill="none" stroke="var(--accent-soft-border)" strokeWidth="2.5" />
            <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span className="app-loading__label">Loading…</span>
        </div>
      </div>
    );
  }

  if (!session) return <AuthPage />;

  // name has no space = auto-generated from email, prompt user to set real name
  const needsProfile = currentUser && !/\s/.test(currentUser.name.trim());

  if (needsProfile) {
    return (
      <ProfileSetup
        currentUser={currentUser}
        onDone={(updated) => setCurrentUser(updated)}
      />
    );
  }

  return (
    <PlankProvider currentUser={currentUser}>
      <PresenceProvider currentUser={currentUser}>
        <Workspace />
      </PresenceProvider>
    </PlankProvider>
  );
}

function ProfileSetup({ currentUser, onDone }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !trimmed.includes(' ')) {
      setError('Please enter your full name (first and last name separated by a space).');
      return;
    }
    setSaving(true);
    const words = trimmed.split(/\s+/);
    const initials = (words[0][0] + words[words.length - 1][0]).toUpperCase();
    const { data, error: err } = await supabase
      .from('members')
      .update({ name: trimmed, initials })
      .eq('id', currentUser.id)
      .select()
      .single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    onDone(data);
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', padding: '40px 48px', width: 420, boxShadow: 'var(--shadow-lg)' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Set your name</h2>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-muted)' }}>Enter your full name so your teammates can recognize you.</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            autoFocus
            type="text"
            placeholder="e.g. Jane Smith"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            style={{ padding: '10px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--text)', fontSize: 15, outline: 'none' }}
          />
          {error && <p style={{ margin: 0, fontSize: 12, color: 'var(--c-red)' }}>{error}</p>}
          <button
            type="submit"
            disabled={saving || !name.trim()}
            style={{ padding: '10px', borderRadius: 'var(--r-md)', background: 'var(--accent)', color: 'var(--text-on-accent)', fontWeight: 600, fontSize: 14, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving…' : 'Continue →'}
          </button>
        </form>
      </div>
    </div>
  );
}
