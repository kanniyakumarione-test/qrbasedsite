import { useEffect, useState } from 'react';
import Card from '../components/Card';
import { API_BASE_URL } from '../api-config';

const emptyForm = {
  name: '',
  category: '',
  price: '',
  available: true
};

export default function AdminPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [dailyPin, setDailyPin] = useState('');
  const [pinStatus, setPinStatus] = useState('');

  async function loadPin() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/settings/daily_pin`);
      const data = await response.json();
      setDailyPin(data.value || '');
    } catch (err) {}
  }

  async function loadMenu() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/menu`);
      if (!response.ok) throw new Error('Failed to load menu');
      const data = await response.json();
      setMenuItems(data);
      setError('');
    } catch (err) {
      setError('Connection error: Could not load menu items.');
    }
  }

  useEffect(() => {
    loadMenu();
    loadPin();
  }, []);

  function resetForm() {
    setEditingId('');
    setForm(emptyForm);
  }

  async function saveMenuItem(e) {
    e.preventDefault();
    setStatus('Saving...');

    const payload = {
      name: form.name,
      category: form.category,
      price: Number(form.price),
      available: !!form.available
    };

    try {
      const isEdit = Boolean(editingId);
      const response = await fetch(isEdit ? `${API_BASE_URL}/api/admin/menu/${editingId}` : `${API_BASE_URL}/api/admin/menu`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) {
        setStatus(result.error || 'Could not save menu item');
        return;
      }

      setStatus(isEdit ? 'Menu item updated.' : 'Menu item created.');
      resetForm();
      loadMenu();
    } catch (err) {
      setStatus('Network error: Failed to save.');
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      price: String(item.price),
      available: item.available
    });
  }

  async function removeItem(id) {
    const ok = window.confirm('Delete this menu item?');
    if (!ok) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/menu/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
      if (editingId === id) resetForm();
      setStatus('Menu item deleted.');
      loadMenu();
    } catch (err) {
      setStatus('Network error: Could not delete.');
    }
  }

  async function updatePin(e) {
    e.preventDefault();
    setPinStatus('Saving PIN...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/settings/daily_pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: dailyPin })
      });
      if (response.ok) {
        setPinStatus('PIN updated successfully.');
      } else {
        setPinStatus('Failed to update PIN.');
      }
    } catch (err) {
      setPinStatus('Error updating PIN.');
    }
  }

  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Menu Management</h2>
          {error ? <span className="text-sm font-bold text-rose-600">{error}</span> : null}
        </div>
        <p className="mt-1 text-sm text-slate-600">Add, edit, or remove items from your digital menu.</p>
      </Card>

      <Card>
        <h3 className="text-xl font-bold">Security Settings (Daily PIN)</h3>
        <p className="text-sm text-slate-600">Enter a 4-digit PIN that customers must use to place orders. Change this daily to prevent home orders.</p>
        <form onSubmit={updatePin} className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            maxLength={4}
            value={dailyPin}
            onChange={(e) => setDailyPin(e.target.value.replace(/\D/g, ''))}
            placeholder="e.g. 1234"
            className="input-base w-32 text-center text-xl font-bold tracking-widest"
          />
          <button type="submit" className="btn-accent">Save Security PIN</button>
          {pinStatus && <span className="text-sm font-semibold text-emerald-700">{pinStatus}</span>}
        </form>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-xl font-bold">{editingId ? 'Edit Menu Item' : 'Create Menu Item'}</h3>
          <form onSubmit={saveMenuItem} className="mt-4 space-y-3">
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Item name"
              className="input-base w-full"
              required
            />
            <input
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              placeholder="Category"
              className="input-base w-full"
              required
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
              placeholder="Price"
              className="input-base w-full"
              required
            />
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.available}
                onChange={(e) => setForm((prev) => ({ ...prev, available: e.target.checked }))}
              />
              Available for customers
            </label>

            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-accent">{editingId ? 'Update Item' : 'Create Item'}</button>
              {editingId ? (
                <button type="button" onClick={resetForm} className="btn-muted">Cancel Edit</button>
              ) : null}
            </div>
          </form>
          {status ? <p className="mt-3 text-sm text-slate-600">{status}</p> : null}
        </Card>

        <Card>
          <h3 className="text-xl font-bold">Menu Items</h3>
          <p className="text-sm text-slate-600">List of all items on your menu.</p>
          <div className="mt-4 space-y-2">
            {menuItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/80 bg-white p-3 shadow-soft">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.category} | Rs. {Number(item.price).toFixed(2)}</p>
                    <p className={`mt-1 text-xs font-semibold ${item.available ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {item.available ? 'Available' : 'Unavailable'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-muted px-3 py-1.5 text-xs" onClick={() => startEdit(item)}>Edit</button>
                    <button className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => removeItem(item.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {!menuItems.length && !error ? <p className="text-sm text-slate-600">No menu items yet.</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
