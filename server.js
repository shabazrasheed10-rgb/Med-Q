const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================
// ADMIN PASSWORD — CHANGE THIS!
// ==============================
const ADMIN_PASSWORD = "shabaz-admin-2026";

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ==============================
// VERIFY ACTIVATION CODE
// ==============================
app.post('/api/activate', (req, res) => {
  const { code, deviceId } = req.body;

  if (!code || !deviceId) {
    return res.json({ success: false, message: "Missing code or device ID." });
  }

  const record = db.prepare(`SELECT * FROM codes WHERE code = ?`).get(code);

  if (!record) {
    return res.json({ success: false, message: "Invalid activation code." });
  }

  if (record.expires_at && new Date() > new Date(record.expires_at)) {
    return res.json({ success: false, message: "This code has expired." });
  }

  if (record.is_used && record.used_by_device !== deviceId) {
    return res.json({ success: false, message: "This code is already used on another device." });
  }

  if (record.is_used && record.used_by_device === deviceId) {
    return res.json({ success: true, message: "Welcome back!" });
  }

  db.prepare(`
    UPDATE codes 
    SET is_used = 1, used_by_device = ?, used_at = datetime('now')
    WHERE code = ?
  `).run(deviceId, code);

  return res.json({ success: true, message: "Activated successfully! Welcome 🎉" });
});

// ==============================
// CHECK IF DEVICE IS ACTIVATED
// ==============================
app.post('/api/check-device', (req, res) => {
  const { deviceId } = req.body;

  if (!deviceId) return res.json({ activated: false });

  const record = db.prepare(`
    SELECT * FROM codes WHERE used_by_device = ? AND is_used = 1
  `).get(deviceId);

  return res.json({ activated: !!record });
});

// ==============================
// ADMIN — CHECK PASSWORD
// ==============================
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true });
  }
  return res.json({ success: false, message: "Wrong password!" });
});

// ==============================
// ADMIN — GET ALL CODES
// ==============================
app.post('/api/admin/codes', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  const codes = db.prepare(`SELECT * FROM codes ORDER BY created_at DESC`).all();
  return res.json({ success: true, codes });
});

// ==============================
// ADMIN — ADD NEW CODE
// ==============================
app.post('/api/admin/add-code', (req, res) => {
  const { password, code } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  if (!code) return res.json({ success: false, message: "No code provided." });

  try {
    db.prepare(`INSERT INTO codes (code) VALUES (?)`).run(code);
    return res.json({ success: true, message: `Code "${code}" added!` });
  } catch (e) {
    return res.json({ success: false, message: "Code already exists." });
  }
});

// ==============================
// ADMIN — DELETE CODE
// ==============================
app.post('/api/admin/delete-code', (req, res) => {
  const { password, code } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  db.prepare(`DELETE FROM codes WHERE code = ?`).run(code);
  return res.json({ success: true, message: `Code "${code}" deleted!` });
});

// ==============================
// ADMIN — RESET CODE (unuse it)
// ==============================
app.post('/api/admin/reset-code', (req, res) => {
  const { password, code } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  db.prepare(`
    UPDATE codes SET is_used = 0, used_by_device = NULL, used_at = NULL WHERE code = ?
  `).run(code);
  return res.json({ success: true, message: `Code "${code}" has been reset!` });
});

app.listen(PORT, () => {
  console.log(`🚀 Med-Q server running on port ${PORT}`);
});
