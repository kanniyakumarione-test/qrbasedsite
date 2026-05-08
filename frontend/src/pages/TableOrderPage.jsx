import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../api-config';

function money(amount) {
  return `₹${Number(amount || 0).toFixed(0)}`;
}

const STATUS_LABEL = {
  NEW: { text: '⏳ Received', color: 'bg-amber-100 text-amber-700 border border-amber-200' },
  PREPARING: { text: '👨‍🍳 Preparing', color: 'bg-blue-100 text-blue-700 border border-blue-200' },
  READY: { text: '✅ Ready!', color: 'bg-emerald-100 text-emerald-700 border border-emerald-200' }
};

export default function TableOrderPage() {
  const { tableId } = useParams();
  const [menu, setMenu] = useState([]);
  const [qty, setQty] = useState({});
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [myOrders, setMyOrders] = useState([]);
  const [pin, setPin] = useState('');
  
  // Track acknowledged/dismissed orders in localStorage
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`dismissed_${tableId}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(`dismissed_${tableId}`, JSON.stringify(dismissedIds));
  }, [dismissedIds, tableId]);

  // Load menu
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/menu`)
      .then((r) => r.json())
      .then((data) => {
        setMenu(data);
        const initial = {};
        data.forEach((item) => { initial[item.id] = 0; });
        setQty(initial);
        setLoading(false);
      })
      .catch(() => {
        setErrorMsg('Could not load menu. Please try again.');
        setLoading(false);
      });
  }, []);

  // Load and poll this table's orders
  useEffect(() => {
    function fetchOrders() {
      fetch(`${API_BASE_URL}/api/orders?tableId=${encodeURIComponent(tableId)}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            // Cutoff: 24 hours
            const cutoff = Date.now() - 24 * 60 * 60 * 1000;
            const recent = data.filter((o) => {
              const time = new Date(o.createdAt || o.createdat || 0).getTime();
              return time > cutoff;
            });
            setMyOrders(recent);
          }
        })
        .catch(() => {});
    }
    fetchOrders();
    const timer = setInterval(fetchOrders, 8000);
    return () => clearInterval(timer);
  }, [tableId]);

  // Orders to display (exclude dismissed ones)
  const visibleOrders = useMemo(() => {
    return myOrders.filter(o => !dismissedIds.includes(o.id));
  }, [myOrders, dismissedIds]);

  // Check if any visible order is READY to trigger popup
  const readyOrder = useMemo(() => {
    return visibleOrders.find(o => o.status === 'READY');
  }, [visibleOrders]);

  const grouped = useMemo(() => {
    return menu.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [menu]);

  const cartItems = useMemo(() => {
    return menu
      .filter((item) => qty[item.id] > 0)
      .map((item) => ({ ...item, quantity: qty[item.id], subtotal: item.price * qty[item.id] }));
  }, [qty, menu]);

  const total = cartItems.reduce((sum, i) => sum + i.subtotal, 0);

  function changeQty(id, delta) {
    setQty((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }));
  }

  function dismissOrder(id) {
    setDismissedIds(prev => [...prev, id]);
  }

  async function placeOrder() {
    if (!cartItems.length) return;
    setPlacing(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const items = cartItems.map((i) => ({ itemId: i.id, name: i.name, quantity: i.quantity, price: i.price }));
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, items, note, totalAmount: total, pin })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Order failed');

      setSuccessMsg('Order placed! Your food is being prepared. 🎉');
      const reset = {};
      menu.forEach((item) => { reset[item.id] = 0; });
      setQty(reset);
      setNote('');
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-amber-400 border-t-transparent"></div>
          <p className="mt-4 font-semibold text-amber-700">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 pb-20">
      {/* Ready Notification Popup */}
      {readyOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm animate-in fade-in zoom-in duration-300 rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl">🥘</div>
            <h2 className="mt-6 text-2xl font-extrabold text-slate-800">Your Order is Ready!</h2>
            <p className="mt-2 text-slate-600 font-medium">Please collect your hot food from the counter.</p>
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left border border-slate-100">
               <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Order Items</p>
               <p className="mt-1 text-sm font-bold text-slate-700">
                {readyOrder.items.map(i => `${i.name} x${i.quantity}`).join(', ')}
               </p>
            </div>
            <button
              onClick={() => dismissOrder(readyOrder.id)}
              className="mt-8 w-full rounded-2xl bg-emerald-500 py-4 text-lg font-extrabold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-95 transition-all"
            >
              Got it, Done!
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">🍽 Prabhu Hotel</h1>
            <p className="text-xs text-slate-500">Table {tableId.toUpperCase()}</p>
          </div>
          {cartItems.length > 0 && (
            <div className="rounded-full bg-amber-500 px-3 py-1 text-sm font-bold text-white shadow">
              {cartItems.reduce((s, i) => s + i.quantity, 0)} items · {money(total)}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">

        {/* Active Orders List */}
        {visibleOrders.length > 0 && (
          <div>
            <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-slate-500">Track Orders</h2>
            <div className="space-y-2">
              {visibleOrders.map((order) => {
                const s = STATUS_LABEL[order.status] || STATUS_LABEL.NEW;
                return (
                  <div key={order.id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm border border-white">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-700 truncate">
                        {order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Order {order.id.split('-')[1]} · {money(order.totalAmount || order.totalamount)}
                      </p>
                    </div>
                    <span className={`ml-3 shrink-0 rounded-full px-3 py-1 text-[10px] font-bold ${s.color}`}>{s.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Success / Error */}
        {successMsg && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center animate-in slide-in-from-top duration-500">
            <p className="text-2xl">🎉</p>
            <p className="mt-2 font-bold text-emerald-800">{successMsg}</p>
          </div>
        )}
        {errorMsg && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center">
            <p className="text-sm font-semibold text-rose-700">{errorMsg}</p>
          </div>
        )}

        {/* Menu */}
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-amber-600">{category}</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm transition-all active:scale-[0.98]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-800">{item.name}</p>
                    <p className="text-base font-extrabold text-amber-600">{money(item.price)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {qty[item.id] > 0 ? (
                      <>
                        <button onClick={() => changeQty(item.id, -1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-700 hover:bg-amber-200 transition-colors">−</button>
                        <span className="w-6 text-center font-bold text-slate-800">{qty[item.id]}</span>
                        <button onClick={() => changeQty(item.id, +1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-white hover:bg-amber-600 transition-colors">+</button>
                      </>
                    ) : (
                      <button onClick={() => changeQty(item.id, +1)} className="rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-amber-600 transition-all active:scale-95">
                        Add
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Summary Footer Panel */}
        {cartItems.length > 0 && (
          <div className="sticky bottom-4 z-20 rounded-3xl border border-white bg-white/90 p-5 shadow-2xl backdrop-blur-lg animate-in slide-in-from-bottom duration-500">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-800">Total Order</h2>
              <span className="text-2xl font-black text-amber-600">{money(total)}</span>
            </div>
            
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any special requests? (e.g. Less spicy)"
              rows={2}
              className="mb-4 w-full resize-none rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
            />

            <div className="mb-4 rounded-2xl bg-amber-50 p-4 border border-amber-100">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-600">Security PIN (Ask Staff)</p>
              <input
                type="text"
                pattern="\d*"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 4-digit PIN"
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-center text-lg font-bold tracking-[0.5em] text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="mt-2 text-[10px] text-amber-500 font-medium">To prevent fake orders, please enter the PIN shown at the hotel.</p>
            </div>

            <button
              onClick={placeOrder}
              disabled={placing}
              className="w-full rounded-2xl bg-amber-500 py-5 text-lg font-black text-white shadow-xl shadow-amber-200 hover:bg-amber-600 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-60"
            >
              {placing ? '⏳ Placing Order...' : `🚀 Place Order · ${money(total)}`}
            </button>
          </div>
        )}

        {!menu.length && !loading && (
          <div className="rounded-3xl bg-white p-12 text-center shadow-lg border border-white">
            <p className="text-5xl">🥣</p>
            <p className="mt-4 font-bold text-slate-400">Our menu is being updated.</p>
          </div>
        )}
      </div>
    </div>
  );
}
