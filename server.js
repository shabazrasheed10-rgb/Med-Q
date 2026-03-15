const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // serves your front-end

// ==============================
// VERIFY ACTIVATION CODE
// ==============================
app.post('/api/activate', (req, res) => {
  const { code, deviceId } = req.body;

  // Check if code and deviceId are provided
  if (!code || !deviceId) {
    return res.json({ success: false, message: "Missing code or device ID." });
  }

  // Find the code in database
  const record = db.prepare(`SELECT * FROM codes WHERE code = ?`).get(code);

  // Code doesn't exist
  if (!record) {
    return res.json({ success: false, message: "Invalid activation code." });
  }

  // Check if expired
  if (record.expires_at && new Date() > new Date(record.expires_at)) {
    return res.json({ success: false, message: "This code has expired." });
  }

  // Code already used by a DIFFERENT device
  if (record.is_used && record.used_by_device !== deviceId) {
    return res.json({ success: false, message: "This code is already used on another device." });
  }

  // Code already used by THE SAME device — let them in again
  if (record.is_used && record.used_by_device === deviceId) {
    return res.json({ success: true, message: "Welcome back!" });
  }

  // ✅ Fresh code — activate it!
  db.prepare(`
    UPDATE codes 
    SET is_used = 1, used_by_device = ?, used_at = datetime('now')
    WHERE code = ?
  `).run(deviceId, code);

  return res.json({ success: true, message: "Activated successfully! Welcome 🎉" });
});

// ==============================
// CHECK IF DEVICE IS ALREADY ACTIVATED
// ==============================
app.post('/api/check-device', (req, res) => {
  const { deviceId } = req.body;

  if (!deviceId) {
    return res.json({ activated: false });
  }

  const record = db.prepare(`
    SELECT * FROM codes WHERE used_by_device = ? AND is_used = 1
  `).get(deviceId);

  if (record) {
    return res.json({ activated: true });
  }

  return res.json({ activated: false });
});

// ==============================
// ADMIN — SEE ALL CODES (protect this later!)
// ==============================
app.get('/admin/codes', (req, res) => {
  const codes = db.prepare(`SELECT * FROM codes`).all();
  res.json(codes);
});

// ==============================
// ADMIN — ADD A NEW CODE
// ==============================
app.post('/admin/add-code', (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.json({ success: false, message: "No code provided." });
  }

  try {
    db.prepare(`INSERT INTO codes (code) VALUES (?)`).run(code);
    return res.json({ success: true, message: `Code "${code}" added!` });
  } catch (e) {
    return res.json({ success: false, message: "Code already exists." });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Med-Q server running on http://localhost:${PORT}`);
});