import { useEffect, useState } from 'react';
import Card from './Card';
import { money, statusStyle } from '../lib/format';
import { API_BASE_URL } from '../api-config';

const STATUS_STYLE_MAP = {
  NEW: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Received' },
  PREPARING: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'In Kitchen' },
  READY: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Ready' }
};

export default function OrdersView({ title, mode, buttonText, disabledStatusCheck }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  async function fetchData() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders?mode=${mode}`);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      
      // Sound alert logic for Kitchen
      if (mode === 'kitchen' && data.length > orders.length) {
        const hasNew = data.some(newOrder => 
          newOrder.status === 'NEW' && !orders.find(o => o.id === newOrder.id)
        );
        if (hasNew) {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(() => {}); // Browser might block auto-play
        }
      }

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
    <div className="space-y-8 animate-slide-up">
      <div className="flex items-end justify-between px-2">
        <div>
          <h1 className="text-4xl font-black text-emerald-900 tracking-tighter uppercase">{title}</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Live Order Management</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-4 justify-end">
            {error && <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest animate-pulse">{error}</span>}
            <span className="bg-white/50 px-4 py-2 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest border border-white shadow-sm">Auto refresh: 7s</span>
          </div>
        </div>
      </div>

      {!orders.length && !error ? (
        <div className="py-32 glass-card rounded-[3rem] text-center border-dashed border-slate-200">
          <p className="text-5xl mb-6 opacity-20">🧊</p>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Kitchen is currently quiet</p>
        </div>
      ) : null}

      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {orders.map((order) => {
          const s = STATUS_STYLE_MAP[order.status] || { bg: 'bg-slate-100', text: 'text-slate-600', label: order.status };
          return (
            <div key={order.id} className="group glass-card rounded-[2.5rem] p-8 border-white/50 relative overflow-hidden transition-all hover:premium-shadow">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-[10px] font-black text-emerald-900/30 uppercase tracking-[0.2em]">Table Order</p>
                  <h3 className="text-3xl font-black text-emerald-900 tracking-tighter uppercase">Table {order.tableid || order.tableId}</h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">
                    🕒 {Math.floor((Date.now() - new Date(order.createdAt || order.createdat).getTime()) / 60000)}m ago
                  </p>
                  <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${s.bg} ${s.text} border-current/20`}>
                    {s.label}
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-sm font-bold text-slate-700 leading-relaxed">
                  {Array.isArray(order.items) ? order.items.map((i) => `${i.name} x${i.quantity}`).join(', ') : 'No items'}
                </p>
                {order.note && (
                  <div className="bg-amber-500/5 rounded-2xl p-4 border border-amber-500/10">
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Note for Chef</p>
                    <p className="text-xs font-bold text-amber-700 italic">"{order.note}"</p>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order ID: {order.id.split('-')[1]}</p>
                   <p className="text-lg font-black text-emerald-900">{money(order.totalAmount || order.totalamount)}</p>
                </div>
              </div>

              <div className="flex gap-3 mt-auto">
                <button
                  onClick={() => advance(order.id)}
                  disabled={disabledStatusCheck(order.status)}
                  className="flex-1 btn-premium py-4 text-xs tracking-[0.2em] uppercase disabled:opacity-30 disabled:grayscale"
                >
                  {buttonText(order.status)}
                </button>
                {order.status === 'READY' && (
                  <button
                    onClick={() => removeOrder(order.id)}
                    className="px-6 rounded-2xl bg-rose-50 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
