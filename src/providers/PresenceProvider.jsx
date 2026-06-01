import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { usePlank } from './PlankProvider';
import { supabase } from '../lib/supabase';

const PresenceCtx = createContext(null);

export function PresenceProvider({ children, currentUser }) {
  const plank = usePlank();
  const { memberById } = plank;

  const [onlineMembers, setOnlineMembers] = useState([]);
  const [typing, setTyping] = useState({});
  const [flash, setFlash]   = useState({});
  const [realCursors, setRealCursors] = useState({});
  const cursorsRef  = useRef({});
  const channelRef  = useRef(null);
  const lastSentRef = useRef(0);
  const timeoutsRef = useRef({});

  const flashCard = useCallback((cardId) => {
    setFlash((f) => ({ ...f, [cardId]: (f[cardId] || 0) + 1 }));
    setTimeout(() => setFlash((f) => { const n = { ...f }; delete n[cardId]; return n; }), 1200);
  }, []);

  // presence channel
  useEffect(() => {
    if (!currentUser || !plank.project?.id) return;

    setOnlineMembers([]);
    setRealCursors({});

    const channel = supabase.channel(`project-presence:${plank.project.id}`, {
      config: { presence: { key: currentUser.id } },
    });

    const getMembers = () => {
      const seen = new Set();
      return Object.values(channel.presenceState())
        .flat()
        .map((p) => p.member)
        .filter(Boolean)
        .filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
    };

    channel
      .on('presence', { event: 'sync' },  () => setOnlineMembers(getMembers()))
      .on('presence', { event: 'join' },  () => setOnlineMembers(getMembers()))
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setOnlineMembers(getMembers());
        if (leftPresences) {
          leftPresences.forEach((p) => {
            const id = p.member?.id;
            if (id) setRealCursors((c) => { const n = { ...c }; delete n[id]; return n; });
          });
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ member: currentUser });
        }
      });

    const cleanup = () => {
      channel.untrack();
      setTimeout(() => supabase.removeChannel(channel), 300);
    };

    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('beforeunload', cleanup);
      Object.values(timeoutsRef.current).forEach(clearTimeout);
      cleanup();
    };
  }, [currentUser?.id, plank.project?.id]);

  // separate broadcast channel for cursors
  useEffect(() => {
    if (!currentUser || !plank.project?.id) return;

    const cursorChannel = supabase.channel(`cursors:${plank.project.id}`, {
      config: { broadcast: { self: false } },
    });

    cursorChannel
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        const { id, x, y, name, color } = payload;
        if (!id || id === currentUser.id) return;
        if (timeoutsRef.current[id]) clearTimeout(timeoutsRef.current[id]);
        timeoutsRef.current[id] = setTimeout(() => {
          setRealCursors((c) => { const n = { ...c }; delete n[id]; return n; });
        }, 4000);
        setRealCursors((c) => ({ ...c, [id]: { x, y, name, color } }));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = cursorChannel;
        }
      });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(cursorChannel);
    };
  }, [currentUser?.id, plank.project?.id]);

  // broadcast own cursor position (throttled to ~30fps)
  useEffect(() => {
    if (!currentUser) return;
    const resolveColor = (c) => {
      if (!c || !c.startsWith('var(')) return c ?? '#6366f1';
      const val = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      return val || '#6366f1';
    };
    const BOARD_VIEWS = new Set(["kanban","list","calendar","timeline"]);
    const onMove = (e) => {
      const now = Date.now();
      if (now - lastSentRef.current < 33) return;
      if (!BOARD_VIEWS.has(document.documentElement.dataset.view)) return;
      lastSentRef.current = now;
      channelRef.current?.send({
        type: 'broadcast',
        event: 'cursor',
        payload: {
          id:    currentUser.id,
          x:     e.clientX,
          y:     e.clientY,
          name:  currentUser.name,
          color: resolveColor(currentUser.color),
        },
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [currentUser?.id, currentUser?.name, currentUser?.color]);

  const value = { onlineMembers, idle: new Set(), typing, flash, cursorsRef, realCursors, memberById, flashCard };
  return <PresenceCtx.Provider value={value}>{children}</PresenceCtx.Provider>;
}

export function usePresence() {
  return useContext(PresenceCtx);
}
