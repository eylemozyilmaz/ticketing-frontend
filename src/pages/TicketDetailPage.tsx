/**
 * src/pages/TicketDetailPage.tsx
 *
 * Mevcut projeye tam uyumlu 3-panelli ticket detay sayfası.
 *
 * Kullanılan mevcut dosyalar (değiştirilmedi):
 *   src/api/client.ts        → api (axios instance)
 *   src/api/tickets.ts       → ticketsApi
 *   src/store/auth.store.ts  → useAuthStore
 *   src/store/project.store.ts → useProjectStore
 *   src/index.css            → CSS değişkenleri (--bg-primary vb.)
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ChevronDown, ChevronRight, Star, Mail, Phone,
  CheckCircle, XCircle, Clock, ExternalLink, User, Building2,
  Reply, Lock, Tag, Plus, X, Send, Loader2,
  Paperclip, Download, FileText, Image, Archive, Trash2,
  ArrowUpRight, Scissors, Shuffle, Package, CheckSquare,
  Search, AlertTriangle, ChevronUp,
} from 'lucide-react';
import api from '../api/client';
import { ticketsApi } from '../api/tickets';
import { useAuthStore } from '../store/auth.store';
import type { Ticket, TicketMessage, TicketResolution, TicketAttachment, ApprovalRequest, Department, Category, CustomField, CustomValue } from '../types/ticket.types';
import DOMPurify from 'dompurify';
import { useProjectStore } from '../store/project.store';

// ─────────────────────────────────────────────
// YARDIMCI: TARİH FORMAT
// ─────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'az önce';
  if (secs < 3600) return `${Math.floor(secs / 60)} dk önce`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} sa önce`;
  return `${Math.floor(secs / 86400)} gün önce`;
}

// ─────────────────────────────────────────────
// YARDIMCI: SLA COUNTDOWN
// ─────────────────────────────────────────────

function useSlaCountdown(deadline: string | null | undefined) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!deadline) return;
    const update = () => {
      setRemaining(Math.floor((new Date(deadline).getTime() - Date.now()) / 1000));
    };
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, [deadline]);
  return remaining;
}

function formatSlaRemaining(secs: number): string {
  if (secs <= 0) return 'Süre geçti';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}s ${m}dk`;
  return `${m}dk`;
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

// ─────────────────────────────────────────────
// SABİTLER
// ─────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  LOW: '#22c55e', NORMAL: '#6366f1', HIGH: '#f59e0b', URGENT: '#ef4444',
};
const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Düşük', NORMAL: 'Normal', HIGH: 'Yüksek', URGENT: 'Acil',
};
const SOURCE_LABEL: Record<string, string> = {
  email: 'E-posta', phone: 'Telefon', manual: 'Manuel', api: 'API',
  EMAIL: 'E-posta', PHONE: 'Telefon', MANUAL: 'Manuel', API: 'API',
};

// ─────────────────────────────────────────────
// KÜÇÜK YARDIMCI BİLEŞENLER
// ─────────────────────────────────────────────

function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />;
}

function StatusBadge({ status }: { status?: { name: string; color: string } }) {
  if (!status) return null;
  return (
    <span style={{
      background: `${status.color}22`, color: status.color,
      border: `1px solid ${status.color}44`,
      padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
    }}>
      {status.name}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const color = PRIORITY_COLOR[priority] ?? '#6b7280';
  return (
    <span style={{
      background: `${color}22`, color,
      border: `1px solid ${color}44`,
      padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
    }}>
      {PRIORITY_LABEL[priority] ?? priority}
    </span>
  );
}

function AgentAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: '#fff',
    }}>
      {initials}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: 10,
    }}>
      {children}
    </p>
  );
}

function ActionBtn({
  children, onClick, disabled, variant = 'default',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger' | 'success';
}) {
  const clr = { default: 'var(--text-primary)', danger: '#ef4444', success: '#10b981' }[variant];
  const hov = { default: 'var(--bg-secondary)', danger: '#ef444412', success: '#10b98112' }[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', textAlign: 'left', padding: '8px 12px',
      border: '1px solid var(--border)', borderRadius: 8,
      fontSize: 12, fontWeight: 500, color: clr,
      background: 'transparent', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8,
      transition: 'background 0.12s',
    }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = hov; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────
// MODAL ALTYAPISI
// ─────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--border)', fontSize: 13,
  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
  boxSizing: 'border-box', outline: 'none',
};
const primaryBtnStyle: React.CSSProperties = {
  width: '100%', padding: '10px', borderRadius: 8, border: 'none',
  background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', marginTop: 16,
};

function ModalShell({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, width: '100%', maxWidth: 440, margin: '0 16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {title}
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
          }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL: FORWARD
// ─────────────────────────────────────────────

function ForwardModal({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const qc = useQueryClient();
  const [toDeptId, setToDeptId] = useState('');
  const [toUserId, setToUserId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  // Projedeki departmanları çek
  const { data: projectRes } = useQuery({
    queryKey: ['project-departments', ticket.projectId],
    queryFn: () => api.get(`/projects/${ticket.projectId}/departments`),
    enabled: !!ticket.projectId,
    staleTime: 300_000,
  });
  // Proje üyelerini çek
  const { data: membersRes } = useQuery({
    queryKey: ['project-members', ticket.projectId],
    queryFn: () => api.get(`/projects/${ticket.projectId}/members`),
    enabled: !!ticket.projectId,
    staleTime: 300_000,
  });
  const members: any[] = membersRes?.data?.data ?? [];
  const departments: any[] = projectRes?.data?.data ?? [];

  const mutation = useMutation({
    mutationFn: () => {
      if (!toDeptId && !toUserId) throw new Error('Departman veya kullanıcı seçin');
      return ticketsApi.forward(ticket.id, {
        toDeptId: toDeptId || undefined,
        toUserId: toUserId || undefined,
        note: note || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', ticket.id] });
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message?.[0] ?? err?.message ?? 'Bir hata oluştu');
    },
  });

  return (
    <ModalShell title="Departmana Yönlendir" onClose={onClose}>
      {/* Departman seçimi */}
      <label style={labelStyle}>Hedef Departman</label>
      {departments.length > 0 ? (
        <select value={toDeptId} onChange={e => setToDeptId(e.target.value)} style={inputStyle}>
          <option value="">— Seçin —</option>
          {departments.map((d: any) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      ) : (
        <input
          value={toDeptId}
          onChange={e => setToDeptId(e.target.value)}
          placeholder="Departman ID (uuid)"
          style={inputStyle}
        />
      )}

      {/* Kullanıcı seçimi (opsiyonel) */}
      <label style={{ ...labelStyle, marginTop: 12 }}>Agent (opsiyonel)</label>
      <select value={toUserId} onChange={e => setToUserId(e.target.value)} style={inputStyle}>
        <option value="">— Seçin —</option>
        {members.map((m: any) => (
          <option key={m.user?.id ?? m.userId} value={m.user?.id ?? m.userId}>
            {m.user?.firstName} {m.user?.lastName} ({m.role})
          </option>
        ))}
      </select>

      {/* Not */}
      <label style={{ ...labelStyle, marginTop: 12 }}>Not (opsiyonel)</label>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        rows={3}
        placeholder="Neden yönlendiriliyor?"
        style={{ ...inputStyle, resize: 'none' }}
      />

      {/* Hata mesajı */}
      {error && (
        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#ef444415', border: '1px solid #ef444430', fontSize: 12, color: '#ef4444' }}>
          {error}
        </div>
      )}

      <button
        onClick={() => { setError(''); mutation.mutate(); }}
        disabled={(!toDeptId && !toUserId) || mutation.isPending}
        style={primaryBtnStyle}
      >
        {mutation.isPending
          ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Spinner size={14} /> Yönlendiriliyor…</span>
          : 'Yönlendir'
        }
      </button>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────
// MODAL: KAPAT
// ─────────────────────────────────────────────

function CloseModal({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const qc = useQueryClient();
  const [outcome, setOutcome] = useState('SATISFIED');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const OUTCOMES = [
    { value: 'SATISFIED', label: 'Müşteri memnun' },
    { value: 'DISSATISFIED', label: 'Müşteri memnun değil' },
    { value: 'UNREACHABLE', label: 'Ulaşılamadı' },
    { value: 'SPAM', label: 'Spam' },
    { value: 'DUPLICATE', label: 'Mükerrer ticket' },
    { value: 'NO_ACTION_REQUIRED', label: 'İşlem gerekmedi' },
  ];

  const mutation = useMutation({
    mutationFn: () => ticketsApi.close(ticket.id, {
      closureOutcome: outcome,
      note: note || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', ticket.id] });
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message?.[0] ?? err?.message ?? 'Bir hata oluştu');
    },
  });

  return (
    <ModalShell title="Ticket'ı Kapat" onClose={onClose}>
      {/* Uyarı */}
      <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ef444410', border: '1px solid #ef444430', fontSize: 12, color: '#ef4444', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlertTriangle size={14} style={{ flexShrink: 0 }} />
        Bu işlem geri alınamaz. Ticket kapatılacak.
      </div>

      {/* Kapanış sonucu */}
      <label style={labelStyle}>Kapanış Sonucu *</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {OUTCOMES.map(o => (
          <label key={o.value} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
            borderRadius: 8, border: `1px solid ${outcome === o.value ? '#6366f1' : 'var(--border)'}`,
            background: outcome === o.value ? '#6366f110' : 'transparent',
            cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)',
          }}>
            <input
              type="radio" name="outcome" value={o.value}
              checked={outcome === o.value}
              onChange={() => setOutcome(o.value)}
              style={{ accentColor: '#6366f1' }}
            />
            {o.label}
          </label>
        ))}
      </div>

      {/* Not */}
      <label style={labelStyle}>Not (opsiyonel)</label>
      <textarea
        value={note} onChange={e => setNote(e.target.value)}
        rows={3} placeholder="Kapanış notu ekle…"
        style={{ ...inputStyle, resize: 'none' }}
      />

      {error && (
        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#ef444415', border: '1px solid #ef444430', fontSize: 12, color: '#ef4444' }}>
          {error}
        </div>
      )}

      <button
        onClick={() => { setError(''); mutation.mutate(); }}
        disabled={mutation.isPending}
        style={{ ...primaryBtnStyle, background: '#ef4444', marginTop: 16 }}
      >
        {mutation.isPending
          ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Spinner size={14} /> Kapatılıyor…</span>
          : "Ticket'ı Kapat"
        }
      </button>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────
// MODAL: PLACEHOLDER (split, merge, transfer, resolution, rootcause)
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// MODAL: SPLIT
// ─────────────────────────────────────────────

interface SplitChild {
  id: number;
  subject: string;
  assigneeId: string;
  departmentId: string;
}

function SplitModal({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const qc = useQueryClient();
  const [children, setChildren] = useState<SplitChild[]>([
    { id: 1, subject: ticket.subject ?? '', assigneeId: '', departmentId: '' },
  ]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [parentStatusId, setParentStatusId] = useState('');

  // Departman listesi
  const { data: projectRes } = useQuery({
    queryKey: ['project', ticket.projectId],
    queryFn: () => api.get(`/projects/${ticket.projectId}`),
    enabled: !!ticket.projectId,
    staleTime: 300_000,
  });
  const departments: any[] = projectRes?.data?.data?.departments ?? [];

  // Statü listesi
  const { data: statusRes } = useQuery({
    queryKey: ['project-statuses', ticket.projectId],
    queryFn: () => api.get(`/projects/${ticket.projectId}/statuses`),
    enabled: !!ticket.projectId,
    staleTime: 300_000,
  });
  const statuses: any[] = statusRes?.data?.data ?? [];

  // Statüler yüklenince default seç:
  // Eğer parent "YENİ/INITIAL" ise → ilk non-initial statüyü seç, yoksa mevcut statüyü koru
  useEffect(() => {
    if (statuses.length === 0) return;
    if (parentStatusId) return; // zaten seçilmiş
    const currentStatus = statuses.find(s => s.id === ticket.statusId);
    if (currentStatus?.isInitial) {
      const islemde = statuses.find(s => !s.isInitial && !s.isClosed);
      setParentStatusId(islemde?.id ?? ticket.statusId);
    } else {
      setParentStatusId(ticket.statusId);
    }
  }, [statuses, ticket.statusId, parentStatusId]);

  const addChild = () => {
    setChildren(prev => [...prev, { id: Date.now(), subject: ticket.subject ?? '', assigneeId: '', departmentId: '' }]);
  };

  const removeChild = (id: number) => {
    if (children.length === 1) return;
    setChildren(prev => prev.filter(c => c.id !== id));
  };

  const updateChild = (id: number, field: keyof SplitChild, value: string) => {
    setChildren(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const emptySubject = children.find(c => !c.subject.trim());
      if (emptySubject) throw new Error('Tüm child ticket konularını doldurun');

      // Önce split yap
      const splitRes = await api.post(`/tickets/${ticket.id}/split`, {
        children: children.map(c => ({
          subject: c.subject,
          assigneeId: c.assigneeId || undefined,
          departmentId: c.departmentId || undefined,
        })),
        note: note || undefined,
      });

      // Sonra parent statüsünü değiştir (eğer farklıysa)
      if (parentStatusId && parentStatusId !== ticket.statusId) {
        await api.patch(`/tickets/${ticket.id}/status`, {
          statusId: parentStatusId,
          note: 'Ticket bölündü',
        });
      }

      return splitRes;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', ticket.id] });
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message?.[0] ?? err?.message ?? 'Bir hata oluştu');
    },
  });

  return (
    <ModalShell title="Ticket'ı Böl" onClose={onClose}>
      {/* Bilgi notu */}
      <div style={{ padding: '10px 14px', borderRadius: 8, background: '#6366f110', border: '1px solid #6366f130', fontSize: 12, color: '#6366f1', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        Her child ticket ayrı bir alt ticket olarak açılır. Parent ticket açık kalmaya devam eder.
      </div>

      {/* Child ticket listesi */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
        {children.map((child, index) => (
          <div key={child.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Child {index + 1}
              </span>
              {children.length > 1 && (
                <button onClick={() => removeChild(child.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Konu */}
            <label style={labelStyle}>Konu *</label>
            <input
              value={child.subject}
              onChange={e => updateChild(child.id, 'subject', e.target.value)}
              placeholder={`Child ${index + 1} konusu`}
              style={{ ...inputStyle, marginBottom: 8 }}
            />

            {/* Departman */}
            <label style={labelStyle}>Departman (opsiyonel)</label>
            <select
              value={child.departmentId}
              onChange={e => updateChild(child.id, 'departmentId', e.target.value)}
              style={{ ...inputStyle, marginBottom: 0 }}
            >
              <option value="">— Parent ile aynı —</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Child ekle butonu */}
      <button
        onClick={addChild}
        style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px dashed var(--border)', background: 'transparent', color: '#6366f1', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14 }}
      >
        <Plus size={14} /> Child Ticket Ekle
      </button>

      {/* Parent ticket statüsü */}
      {statuses.length > 0 && (
        <>
          <label style={labelStyle}>Split Sonrası Ana Ticket Statüsü</label>
          <select
            value={parentStatusId}
            onChange={e => setParentStatusId(e.target.value)}
            style={{ ...inputStyle, marginBottom: 14 }}
          >
            {statuses.filter((s: any) => !s.isClosed).map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.id === ticket.statusId ? ' (mevcut)' : ''}
              </option>
            ))}
          </select>
        </>
      )}

      {/* Not */}
      <label style={labelStyle}>Not (opsiyonel)</label>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        rows={2}
        placeholder="Bölme nedeni…"
        style={{ ...inputStyle, resize: 'none' }}
      />

      {error && (
        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#ef444415', border: '1px solid #ef444430', fontSize: 12, color: '#ef4444' }}>
          {error}
        </div>
      )}

      <button
        onClick={() => { setError(''); mutation.mutate(); }}
        disabled={mutation.isPending}
        style={primaryBtnStyle}
      >
        {mutation.isPending
          ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Spinner size={14} /> Bölünüyor…</span>
          : `${children.length} Child Ticket Oluştur`
        }
      </button>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────
// MODAL: MERGE
// ─────────────────────────────────────────────

function MergeModal({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const qc = useQueryClient();
  const [targetId, setTargetId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  // Aynı müşterinin açık ticket'larını getir
  const { data: relatedRes, isLoading: relatedLoading } = useQuery({
    queryKey: ['ticket-related', ticket.id],
    queryFn: () => ticketsApi.getRelated(ticket.id),
    staleTime: 0,
  });
  const related: any[] = relatedRes?.data?.data ?? [];

  const mutation = useMutation({
    mutationFn: () => {
      if (!targetId) throw new Error('Hedef ticket seçin');
      return api.post(`/tickets/${ticket.id}/merge`, {
        targetTicketId: targetId,
        note: note || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', ticket.id] });
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message?.[0] ?? err?.message ?? 'Bir hata oluştu');
    },
  });

  return (
    <ModalShell title="Ticket'ı Birleştir" onClose={onClose}>
      {/* Uyarı */}
      <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ef444410', border: '1px solid #ef444430', fontSize: 12, color: '#ef4444', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        Bu ticket seçilen ticket ile birleştirilecek. Mevcut ticket kapatılır, mesajlar hedef ticket'a taşınır.
      </div>

      {/* Hedef ticket seçimi */}
      <label style={labelStyle}>Hedef Ticket *</label>
      {relatedLoading ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)', padding: '8px 0' }}>
          <Spinner size={13} /> Yükleniyor…
        </div>
      ) : related.length === 0 ? (
        <div style={{ padding: '12px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
          Bu müşteriye ait başka açık ticket bulunamadı.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {related.map((r: any) => (
            <label key={r.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
              borderRadius: 8, border: `1px solid ${targetId === r.id ? '#6366f1' : 'var(--border)'}`,
              background: targetId === r.id ? '#6366f110' : 'transparent',
              cursor: 'pointer',
            }}>
              <input
                type="radio" name="target" value={r.id}
                checked={targetId === r.id}
                onChange={() => setTargetId(r.id)}
                style={{ accentColor: '#6366f1', marginTop: 2 }}
              />
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  #{r.ticketNo}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{r.subject}</p>
                {r.status && (
                  <span style={{ fontSize: 10, color: r.status.color, background: `${r.status.color}22`, border: `1px solid ${r.status.color}44`, padding: '1px 6px', borderRadius: 999, marginTop: 4, display: 'inline-block' }}>
                    {r.status.name}
                  </span>
                )}
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Not */}
      <label style={labelStyle}>Not (opsiyonel)</label>
      <textarea
        value={note} onChange={e => setNote(e.target.value)}
        rows={2} placeholder="Birleştirme nedeni…"
        style={{ ...inputStyle, resize: 'none' }}
      />

      {error && (
        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#ef444415', border: '1px solid #ef444430', fontSize: 12, color: '#ef4444' }}>
          {error}
        </div>
      )}

      <button
        onClick={() => { setError(''); mutation.mutate(); }}
        disabled={!targetId || mutation.isPending || related.length === 0}
        style={{ ...primaryBtnStyle, background: '#ef4444', marginTop: 16 }}
      >
        {mutation.isPending
          ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Spinner size={14} /> Birleştiriliyor…</span>
          : "Ticket'ı Birleştir"
        }
      </button>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────
// MODAL: TRANSFER
// ─────────────────────────────────────────────

function TransferModal({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const qc = useQueryClient();
  const [toProjectId, setToProjectId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  // Tüm projeleri getir
  const { data: projectsRes, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => api.get('/projects'),
    staleTime: 300_000,
  });
  const projects: any[] = (projectsRes?.data?.data ?? []).filter((p: any) => p.id !== ticket.projectId);

  const mutation = useMutation({
    mutationFn: () => {
      if (!toProjectId) throw new Error('Hedef proje seçin');
      return api.post(`/tickets/${ticket.id}/transfer`, {
        toProjectId,
        note: note || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', ticket.id] });
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message?.[0] ?? err?.message ?? 'Bir hata oluştu');
    },
  });

  return (
    <ModalShell title="Projeye Transfer" onClose={onClose}>
      {/* Uyarı */}
      <div style={{ padding: '10px 14px', borderRadius: 8, background: '#f59e0b10', border: '1px solid #f59e0b30', fontSize: 12, color: '#f59e0b', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        Ticket başka bir projeye kalıcı olarak taşınır. SLA sıfırlanır, atama ve kategori temizlenir.
      </div>

      {/* Mevcut proje */}
      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
        Mevcut proje: <strong style={{ color: 'var(--text-primary)' }}>
          {projectsRes?.data?.data?.find((p: any) => p.id === ticket.projectId)?.name ?? ticket.projectId}
        </strong>
      </div>

      {/* Hedef proje */}
      <label style={labelStyle}>Hedef Proje *</label>
      {projectsLoading ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)', padding: '8px 0' }}>
          <Spinner size={13} /> Yükleniyor…
        </div>
      ) : projects.length === 0 ? (
        <div style={{ padding: '12px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
          Başka proje bulunamadı.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {projects.map((p: any) => (
            <label key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 8, border: `1px solid ${toProjectId === p.id ? '#6366f1' : 'var(--border)'}`,
              background: toProjectId === p.id ? '#6366f110' : 'transparent',
              cursor: 'pointer',
            }}>
              <input
                type="radio" name="toProject" value={p.id}
                checked={toProjectId === p.id}
                onChange={() => setToProjectId(p.id)}
                style={{ accentColor: '#6366f1' }}
              />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</p>
                <p style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{p.slug}</p>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Not */}
      <label style={labelStyle}>Not (opsiyonel)</label>
      <textarea
        value={note} onChange={e => setNote(e.target.value)}
        rows={2} placeholder="Transfer nedeni…"
        style={{ ...inputStyle, resize: 'none' }}
      />

      {error && (
        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#ef444415', border: '1px solid #ef444430', fontSize: 12, color: '#ef4444' }}>
          {error}
        </div>
      )}

      <button
        onClick={() => { setError(''); mutation.mutate(); }}
        disabled={!toProjectId || mutation.isPending || projects.length === 0}
        style={primaryBtnStyle}
      >
        {mutation.isPending
          ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Spinner size={14} /> Transfer ediliyor…</span>
          : 'Projeye Transfer Et'
        }
      </button>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────
// MODAL: RESOLUTION (Çözüm Seti)
// ─────────────────────────────────────────────

function ResolutionModal({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const qc = useQueryClient();
  const [resolutionTypeId, setResolutionTypeId] = useState('');
  const [description, setDescription] = useState('');
  const [compensationTl, setCompensationTl] = useState('');
  const [error, setError] = useState('');

  // Projeden çözüm tiplerini getir
  const { data: typesRes, isLoading: typesLoading } = useQuery({
    queryKey: ['resolution-types', ticket.projectId],
    queryFn: () => api.get(`/projects/${ticket.projectId}/resolution-types`),
    enabled: !!ticket.projectId,
    staleTime: 300_000,
  });
  const resolutionTypes: any[] = typesRes?.data?.data ?? [];

  const selectedType = resolutionTypes.find(t => t.id === resolutionTypeId);

  const mutation = useMutation({
    mutationFn: () => {
      if (!resolutionTypeId) throw new Error('Çözüm türü seçin');
      if (!description.trim()) throw new Error('Açıklama zorunludur');
      return api.post(`/tickets/${ticket.id}/resolutions`, {
        resolutionTypeId: resolutionTypeId,
        description,
        compensationTl: compensationTl ? Number(compensationTl) : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", ticket.id] }); qc.invalidateQueries({ queryKey: ["ticket-resolutions", ticket.id] });
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message?.[0] ?? err?.message ?? 'Bir hata oluştu');
    },
  });

  return (
    <ModalShell title="Çözüm Seti Ekle" onClose={onClose}>
      {/* Çözüm türü */}
      <label style={labelStyle}>Çözüm Türü *</label>
      {typesLoading ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)', padding: '8px 0' }}>
          <Spinner size={13} /> Yükleniyor…
        </div>
      ) : resolutionTypes.length === 0 ? (
        <div style={{ padding: '12px', borderRadius: 8, background: '#f59e0b10', border: '1px solid #f59e0b30', fontSize: 12, color: '#f59e0b', marginBottom: 14 }}>
          ⚠️ Bu proje için henüz çözüm türü tanımlanmamış. Proje ayarlarından ekleyin.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {resolutionTypes.map((rt: any) => (
            <label key={rt.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 8, border: `1px solid ${resolutionTypeId === rt.id ? '#10b981' : 'var(--border)'}`,
              background: resolutionTypeId === rt.id ? '#10b98110' : 'transparent',
              cursor: 'pointer',
            }}>
              <input
                type="radio" name="resolutionType" value={rt.id}
                checked={resolutionTypeId === rt.id}
                onChange={() => setResolutionTypeId(rt.id)}
                style={{ accentColor: '#10b981' }}
              />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{rt.name}</p>
                {rt.description && <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{rt.description}</p>}
                {rt.requiresAmount && <p style={{ fontSize: 10, color: '#f59e0b' }}>Tutar gerektirir</p>}
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Tutar — seçilen tip requiresAmount ise göster */}
      {selectedType?.requiresAmount && (
        <>
          <label style={labelStyle}>Tutar (₺) *</label>
          <input
            type="number"
            value={compensationTl}
            onChange={e => setCompensationTl(e.target.value)}
            placeholder="0.00"
            min="0"
            style={{ ...inputStyle, marginBottom: 12 }}
          />
        </>
      )}

      {/* Açıklama */}
      <label style={labelStyle}>Açıklama *</label>
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={3}
        placeholder="Çözüm detaylarını açıklayın…"
        style={{ ...inputStyle, resize: 'none' }}
      />

      {error && (
        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#ef444415', border: '1px solid #ef444430', fontSize: 12, color: '#ef4444' }}>
          {error}
        </div>
      )}

      <button
        onClick={() => { setError(''); mutation.mutate(); }}
        disabled={!resolutionTypeId || !description.trim() || mutation.isPending || resolutionTypes.length === 0}
        style={{ ...primaryBtnStyle, background: '#10b981', marginTop: 16 }}
      >
        {mutation.isPending
          ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Spinner size={14} /> Kaydediliyor…</span>
          : 'Çözüm Setini Kaydet'
        }
      </button>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────
// MODAL: PLACEHOLDER (rootcause)
// ─────────────────────────────────────────────

const MODAL_TITLES: Record<string, string> = {
  rootcause: 'Kök Neden Kaydet',
};

function PlaceholderModal({ type, onClose }: { type: string; onClose: () => void }) {
  return (
    <ModalShell title={MODAL_TITLES[type] ?? type} onClose={onClose}>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>
        Bu modal yakında eklenecek.
      </p>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────
// SOL PANEL: MÜŞTERİ + ERP + ATAMA
// ─────────────────────────────────────────────

function CustomerPanel({ ticket }: { ticket: Ticket }) {
  const { statuses } = useProjectStore();
  const qc = useQueryClient();
  const [erpOpen, setErpOpen] = useState(false);
  const [showAllContracts, setShowAllContracts] = useState(false);

  const erpId = ticket.customer?.erpCustomerId ?? ticket.customer?.erp_customer_id ?? null;

  const { data: activeContractRes, isLoading: contractLoading } = useQuery({
    queryKey: ['erp-active', erpId],
    queryFn: () => api.get(`/erp/customers/${erpId}/active-contract`),
    enabled: !!erpId && erpOpen,
    staleTime: 0,
  });

  const { data: allContractsRes, isLoading: allLoading } = useQuery({
    queryKey: ['erp-contracts', erpId],
    queryFn: () => api.get(`/erp/customers/${erpId}/contracts`),
    enabled: !!erpId && showAllContracts,
    staleTime: 0,
  });

  const statusMutation = useMutation({
    mutationFn: (statusId: string) => ticketsApi.changeStatus(ticket.id, statusId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket', ticket.id] }),
  });

  const customer = ticket.customer;
  const customerName = customer?.name || customer?.fullName || customer?.email || '—';
  const section: React.CSSProperties = { padding: '14px 16px', borderBottom: '1px solid var(--border)' };

  return (
    <div style={{ height: '100%', overflowY: 'auto', borderRight: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}>

      {/* Child ticket ise ana ticketa dön */}
      {ticket.parentTicketId && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: '#6366f108' }}>
          <a
            href={`/tickets/${ticket.parentTicketId}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6366f1', textDecoration: 'none', fontWeight: 500 }}
          >
            <ArrowLeft size={13} /> Ana Ticket'a Dön
          </a>
          <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 3, marginLeft: 19 }}>
            #{ticket.parentTicket?.ticketNo ?? ticket.parentTicketId.slice(0, 8)}
          </p>
        </div>
      )}

      {/* Birleştirilmiş ticket uyarısı */}
      {ticket.closureOutcome === 'DUPLICATE' && ticket.transfers?.length > 0 && (() => {
        const mergeTransfer = ticket.transfers.find((t: any) => t.transferType === 'MERGE' && t.mergedTicketId);
        if (!mergeTransfer) return null;
        return (
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: '#f59e0b08', border: '1px solid #f59e0b30' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#f59e0b', fontWeight: 600, marginBottom: 4 }}>
              <Shuffle size={13} /> Birleştirildi
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Bu ticket aşağıdaki ticket ile birleştirildi:
            </p>
            <a
              href={`/tickets/${mergeTransfer.mergedTicketId}`}
              style={{ fontSize: 11, color: '#6366f1', textDecoration: 'none', fontFamily: 'monospace', fontWeight: 600 }}
            >
              Hedef Ticket'a Git →
            </a>
            {mergeTransfer.note && (
              <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                Not: {mergeTransfer.note}
              </p>
            )}
          </div>
        );
      })()}

      {/* Müşteri */}
      <div style={section}>
        <SectionLabel>Müşteri</SectionLabel>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>
            {customerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{customerName}</p>
            {customer?.isVip && (
              <span style={{ fontSize: 10, color: '#f59e0b', background: '#f59e0b15', border: '1px solid #f59e0b30', padding: '1px 6px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Star size={9} /> VIP
              </span>
            )}
          </div>
        </div>

        {/* E-posta(lar) */}
        {(customer?.emails ?? (customer?.email ? [{ email: customer.email, isPrimary: true }] : [])).map((e: any) => (
          <div key={e.email} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Mail size={11} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{e.email}</span>
            {e.isPrimary && <span style={{ fontSize: 9, color: '#6366f1', background: '#6366f115', padding: '0 4px', borderRadius: 4 }}>birincil</span>}
          </div>
        ))}

        {customer?.phone && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
            <Phone size={11} style={{ flexShrink: 0 }} /><span>{customer.phone}</span>
          </div>
        )}

        <div style={{ marginTop: 8 }}>
          {(customer?.isErpMatched || customer?.is_erp_matched) ? (
            <span style={{ fontSize: 10, color: '#10b981', background: '#10b98115', border: '1px solid #10b98130', padding: '2px 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle size={10} /> ERP eşleşti
            </span>
          ) : (
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <XCircle size={10} /> ERP eşleşmedi
            </span>
          )}
        </div>
      </div>

      {/* ERP Kontrat */}
      {erpId && (
        <div style={section}>
          <button onClick={() => setErpOpen(p => !p)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0 }}>
            <SectionLabel>ERP Kontrat</SectionLabel>
            {erpOpen ? <ChevronUp size={14} color="var(--text-secondary)" style={{ marginTop: -8 }} /> : <ChevronDown size={14} color="var(--text-secondary)" style={{ marginTop: -8 }} />}
          </button>

          {erpOpen && (
            <>
              {contractLoading ? (
                <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-secondary)', padding: '6px 0' }}><Spinner size={13} /> Yükleniyor…</div>
              ) : (() => {
                const c = activeContractRes?.data?.data;
                return c ? (
                  <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 12, border: '1px solid var(--border)', marginTop: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#6366f1' }}>{c.contractNo ?? c.contract_no}</span>
                      <span style={{ fontSize: 10, color: '#10b981', background: '#10b98115', padding: '1px 6px', borderRadius: 999 }}>Açık</span>
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{c.product}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px', fontSize: 10, color: 'var(--text-secondary)' }}>
                      <span>Başlangıç</span><span>{c.startDate ? fmtDate(c.startDate) : c.start_date ?? '—'}</span>
                      <span>Bitiş</span><span>{c.endDate ? fmtDate(c.endDate) : c.end_date ?? '—'}</span>
                      {c.amountTl && <><span>Tutar</span><span>{Number(c.amountTl).toLocaleString('tr-TR')} ₺</span></>}
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 6 }}>Açık kontrat bulunamadı.</p>
                );
              })()}

              <button onClick={() => setShowAllContracts(p => !p)} style={{ marginTop: 8, fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ExternalLink size={11} /> {showAllContracts ? 'Gizle' : 'Son 5 kiralama'}
              </button>

              {showAllContracts && (
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {allLoading ? <Spinner size={12} /> : (allContractsRes?.data?.data ?? []).map((c: any) => (
                    <div key={c.contractNo ?? c.id} style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: 4, padding: '4px 8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{c.contractNo ?? c.contract_no}</span><span>{c.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Atama & Meta */}
      <div style={section}>
        <SectionLabel>Atama</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {ticket.owner && (
            <div>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>Owner</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AgentAvatar name={`${ticket.owner.firstName} ${ticket.owner.lastName}`} size={26} />
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{ticket.owner.firstName} {ticket.owner.lastName}</span>
              </div>
            </div>
          )}

          <div>
            <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>Atanan Agent</p>
            {ticket.assignee ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AgentAvatar name={`${ticket.assignee.firstName} ${ticket.assignee.lastName}`} size={26} />
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{ticket.assignee.firstName} {ticket.assignee.lastName}</span>
              </div>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>Atanmamış</span>
            )}
          </div>

          {ticket.department && (
            <div>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>Departman</p>
              <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{ticket.department.name}</span>
            </div>
          )}

          {/* Statü değiştirme — statuses store'dan geliyorsa dropdown, yoksa badge */}
          <div>
            <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>Statü</p>
            {statuses.length > 0 ? (
              <select
                value={ticket.status?.id ?? ticket.statusId ?? ''}
                onChange={e => statusMutation.mutate(e.target.value)}
                disabled={statusMutation.isPending}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            ) : (
              <StatusBadge status={ticket.status} />
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <PriorityBadge priority={ticket.priority} />
            {ticket.source && (
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 999 }}>
                {SOURCE_LABEL[ticket.source] ?? ticket.source}
              </span>
            )}
            {(ticket.isChild || ticket.is_child) && (
              <span style={{ fontSize: 10, color: '#8b5cf6', background: '#8b5cf615', border: '1px solid #8b5cf630', padding: '2px 8px', borderRadius: 999 }}>child</span>
            )}
          </div>

          <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            Açıldı: {fmtDateTime(ticket.createdAt)}
          </p>
        </div>
      </div>

      {/* Child ticketlar */}
      {ticket.childTickets?.length > 0 && (
        <div style={section}>
          <SectionLabel>Child Ticketlar</SectionLabel>
          {ticket.childTickets.map((c: any) => (
            <a key={c.id} href={`/tickets/${c.id}`}
              style={{ display: 'block', fontSize: 11, fontFamily: 'monospace', color: '#6366f1', textDecoration: 'none', marginBottom: 4 }}>
              #{c.ticketNo}
            </a>
          ))}
        </div>
      )}

      {/* Özel Alanlar */}
      <CustomFieldsPanel ticket={ticket} />
    </div>
  );
}

// ─────────────────────────────────────────────
// SOL PANEL: ÖZEL ALANLAR
// ─────────────────────────────────────────────

function CustomFieldsPanel({ ticket }: { ticket: Ticket }) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const { data: fieldsRes } = useQuery({
    queryKey: ['custom-fields', ticket.projectId],
    queryFn: () => api.get(`/projects/${ticket.projectId}/custom-fields`),
    enabled: !!ticket.projectId,
    staleTime: 300_000,
  });

  const { data: valuesRes } = useQuery({
    queryKey: ['custom-values', ticket.id],
    queryFn: () => api.get(`/tickets/${ticket.id}/custom-values`),
    enabled: !!ticket.id,
  });

  const fields: any[] = fieldsRes?.data?.data ?? fieldsRes?.data ?? [];
  const values: any[] = valuesRes?.data?.data ?? valuesRes?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: ({ fieldId, value }: { fieldId: string; value: string }) =>
      api.post(`/tickets/${ticket.id}/custom-values`, { fieldId, value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-values', ticket.id] });
      setEditingId(null);
    },
  });

  if (fields.length === 0) return null;

  const getValue = (fieldId: string) => values.find(v => v.fieldId === fieldId)?.value ?? '';

  const sectionStyle: React.CSSProperties = { padding: '14px 16px', borderBottom: '1px solid var(--border)' };

  return (
    <div style={sectionStyle}>
      <SectionLabel>Özel Alanlar</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {fields.map((field: any) => {
          const currentValue = getValue(field.id);
          const isEditing = editingId === field.id;

          return (
            <div key={field.id}>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3 }}>
                {field.displayName} {field.isRequired && <span style={{ color: '#ef4444' }}>*</span>}
              </p>

              {isEditing ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  {field.fieldType === 'SELECT' ? (
                    <select
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      style={{ ...inputStyle, fontSize: 11, padding: '4px 6px', flex: 1 }}
                      autoFocus
                    >
                      <option value="">— Seçin —</option>
                      {(field.options ?? []).map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.fieldType === 'DATE' ? 'date' : field.fieldType === 'DATETIME' ? 'datetime-local' : field.fieldType === 'AMOUNT' ? 'number' : 'text'}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      style={{ ...inputStyle, fontSize: 11, padding: '4px 6px', flex: 1 }}
                      autoFocus
                    />
                  )}
                  <button
                    onClick={() => saveMutation.mutate({ fieldId: field.id, value: editValue })}
                    disabled={saveMutation.isPending}
                    style={{ background: '#6366f1', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', padding: '0 6px', fontSize: 11 }}
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-secondary)', cursor: 'pointer', padding: '0 6px', fontSize: 11 }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingId(field.id); setEditValue(currentValue); }}
                  style={{
                    width: '100%', textAlign: 'left', background: 'var(--bg-card)',
                    border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px',
                    fontSize: 12, color: currentValue ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer', fontStyle: currentValue ? 'normal' : 'italic',
                  }}
                >
                  {currentValue || 'Değer girin…'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ORTA PANEL: MESAJ ÖGESİ
// ─────────────────────────────────────────────

function MessageItem({ msg }: { msg: TicketMessage }) {
  const [expanded, setExpanded] = useState(true);
  const isInternal = msg.isInternal || msg.is_internal;
  const isOutbound = msg.direction === 'OUTBOUND' || msg.direction === 'outbound';
  const authorName = msg.author
    ? `${msg.author.firstName} ${msg.author.lastName}`
    : isOutbound ? 'Agent' : 'Müşteri';
  const sentAt = msg.sentAt || msg.createdAt || msg.sent_at;

  const borderColor = isInternal ? '#f59e0b' : isOutbound ? '#6366f1' : 'var(--border)';
  const bg = isInternal ? '#f59e0b08' : isOutbound ? '#6366f108' : 'var(--bg-card)';

  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 12, overflow: 'hidden', background: bg }}>
      <button onClick={() => setExpanded(p => !p)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', background: isInternal ? '#f59e0b' : isOutbound ? '#6366f1' : '#6b7280' }}>
          {authorName.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{authorName}</span>
            {isInternal && <span style={{ fontSize: 10, color: '#f59e0b', background: '#f59e0b15', border: '1px solid #f59e0b30', padding: '1px 6px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Lock size={9} /> İç Not</span>}
            {msg.status === 'sending' && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>gönderiliyor…</span>}
          </div>
          {sentAt && <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1 }}>{fmtDateTime(sentAt)}</p>}
        </div>
        <span style={{ flexShrink: 0, color: 'var(--text-secondary)' }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '4px 14px 14px' }}>
          {msg.bodyHtml ? (
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.bodyHtml) }} />
          ) : (
            <pre style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.6, margin: 0 }}>
              {msg.bodyText || msg.body_text}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ORTA PANEL: YANIT EDİTÖRÜ
// ─────────────────────────────────────────────

function ReplyEditor({ ticket }: { ticket: Ticket }) {
  const [mode, setMode] = useState<'reply' | 'internal'>('reply');
  const [draft, setDraft] = useState('');
  const [cc, setCc] = useState('');
  const qc = useQueryClient();
  const isChild = ticket.isChild || ticket.is_child;

  const sendMutation = useMutation({
    mutationFn: () => ticketsApi.addMessage(ticket.id, {
      bodyText: draft,
      isInternal: mode === 'internal',
      ccAddresses: (mode === 'reply' && cc.trim()) ? cc.trim() : undefined,
    }),
    onMutate: async () => {
      const optimistic = { id: `opt-${Date.now()}`, direction: 'OUTBOUND', bodyText: draft, isInternal: mode === 'internal', createdAt: new Date().toISOString(), status: 'sending' };
      qc.setQueryData(['ticket-messages', ticket.id], (old: any) => {
        const msgs = old?.data?.data ?? [];
        return { ...old, data: { ...old?.data, data: [...msgs, optimistic] } };
      });
      return { optimistic };
    },
    onSuccess: () => { setDraft(''); qc.invalidateQueries({ queryKey: ['ticket-messages', ticket.id] }); },
    onError: (_err: any, _vars: any, ctx: any) => {
      qc.setQueryData(['ticket-messages', ticket.id], (old: any) => {
        const msgs = old?.data?.data ?? [];
        return { ...old, data: { ...old?.data, data: msgs.filter((m: any) => m.id !== ctx?.optimistic?.id) } };
      });
    },
  });

  if (ticket.closedAt) return null;

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <button onClick={() => setMode('reply')} disabled={isChild} style={{ padding: '10px 16px', fontSize: 12, fontWeight: 500, border: 'none', borderBottom: `2px solid ${mode === 'reply' ? '#6366f1' : 'transparent'}`, color: mode === 'reply' ? '#6366f1' : 'var(--text-secondary)', background: 'none', cursor: isChild ? 'not-allowed' : 'pointer', opacity: isChild ? 0.4 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Reply size={13} /> Müşteriye Yanıt
        </button>
        <button onClick={() => setMode('internal')} style={{ padding: '10px 16px', fontSize: 12, fontWeight: 500, border: 'none', borderBottom: `2px solid ${mode === 'internal' ? '#f59e0b' : 'transparent'}`, color: mode === 'internal' ? '#f59e0b' : 'var(--text-secondary)', background: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Lock size={13} /> İç Not
        </button>
      </div>

      {isChild && mode === 'reply' && (
        <div style={{ padding: '8px 14px', background: '#f59e0b10', borderBottom: '1px solid #f59e0b30', fontSize: 11, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={12} /> Child ticket'larda müşteriye doğrudan yanıt gönderilemez. İç not kullanın.
        </div>
      )}

      {mode === 'reply' && !isChild && (
        <div style={{ padding: '6px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>CC:</span>
          <input
            value={cc}
            onChange={e => setCc(e.target.value)}
            placeholder="ornek@email.com, diger@email.com"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, color: 'var(--text-primary)', background: 'transparent' }}
          />
        </div>
      )}

      <textarea value={draft} onChange={e => setDraft(e.target.value)}
        disabled={(isChild && mode === 'reply') || sendMutation.isPending}
        placeholder={isChild && mode === 'reply' ? '(Yanıt devre dışı)' : mode === 'internal' ? 'İç not — müşteri görmez…' : 'Müşteriye yanıt yaz…'}
        rows={4}
        style={{ width: '100%', padding: '12px 14px', resize: 'none', border: 'none', fontSize: 13, color: 'var(--text-primary)', background: 'transparent', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderTop: '1px solid var(--border)' }}>
        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{draft.length > 0 ? `${draft.length} karakter` : ''}</span>
        <button onClick={() => sendMutation.mutate()}
          disabled={!draft.trim() || sendMutation.isPending || (isChild && mode === 'reply')}
          style={{ padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#fff', background: mode === 'internal' ? '#f59e0b' : '#6366f1', opacity: (!draft.trim() || (isChild && mode === 'reply')) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
          {sendMutation.isPending ? <><Spinner size={12} /> Gönderiliyor</> : mode === 'internal' ? <><Plus size={13} /> Not Ekle</> : <><Send size={13} /> Gönder</>}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ORTA PANEL: KATEGORİ ETİKETLERİ
// ─────────────────────────────────────────────

function CategoryPickerModal({ ticketId, projectId, onClose }: { ticketId: string; projectId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [selectedTop, setSelectedTop] = useState<any>(null);
  const [selectedMid, setSelectedMid] = useState<any>(null);

  const { data: catRes, isLoading } = useQuery({
    queryKey: ['project-categories', projectId],
    queryFn: () => api.get(`/projects/${projectId}/categories`),
    staleTime: 300_000,
  });
  const topLevel: any[] = catRes?.data?.data ?? catRes?.data ?? [];

  const addMutation = useMutation({
    mutationFn: (categoryId: string) => ticketsApi.addCategory(ticketId, categoryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-categories', ticketId] });
      onClose();
    },
  });

  const mids: any[] = selectedTop?.children ?? [];
  const subs: any[] = selectedMid?.children ?? [];

  return (
    <ModalShell title="Kategori Ekle" onClose={onClose}>
      {isLoading ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--text-secondary)', padding: '20px 0' }}>
          <Spinner size={14} /> Yükleniyor…
        </div>
      ) : topLevel.length === 0 ? (
        <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
          Bu proje için henüz kategori tanımlanmamış.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, minHeight: 200 }}>
          {/* Üst Kategori */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: 8 }}>Üst Kategori</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {topLevel.map((top: any) => (
                <button key={top.id}
                  onClick={() => { setSelectedTop(top); setSelectedMid(null); }}
                  style={{
                    textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: '1px solid',
                    fontSize: 12, cursor: 'pointer', fontWeight: 500,
                    borderColor: selectedTop?.id === top.id ? '#6366f1' : 'var(--border)',
                    background: selectedTop?.id === top.id ? '#6366f115' : 'transparent',
                    color: selectedTop?.id === top.id ? '#6366f1' : 'var(--text-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                  <span>📂 {top.name}</span>
                  {top.children?.length > 0 && <span style={{ fontSize: 10 }}>▶</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Kategori */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: 8 }}>Kategori</p>
            {!selectedTop ? (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>← Üst kategori seçin</p>
            ) : mids.length === 0 ? (
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 8 }}>Alt kategori yok</p>
                <button onClick={() => addMutation.mutate(selectedTop.id)}
                  disabled={addMutation.isPending}
                  style={{ ...{padding: '7px 14px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer'} }}>
                  Bu kategoriyi ekle
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {mids.map((mid: any) => (
                  <button key={mid.id}
                    onClick={() => {
                      if (!mid.children?.length) { addMutation.mutate(mid.id); }
                      else { setSelectedMid(mid); }
                    }}
                    style={{
                      textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: '1px solid',
                      fontSize: 12, cursor: 'pointer', fontWeight: 500,
                      borderColor: selectedMid?.id === mid.id ? '#6366f1' : 'var(--border)',
                      background: selectedMid?.id === mid.id ? '#6366f115' : 'transparent',
                      color: selectedMid?.id === mid.id ? '#6366f1' : 'var(--text-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                    <span>📁 {mid.name}</span>
                    {mid.children?.length > 0 ? <span style={{ fontSize: 10 }}>▶</span> : <span style={{ fontSize: 10, color: '#10b981' }}>+</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Alt Kategori */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: 8 }}>Alt Kategori</p>
            {!selectedMid ? (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>← Kategori seçin</p>
            ) : subs.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>Alt kategori yok</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {subs.map((sub: any) => (
                  <button key={sub.id}
                    onClick={() => addMutation.mutate(sub.id)}
                    disabled={addMutation.isPending}
                    style={{
                      textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
                      fontSize: 12, cursor: 'pointer', background: 'transparent',
                      color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                    <span>📄 {sub.name}</span>
                    <span style={{ fontSize: 10, color: '#10b981' }}>+</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </ModalShell>
  );
}

function CategoryPanel({ ticketId, projectId }: { ticketId: string; projectId: string }) {
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: res } = useQuery({
    queryKey: ['ticket-categories', ticketId],
    queryFn: () => ticketsApi.getCategories(ticketId),
  });
  const assigned: any[] = res?.data?.data ?? [];

  const removeMutation = useMutation({
    mutationFn: (catId: string) => ticketsApi.removeCategory(ticketId, catId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket-categories', ticketId] }),
  });

  return (
    <>
      {pickerOpen && (
        <CategoryPickerModal
          ticketId={ticketId}
          projectId={projectId}
          onClose={() => setPickerOpen(false)}
        />
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Kategoriler:</span>
        {assigned.map((cat: any) => (
          <span key={cat.categoryId ?? cat.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 500, background: '#6366f122', color: '#6366f1', border: '1px solid #6366f144' }}>
            {cat.category?.name ?? cat.name}
            <button onClick={() => removeMutation.mutate(cat.categoryId ?? cat.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}>
              <X size={11} />
            </button>
          </span>
        ))}
        <button onClick={() => setPickerOpen(true)}
          style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 999, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Plus size={11} /> Ekle
        </button>
      </div>
    </>
  );
}

function ThreadPanel({ ticket, messages }: { ticket: Ticket; messages: TicketMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: 13 }}>Henüz mesaj yok</div>
        ) : (
          messages.map((msg: any) => <MessageItem key={msg.id} msg={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)' }}>
        <CategoryPanel ticketId={ticket.id} projectId={ticket.projectId} />
      </div>

      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
        <ReplyEditor ticket={ticket} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SAĞ PANEL: SLA SAYACI
// ─────────────────────────────────────────────

function SlaWidget({ ticketId }: { ticketId: string }) {
  const { data: res } = useQuery({
    queryKey: ['ticket-sla', ticketId],
    queryFn: () => ticketsApi.getSla(ticketId),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const sla = res?.data?.data;
  const deadline = sla?.resolutionDeadline ?? sla?.resolution_deadline ?? sla?.slaDeadlineAt;
  const remaining = useSlaCountdown(deadline);
  if (!sla && !deadline) return null;

  const paused = sla?.isPaused || sla?.is_paused;
  const breached = sla?.isResolutionBreached || sla?.is_resolution_breached || (remaining !== null && remaining <= 0);
  const warning = !breached && remaining !== null && remaining < 3600;

  const color = paused ? 'var(--text-secondary)' : breached ? '#ef4444' : warning ? '#f59e0b' : '#10b981';
  const borderColor = paused ? 'var(--border)' : breached ? '#ef444430' : warning ? '#f59e0b30' : '#10b98130';

  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 12, padding: 14, background: 'var(--bg-card)' }}>
      <SectionLabel>SLA</SectionLabel>
      {deadline ? (
        <>
          <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>Çözüm Deadline</p>
          <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color, marginBottom: 2 }}>
            {paused ? '—' : remaining !== null ? formatSlaRemaining(remaining) : '…'}
          </p>
          <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{fmtDateTime(deadline)}</p>
          {paused && <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={10} /> Durduruldu</p>}
        </>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>SLA tanımlı değil</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SAĞ PANEL: EKLER
// ─────────────────────────────────────────────

function AttachmentsWidget({ ticketId }: { ticketId: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: res } = useQuery({
    queryKey: ['ticket-attachments', ticketId],
    queryFn: () => ticketsApi.getAttachments(ticketId),
  });
  const attachments: any[] = res?.data?.data ?? [];

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData(); fd.append('file', file);
      return ticketsApi.addAttachment(ticketId, fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket-attachments', ticketId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (attId: string) => api.delete(`/tickets/${ticketId}/attachments/${attId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket-attachments', ticketId] }),
  });

  const fileIcon = (ct: string) => {
    if (ct?.startsWith('image/')) return <Image size={14} color="var(--text-secondary)" />;
    if (ct?.includes('pdf')) return <FileText size={14} color="var(--text-secondary)" />;
    if (ct?.includes('zip') || ct?.includes('rar')) return <Archive size={14} color="var(--text-secondary)" />;
    return <Paperclip size={14} color="var(--text-secondary)" />;
  };

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <SectionLabel>Ekler {attachments.length > 0 ? `(${attachments.length})` : ''}</SectionLabel>
        <button onClick={() => fileRef.current?.click()} disabled={uploadMutation.isPending}
          style={{ fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {uploadMutation.isPending ? <Spinner size={11} /> : <><Plus size={11} /> Ekle</>}
        </button>
        <input ref={fileRef} type="file" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadMutation.mutate(f); e.target.value = ''; }} />
      </div>

      {attachments.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', padding: '8px 0', fontStyle: 'italic' }}>Ek bulunamadı</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {attachments.map((att: any) => (
            <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {fileIcon(att.contentType ?? att.mimeType ?? att.content_type)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.filename}</p>
                <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{fmtBytes(att.sizeBytes ?? att.size_bytes ?? 0)}</p>
              </div>
              <a href={`/api/v1/tickets/${ticketId}/attachments/${att.id}/download`} download={att.filename}
                style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                <Download size={13} />
              </a>
              <button
                onClick={() => deleteMutation.mutate(att.id)}
                disabled={deleteMutation.isPending}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', opacity: deleteMutation.isPending ? 0.5 : 1 }}
                title="Sil"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SAĞ PANEL: ONAY ZİNCİRİ
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// SAĞ PANEL: ÇÖZÜM SETLERİ
// ─────────────────────────────────────────────

function ResolutionsWidget({ ticketId }: { ticketId: string }) {
  const qc = useQueryClient();
  const { data: res } = useQuery({
    queryKey: ['ticket-resolutions', ticketId],
    queryFn: () => api.get(`/tickets/${ticketId}/resolutions`),
    staleTime: 0,
  });
  const resolutions: any[] = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];

  const deleteMutation = useMutation({
    mutationFn: (rid: string) => api.delete(`/tickets/${ticketId}/resolutions/${rid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket-resolutions', ticketId] }),
  });

  if (resolutions.length === 0) return null;

  const statusColor = (status: string) => {
    if (status === 'APPROVED') return '#10b981';
    if (status === 'REJECTED') return '#ef4444';
    return '#f59e0b';
  };

  const statusLabel = (status: string) => {
    if (status === 'APPROVED') return 'Onaylandı';
    if (status === 'REJECTED') return 'Reddedildi';
    return 'Beklemede';
  };

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: 'var(--bg-card)' }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: 10 }}>
        Çözüm Setleri ({resolutions.length})
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {resolutions.map((r: any) => (
          <div key={r.id} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                {r.resolutionType?.name ?? '—'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: statusColor(r.status), background: `${statusColor(r.status)}15`, padding: '1px 6px', borderRadius: 999 }}>
                  {statusLabel(r.status)}
                </span>
                {r.status === 'PENDING' && (
                  <button
                    onClick={() => deleteMutation.mutate(r.id)}
                    disabled={deleteMutation.isPending}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', padding: 0 }}
                    title="Sil"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: r.compensationTl ? 4 : 0 }}>{r.description}</p>
            {r.compensationTl && (
              <p style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>₺{Number(r.compensationTl).toLocaleString('tr-TR')}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ApprovalsWidget({ ticketId }: { ticketId: string }) {
  const { data: res } = useQuery({
    queryKey: ['ticket-approvals', ticketId],
    queryFn: () => ticketsApi.getApprovals(ticketId),
  });
  const approvals: any[] = res?.data?.data ?? [];
  if (approvals.length === 0) return null;

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: 'var(--bg-card)' }}>
      <SectionLabel>Onay Zinciri</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {approvals.map((a: any) => (
          <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ marginTop: 1, flexShrink: 0 }}>
              {a.decision === 'approved'
                ? <CheckCircle size={15} color="#10b981" />
                : a.decision === 'rejected'
                ? <XCircle size={15} color="#ef4444" />
                : <Clock size={15} color="#f59e0b" />}
            </span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                {a.approverName ?? a.approver_name ?? `${a.approver?.firstName ?? ''} ${a.approver?.lastName ?? ''}`.trim()}
              </p>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{a.level}</p>
              {a.comment && <p style={{ fontSize: 10, color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 2 }}>"{a.comment}"</p>}
              {!a.decision && <p style={{ fontSize: 10, color: '#f59e0b', marginTop: 2 }}>Bekleniyor…</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SAĞ PANEL: AKSİYONLAR
// ─────────────────────────────────────────────

function ActionPanel({ ticket, onModal }: { ticket: Ticket; onModal: (m: string) => void }) {
  const qc = useQueryClient();
  const isForwarded = ticket.isForwarded || ticket.is_forwarded;

  const recallMutation = useMutation({
    mutationFn: () => ticketsApi.recall(ticket.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket', ticket.id] }),
  });

  if (ticket.closedAt) {
    return (
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: 'var(--bg-card)' }}>
        <SectionLabel>Aksiyonlar</SectionLabel>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', padding: '8px 0', fontStyle: 'italic' }}>Ticket kapalı</p>
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: 'var(--bg-card)' }}>
      <SectionLabel>Aksiyonlar</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <ActionBtn onClick={() => onModal('forward')}><ArrowUpRight size={14} /> Departmana Yönlendir</ActionBtn>
        {isForwarded && (
          <ActionBtn onClick={() => recallMutation.mutate()} disabled={recallMutation.isPending}>
            <Reply size={14} /> {recallMutation.isPending ? 'Geri alınıyor…' : 'Recall Et'}
          </ActionBtn>
        )}
        <ActionBtn onClick={() => onModal('split')}><Scissors size={14} /> Ticket'ı Böl</ActionBtn>
        <ActionBtn onClick={() => onModal('merge')}><Shuffle size={14} /> Ticket'ı Birleştir</ActionBtn>
        <ActionBtn onClick={() => onModal('transfer')}><Package size={14} /> Projeye Transfer</ActionBtn>
        <ActionBtn onClick={() => onModal('resolution')} variant="success"><CheckSquare size={14} /> Çözüm Seti Ekle</ActionBtn>
        <ActionBtn onClick={() => onModal('rootcause')}><Search size={14} /> Kök Neden Kaydet</ActionBtn>
        <ActionBtn onClick={() => onModal('close')} variant="danger"><Lock size={14} /> Ticket'ı Kapat</ActionBtn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// RELATED TICKET BANNER
// ─────────────────────────────────────────────

function RelatedBanner({ ticketId, related }: { ticketId: string; related: any[] }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`dismissed-related-${ticketId}`) ?? 'false'); }
    catch { return false; }
  });

  if (dismissed || related.length === 0) return null;

  return (
    <div style={{ margin: '10px 20px 0', padding: '10px 14px', borderRadius: 10, border: '1px solid #f59e0b40', background: '#f59e0b08', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <AlertTriangle size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
        Bu müşterinin <strong style={{ color: 'var(--text-primary)' }}>{related.length}</strong> açık ticket'ı daha var.
      </p>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {related.slice(0, 3).map((r: any) => (
          <button key={r.id} onClick={() => navigate(`/tickets/${r.id}`)}
            style={{ fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace' }}>
            #{r.ticketNo}
          </button>
        ))}
        <button onClick={() => { setDismissed(true); localStorage.setItem(`dismissed-related-${ticketId}`, 'true'); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ANA BİLEŞEN
// ─────────────────────────────────────────────

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { projectRole } = useProjectStore();
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const { data: ticketRes, isLoading, isError } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsApi.get(id!),
    enabled: !!id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: messagesRes } = useQuery({
    queryKey: ['ticket-messages', id],
    queryFn: () => ticketsApi.getMessages(id!),
    enabled: !!id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: relatedRes } = useQuery({
    queryKey: ['ticket-related', id],
    queryFn: () => ticketsApi.getRelated(id!),
    enabled: !!id,
  });

  const ticket = ticketRes?.data?.data;
  const messages: any[] = messagesRes?.data?.data ?? [];
  const related: any[] = relatedRes?.data?.data ?? [];

  // Yetki kontrolü — mevcut projenle aynı mantık
  // viewed hook
  useEffect(() => {
    if (ticket?.id && !ticket?.viewedAt) {
      api.post(`/tickets/${ticket.id}/viewed`).catch(() => {});
    }
  }, [ticket?.id]);

  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' ||
    user?.role === 'SUPERVISOR' || projectRole === 'ADMIN' || projectRole === 'SUPERVISOR' ||
    ticket?.assigneeId === user?.id ||
    ticket?.ownerId === user?.id;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12, color: 'var(--text-secondary)' }}>
        <Spinner size={20} /> Ticket yükleniyor…
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12 }}>
        <AlertTriangle size={36} color="#f59e0b" />
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Ticket yüklenemedi.</p>
        <button onClick={() => navigate('/tickets')}
          style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={14} /> Listeye Dön
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>

      {/* TOPBAR */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', flexShrink: 0 }}>
        <button onClick={() => navigate('/tickets')}
          style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={14} /> Ticketlar
        </button>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>#{ticket.ticketNo}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ticket.subject}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{timeAgo(ticket.createdAt)}</span>
        </div>
      </div>

      {/* RELATED BANNER */}
      <RelatedBanner ticketId={id!} related={related} />

      {/* 3 KOLON */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* SOL — 272px */}
        <div style={{ width: 272, flexShrink: 0, overflow: 'hidden' }}>
          <CustomerPanel ticket={ticket} />
        </div>

        {/* ORTA — esnek */}
        <div style={{ flex: 1, overflow: 'hidden', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
          <ThreadPanel ticket={ticket} messages={messages} />
        </div>

        {/* SAĞ — 252px, sadece yetkiliye */}
        {canEdit && (
          <div style={{ width: 252, flexShrink: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12, backgroundColor: 'var(--bg-secondary)' }}>
            <SlaWidget ticketId={id!} />
            <ActionPanel ticket={ticket} onModal={setActiveModal} />
            <AttachmentsWidget ticketId={id!} />
            <ResolutionsWidget ticketId={id!} />
            <ApprovalsWidget ticketId={id!} />
          </div>
        )}
      </div>

      {/* MODALLER */}
      {activeModal === 'forward' && <ForwardModal ticket={ticket} onClose={() => setActiveModal(null)} />}
      {activeModal === 'close' && <CloseModal ticket={ticket} onClose={() => setActiveModal(null)} />}
      {activeModal === 'split' && <SplitModal ticket={ticket} onClose={() => setActiveModal(null)} />}
      {activeModal === 'merge' && <MergeModal ticket={ticket} onClose={() => setActiveModal(null)} />}
      {activeModal === 'transfer' && <TransferModal ticket={ticket} onClose={() => setActiveModal(null)} />}
      {activeModal === 'resolution' && <ResolutionModal ticket={ticket} onClose={() => setActiveModal(null)} />}
      {['rootcause'].includes(activeModal ?? '') && (
        <PlaceholderModal type={activeModal!} onClose={() => setActiveModal(null)} />
      )}
    </div>
  );
}

