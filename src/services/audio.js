import { spawn } from 'child_process';
import * as mm from 'music-metadata';
import ffmpegPath from 'ffmpeg-static';
import { config } from '../config/index.js';

export async function inspectTrack(filePath) {
  const meta = await mm.parseFile(filePath, { duration: true });
  const { container, duration } = meta.format;
  if (!container || !Number.isFinite(duration) || duration <= 0) return null;
  return duration;
}

function buildArgs(inputs, output) {
  const args = ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y'];
  for (const file of inputs) args.push('-protocol_whitelist', 'file', '-i', file);

  const chains = inputs.map(
    (_, i) => `[${i}:a:0]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[a${i}]`
  );
  const labels = inputs.map((_, i) => `[a${i}]`).join('');
  const filter = `${chains.join(';')};${labels}concat=n=${inputs.length}:v=0:a=1[out]`;

  args.push(
    '-filter_complex', filter,
    '-map', '[out]',
    '-map_metadata', '-1',
    '-c:a', 'libmp3lame',
    '-b:a', '192k',
    '-ar', '44100',
    '-ac', '2',
    '-f', 'mp3',
    output
  );
  return args;
}

export function mergeTracks(inputs, output, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(Object.assign(new Error('aborted'), { aborted: true }));

    let stderr = '';
    const child = spawn(ffmpegPath, buildArgs(inputs, output), {
      stdio: ['ignore', 'ignore', 'pipe'],
      signal,
      timeout: config.limits.ffmpegTimeoutMs,
      killSignal: 'SIGKILL',
    });

    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-2000);
    });
    child.on('error', (err) => {
      if (err.name === 'AbortError') return reject(Object.assign(err, { aborted: true }));
      reject(err);
    });
    child.on('close', (code, sig) => {
      if (code === 0) return resolve();
      reject(Object.assign(new Error(`ffmpeg saiu com código ${code} (${sig || 'sem sinal'}): ${stderr}`), { ffmpeg: true }));
    });
  });
}
