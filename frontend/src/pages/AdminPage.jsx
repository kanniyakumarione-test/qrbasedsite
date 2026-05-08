import { useEffect, useState, useMemo } from 'react';
import { API_BASE_URL } from '../api-config';

function money(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

export default function AdminPage() {
  const [analytics, setAnalytics] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [dailyPin, setDailyPin] = useState('');
  const [pinStatus, setPinStatus] = useState('');
  const [promo, setPromo] = useState('');
  const [promoStatus, setPromoStatus] = useState('');

  async function loadData() {
    try {
      const pinRes = await fetch(`${API_BASE_URL}/api/admin/settings/daily_pin`);
      setDailyPin((await pinRes.json()).value || '');
      const promoRes = await fetch(`${API_BASE_URL}/api/admin/settings/promo`);
      setPromo((await promoRes.json()).value || '');
      const anaRes = await fetch(`${API_BASE_URL}/api/admin/analytics`);
      setAnalytics(await anaRes.json());
      setError('');
    } catch (err) {
      setError('Connection error');
    }
  }

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 30000);
    return () => clearInterval(timer);
  }, []);

  const stats = useMemo(() => {
    let totalRevenue = 0;
    const itemSales = {};
    const tableSales = {};
    analytics.forEach(order => {
      totalRevenue += Number(order.totalamount || 0);
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
      items.forEach(item => { itemSales[item.name] = (itemSales[item.name] || 0) + item.quantity; });
      const tId = order.tableid || 'Unknown';
      tableSales[tId] = (tableSales[tId] || 0) + 1;
    });
    const bestSeller = Object.entries(itemSales).sort((a, b) => b[1] - a[1])[0] || ['None', 0];
    const busiestTable = Object.entries(tableSales).sort((a, b) => b[1] - a[1])[0] || ['None', 0];
    return { totalRevenue, bestSeller, busiestTable };
  }, [analytics]);

  async function updateSetting(key, value, setter) {
    setter('Updating...');
    try {
      await fetch(`${API_BASE_URL}/api/admin/settings/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });
      setter('Saved');
      setTimeout(() => setter(''), 2000);
    } catch (err) { setter('Error'); }
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-2 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Business Analytics</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Performance tracking & global security</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Daily Revenue</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{money(stats.totalRevenue)}</span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Live</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Most Popular</p>
          <p className="text-xl font-bold text-slate-900 truncate">{stats.bestSeller[0]}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">{stats.bestSeller[1]} orders today</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Peak Performance</p>
          <p className="text-xl font-bold text-slate-900">Table {stats.busiestTable[0]}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">{stats.busiestTable[1]} sessions today</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Security / PIN */}
        <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl shadow-slate-200 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10 text-9xl font-black">PIN</div>
          <h3 className="text-xs font-bold text-indigo-400 mb-6 uppercase tracking-widest">Order Security PIN</h3>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">Update the 4-digit code required for table orders.</p>
          <div className="flex items-center gap-3">
             <input value={dailyPin} onChange={e => setDailyPin(e.target.value.replace(/\D/g, ''))} className="w-24 bg-white/10 border-none rounded-2xl py-4 text-center font-bold text-2xl focus:bg-white/20 outline-none transition-all" maxLength={4} />
             <button onClick={() => updateSetting('daily_pin', dailyPin, setPinStatus)} className="flex-1 bg-white text-slate-900 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-colors">
               {pinStatus || 'Save Security Code'}
             </button>
          </div>
        </div>

        {/* Promo Settings */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-900 mb-6 uppercase tracking-widest">Live Promo Management</h3>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">This text will scroll at the top of the customer menu.</p>
          <textarea 
            value={promo} 
            onChange={e => setPromo(e.target.value)} 
            placeholder="Today's Special: 20% OFF on Lunch combos!"
            rows={2}
            className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 mb-4 transition-all"
          />
          <button onClick={() => updateSetting('promo', promo, setPromoStatus)} className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
            {promoStatus || 'Push Live Update'}
          </button>
        </div>
      </div>
    </div>
  );
}
