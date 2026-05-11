const express = require('express');
const { spawn } = require('child_process');
const { getYtdlpPath } = require('./ytdlp-manager');
const net = require('net');

let server = null;

function getRandomPort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

async function startStreamServer() {
  const port = await getRandomPort();
  const app = express();

  // CORS headers for Electron renderer
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    next();
  });

  /**
   * GET /stream?id=VIDEO_ID
   * Streams audio from YouTube via yt-dlp piped directly to response.
   */
  app.get('/stream', async (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id parameter' });

    const ytdlpPath = getYtdlpPath();
    const url = `https://www.youtube.com/watch?v=${id}`;

    console.log(`[stream] Streaming: ${id}`);

    const args = [
      '--no-playlist',
      '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
      '--no-part',
      '--no-cache-dir',
      '-o', '-', // Output to stdout
      '--quiet',
      '--no-warnings',
      url,
    ];

    let ytdlp;
    try {
      ytdlp = spawn(ytdlpPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      console.error('[stream] Failed to spawn yt-dlp:', err.message);
      return res.status(500).json({ error: 'yt-dlp spawn failed' });
    }

    // Set audio content type
    res.setHeader('Content-Type', 'audio/webm');
    res.setHeader('Transfer-Encoding', 'chunked');

    ytdlp.stdout.pipe(res);

    ytdlp.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) console.warn(`[yt-dlp stderr] ${msg}`);
    });

    ytdlp.on('error', (err) => {
      console.error('[stream] yt-dlp error:', err.message);
      if (!res.headersSent) res.status(500).end();
    });

    ytdlp.on('close', (code) => {
      console.log(`[stream] yt-dlp exited with code ${code}`);
    });

    // Kill yt-dlp when client disconnects
    req.on('close', () => {
      ytdlp.kill('SIGTERM');
    });
  });

  /**
   * GET /health
   */
  app.get('/health', (_, res) => res.json({ ok: true }));

  return new Promise((resolve) => {
    server = app.listen(port, '127.0.0.1', () => {
      console.log(`[stream-server] Listening on port ${port}`);
      resolve(port);
    });
  });
}

function stopStreamServer() {
  server?.close();
}

module.exports = { startStreamServer, stopStreamServer };
