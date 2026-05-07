import { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card';
import { API_BASE_URL } from '../api-config';

const emptyForm = {
  name: '',
  category: '',
  price: '',
  available: true
};

export default function AdminPage() {
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [status, setStatus] = useState('');
  const [tableStatus, setTableStatus] = useState('');

  // 1. Force use window.location.origin for QR codes (No more IP addresses)
  const tableLinks = useMemo(() => {
    const baseUrl = window.location.origin;
    return tables.map((table) => ({
      ...table,
      url: `${baseUrl}/table/${table.id}`
    }));
  }, [tables]);

  async function loadMenu() {
    const response = await fetch(`${API_BASE_URL}/api/admin/menu`);
    const data = await response.json();
    setMenuItems(data);
  }

  async function loadTables() {
    const response = await fetch(`${API_BASE_URL}/api/admin/tables`);
    const data = await response.json();
    if (Array.isArray(data)) setTables(data);
  }

  useEffect(() => {
    loadMenu();
    loadTables();
  }, []);

  async function updateTableName(id, newName) {
    setTableStatus('Updating table name...');
    const response = await fetch(`${API_BASE_URL}/api/admin/tables/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    });
    if (response.ok) {
      setTableStatus('Table name updated.');
      loadTables();
    } else {
      setTableStatus('Failed to update table name.');
    }
  }

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

    const response = await fetch(`${API_BASE_URL}/api/admin/menu/${id}`, { method: 'DELETE' });
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
        <p className="mt-1 text-sm text-slate-600">Manage your restaurant menu and table QR codes.</p>
      </Card>

      {/* Table Management Section */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-bold">Tables & QR Codes</h3>
          {tableStatus ? <span className="text-xs font-semibold text-emerald-600">{tableStatus}</span> : null}
        </div>
        <p className="mt-1 text-sm text-slate-600">Rename tables and download QR codes for customers.</p>
        
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tableLinks.map((table) => (
            <div key={table.id} className="rounded-2xl border border-white/80 bg-white p-4 shadow-soft flex flex-col items-center">
              <input 
                type="text"
                defaultValue={table.name}
                onBlur={(e) => {
                  if (e.target.value !== table.name) {
                    updateTableName(table.id, e.target.value);
                  }
                }}
                className="w-full text-center font-bold bg-slate-50 border-none rounded-lg py-1 focus:ring-2 focus:ring-hotel-dusk"
              />
              <img
                className="mx-auto mt-3 h-32 w-32 rounded-lg border border-slate-100"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(table.url)}`}
                alt={`QR ${table.name}`}
              />
              <p className="mt-2 text-[10px] text-slate-400 font-mono uppercase tracking-widest">{table.id}</p>
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
