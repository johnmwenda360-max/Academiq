import Link from "next/link";

const nav = [
  { href: "/learners", label: "Learners" },
  { href: "/staff", label: "Staff" },
  { href: "/timetable", label: "Timetable" },
  { href: "/assessments", label: "Assessments" },
  { href: "/attendance", label: "Attendance" },
];

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <nav className="max-w-6xl mx-auto flex gap-1 px-4 overflow-x-auto">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-3 text-sm text-slate-600 hover:text-brand-600 whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
