import { Icon } from './Icon';

export function IconButton({ name, size = 18, onClick, title, active, badge, style }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      data-active={active ? "true" : undefined}
      className="icon-btn"
      style={style}
    >
      <Icon name={name} size={size} />
      {badge && <span className="icon-btn__badge" />}
    </button>
  );
}
