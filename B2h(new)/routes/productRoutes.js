const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticateJWT } = require('../middlewares/auth');
const ctrl = require('../controllers/productController');

// Upload storage for product images
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

// Keep original endpoint paths
router.get('/products', ctrl.listProducts);
router.get('/product/:id', ctrl.getProduct);
router.post('/product', authenticateJWT, upload.array('images', 5), ctrl.createProduct);
router.put('/product/:id', authenticateJWT, upload.array('images', 5), ctrl.updateProduct);
router.delete('/product/:id', authenticateJWT, ctrl.deleteProduct);

module.exports = router;
