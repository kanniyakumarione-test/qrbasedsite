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
      url: `${baseUrl}/order/${table.id}`
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
      setError('Could not connect to backend.');
    }
  }

  useEffect(() => { loadTables(); }, []);

  async function addTable() {
    const name = prompt('Enter Table Name (e.g. Table 01):');
    if (!name) return;
    setStatus('Adding...');
    try {
      await fetch(`${API_BASE_URL}/api/admin/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      loadTables();
      setStatus('Added.');
    } catch (err) { setStatus('Failed.'); }
  }

  async function deleteTable(id) {
    if (!window.confirm('Delete this luxury table stand?')) return;
    setStatus('Removing...');
    try {
      await fetch(`${API_BASE_URL}/api/admin/tables/${id}`, { method: 'DELETE' });
      loadTables();
      setStatus('Removed.');
    } catch (err) { setStatus('Failed.'); }
  }

  return (
    <div className="space-y-10 pb-20 animate-slide-up">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black text-emerald-900 tracking-tighter uppercase">QR STANDS</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">High-end Table Generators</p>
        </div>
        <div className="flex items-center gap-4">
          {status && <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{status}</span>}
          <button onClick={addTable} className="btn-premium px-8 py-3 text-[10px] uppercase tracking-widest">+ New Stand</button>
        </div>
      </div>

      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tableLinks.map((table) => (
          <div key={table.id} className="group relative">
            {/* Premium Stand Design */}
            <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-50 transition-all hover:premium-shadow flex flex-col items-center">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-emerald-900 tracking-tighter uppercase">{table.name}</h2>
                <div className="h-1 w-8 bg-amber-500 mx-auto mt-4 rounded-full"></div>
              </div>

              <div className="mx-auto flex aspect-square w-full max-w-[180px] items-center justify-center rounded-[2.5rem] bg-emerald-50 p-6 shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/5 to-transparent"></div>
                <img
                  className="relative z-10 h-full w-full grayscale-[50%] contrast-[120%] group-hover:grayscale-0 transition-all"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(table.url)}`}
                  alt={table.name}
                />
              </div>

              <div className="mt-8 text-center space-y-2">
                <p className="text-[10px] font-black text-emerald-900/40 uppercase tracking-[0.3em]">Scan for Fine Dining</p>
                <div className="h-4"></div>
                <p className="text-[8px] font-bold text-slate-300 break-all truncate max-w-[150px]">{table.url}</p>
              </div>

              <div className="mt-10 pt-6 border-t border-slate-50 w-full flex justify-between items-center px-2">
                <button 
                  onClick={() => window.open(table.url, '_blank')}
                  className="text-[9px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-800"
                >
                  Preview
                </button>
                <button 
                  onClick={() => deleteTable(table.id)}
                  className="text-[9px] font-black text-rose-300 uppercase tracking-widest hover:text-rose-500"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Premium Seal */}
            <div className="absolute -top-3 -right-3 bg-emerald-900 text-white text-[8px] font-black px-4 py-2 rounded-full shadow-lg rotate-6 border border-white/20">
              PRABHU EXCLUSIVE
            </div>
          </div>
        ))}
      </div>

      {tables.length === 0 && (
        <div className="text-center py-32 glass-card rounded-[3rem] border-dashed border-slate-200">
          <p className="text-5xl mb-6 opacity-30">🏺</p>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Ready to generate luxury stands</p>
        </div>
      )}
    </div>
  );
}
