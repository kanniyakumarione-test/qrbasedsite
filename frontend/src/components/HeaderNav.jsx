import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/admin', label: 'Admin' },
  { path: '/tables', label: 'Table QR' },
  { path: '/kitchen', label: 'Kitchen' }
];

export default function HeaderNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-hotel-dusk text-sm font-extrabold text-white">PH</div>
          <div>
            <p className="text-base font-extrabold leading-none">Prabhu Hotel</p>
            <p className="text-xs text-slate-500">QR Ordering Console</p>
          </div>
        </div>
        <nav className="flex w-full flex-nowrap gap-2 overflow-x-auto pb-1 md:w-auto md:pb-0">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  isActive ? 'bg-hotel-dusk text-white shadow-soft' : 'bg-white text-slate-700 hover:bg-slate-100'
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
