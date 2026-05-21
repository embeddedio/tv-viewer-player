const BASE = window.location.origin;

export async function api(endpoint, opts = {}) {
  try {
    const r = await fetch(`${BASE}${endpoint}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...opts.headers },
    });
    if (r.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      return null;
    }
    const data = await r.json();
    return data;
  } catch (e) {
    console.error('API error:', e);
    return null;
  }
}

export function postJsonWithProgress(endpoint, payload, onUploadProgress) {
  return new Promise((resolve) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}${endpoint}`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.responseType = 'json';

      xhr.upload.onprogress = (event) => {
        if (!onUploadProgress || !event.lengthComputable) return;
        const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
        onUploadProgress(percent);
      };

      xhr.onload = () => {
        if (xhr.status === 401) {
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          resolve(null);
          return;
        }
        if (xhr.response && typeof xhr.response === 'object') {
          resolve(xhr.response);
          return;
        }
        try {
          resolve(JSON.parse(xhr.responseText || '{}'));
        } catch (_) {
          resolve(null);
        }
      };

      xhr.onerror = () => resolve(null);
      xhr.send(JSON.stringify(payload));
    } catch (e) {
      console.error('XHR API error:', e);
      resolve(null);
    }
  });
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileToBase64WithProgress(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result || '').toString().split(',')[1] || '');
    reader.onerror = reject;
    reader.onprogress = (e) => {
      if (onProgress && e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    reader.readAsDataURL(file);
  });
}

function emitUpload(event, detail = {}) {
  window.dispatchEvent(new CustomEvent(`upload:${event}`, { detail }));
}

/** Upload fichiers avec progression globale (UploadToast) */
export async function uploadFiles(fileList, { category = 'media', folder = null, label } = {}) {
  const list = Array.from(fileList);
  if (!list.length) return null;

  const defaultLabel = list.length === 1 ? list[0].name : `${list.length} fichiers`;
  emitUpload('start', { label: label ?? defaultLabel, fileName: list[0].name });

  const READ_WEIGHT = 40;

  try {
    const encoded = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      emitUpload('progress', { phase: 'encoding', percent: Math.round((i / list.length) * READ_WEIGHT), fileName: file.name });
      const data = await fileToBase64WithProgress(file, (fp) => {
        emitUpload('progress', { phase: 'encoding', percent: Math.round(((i + fp / 100) / list.length) * READ_WEIGHT) });
      });
      encoded.push({ name: file.name, data });
    }

    const uploadLabel = encoded.length === 1 ? encoded[0].name : `${encoded.length} fichiers`;
    emitUpload('progress', { phase: 'uploading', percent: READ_WEIGHT, fileName: uploadLabel });

    const result = await postJsonWithProgress('/upload', { category, folder: folder || null, files: encoded }, (xhrPct) => {
      emitUpload('progress', { phase: 'uploading', percent: READ_WEIGHT + Math.round((xhrPct / 100) * (95 - READ_WEIGHT)) });
    });

    emitUpload('done', { success: !!(result?.success) });
    return result;
  } catch {
    emitUpload('done', { success: false });
    return null;
  }
}

export function uploadsUrl(filename) {
  return `${BASE}/uploads/${encodeURIComponent(filename)}`;
}
