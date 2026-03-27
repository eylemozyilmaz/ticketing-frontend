import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ticketsApi } from '../api/tickets';

const priorityColors: Record<string, string> = {
  LOW: '#22c55e',
  NORMAL: '#6366f1',
  HIGH: '#f59e0b',
  URGENT: '#ef4444',
};

const priorityLabels: Record<string, string> = {
  LOW: 'Düşük',
  NORMAL: 'Normal',
  HIGH: 'Yüksek',
  URGENT: 'Acil',
};

export default function TicketsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', { search, priority, page }],
    queryFn: () => ticketsApi.list({ search, priority, page, limit: 25 }),
  });

  const tickets = data?.data?.data || [];
  const meta = data?.data?.meta;

  return (
    <div className="p-8">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Ticketlar
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {meta?.total ?? '—'} ticket
          </p>
        </div>
        <button
          onClick={() => navigate('/tickets/new')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Yeni Ticket
        </button>
      </div>

      {/* Filtreler */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Ticket ara..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 px-4 py-2 rounded-lg border text-sm"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        />
        <select
          value={priority}
          onChange={(e) => { setPriority(e.target.value); setPage(1); }}
          className="px-4 py-2 rounded-lg border text-sm"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <option value="">Tüm Öncelikler</option>
          <option value="URGENT">Acil</option>
          <option value="HIGH">Yüksek</option>
          <option value="NORMAL">Normal</option>
          <option value="LOW">Düşük</option>
        </select>
      </div>

      {/* Tablo */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: `1px solid var(--border)` }}>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Ticket No</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Konu</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Müşteri</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Atanan</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Statü</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Öncelik</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Tarih</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
                  Yükleniyor...
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
                  Ticket bulunamadı
                </td>
              </tr>
            ) : (
              tickets.map((ticket: any) => (
                <tr
                  key={ticket.id}
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                  className="cursor-pointer transition"
                  style={{ borderBottom: `1px solid var(--border)`, backgroundColor: 'var(--bg-card)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
                >
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {ticket.ticketNo}
                  </td>
                  <td className="px-4 py-3 font-medium max-w-xs truncate" style={{ color: 'var(--text-primary)' }}>
                    {ticket.subject}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {ticket.customer?.name || ticket.customer?.email || '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {ticket.assignee
                      ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${ticket.status?.color}20`,
                        color: ticket.status?.color,
                      }}
                    >
                      {ticket.status?.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1 text-xs font-medium"
                      style={{ color: priorityColors[ticket.priority] }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: priorityColors[ticket.priority] }} />
                      {priorityLabels[ticket.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(ticket.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {meta.total} kayıttan {(page - 1) * 25 + 1}-{Math.min(page * 25, meta.total)} arası
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50 transition"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-card)' }}
            >
              ← Önceki
            </button>
            <button
              onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
              disabled={page === meta.totalPages}
              className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50 transition"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-card)' }}
            >
              Sonraki →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
