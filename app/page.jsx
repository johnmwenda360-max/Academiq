import Link from "next/link";

const modules = [
  { href: "/learners", label: "Learners", desc: "Profiles, guardians, medical notes" },
  { href: "/staff", label: "Staff", desc: "Teachers, subjects, lesson load" },
  { href: "/timetable", label: "Timetable", desc: "Master, class and teacher views" },
  { href: "/assessments", label: "Assessments", desc: "Strand-based competency tracking" },
  { href: "/attendance", label: "Attendance", desc: "Roll call and subject-period tracking" },
];

export default function Home() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-1">School PWA</h1>
      <p className="text-sm text-slate-500 mb-6">Choose a module to continue.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={`/${m.href.replace("/", "")}`}
            className="rounded-lg border border-slate-200 bg-white p-4 hover:border-brand-500 transition-colors"
          >
            <div className="font-medium">{m.label}</div>
            <div className="text-sm text-slate-500">{m.desc}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
