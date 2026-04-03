import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../api/client';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export default function ApprovalsPage() {
  const qc = useQueryClient();
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [expandId, setExpandId] = useState<string | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: () => api.get('/approvals/pending'),
    staleTime: 0,
    refetchInterval: 30000,
  });
  const approvals: any[] = res?.data?.data ?? res?.data ?? [];

  const resolveMutation = useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: string; note?: string }) =>
      api.patch(`/approvals/${id}/resolve`, { decision, note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-approvals'] });
      setExpandId(null);
    },
  });

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
      Yükleniyor…
    </div>
  );

  return (
    <div style={{ padding: '24px 32px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Bekleyen Onaylar</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          {approvals.length} bekleyen onay talebi
        </p>
      </div>

      {approvals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <CheckCircle size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>Bekleyen onay talebi yok</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {approvals.map((a: any) => (
            <div key={a.id} style={{
              border: '1px solid var(--border)', borderRadius: 12,
              background: 'var(--bg-card)', overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Clock size={14} color="#f59e0b" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {a.requestType === 'TICKET_CLOSE' ? 'Kapama Onayı' : 'Kompanzasyon Limiti'}
                      </span>
                      <span style={{ fontSize: 11, color: '#6366f1', background: '#6366f115', padding: '2px 8px', borderRadius: 999 }}>
                        #{a.ticket?.ticketNo}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {a.ticket?.subject}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                      Müşteri: <strong>{a.ticket?.customer?.name}</strong>
                      {a.ticket?.customer?.email && ` — ${a.ticket.customer.email}`}
                    </p>
                    {a.note && (
                      <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 4, fontStyle: 'italic' }}>
                        Neden: {a.note}
                      </p>
                    )}
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                      Talep Eden: {a.requestedBy ? `${a.requestedBy.firstName} ${a.requestedBy.lastName}` : '-'}
                    </p>
                  </div>
                  <a href={`/tickets/${a.ticket?.id}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: 11, color: '#6366f1', textDecoration: 'none' }}>
                    Ticket'a Git →
                  </a>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => resolveMutation.mutate({ id: a.id, decision: 'APPROVED' })}
                    disabled={resolveMutation.isPending}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    <CheckCircle size={13} /> Onayla
                  </button>
                  <button
                    onClick={() => setExpandId(expandId === a.id ? null : a.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    <XCircle size={13} /> Reddet
                  </button>
                </div>

                {expandId === a.id && (
                  <div style={{ marginTop: 10 }}>
                    <textarea
                      value={rejectNote[a.id] || ''}
                      onChange={e => setRejectNote(p => ({ ...p, [a.id]: e.target.value }))}
                      placeholder="Red sebebi (zorunlu)…"
                      rows={2}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: 12, resize: 'none', boxSizing: 'border-box' }}
                    />
                    <button
                      onClick={() => resolveMutation.mutate({ id: a.id, decision: 'REJECTED', note: rejectNote[a.id] })}
                      disabled={!rejectNote[a.id] || resolveMutation.isPending}
                      style={{ marginTop: 6, padding: '6px 14px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: !rejectNote[a.id] ? 0.5 : 1 }}>
                      Reddi Onayla
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
