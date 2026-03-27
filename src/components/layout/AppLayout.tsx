import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: '240px', overflowY: 'auto', backgroundColor: 'var(--bg-primary)' }}>
        <Outlet />
      </main>
    </div>
  );
}
