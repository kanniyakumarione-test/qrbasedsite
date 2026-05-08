import { useEffect, useMemo, useState } from 'react';
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
      if (!response.ok) throw new Error('Failed');
      setTables(await response.json());
      setError('');
    } catch (err) {
      setError('Could not connect to database.');
    }
  }

  useEffect(() => { loadTables(); }, []);

  async function addTable() {
    const name = prompt('Table Name (e.g. Table 05):');
    if (!name) return;
    setStatus('Adding...');
    try {
      await fetch(`${API_BASE_URL}/api/admin/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      loadTables();
      setStatus('Success');
      setTimeout(() => setStatus(''), 2000);
    } catch (err) { setStatus('Error'); }
  }

  async function deleteTable(id) {
    if (!window.confirm('Delete this QR code?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/admin/tables/${id}`, { method: 'DELETE' });
      loadTables();
    } catch (err) {}
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-2 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Table QR Management</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Generate permanent scan-to-order codes</p>
        </div>
        <div className="flex items-center gap-3">
          {status && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">{status}</span>}
          <button onClick={addTable} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95">
            + Add Table
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {tableLinks.map((table) => (
          <div key={table.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:border-indigo-200 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">{table.name}</h3>
              <button onClick={() => deleteTable(table.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-4">
              <img
                className="mx-auto h-32 w-32 mix-blend-multiply group-hover:scale-105 transition-transform"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(table.url)}`}
                alt={table.name}
              />
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 overflow-hidden">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center truncate">{table.url}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => window.open(table.url, '_blank')}
                  className="flex-1 bg-white border border-slate-200 py-2 rounded-lg text-[9px] font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Test
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex-1 bg-indigo-50 border border-indigo-100 py-2 rounded-lg text-[9px] font-bold text-indigo-600 hover:bg-indigo-100 transition-all"
                >
                  Print
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tables.length === 0 && !error && (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-medium">No tables found. Click "+ New Table" to start.</p>
        </div>
      )}
      
      {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-center text-sm font-bold">{error}</div>}
    </div>
  );
}
