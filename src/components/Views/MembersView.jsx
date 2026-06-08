import { usePlank } from '../../providers/PlankProvider';
import { usePermissions, ROLE_LABEL, ROLE_COLOR, ALL_ROLES } from '../../hooks/usePermissions';
import { Avatar, Icon } from '../Global';
import { MEMBERS as STATIC_MEMBERS } from '../../config/data';

const BOT_IDS = new Set(STATIC_MEMBERS.map((m) => m.id));

function RoleControl({ member, perms, onRoleChange }) {
  const role = member.role || 'member';
  const isMe = member.you;
  const canEdit = !isMe && perms.canManageMembers && perms.canAssignRole(role);

  if (!canEdit) {
    return (
      <span style={{
        fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
        color: ROLE_COLOR[role],
        background: `color-mix(in oklch, ${ROLE_COLOR[role]} 12%, transparent)`,
      }}>
        {ROLE_LABEL[role]}
      </span>
    );
  }

  return (
    <select
      value={role}
      onChange={(e) => onRoleChange(member.id, e.target.value)}
      style={{
        fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
        color: ROLE_COLOR[role], border: '1px solid currentColor',
        background: `color-mix(in oklch, ${ROLE_COLOR[role]} 10%, transparent)`,
        cursor: 'pointer', outline: 'none',
      }}
    >
      {ALL_ROLES.map((r) => (
        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
      ))}
    </select>
  );
}

function MemberRow({ member, perms, onRoleChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 0', borderBottom: '1px solid var(--border)',
    }}>
      <Avatar member={member} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
          {member.name}
          {member.you && <span style={{ color: 'var(--text-faint)', fontWeight: 400, fontSize: 13 }}> (you)</span>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>@{member.handle}</div>
      </div>
      <RoleControl member={member} perms={perms} onRoleChange={onRoleChange} />
    </div>
  );
}

export function MembersView({ onEditProject }) {
  const { MEMBERS, project, updateMemberRole, currentUserId } = usePlank();
  const perms = usePermissions();


  const realMembers = MEMBERS.filter((m) => !BOT_IDS.has(m.id) || m.you || m.id === currentUserId);
  const me     = realMembers.find((m) => m.you || m.id === currentUserId);
  const others = realMembers.filter((m) => !m.you && m.id !== currentUserId);

  return (
    <div style={{
      maxWidth: 640, margin: '0 auto', padding: '40px 24px',
      height: '100%', overflowY: 'auto',
    }}>

      {project && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 32, gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 12, height: 12, borderRadius: 3, flexShrink: 0,
              background: project.color || 'var(--accent)',
              display: 'inline-block',
            }} />
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{project.name}</h2>
              {project.description && (
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-faint)' }}>{project.description}</p>
              )}
            </div>
          </div>
          <button
            onClick={onEditProject}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              background: 'var(--surface)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', transition: 'background .15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; }}
          >
            <Icon name="settings" size={14} />
            Edit project
          </button>
        </div>
      )}


      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Members · {realMembers.length}
      </div>

      {me && <MemberRow member={me} perms={perms} onRoleChange={updateMemberRole} />}
      {others.map((m) => (
        <MemberRow key={m.id} member={m} perms={perms} onRoleChange={updateMemberRole} />
      ))}


      <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
        {ALL_ROLES.map((r) => (
          <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-faint)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: ROLE_COLOR[r] }} />
            {ROLE_LABEL[r]}
          </div>
        ))}
      </div>
    </div>
  );
}
