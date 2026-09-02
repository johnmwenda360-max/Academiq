import { prisma } from "../db/prisma";

/**
 * Server-side source of truth for lesson placement. The client-side
 * TimetableGrid component runs the same three checks for instant
 * feedback, but this is what actually gets enforced — it also backs
 * the DB's @@unique constraints so a race between two admins editing
 * at once still fails cleanly instead of corrupting the schedule.
 */
export async function placeLesson({ day, period, subjectId, staffId, classGroupId, roomId }) {
  const conflict = await findConflict({ day, period, staffId, classGroupId, roomId });
  if (conflict) {
    const err = new Error(conflict.message);
    err.code = "TIMETABLE_CONFLICT";
    throw err;
  }

  return prisma.lesson.create({
    data: { day, period, subjectId, staffId, classGroupId, roomId },
  });
}

async function findConflict({ day, period, staffId, classGroupId, roomId }) {
  const [teacherClash, classClash, roomClash] = await Promise.all([
    prisma.lesson.findFirst({
      where: { day, period, staffId },
      include: { classGroup: true },
    }),
    prisma.lesson.findFirst({
      where: { day, period, classGroupId },
      include: { subject: true },
    }),
    roomId
      ? prisma.lesson.findFirst({ where: { day, period, roomId }, include: { classGroup: true } })
      : null,
  ]);

  if (teacherClash) {
    return { message: `Teacher already booked with ${teacherClash.classGroup.name} at this slot.` };
  }
  if (classClash) {
    return { message: `Class already has ${classClash.subject.name} at this slot.` };
  }
  if (roomClash) {
    return { message: `Room already booked by ${roomClash.classGroup.name} at this slot.` };
  }
  return null;
}

/** Weekly lesson-count check against the Subject curriculum config. */
export async function remainingWeeklyAllocation(subjectId, classGroupId) {
  const subject = await prisma.subject.findUniqueOrThrow({ where: { id: subjectId } });
  const scheduled = await prisma.lesson.count({ where: { subjectId, classGroupId } });
  return Math.max(subject.weeklyLessons - scheduled, 0);
}

export async function getTimetableForClass(classGroupId) {
  return prisma.lesson.findMany({
    where: { classGroupId },
    include: { subject: true, staff: true, room: true },
    orderBy: [{ day: "asc" }, { period: "asc" }],
  });
}

export async function getTimetableForTeacher(staffId) {
  return prisma.lesson.findMany({
    where: { staffId },
    include: { subject: true, classGroup: true, room: true },
    orderBy: [{ day: "asc" }, { period: "asc" }],
  });
}
