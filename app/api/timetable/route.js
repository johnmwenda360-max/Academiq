import { NextResponse } from "next/server";
import { placeLesson, getTimetableForClass, getTimetableForTeacher } from "../../../lib/services/timetableService";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const classGroupId = searchParams.get("classGroupId");
  const staffId = searchParams.get("staffId");

  if (classGroupId) {
    return NextResponse.json(await getTimetableForClass(classGroupId));
  }
  if (staffId) {
    return NextResponse.json(await getTimetableForTeacher(staffId));
  }
  return NextResponse.json({ error: "classGroupId or staffId is required" }, { status: 400 });
}

export async function POST(request) {
  const body = await request.json();
  try {
    const lesson = await placeLesson(body);
    return NextResponse.json(lesson, { status: 201 });
  } catch (err) {
    if (err.code === "TIMETABLE_CONFLICT") {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to place lesson" }, { status: 500 });
  }
}
