import dotenv from 'dotenv';
dotenv.config();

const START_URL = process.env.START_URL;
const STORAGE_DIR = 'storage';

import http from 'http';
import path from "path";
import { readFile, writeFile, mkdir } from 'fs/promises';
await mkdir(STORAGE_DIR, { recursive: true });

import pug from 'pug';

import inspector from './inspector.js';

const requestHandler = async (req, res) => {
  const { method, url } = req;

  console.log(method, url);

  // uses a closure to preserve the value of the variable res
  const sendLogEvent = ((res) => {
    return (err, { event, data, id }) => {
      if (err) throw Error();

      if (event) res.write(`event: ${event}\n`);
      if (data) res.write(`data: ${data}\n`);
      if (id) res.write(`id: ${id}\n`);
      res.write(`\n\n`);
    };
  })(res);

  if (url === '/' && method === 'GET') {
    try {
      const html = await readFile(path.join(STORAGE_DIR, 'report.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch (err) {
      if (err.code === 'ENOENT') {
        try {
          const html = await readFile('index.html', 'utf8');
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(html);
        } catch (err) {
          console.log(err);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error\n');
        }
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error\n');
      }
    }

  } else if ((url === '/log' && method === 'GET')) {
    try {
      const html = await readFile('log.html', 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found\n');
    }


  } else if (url === '/inspect?start=1' && method === 'GET') {
    console.log('Inspection started');
    inspector.inspect(START_URL, async (err, report) => {
      if (err) throw Error();

      const makeHtml = pug.compileFile('report.pug');
      const html = makeHtml(report);
      await writeFile(path.join(STORAGE_DIR, 'report.html'), html);
      console.log('Inspection done∎');
    })
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));

  } else if (url === '/events' && (method === 'GET' || method === 'HEAD')) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    inspector.subscribe(sendLogEvent);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }

  req.on('close', () => {
    inspector.unsubscribe(sendLogEvent);

    res.end();
  });
};

const server = http.createServer(requestHandler);

server.listen(process.env.PORT, () => {
  console.log(`http server running, port ${process.env.PORT}`);
});
