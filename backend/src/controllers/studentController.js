const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getStudentProfile = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.userId },
      include: {
        user: true,
        groups: {
          include: {
            group: {
              include: {
                allocations: {
                  include: { faculty: { include: { user: true } } },
                },
              },
            },
          },
        },
        preferences: true,
        invites: true,
      },
    });

    if (!student) {
      return res.status(404).json({ ok: false, error: 'Student not found' });
    }

    res.json({ ok: true, student });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

const getStudentGroups = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.userId },
    });

    if (!student) {
      return res.status(404).json({ ok: false, error: 'Student not found' });
    }

    const groups = await prisma.studentGroup.findMany({
      where: { studentId: student.id },
      include: {
        group: {
          include: {
            members: {
              include: { student: { include: { user: true } } },
            },
            allocations: {
              include: { faculty: { include: { user: true } } },
            },
            reviewSessions: true,
          },
        },
      },
    });

    res.json({ ok: true, groups });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

const createFacultyPreference = async (req, res) => {
  try {
    const { facultyId, preferenceRank } = req.body;

    const student = await prisma.student.findUnique({
      where: { userId: req.userId },
    });

    if (!student) {
      return res.status(404).json({ ok: false, error: 'Student not found' });
    }

    const preference = await prisma.facultyPreference.upsert({
      where: {
        studentId_preferenceRank: {
          studentId: student.id,
          preferenceRank,
        },
      },
      create: {
        studentId: student.id,
        facultyId,
        preferenceRank,
      },
      update: {
        facultyId,
      },
    });

    res.json({ ok: true, preference });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

const getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ ok: true, notifications });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

module.exports = {
  getStudentProfile,
  getStudentGroups,
  createFacultyPreference,
  getNotifications,
};
