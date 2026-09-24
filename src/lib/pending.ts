// A voice memo that didn't upload is kept in IndexedDB until it does,
// so nothing you recorded is lost to a bad connection or a closed tab.

const DB = "posted";
const STORE = "pending-voice";

export type PendingVoice = {
  /** "post" or "reply:<postId>" */
  target: string;
  notebookId?: string | null;
  caption?: string;
  blob: Blob;
  mime: string;
  ext: string;
  duration_ms: number;
  peaks: number[];
};

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  try {
    const db = await open();
    return await new Promise((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

export const savePending = (p: PendingVoice) => run("readwrite", (s) => s.put(p, p.target));
export const loadPending = (target: string) => run<PendingVoice>("readonly", (s) => s.get(target));
export const clearPending = (target: string) => run("readwrite", (s) => s.delete(target));
