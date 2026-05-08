import { useEffect, useState, useMemo } from 'react';
import { API_BASE_URL } from '../api-config';

const emptyForm = {
  name: '',
  category: '',
  price: '',
  available: true,
  is_veg: true,
  image_url: ''
};

function money(amount) {
  return `₹${Number(amount || 0).toFixed(0)}`;
}

export default function AdminPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [dailyPin, setDailyPin] = useState('');
  const [pinStatus, setPinStatus] = useState('');
  const [promo, setPromo] = useState('');
  const [promoStatus, setPromoStatus] = useState('');

  async function loadData() {
    try {
      const menuRes = await fetch(`${API_BASE_URL}/api/admin/menu`);
      setMenuItems(await menuRes.json());
      const pinRes = await fetch(`${API_BASE_URL}/api/admin/settings/daily_pin`);
      setDailyPin((await pinRes.json()).value || '');
      const promoRes = await fetch(`${API_BASE_URL}/api/admin/settings/promo`);
      setPromo((await promoRes.json()).value || '');
      const anaRes = await fetch(`${API_BASE_URL}/api/admin/analytics`);
      setAnalytics(await anaRes.json());
      setError('');
    } catch (err) {
      setError('Connection error: Could not load data.');
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

  async function saveMenuItem(e) {
    e.preventDefault();
    setStatus('Processing...');
    try {
      const isEdit = Boolean(editingId);
      const response = await fetch(isEdit ? `${API_BASE_URL}/api/admin/menu/${editingId}` : `${API_BASE_URL}/api/admin/menu`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, price: Number(form.price) })
      });
      if (!response.ok) throw new Error('Failed');
      setStatus(isEdit ? 'Updated.' : 'Created.');
      setEditingId('');
      setForm(emptyForm);
      loadData();
    } catch (err) { setStatus('Error.'); }
  }

  async function updateSetting(key, value, setter) {
    setter('Updating...');
    try {
      await fetch(`${API_BASE_URL}/api/admin/settings/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });
      setter('Saved.');
    } catch (err) { setter('Error.'); }
  }

  async function removeItem(id) {
    if (!window.confirm('Delete this item?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/admin/menu/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) { alert('Delete failed.'); }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Admin Console</h1>
          <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">Business Overview</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Sales</p>
          <p className="text-4xl font-black text-slate-900">{money(stats.totalRevenue)}</p>
          <div className="mt-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time</span>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Popular Dish</p>
          <p className="text-2xl font-black text-slate-900 truncate">{stats.bestSeller[0]}</p>
          <p className="text-[10px] font-bold text-indigo-600 mt-2 uppercase tracking-widest">{stats.bestSeller[1]} plates sold</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Peak Table</p>
          <p className="text-4xl font-black text-slate-900">Table {stats.busiestTable[0]}</p>
          <p className="text-[10px] font-bold text-indigo-600 mt-2 uppercase tracking-widest">{stats.busiestTable[1]} orders today</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl">
            <h3 className="text-lg font-black tracking-tight mb-6 uppercase">System Config</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Order PIN</label>
                <div className="flex gap-2">
                  <input value={dailyPin} onChange={e => setDailyPin(e.target.value.replace(/\D/g, ''))} className="w-20 rounded-2xl bg-white/10 px-4 py-3 text-center text-xl font-black outline-none focus:bg-white/20 transition-all" maxLength={4} />
                  <button onClick={() => updateSetting('daily_pin', dailyPin, setPinStatus)} className="flex-1 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest">Save PIN</button>
                </div>
                {pinStatus && <p className="text-[9px] font-bold text-indigo-400">{pinStatus}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Special Promo Banner</label>
                <input value={promo} onChange={e => setPromo(e.target.value)} placeholder="Today's Offer..." className="w-full rounded-2xl bg-white/10 px-4 py-4 text-xs font-bold outline-none focus:bg-white/20 transition-all" />
                <button onClick={() => updateSetting('promo', promo, setPromoStatus)} className="w-full bg-indigo-500 text-white rounded-2xl py-3 text-[10px] font-black uppercase tracking-widest">Update Banner</button>
                {promoStatus && <p className="text-[9px] font-bold text-indigo-400">{promoStatus}</p>}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-6 uppercase">{editingId ? 'Edit Dish' : 'Add New Dish'}</h3>
            <form onSubmit={saveMenuItem} className="space-y-4">
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Item Name" className="w-full bg-slate-50 border-none px-5 py-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/10" required />
              <input value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} placeholder="Category" className="w-full bg-slate-50 border-none px-5 py-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/10" required />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} placeholder="Price ₹" className="w-full bg-slate-50 border-none px-5 py-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/10" required />
                <select value={form.is_veg ? 'veg' : 'non'} onChange={e => setForm(f => ({...f, is_veg: e.target.value === 'veg'}))} className="w-full bg-slate-50 border-none px-5 py-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/10">
                  <option value="veg">🟢 Veg</option>
                  <option value="non">🔴 Non-Veg</option>
                </select>
              </div>
              <input value={form.image_url} onChange={e => setForm(f => ({...f, image_url: e.target.value}))} placeholder="Image Link" className="w-full bg-slate-50 border-none px-5 py-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/10" />
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest">{editingId ? 'Update' : 'Save'}</button>
                {editingId && <button type="button" onClick={() => {setEditingId(''); setForm(emptyForm);}} className="px-6 bg-slate-100 rounded-2xl font-black text-[10px] text-slate-500 uppercase">Cancel</button>}
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center px-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Menu Items ({menuItems.length})</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {menuItems.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-3xl border border-slate-50 shadow-sm flex gap-4 group">
                <div className="h-16 w-16 shrink-0 rounded-2xl bg-slate-50 overflow-hidden relative border border-slate-100">
                  {item.image_url ? <img src={item.image_url} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-2xl">🍲</div>}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                   <div className="flex items-center gap-1.5">
                     <span className={`h-1.5 w-1.5 rounded-full ${item.is_veg !== false ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                     <p className="font-bold text-slate-800 text-sm truncate uppercase tracking-tight">{item.name}</p>
                   </div>
                   <p className="text-xs font-black text-indigo-600 mt-1">{money(item.price)}</p>
                   <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-all">
                     <button onClick={() => {setEditingId(item.id); setForm({...item, price: String(item.price), is_veg: item.is_veg !== false, image_url: item.image_url || ''});}} className="text-[9px] font-black text-slate-400 uppercase hover:text-indigo-600">Edit</button>
                     <button onClick={() => removeItem(item.id)} className="text-[9px] font-black text-slate-400 uppercase hover:text-rose-500">Delete</button>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
