"use client";

import { useEffect } from "react";

// Registers the service worker and wires up the outbox drain whenever
// connectivity is restored. Kept as a small client component so it can
// sit in the root layout without turning the whole app client-side.
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[sw] registered", reg.scope);
      })
      .catch((err) => console.error("[sw] registration failed", err));

    // Fallback for browsers without Background Sync (notably iOS Safari):
    // drain the outbox on the 'online' event instead of relying solely
    // on the SW's 'sync' event.
    window.addEventListener("online", () => {
      import("../lib/sync/queue").then(({ drainOutbox }) => drainOutbox());
    });
  }, []);

  return null;
}
