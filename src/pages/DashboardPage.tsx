import { useAuthStore } from '../store/auth.store';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Hoş geldiniz, {user?.firstName} 👋
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Bugünkü ticket durumunuza genel bakış
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Açık Ticketlar', value: '—', color: '#6366f1' },
          { label: 'Bekleyen', value: '—', color: '#f59e0b' },
          { label: 'SLA İhlali', value: '—', color: '#ef4444' },
          { label: 'Bugün Kapanan', value: '—', color: '#22c55e' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-5 border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border)',
            }}
          >
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{stat.label}</p>
            <p className="text-3xl font-bold mt-2" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div
        className="rounded-xl p-6 border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border)',
        }}
      >
        <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
          Dashboard istatistikleri yakında eklenecek...
        </p>
      </div>
    </div>
  );
}
