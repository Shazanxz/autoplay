export class Semaphore {
  constructor(limit) {
    this.limit = limit;
    this.active = 0;
    this.waiters = [];
  }

  async run(task) {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  acquire() {
    if (this.active < this.limit) {
      this.active += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  release() {
    const next = this.waiters.shift();
    if (next) next();
    else this.active -= 1;
  }
}
