// Reads and writes the Application Helper workspace folder through the File System Access
// API. The folder handle is kept in IndexedDB; Chrome asks again for write access after a
// restart, which needs a click (ensurePermission with interactive = true).

const DB = 'application-helper';
const STORE = 'handles';

function idb(mode, fn) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
    };
  });
}

export async function savedWorkspace() {
  try {
    return (await idb('readonly', s => s.get('workspace'))) || null;
  } catch {
    return null;
  }
}

export async function connectWorkspace() {
  // eslint-disable-next-line no-undef
  const handle = await showDirectoryPicker({ id: 'application-helper-workspace', mode: 'readwrite' });
  if (!(await isWorkspace(handle))) {
    throw new Error(`"${handle.name}" has no _profile/config.md. Pick the folder Application Helper set up.`);
  }
  await idb('readwrite', s => s.put(handle, 'workspace'));
  return handle;
}

export async function isWorkspace(root) {
  try {
    await (await root.getDirectoryHandle('_profile')).getFileHandle('config.md');
    return true;
  } catch {
    return false;
  }
}

export async function ensurePermission(handle, interactive) {
  const opts = { mode: 'readwrite' };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  if (!interactive) return false;
  return (await handle.requestPermission(opts)) === 'granted';
}

async function dir(root, parts, create) {
  let d = root;
  for (const p of parts) d = await d.getDirectoryHandle(p, { create });
  return d;
}

function split(path) {
  const parts = path.split('/').filter(Boolean);
  return { dirs: parts.slice(0, -1), name: parts.at(-1) };
}

export async function readJson(root, path, fallback) {
  try {
    const { dirs, name } = split(path);
    const file = await (await (await dir(root, dirs, false)).getFileHandle(name)).getFile();
    return JSON.parse(await file.text());
  } catch {
    return fallback;
  }
}

export async function writeJson(root, path, data) {
  const { dirs, name } = split(path);
  const fh = await (await dir(root, dirs, true)).getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(JSON.stringify(data, null, 2));
  await w.close();
}

export async function readJsonDir(root, path) {
  const out = {};
  let d;
  try {
    d = await dir(root, path.split('/').filter(Boolean), false);
  } catch {
    return out;
  }
  for await (const [name, h] of d.entries()) {
    if (h.kind !== 'file' || !name.endsWith('.json')) continue;
    try {
      out[name.replace(/\.json$/, '')] = JSON.parse(await (await h.getFile()).text());
    } catch { /* skip unreadable */ }
  }
  return out;
}

// Adds postings to feeds/browser-<date>.json. A full ad replaces the listing it was read
// from (same id); a listing never replaces a full ad.
export async function savePostings(root, date, postings, run) {
  const path = `feeds/browser-${date}.json`;
  const day = await readJson(root, path, { date, source: 'browser', runs: [], postings: [] });
  const byId = new Map(day.postings.map(p => [p.id, p]));
  let added = 0;
  let upgraded = 0;
  for (const p of postings) {
    const old = byId.get(p.id);
    if (!old) {
      byId.set(p.id, p);
      added++;
    } else if (old.kind === 'listing' && p.kind !== 'listing') {
      byId.set(p.id, { ...p, firstSeen: old.firstSeen || p.firstSeen });
      upgraded++;
    }
  }
  day.postings = [...byId.values()];
  day.runs.push({ at: new Date().toISOString(), ...run, added, upgraded });
  await writeJson(root, path, day);
  return { path, added, upgraded, total: day.postings.length };
}
