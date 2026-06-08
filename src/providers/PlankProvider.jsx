import { createContext, useContext, useReducer, useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MEMBERS, LABELS, COLUMNS } from '../config/data';
import { transformCard } from '../decorators/card';
import { showToast } from '../lib/toast';

const PlankCtx = createContext(null);


const CARD_SELECT = `
  *,
  card_labels(label_id),
  card_assignees(member_id),
  subtasks(id, text, done, position),
  comments(id, author_id, text, created_at)
`;

export async function fetchAllCards(projectId) {
  if (!projectId) return [];
  const { data, error } = await supabase.from('cards').select(CARD_SELECT).eq('project_id', projectId).order('position');
  if (error) { console.error('fetchAllCards:', error); return []; }
  return data.map(transformCard);
}

export async function fetchCard(cardId) {
  const { data, error } = await supabase.from('cards').select(CARD_SELECT).eq('id', cardId).single();
  if (error) return null;
  return transformCard(data);
}

export async function fetchActivity() {
  const { data } = await supabase.from('activity').select('*').order('created_at', { ascending: false }).limit(60);
  return (data || []).map((a) => ({ id: a.id, who: a.who, verb: a.verb, target: a.target, detail: a.detail, at: a.created_at }));
}

function buildState(cards, activity) {
  const byId = {};
  const cardsByCol = {};
  COLUMNS.forEach((c) => (cardsByCol[c.id] = []));
  [...cards].sort((a, b) => a.position - b.position).forEach((card) => {
    byId[card.id] = card;
    if (cardsByCol[card.columnId]) cardsByCol[card.columnId].push(card.id);
  });
  return { byId, cardsByCol, activity, syncing: {}, ghosted: {} };
}


function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE': return action.state;

    case 'SYNC_CARD': {
      const card = action.card;
      const old = state.byId[card.id];
      const byId = { ...state.byId, [card.id]: card };
      let cardsByCol = state.cardsByCol;
      if (!old) {
        cardsByCol = { ...cardsByCol, [card.columnId]: [...(cardsByCol[card.columnId] || []), card.id] };
      } else if (old.columnId !== card.columnId) {
        cardsByCol = { ...cardsByCol };
        cardsByCol[old.columnId] = cardsByCol[old.columnId].filter((id) => id !== card.id);
        cardsByCol[card.columnId] = [...(cardsByCol[card.columnId] || []), card.id];
      }
      return { ...state, byId, cardsByCol };
    }

    case 'REMOVE_CARD': {
      const card = state.byId[action.cardId];
      if (!card) return state;
      const byId = { ...state.byId };
      delete byId[action.cardId];
      return { ...state, byId, cardsByCol: { ...state.cardsByCol, [card.columnId]: state.cardsByCol[card.columnId].filter((id) => id !== action.cardId) } };
    }

    case 'SYNC_ACTIVITY':    return { ...state, activity: action.activity };
    case 'PREPEND_ACTIVITY': return { ...state, activity: [action.entry, ...state.activity].slice(0, 60) };
    case 'CLEAR_ACTIVITY':   return { ...state, activity: [] };

    case 'MOVE_CARD': {
      const { cardId, toCol, toIndex } = action;
      const card = state.byId[cardId];
      if (!card) return state;
      const fromCol = card.columnId;
      const cardsByCol = { ...state.cardsByCol };
      const fromArr = cardsByCol[fromCol].filter((id) => id !== cardId);
      cardsByCol[fromCol] = fromArr;
      const toArr = fromCol === toCol ? fromArr.slice() : cardsByCol[toCol].slice();
      toArr.splice(Math.max(0, Math.min(toIndex, toArr.length)), 0, cardId);
      cardsByCol[toCol] = toArr;
      return { ...state, byId: { ...state.byId, [cardId]: { ...card, columnId: toCol } }, cardsByCol };
    }

    case 'UPDATE_CARD': {
      const card = state.byId[action.cardId];
      if (!card) return state;
      return { ...state, byId: { ...state.byId, [action.cardId]: { ...card, ...action.patch } } };
    }

    case 'ADD_CARD': {
      const { card, toCol, atTop } = action;
      const arr = (state.cardsByCol[toCol] || []).slice();
      atTop ? arr.unshift(card.id) : arr.push(card.id);
      return { ...state, byId: { ...state.byId, [card.id]: card }, cardsByCol: { ...state.cardsByCol, [toCol]: arr } };
    }

    case 'DELETE_CARD': {
      const card = state.byId[action.cardId];
      if (!card) return state;
      const byId = { ...state.byId };
      delete byId[action.cardId];
      return { ...state, byId, cardsByCol: { ...state.cardsByCol, [card.columnId]: state.cardsByCol[card.columnId].filter((id) => id !== action.cardId) } };
    }

    case 'ADD_COMMENT': {
      const card = state.byId[action.cardId];
      if (!card) return state;
      return { ...state, byId: { ...state.byId, [action.cardId]: { ...card, comments: [...card.comments, action.comment] } } };
    }
    case 'DELETE_COMMENT': {
      const card = state.byId[action.cardId];
      if (!card) return state;
      return { ...state, byId: { ...state.byId, [action.cardId]: { ...card, comments: card.comments.filter((c) => c.id !== action.commentId) } } };
    }

    case 'TOGGLE_SUBTASK': {
      const card = state.byId[action.cardId];
      if (!card) return state;
      return { ...state, byId: { ...state.byId, [action.cardId]: { ...card, subtasks: card.subtasks.map((s) => s.id === action.subtaskId ? { ...s, done: !s.done } : s) } } };
    }

    case 'SET_SUBTASKS': {
      const card = state.byId[action.cardId];
      if (!card) return state;
      return { ...state, byId: { ...state.byId, [action.cardId]: { ...card, subtasks: action.subtasks } } };
    }

    case 'SET_SYNCING':
      return { ...state, syncing: { ...state.syncing, [action.cardId]: action.value } };

    default: return state;
  }
}

let _seq = Date.now();
export const nextId = (p) => `${p}_${(++_seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`;


export function PlankProvider({ children, currentUser }) {
  const isGuest = !!currentUser?.isGuest;
  const emptyState = { byId: {}, cardsByCol: Object.fromEntries(COLUMNS.map((c) => [c.id, []])), activity: [], syncing: {}, ghosted: {} };
  const [state, dispatch] = useReducer(reducer, emptyState);
  const [loading, setLoading]           = useState(true);
  const [project, setProject]           = useState(null);
  const [projects, setProjects]         = useState([]);
  const [projectLoading, setProjectLoading] = useState(true);
  const stateRef   = useRef(state);
  const projectRef = useRef(null);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { projectRef.current = project; }, [project]);


  const [dbMembers, setDbMembers] = useState([]);
  useEffect(() => {
    supabase.from('members').select('*').then(({ data }) => {
      if (data?.length) setDbMembers(data);
    });
  }, []);


  const [memberRoles, setMemberRoles] = useState(
    () => Object.fromEntries(MEMBERS.map((m) => [m.id, m.role || 'member']))
  );

  const loadProjectRoles = useCallback(async (projectId) => {
    if (!projectId) return;
    const { data } = await supabase
      .from('project_members')
      .select('member_id, role')
      .eq('project_id', projectId);

    setMemberRoles(Object.fromEntries((data ?? []).map((r) => [r.member_id, r.role])));
  }, []);

  const membersWithRoles = useMemo(() => {
    const merged = [...MEMBERS, ...dbMembers.filter((m) => !MEMBERS.find((s) => s.id === m.id))];
    const withRoles = merged.map((m) => ({ ...m, role: memberRoles[m.id] ?? m.role ?? 'member' }));
    return currentUser?.isGuest && !withRoles.find((m) => m.id === currentUser.id)
      ? [...withRoles, currentUser]
      : withRoles;
  }, [memberRoles, dbMembers, currentUser]);

  const memberById = useMemo(() => Object.fromEntries(membersWithRoles.map((m) => [m.id, m])), [membersWithRoles]);
  const labelById  = useMemo(() => Object.fromEntries(LABELS.map((l) => [l.id, l])), []);
  const colById    = useMemo(() => Object.fromEntries(COLUMNS.map((c) => [c.id, c])), []);

  useEffect(() => {
    if (!currentUser?.id) return;

    Promise.all([
      fetchActivity(),
      (async () => {
        if (currentUser.isGuest) {
          const { data } = await supabase
            .from('projects')
            .select('*')
            .order('position')
            .order('created_at')
            .limit(1);
          return { data: data ?? [] };
        }
        const myId = currentUser.id;
        const [{ data: owned }, { data: memberships }] = await Promise.all([
          supabase.from('projects').select('*').eq('owner_id', myId).order('position').order('created_at'),
          supabase.from('project_members').select('project_id').eq('member_id', myId),
        ]);
        const memberProjectIds = (memberships ?? []).map((m) => m.project_id);
        let memberProjects = [];
        if (memberProjectIds.length) {
          const { data } = await supabase.from('projects').select('*').in('id', memberProjectIds).order('position').order('created_at');
          memberProjects = data ?? [];
        }
        const all = [...(owned ?? []), ...memberProjects];
        const unique = Array.from(new Map(all.map((p) => [p.id, p])).values());
        return { data: unique };
      })(),
    ]).then(async ([activity, { data: projects }]) => {
      const activeProject = projects?.[0] ?? null;
      const cards = await fetchAllCards(activeProject?.id ?? null);
      dispatch({ type: 'HYDRATE', state: buildState(cards, activity) });
      setLoading(false);
      setProjects(projects ?? []);
      setProject(activeProject);
      setProjectLoading(false);
      if (activeProject) await loadProjectRoles(activeProject.id);
    });
  }, [currentUser?.id, currentUser?.isGuest]);

  useEffect(() => {
    const channel = supabase.channel('plank-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, async (payload) => {
        if (payload.eventType === 'DELETE') dispatch({ type: 'REMOVE_CARD', cardId: payload.old.id });
        else { const card = await fetchCard(payload.new.id); if (card) dispatch({ type: 'SYNC_CARD', card }); }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, async (payload) => {
        const cardId = payload.new?.card_id || payload.old?.card_id;
        if (!cardId) return;
        const card = await fetchCard(cardId);
        if (card) dispatch({ type: 'SYNC_CARD', card });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, async (payload) => {
        const card = await fetchCard(payload.new.card_id);
        if (card) dispatch({ type: 'SYNC_CARD', card });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity' }, async () => {
        const activity = await fetchActivity();
        dispatch({ type: 'SYNC_ACTIVITY', activity });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_members' }, async () => {
        if (projectRef.current?.id) await loadProjectRoles(projectRef.current.id);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const logActivity = useCallback(async (who, verb, target, detail = '') => {
    if (isGuest) return;
    const entry = { id: nextId('a'), who, verb, target, detail, at: new Date().toISOString() };
    dispatch({ type: 'PREPEND_ACTIVITY', entry });
    await supabase.from('activity').insert({ who, verb, target, detail });
  }, [isGuest]);

  const blockGuestEdit = useCallback(() => {
    if (!isGuest) return false;
    showToast('Sign in to edit this demo workspace', 'error');
    return true;
  }, [isGuest]);

  const moveCard = useCallback(async (cardId, toCol, toIndex, by) => {
    if (blockGuestEdit()) return;
    const byId = by ?? (currentUser?.id ?? 'u_you');
    const s = stateRef.current;
    const prev = s.byId[cardId];
    dispatch({ type: 'MOVE_CARD', cardId, toCol, toIndex });
    if (!by || by === currentUser?.id) {
      dispatch({ type: 'SET_SYNCING', cardId, value: true });
      setTimeout(() => dispatch({ type: 'SET_SYNCING', cardId, value: false }), 500);
    }
    const colIds = (s.cardsByCol[toCol] || []).filter((id) => id !== cardId);
    const neighbors = colIds.map((id) => s.byId[id]).filter(Boolean).sort((a, b) => a.position - b.position);
    const prevPos = neighbors[toIndex - 1]?.position ?? 0;
    const nextPos = neighbors[toIndex]?.position ?? (prevPos + 2000);
    await supabase.from('cards').update({ column_id: toCol, position: (prevPos + nextPos) / 2 }).eq('id', cardId);
    if (prev && prev.columnId !== toCol) logActivity(byId, 'moved', prev.key, `to ${colById[toCol]?.name}`);
  }, [blockGuestEdit, colById, logActivity]);

  const selectProject = useCallback(async (id) => {
    setProjects((prev) => {
      const p = prev.find((x) => x.id === id);
      if (p) {
        setProject(p);
        setLoading(true);
        Promise.all([
          fetchAllCards(p.id),
          loadProjectRoles(p.id),
        ]).then(([cards]) => {
          dispatch({ type: 'HYDRATE', state: buildState(cards, []) });
          setLoading(false);
        });
      }
      return prev;
    });
  }, [loadProjectRoles]);

  const createProject = useCallback(async ({ name, description = '', key, color = 'var(--accent)' }) => {
    if (blockGuestEdit()) return null;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return null;
    const memberId = `u_${authUser.id.replace(/-/g, '').slice(0, 12)}`;
    const { data, error } = await supabase
      .from('projects').insert({ name, description, key, color, owner_id: memberId })
      .select().single();
    if (!error && data) {
      setProjects((prev) => [...prev, data]);
      setProject(data);
    }
    return data ?? null;
  }, [blockGuestEdit]);

  const addCard = useCallback(async (toCol, title, by, atTop = true) => {
    if (blockGuestEdit()) return null;
    by = by ?? (currentUser?.id ?? 'u_you');
    const s = stateRef.current;
    const projectKey = projectRef.current?.key || 'PLK';
    const key = `${projectKey}-${161 + Object.keys(s.byId).length}`;
    const sorted = (s.cardsByCol[toCol] || []).map((id) => s.byId[id]).filter(Boolean).sort((a, b) => a.position - b.position);
    const position = atTop ? (sorted[0]?.position ?? 1000) / 2 : (sorted[sorted.length - 1]?.position ?? 0) + 1000;

    const project_id = projectRef.current?.id ?? null;
    const { data: inserted, error } = await supabase.from('cards').insert({ key, title, column_id: toCol, created_by: by, priority: 'med', position, project_id }).select().single();
    if (error || !inserted) return null;

    const card = { id: inserted.id, key, title, desc: '', columnId: toCol, labels: [], assignees: [], points: null, due: null, priority: 'med', subtasks: [], comments: [], cover: null, createdBy: by, position };
    dispatch({ type: 'ADD_CARD', card, toCol, atTop });
    logActivity(by, 'created', key, `in ${colById[toCol]?.name}`);
    return card;
  }, [blockGuestEdit, colById, logActivity]);

  const updateCard = useCallback(async (cardId, patch) => {
    if (blockGuestEdit()) return;
    dispatch({ type: 'UPDATE_CARD', cardId, patch });
    const dbPatch = {};
    if ('title'    in patch) dbPatch.title       = patch.title;
    if ('desc'     in patch) dbPatch.description = patch.desc;
    if ('columnId' in patch) dbPatch.column_id   = patch.columnId;
    if ('points'   in patch) dbPatch.points      = patch.points;
    if ('due'      in patch) dbPatch.due         = patch.due;
    if ('priority' in patch) dbPatch.priority    = patch.priority;
    if ('cover'    in patch) dbPatch.cover_url   = patch.cover;
    if ('images'   in patch) dbPatch.images      = patch.images;
    if ('labels' in patch) {
      await supabase.from('card_labels').delete().eq('card_id', cardId);
      if (patch.labels.length > 0) await supabase.from('card_labels').insert(patch.labels.map((lid) => ({ card_id: cardId, label_id: lid })));
    }
    if ('assignees' in patch) {
      await supabase.from('card_assignees').delete().eq('card_id', cardId);
      if (patch.assignees.length > 0) await supabase.from('card_assignees').insert(patch.assignees.map((mid) => ({ card_id: cardId, member_id: mid })));
    }
    if (Object.keys(dbPatch).length > 0) await supabase.from('cards').update(dbPatch).eq('id', cardId);
  }, [blockGuestEdit]);

  const deleteCard = useCallback(async (cardId) => {
    if (blockGuestEdit()) return;
    const c = stateRef.current.byId[cardId];
    dispatch({ type: 'DELETE_CARD', cardId });
    await supabase.from('cards').delete().eq('id', cardId);
    if (c) logActivity(currentUser?.id ?? 'u_you', 'deleted', c.key, '');
  }, [blockGuestEdit, logActivity]);

  const deleteComment = useCallback(async (cardId, commentId) => {
    if (blockGuestEdit()) return;
    dispatch({ type: 'DELETE_COMMENT', cardId, commentId });
    await supabase.from('comments').delete().eq('id', commentId);
  }, [blockGuestEdit]);

  const addComment = useCallback(async (cardId, text, by) => {
    if (blockGuestEdit()) return null;
    by = by ?? (currentUser?.id ?? 'u_you');
    const { data: inserted } = await supabase.from('comments').insert({ card_id: cardId, author_id: by, text }).select().single();
    const comment = inserted ? { id: inserted.id, author: by, text, at: inserted.created_at } : { id: nextId('cm'), author: by, text, at: new Date().toISOString() };
    dispatch({ type: 'ADD_COMMENT', cardId, comment });
    const c = stateRef.current.byId[cardId];
    if (c) logActivity(by, 'commented on', c.key, '');
    return comment;
  }, [blockGuestEdit, logActivity]);

  const toggleSubtask = useCallback(async (cardId, subtaskId) => {
    if (blockGuestEdit()) return;
    dispatch({ type: 'TOGGLE_SUBTASK', cardId, subtaskId });
    const sub = stateRef.current.byId[cardId]?.subtasks.find((s) => s.id === subtaskId);
    if (sub) await supabase.from('subtasks').update({ done: !sub.done }).eq('id', subtaskId);
  }, [blockGuestEdit]);

  const setSubtasks = useCallback(async (cardId, subtasks) => {
    if (blockGuestEdit()) return;
    dispatch({ type: 'SET_SUBTASKS', cardId, subtasks });
    await supabase.from('subtasks').delete().eq('card_id', cardId);
    if (subtasks.length > 0) {
      const { data: inserted } = await supabase.from('subtasks').insert(subtasks.map((s, i) => ({ card_id: cardId, text: s.text, done: s.done, position: i }))).select();
      if (inserted) dispatch({ type: 'SET_SUBTASKS', cardId, subtasks: inserted.sort((a, b) => a.position - b.position).map((s) => ({ id: s.id, text: s.text, done: s.done })) });
    }
  }, [blockGuestEdit]);

  const updateMemberRole = useCallback(async (memberId, role) => {
    if (blockGuestEdit()) return false;
    const projectId = projectRef.current?.id;
    if (!projectId) return false;
    const { error } = await supabase.from('project_members').upsert(
      { project_id: projectId, member_id: memberId, role },
      { onConflict: 'project_id,member_id' }
    );
    if (error) { console.error('updateMemberRole:', error); return false; }
    setMemberRoles((prev) => ({ ...prev, [memberId]: role }));
    return true;
  }, [blockGuestEdit]);

  const clearActivity = useCallback(() => dispatch({ type: 'CLEAR_ACTIVITY' }), []);

  const reorderProjects = useCallback(async (orderedIds) => {
    if (blockGuestEdit()) return;

    setProjects((prev) => {
      const byId = Object.fromEntries(prev.map((p) => [p.id, p]));
      return orderedIds.map((id) => byId[id]).filter(Boolean);
    });

    await Promise.all(
      orderedIds.map((id, idx) =>
        supabase.from('projects').update({ position: idx + 1 }).eq('id', id)
      )
    );
  }, [blockGuestEdit]);
  const deleteProject = useCallback(async (projectId) => {
    if (blockGuestEdit()) return;
    await supabase.from('projects').delete().eq('id', projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setProject((prev) => {
      if (prev?.id === projectId) return null;
      return prev;
    });
  }, [blockGuestEdit]);

  const setGhost = useCallback(() => {}, []);
  const reset    = useCallback(async () => {
    const [cards, activity] = await Promise.all([fetchAllCards(projectRef.current?.id ?? null), fetchActivity()]);
    dispatch({ type: 'HYDRATE', state: buildState(cards, activity) });
  }, []);

  const patchMember = useCallback((updated) => {
    setDbMembers((prev) => prev.map((m) => m.id === updated.id ? { ...m, ...updated } : m));
  }, []);

  const currentUserId = currentUser?.id ?? 'u_you';

  const projectMembers = useMemo(() =>
    membersWithRoles.filter((m) =>
      memberRoles[m.id] !== undefined || m.id === project?.owner_id
    ),
  [membersWithRoles, memberRoles, project?.owner_id]);
  const value = { state, dispatch, loading, project, projects, projectLoading, createProject, selectProject, deleteProject, reorderProjects, currentUser, currentUserId, isGuest, MEMBERS: membersWithRoles, projectMembers, LABELS, COLUMNS, memberById, labelById, colById, moveCard, addCard, updateCard, deleteCard, addComment, deleteComment, toggleSubtask, setSubtasks, setGhost, logActivity, reset, nextId, updateMemberRole, patchMember, clearActivity };
  return <PlankCtx.Provider value={value}>{children}</PlankCtx.Provider>;
}

export function usePlank() {
  const v = useContext(PlankCtx);
  if (!v) throw new Error('usePlank must be inside PlankProvider');
  return v;
}
