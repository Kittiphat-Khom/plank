import { useMemo } from 'react';
import { usePlank } from '../providers/PlankProvider';

export function useFilteredCards(filterFn) {
  const { state, COLUMNS } = usePlank();
  return useMemo(() => {
    const out = [];
    COLUMNS.forEach((c) =>
      state.cardsByCol[c.id]?.forEach((id) => {
        const card = state.byId[id];
        if (card && (!filterFn || filterFn(card))) out.push(card);
      })
    );
    return out;
  }, [state.cardsByCol, state.byId, filterFn]);
}
