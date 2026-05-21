// --- Mutex Helper for Concurrency ---
class Mutex {
  constructor() {
    this._queue = [];
    this._locked = false;
  }

  lock(timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const release = () => {
        if (this._queue.length > 0) {
          const next = this._queue.shift();
          next();
        } else {
          this._locked = false;
        }
      };

      const timer = setTimeout(() => {
        // Remove from queue if still waiting
        const idx = this._queue.indexOf(pending);
        if (idx >= 0) this._queue.splice(idx, 1);
        console.error('[Mutex] TIMEOUT after', timeoutMs, 'ms — forcing unlock');
        this._locked = false;
        reject(new Error('Mutex timeout'));
      }, timeoutMs);

      const pending = () => {
        clearTimeout(timer);
        resolve(release);
      };

      if (this._locked) {
        this._queue.push(pending);
      } else {
        clearTimeout(timer);
        this._locked = true;
        resolve(release);
      }
    });
  }
}

const configLock = new Mutex();
const metadataLock = new Mutex();

const safeWriteFile = (filePath, content) =>
  require('fs').promises.writeFile(filePath, content, 'utf8');

const sanitizeFilename = (name = 'upload.bin') =>
  name.replace(/[^a-zA-Z0-9._-]/g, '_');

const getExtension = (name = '') => {
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex === -1) {
    return '';
  }
  return name.slice(dotIndex).toLowerCase();
};

const readRequestBody = (req, maxSize = 60 * 1024 * 1024) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxSize) {
        reject(new Error('Payload trop volumineux. Maximum 60MB.'));
        req.socket.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

const getMimeType = (filename) => {
  if (filename.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  if (filename.endsWith('.gif')) return 'image/gif';
  if (filename.endsWith('.webp')) return 'image/webp';
  if (filename.endsWith('.mp4')) return 'video/mp4';
  if (filename.endsWith('.m4v')) return 'video/mp4';
  if (filename.endsWith('.mov')) return 'video/quicktime';
  if (filename.endsWith('.avi')) return 'video/x-msvideo';
  if (filename.endsWith('.mkv')) return 'video/x-matroska';
  if (filename.endsWith('.webm')) return 'video/webm';
  if (filename.endsWith('.mp3')) return 'audio/mpeg';
  if (filename.endsWith('.aac')) return 'audio/aac';
  if (filename.endsWith('.wav')) return 'audio/wav';
  if (filename.endsWith('.flac')) return 'audio/flac';
  if (filename.endsWith('.ogg')) return 'audio/ogg';
  if (filename.endsWith('.pdf')) return 'application/pdf';
  if (filename.endsWith('.svg')) return 'image/svg+xml';
  if (filename.endsWith('.js')) return 'application/javascript';
  if (filename.endsWith('.css')) return 'text/css';
  return 'application/octet-stream';
};

const sendHtml = (res, html) => {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(html);
};

const sendJson = (res, data, status = 200) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
};

const notFound = (res) => {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
};

const parseCookies = (req) => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return {};
  
  const cookies = {};
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.trim().split('=');
    if (parts.length === 2) {
      cookies[parts[0]] = decodeURIComponent(parts[1]);
    }
  });
  return cookies;
};

const setCookieHeader = (res, name, value, options = {}) => {
  const cookieOptions = [
    `${name}=${encodeURIComponent(value)}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/'
  ];
  
  if (options.maxAge) {
    cookieOptions.push(`Max-Age=${options.maxAge}`);
  }
  
  if (options.expires) {
    cookieOptions.push(`Expires=${options.expires.toUTCString()}`);
  }
  
  const existingHeaders = res.getHeader('Set-Cookie') || [];
  const headers = Array.isArray(existingHeaders) ? existingHeaders : [existingHeaders];
  headers.push(cookieOptions.join('; '));
  res.setHeader('Set-Cookie', headers);
};

const clearCookieHeader = (res, name) => {
  const cookieOptions = [
    `${name}=`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    'Max-Age=0'
  ];
  
  const existingHeaders = res.getHeader('Set-Cookie') || [];
  const headers = Array.isArray(existingHeaders) ? existingHeaders : [existingHeaders];
  headers.push(cookieOptions.join('; '));
  res.setHeader('Set-Cookie', headers);
};

module.exports = {
  Mutex,
  configLock,
  metadataLock,
  safeWriteFile,
  sanitizeFilename,
  getExtension,
  readRequestBody,
  getMimeType,
  sendHtml,
  sendJson,
  notFound,
  parseCookies,
  setCookieHeader,
  clearCookieHeader,
};
