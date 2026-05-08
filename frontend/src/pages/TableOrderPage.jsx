import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../api-config';

function money(amount) {
  return `₹${Number(amount || 0).toFixed(0)}`;
}

const STATUS_LABEL = {
  NEW: { text: 'Ordered', color: 'bg-amber-500/10 text-amber-600 border-amber-200/50' },
  PREPARING: { text: 'Chef Preparing', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200/50' },
  READY: { text: 'Ready to Serve', color: 'bg-blue-500/10 text-blue-600 border-blue-200/50' }
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
  const [promo, setPromo] = useState('');
  
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
    // Load Menu
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
        setErrorMsg('System connection error. Please refresh.');
        setLoading(false);
      });

    // Load Promo
    fetch(`${API_BASE_URL}/api/admin/settings/promo`)
      .then(r => r.json())
      .then(data => setPromo(data.value || ''))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function fetchOrders() {
      fetch(`${API_BASE_URL}/api/orders?tableId=${encodeURIComponent(tableId)}`)
        .then((r) => r.json())
        .then((data) => {
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

      setSuccessMsg('Order placed successfully. Thank you!');
      const reset = {};
      menu.forEach(item => { reset[item.id] = 0; });
      setQty(reset);
      setNote('');
      setPin('');
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong.');
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fcfaf7]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-900 border-t-transparent"></div>
          <p className="mt-4 font-bold text-emerald-900 tracking-widest uppercase text-xs">Prabhu Hotel</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfaf7] pb-32">
      {/* Ready Notification Popup */}
      {readyOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm glass-card rounded-[2rem] p-8 text-center shadow-2xl animate-slide-up">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-5xl">🥂</div>
            <h2 className="mt-6 text-3xl font-black text-emerald-900">It's Ready!</h2>
            <p className="mt-2 text-slate-500 font-medium">Your delicacies are ready to be served.</p>
            <button
              onClick={() => setDismissedIds(prev => [...prev, readyOrder.id])}
              className="mt-8 w-full btn-premium py-5 rounded-2xl"
            >
              Excellent
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-emerald-900/5">
        <div className="mx-auto max-w-2xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-emerald-900 tracking-tight">PRABHU HOTEL</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Table {tableId}</p>
              </div>
            </div>
            {promo && (
              <div className="hidden sm:block max-w-[200px] text-right">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Today's Special</p>
                <p className="text-xs font-medium text-slate-500 truncate">{promo}</p>
              </div>
            )}
          </div>
          
          <div className="mt-6 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
            <input 
              type="text"
              placeholder="Search our cuisine..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl bg-slate-100/50 px-12 py-4 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-emerald-900/5 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-8 space-y-10">
        
        {/* Promotional Alert */}
        {promo && (
          <div className="bg-emerald-900 rounded-3xl p-6 text-white shadow-xl shadow-emerald-900/20 flex items-center gap-4">
            <div className="text-4xl">✨</div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Exclusive Today</p>
              <p className="text-sm font-bold leading-relaxed">{promo}</p>
            </div>
          </div>
        )}

        {/* Active Trackers */}
        {visibleOrders.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-900/40">Current Orders</h2>
            <div className="space-y-3">
              {visibleOrders.map((order) => {
                const s = STATUS_LABEL[order.status] || STATUS_LABEL.NEW;
                return (
                  <div key={order.id} className="glass-card rounded-2xl p-4 flex items-center justify-between border-white/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-emerald-900 truncate uppercase tracking-wide">
                        {order.items.map(i => i.name).join(', ')}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1">ID: {order.id.split('-')[1]} • {money(order.totalamount)}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${s.color}`}>{s.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Success/Error Messages */}
        {successMsg && (
          <div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-6 text-center animate-slide-up">
            <p className="text-3xl mb-2">💎</p>
            <p className="text-sm font-black text-emerald-900 uppercase tracking-wide">{successMsg}</p>
          </div>
        )}
        {errorMsg && (
          <div className="rounded-3xl bg-rose-50 border border-rose-100 p-5 text-center">
            <p className="text-xs font-bold text-rose-700 uppercase tracking-widest">{errorMsg}</p>
          </div>
        )}

        {/* Menu Sections */}
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="space-y-4">
            <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-900/30 border-b border-emerald-900/5 pb-2">{category}</h2>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="group glass-card rounded-[2rem] p-4 flex gap-5 transition-all hover:translate-x-1">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100 shadow-sm">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl">🍲</div>
                    )}
                    {item.is_veg !== false && <div className="absolute top-2 right-2 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm"></div>}
                    {item.is_veg === false && <div className="absolute top-2 right-2 h-3 w-3 rounded-full bg-rose-500 border-2 border-white shadow-sm"></div>}
                  </div>
                  <div className="flex-1 py-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-black text-emerald-900 text-lg leading-tight uppercase tracking-tight">{item.name}</h3>
                        <p className="mt-1 font-black text-amber-600 text-xl">{money(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {qty[item.id] > 0 ? (
                          <div className="flex items-center gap-3 bg-emerald-900 rounded-full p-1 shadow-lg">
                            <button onClick={() => changeQty(item.id, -1)} className="h-8 w-8 rounded-full bg-white/10 text-white font-bold hover:bg-white/20">-</button>
                            <span className="text-sm font-black text-white w-4 text-center">{qty[item.id]}</span>
                            <button onClick={() => changeQty(item.id, +1)} className="h-8 w-8 rounded-full bg-white/20 text-white font-bold hover:bg-white/30">+</button>
                          </div>
                        ) : (
                          <button onClick={() => changeQty(item.id, +1)} className="h-10 px-6 rounded-full bg-emerald-900 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-900/10">Add</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Cart Bar */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-6 z-50">
          <div className="bg-emerald-900 rounded-[2.5rem] p-4 shadow-2xl shadow-emerald-900/40 border border-white/10 animate-slide-up">
            <div className="flex items-center gap-4 mb-4 px-2">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl">🛒</div>
              <div className="flex-1">
                <p className="text-emerald-300 text-[10px] font-black uppercase tracking-widest">Your Selection</p>
                <p className="text-white text-lg font-black">{cartItems.length} delicacies · {money(total)}</p>
              </div>
            </div>
            
            <div className="space-y-3 px-1">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  maxLength={4} 
                  placeholder="Security PIN" 
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-1/3 rounded-2xl bg-white/10 px-4 py-4 text-center text-white font-black placeholder:text-white/30 outline-none focus:bg-white/20 transition-all"
                />
                <input 
                  type="text" 
                  placeholder="Notes for the Chef..." 
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="flex-1 rounded-2xl bg-white/10 px-6 py-4 text-sm font-bold text-white placeholder:text-white/30 outline-none focus:bg-white/20 transition-all"
                />
              </div>
              <button 
                onClick={placeOrder}
                disabled={placing}
                className="w-full bg-white text-emerald-900 py-5 rounded-[1.8rem] font-black text-lg uppercase tracking-widest hover:bg-amber-400 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {placing ? '⌛ Processing...' : '🚀 Finalize Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
