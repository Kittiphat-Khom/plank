import { createContext, useContext, useState, useCallback } from 'react';

const StarredCtx = createContext({ starredIds: new Set(), toggleStar: () => {}, isStarred: () => false });

const LS_KEY = 'plank_starred_cards';

function loadIds() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

export function StarredProvider({ children }) {
  const [starredIds, setStarredIds] = useState(loadIds);

  const toggleStar = useCallback((cardId) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      localStorage.setItem(LS_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isStarred = useCallback((cardId) => starredIds.has(cardId), [starredIds]);

  return (
    <StarredCtx.Provider value={{ starredIds, toggleStar, isStarred }}>
      {children}
    </StarredCtx.Provider>
  );
}

export function useStarred() {
  return useContext(StarredCtx);
}
