const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { validators, validate } = require('../utils/validators');

const prisma = new PrismaClient();

// Schedule review
router.post('/schedule', validators.scheduleReview, validate, async (req, res) => {
  try {
    const review = await prisma.reviewSession.create({
      data: req.body,
      include: {
        group: true,
        faculty: { include: { user: true } },
      },
    });
    res.status(201).json({ ok: true, review });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Mark attendance
router.post('/attendance', async (req, res) => {
  try {
    const { reviewSessionId, studentId, status } = req.body;

    const attendance = await prisma.attendance.upsert({
      where: {
        reviewSessionId_studentId: { reviewSessionId, studentId },
      },
      create: {
        reviewSessionId,
        studentId,
        status,
        markedBy: req.userId,
      },
      update: { status },
    });

    res.json({ ok: true, attendance });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Submit evaluation
router.post('/evaluate', async (req, res) => {
  try {
    const evaluation = await prisma.evaluation.upsert({
      where: {
        groupId_reviewSessionId_facultyId: {
          groupId: req.body.groupId,
          reviewSessionId: req.body.reviewSessionId,
          facultyId: req.body.facultyId,
        },
      },
      create: {
        ...req.body,
        isSubmitted: true,
        submittedAt: new Date(),
      },
      update: {
        ...req.body,
        isSubmitted: true,
        submittedAt: new Date(),
      },
    });

    res.json({ ok: true, evaluation });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
