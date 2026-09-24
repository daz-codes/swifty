// Filesystem events can arrive while a build is awaiting I/O. Keep pending
// changes separate from the active batch so they always receive a later build.
const createBuildQueue = (runBatch, { delay = 100, onError = console.error } = {}) => {
  const pending = new Map();
  const idleWaiters = [];
  let timer = null;
  let running = null;
  let closed = false;

  const settleIdle = () => {
    if (running || timer || pending.size) return;
    for (const resolve of idleWaiters.splice(0)) resolve();
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(drain, delay);
  };

  const drain = () => {
    timer = null;
    const changes = [...pending.values()];
    pending.clear();
    running = Promise.resolve()
      .then(() => runBatch(changes))
      .catch(onError)
      .finally(() => {
        running = null;
        if (pending.size && !closed) schedule();
        else settleIdle();
      });
  };

  return {
    enqueue(change) {
      if (closed) return;
      // Preserve different event types: unlink + add must not become a simple
      // content edit eligible for an incremental rebuild.
      pending.set(`${change.event}\0${change.filePath}`, change);
      if (!running) schedule();
    },
    whenIdle() {
      if (!running && !timer && !pending.size) return Promise.resolve();
      return new Promise((resolve) => idleWaiters.push(resolve));
    },
    async close() {
      closed = true;
      clearTimeout(timer);
      timer = null;
      pending.clear();
      await running;
      settleIdle();
    },
  };
};

export { createBuildQueue };
