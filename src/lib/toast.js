const listeners = new Set();

export function showToast(message, type = 'info') {
  listeners.forEach((fn) => fn({ message, type }));
}

export function onToast(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
