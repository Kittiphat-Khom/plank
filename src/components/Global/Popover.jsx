import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export function Popover({ anchorRef, open, onClose, children, width = 220, align = "left" }) {
  const ref = useRef();
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const left = align === "right" ? r.right - width : r.left;
    setPos({
      top: r.bottom + 6,
      left: Math.max(8, Math.min(left, window.innerWidth - width - 8)),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open || !pos) return null;
  return createPortal(
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width,
        zIndex: 9500,
        background: "var(--surface)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow-lg)",
        border: "1px solid var(--border)",
        padding: 6,
        animation: "pop-in .14s ease-out",
      }}
    >
      {children}
    </div>,
    document.body
  );
}
