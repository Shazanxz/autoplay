export function formatDuration(totalSeconds) {
  const seconds = Math.floor(totalSeconds);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function fixFileName(name) {
  const decoded = Buffer.from(String(name), 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? String(name) : decoded;
}
