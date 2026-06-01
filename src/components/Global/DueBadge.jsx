import { dueInfo } from '../../helpers';
import { Icon } from './Icon';

export function DueBadge({ iso }) {
  const info = dueInfo(iso);
  if (!info) return null;
  return (
    <span className="due-badge" data-tone={info.tone}>
      <Icon name="clock" size={12} stroke={2.2} />
      {info.text}
    </span>
  );
}
