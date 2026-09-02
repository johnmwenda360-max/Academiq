/**
 * Conflict reconciliation for mutations that raced a server-side change
 * while the client was offline.
 *
 * Policy (matches the architecture doc):
 *  - Attendance and assessment records are APPEND-ONLY logs, so a
 *    conflict there just means both entries are kept — there is
 *    nothing to merge.
 *  - Everything else (learner profile fields, lesson placement) is
 *    last-writer-wins by clientTimestamp, applied per-field so an
 *    offline edit to a guardian phone number doesn't blow away an
 *    unrelated edit to the same learner's medical notes made elsewhere.
 */

const APPEND_ONLY_ENTITIES = new Set(["attendance", "assessment"]);

export async function reconcile(localMutation, serverRecord) {
  if (APPEND_ONLY_ENTITIES.has(localMutation.entityType)) {
    return retrySameMutationAsNewEntry(localMutation);
  }
  return lastWriterWinsPerField(localMutation, serverRecord);
}

async function retrySameMutationAsNewEntry(mutation) {
  return fetch(`/api/sync/${mutation.entityType}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...mutation, operation: "CREATE" }),
  });
}

async function lastWriterWinsPerField(localMutation, serverRecord) {
  const merged = { ...serverRecord };
  for (const [field, value] of Object.entries(localMutation.payload)) {
    if (localMutation.clientTimestamp >= (serverRecord.updatedAt ?? 0)) {
      merged[field] = value;
    }
  }
  return fetch(`/api/sync/${localMutation.entityType}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: serverRecord.id, ...merged }),
  });
}
