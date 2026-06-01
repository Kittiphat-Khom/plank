import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePresence } from '../../providers/PresenceProvider';
import { BOTS } from '../../config/data';

const S = {
  layer: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    zIndex: 7500,
  },
  cursor: {
    position: "absolute",
    top: 0,
    left: 0,
    willChange: "transform",
    transition: "opacity .3s",
  },
  label: {
    position: "absolute",
    left: 16,
    top: 16,
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 6,
    whiteSpace: "nowrap",
    color: "var(--text-on-accent)",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
  },
};

function CursorSvg({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.25))" }}>
      <path d="M5 3l15 8-6 1.5L11 19 5 3z"
        fill={color} stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function LiveCursors() {
  const presence = usePresence();
  const { cursorsRef, realCursors } = presence;
  const nodes = useRef({});

  useEffect(() => {
    let raf;
    const tick = () => {
      const cur = cursorsRef.current;
      for (const id of BOTS) {
        const c    = cur[id];
        const node = nodes.current[id];
        if (!c || !node) continue;
        c.x += (c.tx - c.x) * 0.12;
        c.y += (c.ty - c.y) * 0.12;
        node.style.opacity   = c.active && !presence.idle.has(id) ? "1" : "0";
        node.style.transform = `translate(${c.x}px, ${c.y}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [presence.idle]);

  return createPortal(
    <div style={S.layer}>
      {BOTS.map((id) => {
        const c = cursorsRef.current[id];
        if (!c) return null;
        return (
          <div key={id} ref={(el) => (nodes.current[id] = el)} style={S.cursor}>
            <CursorSvg color={c.color} />
            <div style={{ ...S.label, background: c.color }}>{c.name.split(" ")[0]}</div>
          </div>
        );
      })}
      {Object.entries(realCursors ?? {}).map(([id, c]) => (
        <div key={id} style={{ ...S.cursor, transform: `translate(${c.x}px, ${c.y}px)`, transition: 'transform 80ms linear' }}>
          <CursorSvg color={c.color} />
          <div style={{ ...S.label, background: c.color }}>{c.name.split(" ")[0]}</div>
        </div>
      ))}
    </div>,
    document.body
  );
}
