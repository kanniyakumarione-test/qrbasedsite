import { useMemo, useState } from 'react';
import Card from '../components/Card';
import { SERVER_IP } from '../ip-config';

export default function TablesPage() {
  const [count, setCount] = useState(5);
  const [generatedCount, setGeneratedCount] = useState(5);

  const tableLinks = useMemo(() => {
    const baseUrl = typeof SERVER_IP !== 'undefined' 
      ? `http://${SERVER_IP}:5173` 
      : window.location.origin;
    return Array.from({ length: Math.max(1, Math.min(200, generatedCount)) }, (_, i) => {
      const id = i + 1;
      const url = `${baseUrl}/table/T${id}`;
      return { id, url };
    });
  }, [generatedCount]);

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Table QR Codes</h2>
          <p className="mt-1 text-sm text-slate-600">Generate table links and display QR for guests to scan.</p>
        </div>
        <label className="text-sm font-semibold text-slate-600">
          Table Count
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(Number(e.target.value || 1))}
            min={1}
            max={200}
            className="input-base ml-0 mt-1 w-24 sm:ml-2 sm:mt-0"
          />
        </label>
        <button className="btn-accent" onClick={() => setGeneratedCount(count)}>
          Generate QR
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tableLinks.map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/80 bg-white p-4 text-center shadow-soft">
            <h3 className="text-sm font-extrabold text-slate-700">Table T{item.id}</h3>
            <img
              className="mx-auto mt-3 h-36 w-36 rounded-lg border border-slate-100"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(item.url)}`}
              alt={`QR T${item.id}`}
            />
            <a className="mt-3 block text-xs font-semibold text-slate-600 underline" href={item.url} target="_blank" rel="noreferrer">
              Open Table Link
            </a>
          </div>
        ))}
      </div>
    </Card>
  );
}
