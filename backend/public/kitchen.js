const app = document.getElementById('kitchen-app');

function statusClass(status) {
  return String(status).toLowerCase();
}

async function loadOrders() {
  const response = await fetch('/api/orders?mode=kitchen');
  return response.json();
}

async function advanceStatus(orderId) {
  await fetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'kitchen' })
  });
  refresh();
}

function itemList(items) {
  return items.map((i) => `${i.name} x${i.quantity}`).join(', ');
}

function actionLabel(status) {
  if (status === 'NEW') return 'Start Preparing';
  if (status === 'PREPARING') return 'Mark Ready';
  return 'Ready';
}

function render(orders) {
  if (!orders.length) {
    app.innerHTML = '<div class="notice">No kitchen orders right now.</div>';
    return;
  }

  app.innerHTML = `<div class="grid">${orders
    .map(
      (order) => `<div class="order-card">
        <h4>${order.id}</h4>
        <div class="muted">Table ${order.tableId} | ${new Date(order.createdAt).toLocaleString()}</div>
        <div style="margin:.4rem 0">${itemList(order.items)}</div>
        ${order.note ? `<div class="muted">Note: ${order.note}</div>` : ''}
        <div style="margin:.55rem 0"><span class="status ${statusClass(order.status)}">${order.status}</span></div>
        <button ${order.status === 'READY' ? 'disabled' : ''} data-id="${order.id}">${actionLabel(order.status)}</button>
      </div>`
    )
    .join('')}</div>`;

  app.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => advanceStatus(btn.dataset.id));
  });
}

async function refresh() {
  const orders = await loadOrders();
  render(orders);
}

refresh();
setInterval(refresh, 7000);
