let rnBridge = null;
try {
  rnBridge = require('rn-bridge');
} catch (error) {
  console.warn('rn-bridge indisponible (exécution locale probable)', error);
}

const sendToApp = (type, payload = {}) => {
  const canSend =
    rnBridge &&
    rnBridge.channel &&
    typeof rnBridge.channel.send === 'function';
  if (!canSend) return;
  try {
    rnBridge.channel.send(JSON.stringify({ type, ...payload }));
  } catch (error) {
    console.error('[Bridge] Send failed:', type, error);
  }
};

module.exports = { sendToApp };
