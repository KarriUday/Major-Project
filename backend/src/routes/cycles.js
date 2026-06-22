const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { validators, validate } = require('../utils/validators');
const { authorize } = require('../middleware/auth');

const prisma = new PrismaClient();

// Get all cycles
router.get('/', async (req, res) => {
  try {
    const cycles = await prisma.cycle.findMany({
      orderBy: { startDate: 'desc' },
    });
    res.json({ ok: true, cycles });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get active cycle
router.get('/active', async (req, res) => {
  try {
    const cycle = await prisma.cycle.findFirst({
      where: { isActive: true },
    });
    res.json({ ok: true, cycle });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Create cycle (Admin only)
router.post('/', authorize(['ADMIN']), validators.createCycle, validate, async (req, res) => {
  try {
    const cycle = await prisma.cycle.create({
      data: req.body,
    });
    res.status(201).json({ ok: true, cycle });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
