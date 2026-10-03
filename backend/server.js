const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

// Initialize Database
const dbPath = path.resolve(__dirname, 'nexabot.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Create tables if they do not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(32) DEFAULT 'client',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(64) PRIMARY KEY,
      client_id VARCHAR(64) NOT NULL,
      bot_type VARCHAR(128) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL DEFAULT 899.00,
      payment_method VARCHAR(32) NOT NULL,
      status VARCHAR(32) DEFAULT 'pending',
      invoice_sent BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// --- API ROUTES ---

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', agency: 'NexaBot Ltd.' });
});

// Create New Order
app.post('/api/orders', (req, res) => {
  const { id, clientId, botType, amount, paymentMethod } = req.body;
  const sql = `INSERT INTO orders (id, client_id, bot_type, amount, payment_method, status) VALUES (?, ?, ?, ?, ?, 'pending')`;
  
  db.run(sql, [id, clientId, botType, amount || 899.00, paymentMethod], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, orderId: id });
  });
});

// Fetch Client Orders
app.get('/api/client/orders/:clientId', (req, res) => {
  db.all(`SELECT * FROM orders WHERE client_id = ? ORDER BY created_at DESC`, [req.params.clientId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Fetch All Orders (Admin)
app.get('/api/admin/orders', (req, res) => {
  db.all(`SELECT * FROM orders ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Update Order Status (Admin)
app.patch('/api/admin/orders/:orderId', (req, res) => {
  const { status } = req.body;
  db.run(`UPDATE orders SET status = ? WHERE id = ?`, [status, req.params.orderId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, updated: this.changes });
  });
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
