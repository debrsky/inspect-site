import dotenv from 'dotenv';
dotenv.config();

import fastify from 'fastify';
import fastifyView from '@fastify/view';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile, writeFile, mkdir } from 'fs/promises';
import pug from 'pug';

import inspector from './inspector.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const START_URL = process.env.START_URL;
const STORAGE_DIR = 'storage';

await mkdir(STORAGE_DIR, { recursive: true });
await mkdir(path.join(STORAGE_DIR, 'logs'), { recursive: true });

const app = fastify({
  logger: {
    level: 'info', // Уровень логирования
    transport: {
      target: 'pino-pretty', // Для более удобного вывода логов в консоль
      options: {
        colorize: true, // Цветной вывод
        translateTime: 'SYS:standard'
      }
    },
    serializers: {
      // Определяем, как сериализовать запросы
      req(req) {
        return {
          method: req.method,
          url: req.url,
          remoteAddress: req.ip || req.socket.remoteAddress,
          headers: req.headers,
        };
      },
      // При желании можно добавить сериализатор для ответа
      res(res) {
        return {
          statusCode: res.statusCode,
          headers: res.getHeaders(),
          // Другие поля, которые вы хотите сохранить
        };
      }
    }
  }
});

// Регистрируем point-of-view с pug
await app.register(fastifyView, {
  engine: {
    pug: pug
  },
  root: path.join(__dirname, 'views'),
  defaultContext: {
    // Глобальные переменные для всех шаблонов
    dev: process.env.NODE_ENV === 'development'
  }
});

app.setErrorHandler(function (error, request, reply) {
  request.log.error(error);
  const statusCode = error.statusCode || 500;
  reply
    .type('text/html')
    .code(statusCode)
    .view('error.pug', {
      statusCode,
      message: error.message || 'Internal Server Error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
});

app.setNotFoundHandler((request, reply) => {
  const error = new Error('Not Found');
  error.statusCode = 404;
  throw error;
});

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

// Routes
app.get('/', async (request, reply) => {
  try {
    const html = await readFile(path.join(STORAGE_DIR, 'report.html'), 'utf8');
    return reply.type('text/html').send(html);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;

    const html = await readFile('index.html', 'utf8');
    return reply.type('text/html').send(html);
  }
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

  inspector.inspect(START_URL, async (err, report) => {
    if (err) throw Error();

    const makeHtml = pug.compileFile('views/report.pug');
    const html = makeHtml(report);
    await writeFile(path.join(STORAGE_DIR, 'report.html'), html);
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

// Start server
app.listen({ port: process.env.PORT }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
});
