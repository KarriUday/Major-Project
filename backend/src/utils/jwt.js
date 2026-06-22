const jwt = require('jsonwebtoken');

const generateToken = (userId, expiresIn = process.env.JWT_EXPIRY || '7d') => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
