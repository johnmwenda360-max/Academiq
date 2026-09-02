// Server component: fetches directly via Prisma. Swap for a client
// component + SWR/React Query if you need optimistic offline reads
// from the IndexedDB reference cache instead.
import { prisma } from "../../../lib/db/prisma";

export default async function LearnersPage() {
  const learners = await prisma.learner
    .findMany({ take: 50, include: { classGroup: true }, orderBy: { lastName: "asc" } })
    .catch(() => []); // empty DB during first-run scaffold

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Learners</h1>
        <button className="text-sm rounded-lg bg-brand-600 text-white px-3 py-2">Add learner</button>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">UPI</th>
              <th className="px-4 py-2">Class</th>
              <th className="px-4 py-2">Level</th>
            </tr>
          </thead>
          <tbody>
            {learners.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No learners yet. Run prisma migrate + seed to populate this list.
                </td>
              </tr>
            )}
            {learners.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{l.firstName} {l.lastName}</td>
                <td className="px-4 py-2 text-slate-500">{l.upi}</td>
                <td className="px-4 py-2">{l.classGroup?.name}</td>
                <td className="px-4 py-2 text-slate-500">{l.level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
