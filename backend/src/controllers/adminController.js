const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getDashboardStats = async (req, res) => {
  try {
    const { cycleId } = req.query;

    const where = cycleId ? { cycleId } : {};

    const [totalStudents, totalGroups, totalFaculty, totalAllocations, activeCycles] =
      await Promise.all([
        prisma.student.count(),
        prisma.projectGroup.count({ where }),
        prisma.faculty.count(),
        prisma.groupAllocation.count({ where }),
        prisma.cycle.count({ where: { isActive: true } }),
      ]);

    res.json({
      ok: true,
      stats: {
        totalStudents,
        totalGroups,
        totalFaculty,
        totalAllocations,
        activeCycles,
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

const getAllocations = async (req, res) => {
  try {
    const { cycleId, facultyId, groupId } = req.query;

    const where = {};
    if (cycleId) where.group = { cycleId };
    if (facultyId) where.facultyId = facultyId;
    if (groupId) where.groupId = groupId;

    const allocations = await prisma.groupAllocation.findMany({
      where,
      include: {
        group: { include: { members: true } },
        faculty: { include: { user: true } },
      },
      orderBy: { allocationDate: 'desc' },
    });

    res.json({ ok: true, allocations });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

const bulkAllocate = async (req, res) => {
  try {
    const { allocations } = req.body;

    const results = [];
    for (const { groupId, facultyId } of allocations) {
      const allocation = await prisma.groupAllocation.upsert({
        where: { groupId_facultyId: { groupId, facultyId } },
        create: { groupId, facultyId },
        update: {},
      });
      results.push(allocation);
    }

    res.json({
      ok: true,
      message: `${results.length} groups allocated`,
      allocations: results,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getAllocations,
  bulkAllocate,
};
