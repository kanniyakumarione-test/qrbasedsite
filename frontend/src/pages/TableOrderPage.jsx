import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../api-config';

function money(amount) {
  return `₹${Number(amount || 0).toFixed(0)}`;
}

export default function TableOrderPage() {
  const { tableId } = useParams();
  const [menu, setMenu] = useState([]);
  const [qty, setQty] = useState({});
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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

  const grouped = useMemo(() => {
    return menu.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [menu]);

  const cartItems = useMemo(() => {
    return menu.filter((item) => qty[item.id] > 0).map((item) => ({
      ...item,
      quantity: qty[item.id],
      subtotal: item.price * qty[item.id]
    }));
  }, [qty, menu]);

  const total = cartItems.reduce((sum, i) => sum + i.subtotal, 0);

  function changeQty(id, delta) {
    setQty((prev) => ({
      ...prev,
      [id]: Math.max(0, Math.min(20, (prev[id] || 0) + delta))
    }));
  }

  async function placeOrder() {
    if (!cartItems.length) return;
    setPlacing(true);
    setErrorMsg('');

    try {
      const items = cartItems.map((i) => ({ itemId: i.id, name: i.name, quantity: i.quantity, price: i.price }));
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, items, note, totalAmount: total })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Order failed');

      setSuccessMsg(`Order placed! ✅ Your food is being prepared.`);
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
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

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Success Message */}
        {successMsg && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center shadow-sm">
            <p className="text-2xl">🎉</p>
            <p className="mt-2 font-bold text-emerald-800">{successMsg}</p>
            <p className="mt-1 text-sm text-emerald-600">The kitchen has received your order.</p>
          </div>
        )}

        {/* Error Message */}
        {errorMsg && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-center">
            <p className="text-sm font-semibold text-rose-700">{errorMsg}</p>
          </div>
        )}

        {/* Menu Categories */}
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-amber-600">{category}</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm border border-white">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{item.name}</p>
                    <p className="text-base font-extrabold text-amber-600">{money(item.price)}</p>
                  </div>
                  {/* Qty Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    {qty[item.id] > 0 ? (
                      <>
                        <button
                          onClick={() => changeQty(item.id, -1)}
                          className="h-8 w-8 rounded-full bg-amber-100 text-amber-700 font-bold text-lg flex items-center justify-center hover:bg-amber-200 transition-colors"
                        >−</button>
                        <span className="w-6 text-center font-bold text-slate-800">{qty[item.id]}</span>
                        <button
                          onClick={() => changeQty(item.id, +1)}
                          className="h-8 w-8 rounded-full bg-amber-500 text-white font-bold text-lg flex items-center justify-center hover:bg-amber-600 transition-colors"
                        >+</button>
                      </>
                    ) : (
                      <button
                        onClick={() => changeQty(item.id, +1)}
                        className="rounded-full bg-amber-500 px-4 py-1.5 text-sm font-bold text-white hover:bg-amber-600 transition-colors shadow"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Order Summary & Place Order */}
        {cartItems.length > 0 && (
          <div className="rounded-2xl bg-white border border-white p-5 shadow-md space-y-4">
            <h2 className="font-extrabold text-slate-800 text-lg">Your Order</h2>
            <div className="space-y-2">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm text-slate-700">
                  <span>{item.name} × {item.quantity}</span>
                  <span className="font-semibold">{money(item.subtotal)}</span>
                </div>
              ))}
              <div className="mt-2 flex justify-between border-t border-slate-100 pt-3 font-extrabold text-slate-800">
                <span>Total</span>
                <span className="text-amber-600 text-lg">{money(total)}</span>
              </div>
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Special requests? (optional)"
              rows={2}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />

            <button
              onClick={placeOrder}
              disabled={placing}
              className="w-full rounded-2xl bg-amber-500 py-4 text-base font-extrabold text-white shadow-lg hover:bg-amber-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {placing ? 'Placing Order...' : `Place Order · ${money(total)}`}
            </button>
          </div>
        )}

        {!menu.length && !loading && !errorMsg && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-4xl">🍽</p>
            <p className="mt-3 font-semibold text-slate-600">Menu is being prepared.</p>
          </div>
        )}
      </div>
    </div>
  );
}
