import report from "./report.js";

const inspector = {
  subscribers: new Set(),
  isInspecting: false,
  log: [],
  subscribe(handler) {
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

    report(startUrl, ({ url, ok }) => {
      this.log.push(url);

      for (const subscriber of this.subscribers) {
        subscriber(null, {
          id: this.log.length - 1,
          data: JSON.stringify({ idx: this.log.length, url, ok })
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
