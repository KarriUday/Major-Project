const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ ok: false, error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        student: true,
        faculty: true,
        admin: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ ok: false, error: 'User not found or inactive' });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    res.status(401).json({ ok: false, error: 'Invalid or expired token' });
  }
};

const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, error: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
