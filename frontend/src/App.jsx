import { Navigate, Route, Routes } from 'react-router-dom';
import HeaderNav from './components/HeaderNav';
import KitchenPage from './pages/KitchenPage';
import NotFoundPage from './pages/NotFoundPage';
import AdminPage from './pages/AdminPage';
import MenuPage from './pages/MenuPage';
import TableOrderPage from './pages/TableOrderPage';
import TablesPage from './pages/TablesPage';

function App() {
  return (
    <div className="min-h-screen">
      <HeaderNav />
      <main className="mx-auto max-w-[1200px] px-6 py-6 md:py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/tables" element={<TablesPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/table/:tableId" element={<TableOrderPage />} />
          <Route path="/kitchen" element={<KitchenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
