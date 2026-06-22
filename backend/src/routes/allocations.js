const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get allocations
router.get('/', async (req, res) => {
  try {
    const allocations = await prisma.groupAllocation.findMany({
      include: {
        group: true,
        faculty: { include: { user: true } },
      },
    });
    res.json({ ok: true, allocations });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Allocate group to faculty
router.post('/', async (req, res) => {
  try {
    const { groupId, facultyId } = req.body;

    const allocation = await prisma.groupAllocation.create({
      data: { groupId, facultyId },
      include: {
        group: true,
        faculty: { include: { user: true } },
      },
    });

    res.status(201).json({ ok: true, allocation });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
