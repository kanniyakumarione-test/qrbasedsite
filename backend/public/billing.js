const app = document.getElementById('billing-app');

function statusClass(status) {
  return String(status).toLowerCase();
}

function money(v) {
  return `?${Number(v).toFixed(2)}`;
}

function itemList(items) {
  return items.map((i) => `${i.name} x${i.quantity}`).join(', ');
}

function actionLabel(status) {
  if (status === 'READY') return 'Make Bill';
  if (status === 'BILLED') return 'Completed';
  return 'Waiting Kitchen';
}

async function loadOrders() {
  const response = await fetch('/api/orders?mode=billing');
  return response.json();
}

async function updateStatus(orderId) {
  await fetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'billing' })
  });
  refresh();
}

async function renderSummary() {
  const summary = await fetch('/api/summary').then((r) => r.json());
  return `<div class="notice">Total Orders: ${summary.totalOrders} | Revenue: ${summary.revenue}</div>`;
}

async function render() {
  const orders = await loadOrders();
  const summary = await renderSummary();

  if (!orders.length) {
    app.innerHTML = `${summary}<div class="notice">No billing orders yet.</div>`;
    return;
  }

  app.innerHTML = `${summary}<div class="grid">${orders
    .map(
      (order) => `<div class="order-card">
        <h4>${order.id}</h4>
        <div class="muted">Table ${order.tableId} | ${new Date(order.createdAt).toLocaleString()}</div>
        <div style="margin:.4rem 0">${itemList(order.items)}</div>
        <div class="muted">Total: ${money(order.totalAmount)}</div>
        <div style="margin:.55rem 0"><span class="status ${statusClass(order.status)}">${order.status}</span></div>
        <button class="${order.status === 'BILLED' ? 'secondary' : ''}" ${order.status !== 'READY' ? 'disabled' : ''} data-id="${order.id}">${actionLabel(order.status)}</button>
      </div>`
    )
    .join('')}</div>`;

  app.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => updateStatus(btn.dataset.id));
  });
}

function refresh() {
  render();
}

refresh();
setInterval(refresh, 7000);
