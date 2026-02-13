const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticateJWT } = require('../middlewares/auth');
const ctrl = require('../controllers/authController');

// Upload storage for avatars
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

const router = express.Router();

// Keep original paths for compatibility
router.post('/auth/university', ctrl.universityAuth);
router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/me', ctrl.me);
router.put('/me', authenticateJWT, ctrl.updateMe);
router.post('/me/avatar', authenticateJWT, upload.single('avatar'), ctrl.uploadAvatar);
router.post('/logout', ctrl.logout);

module.exports = router;
