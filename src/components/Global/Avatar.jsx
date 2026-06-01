export function Avatar({ member, size = 26, ring = false, idle = false, title }) {
  if (!member) return null;
  return (
    <div
      title={title || member.name}
      className="avatar"
      data-ring={ring ? "true" : undefined}
      data-idle={idle ? "true" : undefined}
      style={{
        '--sz': `${size}px`,
        '--bg': member.color,
        ...(ring && { '--ring-w': size > 30 ? '4px' : '3.5px' }),
      }}
    >
      {member.avatar_url
        ? <img src={member.avatar_url} alt={member.initials} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit', display: 'block' }} />
        : member.initials}
    </div>
  );
}

export function AvatarStack({ members, size = 24, max = 4, onClick }) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <div className="avatar-stack" style={{ '--sz': `${size}px` }} onClick={onClick}>
      {shown.map((m, i) => (
        <div key={m.id} className="avatar-stack__item" style={{ zIndex: shown.length - i }}>
          <Avatar member={m} size={size} />
        </div>
      ))}
      {extra > 0 && (
        <div className="avatar-stack__overflow">+{extra}</div>
      )}
    </div>
  );
}
