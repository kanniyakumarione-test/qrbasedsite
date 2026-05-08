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
  const [playedIds, setPlayedIds] = useState([]);
  const [promo, setPromo] = useState('');
  
  const [showFloating, setShowFloating] = useState(true);
  
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
    const handleScroll = () => {
      const isAtBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 100;
      setShowFloating(!isAtBottom);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

    fetch(`${API_BASE_URL}/api/admin/settings/promo`)
      .then(r => r.json())
      .then(data => setPromo(data.value || ''))
      .catch(() => {});
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

  useEffect(() => {
    if (readyOrder && !playedIds.includes(readyOrder.id)) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => {});
      setPlayedIds(prev => [...prev, readyOrder.id]);
    }
  }, [readyOrder, playedIds]);

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
    if (!pin) { setErrorMsg('Enter PIN'); return; }
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

      // Play Success Sound
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => {});

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
      {/* Ready Notification Bar */}
      {readyOrder && (
        <div className="fixed top-6 left-0 right-0 z-[60] px-6 animate-slide-down">
          <div className="max-w-md mx-auto bg-emerald-600 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-emerald-500/50">
             <div className="flex items-center gap-3">
               <span className="text-2xl">🍱</span>
               <div>
                 <p className="text-xs font-bold uppercase tracking-widest opacity-80">Order Ready!</p>
                 <p className="text-sm font-black">Collect your delicious food</p>
               </div>
             </div>
             <button 
               onClick={() => setDismissedIds(prev => [...prev, readyOrder.id])}
               className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition-colors"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
          </div>
        </div>
      )}

      {/* Promo Banner */}
      {promo && (
        <div className="bg-indigo-600 overflow-hidden py-2 -mx-4 mb-4 shadow-sm border-y border-indigo-500">
          <div className="whitespace-nowrap animate-marquee flex items-center gap-12">
            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2 italic">
              <span className="bg-white text-indigo-600 px-1.5 py-0.5 rounded italic">HOT DEAL</span> {promo}
            </span>
            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2 italic">
              <span className="bg-white text-indigo-600 px-1.5 py-0.5 rounded italic">HOT DEAL</span> {promo}
            </span>
            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2 italic">
              <span className="bg-white text-indigo-600 px-1.5 py-0.5 rounded italic">HOT DEAL</span> {promo}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="py-4 space-y-4">
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
        <div className="mb-10 animate-fade-in">
          <div className="flex items-center justify-between px-1 mb-3">
             <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Order Status</h2>
             <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping"></span>
          </div>
          <div className="space-y-3">
            {visibleOrders.map(order => (
              <div key={order.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:border-indigo-100 transition-colors">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Order ID: #{order.id.split('-')[1]}</p>
                  <p className="text-xs font-bold text-slate-700 truncate leading-tight">
                    {order.items.map(i => i.name).join(', ')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${STATUS_BADGE[order.status]}`}>
                    {STATUS_TEXT[order.status]}
                  </span>
                  <p className="text-[9px] font-bold text-indigo-600">{money(order.totalamount)}</p>
                </div>
              </div>
            ))}
          </div>
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
                <div key={item.id} className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex gap-3 sm:gap-4 transition-all active:scale-[0.98]">
                  <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-xl bg-slate-50 overflow-hidden relative border border-slate-50">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl sm:text-3xl">🍲</div>
                    )}
                    <div className={`absolute top-1.5 left-1.5 h-3 w-3 rounded-full border-2 border-white ${item.is_veg !== false ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  </div>
                  <div className="flex-1 py-0.5 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 text-base sm:text-lg leading-tight">{item.name}</h3>
                      <p className="text-indigo-600 font-black text-base sm:text-lg mt-0.5">{money(item.price)}</p>
                    </div>
                    <div className="flex justify-end">
                      {qty[item.id] > 0 ? (
                        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg p-1 shadow-sm">
                          <button onClick={() => changeQty(item.id, -1)} className="h-7 w-7 rounded-md bg-white shadow-sm flex items-center justify-center text-indigo-600 font-bold">-</button>
                          <span className="text-xs font-black text-indigo-700 w-4 text-center">{qty[item.id]}</span>
                          <button onClick={() => changeQty(item.id, +1)} className="h-7 w-7 rounded-md bg-indigo-600 shadow-sm flex items-center justify-center text-white font-bold">+</button>
                        </div>
                      ) : (
                        <button onClick={() => changeQty(item.id, +1)} className="bg-white border border-slate-200 px-4 py-1.5 rounded-lg text-[10px] font-bold text-slate-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm uppercase tracking-widest">
                          Add
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

      {/* Checkout Section at the Bottom */}
      {cartItems.length > 0 && (
        <div className="mt-20 border-t border-slate-100 pt-10 pb-32 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Finalize Order</h2>
                <p className="text-sm font-medium text-slate-400 mt-1">Check your items and enter details</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-indigo-600">{money(total)}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cartItems.length} Items Total</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Daily PIN</label>
                <input 
                  type="text" 
                  maxLength={4} 
                  placeholder="0000" 
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Special Instructions</label>
                <input 
                  type="text" 
                  placeholder="Extra spicy, no onions, etc." 
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                />
              </div>
            </div>

            <button 
              onClick={placeOrder}
              disabled={placing}
              className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {placing ? 'Sending Order...' : '🚀 Place Order Now'}
            </button>
          </div>
        </div>
      )}

      {/* Slim Floating Status Bar (Always visible when items added, but hides at very bottom) */}
      {cartItems.length > 0 && showFloating && (
        <div className="fixed bottom-6 left-0 right-0 z-40 px-6 animate-fade-in pointer-events-none">
          <div className="max-w-md mx-auto bg-slate-900/90 backdrop-blur-md text-white rounded-2xl p-3 flex items-center justify-between shadow-2xl border border-white/10 pointer-events-auto print:hidden">
             <div className="flex items-center gap-3 ml-2">
               <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
               <p className="text-sm font-bold">{cartItems.length} Items • {money(total)}</p>
             </div>
             <button 
               onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
               className="bg-indigo-600 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95"
             >
               Checkout
             </button>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {successMsg && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-xs animate-slide-down">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-bold shadow-2xl flex items-center gap-3 border border-white/10">
            <span className="text-xl">✨</span>
            <p className="text-xs uppercase tracking-widest">{successMsg}</p>
          </div>
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-xs animate-slide-down">
          <div className="bg-rose-600 text-white px-6 py-4 rounded-2xl font-bold shadow-2xl flex items-center gap-3 border border-rose-500">
            <span className="text-xl">⚠️</span>
            <p className="text-xs uppercase tracking-widest">{errorMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
}
