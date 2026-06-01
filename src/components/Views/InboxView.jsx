import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlank } from '../../providers/PlankProvider';
import { Avatar } from '../Global';
import { MEMBERS as STATIC_MEMBERS } from '../../config/data';

// IDs of hardcoded bot/seed members — never show these in DM list
const BOT_IDS = new Set(STATIC_MEMBERS.map((m) => m.id));

// ── localStorage helpers ──────────────────────────────────────

function getLastRead(peerId) {
  const val = localStorage.getItem(`plank_dm_read_${peerId}`);
  return val ? new Date(val) : new Date(0);
}

function markRead(peerId) {
  localStorage.setItem(`plank_dm_read_${peerId}`, new Date().toISOString());
}

// ── Message bubble ───────────────────────────────────────────

function Bubble({ msg, isMe, memberById, onDelete }) {
  const sender = memberById[msg.from_id];
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: 10 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!isMe && <Avatar member={sender} size={28} />}
      <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexDirection: isMe ? 'row-reverse' : 'row' }}>
          <div style={{
            padding: '8px 12px',
            borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            background: isMe ? 'var(--accent)' : 'var(--surface-2)',
            color: isMe ? 'var(--text-on-accent)' : 'var(--text)',
            fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word',
          }}>
            {msg.text}
          </div>
          {isMe && hovered && (
            <button
              onClick={() => onDelete?.(msg.id)}
              title="Delete message"
              style={{
                flexShrink: 0, width: 24, height: 24, borderRadius: 6,
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--c-red)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0.7,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'color-mix(in oklch, var(--c-red) 12%, transparent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.background = 'transparent'; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </button>
          )}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-faint)', paddingInline: 4 }}>{time}</span>
      </div>
    </div>
  );
}

// ── Thread ───────────────────────────────────────────────────

function Thread({ peer, currentUserId, memberById, onNewMessage }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const channelRef = useRef(null);

  const load = useCallback(async () => {
    const { supabase } = await import('../../lib/supabase');
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(from_id.eq.${currentUserId},to_id.eq.${peer.id}),and(from_id.eq.${peer.id},to_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true });
    setMessages(data ?? []);
    setLoading(false);
  }, [currentUserId, peer.id]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    load();

    let sub;
    (async () => {
      const { supabase } = await import('../../lib/supabase');
      sub = supabase
        .channel(`dm:thread:${[currentUserId, peer.id].sort().join(':')}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
          const msg = payload.new;
          const relevant =
            (msg.from_id === currentUserId && msg.to_id === peer.id) ||
            (msg.from_id === peer.id && msg.to_id === currentUserId);
          if (!relevant) return;
          setMessages((prev) => [...prev, msg]);
          onNewMessage?.(msg);
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'direct_messages' }, (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        })
        .subscribe();
      channelRef.current = sub;
    })();

    return () => {
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
  }, [peer.id, currentUserId, load, onNewMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const deleteMessage = async (id) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    const { supabase } = await import('../../lib/supabase');
    await supabase.from('direct_messages').delete().eq('id', id);
  };

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const { supabase } = await import('../../lib/supabase');
    await supabase.from('direct_messages').insert({ from_id: currentUserId, to_id: peer.id, text });
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <Avatar member={peer} size={34} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{peer.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>@{peer.handle}</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 13, paddingTop: 40 }}>Loading…</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 13, paddingTop: 40 }}>
            No messages yet. Say hi!
          </div>
        ) : (
          messages.map((msg) => (
            <Bubble key={msg.id} msg={msg} isMe={msg.from_id === currentUserId} memberById={memberById} onDelete={deleteMessage} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '8px 12px',
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Message ${peer.name}…`}
            rows={1}
            style={{
              flex: 1, resize: 'none', background: 'transparent', border: 'none',
              outline: 'none', fontSize: 14, color: 'var(--text)', fontFamily: 'inherit',
              lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
            }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            style={{
              flexShrink: 0, width: 32, height: 32, borderRadius: 8,
              background: input.trim() ? 'var(--accent)' : 'var(--surface-hover)',
              color: input.trim() ? 'var(--text-on-accent)' : 'var(--text-faint)',
              border: 'none', cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .15s, color .15s',
            }}
            aria-label="Send"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 5, textAlign: 'right' }}>
          Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}

// ── Member row ───────────────────────────────────────────────

function MemberRow({ member, active, unread, latestMsg, onClick, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const time = latestMsg
    ? new Date(latestMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onClick}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 16px',
          background: active ? 'var(--accent-soft)' : hovered ? 'var(--surface-hover)' : 'transparent',
          border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
          transition: 'background .12s',
        }}
      >
        <Avatar member={member} size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            <span style={{
              fontWeight: unread > 0 ? 700 : active ? 600 : 500,
              fontSize: 13,
              color: active ? 'var(--accent-text)' : 'var(--text)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {member.name}
            </span>
            {time && !hovered && (
              <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>{time}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            <span style={{
              fontSize: 12,
              color: unread > 0 ? 'var(--text-muted)' : 'var(--text-faint)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              fontWeight: unread > 0 ? 600 : 400,
            }}>
              {latestMsg ? latestMsg.text : `@${member.handle}`}
            </span>
            {unread > 0 && !hovered && (
              <span style={{
                flexShrink: 0, minWidth: 18, height: 18, borderRadius: 9,
                background: 'var(--accent)', color: 'var(--text-on-accent)',
                fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
              }}>
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Delete conversation button — shows on hover */}
      {hovered && onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(member.id); }}
          title="Delete conversation"
          style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
            background: 'color-mix(in oklch, var(--c-red) 12%, transparent)',
            color: 'var(--c-red)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6M9 6V4h6v2" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── New DM picker ─────────────────────────────────────────────

function NewDMPicker({ peers, onSelect, onClose }) {
  const [q, setQ] = useState('');
  const filtered = peers.filter((m) =>
    m.name.toLowerCase().includes(q.toLowerCase()) ||
    m.handle.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div style={{
      position: 'absolute', top: 44, left: 8, right: 8, zIndex: 50,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, boxShadow: 'var(--shadow-md)', overflow: 'hidden',
    }}>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search people…"
        style={{
          width: '100%', padding: '10px 12px', border: 'none', borderBottom: '1px solid var(--border)',
          background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--text)',
          fontFamily: 'inherit', boxSizing: 'border-box',
        }}
      />
      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-faint)' }}>No users found</div>
        ) : (
          filtered.map((m) => (
            <button
              key={m.id}
              onClick={() => { onSelect(m.id); onClose(); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', background: 'transparent', border: 'none',
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Avatar member={m} size={30} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{m.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>@{m.handle}</div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── InboxView ────────────────────────────────────────────────

export function InboxView({ onMarkRead }) {
  const { MEMBERS, memberById, currentUserId } = usePlank();
  const [peerId, setPeerId] = useState(null);
  // { [peerId]: { latest: Message | null, unread: number } }
  const [convs, setConvs] = useState({});
  const peerIdRef = useRef(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => { peerIdRef.current = peerId; }, [peerId]);

  // All real (non-bot) users except self
  const allPeers = MEMBERS.filter((m) => m.id !== currentUserId && !BOT_IDS.has(m.id));
  // Sidebar list: only peers with at least one message
  const peers = allPeers.filter((m) => convs[m.id]?.latest);

  // Load all DMs for conversation list
  const loadConvs = useCallback(async () => {
    const { supabase } = await import('../../lib/supabase');
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`from_id.eq.${currentUserId},to_id.eq.${currentUserId}`)
      .order('created_at', { ascending: false });

    if (!data) return;

    const map = {};
    for (const msg of data) {
      const peer = msg.from_id === currentUserId ? msg.to_id : msg.from_id;
      if (!map[peer]) map[peer] = { latest: msg, unread: 0 };
      if (msg.from_id !== currentUserId && new Date(msg.created_at) > getLastRead(peer)) {
        map[peer].unread++;
      }
    }
    setConvs(map);
  }, [currentUserId]);

  // Subscribe to all new DMs at list level
  useEffect(() => {
    loadConvs();

    let sub;
    (async () => {
      const { supabase } = await import('../../lib/supabase');
      sub = supabase
        .channel('dm:inbox-list')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
          const msg = payload.new;
          const isForMe = msg.from_id === currentUserId || msg.to_id === currentUserId;
          if (!isForMe) return;
          const peer = msg.from_id === currentUserId ? msg.to_id : msg.from_id;
          const isOpen = peerIdRef.current === peer;
          const isIncoming = msg.from_id !== currentUserId;
          setConvs((prev) => ({
            ...prev,
            [peer]: {
              latest: msg,
              unread: isOpen ? 0 : (prev[peer]?.unread ?? 0) + (isIncoming ? 1 : 0),
            },
          }));
        })
        .subscribe();
    })();

    return () => { sub?.unsubscribe(); };
  }, [currentUserId, loadConvs]);

  // Sort peers: those with messages first (by latest), then rest
  const sortedPeers = [...peers].sort((a, b) => {
    const ta = convs[a.id]?.latest?.created_at ?? '';
    const tb = convs[b.id]?.latest?.created_at ?? '';
    return tb.localeCompare(ta);
  });

  const openConv = (id) => {
    setPeerId(id);
    markRead(id);
    onMarkRead?.(id);
    setConvs((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { latest: null }), unread: 0 },
    }));
  };

  const deleteConv = async (id) => {
    if (peerId === id) setPeerId(null);
    setConvs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    const { supabase } = await import('../../lib/supabase');
    await supabase
      .from('direct_messages')
      .delete()
      .or(`and(from_id.eq.${currentUserId},to_id.eq.${id}),and(from_id.eq.${id},to_id.eq.${currentUserId})`);
  };

  const peer = memberById[peerId] ?? null;

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Member list */}
      <div style={{
        width: 260, flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-sunken)', overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          padding: '16px 16px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Direct Messages
          </span>
          <button
            onClick={() => setPickerOpen((v) => !v)}
            title="New message"
            style={{
              width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer',
              background: pickerOpen ? 'var(--accent-soft)' : 'transparent',
              color: pickerOpen ? 'var(--accent-text)' : 'var(--text-faint)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .12s, color .12s',
            }}
            onMouseEnter={(e) => { if (!pickerOpen) { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.color = 'var(--text)'; }}}
            onMouseLeave={(e) => { if (!pickerOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)'; }}}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {pickerOpen && (
          <NewDMPicker
            peers={allPeers}
            onSelect={(id) => openConv(id)}
            onClose={() => setPickerOpen(false)}
          />
        )}

        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 8 }}>
          {sortedPeers.length === 0 ? (
            <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--text-faint)', textAlign: 'center' }}>
              No conversations yet.<br />Press + to start one.
            </div>
          ) : (
            sortedPeers.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                active={m.id === peerId}
                unread={convs[m.id]?.unread ?? 0}
                latestMsg={convs[m.id]?.latest ?? null}
                onClick={() => openConv(m.id)}
                onDelete={deleteConv}
              />
            ))
          )}
        </div>
      </div>

      {/* Thread */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {peer ? (
          <Thread
            key={peer.id}
            peer={peer}
            currentUserId={currentUserId}
            memberById={memberById}
            onNewMessage={(msg) => {
              // Thread already handles display; list subscription handles convs state
            }}
          />
        ) : (
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 12, color: 'var(--text-faint)',
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span style={{ fontSize: 14 }}>Select someone to message</span>
          </div>
        )}
      </div>
    </div>
  );
}
