import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/admin', label: 'Admin' },
  { path: '/menu', label: 'Menu' },
  { path: '/tables', label: 'Table QR' },
  { path: '/kitchen', label: 'Kitchen' }
];

export default function HeaderNav() {
  const location = useLocation();

  // Hide the admin header entirely on customer-facing table pages
  const isTablePage = location.pathname.startsWith('/table/');
  if (isTablePage) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-[10px] font-black text-white shadow-lg shadow-indigo-100">PH</div>
          <div>
            <p className="text-sm font-bold leading-none text-slate-900 tracking-tight">Prabhu Hotel</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Management Suite</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto no-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                  isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
