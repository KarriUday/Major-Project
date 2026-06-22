const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { validators, validate } = require('../utils/validators');

const prisma = new PrismaClient();

// Get current user
router.get('/me', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { student: true, faculty: true, admin: true },
    });

    res.json({
      ok: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Update user profile
router.put('/me', validators.updateUser, validate, async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: req.body,
    });

    res.json({ ok: true, user });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get all users (Admin only)
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { student: true, faculty: true },
    });
    res.json({ ok: true, users });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
