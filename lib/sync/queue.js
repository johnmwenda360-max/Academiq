import { openDB } from "idb";

/**
 * IndexedDB-backed outbox for offline writes.
 *
 * Every mutation (attendance mark, assessment score, lesson placement)
 * is written here FIRST, applied to local UI state optimistically, and
 * only sent to the server when connectivity allows. This is what makes
 * marking a whole class's attendance work on a phone with no signal.
 */

const DB_NAME = "school-pwa-outbox";
const DB_VERSION = 1;
const STORE = "mutations";

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("byStatus", "status");
        store.createIndex("byEntity", "entityType");
      }
    },
  });
}

/**
 * @param {string} entityType - "attendance" | "assessment" | "lesson" | ...
 * @param {"CREATE"|"UPDATE"|"DELETE"} operation
 * @param {object} payload - entity data, must include entityVersion if UPDATE
 */
export async function enqueueMutation(entityType, operation, payload) {
  const db = await getDb();
  const record = {
    entityType,
    operation,
    payload,
    clientTimestamp: Date.now(),
    status: "PENDING",
    retries: 0,
  };
  await db.add(STORE, record);
  await requestBackgroundSync();
  return record;
}

async function requestBackgroundSync() {
  if (typeof navigator === "undefined") return;
  if (!("serviceWorker" in navigator) || !("SyncManager" in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register("drain-outbox");
  } catch {
    // SyncManager present but registration failed (e.g. permission) —
    // the 'online' event fallback in register-sw.js still covers this.
  }
}

/**
 * Sends all PENDING mutations to the server in clientTimestamp order.
 * Called from the 'online' event and from the SW's DRAIN_OUTBOX message.
 */
export async function drainOutbox() {
  const db = await getDb();
  const all = await db.getAllFromIndex(STORE, "byStatus", "PENDING");
  all.sort((a, b) => a.clientTimestamp - b.clientTimestamp);

  for (const mutation of all) {
    try {
      const res = await fetch(`/api/sync/${mutation.entityType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mutation),
      });

      if (res.status === 409) {
        // Server detected a conflicting version — hand off to the
        // reconciler rather than silently dropping the local change.
        const serverRecord = await res.json();
        const { reconcile } = await import("./reconciler");
        await reconcile(mutation, serverRecord);
      }

      if (res.ok || res.status === 409) {
        await db.delete(STORE, mutation.id);
      } else {
        await bumpRetry(db, mutation);
      }
    } catch {
      // still offline or server unreachable — leave PENDING, try again
      // on the next sync event.
      break;
    }
  }
}

async function bumpRetry(db, mutation) {
  mutation.retries += 1;
  if (mutation.retries >= 5) {
    mutation.status = "FAILED"; // surfaced in a "sync issues" UI badge
  }
  await db.put(STORE, mutation);
}

export async function getPendingCount() {
  const db = await getDb();
  return (await db.getAllFromIndex(STORE, "byStatus", "PENDING")).length;
}
