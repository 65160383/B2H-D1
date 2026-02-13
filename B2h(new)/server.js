const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Middlewares
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Frontend pages
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});
app.get('/seller/:id', (req, res) => {
  const id = req.params.id;
  return res.redirect(`/seller.html?seller_id=${encodeURIComponent(id)}`);
});
app.get('/seller', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'seller.html'));
});

// Routes (MVC)
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
app.use('/', authRoutes);
app.use('/', productRoutes);

// Diagnostics
app.get('/_health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.get('/_routes', (req, res) => {
  try {
    const routes = [];
    if (app && app._router && Array.isArray(app._router.stack)) {
      app._router.stack.forEach((layer) => {
        if (layer.route && layer.route.path) {
          routes.push({ path: layer.route.path, methods: Object.keys(layer.route.methods) });
        }
      });
    }
    res.json({ success: true, routes });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Unable to enumerate routes' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
