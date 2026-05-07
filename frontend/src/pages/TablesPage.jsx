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

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Table QR Codes</h2>
          <p className="mt-1 text-sm text-slate-600">Scan these QR codes at the table to place orders.</p>
        </div>
        <div className="flex items-center gap-2">
          {status ? <span className="text-xs font-bold text-emerald-600">{status}</span> : null}
          {error ? <span className="text-xs font-bold text-rose-600">{error}</span> : null}
        </div>
      </div>

      {!tables.length && !error ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">No tables found. Please run the SQL setup in Supabase.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tableLinks.map((table) => (
            <div key={table.id} className="rounded-2xl border border-white/80 bg-white p-4 text-center shadow-soft flex flex-col items-center">
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
                className="mx-auto mt-3 h-36 w-36 rounded-lg border border-slate-100"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(table.url)}`}
                alt={`QR ${table.name}`}
              />
              <p className="mt-2 text-[10px] text-slate-400 font-mono uppercase tracking-widest">{table.id}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
