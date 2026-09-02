const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.upsert({
    where: { code: "SCH001" },
    update: {},
    create: { name: "Demo Primary & Junior School", code: "SCH001" },
  });

  const room = await prisma.room.create({
    data: { name: "Room 12", type: "STANDARD", schoolId: school.id },
  });

  const grade4a = await prisma.classGroup.create({
    data: { name: "Grade 4A", grade: 4, level: "PRIMARY", schoolId: school.id },
  });

  const math = await prisma.subject.create({
    data: { name: "Mathematics", level: "PRIMARY", weeklyLessons: 6, isCore: true },
  });

  const teacher = await prisma.staff.create({
    data: {
      staffNo: "T001",
      firstName: "Grace",
      lastName: "Otieno",
      role: "TEACHER",
      schoolId: school.id,
      subjects: { create: { subjectId: math.id } },
    },
  });

  await prisma.learner.create({
    data: {
      upi: "UPI0001",
      admissionNo: "ADM0001",
      firstName: "Amani",
      lastName: "Njoroge",
      dob: new Date("2016-03-14"),
      gender: "F",
      level: "PRIMARY",
      grade: 4,
      classGroupId: grade4a.id,
      schoolId: school.id,
      guardians: {
        create: { name: "James Njoroge", relation: "Father", phone: "+254700000000", isPrimary: true },
      },
    },
  });

  console.log("Seeded:", { school: school.name, room: room.name, teacher: teacher.lastName });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
