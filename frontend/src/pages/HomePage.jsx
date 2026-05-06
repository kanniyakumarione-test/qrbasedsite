import { Link } from 'react-router-dom';
import Card from '../components/Card';

export default function HomePage() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="relative overflow-hidden md:col-span-3">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-hotel-clay/20 blur-2xl" />
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Smart Floor Service</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-extrabold leading-tight md:text-4xl">Modern QR Menu Flow For Fast Kitchen Operations</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base">
          Every table has a dedicated QR. Guests order directly and kitchen gets live updates without manual callouts.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/tables" className="btn-primary">Generate Table QR</Link>
          <Link to="/kitchen" className="btn-muted">Open Kitchen</Link>
        </div>
      </Card>

      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">01</p>
        <h2 className="mt-2 text-lg font-bold">Table Setup</h2>
        <p className="mt-2 text-sm text-slate-600">Create and print QR per table in one screen.</p>
      </Card>

      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">02</p>
        <h2 className="mt-2 text-lg font-bold">Kitchen Queue</h2>
        <p className="mt-2 text-sm text-slate-600">Track NEW, PREPARING, READY with one-tap updates.</p>
      </Card>

      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">03</p>
        <h2 className="mt-2 text-lg font-bold">Kitchen Ready View</h2>
        <p className="mt-2 text-sm text-slate-600">Kitchen handles order flow from NEW to READY.</p>
      </Card>
    </div>
  );
}
