import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function getLastRead(peerId) {
  const val = localStorage.getItem(`plank_dm_read_${peerId}`);
  return val ? new Date(val) : new Date(0);
}


export function useInboxUnread(currentUserId) {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (!currentUserId) return;


    (async () => {
      const { data } = await supabase
        .from('direct_messages')
        .select('id, from_id, to_id, created_at')
        .or(`from_id.eq.${currentUserId},to_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false });

      if (!data) return;
      const map = {};
      for (const msg of data) {
        if (msg.from_id === currentUserId) continue;
        const peer = msg.from_id;
        if (new Date(msg.created_at) > getLastRead(peer)) {
          map[peer] = (map[peer] ?? 0) + 1;
        }
      }
      setCounts(map);
    })();


    const channel = supabase
      .channel(`inbox-unread-badge-${currentUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
      }, (payload) => {
        const msg = payload.new;
        if (msg.to_id !== currentUserId) return;
        const peer = msg.from_id;
        if (new Date(msg.created_at) > getLastRead(peer)) {
          setCounts((prev) => ({ ...prev, [peer]: (prev[peer] ?? 0) + 1 }));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  const markRead = (peerId) => {
    localStorage.setItem(`plank_dm_read_${peerId}`, new Date().toISOString());
    setCounts((prev) => ({ ...prev, [peerId]: 0 }));
  };

  return { total, counts, markRead };
}
