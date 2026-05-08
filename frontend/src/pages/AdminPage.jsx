import { useEffect, useState, useMemo } from 'react';
import Card from '../components/Card';
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
      setStatus(isEdit ? 'Item updated.' : 'Item created.');
      setEditingId('');
      setForm(emptyForm);
      loadData();
    } catch (err) { setStatus('Error saving item.'); }
  }

  async function updateSetting(key, value, setter) {
    setter('Updating...');
    try {
      await fetch(`${API_BASE_URL}/api/admin/settings/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });
      setter('Successfully saved.');
    } catch (err) { setter('Error saving.'); }
  }

  async function removeItem(id) {
    if (!window.confirm('Are you sure?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/admin/menu/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) { alert('Delete failed.'); }
  }

  return (
    <div className="space-y-10 pb-20 animate-slide-up">
      {/* Page Title */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black text-emerald-900 tracking-tighter">DASHBOARD</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Management Suite v2.0</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest">Real-time status</p>
          <div className="flex items-center gap-2 justify-end mt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            <span className="text-xs font-bold text-emerald-900">Live</span>
          </div>
        </div>
      </div>

      {/* Analytics Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="glass-card rounded-[2.5rem] p-8 border-white/50 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-emerald-900/5 text-8xl font-black transition-transform group-hover:scale-110">₹</div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-900/40">Total Revenue</p>
          <p className="mt-2 text-4xl font-black text-emerald-900">{money(stats.totalRevenue)}</p>
          <div className="mt-6 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[9px] font-bold">+12.5%</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Growth</span>
          </div>
        </div>
        
        <div className="glass-card rounded-[2.5rem] p-8 border-white/50 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-emerald-900/5 text-8xl font-black transition-transform group-hover:scale-110">★</div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-900/40">Best Selling Cuisine</p>
          <p className="mt-2 text-2xl font-black text-emerald-900 truncate">{stats.bestSeller[0]}</p>
          <p className="mt-1 text-[10px] font-bold text-slate-400">{stats.bestSeller[1]} servings sold</p>
        </div>

        <div className="glass-card rounded-[2.5rem] p-8 border-white/50 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-emerald-900/5 text-8xl font-black transition-transform group-hover:scale-110">⌂</div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-900/40">Top Performing Table</p>
          <p className="mt-2 text-3xl font-black text-emerald-900">Table {stats.busiestTable[0]}</p>
          <p className="mt-1 text-[10px] font-bold text-slate-400">{stats.busiestTable[1]} orders today</p>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Management Panel */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="rounded-[2.5rem] p-8 border-none bg-emerald-900 text-white shadow-2xl shadow-emerald-900/20">
            <h3 className="text-xl font-black tracking-tight mb-6">QUICK SETTINGS</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/60">Daily Security PIN</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={4}
                    value={dailyPin}
                    onChange={(e) => setDailyPin(e.target.value.replace(/\D/g, ''))}
                    className="w-20 rounded-2xl bg-white/10 px-4 py-3 text-center text-xl font-black text-white focus:bg-white/20 outline-none transition-all"
                  />
                  <button onClick={() => updateSetting('daily_pin', dailyPin, setPinStatus)} className="flex-1 rounded-2xl bg-white text-emerald-900 text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all">Save PIN</button>
                </div>
                {pinStatus && <p className="text-[9px] font-bold text-emerald-300">{pinStatus}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/60">Live Promo Banner</label>
                <textarea
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  placeholder="Special offers..."
                  rows={2}
                  className="w-full rounded-2xl bg-white/10 p-4 text-xs font-bold text-white focus:bg-white/20 outline-none transition-all resize-none"
                />
                <button onClick={() => updateSetting('promo', promo, setPromoStatus)} className="w-full rounded-2xl bg-amber-500 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all">Update Promo</button>
                {promoStatus && <p className="text-[9px] font-bold text-emerald-300">{promoStatus}</p>}
              </div>
            </div>
          </Card>

          <Card className="rounded-[2.5rem] p-8 glass-card border-white/50">
            <h3 className="text-xl font-black text-emerald-900 tracking-tight mb-6">{editingId ? 'EDIT ITEM' : 'ADD NEW CUISINE'}</h3>
            <form onSubmit={saveMenuItem} className="space-y-4">
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Item Name" className="input-premium" required />
              <input value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} placeholder="Category" className="input-premium" required />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} placeholder="Price (₹)" className="input-premium" required />
                <select 
                  value={form.is_veg ? 'veg' : 'non-veg'} 
                  onChange={e => setForm(f => ({...f, is_veg: e.target.value === 'veg'}))}
                  className="input-premium"
                >
                  <option value="veg">🟢 Veg</option>
                  <option value="non-veg">🔴 Non-Veg</option>
                </select>
              </div>
              <input value={form.image_url} onChange={e => setForm(f => ({...f, image_url: e.target.value}))} placeholder="Image URL Link" className="input-premium" />
              
              <label className="flex items-center gap-3 px-2 text-[10px] font-black text-emerald-900 uppercase tracking-widest cursor-pointer">
                <input type="checkbox" checked={form.available} onChange={e => setForm(f => ({...f, available: e.target.checked}))} className="h-5 w-5 rounded-lg border-emerald-900/10 text-emerald-600 focus:ring-emerald-500" />
                Available on Menu
              </label>

              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 btn-premium py-4">{editingId ? 'Update' : 'Create'}</button>
                {editingId && <button type="button" onClick={() => {setEditingId(''); setForm(emptyForm);}} className="rounded-2xl bg-slate-100 px-6 font-black text-[10px] text-slate-400 uppercase tracking-widest hover:bg-slate-200">Cancel</button>}
              </div>
            </form>
            {status && <p className="mt-4 text-center text-[10px] font-black text-emerald-600 uppercase tracking-widest">{status}</p>}
          </Card>
        </div>

        {/* Menu Management List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[11px] font-black text-emerald-900/30 uppercase tracking-[0.3em]">Cuisine Collection ({menuItems.length})</h3>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {menuItems.map(item => (
              <div key={item.id} className="group glass-card rounded-[2rem] p-4 flex gap-4 transition-all hover:premium-shadow">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-50">
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="h-full w-full object-cover grayscale-[20%] transition-all group-hover:grayscale-0" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-2xl opacity-20">🍲</div>
                  )}
                </div>
                <div className="flex-1 py-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${item.is_veg !== false ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    <p className="font-black text-emerald-900 leading-tight uppercase tracking-tight text-sm truncate">{item.name}</p>
                  </div>
                  <p className="text-xs font-black text-amber-600 mb-2">{money(item.price)}</p>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => {
                        setEditingId(item.id);
                        setForm({
                          name: item.name,
                          category: item.category,
                          price: String(item.price),
                          available: item.available,
                          is_veg: item.is_veg !== false,
                          image_url: item.image_url || ''
                        });
                        window.scrollTo({ top: 400, behavior: 'smooth' });
                      }}
                      className="text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-800"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="text-[9px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-600"
                    >
                      Remove
                    </button>
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
