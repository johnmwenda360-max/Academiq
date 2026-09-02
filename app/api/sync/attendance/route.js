import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db/prisma";

// Attendance is append-only: every synced mutation becomes a new row,
// never an overwrite, so two offline devices marking the same class
// never lose data — see lib/sync/reconciler.js for the policy this
// endpoint implements.
export async function POST(request) {
  const { payload } = await request.json();
  const record = await prisma.attendanceRecord.create({
    data: {
      learnerId: payload.learnerId,
      date: new Date(payload.date),
      period: payload.period ?? null,
      status: payload.status,
    },
  });
  return NextResponse.json(record, { status: 201 });
}
