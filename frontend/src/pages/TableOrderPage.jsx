import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../api-config';

function money(amount) {
  return `₹${Number(amount || 0).toFixed(0)}`;
}

const STATUS_BADGE = {
  NEW: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  PREPARING: 'bg-amber-50 text-amber-600 border-amber-100',
  READY: 'bg-emerald-50 text-emerald-600 border-emerald-100'
};

const STATUS_TEXT = {
  NEW: 'Ordered',
  PREPARING: 'Preparing',
  READY: 'Ready!'
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
  const [search, setSearch] = useState('');
  
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`dismissed_${tableId}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(`dismissed_${tableId}`, JSON.stringify(dismissedIds));
  }, [dismissedIds, tableId]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/menu`)
      .then(r => r.json())
      .then(data => {
        setMenu(data);
        const initial = {};
        data.forEach(item => { initial[item.id] = 0; });
        setQty(initial);
        setLoading(false);
      })
      .catch(() => {
        setErrorMsg('Connection error.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    function fetchOrders() {
      fetch(`${API_BASE_URL}/api/orders?tableId=${encodeURIComponent(tableId)}`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            const cutoff = Date.now() - 24 * 60 * 60 * 1000;
            setMyOrders(data.filter(o => new Date(o.createdAt).getTime() > cutoff));
          }
        })
        .catch(() => {});
    }
    fetchOrders();
    const timer = setInterval(fetchOrders, 8000);
    return () => clearInterval(timer);
  }, [tableId]);

  const visibleOrders = useMemo(() => myOrders.filter(o => !dismissedIds.includes(o.id)), [myOrders, dismissedIds]);
  const readyOrder = useMemo(() => visibleOrders.find(o => o.status === 'READY'), [visibleOrders]);

  const filteredMenu = useMemo(() => {
    if (!search) return menu;
    const s = search.toLowerCase();
    return menu.filter(m => m.name.toLowerCase().includes(s) || m.category.toLowerCase().includes(s));
  }, [menu, search]);

  const grouped = useMemo(() => {
    return filteredMenu.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [filteredMenu]);

  const cartItems = useMemo(() => {
    return menu.filter(item => qty[item.id] > 0).map(item => ({ ...item, quantity: qty[item.id], subtotal: item.price * qty[item.id] }));
  }, [qty, menu]);

  const total = cartItems.reduce((sum, i) => sum + i.subtotal, 0);

  function changeQty(id, delta) {
    setQty(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }));
  }

  async function placeOrder() {
    if (!cartItems.length) return;
    setPlacing(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const items = cartItems.map(i => ({ itemId: i.id, name: i.name, quantity: i.quantity, price: i.price }));
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, items, note, totalAmount: total, pin })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Order failed');

      setSuccessMsg('Your order is being prepared!');
      const reset = {};
      menu.forEach(item => { reset[item.id] = 0; });
      setQty(reset);
      setNote('');
      setPin('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrorMsg(err.message || 'Error placing order.');
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-40 animate-fade-in">
      {/* Ready Alert Modal */}
      {readyOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-6">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in duration-300">
            <div className="text-5xl mb-4">🍱</div>
            <h2 className="text-2xl font-extrabold text-slate-800">Hot & Ready!</h2>
            <p className="text-slate-500 mt-2 font-medium">Your order is ready to be served.</p>
            <button
              onClick={() => setDismissedIds(prev => [...prev, readyOrder.id])}
              className="mt-8 w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              Enjoy My Food
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="py-8 space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Prabhu Hotel</h1>
            <p className="text-sm font-bold text-slate-400">TABLE {tableId.toUpperCase()}</p>
          </div>
          <div className="bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-1.5 border border-emerald-100">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Kitchen Live</span>
          </div>
        </div>

        <div className="relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input 
            type="text"
            placeholder="Search our delicious menu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-100 py-4 pl-12 pr-4 rounded-2xl shadow-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-medium text-sm"
          />
        </div>
      </div>

      {/* Order Status Tracker */}
      {visibleOrders.length > 0 && (
        <div className="mb-10 space-y-3">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Track My Orders</h2>
          {visibleOrders.map(order => (
            <div key={order.id} className="bg-white border border-slate-50 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-xs font-bold text-slate-700 truncate">
                  {order.items.map(i => i.name).join(', ')}
                </p>
                <p className="text-[10px] font-medium text-slate-400 mt-1">ID: #{order.id.split('-')[1]} • {money(order.totalamount)}</p>
              </div>
              <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border ${STATUS_BADGE[order.status]}`}>
                {STATUS_TEXT[order.status]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Menu Sections */}
      <div className="space-y-12">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="space-y-6">
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-3">
              {category}
              <span className="h-px flex-1 bg-slate-100"></span>
            </h2>
            <div className="grid gap-4">
              {items.map(item => (
                <div key={item.id} className="bg-white rounded-3xl p-4 border border-slate-50 shadow-sm flex gap-4 transition-all active:scale-[0.98]">
                  <div className="h-24 w-24 shrink-0 rounded-2xl bg-slate-50 overflow-hidden relative border border-slate-100">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl">🍲</div>
                    )}
                    <div className={`absolute top-2 left-2 h-3.5 w-3.5 rounded-full border-2 border-white ${item.is_veg !== false ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  </div>
                  <div className="flex-1 py-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg leading-tight">{item.name}</h3>
                      <p className="text-indigo-600 font-extrabold text-lg mt-1">{money(item.price)}</p>
                    </div>
                    <div className="flex justify-end">
                      {qty[item.id] > 0 ? (
                        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-1 shadow-sm">
                          <button onClick={() => changeQty(item.id, -1)} className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-indigo-600 font-bold">-</button>
                          <span className="text-sm font-black text-indigo-700 w-4 text-center">{qty[item.id]}</span>
                          <button onClick={() => changeQty(item.id, +1)} className="h-8 w-8 rounded-lg bg-indigo-600 shadow-sm flex items-center justify-center text-white font-bold">+</button>
                        </div>
                      ) : (
                        <button onClick={() => changeQty(item.id, +1)} className="bg-white border border-slate-200 px-6 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm">
                          Add Item
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Cart Checkout */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-6 z-40 bg-gradient-to-t from-white via-white/95 to-transparent">
          <div className="max-w-2xl mx-auto">
            <div className="bg-indigo-900 rounded-[2.5rem] p-5 shadow-2xl shadow-indigo-900/30 border border-white/10 animate-in slide-in-from-bottom-10 duration-500">
              <div className="flex items-center justify-between mb-5 px-3">
                <div>
                  <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest">Cart Summary</p>
                  <p className="text-white text-xl font-extrabold">{cartItems.length} Dishes • {money(total)}</p>
                </div>
                <div className="text-right">
                   <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest">Table</p>
                   <p className="text-white font-black">{tableId.toUpperCase()}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    maxLength={4} 
                    placeholder="PIN" 
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                    className="w-20 rounded-2xl bg-white/10 px-4 py-4 text-center text-white font-bold placeholder:text-white/30 focus:bg-white/20 outline-none border border-white/5"
                  />
                  <input 
                    type="text" 
                    placeholder="Cooking notes... (Optional)" 
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="flex-1 rounded-2xl bg-white/10 px-6 py-4 text-sm font-bold text-white placeholder:text-white/30 focus:bg-white/20 outline-none border border-white/5"
                  />
                </div>
                <button 
                  onClick={placeOrder}
                  disabled={placing}
                  className="w-full bg-white text-indigo-900 py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-50 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {placing ? 'Sending Order...' : '🚀 Place Order Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {successMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-8 py-4 rounded-full font-black shadow-xl animate-in slide-in-from-top-10 duration-500">
          ✨ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-rose-500 text-white px-8 py-4 rounded-full font-black shadow-xl animate-in slide-in-from-top-10 duration-500">
          ❌ {errorMsg}
        </div>
      )}
    </div>
  );
}
