const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { URL } = require('url');
const db = require('../database');

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

// Write IP to a file that frontend can read (only if running locally)
const isDev = process.env.NODE_ENV !== 'production' && !process.env.VERCEL;
if (isDev) {
  const ipConfigPath = path.join(__dirname, '..', '..', 'frontend', 'src', 'ip-config.js');
  try {
    if (fs.existsSync(path.dirname(ipConfigPath))) {
      fs.writeFileSync(ipConfigPath, `// Auto-generated - do not edit\nexport const SERVER_IP = '${LOCAL_IP}';\n`);
    }
  } catch (err) {
    console.error('Could not write IP config:', err.message);
  }
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*', // Enable CORS for Vercel
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
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

function buildOrderResponse(o) {
  if (!o) return null;
  // Handle case-insensitive column names from Postgres/Supabase
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

function nextStatus(currentStatus) {
  const kitchenFlow = ['NEW', 'PREPARING', 'READY'];
  const currentIndex = kitchenFlow.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex === kitchenFlow.length - 1) return currentStatus;
  return kitchenFlow[currentIndex + 1];
}

const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
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
    if (method === 'GET' && (pathname === '/' || pathname === '/api')) {
      return sendJson(res, 200, {
        service: 'hotel-qr-backend',
        status: 'ok',
        message: 'Cloud API running on Supabase.'
      });
    }

    if (method === 'GET' && (pathname === '/api/menu' || pathname === '/menu')) {
      const menu = await db.getMenu(true);
      return sendJson(res, 200, menu);
    }

    if (method === 'GET' && (pathname === '/api/admin/menu' || pathname === '/admin/menu')) {
      const menu = await db.getMenu(false);
      return sendJson(res, 200, menu);
    }

    if (method === 'POST' && (pathname === '/api/admin/menu' || pathname === '/admin/menu')) {
      const payload = await parseBody(req);
      const added = await db.addMenuItem(payload);
      return sendJson(res, 201, added);
    }

    const adminMenuMatch = pathname.match(/^\/(api\/admin\/menu|admin\/menu)\/([^\/]+)$/);
    if (adminMenuMatch && method === 'PUT') {
      const menuId = adminMenuMatch[2];
      const payload = await parseBody(req);
      const updated = await db.updateMenuItem(menuId, payload);
      return sendJson(res, 200, updated);
    }

    if (adminMenuMatch && method === 'DELETE') {
      const menuId = adminMenuMatch[2];
      await db.deleteMenuItem(menuId);
      return sendJson(res, 200, { ok: true });
    }

    if (method === 'GET' && (pathname === '/api/orders' || pathname === '/orders')) {
      const mode = parsedUrl.searchParams.get('mode');
      const tableId = parsedUrl.searchParams.get('tableId');
      const orders = await db.getOrders({ mode, tableId });
      return sendJson(res, 200, orders.map(buildOrderResponse));
    }

    if (method === 'POST' && (pathname === '/api/orders' || pathname === '/orders')) {
      const payload = await parseBody(req);
      const order = {
        id: `ORD-${Date.now()}`,
        tableId: payload.tableId,
        items: payload.items,
        note: payload.note || '',
        totalAmount: payload.totalAmount || 0,
        status: 'NEW',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const added = await db.addOrder(order);
      return sendJson(res, 201, buildOrderResponse(added));
    }

    const statusMatch = pathname.match(/^\/(api\/orders|orders)\/([^\/]+)\/status$/);
    if (method === 'PATCH' && statusMatch) {
      const orderId = statusMatch[2];
      const target = await db.getOrder(orderId);
      if (!target) return sendJson(res, 404, { error: 'Order not found' });

      const newStatus = nextStatus(target.status);
      const updatedAt = new Date().toISOString();
      await db.updateOrderStatus(orderId, newStatus, updatedAt);
      return sendJson(res, 200, { ...buildOrderResponse(target), status: newStatus, updatedAt: updatedAt });
    }

    if (method === 'GET' && (pathname === '/api/admin/tables' || pathname === '/admin/tables')) {
      const tables = await db.getTables();
      return sendJson(res, 200, tables);
    }

    const tableMatch = pathname.match(/^\/(api\/admin\/tables|admin\/tables)\/([^\/]+)$/);
    if (tableMatch && method === 'PUT') {
      const tableId = tableMatch[2];
      const payload = await parseBody(req);
      const updated = await db.updateTable(tableId, payload.name);
      return sendJson(res, 200, updated);
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error('API Error:', error);
    // Send a more helpful error for debugging
    return sendJson(res, 500, { error: error.message || 'Server error', details: error.details || '' });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
  });
}

module.exports = server;
