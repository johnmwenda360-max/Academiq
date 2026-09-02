export default function AttendancePage() {
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-lg font-semibold mb-1">Attendance</h1>
      <p className="text-sm text-slate-500">
        Daily roll call (Primary) or subject-period marking (Junior School) — writes go through
        lib/sync/queue.js so marking works offline.
      </p>
    </div>
  );
}
