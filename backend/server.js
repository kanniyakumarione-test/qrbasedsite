const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { URL } = require('url');
const db = require('./database');

const PORT = process.env.PORT || 3000;

// Get local network IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIP();

// Write IP to a file that frontend can read (only if running in development)
const ipConfigPath = path.join(__dirname, '..', 'frontend', 'src', 'ip-config.js');
try {
  if (fs.existsSync(path.dirname(ipConfigPath))) {
    fs.writeFileSync(ipConfigPath, `// Auto-generated - do not edit\nexport const SERVER_IP = '${LOCAL_IP}';\n`);
  }
} catch (err) {
  console.error('Could not write IP config:', err.message);
}

function ensureDataFiles() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

ensureDataFiles();

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        req.socket.destroy();
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function formatCurrency(amount) {
  return `Rs. ${Number(amount || 0).toFixed(2)}`;
}

function buildOrderResponse(order) {
  return {
    id: order.id,
    tableId: order.tableId,
    items: order.items,
    note: order.note || '',
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    totalAmount: order.totalAmount
  };
}

function calculateOrder(menu, incomingItems) {
  const menuById = new Map(menu.map((item) => [item.id, item]));
  const items = [];
  let total = 0;

  for (const line of incomingItems) {
    const quantity = Number(line.quantity || 0);
    const menuItem = menuById.get(line.itemId);

    if (!menuItem || !menuItem.available || quantity <= 0) continue;

    const lineTotal = menuItem.price * quantity;
    total += lineTotal;
    items.push({
      itemId: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity,
      lineTotal
    });
  }

  return { items, total };
}

function nextStatus(currentStatus) {
  const kitchenFlow = ['NEW', 'PREPARING', 'READY'];
  const currentIndex = kitchenFlow.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex === kitchenFlow.length - 1) return currentStatus;
  return kitchenFlow[currentIndex + 1];
}

function normalizeText(value, maxLength = 100) {
  return String(value || '').trim().slice(0, maxLength);
}

function toBoolean(value, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
}

function buildMenuItemFromPayload(payload, existing = null) {
  const name = normalizeText(payload.name, 120);
  const category = normalizeText(payload.category, 80);
  const price = Number(payload.price);
  const available = toBoolean(payload.available, existing ? existing.available : true);

  if (!name) return { error: 'name is required' };
  if (!category) return { error: 'category is required' };
  if (!Number.isFinite(price) || price < 0) return { error: 'price must be a valid positive number' };

  return {
    id: existing ? existing.id : `m${Date.now()}${Math.floor(Math.random() * 1000)}`,
    name,
    category,
    price: Number(price.toFixed(2)),
    available
  };
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  try {
    if (method === 'GET' && pathname === '/') {
      return sendJson(res, 200, {
        service: 'hotel-qr-backend',
        status: 'ok',
        message: 'Backend API running. UI is served separately by frontend app.'
      });
    }

    if (method === 'GET' && pathname === '/api/menu') {
      const menu = db.getMenu(true);
      return sendJson(res, 200, menu);
    }

    if (method === 'GET' && pathname === '/api/admin/menu') {
      const menu = db.getMenu(false);
      return sendJson(res, 200, menu);
    }

    if (method === 'POST' && pathname === '/api/admin/menu') {
      const payload = await parseBody(req);
      const built = buildMenuItemFromPayload(payload);
      if (built.error) return sendJson(res, 400, { error: built.error });

      const added = db.addMenuItem(built);
      return sendJson(res, 201, added);
    }

    const adminMenuMatch = pathname.match(/^\/api\/admin\/menu\/([^\/]+)$/);
    if (adminMenuMatch && method === 'PUT') {
      const menuId = adminMenuMatch[1];
      const payload = await parseBody(req);
      const existing = db.getMenuItem(menuId);
      if (!existing) return sendJson(res, 404, { error: 'Menu item not found' });

      const built = buildMenuItemFromPayload(payload, existing);
      if (built.error) return sendJson(res, 400, { error: built.error });

      const updated = db.updateMenuItem(menuId, built);
      return sendJson(res, 200, updated);
    }

    if (adminMenuMatch && method === 'DELETE') {
      const menuId = adminMenuMatch[1];
      const existing = db.getMenuItem(menuId);
      if (!existing) return sendJson(res, 404, { error: 'Menu item not found' });

      db.deleteMenuItem(menuId);
      return sendJson(res, 200, { ok: true });
    }

    if (method === 'GET' && pathname === '/api/orders') {
      const mode = parsedUrl.searchParams.get('mode');
      const tableId = parsedUrl.searchParams.get('tableId');
      const orders = db.getOrders({ mode, tableId });
      return sendJson(res, 200, orders.map(buildOrderResponse));
    }

    if (method === 'POST' && pathname === '/api/orders') {
      const payload = await parseBody(req);
      const tableId = String(payload.tableId || '').trim();

      if (!tableId || !Array.isArray(payload.items) || payload.items.length === 0) {
        return sendJson(res, 400, { error: 'tableId and items are required' });
      }

      const menu = db.getMenu(true);
      const computed = calculateOrder(menu, payload.items);
      if (computed.items.length === 0) return sendJson(res, 400, { error: 'No valid items in order' });

      const timestamp = new Date().toISOString();
      const order = {
        id: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tableId,
        items: computed.items,
        note: String(payload.note || '').slice(0, 300),
        totalAmount: computed.total,
        status: 'NEW',
        createdAt: timestamp,
        updatedAt: timestamp
      };

      db.addOrder(order);
      return sendJson(res, 201, buildOrderResponse(order));
    }

    const statusMatch = pathname.match(/^\/api\/orders\/([^\/]+)\/status$/);
    if (method === 'PATCH' && statusMatch) {
      const orderId = statusMatch[1];
      await parseBody(req);

      const target = db.getOrder(orderId);
      if (!target) return sendJson(res, 404, { error: 'Order not found' });

      const newStatus = nextStatus(target.status);
      const updatedAt = new Date().toISOString();
      db.updateOrderStatus(orderId, newStatus, updatedAt);

      return sendJson(res, 200, { ...buildOrderResponse(target), status: newStatus, updatedAt });
    }

    if (method === 'GET' && pathname === '/api/summary') {
      const orders = db.getOrders();
      const totals = orders.reduce(
        (acc, order) => {
          acc.totalOrders += 1;
          acc.revenue += Number(order.totalAmount || 0);
          acc.statusCount[order.status] = (acc.statusCount[order.status] || 0) + 1;
          return acc;
        },
        { totalOrders: 0, revenue: 0, statusCount: {} }
      );

      return sendJson(res, 200, {
        totalOrders: totals.totalOrders,
        revenue: formatCurrency(totals.revenue),
        statusCount: totals.statusCount
      });
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    if (error.message === 'Invalid JSON body') {
      return sendJson(res, 400, { error: error.message });
    }
    if (error.message === 'Body too large') {
      return sendJson(res, 413, { error: error.message });
    }
    return sendJson(res, 500, { error: error.message || 'Server error' });
  }
});

server.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});
