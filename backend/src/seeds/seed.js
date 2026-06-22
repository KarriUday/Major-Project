const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@pts.local' },
    update: {},
    create: {
      email: 'admin@pts.local',
      password: await bcrypt.hash('admin123', 10),
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      department: 'Administration',
    },
  });

  const admin = await prisma.admin.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id },
  });

  console.log('✅ Admin created:', adminUser.email);

  // Create sample faculty
  const facultyUser1 = await prisma.user.upsert({
    where: { email: 'dr.sharma@bmsit.in' },
    update: {},
    create: {
      email: 'dr.sharma@bmsit.in',
      password: await bcrypt.hash('faculty123', 10),
      firstName: 'Dr.',
      lastName: 'Sharma',
      role: 'FACULTY',
      department: 'CSE',
      phone: '+91-9999999999',
    },
  });

  const faculty1 = await prisma.faculty.upsert({
    where: { userId: facultyUser1.id },
    update: {},
    create: {
      userId: facultyUser1.id,
      empId: 'FAC001',
      specialization: 'Machine Learning',
      maxGroupsAllowed: 5,
    },
  });

  console.log('✅ Faculty created:', facultyUser1.email);

  // Create sample students
  const studentUser1 = await prisma.user.upsert({
    where: { email: '1by23cs098@bmsit.in' },
    update: {},
    create: {
      email: '1by23cs098@bmsit.in',
      password: await bcrypt.hash('student123', 10),
      firstName: 'Uday',
      lastName: 'K',
      role: 'STUDENT',
      department: 'CSE',
      phone: '+91-9876543210',
    },
  });

  const student1 = await prisma.student.upsert({
    where: { userId: studentUser1.id },
    update: {},
    create: {
      userId: studentUser1.id,
      usn: '1BY23CS098',
      cycle: '2025-26-major',
      section: 'A',
      batch: '2023-2027',
      gpa: 3.8,
    },
  });

  console.log('✅ Student created:', studentUser1.email);

  // Create sample cycle
  const cycle = await prisma.cycle.upsert({
    where: { name_academicYear: { name: 'Major Projects', academicYear: '2025-26' } },
    update: {},
    create: {
      name: 'Major Projects',
      type: 'MAJOR',
      academicYear: '2025-26',
      startDate: new Date('2025-06-01'),
      endDate: new Date('2026-05-31'),
      isActive: true,
    },
  });

  console.log('✅ Cycle created:', cycle.name);

  console.log('\n✨ Database seeding completed!');
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
