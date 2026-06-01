import { Icon } from './Icon';

export function PickerItem({ children, onClick, active }) {
  return (
    <button onClick={onClick} className="picker-item">
      {children}
      {active && (
        <span className="picker-item__check">
          <Icon name="check" size={15} />
        </span>
      )}
    </button>
  );
}
