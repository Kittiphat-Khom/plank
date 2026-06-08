import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './sidebar.css';
import { showToast } from '../../lib/toast';
import { usePresence } from '../../providers/PresenceProvider';
import { Icon, Avatar } from '../Global';
import { ROLE_COLOR } from '../../hooks/usePermissions';
import { usePlank } from '../../providers/PlankProvider';

const ROLES = ['owner', 'admin', 'member', 'viewer'];

export function ProjectSettingsModal({ project, onClose }) {
  const { MEMBERS, memberById, updateMemberRole, currentUser } = usePlank();
  const [name, setName] = useState(project.name);
  const [rows, setRows] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteStatus, setInviteStatus] = useState(null);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    import('../../lib/supabase').then(({ supabase: sb }) => {
      Promise.all([
        sb.from('project_members').select('member_id, role').eq('project_id', project.id),
        sb.from('project_invites').select('id, email, role').eq('project_id', project.id).eq('status', 'pending'),
      ]).then(([{ data: members }, { data: invites }]) => {
        setRows(members ?? []);
        setPendingInvites(invites ?? []);
      });
    });
  }, [project.id]);

  const inIds = new Set(rows.map((r) => r.member_id));
  const notIn = MEMBERS.filter((m) => m.id !== currentUser?.id && !inIds.has(m.id));

  const addMember = async (memberId) => {
    const { supabase: sb } = await import('../../lib/supabase');
    await sb.from('project_members').upsert({ project_id: project.id, member_id: memberId, role: 'member' }, { onConflict: 'project_id,member_id' });
    setRows((prev) => [...prev, { member_id: memberId, role: 'member' }]);
    setShowAdd(false);
  };

  const removeMember = async (memberId) => {
    const { supabase: sb } = await import('../../lib/supabase');
    await sb.from('project_members').delete().eq('project_id', project.id).eq('member_id', memberId);
    setRows((prev) => prev.filter((r) => r.member_id !== memberId));
  };

  const changeRole = async (memberId, role) => {
    await updateMemberRole(memberId, role);
    setRows((prev) => prev.map((r) => r.member_id === memberId ? { ...r, role } : r));
  };

  const copyInviteLink = async () => {
    try {
      const { supabase: sb } = await import('../../lib/supabase');
      const { data: existing } = await sb.from('project_invite_links')
        .select('token').eq('project_id', project.id).limit(1).maybeSingle();
      let token = existing?.token;
      if (!token) {
        const { data, error } = await sb.from('project_invite_links')
          .insert({ project_id: project.id, role: 'member', created_by: currentUser?.id ?? null })
          .select('token').single();
        if (error) throw error;
        token = data?.token;
      }
      if (!token) throw new Error('Failed to generate invite token');
      const url = `${window.location.origin}?join=${token}`;
      try {
        await navigator.clipboard.writeText(url);
      } catch {

        const el = document.createElement('textarea');
        el.value = url;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch (err) {
      console.error('copyInviteLink failed:', err);
      showToast('Failed to copy invite link', 'error');
    }
  };

  const sendInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    const { supabase: sb } = await import('../../lib/supabase');


    const { error: dbError } = await sb.from('project_invites').upsert(
      { project_id: project.id, email, role: inviteRole, invited_by: currentUser?.id ?? null },
      { onConflict: 'project_id,email' }
    );
    if (dbError) { console.error('invite error:', dbError); setInviteStatus('error'); return; }


    const { error: fnError } = await sb.functions.invoke('invite-member', {
      body: { email, project_id: project.id, role: inviteRole },
    });
    if (fnError) console.warn('Edge Function invite failed (email may not send):', fnError);

    setPendingInvites((prev) => [...prev.filter((i) => i.email !== email), { email, role: inviteRole }]);
    setInviteEmail('');
    setInviteStatus('sent');
    setTimeout(() => setInviteStatus(null), 3000);
  };

  const cancelInvite = async (email) => {
    const { supabase: sb } = await import('../../lib/supabase');
    await sb.from('project_invites').delete().eq('project_id', project.id).eq('email', email);
    setPendingInvites((prev) => prev.filter((i) => i.email !== email));
  };

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'oklch(0.2 0.02 264 / 0.42)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 480, background: 'var(--bg)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '85vh' }}>

        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Project settings</span>
          <button onClick={onClose} style={{ marginLeft: 'auto', color: 'var(--text-faint)' }}><Icon name="close" size={16} /></button>
        </div>


        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 6 }}>Project name</label>
          <div style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-sunken)', fontSize: 14, color: 'var(--text-muted)', boxSizing: 'border-box', userSelect: 'none' }}>
            {name}
          </div>
        </div>


        <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }}>


          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Invite link</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>Anyone with this link can join as member</div>
            </div>
            <button
              onClick={copyInviteLink}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, background: linkCopied ? 'var(--c-green)' : 'var(--accent)', color: '#fff', flexShrink: 0, transition: 'background .2s' }}
            >
              <Icon name={linkCopied ? 'check' : 'layers'} size={13} />
              {linkCopied ? 'Copied!' : 'Copy link'}
            </button>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Invite by email</div>


          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input
              type="email"
              placeholder="email@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendInvite()}
              style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, color: 'var(--text)' }}
            />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
              style={{ padding: '7px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}
            >
              {ROLES.filter((r) => r !== 'owner').map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
            <button onClick={sendInvite}
              style={{ padding: '7px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600, background: 'var(--accent)', color: '#fff' }}
            >Send</button>
          </div>
          {inviteStatus === 'sent' && <p style={{ fontSize: 12, color: 'var(--c-green)', marginBottom: 8 }}>✓ Invite saved — they'll join when they sign up</p>}
          {inviteStatus === 'error' && <p style={{ fontSize: 12, color: 'var(--c-red)', marginBottom: 8 }}>Error sending invite</p>}


          {pendingInvites.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 600, marginBottom: 6 }}>PENDING</div>
              {pendingInvites.map((inv) => (
                <div key={inv.email} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                  <span style={{ fontSize: 13, flex: 1, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.email}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)', background: 'var(--surface)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 99, flexShrink: 0 }}>{inv.role}</span>
                  <button
                    title="Copy signup link"
                    onClick={() => { navigator.clipboard.writeText(window.location.origin); }}
                    style={{ color: 'var(--text-faint)', display: 'flex', padding: 3, borderRadius: 5, flexShrink: 0 }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  ><Icon name="layers" size={13} /></button>
                  <button onClick={() => cancelInvite(inv.email)} style={{ color: 'var(--c-red)', display: 'flex', padding: 3, borderRadius: 5, flexShrink: 0 }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'color-mix(in oklch, var(--c-red) 10%, transparent)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  ><Icon name="close" size={13} /></button>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10, marginTop: 4 }}>Members & permissions</div>


          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

            {MEMBERS.filter((m) => m.id === project.owner_id).map((m) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                <Avatar member={m} size={30} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>@{m.handle}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-amber)', background: 'color-mix(in oklch, var(--c-amber) 12%, transparent)', padding: '3px 10px', borderRadius: 99 }}>Owner</span>
              </div>
            ))}


            {rows.filter((row) => row.member_id !== project.owner_id).map((row) => {
              const m = memberById[row.member_id];
              if (!m) return null;
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                  <Avatar member={m} size={30} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>@{m.handle}</div>
                  </div>
                  <select value={row.role} onChange={(e) => changeRole(m.id, e.target.value)}
                    style={{ fontSize: 12, fontWeight: 600, padding: '4px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }}
                  >
                    {ROLES.filter((r) => r !== 'owner').map((r) => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                  <button onClick={() => removeMember(m.id)}
                    style={{ color: 'var(--c-red)', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}
                    title="Remove from project"
                    onMouseEnter={(e) => e.currentTarget.style.background = 'color-mix(in oklch, var(--c-red) 10%, transparent)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>


        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--border)', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)' }}>Cancel</button>
          <button onClick={onClose} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'var(--accent)', color: '#fff' }}>Save</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Logo() {
  return (
    <div className="sidebar__logo">
      <div className="sidebar__logo-icon">
        <div className="sidebar__logo-bars">
          <span className="sidebar__logo-bar sidebar__logo-bar--sm" />
          <span className="sidebar__logo-bar sidebar__logo-bar--lg" />
          <span className="sidebar__logo-bar sidebar__logo-bar--md" />
        </div>
      </div>
      <span className="sidebar__logo-text">Plank</span>
    </div>
  );
}

function NavItem({ icon, label, active, badge, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      data-active={active ? "true" : undefined}
      className="nav-item"
    >
      {accent
        ? <span className="nav-item__accent" style={{ background: accent }} />
        : <Icon name={icon} size={16} />
      }
      <span className="nav-item__label">{label}</span>
      {badge != null && (
        <span className="nav-item__badge">{badge}</span>
      )}
    </button>
  );
}

function DeleteProjectModal({ projectName, onConfirm, onCancel }) {
  return createPortal(
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'oklch(0.2 0.02 264 / 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 360, background: 'var(--bg)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', overflow: 'hidden', animation: 'pop-in .18s ease-out' }}>
        <div style={{ padding: '28px 28px 20px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'color-mix(in oklch, var(--c-red) 12%, transparent)', border: '1px solid color-mix(in oklch, var(--c-red) 20%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Icon name="trash" size={22} style={{ color: 'var(--c-red)' }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Delete "{projectName}"?</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            This will permanently delete the project and all its cards. This cannot be undone.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '0 20px 20px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 14, fontWeight: 600, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 14, fontWeight: 700, background: 'var(--c-red)', color: '#fff', border: 'none' }}>Delete project</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function LogoutConfirmModal({ onConfirm, onCancel }) {
  return createPortal(
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'oklch(0.2 0.02 264 / 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 360, background: 'var(--bg)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', overflow: 'hidden', animation: 'pop-in .18s ease-out' }}>
        <div style={{ padding: '28px 28px 20px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'color-mix(in oklch, var(--c-red) 12%, transparent)', border: '1px solid color-mix(in oklch, var(--c-red) 20%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Icon name="logout" size={22} style={{ color: 'var(--c-red)' }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Sign out?</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            You'll be redirected to the login page.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '0 20px 20px' }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 14, fontWeight: 600, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 14, fontWeight: 700, background: 'var(--c-red)', color: '#fff', border: 'none' }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const PROFILE_COLORS = [
  { label: 'Indigo',  value: 'oklch(52% 0.28 264)' },
  { label: 'Blue',    value: 'oklch(52% 0.26 250)' },
  { label: 'Violet',  value: 'oklch(52% 0.28 300)' },
  { label: 'Rose',    value: 'oklch(54% 0.26 10)'  },
  { label: 'Green',   value: 'oklch(52% 0.22 155)' },
  { label: 'Amber',   value: 'oklch(62% 0.22 55)'  },
  { label: 'Teal',    value: 'oklch(52% 0.20 195)' },
  { label: 'Pink',    value: 'oklch(54% 0.26 330)' },
];

function ProfilePopover({ member, anchorRef, open, onClose, onUpdated, onSignOut }) {
  const ref = useRef();
  const fileRef = useRef();
  const [pos, setPos] = useState(null);
  const [tab, setTab] = useState('main');
  const [editName, setEditName] = useState('');
  const [editHandle, setEditHandle] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    setPos({ bottom: window.innerHeight - r.top + 8, left: r.left });
    setTab('main');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !anchorRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  if (!open || !pos) return null;

  async function saveProfile() {
    const name = editName.trim();
    const handle = editHandle.trim();
    if (!name || !name.includes(' ')) { setError('Full name required (first + last)'); return; }
    setSaving(true);
    const words = name.split(/\s+/);
    const initials = (words[0][0] + words[words.length - 1][0]).toUpperCase();
    const { supabase: sb } = await import('../../lib/supabase');
    const { data, error: err } = await sb.from('members')
      .update({ name, handle: handle || member.handle, initials })
      .eq('id', member.id).select().single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    onUpdated(data);
    setTab('main');
  }

  async function setColor(color) {
    const { supabase: sb } = await import('../../lib/supabase');
    const { data } = await sb.from('members').update({ color }).eq('id', member.id).select().single();
    if (data) onUpdated(data);
  }

  async function uploadAvatar(file) {
    if (!file) return;
    setUploading(true);
    const { supabase: sb } = await import('../../lib/supabase');
    const ext = file.name.split('.').pop();
    const path = `${member.id}.${ext}`;
    const { error: upErr } = await sb.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) { setUploading(false); setError(upErr.message); return; }
    const { data: { publicUrl } } = sb.storage.from('avatars').getPublicUrl(path);
    const url = `${publicUrl}?t=${Date.now()}`;
    const { data } = await sb.from('members').update({ avatar_url: url }).eq('id', member.id).select().single();
    setUploading(false);
    if (data) onUpdated(data);
  }

  return createPortal(
    <div ref={ref} style={{ position: 'fixed', bottom: pos.bottom, left: pos.left, width: 240, zIndex: 9500, background: 'var(--surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', overflow: 'hidden', animation: 'pop-in .14s ease-out' }}>
      {tab === 'main' ? (
        <>
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => uploadAvatar(e.target.files[0])} />
            <button onClick={() => fileRef.current.click()} title="Change photo" style={{ position: 'relative', background: 'none', border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%', flexShrink: 0 }}>
              <Avatar member={member} size={36} />
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'oklch(0 0 0 / 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity .15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                {uploading ? '…' : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>}
              </span>
            </button>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>@{member.handle}</div>
            </div>
          </div>
          <div style={{ padding: 6 }}>
            <button onClick={() => { setEditName(member.name); setEditHandle(member.handle); setError(''); setTab('edit'); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Icon name="user" size={14} style={{ color: 'var(--text-muted)' }} /> Edit profile
            </button>
            <div style={{ padding: '6px 10px 4px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Avatar color</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PROFILE_COLORS.map(c => (
                  <button key={c.label} title={c.label} onClick={() => setColor(c.value)}
                    style={{ width: 22, height: 22, borderRadius: '50%', background: c.value, border: member.color === c.value ? '2px solid var(--text)' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
                ))}
              </div>
            </div>
            <div style={{ height: 1, background: 'var(--border)', margin: '6px 4px' }} />
            <button onClick={onSignOut} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: 'var(--c-red)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in oklch, var(--c-red) 8%, transparent)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Icon name="logout" size={14} /> Sign out
            </button>
          </div>
        </>
      ) : (
        <div style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <button onClick={() => setTab('main')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}>←</button>
            <span style={{ fontWeight: 600, fontSize: 13.5 }}>Edit profile</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Full name</div>
              <input value={editName} onChange={e => { setEditName(e.target.value); setError(''); }}
                style={{ width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Username</div>
              <input value={editHandle} onChange={e => setEditHandle(e.target.value)}
                style={{ width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-sunken)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            {error && <p style={{ margin: 0, fontSize: 11.5, color: 'var(--c-red)' }}>{error}</p>}
            <button onClick={saveProfile} disabled={saving}
              style={{ padding: '8px', borderRadius: 8, background: 'var(--accent)', color: 'var(--text-on-accent)', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

export function Sidebar({ onOpenCmd, onClose, onNewProject, view, onSetView, inboxBadge, onSignIn }) {
  const presence  = usePresence();
  const plank     = usePlank();
  const { memberById, projects, project, selectProject, deleteProject, reorderProjects, patchMember } = plank;
  const isGuest = !!plank.isGuest;
  const [settingsProjectId, setSettingsProjectId] = useState(null);


  const [projectOrder, setProjectOrder] = useState(() => projects.map((p) => p.id));
  const dragIdx = useRef(null);
  const [dropIdx, setDropIdx] = useState(null);


  useEffect(() => {
    setProjectOrder((prev) => {
      const incoming = projects.map((p) => p.id);
      const kept = prev.filter((id) => incoming.includes(id));
      const added = incoming.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
  }, [projects]);

  const orderedProjects = projectOrder
    .map((id) => projects.find((p) => p.id === id))
    .filter(Boolean);

  function handleDragStart(e, idx) {
    if (isGuest) { e.preventDefault(); return; }
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, idx) {
    if (isGuest) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (idx !== dragIdx.current) setDropIdx(idx);
  }

  function handleDrop(e, idx) {
    if (isGuest) return;
    e.preventDefault();
    const from = dragIdx.current;
    if (from === null || from === idx) { setDropIdx(null); return; }
    setProjectOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(idx, 0, moved);
      reorderProjects(next);
      return next;
    });
    dragIdx.current = null;
    setDropIdx(null);
  }

  function handleDragEnd() {
    dragIdx.current = null;
    setDropIdx(null);
  }
  const [deleteProjectId, setDeleteProjectId] = useState(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [localUser, setLocalUser] = useState(null);
  const profileBtnRef = useRef();
  const settingsProject = projects.find((p) => p.id === settingsProjectId) ?? null;
  const deleteProjectTarget = projects.find((p) => p.id === deleteProjectId) ?? null;

  const handleLogout = async () => {
    const { supabase: sb } = await import('../../lib/supabase');
    sb.auth.signOut();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__logo-row">
        <Logo />
        <button className="sidebar-close" onClick={onClose} aria-label="Close menu">
          <Icon name="close" size={18} />
        </button>
      </div>

      <button onClick={onOpenCmd} className="sidebar__search">
        <Icon name="search" size={15} />
        <span className="sidebar__search-label">Search or jump…</span>
        <span className="mono sidebar__search-kbd">⌘K</span>
      </button>

      <div className="sidebar__nav">
        <NavItem icon="inbox"  label="Inbox"   active={view === "inbox"} badge={inboxBadge || undefined} onClick={() => onSetView?.("inbox")} />
        <NavItem icon="layers" label="My work" active={view === "mywork"}  onClick={() => onSetView?.("mywork")} />
        <NavItem icon="calendar" label="Due date" active={view === "due"} onClick={() => onSetView?.("due")} />
      </div>

      <div className="sidebar__section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Projects</span>
        <button
          onClick={onNewProject}
          title="New project"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 5, color: 'var(--text-faint)', background: 'transparent', transition: 'background .15s, color .15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.color = 'var(--text)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)'; }}
          aria-label="New project"
        >
          <Icon name="plus" size={14} />
        </button>
      </div>
      <div className="sidebar__board-list">
        {orderedProjects.map((p, idx) => (
          <div
            key={p.id}
            className="project-row nav-item"
            data-active={p.id === project?.id && ["kanban","list","calendar","timeline"].includes(view) ? "true" : undefined}
            data-drop-above={dropIdx === idx ? "true" : undefined}
            data-readonly={isGuest ? "true" : undefined}
            draggable={!isGuest}
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            onClick={() => { selectProject(p.id); onSetView?.("kanban"); }}
          >
            <span className="nav-item__accent" style={{ background: p.color || 'var(--accent)' }} />
            <span className="nav-item__label" style={{ flex: 1 }}>{p.name}</span>
            {!isGuest && (
              <button
                className="project-row__settings"
                title="Project settings"
                onClick={(e) => { e.stopPropagation(); setSettingsProjectId(p.id); }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
            )}
            {!isGuest && p.owner_id === plank.currentUser?.id && (
              <button
                className="project-row__settings"
                title="Delete project"
                onClick={(e) => { e.stopPropagation(); setDeleteProjectId(p.id); }}
                style={{ color: 'var(--c-red)' }}
              >
                <Icon name="trash" size={17} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="sidebar__presence">
        <div className="sidebar__presence-label">
          <span className="sidebar__presence-dot" />
          Online · {presence.onlineMembers.length}
        </div>
        <div className="sidebar__avatar-row">
          {presence.onlineMembers.map((m) => {
            const live = memberById[m.id] ?? m;
            return (
              <div
                key={m.id}
                title={`${live.name} · online`}
                style={{ position: 'relative' }}
              >
                <Avatar member={live} size={28} />
                {m.role === 'owner' && (
                  <span
                    style={{
                      position: 'absolute', bottom: -1, right: -1,
                      width: 10, height: 10, borderRadius: '50%',
                      background: ROLE_COLOR.owner,
                      border: '1.5px solid var(--bg-sunken)',
                    }}
                  />
                )}
                {m.role === 'admin' && (
                  <span
                    style={{
                      position: 'absolute', bottom: -1, right: -1,
                      width: 10, height: 10, borderRadius: '50%',
                      background: ROLE_COLOR.admin,
                      border: '1.5px solid var(--bg-sunken)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>


        {plank.currentUser && (() => {
          const me = localUser ?? plank.currentUser;
          return (
            <div style={{ marginTop: 10, padding: '0 9px' }}>
              <button
                ref={profileBtnRef}
                onClick={isGuest ? onSignIn : () => setProfileOpen(o => !o)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 7, padding: '5px 6px', borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Avatar member={me} size={22} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isGuest ? 'Guest viewer' : me.name}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 20, borderRadius: 6, border: '1.5px solid var(--accent-soft-border)', background: 'var(--accent-soft)', flexShrink: 0 }}>
                  <Icon name={isGuest ? 'logout' : 'settings'} size={13} style={{ color: 'var(--accent)' }} />
                </span>
              </button>
              {!isGuest && (
                <ProfilePopover
                  member={me}
                  anchorRef={profileBtnRef}
                  open={profileOpen}
                  onClose={() => setProfileOpen(false)}
                  onUpdated={(updated) => { setLocalUser(updated); patchMember(updated); setProfileOpen(false); }}
                  onSignOut={() => { setProfileOpen(false); setLogoutOpen(true); }}
                />
              )}
            </div>
          );
        })()}
      </div>

      {logoutOpen && <LogoutConfirmModal onConfirm={handleLogout} onCancel={() => setLogoutOpen(false)} />}
      {deleteProjectTarget && (
        <DeleteProjectModal
          projectName={deleteProjectTarget.name}
          onConfirm={() => { deleteProject(deleteProjectTarget.id); setDeleteProjectId(null); }}
          onCancel={() => setDeleteProjectId(null)}
        />
      )}
      {settingsProject && (
        <ProjectSettingsModal
          project={settingsProject}
          onClose={() => setSettingsProjectId(null)}
        />
      )}
    </aside>
  );
}
