const rnBridge = require('rn-bridge');

// Fichiers créés avec 0666 (rw-rw-rw-) au lieu du 0660 par défaut.
// Garantit que les fichiers sont lisibles après reinstall (changement de UID Android).
process.umask(0);

let serverStarted = false;

const startServer = (storagePath) => {
  if (serverStarted) return;
  serverStarted = true;
  if (storagePath) process.env.TV_STORAGE_PATH = storagePath;
  try {
    require('./server');
  } catch (error) {
    console.error('Node server failed to start', error);
    try {
      rnBridge.channel.send(JSON.stringify({ type: 'server-error', message: error.message }));
    } catch (_) {}
  }
};

// Listener attaché AVANT d'envoyer node-ready — évite toute race condition
rnBridge.channel.on('message', (msg) => {
  try {
    const p = JSON.parse(msg);
    if (p.type === 'storage-path') {
      startServer(p.path);
    }
  } catch (_) {}
});

// Signale à React Native que Node.js est prêt à recevoir des messages
rnBridge.channel.send(JSON.stringify({ type: 'node-ready' }));
