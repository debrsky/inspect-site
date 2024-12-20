import report from "./report.js";

const inspector = {
  subscribers: new Set(),
  isInspecting: false,
  log: [],
  subscribe(handler) {
    handler(null, { event: 'start', data: 'start' });
    if (Number.isInteger(handler.lastEventId)) {
      for (let idx = handler.lastEventId; idx < this.log.length; ++idx) {
        const data = this.log[idx];
        handler(null, {
          id: idx,
          data: JSON.stringify(data)
        });
      }
    }
    if (!this.isInspecting) handler(null, { event: 'finish', data: 'done' });

    this.subscribers.add(handler);
  },
  unsubscribe(handler) {
    this.subscribers.delete(handler);
  },
  toSubscribers(data) {
    for (const subscriber of this.subscribers) {
      subscriber(null, data);
    }
  },
  inspect(startUrl, onInspectionDone) {
    if (this.isInspecting) return;
    this.log.length = 0;
    this.isInspecting = true;

    this.toSubscribers({ event: 'start', data: 'start' });

    report(startUrl, ({ url, status, ok, error }) => {
      const data = { idx: this.log.length, url, status, ok, error };
      this.log.push(data);

      for (const subscriber of this.subscribers) {
        subscriber(null, {
          id: this.log.length - 1,
          data: JSON.stringify(data)
        });
      }
    })
      .then((report) => onInspectionDone(null, { startUrl, ...report }))
      .catch((err) => console.error(err))
      .finally(() => {
        this.isInspecting = false;
        this.toSubscribers({ event: 'finish', data: 'finish' });
      });
  },
}

export default inspector;
