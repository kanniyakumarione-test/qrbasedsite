import { useEffect, useState } from 'react';
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
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function loadMenu() {
    try {
      const menuRes = await fetch(`${API_BASE_URL}/api/admin/menu`);
      setMenuItems(await menuRes.json());
      setError('');
    } catch (err) {
      setError('Connection error: Could not load menu.');
    }
  }

  useEffect(() => { loadMenu(); }, []);

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
      setStatus(isEdit ? 'Updated' : 'Created');
      setEditingId('');
      setForm(emptyForm);
      loadMenu();
      setTimeout(() => setStatus(''), 2000);
    } catch (err) { setStatus('Error'); }
  }

  async function removeItem(id) {
    if (!window.confirm('Delete this item?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/admin/menu/${id}`, { method: 'DELETE' });
      loadMenu();
    } catch (err) { alert('Delete failed.'); }
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-2 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cuisine Management</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Add and manage your digital menu items</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Management Tools */}
        <div className="lg:col-span-4 sticky top-20">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 mb-6 uppercase tracking-widest">
              {editingId ? 'Modify Item' : 'New Cuisine Item'}
            </h3>
            <form onSubmit={saveMenuItem} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Item Name</label>
                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Chicken Biryani" className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Category</label>
                <input value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} placeholder="e.g. Main Course" className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Price (₹)</label>
                   <input type="number" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-sm font-semibold outline-none" required />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Type</label>
                   <select value={form.is_veg ? 'veg' : 'non'} onChange={e => setForm(f => ({...f, is_veg: e.target.value === 'veg'}))} className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-sm font-semibold outline-none">
                     <option value="veg">🟢 Veg</option>
                     <option value="non">🔴 Non-Veg</option>
                   </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Photo Link</label>
                <input value={form.image_url} onChange={e => setForm(f => ({...f, image_url: e.target.value}))} placeholder="https://..." className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-sm font-semibold outline-none" />
              </div>
              
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                  {editingId ? 'Save Changes' : 'Create Item'}
                </button>
                {editingId && (
                  <button type="button" onClick={() => {setEditingId(''); setForm(emptyForm);}} className="px-4 bg-slate-100 rounded-xl font-bold text-[10px] text-slate-500 uppercase">Cancel</button>
                )}
              </div>
              {status && <p className="text-center text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-2">{status}</p>}
            </form>
          </div>
        </div>

        {/* Cuisine List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-2">
             <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Digital Menu ({menuItems.length} items)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menuItems.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-all group flex items-center gap-4">
                <div className="h-16 w-16 shrink-0 rounded-xl bg-slate-100 overflow-hidden relative border border-slate-50">
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-2xl grayscale opacity-30">🍲</div>
                  )}
                  <div className={`absolute top-1 left-1 h-2 w-2 rounded-full border border-white ${item.is_veg !== false ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</p>
                      <h3 className="text-sm font-bold text-slate-900 truncate leading-tight">{item.name}</h3>
                    </div>
                    <p className="text-sm font-bold text-indigo-600">{money(item.price)}</p>
                  </div>
                  
                  <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-all pt-2 mt-2 border-t border-slate-50">
                    <button 
                      onClick={() => {
                        setEditingId(item.id);
                        setForm({...item, price: String(item.price), is_veg: item.is_veg !== false, image_url: item.image_url || ''});
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }} 
                      className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => removeItem(item.id)} 
                      className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-rose-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {menuItems.length === 0 && !error && (
            <div className="text-center py-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No items found in menu</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
