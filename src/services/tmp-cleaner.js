import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';

const { tmpDir } = config.paths;

export function sweepTmp() {
  const limit = Date.now() - config.limits.tmpMaxAgeMs;
  fs.readdir(tmpDir, (err, names) => {
    if (err) return;
    for (const name of names) {
      const full = path.join(tmpDir, name);
      fs.stat(full, (statErr, stats) => {
        if (!statErr && stats.isFile() && stats.mtimeMs < limit) fs.unlink(full, () => {});
      });
    }
  });
}

export function scheduleTmpSweep() {
  sweepTmp();
  setInterval(sweepTmp, 30 * 60 * 1000).unref();
}
