export function money(v) {
  return `Rs. ${Number(v || 0).toFixed(2)}`;
}

export function statusStyle(status) {
  const map = {
    NEW: 'bg-rose-100 text-rose-700 border border-rose-200',
    PREPARING: 'bg-amber-100 text-amber-700 border border-amber-200',
    READY: 'bg-lime-100 text-lime-700 border border-lime-200',
    BILLED: 'bg-emerald-100 text-emerald-700 border border-emerald-200'
  };
  return map[status] || 'bg-slate-100 text-slate-700 border border-slate-200';
}
