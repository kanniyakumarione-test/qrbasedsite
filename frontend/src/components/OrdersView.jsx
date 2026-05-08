import { useEffect, useState } from 'react';
import Card from './Card';
import { money, statusStyle } from '../lib/format';
import { API_BASE_URL } from '../api-config';

const STATUS_STYLE_MAP = {
  NEW: { bg: 'bg-indigo-50', text: 'text-indigo-600', label: 'Received' },
  PREPARING: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Preparing' },
  READY: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Ready' }
};

export default function OrdersView({ title, mode, buttonText, disabledStatusCheck }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  async function fetchData() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders?mode=${mode}`);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      
      if (mode === 'kitchen' && data.length > orders.length) {
        const hasNew = data.some(newOrder => 
          newOrder.status === 'NEW' && !orders.find(o => o.id === newOrder.id)
        );
        if (hasNew) {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(() => {});
        }
      }

      setOrders(data);
      setError('');
    } catch (err) {
      setError('Connection error. Retrying...');
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
    } catch (err) { alert('Error updating status.'); }
  }

  async function removeOrder(id) {
    if (!window.confirm('Delete this order?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/orders/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) { alert('Error removing.'); }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-2">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight uppercase">{title}</h1>
          <p className="text-xs text-slate-400 mt-1 font-medium tracking-widest uppercase">Live Kitchen Stream</p>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">{error}</span>}
          <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Refresh: 7s
          </div>
        </div>
      </div>

      {!orders.length && !error ? (
        <div className="py-24 bg-slate-50 rounded-[2.5rem] text-center border-2 border-dashed border-slate-100">
          <p className="text-4xl mb-4 grayscale opacity-30">🍳</p>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">All caught up!</p>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {orders.map((order) => {
          const s = STATUS_STYLE_MAP[order.status] || { bg: 'bg-slate-50', text: 'text-slate-500', label: order.status };
          return (
            <div key={order.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm transition-all hover:shadow-xl">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Table {order.tableid || order.tableId}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID: #{order.id.split('-')[1]}</p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${s.bg} ${s.text} border-current/10`}>
                    {s.label}
                  </span>
                  <p className="text-[10px] font-bold text-indigo-500 mt-2">
                    🕒 {Math.floor((Date.now() - new Date(order.createdAt || order.createdat).getTime()) / 60000)}m ago
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-sm font-bold text-slate-700 leading-relaxed">
                  {Array.isArray(order.items) ? order.items.map((i) => `${i.name} x${i.quantity}`).join(', ') : 'No items'}
                </p>
                {order.note && (
                  <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                    <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Chef Note</p>
                    <p className="text-xs font-bold text-indigo-800 italic">"{order.note}"</p>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                   <p className="text-lg font-bold text-slate-900">{money(order.totalAmount || order.totalamount)}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => advance(order.id)}
                  disabled={disabledStatusCheck(order.status)}
                  className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 disabled:opacity-30 disabled:shadow-none transition-all"
                >
                  {buttonText(order.status)}
                </button>
                {order.status === 'READY' && (
                  <button
                    onClick={() => removeOrder(order.id)}
                    className="bg-rose-50 text-rose-500 px-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all"
                  >
                    Clear
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
