import { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card';
import { API_BASE_URL } from '../api-config';

export default function TablesPage() {
  const [tables, setTables] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const tableLinks = useMemo(() => {
    const baseUrl = window.location.origin;
    return tables.map((table) => ({
      ...table,
      url: `${baseUrl}/table/${table.id}`
    }));
  }, [tables]);

  async function loadTables() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/tables`);
      if (!response.ok) throw new Error('Failed to load tables');
      const data = await response.json();
      if (Array.isArray(data)) setTables(data);
      setError('');
    } catch (err) {
      setError('Could not connect to backend. Make sure your database is ready.');
    }
  }

  useEffect(() => {
    loadTables();
  }, []);

  async function updateTableName(id, newName) {
    setStatus('Updating...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/tables/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      if (response.ok) {
        setStatus('Saved.');
        loadTables();
      } else {
        setStatus('Error.');
      }
    } catch (err) {
      setStatus('Network Error.');
    }
  }

  async function addTable() {
    const name = prompt('Enter Table Name (e.g. Table 10):');
    if (!name) return;
    setStatus('Adding table...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, id: `T${Date.now().toString().slice(-4)}` })
      });
      if (response.ok) {
        setStatus('Table added.');
        loadTables();
      }
    } catch (err) {
      setStatus('Failed to add.');
    }
  }

  async function deleteTable(id) {
    if (!window.confirm('Are you sure you want to delete this table? The QR code will stop working.')) return;
    setStatus('Deleting...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/tables/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setStatus('Deleted.');
        loadTables();
      }
    } catch (err) {
      setStatus('Failed to delete.');
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Table QR Codes</h2>
          <p className="mt-1 text-sm text-slate-600">Scan these QR codes at the table to place orders.</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={addTable} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition-all active:scale-95">
            + Add New Table
          </button>
          <div className="flex flex-col items-end text-xs font-bold">
            {status ? <span className="text-emerald-600">{status}</span> : null}
            {error ? <span className="text-rose-600">{error}</span> : null}
          </div>
        </div>
      </div>

      {!tables.length && !error ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">No tables found. Please run the SQL setup in Supabase.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tableLinks.map((table) => (
            <div key={table.id} className="group relative rounded-2xl border border-white/80 bg-white p-4 text-center shadow-soft flex flex-col items-center">
              <button 
                onClick={() => deleteTable(table.id)}
                className="absolute top-2 right-2 p-2 text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                title="Delete Table"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
              </button>

              <input 
                type="text"
                defaultValue={table.name}
                onBlur={(e) => {
                  if (e.target.value !== table.name) {
                    updateTableName(table.id, e.target.value);
                  }
                }}
                className="w-full text-center font-bold bg-slate-50 border-none rounded-lg py-1 focus:ring-2 focus:ring-emerald-400 mb-2"
              />
              <div className="bg-white p-2 rounded-xl shadow-inner border border-slate-50">
                <img
                  className="mx-auto h-32 w-32"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(table.url)}`}
                  alt={`QR ${table.name}`}
                />
              </div>
              <p className="mt-3 text-[10px] text-slate-400 font-mono uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">ID: {table.id}</p>
              
              <a 
                href={table.url} 
                target="_blank" 
                rel="noreferrer"
                className="mt-3 text-[10px] font-bold text-emerald-600 hover:underline"
              >
                Open Table Link ↗
              </a>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
