const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { URL } = require('url');
const db = require('../database');

const PORT = process.env.PORT || 3000;

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

const isDev = process.env.NODE_ENV !== 'production' && !process.env.VERCEL;
if (isDev) {
  const LOCAL_IP = getLocalIP();
  const ipConfigPath = path.join(__dirname, '..', '..', 'frontend', 'src', 'ip-config.js');
  try {
    if (fs.existsSync(path.dirname(ipConfigPath))) {
      fs.writeFileSync(ipConfigPath, `// Auto-generated\nexport const SERVER_IP = '${LOCAL_IP}';\n`);
    }
  } catch (err) { /* ignore */ }
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function buildOrderResponse(o) {
  if (!o) return null;
  return {
    id: o.id,
    tableId: o.tableId || o.tableid || '?',
    items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []),
    note: o.note || '',
    status: o.status || 'NEW',
    createdAt: o.createdAt || o.createdat || new Date().toISOString(),
    updatedAt: o.updatedAt || o.updatedat || new Date().toISOString(),
    totalAmount: o.totalAmount || o.totalamount || 0
  };
}

function nextStatus(current) {
  const flow = ['NEW', 'PREPARING', 'READY'];
  const idx = flow.indexOf(current);
  if (idx === -1 || idx === flow.length - 1) return current;
  return flow[idx + 1];
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  try {
    // Health check
    if (method === 'GET' && (pathname === '/' || pathname === '/api')) {
      return sendJson(res, 200, { service: 'hotel-qr-backend', status: 'ok' });
    }

    // ── Menu (customer) ───────────────────────────────────────────────────────
    if (method === 'GET' && (pathname === '/api/menu' || pathname === '/menu')) {
      return sendJson(res, 200, await db.getMenu(true));
    }

    // ── Menu (admin) ──────────────────────────────────────────────────────────
    if (method === 'GET' && (pathname === '/api/admin/menu' || pathname === '/admin/menu')) {
      return sendJson(res, 200, await db.getMenu(false));
    }
    if (method === 'POST' && (pathname === '/api/admin/menu' || pathname === '/admin/menu')) {
      return sendJson(res, 201, await db.addMenuItem(await parseBody(req)));
    }

    const adminMenuMatch = pathname.match(/^\/(api\/admin\/menu|admin\/menu)\/([^\/]+)$/);
    if (adminMenuMatch) {
      const id = adminMenuMatch[2];
      if (method === 'PUT') return sendJson(res, 200, await db.updateMenuItem(id, await parseBody(req)));
      if (method === 'DELETE') { await db.deleteMenuItem(id); return sendJson(res, 200, { ok: true }); }
    }

    // ── Orders ────────────────────────────────────────────────────────────────
    if (method === 'GET' && (pathname === '/api/orders' || pathname === '/orders')) {
      const mode = parsedUrl.searchParams.get('mode');
      const tableId = parsedUrl.searchParams.get('tableId');
      const orders = await db.getOrders({ mode, tableId });
      return sendJson(res, 200, orders.map(buildOrderResponse));
    }

    if (method === 'POST' && (pathname === '/api/orders' || pathname === '/orders')) {
      const payload = await parseBody(req);
      
      // 🔒 PIN Verification
      const serverPin = await db.getSetting('daily_pin');
      if (serverPin && serverPin !== payload.pin) {
        return sendJson(res, 403, { error: 'Invalid Security PIN. Please check the PIN at the hotel.' });
      }

      const now = new Date().toISOString();
      const order = {
        id: `ORD-${Date.now()}`,
        tableid: payload.tableId,
        items: payload.items,
        note: payload.note || '',
        totalamount: payload.totalAmount || 0,
        status: 'NEW',
        createdat: now,
        updatedat: now
      };
      return sendJson(res, 201, buildOrderResponse(await db.addOrder(order)));
    }

    // DELETE a specific order (kitchen "Remove" button)
    const orderIdMatch = pathname.match(/^\/(api\/orders|orders)\/([^\/]+)$/);
    if (orderIdMatch && method === 'DELETE') {
      await db.deleteOrder(orderIdMatch[2]);
      return sendJson(res, 200, { ok: true });
    }

    // PATCH order status
    const statusMatch = pathname.match(/^\/(api\/orders|orders)\/([^\/]+)\/status$/);
    if (statusMatch && method === 'PATCH') {
      const orderId = statusMatch[2];
      const target = await db.getOrder(orderId);
      if (!target) return sendJson(res, 404, { error: 'Order not found' });
      const newStatus = nextStatus(target.status);
      const now = new Date().toISOString();
      await db.updateOrderStatus(orderId, newStatus, now);
      return sendJson(res, 200, { ...buildOrderResponse(target), status: newStatus });
    }

    // ── Tables ────────────────────────────────────────────────────────────────
    if (method === 'GET' && (pathname === '/api/admin/tables' || pathname === '/admin/tables')) {
      return sendJson(res, 200, await db.getTables());
    }

    const tableMatch = pathname.match(/^\/(api\/admin\/tables|admin\/tables)\/([^\/]+)$/);
    if (tableMatch && method === 'PUT') {
      const payload = await parseBody(req);
      return sendJson(res, 200, await db.updateTable(tableMatch[2], payload.name));
    }

    // ── Settings (Admin) ──────────────────────────────────────────────────────
    if (method === 'GET' && pathname === '/api/admin/settings/daily_pin') {
      const pin = await db.getSetting('daily_pin');
      return sendJson(res, 200, { value: pin || '' });
    }
    if (method === 'POST' && pathname === '/api/admin/settings/daily_pin') {
      const payload = await parseBody(req);
      await db.updateSetting('daily_pin', payload.value);
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 404, { error: 'Not found' });

  } catch (error) {
    console.error('API Error:', error);
    return sendJson(res, 500, { error: error.message || 'Server error' });
  }
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));
}

module.exports = server;
