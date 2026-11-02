import { config } from '../config/index.js';

export function streamUrl(req, slug) {
  const host = config.publicHost || req.get('host');
  return `${config.streamProtocol}://${host}/${slug}.mp3`;
}
