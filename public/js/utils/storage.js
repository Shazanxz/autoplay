export function store(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export function load(key) {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

export function drop(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}
