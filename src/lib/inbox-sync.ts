'use client';

/**
 * Watches a folder on this computer (Chrome and Edge on desktop, via the File System Access API) and uploads
 * new or changed files into the matching smart inbox folder in Documents. Runs only while LifeSphere is open;
 * files are read in the browser and sent to the person's own account, nowhere else.
 */
import { api } from './api';

interface PermissionCapable {
  queryPermission(o: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission(o: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
}
type DirHandle = FileSystemDirectoryHandle & PermissionCapable & { values(): AsyncIterable<FileSystemHandle> };
type FileHandle = FileSystemFileHandle;

declare global {
  interface Window {
    showDirectoryPicker?: (o?: { id?: string; mode?: 'read' | 'readwrite'; startIn?: string }) => Promise<FileSystemDirectoryHandle>;
  }
}

const DB = 'lifesphere-inbox';
const STORE = 'kv';
export const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED = /\.(pdf|png|jpe?g|webp|gif|docx|xlsx|pptx|txt|md|csv|json)$/i;
const IGNORED = /^(~\$|\.|desktop\.ini$|thumbs\.db$)|\.(tmp|crdownload|part)$/i;

export const folderSyncSupported = () => typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function' && typeof indexedDB !== 'undefined';

function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => open.result.close();
    };
  });
}
const get = <T>(key: string) => idb<T | undefined>('readonly', (s) => s.get(key)).catch(() => undefined);
const put = (key: string, value: unknown) => idb('readwrite', (s) => s.put(value, key)).catch(() => undefined);
const del = (key: string) => idb('readwrite', (s) => s.delete(key)).catch(() => undefined);

// Per account, so someone else signing in on this computer never uploads into the wrong account.
const keys = (userId: string) => ({ dir: `dir:${userId}`, seen: `seen:${userId}`, last: `last:${userId}` });

export interface SyncState {
  connected: boolean;
  folderName: string | null;
  /** 'granted', or 'prompt' when the browser needs a click to allow access again. */
  permission: PermissionState | null;
  lastCheckedAt: string | null;
}

export async function syncState(userId: string): Promise<SyncState> {
  if (!folderSyncSupported()) return { connected: false, folderName: null, permission: null, lastCheckedAt: null };
  const k = keys(userId);
  const dir = await get<DirHandle>(k.dir);
  if (!dir) return { connected: false, folderName: null, permission: null, lastCheckedAt: null };
  const permission = await dir.queryPermission({ mode: 'read' }).catch(() => 'prompt' as PermissionState);
  return { connected: true, folderName: dir.name, permission, lastCheckedAt: (await get<string>(k.last)) ?? null };
}

/** Pick a folder; create the inbox subfolders in it so the person sees where things go. */
export async function connectFolder(userId: string, subfolders: string[]) {
  const dir = (await window.showDirectoryPicker!({ id: 'lifesphere-inbox', mode: 'readwrite' })) as DirHandle;
  if ((await dir.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error('permission_denied');
  for (const name of subfolders) await dir.getDirectoryHandle(name, { create: true });
  const k = keys(userId);
  await put(k.dir, dir);
  await put(k.seen, {});
  return dir.name;
}

/** After the browser forgot the permission (e.g. a restart), one click allows access again. */
export async function allowAgain(userId: string) {
  const dir = await get<DirHandle>(keys(userId).dir);
  if (!dir) return false;
  return (await dir.requestPermission({ mode: 'read' })) === 'granted';
}

export async function disconnectFolder(userId: string) {
  const k = keys(userId);
  await del(k.dir);
  await del(k.seen);
  await del(k.last);
}

let running = false;

/**
 * Upload what is new or changed. `folders` maps a subfolder name (lower case) to its Documents folder id;
 * files directly in the chosen folder, or in subfolders without a match, go to `fallbackFolderId`.
 */
export async function syncOnce(userId: string, folders: Record<string, string>, fallbackFolderId: string, limit = 10): Promise<{ uploaded: number; skipped: string[] }> {
  if (running) return { uploaded: 0, skipped: [] };
  running = true;
  try {
    const k = keys(userId);
    const dir = await get<DirHandle>(k.dir);
    if (!dir || (await dir.queryPermission({ mode: 'read' })) !== 'granted') return { uploaded: 0, skipped: [] };
    const seen = (await get<Record<string, string>>(k.seen)) ?? {};
    const skipped: string[] = [];
    let uploaded = 0;

    const visit = async (handle: DirHandle, target: string, prefix: string, depth: number) => {
      for await (const entry of handle.values()) {
        if (uploaded >= limit) return;
        if (IGNORED.test(entry.name)) continue;
        if (entry.kind === 'directory') {
          if (depth >= 2) continue;
          const sub = folders[entry.name.toLowerCase()];
          await visit(entry as DirHandle, depth === 0 ? (sub ?? fallbackFolderId) : target, `${prefix}${entry.name}/`, depth + 1);
          continue;
        }
        const path = `${prefix}${entry.name}`;
        const file = await (entry as FileHandle).getFile();
        const sig = `${file.size}:${file.lastModified}`;
        if (seen[path] === sig) continue;
        if (!ALLOWED.test(file.name) || file.size > MAX_BYTES || file.size === 0) {
          seen[path] = sig;
          skipped.push(file.name);
          continue;
        }
        const form = new FormData();
        form.append('file', file, file.name);
        try {
          await api.upload(`/v1/documents/folders/${target}/files`, form);
          seen[path] = sig;
          uploaded++;
        } catch {
          // Leave it unmarked so the next round tries again.
        }
      }
    };
    await visit(dir, fallbackFolderId, '', 0);
    await put(k.seen, seen);
    await put(k.last, new Date().toISOString());
    return { uploaded, skipped };
  } finally {
    running = false;
  }
}
