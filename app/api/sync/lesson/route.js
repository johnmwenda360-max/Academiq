import { NextResponse } from "next/server";
import { placeLesson } from "../../../../lib/services/timetableService";

// Lesson placement is not append-only — a synced offline placement
// still has to pass through the same conflict check as a live edit.
export async function POST(request) {
  const { payload } = await request.json();
  try {
    const lesson = await placeLesson(payload);
    return NextResponse.json(lesson, { status: 201 });
  } catch (err) {
    if (err.code === "TIMETABLE_CONFLICT") {
      return NextResponse.json({ error: err.message, ...payload }, { status: 409 });
    }
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
