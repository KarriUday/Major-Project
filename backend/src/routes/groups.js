const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { validators, validate } = require('../utils/validators');

const prisma = new PrismaClient();

// Get all groups
router.get('/', async (req, res) => {
  try {
    const { cycleId, status } = req.query;
    const where = {};
    if (cycleId) where.cycleId = cycleId;
    if (status) where.status = status;

    const groups = await prisma.projectGroup.findMany({
      where,
      include: {
        members: { include: { student: { include: { user: true } } } },
        allocations: { include: { faculty: { include: { user: true } } } },
      },
    });

    res.json({ ok: true, groups });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Create group
router.post('/', validators.createGroup, validate, async (req, res) => {
  try {
    const group = await prisma.projectGroup.create({
      data: {
        ...req.body,
        createdBy: req.userId,
      },
      include: {
        members: true,
        allocations: true,
      },
    });
    res.status(201).json({ ok: true, group });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Add member to group
router.post('/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { studentId } = req.body;

    const member = await prisma.studentGroup.create({
      data: {
        groupId,
        studentId,
      },
    });

    res.status(201).json({ ok: true, member });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
