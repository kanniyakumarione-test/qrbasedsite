const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'prabhu.db');
const db = new Database(DB_PATH);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS menu (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    available INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    tableId TEXT NOT NULL,
    items TEXT NOT NULL,
    note TEXT,
    totalAmount REAL NOT NULL,
    status TEXT DEFAULT 'NEW',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);

// Seed initial menu if empty
const existingMenu = db.prepare('SELECT COUNT(*) as count FROM menu').get();
if (existingMenu.count === 0) {
  const seedMenu = [
    { id: 'm1', name: 'Paneer Butter Masala', category: 'Main Course', price: 220, available: true },
    { id: 'm2', name: 'Veg Biryani', category: 'Main Course', price: 180, available: true },
    { id: 'm3', name: 'Butter Naan', category: 'Breads', price: 40, available: true },
    { id: 'm4', name: 'Masala Dosa', category: 'South Indian', price: 110, available: true },
    { id: 'm5', name: 'Gulab Jamun', category: 'Dessert', price: 70, available: true },
    { id: 'm6', name: 'Fresh Lime Soda', category: 'Beverages', price: 60, available: true }
  ];
  const stmt = db.prepare('INSERT INTO menu (id, name, category, price, available) VALUES (?, ?, ?, ?, ?)');
  seedMenu.forEach(item => stmt.run(item.id, item.name, item.category, item.price, item.available ? 1 : 0));
}

// Menu operations
function getMenu(onlyAvailable = true) {
  if (onlyAvailable) {
    return db.prepare('SELECT * FROM menu WHERE available = 1').all();
  }
  return db.prepare('SELECT * FROM menu').all();
}

function getMenuItem(id) {
  return db.prepare('SELECT * FROM menu WHERE id = ?').get(id);
}

function addMenuItem(item) {
  const stmt = db.prepare('INSERT INTO menu (id, name, category, price, available) VALUES (?, ?, ?, ?, ?)');
  stmt.run(item.id, item.name, item.category, item.price, item.available ? 1 : 0);
  return item;
}

function updateMenuItem(id, item) {
  const stmt = db.prepare('UPDATE menu SET name = ?, category = ?, price = ?, available = ? WHERE id = ?');
  stmt.run(item.name, item.category, item.price, item.available ? 1 : 0, id);
  return { ...item, id };
}

function deleteMenuItem(id) {
  db.prepare('DELETE FROM menu WHERE id = ?').run(id);
}

// Order operations
function getOrders(filters = {}) {
  let sql = 'SELECT * FROM orders';
  const params = [];
  const conditions = [];

  if (filters.tableId) {
    conditions.push('tableId = ?');
    params.push(filters.tableId);
  }

  if (filters.mode === 'kitchen') {
    conditions.push("status IN ('NEW', 'PREPARING', 'READY')");
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY createdAt DESC';

  const rows = db.prepare(sql).all(...params);
  return rows.map(row => ({
    ...row,
    items: JSON.parse(row.items),
    available: row.available === 1
  }));
}

function getOrder(id) {
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!row) return null;
  return {
    ...row,
    items: JSON.parse(row.items),
    available: row.available === 1
  };
}

function addOrder(order) {
  const stmt = db.prepare(`
    INSERT INTO orders (id, tableId, items, note, totalAmount, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    order.id,
    order.tableId,
    JSON.stringify(order.items),
    order.note || '',
    order.totalAmount,
    order.status,
    order.createdAt,
    order.updatedAt
  );
  return order;
}

function updateOrderStatus(id, status, updatedAt) {
  const stmt = db.prepare('UPDATE orders SET status = ?, updatedAt = ? WHERE id = ?');
  stmt.run(status, updatedAt, id);
}

module.exports = {
  db,
  getMenu,
  getMenuItem,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getOrders,
  getOrder,
  addOrder,
  updateOrderStatus
};