import { config } from '../config/index.js';
import { HttpError } from '../utils/http-error.js';

const { maxConcurrentJobs, maxQueuedJobs } = config.limits;
const queue = [];
let active = 0;

function pump() {
  while (active < maxConcurrentJobs && queue.length) {
    const job = queue.shift();
    active += 1;
    job.task().then(job.resolve, job.reject).finally(() => {
      active -= 1;
      pump();
    });
  }
}

export function runJob(task) {
  return new Promise((resolve, reject) => {
    if (queue.length >= maxQueuedJobs) return reject(new HttpError(503, 'SERVER_BUSY'));
    queue.push({ task, resolve, reject });
    pump();
  });
}
