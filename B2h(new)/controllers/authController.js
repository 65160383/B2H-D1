const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { JWT_SECRET } = require('../middlewares/auth');

const UNIVERSITY_DOMAINS = process.env.UNIVERSITY_DOMAINS || 'go.buu.ac.th';

function isUniversityEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const parts = UNIVERSITY_DOMAINS.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const lc = email.toLowerCase();
  return parts.some(d => lc.endsWith(`@${d}`));
}

async function universityAuth(req, res) {
  const { email, name } = req.body || {};
  if (!email) return res.status(400).json({ success: false, message: 'กรุณาระบุอีเมล' });
  if (!isUniversityEmail(email)) return res.status(403).json({ success: false, message: 'ต้องใช้อีเมลของมหาวิทยาลัย (go.buu.ac.th) เท่านั้น' });
  try {
    const [rows] = await pool.execute('SELECT user_id, email, first_name, last_name, role FROM users WHERE email = ?', [email]);
    let user = rows && rows[0];
    if (!user) {
      const displayName = name || email.split('@')[0];
      const parts = displayName.split(' ');
      const firstName = parts.shift() || displayName;
      const lastName = parts.length ? parts.join(' ') : null;
      const [r] = await pool.execute('INSERT INTO users (first_name, last_name, email) VALUES (?, ?, ?)', [firstName, lastName, email]);
      const insertId = r.insertId;
      const [newRows] = await pool.execute('SELECT user_id, email, first_name, last_name, role FROM users WHERE user_id = ?', [insertId]);
      user = newRows && newRows[0];
    }
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    const token = jwt.sign({ user_id: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ success: true, token, user: { user_id: user.user_id, email: user.email, name: fullName }, message: 'เข้าสู่ระบบสำเร็จ' });
  } catch (err) {
    console.error('University auth error', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์' });
  }
}

async function register(req, res) {
  const { email, password, first_name, last_name } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
  if (!isUniversityEmail(email)) return res.status(403).json({ success: false, message: 'ต้องใช้อีเมลของมหาวิทยาลัย (go.buu.ac.th) เท่านั้น' });
  try {
    const [rows] = await pool.execute('SELECT user_id FROM users WHERE email = ?', [email]);
    if (rows && rows[0]) return res.status(400).json({ success: false, message: 'อีเมลนี้มีบัญชีอยู่แล้ว' });
    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.execute('INSERT INTO users (email, password, first_name, last_name) VALUES (?, ?, ?, ?)', [email, hash, first_name || null, last_name || null]);
    res.json({ success: true, user_id: r.insertId, message: 'เพิ่มผู้ใช้สำเร็จ' });
  } catch (err) {
    console.error('Register error', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์' });
  }
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
  try {
    const [rows] = await pool.execute('SELECT user_id, email, first_name, last_name, password FROM users WHERE email = ?', [email]);
    const user = rows && rows[0];
    if (!user || !user.password) return res.status(401).json({ success: false, message: 'ไม่พบบัญชีหรือยังไม่ได้ตั้งรหัสผ่าน' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    const token = jwt.sign({ user_id: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ success: true, token, user: { user_id: user.user_id, email: user.email, name: fullName }, message: 'เข้าสู่ระบบสำเร็จ' });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์' });
  }
}

async function me(req, res) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.json({ loggedIn: false });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.execute(
      'SELECT user_id, first_name, last_name, email, role, avatar_url AS profile_image, contact_facebook, contact_line, contact_instagram FROM users WHERE user_id = ?',
      [payload.user_id]
    );
    const user = rows && rows[0];
    if (!user) return res.json({ loggedIn: false });
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    user.name = fullName;
    return res.json({ loggedIn: true, user });
  } catch (err) {
    return res.json({ loggedIn: false });
  }
}

async function updateMe(req, res) {
  const userId = req.auth && req.auth.user_id;
  if (!userId) return res.status(401).json({ success: false, message: 'ไม่พบผู้ใช้' });
  const { name, profile_image, contact_facebook, contact_line, contact_instagram } = req.body || {};
  let firstName = null;
  let lastName = null;
  if (name && typeof name === 'string') {
    const parts = name.trim().split(/\s+/);
    firstName = parts.shift() || null;
    lastName = parts.length ? parts.join(' ') : null;
  }
  try {
    await pool.execute(
      'UPDATE users SET first_name = ?, last_name = ?, avatar_url = ?, contact_facebook = ?, contact_line = ?, contact_instagram = ? WHERE user_id = ?',
      [firstName, lastName, profile_image || null, contact_facebook || null, contact_line || null, contact_instagram || null, userId]
    );
    const [rows] = await pool.execute(
      'SELECT user_id, first_name, last_name, email, role, avatar_url AS profile_image, contact_facebook, contact_line, contact_instagram FROM users WHERE user_id = ?',
      [userId]
    );
    const user = rows && rows[0];
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    user.name = fullName;
    res.json({ success: true, user });
  } catch (err) {
    console.error('Update profile error', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์' });
  }
}

async function uploadAvatar(req, res) {
  const userId = req.auth && req.auth.user_id;
  if (!userId) return res.status(401).json({ success: false, message: 'ไม่พบผู้ใช้' });
  if (!req.file) return res.status(400).json({ success: false, message: 'กรุณาเลือกรูปโปรไฟล์' });
  const url = `/uploads/${req.file.filename}`;
  try {
    await pool.execute('UPDATE users SET avatar_url = ? WHERE user_id = ?', [url, userId]);
    const [rows] = await pool.execute(
      'SELECT user_id, first_name, last_name, email, role, avatar_url AS profile_image, contact_facebook, contact_line, contact_instagram FROM users WHERE user_id = ?',
      [userId]
    );
    const user = rows && rows[0];
    if (!user) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    user.name = fullName;
    res.json({ success: true, user });
  } catch (err) {
    console.error('Upload avatar error', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์' });
  }
}

function logout(req, res) {
  res.json({ success: true });
}

module.exports = {
  universityAuth,
  register,
  login,
  me,
  updateMe,
  uploadAvatar,
  logout,
};
