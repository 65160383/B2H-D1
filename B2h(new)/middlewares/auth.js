const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'b2h-demo-jwt-secret';

function authenticateJWT(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing token' });
  }
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

function requireRole(role) {
  return async (req, res, next) => {
    try {
      const userId = req.auth && req.auth.user_id;
      if (!userId) return res.status(403).json({ success: false, message: 'Forbidden' });
      const [rows] = await pool.execute('SELECT role, status FROM users WHERE user_id = ?', [userId]);
      const user = rows && rows[0];
      if (!user || user.status !== 'active') return res.status(403).json({ success: false, message: 'Forbidden' });
      if (role && user.role !== role) return res.status(403).json({ success: false, message: 'Insufficient role' });
      req.user = user;
      next();
    } catch (err) {
      console.error('Role check error', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  };
}

module.exports = { authenticateJWT, requireRole, JWT_SECRET };
