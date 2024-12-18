import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const STORAGE_DIR = 'storage';

// SSE handler helper
const createSSEHandler = (request, reply) => {
  return (err, { event, data, id }) => {
    if (err) throw Error();

    let payload = '';
    if (event) payload += `event: ${event}\n`;
    if (data) payload += `data: ${data}\n`;
    if (id) payload += `id: ${id}\n`;
    payload += '\n\n';

    reply.raw.write(payload);
  };
};

function generateFileName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Месяцы начинаются с 0
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `links@${year}-${month}-${day}_${hours}-${minutes}-${seconds}.json`;
}

export default function routes(app, inspector, startUrl) {
  app.get('/', async (request, reply) => {
    const links = JSON.parse(await readFile(path.join(STORAGE_DIR, 'links@latest.json'), 'utf8'));

    return reply.view('report.pug', links);
  });

  app.get('/stat', async (request, reply) => {
    const links = JSON.parse(await readFile(path.join(STORAGE_DIR, 'links@latest.json'), 'utf8'));

    return reply.view('stat.pug', links);
  });

  app.get('/log', async (request, reply) => {
    const html = await readFile('log.html', 'utf8');
    return reply.type('text/html').send(html);
  });

  app.get('/inspect', async (request, reply) => {
    if (request.query.start !== '1') {
      reply.callNotFound();
      return;
    }

    request.log.info('Inspection started');

    inspector.inspect(startUrl, async (err, report) => {
      if (err) throw Error();

      const content = JSON.stringify(report, null, 4);

      await writeFile(path.join(STORAGE_DIR, generateFileName()), content, 'utf8');
      await writeFile(path.join(STORAGE_DIR, 'links@latest.json'), content, 'utf8');

      request.log.info('Inspection done∎');
    });

    return { ok: true };
  });

  app.get('/events', async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const sseHandler = createSSEHandler(request, reply);
    inspector.subscribe(sseHandler);

    request.raw.on('close', () => {
      inspector.unsubscribe(sseHandler);
      reply.raw.end();
    });
  });

  app.get('/screenshots/:screenshotName', async (request, reply) => {
    const screenshotName = request.params.screenshotName;
    return reply.sendFile(screenshotName);
  });
}
