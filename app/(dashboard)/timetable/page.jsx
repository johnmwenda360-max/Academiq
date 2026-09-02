import TimetableGrid from "../../../components/timetable-grid/TimetableGrid";

export default function TimetablePage() {
  return (
    <div className="py-6">
      <div className="max-w-6xl mx-auto px-4 mb-4">
        <h1 className="text-lg font-semibold">Timetable</h1>
        <p className="text-sm text-slate-500">
          Drag a lesson from the pool onto a slot. Conflicts with an existing teacher, class or room booking are blocked automatically.
        </p>
      </div>
      <TimetableGrid />
    </div>
  );
}
