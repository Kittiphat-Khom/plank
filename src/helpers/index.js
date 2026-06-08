
export function relTime(iso) {
  if (!iso) return "";
  const d = new Date(iso), now = new Date();
  const diff = (now - d) / 1000;
  if (Math.abs(diff) < 45) return "just now";
  if (Math.abs(diff) < 90) return "1m";
  const mins = Math.round(diff / 60);
  if (Math.abs(mins) < 60) return `${Math.abs(mins)}m${mins < 0 ? " left" : ""}`;
  const hrs = Math.round(mins / 60);
  if (Math.abs(hrs) < 24) return `${Math.abs(hrs)}h${hrs < 0 ? " left" : ""}`;
  const days = Math.round(hrs / 24);
  return `${Math.abs(days)}d${days < 0 ? " left" : ""}`;
}

export function dueInfo(iso) {
  if (!iso) return null;
  const d = new Date(iso), now = new Date();
  const days = Math.ceil((d - now) / 86400000);
  let tone = "default", text;
  if (days < 0)       { tone = "over";    text = `${Math.abs(days)}d over`; }
  else if (days === 0) { tone = "today";  text = "Today"; }
  else if (days === 1) { tone = "soon";   text = "Tomorrow"; }
  else if (days <= 3)  { tone = "soon";   text = `${days}d`; }
  else { text = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  return { tone, text, days };
}


export function fuzzy(needle, hay) {
  needle = needle.toLowerCase(); hay = hay.toLowerCase();
  if (!needle) return 0;
  let hi = 0, score = 0, streak = 0;
  for (let ni = 0; ni < needle.length; ni++) {
    const ch = needle[ni];
    let found = -1;
    for (let j = hi; j < hay.length; j++) if (hay[j] === ch) { found = j; break; }
    if (found === -1) return -1;
    streak = found === hi ? streak + 1 : 0;
    score += 10 - Math.min(found - hi, 8) + streak * 4;
    hi = found + 1;
  }
  return score;
}
