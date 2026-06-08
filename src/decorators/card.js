
export function transformCard(raw) {
  return {
    id: raw.id,
    key: raw.key,
    title: raw.title,
    desc: raw.description || '',
    columnId: raw.column_id,
    labels: (raw.card_labels || []).map((l) => l.label_id),
    assignees: (raw.card_assignees || []).map((a) => a.member_id),
    points: raw.points,
    due: raw.due,
    priority: raw.priority,
    cover: raw.cover_url || null,
    images: Array.isArray(raw.images) ? raw.images : [],
    createdBy: raw.created_by,
    createdAt: raw.created_at,
    position: raw.position,
    subtasks: (raw.subtasks || [])
      .sort((a, b) => a.position - b.position)
      .map((s) => ({ id: s.id, text: s.text, done: s.done })),
    comments: (raw.comments || [])
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((c) => ({ id: c.id, author: c.author_id, text: c.text, at: c.created_at })),
  };
}
