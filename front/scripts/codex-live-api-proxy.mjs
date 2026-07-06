import express from 'express';
import { Readable } from 'node:stream';

const app = express();
const targetBase = 'https://api.sakorio.com';
const port = Number(process.env.PORT || 4202);

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers'] || 'content-type,authorization',
    );
    return res.sendStatus(204);
  }
  next();
});

app.use(async (req, res) => {
  const url = new URL(req.originalUrl, targetBase);
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    if (
      [
        'host',
        'connection',
        'content-length',
        'upgrade',
        'sec-websocket-key',
        'sec-websocket-version',
        'sec-websocket-extensions',
        'sec-websocket-protocol',
      ].includes(key.toLowerCase())
    ) {
      continue;
    }
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }

  let body;
  if (!['GET', 'HEAD'].includes(req.method.toUpperCase())) {
    body = req;
  }

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body,
      duplex: body ? 'half' : undefined,
      redirect: 'manual',
    });

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) return;
      res.setHeader(key, value);
    });

    if (upstream.body) {
      Readable.fromWeb(upstream.body).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    console.error('Live API proxy failed:', error);
    res.status(502).json({ error: 'live_api_proxy_failed' });
  }
});

app.listen(port, '127.0.0.1', () => {
  console.log(`Codex live API proxy listening on http://127.0.0.1:${port}`);
});
