const path = require('path');
const fs = require('fs');
const { pool } = require('../config/db');

async function listProducts(req, res) {
  try {
    const [rows] = await pool.execute(
      'SELECT p.*, p.img_url AS img_url FROM product p ORDER BY p.create_time DESC LIMIT 100'
    );
    res.json({ success: true, products: rows });
  } catch (err) {
    console.error('Products error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function getProduct(req, res) {
  const id = req.params.id;
  try {
    const [rows] = await pool.execute(
      'SELECT p.*, u.email AS seller_email, u.first_name, u.last_name FROM product p JOIN users u ON p.seller_id = u.user_id WHERE p.product_id = ?',
      [id]
    );
    const product = rows && rows[0];
    if (!product) return res.status(404).json({ success: false, message: 'Not found' });
    const images = [];
    if (product.img_url) images.push(product.img_url);
    product.images = images;
    const sellerName = [product.first_name, product.last_name].filter(Boolean).join(' ');
    product.seller_name = sellerName || product.seller_email || null;
    res.json({ success: true, product });
  } catch (err) {
    console.error('Product detail error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function createProduct(req, res) {
  const { title, description, price, contact, category } = req.body || {};
  if (!title || !price) return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อสินค้าและราคา' });
  const userId = req.auth && req.auth.user_id;
  if (!userId) return res.status(401).json({ success: false, message: 'ไม่พบผู้ใช้' });
  const priceNum = Number(price);
  if (Number.isNaN(priceNum) || priceNum < 0) return res.status(400).json({ success: false, message: 'กรุณากรอกราคาให้ถูกต้อง' });
  try {
    const [r] = await pool.execute(
      'INSERT INTO product (seller_id, title, description, price, contact, category) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, title, description || null, priceNum, contact || null, category || null]
    );
    const productId = r.insertId;
    const files = req.files || [];
    const imageUrls = [];
    for (const file of files) {
      const url = `/uploads/${file.filename}`;
      imageUrls.push(url);
    }
    if (imageUrls.length) {
      try { await pool.execute('UPDATE product SET img_url = ? WHERE product_id = ?', [imageUrls[0], productId]); } catch (e) { /* ignore */ }
    }
    res.json({ success: true, product_id: productId, images: imageUrls });
  } catch (err) {
    console.error('Create product error', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์' });
  }
}

async function updateProduct(req, res) {
  const id = req.params.id;
  const userId = req.auth && req.auth.user_id;
  if (!userId) return res.status(401).json({ success: false, message: 'ไม่พบผู้ใช้' });
  const { title, description, price, contact, category } = req.body || {};
  try {
    const [rows] = await pool.execute('SELECT seller_id FROM product WHERE product_id = ?', [id]);
    const prod = rows && rows[0];
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });
    if (Number(prod.seller_id) !== Number(userId)) return res.status(403).json({ success: false, message: 'Forbidden' });
    let priceNum = null;
    if (price !== undefined && price !== null && price !== '') {
      priceNum = Number(price);
      if (Number.isNaN(priceNum) || priceNum < 0) return res.status(400).json({ success: false, message: 'กรุณากรอกราคาให้ถูกต้อง' });
    }
    await pool.execute(
      'UPDATE product SET title = ?, description = ?, price = ?, contact = ?, category = ? WHERE product_id = ?',
      [title || null, description || null, priceNum, contact || null, category || null, id]
    );
    const files = req.files || [];
    const imageUrls = [];
    for (const file of files) {
      const url = `/uploads/${file.filename}`;
      imageUrls.push(url);
    }
    if (imageUrls.length) {
      try { await pool.execute('UPDATE product SET img_url = ? WHERE product_id = ?', [imageUrls[0], id]); } catch (e) { /* ignore */ }
    }
    res.json({ success: true, product_id: id, images: imageUrls });
  } catch (err) {
    console.error('Update product error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function deleteProduct(req, res) {
  const id = req.params.id;
  const userId = req.auth && req.auth.user_id;
  if (!userId) return res.status(401).json({ success: false, message: 'ไม่พบผู้ใช้' });
  try {
    const [rows] = await pool.execute('SELECT seller_id, img_url FROM product WHERE product_id = ?', [id]);
    const prod = rows && rows[0];
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });
    if (Number(prod.seller_id) !== Number(userId)) return res.status(403).json({ success: false, message: 'Forbidden' });
    try {
      if (prod.img_url && typeof prod.img_url === 'string' && prod.img_url.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '..', 'public', prod.img_url.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (e) { /* ignore */ }
    await pool.execute('DELETE FROM product WHERE product_id = ?', [id]);
    try { await pool.execute('DELETE FROM product_images WHERE product_id = ?', [id]); } catch (e) { /* ignore */ }
    res.json({ success: true, deleted: true });
  } catch (err) {
    console.error('Delete product error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
