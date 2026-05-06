import { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card';
import { SERVER_IP } from '../ip-config';

const emptyForm = {
  name: '',
  category: '',
  price: '',
  available: true
};

export default function AdminPage() {
  const [tableCount, setTableCount] = useState(5);
  const [generatedCount, setGeneratedCount] = useState(5);
  const [menuItems, setMenuItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [status, setStatus] = useState('');

  const tableLinks = useMemo(() => {
    const baseUrl = typeof SERVER_IP !== 'undefined' 
      ? `http://${SERVER_IP}:5173` 
      : window.location.origin;
    return Array.from({ length: Math.max(1, Math.min(300, generatedCount)) }, (_, i) => {
      const id = i + 1;
      const tableId = `T${id}`;
      const url = `${baseUrl}/table/${tableId}`;
      return { id: tableId, url };
    });
  }, [generatedCount]);

  async function loadMenu() {
    const response = await fetch('/api/admin/menu');
    const data = await response.json();
    setMenuItems(data);
  }

  useEffect(() => {
    loadMenu();
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

    const isEdit = Boolean(editingId);
    const response = await fetch(isEdit ? `/api/admin/menu/${editingId}` : '/api/admin/menu', {
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

    const response = await fetch(`/api/admin/menu/${id}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) {
      setStatus(result.error || 'Could not delete item');
      return;
    }

    if (editingId === id) resetForm();
    setStatus('Menu item deleted.');
    loadMenu();
  }

  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-2xl font-bold">Admin Panel</h2>
        <p className="mt-1 text-sm text-slate-600">Generate fresh table QR links and manage menu items with full CRUD.</p>
      </Card>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold">Generate Table QR</h3>
            <p className="text-sm text-slate-600">Set table count to regenerate all table QR links.</p>
          </div>
          <label className="text-sm font-semibold text-slate-600">
            Total Tables
            <input
              type="number"
              min={1}
              max={300}
              value={tableCount}
              onChange={(e) => setTableCount(Number(e.target.value || 1))}
              className="input-base ml-0 mt-1 w-24 sm:ml-2 sm:mt-0"
            />
          </label>
          <button className="btn-accent" onClick={() => setGeneratedCount(tableCount)}>
            Generate QR
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {tableLinks.map((table) => (
            <div key={table.id} className="rounded-2xl border border-white/80 bg-white p-3 text-center shadow-soft">
              <p className="text-sm font-bold">{table.id}</p>
              <img
                className="mx-auto mt-2 h-28 w-28 rounded-lg border border-slate-100"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(table.url)}`}
                alt={`QR ${table.id}`}
              />
              <a className="mt-2 block text-xs text-slate-600 underline" href={table.url} target="_blank" rel="noreferrer">
                Open Link
              </a>
            </div>
          ))}
        </div>
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
          <p className="text-sm text-slate-600">All items including unavailable ones.</p>
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
            {!menuItems.length ? <p className="text-sm text-slate-600">No menu items yet.</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
