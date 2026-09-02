import { useState, useMemo } from "react";

/**
 * TimetableGrid
 * ---------------------------------------------------------------
 * Production-shaped prototype for the Intelligent Timetabling Engine.
 * Mirrors the Prisma `Lesson` model: { day, period, subjectId, staffId,
 * classGroupId, roomId }. Conflict detection re-implements the three
 * @@unique constraints from the schema client-side, for instant
 * feedback during drag-and-drop — the server re-validates on sync.
 *
 * Drop this into /components/timetable-grid/TimetableGrid.jsx
 * ---------------------------------------------------------------
 */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

// --- Seed data (would come from /api/timetable in production) ---
const SUBJECTS = [
  { id: "math", name: "Mathematics", color: "bg-indigo-100 text-indigo-900 border-indigo-300" },
  { id: "eng", name: "English", color: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  { id: "sci", name: "Science", color: "bg-amber-100 text-amber-900 border-amber-300" },
  { id: "kisw", name: "Kiswahili", color: "bg-rose-100 text-rose-900 border-rose-300" },
  { id: "cre", name: "CRE", color: "bg-sky-100 text-sky-900 border-sky-300" },
  { id: "pretech", name: "Pre-Technical", color: "bg-orange-100 text-orange-900 border-orange-300" },
];

const STAFF = [
  { id: "t1", name: "Mr Otieno", subjectIds: ["math", "sci"] },
  { id: "t2", name: "Ms Wanjiru", subjectIds: ["eng"] },
  { id: "t3", name: "Ms Achieng", subjectIds: ["kisw"] },
  { id: "t4", name: "Mr Kiptoo", subjectIds: ["cre", "pretech"] },
];

const CLASS_GROUPS = [
  { id: "g4a", name: "Grade 4A", level: "PRIMARY" },
  { id: "g4b", name: "Grade 4B", level: "PRIMARY" },
  { id: "g8a", name: "Grade 8A", level: "JUNIOR" },
];

const ROOMS = [
  { id: "r1", name: "Room 12", type: "STANDARD" },
  { id: "r2", name: "Science Lab", type: "LAB" },
];

// Unplaced lesson requirements — what still needs scheduling this term
const initialUnplaced = [
  { id: "u1", subjectId: "math", staffId: "t1", classGroupId: "g4a", roomId: "r1" },
  { id: "u2", subjectId: "sci", staffId: "t1", classGroupId: "g4b", roomId: "r2" },
  { id: "u3", subjectId: "eng", staffId: "t2", classGroupId: "g4a", roomId: "r1" },
  { id: "u4", subjectId: "kisw", staffId: "t3", classGroupId: "g4b", roomId: "r1" },
  { id: "u5", subjectId: "cre", staffId: "t4", classGroupId: "g8a", roomId: "r1" },
];

const subjectOf = (id) => SUBJECTS.find((s) => s.id === id);
const staffOf = (id) => STAFF.find((s) => s.id === id);
const roomOf = (id) => ROOMS.find((r) => r.id === id);
const classOf = (id) => CLASS_GROUPS.find((c) => c.id === id);

const slotKey = (day, period) => `${day}-${period}`;

export default function TimetableGrid() {
  const [view, setView] = useState("class"); // "master" | "class" | "teacher"
  const [selectedClassId, setSelectedClassId] = useState(CLASS_GROUPS[0].id);
  const [selectedStaffId, setSelectedStaffId] = useState(STAFF[0].id);

  // placed[slotKey] = array of lesson objects occupying that day/period
  const [placed, setPlaced] = useState({});
  const [unplaced, setUnplaced] = useState(initialUnplaced);
  const [dragId, setDragId] = useState(null);
  const [conflict, setConflict] = useState(null); // { message }
  const [dragOverSlot, setDragOverSlot] = useState(null);

  const allPlacedLessons = useMemo(() => Object.values(placed).flat(), [placed]);

  function findLessonById(id) {
    return unplaced.find((l) => l.id === id) || allPlacedLessons.find((l) => l.id === id);
  }

  function detectConflict(lesson, day, period, excludeSlot) {
    const key = slotKey(day, period);
    if (key === excludeSlot) return null;
    const occupants = placed[key] || [];
    const teacherClash = occupants.find((o) => o.staffId === lesson.staffId);
    if (teacherClash) {
      return `${staffOf(lesson.staffId).name} is already teaching ${classOf(teacherClash.classGroupId).name} at this slot.`;
    }
    const classClash = occupants.find((o) => o.classGroupId === lesson.classGroupId);
    if (classClash) {
      return `${classOf(lesson.classGroupId).name} already has ${subjectOf(classClash.subjectId).name} at this slot.`;
    }
    const roomClash = occupants.find((o) => o.roomId === lesson.roomId && lesson.roomId);
    if (roomClash) {
      return `${roomOf(lesson.roomId).name} is booked by ${classOf(roomClash.classGroupId).name} at this slot.`;
    }
    return null;
  }

  function handleDrop(day, period) {
    if (!dragId) return;
    const lesson = findLessonById(dragId);
    if (!lesson) return;

    // if this lesson is already placed somewhere, find & clear its old slot
    const currentSlot = Object.entries(placed).find(([, arr]) => arr.some((l) => l.id === dragId))?.[0];

    const clashMsg = detectConflict(lesson, day, period, currentSlot);
    if (clashMsg) {
      setConflict({ message: clashMsg });
      setDragOverSlot(null);
      setDragId(null);
      return;
    }

    setPlaced((prev) => {
      const next = { ...prev };
      if (currentSlot) {
        next[currentSlot] = next[currentSlot].filter((l) => l.id !== dragId);
      }
      const key = slotKey(day, period);
      next[key] = [...(next[key] || []), lesson];
      return next;
    });
    setUnplaced((prev) => prev.filter((l) => l.id !== dragId));
    setConflict(null);
    setDragOverSlot(null);
    setDragId(null);
  }

  function clearSlotLesson(lessonId, key) {
    setPlaced((prev) => ({ ...prev, [key]: prev[key].filter((l) => l.id !== lessonId) }));
    const lesson = allPlacedLessons.find((l) => l.id === lessonId);
    if (lesson) setUnplaced((prev) => [...prev, lesson]);
  }

  // Filter which lessons are visible per view mode
  function visibleLesson(lesson) {
    if (view === "class") return lesson.classGroupId === selectedClassId;
    if (view === "teacher") return lesson.staffId === selectedStaffId;
    return true; // master view shows everything
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 font-sans text-slate-900">
      {/* Header / view switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex rounded-lg border border-slate-300 overflow-hidden">
          {[
            { id: "master", label: "Master" },
            { id: "class", label: "Class-wise" },
            { id: "teacher", label: "Teacher" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                view === tab.id ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {view === "class" && (
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            {CLASS_GROUPS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        {view === "teacher" && (
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            {STAFF.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Conflict banner */}
      {conflict && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="font-semibold">Placement blocked —</span>
          <span>{conflict.message}</span>
          <button onClick={() => setConflict(null)} className="ml-auto text-red-500 hover:text-red-700">
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Unplaced lesson pool */}
        <aside className="lg:w-56 shrink-0">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Unscheduled lessons
          </h3>
          <div className="flex flex-col gap-2">
            {unplaced.length === 0 && (
              <p className="text-sm text-slate-400 italic">All lessons placed.</p>
            )}
            {unplaced.map((lesson) => {
              const subj = subjectOf(lesson.subjectId);
              return (
                <div
                  key={lesson.id}
                  draggable
                  onDragStart={() => setDragId(lesson.id)}
                  onDragEnd={() => setDragId(null)}
                  className={`cursor-grab active:cursor-grabbing rounded-lg border px-3 py-2 text-xs shadow-sm ${subj.color}`}
                >
                  <div className="font-semibold">{subj.name}</div>
                  <div className="opacity-80">{staffOf(lesson.staffId).name}</div>
                  <div className="opacity-70">{classOf(lesson.classGroupId).name}</div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1 overflow-x-auto">
          <div
            className="grid gap-1 min-w-[640px]"
            style={{ gridTemplateColumns: `48px repeat(${DAYS.length}, 1fr)` }}
          >
            <div />
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2">
                {d}
              </div>
            ))}

            {PERIODS.map((p) => (
              <FragmentRow
                key={p}
                period={p}
                dragOverSlot={dragOverSlot}
                setDragOverSlot={setDragOverSlot}
                placed={placed}
                view={view}
                visibleLesson={visibleLesson}
                onDrop={handleDrop}
                clearSlotLesson={clearSlotLesson}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FragmentRow({ period, dragOverSlot, setDragOverSlot, placed, view, visibleLesson, onDrop, clearSlotLesson }) {
  return (
    <>
      <div className="flex items-center justify-center text-xs font-medium text-slate-500">
        P{period}
      </div>
      {DAYS.map((day) => {
        const key = slotKey(day, period);
        const occupants = (placed[key] || []).filter(visibleLesson);
        const isOver = dragOverSlot === key;

        return (
          <div
            key={key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverSlot(key);
            }}
            onDragLeave={() => setDragOverSlot((s) => (s === key ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              onDrop(day, period);
            }}
            className={`min-h-[64px] rounded-lg border-2 border-dashed p-1 transition-colors ${
              isOver ? "border-slate-400 bg-slate-50" : "border-slate-200"
            }`}
          >
            {occupants.map((lesson) => {
              const subj = subjectOf(lesson.subjectId);
              return (
                <div
                  key={lesson.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", lesson.id)}
                  onClick={() => clearSlotLesson(lesson.id, key)}
                  title="Click to unschedule"
                  className={`rounded-md border px-2 py-1 text-[11px] leading-tight cursor-pointer ${subj.color}`}
                >
                  <div className="font-semibold">{subj.name}</div>
                  {view !== "teacher" && <div className="opacity-80">{staffOf(lesson.staffId).name}</div>}
                  {view !== "class" && <div className="opacity-70">{classOf(lesson.classGroupId).name}</div>}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
