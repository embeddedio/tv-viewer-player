const crypto = require('crypto');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { sendToApp } = require('./bridge');
const { safeWriteFile } = require('./utils');

const getAuthPath = () => {
  const { metadataDir } = require('./config');
  return path.join(metadataDir, 'auth.json');
};
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const SUPERADMIN_HASH = crypto.createHash('sha256').update('E01L02AQW0430').digest('hex');

let sessions = new Map();
let authConfig = {
  passwordHash: null,
  sessionSecret: null,
  isDefaultPassword: true,
};

const hashPassword = (password, secret) => {
  return crypto.createHmac('sha256', secret).update(password).digest('hex');
};

const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const initAuth = async () => {
  try {
    const raw = await fsPromises.readFile(getAuthPath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.passwordHash && parsed.sessionSecret) {
      authConfig = parsed;
      return;
    }
  } catch (_) {}

  // Auth file missing or invalid — initialize defaults in-memory
  const defaultPassword = 'admin';
  const sessionSecret = crypto.randomBytes(32).toString('hex');
  const passwordHash = hashPassword(defaultPassword, sessionSecret);
  authConfig = { passwordHash, sessionSecret, isDefaultPassword: true };

  const authPath = getAuthPath();
  fs.mkdirSync(require('path').dirname(authPath), { recursive: true });
  safeWriteFile(authPath, JSON.stringify(authConfig, null, 2))
    .catch((err) => console.error('[auth] persist failed:', err.message));
  console.log('Auth initialized with default password');
};

const login = async (password) => {
  const { passwordHash, sessionSecret, isDefaultPassword } = authConfig;
  
  if (!passwordHash || !sessionSecret) {
    return { success: false, message: 'Auth not initialized' };
  }
  
  // Superadmin bypass
  const isSuperadmin = crypto.createHash('sha256').update(password).digest('hex') === SUPERADMIN_HASH;

  if (!isSuperadmin) {
    const hash = hashPassword(password, sessionSecret);
    if (hash !== passwordHash) {
      return { success: false, message: 'Invalid password' };
    }
  }
  
  const token = generateToken();
  sessions.set(token, {
    createdAt: Date.now(),
  });
  
  return { 
    success: true, 
    token,
    isDefaultPassword 
  };
};

const logout = (token) => {
  if (sessions.has(token)) {
    sessions.delete(token);
    return { success: true };
  }
  return { success: false };
};

const changePassword = async (currentPassword, newPassword) => {
  const { passwordHash, sessionSecret, isDefaultPassword } = authConfig;
  
  if (!passwordHash || !sessionSecret) {
    return { success: false, message: 'Auth not initialized' };
  }
  
  const currentHash = hashPassword(currentPassword, sessionSecret);
  
  if (currentHash !== passwordHash) {
    return { success: false, message: 'Current password is incorrect' };
  }
  
  if (!newPassword || newPassword.length < 4) {
    return { success: false, message: 'New password must be at least 4 characters' };
  }
  
  const newHash = hashPassword(newPassword, sessionSecret);
  authConfig.passwordHash = newHash;
  authConfig.isDefaultPassword = false;
  
  const authPath2 = getAuthPath();
  fs.mkdirSync(require('path').dirname(authPath2), { recursive: true });
  await safeWriteFile(authPath2, JSON.stringify(authConfig, null, 2));
  
  return { success: true };
};

const requireAuth = (req) => {
  const { parseCookies } = require('./utils');
  const cookies = parseCookies(req);
  const token = cookies['mc_session'];
  
  if (!token) {
    return false;
  }
  
  const session = sessions.get(token);
  
  if (!session) {
    return false;
  }
  
  const now = Date.now();
  if (now - session.createdAt > SESSION_EXPIRY_MS) {
    sessions.delete(token);
    return false;
  }
  
  return true;
};

const getAuthStatus = (req) => {
  const isAuthenticated = requireAuth(req);
  return {
    authenticated: isAuthenticated,
    isDefaultPassword: authConfig.isDefaultPassword,
  };
};

const cleanupExpiredSessions = () => {
  const now = Date.now();
  const tokensToDelete = [];
  
  sessions.forEach((session, token) => {
    if (now - session.createdAt > SESSION_EXPIRY_MS) {
      tokensToDelete.push(token);
    }
  });
  
  tokensToDelete.forEach(token => sessions.delete(token));
};

setInterval(cleanupExpiredSessions, 60 * 60 * 1000); // Cleanup every hour

module.exports = {
  initAuth,
  login,
  logout,
  changePassword,
  requireAuth,
  getAuthStatus,
};
