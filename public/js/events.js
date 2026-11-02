const listeners = new Map();

export function on(name, handler) {
  if (!listeners.has(name)) listeners.set(name, []);
  listeners.get(name).push(handler);
}

export function emit(name, payload) {
  (listeners.get(name) || []).forEach((handler) => handler(payload));
}
