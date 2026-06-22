const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      ok: false,
      error: 'Validation failed',
      details: errors.array().map((e) => ({ field: e.param, message: e.msg })),
    });
  }
  next();
};

const validators = {
  // Auth validators
  register: [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
  ],
  login: [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],

  // User validators
  updateUser: [
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
    body('phone').optional().isMobilePhone(),
  ],

  // Cycle validators
  createCycle: [
    body('name').notEmpty().trim(),
    body('type').isIn(['MAJOR', 'MINI', 'INTERNSHIP']),
    body('academicYear').matches(/^\d{4}-\d{2}$/).withMessage('Format: YYYY-YY'),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
  ],

  // Group validators
  createGroup: [
    body('groupName').notEmpty().trim(),
    body('cycleId').notEmpty(),
    body('projectTitle').notEmpty().trim(),
    body('projectDomain').notEmpty().trim(),
    body('maxMembers').isInt({ min: 1, max: 10 }),
  ],

  // Review validators
  scheduleReview: [
    body('groupId').notEmpty(),
    body('facultyId').notEmpty(),
    body('phase').isIn(['R0', 'P1', 'P2', 'REVIEW']),
    body('scheduledDate').isISO8601(),
  ],
};

module.exports = { validate, validators };
