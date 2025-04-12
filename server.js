import dotenv from 'dotenv';
dotenv.config();

import fastify from 'fastify';
import fastifyView from '@fastify/view';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdir } from 'fs/promises';
import pug from 'pug';

import inspector from './inspector.js';
import routes from './routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const START_URL = process.env.START_URL;
const STORAGE_DIR = 'storage';
const SCREENSHOTS_DIR = path.join(STORAGE_DIR, 'screenshots');

await mkdir(STORAGE_DIR, { recursive: true });
await mkdir(path.join(STORAGE_DIR, 'logs'), { recursive: true });

const app = fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard'
      }
    },
    serializers: {
      req(req) {
        return {
          method: req.method,
          url: req.url,
          remoteAddress: req.ip || req.socket.remoteAddress,
          headers: req.headers,
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
          headers: res.getHeaders(),
        };
      }
    }
  }
});

await app.register(fastifyView, {
  engine: {
    pug: pug
  },
  root: path.join(__dirname, 'views'),
  defaultContext: {
    dev: process.env.NODE_ENV === 'development'
  }
});

await app.register(fastifyStatic, {
  root: path.join(__dirname, 'storage/screenshots'),
})

app.setErrorHandler(function (error, request, reply) {
  request.log.error(error);
  const statusCode = error.statusCode || 500;
  reply
    .type('text/html; charset=utf-8')
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

// Register routes
routes(app, inspector, START_URL);

// Start server
app.listen({ host: '0.0.0.0', port: process.env.PORT }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
});
