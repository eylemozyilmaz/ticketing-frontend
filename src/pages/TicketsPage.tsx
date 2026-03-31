import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ticketsApi } from '../api/tickets';
import { useAuthStore } from '../store/auth.store';
import { useProjectStore } from '../store/project.store';
import api from '../api/client';

const priorityColors: Record<string, string> = {
  LOW: '#22c55e', NORMAL: '#6366f1', HIGH: '#f59e0b', URGENT: '#ef4444',
};
const priorityLabels: Record<string, string> = {
  LOW: 'Düşük', NORMAL: 'Normal', HIGH: 'Yüksek', URGENT: 'Acil',
};

export default function TicketsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentProject } = useProjectStore();

  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [projectFilter, setProjectFilter] = useState('all'); // 'all' | projectId
  const [assigneeFilter, setAssigneeFilter] = useState(''); // '' | userId
  const [page, setPage] = useState(1);

  // Kullanıcının tüm projeleri
  const { data: projectsRes } = useQuery({
    queryKey: ['my-projects'],
    queryFn: () => api.get('/users/me/projects'),
    staleTime: 60_000,
  });
  const myProjects: any[] = projectsRes?.data?.data ?? projectsRes?.data ?? [];

  // Ticket listesi
  const { data, isLoading } = useQuery({
    queryKey: ['tickets', { search, priority, page, projectFilter, assigneeFilter }],
    queryFn: () => ticketsApi.list({
      search: search || undefined,
      priority: priority || undefined,
      page,
      limit: 25,
      projectId: projectFilter !== 'all' ? projectFilter : undefined,
      assigneeId: assigneeFilter || undefined,
    }),
  });

  const tickets = data?.data?.data || [];
  const meta = data?.data?.meta;

  const resetPage = () => setPage(1);

  return (
    <div style={{ padding: 32 }}>
      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Ticketlar</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {meta?.total ?? '—'} ticket
            {projectFilter !== 'all' && (
              <span style={{ marginLeft: 8, fontSize: 11, color: '#6366f1', background: '#6366f115', padding: '1px 8px', borderRadius: 999 }}>
                {myProjects.find(p => p.id === projectFilter)?.name}
              </span>
            )}
            {assigneeFilter === user?.id && (
              <span style={{ marginLeft: 6, fontSize: 11, color: '#10b981', background: '#10b98115', padding: '1px 8px', borderRadius: 999 }}>
                Bana atanan
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => navigate('/tickets/new')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Yeni Ticket
        </button>
      </div>

      {/* Filtreler */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Arama */}
        <input
          type="text"
          placeholder="Ticket ara... (konu veya no)"
          value={search}
          onChange={e => { setSearch(e.target.value); resetPage(); }}
          style={{
            flex: '1 1 200px', padding: '8px 12px', borderRadius: 8,
            border: '1px solid var(--border)', fontSize: 13,
            background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none',
          }}
        />

        {/* Proje filtresi */}
        <select
          value={projectFilter}
          onChange={e => { setProjectFilter(e.target.value); resetPage(); }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer' }}
        >
          <option value="all">Tüm Projeler</option>
          {myProjects.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Öncelik */}
        <select
          value={priority}
          onChange={e => { setPriority(e.target.value); resetPage(); }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer' }}
        >
          <option value="">Tüm Öncelikler</option>
          <option value="URGENT">Acil</option>
          <option value="HIGH">Yüksek</option>
          <option value="NORMAL">Normal</option>
          <option value="LOW">Düşük</option>
        </select>

        {/* Bana atanan */}
        <button
          onClick={() => { setAssigneeFilter(f => f === user?.id ? '' : (user?.id ?? '')); resetPage(); }}
          style={{
            padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            border: `1px solid ${assigneeFilter === user?.id ? '#10b981' : 'var(--border)'}`,
            background: assigneeFilter === user?.id ? '#10b98115' : 'var(--bg-card)',
            color: assigneeFilter === user?.id ? '#10b981' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          Bana Atanan
        </button>
      </div>

      {/* Tablo */}
      <div style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ticket No</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Konu</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Proje</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Müşteri</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Atanan</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Statü</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Öncelik</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tarih</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
                  Yükleniyor…
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
                  Ticket bulunamadı
                </td>
              </tr>
            ) : (
              tickets.map((ticket: any) => (
                <tr
                  key={ticket.id}
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                  style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
                >
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)' }}>
                    {ticket.ticketNo}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--text-primary)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ticket.subject}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {ticket.project ? (
                      <span style={{ fontSize: 11, color: '#6366f1', background: '#6366f115', border: '1px solid #6366f130', padding: '2px 8px', borderRadius: 999 }}>
                        {ticket.project.name}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: 12 }}>
                    {ticket.customer?.name || ticket.customer?.email || '—'}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: 12 }}>
                    {ticket.assignee ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}` : (
                      <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>Atanmamış</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {ticket.status && (
                      <span style={{
                        fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 999,
                        background: `${ticket.status.color}22`, color: ticket.status.color,
                        border: `1px solid ${ticket.status.color}44`,
                      }}>
                        {ticket.status.name}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: priorityColors[ticket.priority], display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: priorityColors[ticket.priority], flexShrink: 0 }} />
                      {priorityLabels[ticket.priority]}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text-secondary)' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {meta.total} kayıttan {(page - 1) * 25 + 1}–{Math.min(page * 25, meta.total)} arası
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
            >
              ← Önceki
            </button>
            <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
              {page} / {meta.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
              disabled={page === meta.totalPages}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: page === meta.totalPages ? 'not-allowed' : 'pointer', opacity: page === meta.totalPages ? 0.5 : 1 }}
            >
              Sonraki →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

