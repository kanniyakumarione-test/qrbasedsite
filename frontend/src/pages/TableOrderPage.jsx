import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Card from '../components/Card';
import { money } from '../lib/format';
import { API_BASE_URL } from '../api-config';

export default function TableOrderPage() {
  const { tableId } = useParams();
  const [menu, setMenu] = useState([]);
  const [qty, setQty] = useState({});
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [orders, setOrders] = useState([]);
  const [readyNotice, setReadyNotice] = useState('');
  const notifiedReadyIdsRef = useRef(new Set());

  function statusClass(status) {
    const map = {
      NEW: 'bg-rose-100 text-rose-700 border border-rose-200',
      PREPARING: 'bg-amber-100 text-amber-700 border border-amber-200',
      READY: 'bg-emerald-100 text-emerald-700 border border-emerald-200'
    };
    return map[status] || 'bg-slate-100 text-slate-700 border border-slate-200';
  }

  function persistNotifiedIds() {
    const key = `readyNotified:${tableId}`;
    localStorage.setItem(key, JSON.stringify(Array.from(notifiedReadyIdsRef.current)));
  }

  async function sendReadyNotification(orderId) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(`Table ${tableId}: Order Ready`, {
        body: `Order ${orderId} is ready. Please collect from service staff.`
      });
      return;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(`Table ${tableId}: Order Ready`, {
          body: `Order ${orderId} is ready. Please collect from service staff.`
        });
      }
    }
  }

  async function loadTableOrders() {
    const response = await fetch(`${API_BASE_URL}/api/orders?tableId=${encodeURIComponent(tableId)}`);
    const data = await response.json();
    setOrders(data);

    const newlyReady = data.filter((order) => order.status === 'READY' && !notifiedReadyIdsRef.current.has(order.id));
    if (!newlyReady.length) return;

    newlyReady.forEach((order) => notifiedReadyIdsRef.current.add(order.id));
    persistNotifiedIds();

    const latestReady = newlyReady[0];
    setReadyNotice(`Order ${latestReady.id} is READY. Please contact service staff.`);
    sendReadyNotification(latestReady.id);
  }

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/menu`)
      .then((r) => r.json())
      .then((data) => {
        setMenu(data);
        const initial = {};
        data.forEach((item) => {
          initial[item.id] = 0;
        });
        setQty(initial);
      });

    const key = `readyNotified:${tableId}`;
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      notifiedReadyIdsRef.current = new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      notifiedReadyIdsRef.current = new Set();
    }

    loadTableOrders();
    const timer = setInterval(loadTableOrders, 5000);
    return () => clearInterval(timer);
  }, []);

  const grouped = useMemo(() => {
    return menu.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [menu]);

  async function placeOrder() {
    const items = Object.entries(qty)
      .map(([itemId, quantity]) => ({ itemId, quantity: Number(quantity) }))
      .filter((x) => x.quantity > 0);

    if (!items.length) {
      setMsg('Select at least one item.');
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId, items, note })
    });

    const data = await response.json();
    if (!response.ok) {
      setMsg(data.error || 'Order failed');
      return;
    }

    setMsg(`Order placed: ${data.id}, total ${money(data.totalAmount)}`);
    setQty(Object.fromEntries(Object.keys(qty).map((key) => [key, 0])));
    setNote('');
    loadTableOrders();
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">Table {tableId}</h2>
        <span className="rounded-full bg-hotel-dusk px-3 py-1 text-xs font-semibold text-white">Live Menu</span>
      </div>
      <p className="mt-1 text-sm text-slate-600">Select items and place your order directly to kitchen.</p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="rounded-2xl border border-white/80 bg-white p-4 shadow-soft">
            <h3 className="text-base font-bold">{category}</h3>
            <div className="mt-3 space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">{money(item.price)}</p>
                  </div>
                  <input
                    className="input-base w-16 py-1"
                    type="number"
                    min={0}
                    max={20}
                    value={qty[item.id] ?? 0}
                    onChange={(e) => setQty((prev) => ({ ...prev, [item.id]: Number(e.target.value || 0) }))}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Special notes (optional)"
          className="input-base min-h-[88px]"
        />
        <button onClick={placeOrder} className="btn-accent w-full sm:w-fit">Place Order</button>
      </div>

      {msg ? <p className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{msg}</p> : null}
      {readyNotice ? <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{readyNotice}</p> : null}

      <div className="mt-4 space-y-2">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Your Table Orders</h3>
        {!orders.length ? <p className="text-sm text-slate-600">No orders yet.</p> : null}
        {orders.slice(0, 4).map((order) => (
          <div key={order.id} className="rounded-xl border border-white/80 bg-white p-3 shadow-soft">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-700">{order.id}</p>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(order.status)}`}>{order.status}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{order.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
