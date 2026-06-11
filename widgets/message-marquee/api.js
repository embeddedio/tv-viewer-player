'use strict';
const fs   = require('fs');
const path = require('path');

const MESSAGES_FILE = path.join(__dirname, 'messages.json');

const load = () => {
  try {
    const d = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
    return Array.isArray(d.messages) ? d.messages : [];
  } catch (_) { return []; }
};

const save = (messages) => {
  try { fs.writeFileSync(MESSAGES_FILE, JSON.stringify({ messages }, null, 2), 'utf8'); } catch (_) {}
};

const readBody = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});

exports.getData = function (req, res, sendJson) {
  sendJson(res, { messages: load() });
};

exports.handleRequest = async function (method, pathname, req, res, sendJson) {
  if (method === 'GET' && pathname === '/api/widgets/message-marquee') {
    return sendJson(res, { messages: load() });
  }

  if (method === 'POST' && pathname === '/api/widgets/message-marquee') {
    try {
      const body = await readBody(req);
      const { messages } = JSON.parse(body.toString('utf8'));
      if (!Array.isArray(messages)) return sendJson(res, { message: 'Format invalide' }, 400);
      save(messages);
      return sendJson(res, { success: true, messages });
    } catch (_) {
      return sendJson(res, { message: 'Requête invalide' }, 400);
    }
  }

  sendJson(res, { message: 'Not found' }, 404);
};
