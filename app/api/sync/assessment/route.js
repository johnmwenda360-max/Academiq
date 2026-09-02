import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db/prisma";

export async function POST(request) {
  const { payload } = await request.json();
  const record = await prisma.assessmentResult.create({ data: payload });
  return NextResponse.json(record, { status: 201 });
}
