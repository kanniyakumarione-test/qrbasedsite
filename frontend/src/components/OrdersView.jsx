import { useEffect, useState } from 'react';
import Card from './Card';
import { money, statusStyle } from '../lib/format';
import { API_BASE_URL } from '../api-config';

export default function OrdersView({ title, mode, buttonText, disabledStatusCheck }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  async function fetchData() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders?mode=${mode}`);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      setOrders(data);
      setError('');
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Could not connect to backend. Checking again in 7s...');
    }
  }

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 7000);
    return () => clearInterval(timer);
  }, [mode]);

  async function advance(id) {
    try {
      await fetch(`${API_BASE_URL}/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      fetchData();
    } catch (err) {
      alert('Failed to update status. Check your connection.');
    }
  }

  async function removeOrder(id) {
    const ok = window.confirm('Remove this order from the kitchen view?');
    if (!ok) return;
    try {
      await fetch(`${API_BASE_URL}/api/orders/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      alert('Failed to remove order.');
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex items-center gap-2">
          {error ? <span className="text-xs font-bold text-rose-600 animate-pulse">{error}</span> : null}
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">Auto refresh: 7s</span>
        </div>
      </div>

      {!orders.length && !error ? (
        <p className="mt-4 rounded-xl bg-white px-3 py-2 text-sm text-slate-600">No orders right now.</p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {orders.map((order) => (
          <div key={order.id} className="rounded-2xl border border-white/80 bg-white p-4 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="break-all text-sm font-extrabold text-slate-800">{order.id}</p>
              <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${statusStyle(order.status)}`}>
                {order.status}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-500">Table {order.tableId}</p>
            <p className="mt-3 break-words text-sm text-slate-700">
              {Array.isArray(order.items) ? order.items.map((i) => `${i.name} x${i.quantity}`).join(', ') : 'No items'}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-700">Total: {money(order.totalAmount)}</p>
            {order.note ? <p className="mt-1 text-xs text-slate-500">Note: {order.note}</p> : null}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => advance(order.id)}
                disabled={disabledStatusCheck(order.status)}
                className="btn-accent flex-1 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {buttonText(order.status)}
              </button>
              {/* Show Remove button for READY orders */}
              {order.status === 'READY' && (
                <button
                  onClick={() => removeOrder(order.id)}
                  className="rounded-xl bg-rose-100 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-200 transition-colors"
                  title="Remove order"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
