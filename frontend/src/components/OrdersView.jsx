import { useEffect, useState } from 'react';
import Card from './Card';
import { money, statusStyle } from '../lib/format';
import { API_BASE_URL } from '../api-config';

export default function OrdersView({ title, mode, buttonText, disabledStatusCheck }) {
  const [orders, setOrders] = useState([]);

  async function fetchData() {
    const ordersRes = await fetch(`${API_BASE_URL}/api/orders?mode=${mode}`).then((r) => r.json());
    setOrders(ordersRes);
  }

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 7000);
    return () => clearInterval(timer);
  }, [mode]);

  async function advance(id) {
    await fetch(`${API_BASE_URL}/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    fetchData();
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{title}</h2>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">Auto refresh: 7s</span>
      </div>

      {!orders.length ? <p className="mt-4 rounded-xl bg-white px-3 py-2 text-sm text-slate-600">No orders right now.</p> : null}

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
            <p className="mt-3 break-words text-sm text-slate-700">{order.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}</p>
            <p className="mt-2 text-sm font-semibold text-slate-700">Table Total: {money(order.totalAmount)}</p>
            {order.note ? <p className="mt-1 text-xs text-slate-500">Note: {order.note}</p> : null}

            <button
              onClick={() => advance(order.id)}
              disabled={disabledStatusCheck(order.status)}
              className="btn-accent mt-4 w-full disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {buttonText(order.status)}
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
