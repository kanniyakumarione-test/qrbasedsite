import { Link } from 'react-router-dom';
import Card from '../components/Card';

export default function NotFoundPage() {
  return (
    <Card className="text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">404</p>
      <h2 className="mt-2 text-2xl font-bold">Page Not Found</h2>
      <p className="mt-2 text-sm text-slate-600">The page you are looking for does not exist in this app.</p>
      <Link to="/" className="btn-primary mt-4">Go Home</Link>
    </Card>
  );
}
