import { prisma } from "../../../lib/db/prisma";

export default async function StaffPage() {
  const staff = await prisma.staff.findMany({ include: { subjects: { include: { subject: true } } } }).catch(() => []);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-lg font-semibold mb-4">Staff</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {staff.length === 0 && <p className="text-sm text-slate-400">No staff records yet.</p>}
        {staff.map((s) => (
          <div key={s.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="font-medium">{s.firstName} {s.lastName}</div>
            <div className="text-xs text-slate-500 mb-2">{s.role.replace("_", " ")}</div>
            <div className="flex flex-wrap gap-1">
              {s.subjects.map((ss) => (
                <span key={ss.id} className="text-xs bg-slate-100 rounded px-2 py-0.5">{ss.subject.name}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
