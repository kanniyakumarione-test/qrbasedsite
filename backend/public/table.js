const tableRoot = document.getElementById('table-app');
const tableId = tableRoot?.dataset?.tableId;

function currency(v) {
  return `?${Number(v).toFixed(2)}`;
}

async function loadMenu() {
  const response = await fetch('/api/menu');
  return response.json();
}

function renderMenu(menu) {
  const byCategory = menu.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  let html = '<div class="notice">Select quantity and click Place Order.</div><div class="grid">';

  for (const [category, items] of Object.entries(byCategory)) {
    html += `<div class="menu-item"><h4>${category}</h4>`;
    for (const item of items) {
      html += `<div style="display:flex;justify-content:space-between;align-items:center;margin:.45rem 0;gap:.4rem;">
        <div>
          <div>${item.name}</div>
          <div class="muted">${currency(item.price)}</div>
        </div>
        <input type="number" min="0" max="20" value="0" data-item-id="${item.id}" style="width:68px" />
      </div>`;
    }
    html += '</div>';
  }

  html += '</div>';
  html += `<div class="actions">
    <textarea id="order-note" rows="2" placeholder="Special note (optional)"></textarea>
    <button id="place-order">Place Order</button>
  </div>
  <div id="order-result" class="notice" style="display:none"></div>`;

  tableRoot.innerHTML = html;

  document.getElementById('place-order').addEventListener('click', () => submitOrder(menu));
}

async function submitOrder() {
  const qtyInputs = Array.from(tableRoot.querySelectorAll('input[data-item-id]'));
  const items = qtyInputs
    .map((input) => ({ itemId: input.dataset.itemId, quantity: Number(input.value) }))
    .filter((x) => x.quantity > 0);

  if (!items.length) {
    alert('Please select at least one item.');
    return;
  }

  const payload = {
    tableId,
    items,
    note: document.getElementById('order-note').value || ''
  };

  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  const box = document.getElementById('order-result');

  if (!response.ok) {
    box.style.display = 'block';
    box.textContent = result.error || 'Could not place order';
    return;
  }

  qtyInputs.forEach((i) => (i.value = 0));
  document.getElementById('order-note').value = '';
  box.style.display = 'block';
  box.textContent = `Order placed: ${result.id}. Total ${currency(result.totalAmount)}. Kitchen will prepare shortly.`;
}

(async function init() {
  if (!tableRoot || !tableId) return;
  const menu = await loadMenu();
  renderMenu(menu);
})();
