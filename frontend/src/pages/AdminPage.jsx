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
      // Load Menu
      const menuRes = await fetch(`${API_BASE_URL}/api/admin/menu`);
      setMenuItems(await menuRes.json());
      
      // Load Pin
      const pinRes = await fetch(`${API_BASE_URL}/api/admin/settings/daily_pin`);
      setDailyPin((await pinRes.json()).value || '');

      // Load Promo
      const promoRes = await fetch(`${API_BASE_URL}/api/admin/settings/promo`);
      setPromo((await promoRes.json()).value || '');

      // Load Analytics
      const anaRes = await fetch(`${API_BASE_URL}/api/admin/analytics`);
      setAnalytics(await anaRes.json());

      setError('');
    } catch (err) {
      setError('Connection error: Could not load data.');
    }
  }

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 30000); // Refresh analytics every 30s
    return () => clearInterval(timer);
  }, []);

  // Compute Analytics
  const stats = useMemo(() => {
    let totalRevenue = 0;
    const itemSales = {};
    const tableSales = {};

    analytics.forEach(order => {
      totalRevenue += Number(order.totalamount || 0);
      
      // Items popularity
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
      items.forEach(item => {
        itemSales[item.name] = (itemSales[item.name] || 0) + item.quantity;
      });

      // Table popularity
      const tId = order.tableid || 'Unknown';
      tableSales[tId] = (tableSales[tId] || 0) + 1;
    });

    const bestSeller = Object.entries(itemSales).sort((a, b) => b[1] - a[1])[0] || ['None', 0];
    const busiestTable = Object.entries(tableSales).sort((a, b) => b[1] - a[1])[0] || ['None', 0];

    return { totalRevenue, bestSeller, busiestTable };
  }, [analytics]);

  function resetForm() {
    setEditingId('');
    setForm(emptyForm);
  }

  async function saveMenuItem(e) {
    e.preventDefault();
    setStatus('Saving...');
    try {
      const isEdit = Boolean(editingId);
      const response = await fetch(isEdit ? `${API_BASE_URL}/api/admin/menu/${editingId}` : `${API_BASE_URL}/api/admin/menu`, {
        method: isEdit ? 'PUT' : 'headers' in { 'Content-Type': 'application/json' } ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, price: Number(form.price) })
      });
      if (!response.ok) throw new Error('Failed');
      setStatus(isEdit ? 'Updated.' : 'Created.');
      resetForm();
      loadData();
    } catch (err) {
      setStatus('Error saving item.');
    }
  }

  async function updateSetting(key, value, setter) {
    setter('Saving...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/settings/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });
      if (response.ok) setter('Saved successfully.');
      else setter('Failed to save.');
    } catch (err) { setter('Error.'); }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      price: String(item.price),
      available: item.available,
      is_veg: item.is_veg !== false,
      image_url: item.image_url || ''
    });
  }

  async function removeItem(id) {
    if (!window.confirm('Delete this item?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/admin/menu/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) { alert('Delete failed.'); }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none shadow-lg">
          <p className="text-xs font-bold uppercase tracking-wider opacity-80">Total Revenue</p>
          <p className="mt-1 text-3xl font-black">{money(stats.totalRevenue)}</p>
          <p className="mt-2 text-[10px] opacity-60 italic">Total from all orders</p>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-none shadow-lg">
          <p className="text-xs font-bold uppercase tracking-wider opacity-80">Best Seller</p>
          <p className="mt-1 text-xl font-black truncate">{stats.bestSeller[0]}</p>
          <p className="mt-2 text-[10px] font-bold opacity-80">{stats.bestSeller[1]} plates sold</p>
        </Card>
        <Card className="bg-gradient-to-br from-rose-500 to-pink-600 text-white border-none shadow-lg">
          <p className="text-xs font-bold uppercase tracking-wider opacity-80">Busiest Table</p>
          <p className="mt-1 text-2xl font-black">Table {stats.busiestTable[0]}</p>
          <p className="mt-2 text-[10px] font-bold opacity-80">{stats.busiestTable[1]} orders today</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Settings Column */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <span className="text-2xl">🔒</span> Security PIN
            </h3>
            <p className="mt-1 text-xs text-slate-500 font-medium">Customer must enter this to place an order.</p>
            <div className="mt-4 flex items-center gap-3">
              <input
                type="text"
                maxLength={4}
                value={dailyPin}
                onChange={(e) => setDailyPin(e.target.value.replace(/\D/g, ''))}
                className="w-24 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center text-xl font-bold tracking-widest text-slate-700"
              />
              <button onClick={() => updateSetting('daily_pin', dailyPin, setPinStatus)} className="rounded-xl bg-slate-800 px-6 py-3 text-sm font-bold text-white hover:bg-slate-700 transition-all active:scale-95">Save PIN</button>
            </div>
            {pinStatus && <p className="mt-2 text-[10px] font-bold text-emerald-600">{pinStatus}</p>}
          </Card>

          <Card>
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <span className="text-2xl">📢</span> Promo Banner
            </h3>
            <p className="mt-1 text-xs text-slate-500 font-medium">Scrolling text for customers (e.g. "Buy 1 Get 1 Free!")</p>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={promo}
                onChange={(e) => setPromo(e.target.value)}
                placeholder="Enter special offer text..."
                className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-amber-400 outline-none"
              />
              <button onClick={() => updateSetting('promo', promo, setPromoStatus)} className="w-full rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-white hover:bg-amber-600 transition-all active:scale-95 shadow-md shadow-amber-100">Update Banner</button>
            </div>
            {promoStatus && <p className="mt-2 text-[10px] font-bold text-emerald-600">{promoStatus}</p>}
          </Card>

          <Card>
            <h3 className="text-xl font-black text-slate-800 mb-4">{editingId ? '📝 Edit Item' : '➕ Add Item'}</h3>
            <form onSubmit={saveMenuItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Item Name" className="rounded-xl bg-slate-50 p-3 text-sm border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-emerald-400 outline-none" required />
                <input value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} placeholder="Category" className="rounded-xl bg-slate-50 p-3 text-sm border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-emerald-400 outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} placeholder="Price (₹)" className="rounded-xl bg-slate-50 p-3 text-sm border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-emerald-400 outline-none" required />
                <select 
                  value={form.is_veg ? 'veg' : 'non-veg'} 
                  onChange={e => setForm(f => ({...f, is_veg: e.target.value === 'veg'}))}
                  className="rounded-xl bg-slate-50 p-3 text-sm border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-emerald-400 outline-none"
                >
                  <option value="veg">🟢 Veg</option>
                  <option value="non-veg">🔴 Non-Veg</option>
                </select>
              </div>
              <input value={form.image_url} onChange={e => setForm(f => ({...f, image_url: e.target.value}))} placeholder="Image URL (Link to photo)" className="w-full rounded-xl bg-slate-50 p-3 text-sm border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-emerald-400 outline-none" />
              
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <input type="checkbox" checked={form.available} onChange={e => setForm(f => ({...f, available: e.target.checked}))} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                Available for Order
              </label>

              <div className="flex gap-2">
                <button type="submit" className="flex-1 rounded-xl bg-emerald-600 py-3 font-bold text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all">{editingId ? 'Update Item' : 'Save Item'}</button>
                {editingId && <button type="button" onClick={resetForm} className="rounded-xl bg-slate-200 px-4 py-3 font-bold text-slate-600">Cancel</button>}
              </div>
            </form>
            {status && <p className="mt-3 text-center text-xs font-bold text-slate-400">{status}</p>}
          </Card>
        </div>

        {/* Menu List Column */}
        <div className="space-y-4">
          <h3 className="text-xl font-black text-slate-800">Current Menu ({menuItems.length})</h3>
          <div className="grid gap-3">
            {menuItems.map(item => (
              <div key={item.id} className="group relative flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm border border-slate-50">
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="h-14 w-14 rounded-xl object-cover shadow-sm" />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-slate-50 flex items-center justify-center text-xl">🍲</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className={`h-2 w-2 rounded-full ${item.is_veg !== false ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    <p className="font-bold text-slate-800 truncate">{item.name}</p>
                  </div>
                  <p className="text-xs font-bold text-amber-600">{money(item.price)}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(item)} className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200">✏️</button>
                  <button onClick={() => removeItem(item.id)} className="rounded-lg bg-rose-50 p-2 text-rose-600 hover:bg-rose-100">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
