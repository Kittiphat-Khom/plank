import { useMemo } from 'react';
import { usePlank } from '../providers/PlankProvider';

export const ROLE_LEVEL = { viewer: 1, member: 2, admin: 3, owner: 4 };
export const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', member: 'Member', viewer: 'Viewer' };
export const ROLE_COLOR = {
  owner:  'var(--c-amber)',
  admin:  'var(--c-purple)',
  member: 'var(--accent-text)',
  viewer: 'var(--text-faint)',
};
export const ALL_ROLES = ['owner', 'admin', 'member', 'viewer'];

export function usePermissions() {
  const { memberById, currentUser, currentUserId } = usePlank();
  const me = currentUser?.isGuest ? currentUser : (memberById[currentUserId] ?? memberById['u_you']);
  const myRole = me?.role ?? 'viewer';
  const myLevel = ROLE_LEVEL[myRole] ?? 1;

  return useMemo(() => ({
    role: myRole,
    level: myLevel,
    label: ROLE_LABEL[myRole],


    canCreate: myLevel >= ROLE_LEVEL.member,
    canEdit:   myLevel >= ROLE_LEVEL.member,
    canDelete: myLevel >= ROLE_LEVEL.admin,


    canManageMembers: myLevel >= ROLE_LEVEL.admin,


    canAssignRole: (targetRole) =>
      myLevel >= ROLE_LEVEL.admin &&
      (myRole === 'owner' || ROLE_LEVEL[targetRole] <= myLevel),


    assignableRoles: ALL_ROLES.filter(r =>
      myRole === 'owner' || ROLE_LEVEL[r] <= myLevel
    ),

    isOwner: myRole === 'owner',
    isAdmin: myLevel >= ROLE_LEVEL.admin,
  }), [myRole, myLevel]);
}
