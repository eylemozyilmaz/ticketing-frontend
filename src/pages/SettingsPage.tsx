
/**
 * src/pages/SettingsPage.tsx
 *
 * Proje ayarları sayfası — sol nav + sağ içerik layout.
 * Bölümler: Genel, Statüler, Kategoriler, Özel Alanlar,
 *           Çözüm Türleri, Departmanlar
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useProjectStore } from '../store/project.store';
import api from '../api/client';
import { PERMISSIONS, PERMISSION_GROUPS } from '../constants/permissions';

// ─────────────────────────────────────────────
// YARDIMCI
// ─────────────────────────────────────────────

function extractData(res: any): any[] {
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

// ─────────────────────────────────────────────
// ORTAK STİLLER
// ─────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  fontSize: 13,
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  boxSizing: 'border-box',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-secondary)',
  display: 'block',
  marginBottom: 6,
};

const btnPrimary: React.CSSProperties = {
  padding: '7px 16px',
  borderRadius: 8,
  border: 'none',
  background: '#6366f1',
  color: '#fff',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
  ...btnPrimary,
  background: '#ef4444',
};

const btnGhost: React.CSSProperties = {
  ...btnPrimary,
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text-secondary)',
};

// ─────────────────────────────────────────────
// BÖLÜM: GENEL BİLGİLER
// ─────────────────────────────────────────────

const DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Pazartesi' },
  { key: 'tue', label: 'Salı' },
  { key: 'wed', label: 'Çarşamba' },
  { key: 'thu', label: 'Perşembe' },
  { key: 'fri', label: 'Cuma' },
  { key: 'sat', label: 'Cumartesi' },
  { key: 'sun', label: 'Pazar' },
];

function GeneralSection({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { data: res, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`),
    staleTime: 60_000,
  });
  const project = res?.data?.data ?? res?.data;

  const [form, setForm] = useState({
    name: '',
    defaultSignature: '',
    outOfHoursMessage: '',
    temporaryClosureMessage: '',
    autoReplyEnabled: false,
    autoReplyMessage: '',
    isTemporarilyClosed: false,
    reopenAt: '',
    workingHours: {} as Record<string, { start: string; end: string; isOpen: boolean }>,
  });
  const [initialized, setInitialized] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Veriler yüklenince formu doldur
  if (project && !initialized) {
    setForm({
      name: project.name ?? '',
      defaultSignature: project.defaultSignature ?? '',
      outOfHoursMessage: project.outOfHoursMessage ?? '',
      temporaryClosureMessage: project.temporaryClosureMessage ?? '',
      autoReplyEnabled: project.autoReplyEnabled ?? false,
      autoReplyMessage: project.autoReplyMessage ?? '',
      isTemporarilyClosed: project.isTemporarilyClosed ?? false,
      reopenAt: project.reopenAt ? new Date(project.reopenAt).toISOString().slice(0, 16) : '',
      workingHours: project.workingHours ?? {
        mon: { start: '09:00', end: '18:00', isOpen: true },
        tue: { start: '09:00', end: '18:00', isOpen: true },
        wed: { start: '09:00', end: '18:00', isOpen: true },
        thu: { start: '09:00', end: '18:00', isOpen: true },
        fri: { start: '09:00', end: '18:00', isOpen: true },
        sat: { start: '09:00', end: '13:00', isOpen: false },
        sun: { start: '09:00', end: '13:00', isOpen: false },
      },
    });
    setInitialized(true);
  }

  const setField = (field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }));
    setDirty(true);
  };

  const setWorkingHour = (day: string, field: string, value: any) => {
    setForm(f => ({
      ...f,
      workingHours: {
        ...f.workingHours,
        [day]: { ...f.workingHours[day], [field]: value },
      },
    }));
    setDirty(true);
  };

  const mutation = useMutation({
    mutationFn: () => api.patch(`/projects/${projectId}`, {
      name: form.name,
      defaultSignature: form.defaultSignature || undefined,
      outOfHoursMessage: form.outOfHoursMessage || undefined,
      temporaryClosureMessage: form.temporaryClosureMessage || undefined,
      autoReplyEnabled: form.autoReplyEnabled,
      autoReplyMessage: form.autoReplyMessage || undefined,
      isTemporarilyClosed: form.isTemporarilyClosed,
      reopenAt: form.reopenAt ? new Date(form.reopenAt).toISOString() : undefined,
      workingHours: form.workingHours,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      setDirty(false);
    },
  });

  if (isLoading) return <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Yükleniyor…</p>;

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Genel Bilgiler</h2>

      {/* Temel bilgiler */}
      <div style={card}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>Proje Bilgileri</h3>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Proje Adı *</label>
          <input value={form.name} onChange={e => setField('name', e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Varsayılan İmza</label>
          <textarea value={form.defaultSignature} onChange={e => setField('defaultSignature', e.target.value)}
            rows={4} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Müşteriye gönderilen maillerin altına eklenir…" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Mesai Dışı Mesajı</label>
          <textarea value={form.outOfHoursMessage} onChange={e => setField('outOfHoursMessage', e.target.value)}
            rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Mesai saatleri dışında otomatik gönderilir…" />
        </div>
        <div style={{ marginBottom: 0 }}>
          <label style={labelStyle}>Geçici Kapatma Mesajı</label>
          <textarea value={form.temporaryClosureMessage} onChange={e => setField('temporaryClosureMessage', e.target.value)}
            rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Proje geçici kapatıldığında gönderilir…" />
        </div>
      </div>

      {/* Çalışma saatleri */}
      <div style={card}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>Çalışma Saatleri</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DAYS.map(day => {
            const dh = form.workingHours[day.key] ?? { start: '09:00', end: '18:00', isOpen: false };
            return (
              <div key={day.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Açık/Kapalı toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', minWidth: 100 }}>
                  <input type="checkbox" checked={dh.isOpen} onChange={e => setWorkingHour(day.key, 'isOpen', e.target.checked)}
                    style={{ accentColor: '#6366f1' }} />
                  <span style={{ fontSize: 12, color: dh.isOpen ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: dh.isOpen ? 600 : 400 }}>
                    {day.label}
                  </span>
                </label>

                {/* Saat aralığı */}
                {dh.isOpen ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="time" value={dh.start} onChange={e => setWorkingHour(day.key, 'start', e.target.value)}
                      style={{ ...inputStyle, width: 110, padding: '5px 8px' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>—</span>
                    <input type="time" value={dh.end} onChange={e => setWorkingHour(day.key, 'end', e.target.value)}
                      style={{ ...inputStyle, width: 110, padding: '5px 8px' }} />
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>Kapalı</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={() => mutation.mutate()} disabled={!dirty || mutation.isPending} style={btnPrimary}>
        {mutation.isPending ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
      </button>

      {/* Geçici Kapatma */}
      <div style={{ ...card, marginTop: 16, borderColor: form.isTemporarilyClosed ? '#f59e0b' : 'var(--border)', background: form.isTemporarilyClosed ? '#f59e0b08' : 'var(--bg-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Geçici Kapatma</h3>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Proje kapalıyken gelen maillere otomatik mesaj gönderilir</p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <span style={{ fontSize: 12, color: form.isTemporarilyClosed ? '#f59e0b' : 'var(--text-secondary)', fontWeight: 600 }}>
              {form.isTemporarilyClosed ? 'Kapalı' : 'Açık'}
            </span>
            <div
              onClick={() => setField('isTemporarilyClosed', !form.isTemporarilyClosed)}
              style={{
                width: 40, height: 22, borderRadius: 999, cursor: 'pointer', transition: 'background 0.2s',
                background: form.isTemporarilyClosed ? '#f59e0b' : 'var(--border)',
                position: 'relative',
              }}
            >
              <div style={{
                position: 'absolute', top: 2, width: 18, height: 18, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', left: form.isTemporarilyClosed ? 20 : 2,
              }} />
            </div>
          </label>
        </div>

        {form.isTemporarilyClosed && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Yeniden Açılış Tarihi (opsiyonel)</label>
              <input type="datetime-local" value={form.reopenAt}
                onChange={e => setField('reopenAt', e.target.value)}
                style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Kapatma Mesajı</label>
              <textarea value={form.temporaryClosureMessage}
                onChange={e => setField('temporaryClosureMessage', e.target.value)}
                rows={3} style={{ ...inputStyle, resize: 'vertical' }}
                placeholder="Geçici olarak kapalıyız…" />
            </div>
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
              style={{ ...btnPrimary, background: '#f59e0b', marginTop: 12 }}>
              {mutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        )}
      </div>

      {/* Otomatik Yanıt */}
      <div style={{ ...card, marginTop: 16, borderColor: form.autoReplyEnabled ? '#10b981' : 'var(--border)', background: form.autoReplyEnabled ? '#10b98108' : 'var(--bg-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Otomatik Yanıt</h3>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Yeni ticket açıldığında müşteriye otomatik mail gönderilir</p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <span style={{ fontSize: 12, color: form.autoReplyEnabled ? '#10b981' : 'var(--text-secondary)', fontWeight: 600 }}>
              {form.autoReplyEnabled ? 'Aktif' : 'Pasif'}
            </span>
            <div
              onClick={() => setField('autoReplyEnabled', !form.autoReplyEnabled)}
              style={{
                width: 40, height: 22, borderRadius: 999, cursor: 'pointer', transition: 'background 0.2s',
                background: form.autoReplyEnabled ? '#10b981' : 'var(--border)',
                position: 'relative',
              }}
            >
              <div style={{
                position: 'absolute', top: 2, width: 18, height: 18, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', left: form.autoReplyEnabled ? 20 : 2,
              }} />
            </div>
          </label>
        </div>

        {form.autoReplyEnabled && (
          <div>
            <label style={labelStyle}>Otomatik Yanıt Mesajı</label>
            <textarea value={form.autoReplyMessage}
              onChange={e => setField('autoReplyMessage', e.target.value)}
              rows={4} style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Talebiniz alındı. En kısa sürede dönüş yapacağız…" />
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
              style={{ ...btnPrimary, background: '#10b981', marginTop: 12 }}>
              {mutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        )}
      </div>

      {/* Tehlikeli Alan — sadece SUPER_ADMIN */}
      {user?.role === 'SUPER_ADMIN' && <DangerZone projectId={projectId} />}
    </div>
  );
}

// ─────────────────────────────────────────────
// BÖLÜM: TEHLİKELİ ALAN (SUPER_ADMIN)
// ─────────────────────────────────────────────

function DangerZone({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const { setCurrentProject, setStatuses } = useProjectStore();
  const [confirm, setConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/projects/${projectId}`),
    onSuccess: () => {
      localStorage.removeItem("currentProject");
      window.location.href = "/login";
    },
  });

  return (
    <div style={{ ...card, marginTop: 16, borderColor: '#ef4444', background: '#ef444408' }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 6 }}>⚠️ Tehlikeli Alan</h3>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
        Bu projeyi silmek geri alınamaz. Tüm ticketlar, kategoriler ve ayarlar kalıcı olarak silinir.
      </p>

      {!confirm ? (
        <button onClick={() => setConfirm(true)} style={{ ...btnDanger, fontSize: 12 }}>
          Projeyi Sil
        </button>
      ) : (
        <div>
          <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 8 }}>
            Onaylamak için <strong>SİL</strong> yazın:
          </p>
          <input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            style={{ ...inputStyle, marginBottom: 10, borderColor: '#ef4444' }}
            placeholder="SİL"
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={confirmText !== 'SİL' || deleteMutation.isPending}
              style={{ ...btnDanger, opacity: confirmText !== 'SİL' ? 0.5 : 1 }}>
              {deleteMutation.isPending ? 'Siliniyor…' : 'Evet, Kalıcı Olarak Sil'}
            </button>
            <button onClick={() => { setConfirm(false); setConfirmText(''); }} style={btnGhost}>
              İptal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// BÖLÜM: STATÜLER
// ─────────────────────────────────────────────

function StatusesSection({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', color: '#6366f1', sortOrder: 0 });
  const [editColorId, setEditColorId] = useState<string | null>(null);
  const [editColor, setEditColor] = useState('');

  const { data: res } = useQuery({
    queryKey: ['project-statuses', projectId],
    queryFn: () => api.get(`/projects/${projectId}/statuses`),
  });
  const statuses = extractData(res);

  // Sistem statüleri — isInitial veya isClosed olanlar
  const systemStatuses = statuses.filter((s: any) => s.isInitial || s.isClosed);
  // Agent statüleri — ikisi de false olanlar
  const agentStatuses = statuses.filter((s: any) => !s.isInitial && !s.isClosed);

  const createMutation = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/statuses`, {
      ...form, isInitial: false, isClosed: false,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-statuses', projectId] });
      setShowForm(false);
      setForm({ name: '', color: '#6366f1', sortOrder: 0 });
    },
  });

  const updateColorMutation = useMutation({
    mutationFn: ({ id, color }: { id: string; color: string }) =>
      api.patch(`/projects/${projectId}/statuses/${id}`, { color }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-statuses', projectId] });
      setEditColorId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/projects/${projectId}/statuses/${id}`, { isActive: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-statuses', projectId] }),
  });

  const StatusRow = ({ s, canDelete }: { s: any; canDelete: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      {/* Renk — tıklanabilir */}
      <div
        onClick={() => { setEditColorId(s.id); setEditColor(s.color); }}
        style={{ width: 14, height: 14, borderRadius: '50%', background: s.color, flexShrink: 0, cursor: 'pointer', border: '2px solid transparent', outline: editColorId === s.id ? `2px solid ${s.color}` : 'none' }}
        title="Rengi değiştir"
      />
      {editColorId === s.id && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)}
            style={{ width: 32, height: 28, border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', padding: 2 }} />
          <button onClick={() => updateColorMutation.mutate({ id: s.id, color: editColor })}
            style={{ ...btnPrimary, padding: '3px 8px', fontSize: 11 }}>✓</button>
          <button onClick={() => setEditColorId(null)} style={{ ...btnGhost, padding: '3px 8px', fontSize: 11 }}>✕</button>
        </div>
      )}
      <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{s.name}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {s.isInitial && <span style={{ fontSize: 10, color: '#10b981', background: '#10b98115', padding: '2px 6px', borderRadius: 999 }}>Başlangıç</span>}
        {s.isClosed && <span style={{ fontSize: 10, color: '#ef4444', background: '#ef444415', padding: '2px 6px', borderRadius: 999 }}>Kapanış</span>}
        {canDelete && (
          <button onClick={() => deleteMutation.mutate(s.id)}
            style={{ ...btnDanger, padding: '3px 8px', fontSize: 11 }}>Sil</button>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Statüler</h2>
        <button onClick={() => setShowForm(p => !p)} style={btnPrimary}>+ Agent Statüsü Ekle</button>
      </div>

      {/* Sistem statüleri */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Sistem Statüleri</h3>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 999 }}>
            Sistem tarafından otomatik kullanılır
          </span>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Bu statüler silinemez. Sadece renkleri değiştirilebilir.
        </p>
        {systemStatuses.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>Henüz sistem statüsü yok</p>
        ) : (
          systemStatuses.map((s: any) => <StatusRow key={s.id} s={s} canDelete={false} />)
        )}
      </div>

      {/* Agent statüleri */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Agent Statüleri</h3>
          <span style={{ fontSize: 11, color: '#6366f1', background: '#6366f115', padding: '2px 8px', borderRadius: 999 }}>
            Agent tarafından seçilir
          </span>
        </div>
        {agentStatuses.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>Henüz agent statüsü yok</p>
        ) : (
          agentStatuses.map((s: any) => <StatusRow key={s.id} s={s} canDelete={true} />)
        )}
      </div>

      {/* Yeni statü formu */}
      {showForm && (
        <div style={{ ...card, border: '1px solid #6366f1' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Yeni Agent Statüsü</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Statü Adı *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={inputStyle} placeholder="Örn: İşlemde, Beklemede, Eskale Edildi" />
            </div>
            <div>
              <label style={labelStyle}>Renk</label>
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                style={{ width: 40, height: 38, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
            </div>
            <div>
              <label style={labelStyle}>Sıra</label>
              <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                style={{ ...inputStyle, width: 60 }} min={0} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => createMutation.mutate()} disabled={!form.name || createMutation.isPending} style={btnPrimary}>Ekle</button>
            <button onClick={() => setShowForm(false)} style={btnGhost}>İptal</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// BÖLÜM: KATEGORİLER
// ─────────────────────────────────────────────

function CategoriesSection({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', parentId: '', level: '0' });
  const [openTop, setOpenTop] = useState<Record<string, boolean>>({});
  const [openMid, setOpenMid] = useState<Record<string, boolean>>({});

  const { data: res } = useQuery({
    queryKey: ['project-categories', projectId],
    queryFn: () => api.get(`/projects/${projectId}/categories`),
  });

  const topLevel: any[] = res?.data?.data ?? res?.data ?? [];
  const allMidLevel: any[] = topLevel.flatMap((t: any) => t.children ?? []);

  const getParentOptions = () => {
    if (form.level === '1') return topLevel;
    if (form.level === '2') return allMidLevel;
    return [];
  };

  const createMutation = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/categories`, {
      name: form.name,
      parentId: form.parentId || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-categories', projectId] });
      setShowForm(false);
      setForm({ name: '', parentId: '', level: '0' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${projectId}/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-categories', projectId] }),
  });

  const toggleApprovalMutation = useMutation({
    mutationFn: ({ id, requiresApproval }: { id: string; requiresApproval: boolean }) =>
      api.patch(`/projects/${projectId}/categories/${id}`, { requiresApproval }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-categories', projectId] }),
  });

  const levelLabels = ['Üst Kategori', 'Kategori', 'Alt Kategori'];

  const toggleBtn = (isOpen: boolean) => (
    <div style={{
      width: 20, height: 20, borderRadius: 4, border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, fontWeight: 700, color: '#6366f1', cursor: 'pointer',
      background: 'var(--bg-secondary)', flexShrink: 0, userSelect: 'none',
    }}>
      {isOpen ? '−' : '+'}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Kategoriler</h2>
        <button onClick={() => setShowForm(p => !p)} style={btnPrimary}>+ Yeni Ekle</button>
      </div>

      {showForm && (
        <div style={{ ...card, border: '1px solid #6366f1' }}>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Seviye *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {levelLabels.map((label, i) => (
                <button key={i}
                  onClick={() => setForm(f => ({ ...f, level: String(i), parentId: '' }))}
                  style={{
                    padding: '6px 14px', borderRadius: 8, border: '1px solid',
                    fontSize: 12, cursor: 'pointer', fontWeight: 500,
                    borderColor: form.level === String(i) ? '#6366f1' : 'var(--border)',
                    background: form.level === String(i) ? '#6366f115' : 'transparent',
                    color: form.level === String(i) ? '#6366f1' : 'var(--text-secondary)',
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {form.level !== '0' && (
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>{form.level === '1' ? 'Üst Kategori *' : 'Kategori *'}</label>
              <select value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))} style={inputStyle}>
                <option value="">— Seçin —</option>
                {getParentOptions().map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>{levelLabels[Number(form.level)]} Adı *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              style={inputStyle}
              placeholder={form.level === '0' ? 'Teknik Destek' : form.level === '1' ? 'Yazılım Sorunu' : 'Güncelleme Hatası'} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => createMutation.mutate()}
              disabled={!form.name || (form.level !== '0' && !form.parentId) || createMutation.isPending}
              style={btnPrimary}>Ekle</button>
            <button onClick={() => setShowForm(false)} style={btnGhost}>İptal</button>
          </div>
        </div>
      )}

      {/* Accordion Tree */}
      <div style={card}>
        {topLevel.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>Henüz kategori yok</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {topLevel.map((top: any) => {
              const isTopOpen = !!openTop[top.id];
              const mids: any[] = top.children ?? [];
              return (
                <div key={top.id}>
                  {/* Üst Kategori satırı */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 6px', borderRadius: 6, background: 'var(--bg-secondary)', marginBottom: 2 }}>
                    <div onClick={() => setOpenTop(p => ({ ...p, [top.id]: !p[top.id] }))}>
                      {toggleBtn(isTopOpen)}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
                      📂 {top.name}
                      {mids.length > 0 && (
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginLeft: 6 }}>({mids.length})</span>
                      )}
                    </span>
                    <button onClick={() => deleteMutation.mutate(top.id)} style={{ ...btnDanger, padding: '3px 8px', fontSize: 11 }}>Sil</button>
                  </div>

                  {/* Kategoriler — üst açıksa görünür */}
                  {isTopOpen && (
                    <div style={{ marginLeft: 28, marginBottom: 4 }}>
                      {mids.length === 0 ? (
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 0' }}>Alt kategori yok</p>
                      ) : (
                        mids.map((mid: any) => {
                          const isMidOpen = !!openMid[mid.id];
                          const subs: any[] = mid.children ?? [];
                          return (
                            <div key={mid.id}>
                              {/* Kategori satırı */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px', borderRadius: 6, marginBottom: 2 }}>
                                <div onClick={() => setOpenMid(p => ({ ...p, [mid.id]: !p[mid.id] }))}>
                                  {toggleBtn(isMidOpen)}
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
                                  📁 {mid.name}
                                  {subs.length > 0 && (
                                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginLeft: 6 }}>({subs.length})</span>
                                  )}
                                </span>
                                <button onClick={() => deleteMutation.mutate(mid.id)} style={{ ...btnDanger, padding: '3px 8px', fontSize: 11 }}>Sil</button>
                              </div>

                              {/* Alt Kategoriler — kategori açıksa görünür */}
                              {isMidOpen && (
                                <div style={{ marginLeft: 28, marginBottom: 4 }}>
                                  {subs.length === 0 ? (
                                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 0' }}>Alt kategori yok</p>
                                  ) : (
                                    subs.map((sub: any) => (
                                      <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', borderRadius: 6, marginBottom: 2 }}>
                                        <div style={{ width: 20, flexShrink: 0 }} />
                                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1 }}>📄 {sub.name}</span>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                          <input type="checkbox" checked={!!sub.requiresApproval}
                                            onChange={e => toggleApprovalMutation.mutate({ id: sub.id, requiresApproval: e.target.checked })} />
                                          Onaya Tabi
                                        </label>
                                        <button onClick={() => deleteMutation.mutate(sub.id)} style={{ ...btnDanger, padding: '3px 8px', fontSize: 11 }}>Sil</button>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BÖLÜM: ÖZEL ALANLAR
// ─────────────────────────────────────────────

const FIELD_TYPES = [
  { value: 'TEXT', label: 'Metin' },
  { value: 'DATE', label: 'Tarih' },
  { value: 'DATETIME', label: 'Tarih + Saat' },
  { value: 'AMOUNT', label: 'Tutar' },
  { value: 'SELECT', label: 'Seçim Listesi' },
];

function CustomFieldsSection({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fieldKey: '', displayName: '', fieldType: 'TEXT', isRequired: false, sortOrder: 0, options: '' });

  const { data: res } = useQuery({
    queryKey: ['custom-fields', projectId],
    queryFn: () => api.get(`/projects/${projectId}/custom-fields`),
  });
  const fields = extractData(res);

  const createMutation = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/custom-fields`, {
      fieldKey: form.fieldKey,
      displayName: form.displayName,
      fieldType: form.fieldType,
      isRequired: form.isRequired,
      sortOrder: form.sortOrder,
      options: form.fieldType === 'SELECT' ? form.options.split('\n').filter(Boolean) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-fields', projectId] });
      setShowForm(false);
      setForm({ fieldKey: '', displayName: '', fieldType: 'TEXT', isRequired: false, sortOrder: 0, options: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${projectId}/custom-fields/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-fields', projectId] }),
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Özel Alanlar</h2>
        <button onClick={() => setShowForm(p => !p)} style={btnPrimary}>+ Yeni Alan</button>
      </div>

      {showForm && (
        <div style={{ ...card, border: '1px solid #6366f1' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>Alan Anahtarı * <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>(ind_label_01…10)</span></label>
              <input value={form.fieldKey} onChange={e => setForm(f => ({ ...f, fieldKey: e.target.value }))} style={inputStyle} placeholder="ind_label_01" />
            </div>
            <div>
              <label style={labelStyle}>Görünen Ad *</label>
              <input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} style={inputStyle} placeholder="Sözleşme No" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>Alan Tipi</label>
              <select value={form.fieldType} onChange={e => setForm(f => ({ ...f, fieldType: e.target.value }))} style={inputStyle}>
                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Sıra</label>
              <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} style={inputStyle} min={0} />
            </div>
          </div>

          {form.fieldType === 'SELECT' && (
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Seçenekler (her satıra bir seçenek)</label>
              <textarea
                value={form.options}
                onChange={e => setForm(f => ({ ...f, options: e.target.value }))}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
                placeholder={'Seçenek 1\nSeçenek 2\nSeçenek 3'}
              />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isRequired} onChange={e => setForm(f => ({ ...f, isRequired: e.target.checked }))} />
              Zorunlu alan
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => createMutation.mutate()} disabled={!form.fieldKey || !form.displayName || createMutation.isPending} style={btnPrimary}>Ekle</button>
            <button onClick={() => setShowForm(false)} style={btnGhost}>İptal</button>
          </div>
        </div>
      )}

      <div style={card}>
        {fields.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>Henüz özel alan yok</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fields.map((f: any) => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{f.displayName}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{f.fieldKey}</span>
                    <span style={{ fontSize: 10, color: '#6366f1', background: '#6366f115', padding: '1px 6px', borderRadius: 999 }}>
                      {FIELD_TYPES.find(t => t.value === f.fieldType)?.label ?? f.fieldType}
                    </span>
                    {f.isRequired && <span style={{ fontSize: 10, color: '#ef4444', background: '#ef444415', padding: '1px 6px', borderRadius: 999 }}>Zorunlu</span>}
                  </div>
                </div>
                <button onClick={() => deleteMutation.mutate(f.id)} style={{ ...btnDanger, padding: '4px 10px', fontSize: 11 }}>Sil</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BÖLÜM: ÇÖZÜM TÜRLERİ
// ─────────────────────────────────────────────

function ResolutionTypesSection({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', requiresAmount: false, requiresApproval: false, sortOrder: 0 });

  const { data: res } = useQuery({
    queryKey: ['resolution-types', projectId],
    queryFn: () => api.get(`/projects/${projectId}/resolution-types`),
    staleTime: 0,
  });
  const types = extractData(res);

  const resetForm = () => { setForm({ name: '', description: '', requiresAmount: false, requiresApproval: false, sortOrder: 0 }); setEditId(null); };

  const startEdit = (t: any) => {
    setForm({ name: t.name, description: t.description ?? '', requiresAmount: t.requiresAmount ?? false, requiresApproval: t.requiresApproval ?? false, sortOrder: t.sortOrder ?? 0 });
    setEditId(t.id);
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editId) return api.patch(`/projects/${projectId}/resolution-types/${editId}`, form);
      return api.post(`/projects/${projectId}/resolution-types`, form);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resolution-types', projectId] });
      setShowForm(false); resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/projects/${projectId}/resolution-types/${id}`, { isActive: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resolution-types', projectId] }),
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Çözüm Türleri</h2>
        <button onClick={() => { resetForm(); setShowForm(p => !p); }} style={btnPrimary}>+ Yeni Tür</button>
      </div>

      {showForm && (
        <div style={{ ...card, border: '1px solid #6366f1' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
            {editId ? 'Çözüm Türünü Düzenle' : 'Yeni Çözüm Türü'}
          </h3>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Tür Adı *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="Örn: İade" />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Açıklama</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inputStyle} placeholder="Kısa açıklama…" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.requiresAmount} onChange={e => setForm(f => ({ ...f, requiresAmount: e.target.checked }))} />
              Tutar gerektirir
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.requiresApproval} onChange={e => setForm(f => ({ ...f, requiresApproval: e.target.checked }))} />
              Onaya Tabi
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending} style={btnPrimary}>
              {saveMutation.isPending ? 'Kaydediliyor…' : editId ? 'Güncelle' : 'Ekle'}
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }} style={btnGhost}>İptal</button>
          </div>
        </div>
      )}

      <div style={card}>
        {types.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>Henüz çözüm türü yok</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {types.map((t: any) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</p>
                  {t.description && <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{t.description}</p>}
                  {t.requiresAmount && <span style={{ fontSize: 10, color: '#f59e0b', background: '#f59e0b15', padding: '1px 6px', borderRadius: 999, marginTop: 4, display: 'inline-block', marginRight: 4 }}>Tutar gerektirir</span>}
                  {t.requiresApproval && <span style={{ fontSize: 10, color: '#6366f1', background: '#6366f115', padding: '1px 6px', borderRadius: 999, marginTop: 4, display: 'inline-block' }}>Onaya Tabi</span>}
                </div>
                <button onClick={() => startEdit(t)} style={{ ...btnGhost, padding: '4px 10px', fontSize: 11 }}>Düzenle</button>
                <button onClick={() => deleteMutation.mutate(t.id)} style={{ ...btnDanger, padding: '4px 10px', fontSize: 11 }}>Sil</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────
// BÖLÜM: DEPARTMANLAR
// ─────────────────────────────────────────────

function RolesSection({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [showNewRole, setShowNewRole] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', label: '', scope: 'PROJECT' });
  const [saving, setSaving] = useState(false);

  const { data: res } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles'),
    staleTime: 0,
  });
  const roles = res?.data?.data ?? res?.data ?? [];
  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const selectedPerms = new Set((selectedRole?.permissions ?? []).map((p) => p.permissionKey));

  const createMutation = useMutation({
    mutationFn: () => api.post('/roles', { ...newRole, projectId: newRole.scope === 'PROJECT' ? projectId : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); setShowNewRole(false); setNewRole({ name: '', label: '', scope: 'PROJECT' }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/roles/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); setSelectedRoleId(null); },
  });

  const togglePermission = async (permKey) => {
    if (!selectedRoleId || (selectedRole?.isSystem && user?.role !== 'SUPER_ADMIN')) return;
    const newPerms = new Set(selectedPerms);
    if (newPerms.has(permKey)) newPerms.delete(permKey); else newPerms.add(permKey);
    setSaving(true);
    await api.patch(`/roles/${selectedRoleId}/permissions`, { permissions: Array.from(newPerms) });
    qc.invalidateQueries({ queryKey: ['roles'] });
    setSaving(false);
  };

  const projectPerms = Object.entries(PERMISSIONS).filter(([, v]) => v.scope === 'PROJECT');
  const globalPerms = Object.entries(PERMISSIONS).filter(([, v]) => v.scope === 'GLOBAL');
  const scopePerms = selectedRole?.scope === 'GLOBAL' ? [...globalPerms, ...projectPerms] : projectPerms;
  const groups = [...new Set(scopePerms.map(([, v]) => v.group))];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Roller</h2>
          <button onClick={() => setShowNewRole(p => !p)} style={{ ...btnPrimary, padding: '4px 10px', fontSize: 11 }}>+ Yeni</button>
        </div>
        {showNewRole && (
          <div style={{ ...card, marginBottom: 10, padding: 10 }}>
            <input value={newRole.label} onChange={e => setNewRole(f => ({ ...f, label: e.target.value, name: e.target.value.toUpperCase().replace(/ /g, '_') }))}
              placeholder="Rol adı" style={{ ...inputStyle, marginBottom: 6 }} />
            <select value={newRole.scope} onChange={e => setNewRole(f => ({ ...f, scope: e.target.value }))} style={{ ...inputStyle, marginBottom: 6 }}>
              <option value="PROJECT">Proje Rolü</option>
              <option value="GLOBAL">Global Rol</option>
            </select>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => createMutation.mutate()} disabled={!newRole.label || createMutation.isPending} style={{ ...btnPrimary, fontSize: 11, padding: '4px 10px' }}>Ekle</button>
              <button onClick={() => setShowNewRole(false)} style={{ ...btnGhost, fontSize: 11, padding: '4px 10px' }}>İptal</button>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {roles.map((role) => (
            <div key={role.id} onClick={() => setSelectedRoleId(role.id)} style={{
              padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${selectedRoleId === role.id ? '#6366f1' : 'var(--border)'}`,
              background: selectedRoleId === role.id ? '#6366f115' : 'var(--bg-card)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{role.label}</p>
                <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{role.scope === 'GLOBAL' ? 'Global' : 'Proje'} · {role.permissions?.length ?? 0} yetki</p>
              </div>
              {!role.isSystem && (
                <button onClick={e => { e.stopPropagation(); deleteMutation.mutate(role.id); }}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>x</button>
              )}
            </div>
          ))}
        </div>
      </div>
      <div>
        {!selectedRole ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-secondary)', fontSize: 13 }}>Sol taraftan bir rol seçin</div>
        ) : (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedRole.label}</h3>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {(selectedRole.isSystem && user?.role !== 'SUPER_ADMIN') ? 'Sistem rolü - sadece Super Admin düzenleyebilir' : saving ? 'Kaydediliyor...' : 'Degisiklikler otomatik kaydedilir'}
              </p>
            </div>
            {groups.map(group => {
              const groupPerms = scopePerms.filter(([, v]) => v.group === group);
              return (
                <div key={group} style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{group}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {groupPerms.map(([key, val]) => (
                      <label key={key} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 6,
                        cursor: (selectedRole.isSystem && user?.role !== 'SUPER_ADMIN') ? 'default' : 'pointer',
                        background: selectedPerms.has(key) ? '#6366f110' : 'transparent',
                        border: `1px solid ${selectedPerms.has(key) ? '#6366f130' : 'transparent'}`,
                      }}>
                        <input type="checkbox" checked={selectedPerms.has(key)} onChange={() => togglePermission(key)}
                          disabled={selectedRole.isSystem && user?.role !== 'SUPER_ADMIN'} style={{ accentColor: '#6366f1' }} />
                        <span style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1 }}>{val.label}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{key}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


function MailSettingsSection({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    displayName: '', fromAddress: '', replyToAddress: '',
    imapHost: '', imapPort: '993', imapUsername: '', imapPassword: '',
    imapUseTls: true, imapFetchIntervalSec: '120',
    imapMarkAsRead: true, imapDeleteAfterFetch: false,
    smtpHost: '', smtpPort: '587', smtpUseTls: true, isPrimary: false,
  });
  const [error, setError] = useState('');
  const { data: res, isLoading } = useQuery({
    queryKey: ['mail-settings', projectId],
    queryFn: () => api.get(`/projects/${projectId}/mail-settings`),
    enabled: !!projectId, staleTime: 0,
  });
  const settings: any[] = res?.data?.data ?? res?.data ?? [];
  const resetForm = () => { setForm({ displayName: '', fromAddress: '', replyToAddress: '', imapHost: '', imapPort: '993', imapUsername: '', imapPassword: '', imapUseTls: true, imapFetchIntervalSec: '120', imapMarkAsRead: true, imapDeleteAfterFetch: false, smtpHost: '', smtpPort: '587', smtpUseTls: true, isPrimary: false }); setEditId(null); setError(''); };
  const startEdit = (s: any) => { setForm({ displayName: s.displayName ?? '', fromAddress: s.fromAddress ?? '', replyToAddress: s.replyToAddress ?? '', imapHost: s.imapHost ?? '', imapPort: String(s.imapPort ?? 993), imapUsername: s.imapUsername ?? '', imapPassword: '', imapUseTls: s.imapUseTls ?? true, imapFetchIntervalSec: String(s.imapFetchIntervalSec ?? 120), imapMarkAsRead: s.imapMarkAsRead ?? true, imapDeleteAfterFetch: s.imapDeleteAfterFetch ?? false, smtpHost: s.smtpHost ?? '', smtpPort: String(s.smtpPort ?? 587), smtpUseTls: s.smtpUseTls ?? true, isPrimary: s.isPrimary ?? false }); setEditId(s.id); setShowForm(true); setError(''); };
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form.displayName || !form.fromAddress) throw new Error('Görünen ad ve gönderen adres zorunludur');
      const payload = { ...form, imapPort: form.imapPort ? Number(form.imapPort) : undefined, smtpPort: form.smtpPort ? Number(form.smtpPort) : undefined, imapFetchIntervalSec: Number(form.imapFetchIntervalSec), imapPassword: form.imapPassword || undefined };
      if (editId) return api.patch(`/projects/${projectId}/mail-settings/${editId}`, payload);
      return api.post(`/projects/${projectId}/mail-settings`, payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mail-settings', projectId] }); setShowForm(false); resetForm(); },
    onError: (err: any) => setError(err?.response?.data?.message?.[0] ?? err?.message ?? 'Hata'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${projectId}/mail-settings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mail-settings', projectId] }),
  });
  const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' as any };
  const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 };
  const row2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Mail Ayarları</h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>IMAP/SMTP bağlantı ayarları</p>
        </div>
        {!showForm && <button onClick={() => { resetForm(); setShowForm(true); }} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Hesap Ekle</button>}
      </div>
      {showForm && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>{editId ? 'Hesabı Düzenle' : 'Yeni Mail Hesabı'}</h3>
          <div style={row2}>
            <div><label style={lbl}>Görünen Ad *</label><input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="Müşteri Hizmetleri" style={inp} /></div>
            <div><label style={lbl}>Gönderen Adres *</label><input value={form.fromAddress} onChange={e => setForm(f => ({ ...f, fromAddress: e.target.value }))} placeholder="destek@firma.com" style={inp} /></div>
          </div>
          <div style={{ marginBottom: 12 }}><label style={lbl}>Reply-To Adres</label><input value={form.replyToAddress} onChange={e => setForm(f => ({ ...f, replyToAddress: e.target.value }))} placeholder="destek@firma.com" style={inp} /></div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: 12 }}>IMAP — Gelen Mail</p>
            <div style={row2}>
              <div><label style={lbl}>Sunucu</label><input value={form.imapHost} onChange={e => setForm(f => ({ ...f, imapHost: e.target.value }))} placeholder="imap.firma.com" style={inp} /></div>
              <div><label style={lbl}>Port</label><input type="number" value={form.imapPort} onChange={e => setForm(f => ({ ...f, imapPort: e.target.value }))} placeholder="993" style={inp} /></div>
            </div>
            <div style={row2}>
              <div><label style={lbl}>Kullanıcı Adı</label><input value={form.imapUsername} onChange={e => setForm(f => ({ ...f, imapUsername: e.target.value }))} placeholder="destek@firma.com" style={inp} /></div>
              <div><label style={lbl}>Şifre {editId && <span style={{ color: 'var(--text-secondary)' }}>(boş = değişmez)</span>}</label><input type="password" value={form.imapPassword} onChange={e => setForm(f => ({ ...f, imapPassword: e.target.value }))} placeholder="••••••••" style={inp} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer' }}><input type="checkbox" checked={form.imapUseTls} onChange={e => setForm(f => ({ ...f, imapUseTls: e.target.checked }))} />TLS/SSL</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer' }}><input type="checkbox" checked={form.imapMarkAsRead} onChange={e => setForm(f => ({ ...f, imapMarkAsRead: e.target.checked }))} />Okundu işaretle</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer' }}><input type="checkbox" checked={form.imapDeleteAfterFetch} onChange={e => setForm(f => ({ ...f, imapDeleteAfterFetch: e.target.checked }))} />Çekince sil</label>
            </div>
            <div><label style={lbl}>Kontrol Sıklığı (saniye)</label><input type="number" value={form.imapFetchIntervalSec} onChange={e => setForm(f => ({ ...f, imapFetchIntervalSec: e.target.value }))} placeholder="120" style={{ ...inp, width: '50%' }} /></div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: 12 }}>SMTP — Giden Mail</p>
            <div style={row2}>
              <div><label style={lbl}>Sunucu</label><input value={form.smtpHost} onChange={e => setForm(f => ({ ...f, smtpHost: e.target.value }))} placeholder="smtp.firma.com" style={inp} /></div>
              <div><label style={lbl}>Port</label><input type="number" value={form.smtpPort} onChange={e => setForm(f => ({ ...f, smtpPort: e.target.value }))} placeholder="587" style={inp} /></div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer' }}><input type="checkbox" checked={form.smtpUseTls} onChange={e => setForm(f => ({ ...f, smtpUseTls: e.target.checked }))} />TLS/STARTTLS</label>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer', marginBottom: 16 }}><input type="checkbox" checked={form.isPrimary} onChange={e => setForm(f => ({ ...f, isPrimary: e.target.checked }))} />Birincil hesap olarak ayarla</label>
          {error && <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: '#ef444415', border: '1px solid #ef444430', fontSize: 12, color: '#ef4444' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setError(''); saveMutation.mutate(); }} disabled={saveMutation.isPending} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{saveMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}</button>
            <button onClick={() => { setShowForm(false); resetForm(); }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>İptal</button>
          </div>
        </div>
      )}
      {isLoading ? <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>Yükleniyor…</div>
      : settings.length === 0 ? <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>Henüz mail hesabı eklenmemiş</div>
      : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {settings.map((s: any) => (
            <div key={s.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.displayName}</span>
                    {s.isPrimary && <span style={{ fontSize: 10, color: '#10b981', background: '#10b98115', border: '1px solid #10b98130', padding: '1px 6px', borderRadius: 999 }}>Birincil</span>}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.fromAddress}</p>
                  {s.imapHost && <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, fontFamily: 'monospace' }}>IMAP: {s.imapHost}:{s.imapPort} · SMTP: {s.smtpHost || '—'}:{s.smtpPort || '—'}</p>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => startEdit(s)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>Düzenle</button>
                  <button onClick={() => { if (confirm('Silmek istiyor musunuz?')) deleteMutation.mutate(s.id); }} disabled={deleteMutation.isPending} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #ef444430', background: '#ef444410', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>Sil</button>
                </div>
              </div>
            </div>
          ))}
        </div>}
    </div>
  );
}


function DepartmentsSection({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', slug: '', type: 'INTERNAL_DEPARTMENT',
    notificationEmail: '', linkedProjectId: '', sortOrder: '0', sendNotification: false,
  });

  const { data: res } = useQuery({
    queryKey: ['departments', projectId],
    queryFn: () => api.get(`/projects/${projectId}/departments`),
    staleTime: 0,
  });
  const departments = extractData(res);

  // Bağlı proje seçimi için tüm projeler
  const { data: projectsRes } = useQuery({
    queryKey: ['all-projects'],
    queryFn: () => api.get('/projects'),
    staleTime: 60_000,
  });
  const allProjects: any[] = projectsRes?.data?.data ?? projectsRes?.data ?? [];

  const resetForm = () => {
    setForm({ name: '', slug: '', type: 'INTERNAL_DEPARTMENT', notificationEmail: '', linkedProjectId: '', sortOrder: '0' });
    setEditId(null);
  };

  const startEdit = (d: any) => {
    setForm({
      name: d.name ?? '', slug: d.slug ?? '',
      type: d.type ?? 'INTERNAL_DEPARTMENT',
      notificationEmail: d.notificationEmail ?? '',
      linkedProjectId: d.linkedProjectId ?? '',
      sortOrder: String(d.sortOrder ?? 0),
      sendNotification: d.sendNotification ?? false,
    });
    setEditId(d.id);
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form, sortOrder: Number(form.sortOrder),
        slug: form.slug || undefined,
        notificationEmail: form.notificationEmail || undefined,
        linkedProjectId: form.type === 'PROJECT_BACKED' ? form.linkedProjectId || undefined : undefined,
        sendNotification: form.sendNotification,
      };
      if (editId) return api.patch(`/projects/${projectId}/departments/${editId}`, payload);
      return api.post(`/projects/${projectId}/departments`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments', projectId] });
      setShowForm(false); resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/projects/${projectId}/departments/${id}`, { isActive: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments', projectId] }),
  });

  const TYPE_LABELS: Record<string, string> = {
    INTERNAL_DEPARTMENT: 'İç Departman',
    EXTERNAL_ONLY: 'Harici (Yönlendirme)',
    PROJECT_BACKED: 'Proje Bağlantılı',
  };
  const TYPE_COLORS: Record<string, string> = {
    INTERNAL_DEPARTMENT: '#6366f1',
    EXTERNAL_ONLY: '#f59e0b',
    PROJECT_BACKED: '#10b981',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Departmanlar</h2>
        <button onClick={() => { resetForm(); setShowForm(p => !p); }} style={btnPrimary}>+ Yeni Departman</button>
      </div>

      {showForm && (
        <div style={{ ...card, border: '1px solid #6366f1' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
            {editId ? 'Departmanı Düzenle' : 'Yeni Departman'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Departman Adı *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="Teknik Destek" />
            </div>
            <div>
              <label style={labelStyle}>Slug</label>
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} style={inputStyle} placeholder="teknik-destek" />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Tip *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(TYPE_LABELS).map(([val, label]) => (
                <button key={val} onClick={() => setForm(f => ({ ...f, type: val }))}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${form.type === val ? TYPE_COLORS[val] : 'var(--border)'}`, background: form.type === val ? `${TYPE_COLORS[val]}15` : 'transparent', color: form.type === val ? TYPE_COLORS[val] : 'var(--text-secondary)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {form.type === 'PROJECT_BACKED' && (
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Bağlı Proje *</label>
              <select value={form.linkedProjectId} onChange={e => setForm(f => ({ ...f, linkedProjectId: e.target.value }))} style={inputStyle}>
                <option value="">— Proje Seçin —</option>
                {allProjects.filter((p: any) => p.isActive && p.id !== projectId).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Bildirim E-postası</label>
              <input value={form.notificationEmail} onChange={e => setForm(f => ({ ...f, notificationEmail: e.target.value }))} style={inputStyle} placeholder="destek@firma.com" type="email" />
            </div>
            <div>
              <label style={labelStyle}>Sıra</label>
              <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} style={{ ...inputStyle, width: 80 }} min="0" />
            </div>
          </div>
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={form.sendNotification} onChange={e => setForm(f => ({ ...f, sendNotification: e.target.checked }))} style={{ accentColor: '#6366f1', width: 14, height: 14 }} />
              Bildirim maili gönder
            </label>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Ticket yönlendirildiğinde departman mailini bilgilendir</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending} style={btnPrimary}>
              {saveMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }} style={btnGhost}>İptal</button>
          </div>
        </div>
      )}

      <div style={card}>
        {departments.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>Henüz departman yok</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {departments.map((d: any) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>🏢 {d.name}</span>
                    <span style={{ fontSize: 10, color: TYPE_COLORS[d.type] ?? '#6366f1', background: `${TYPE_COLORS[d.type] ?? '#6366f1'}15`, padding: '1px 6px', borderRadius: 999 }}>
                      {TYPE_LABELS[d.type] ?? d.type}
                    </span>
                  </div>
                  {d.notificationEmail && <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>📧 {d.notificationEmail} {d.sendNotification ? <span style={{ color: '#10b981', fontSize: 10 }}>✓ Bildirim aktif</span> : <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Bildirim kapalı</span>}</p>}
                  {d.linkedProject && <p style={{ fontSize: 11, color: '#10b981' }}>🔗 {d.linkedProject.name}</p>}
                </div>
                <button onClick={() => startEdit(d)} style={{ ...btnGhost, padding: '4px 10px', fontSize: 11 }}>Düzenle</button>
                <button onClick={() => deleteMutation.mutate(d.id)} style={{ ...btnDanger, padding: '4px 10px', fontSize: 11 }}>Sil</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────
// ANA SAYFA
// ─────────────────────────────────────────────

const SECTIONS = [
  { key: 'general', label: 'Genel Bilgiler', icon: '⚙️' },
  { key: 'statuses', label: 'Statüler', icon: '🔵' },
  { key: 'categories', label: 'Kategoriler', icon: '🏷️' },
  { key: 'custom-fields', label: 'Özel Alanlar', icon: '📋' },
  { key: 'resolution-types', label: 'Çözüm Türleri', icon: '✅' },
  { key: 'departments', label: 'Departmanlar', icon: '🏢' },
  { key: 'mail', label: 'Mail Ayarları', icon: '📧' },
  { key: 'roles', label: 'Roller & Yetkiler', icon: '🔐' },
];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { currentProject } = useProjectStore();
  const [activeSection, setActiveSection] = useState('general');
  // Sadece admin erişebilir
  const { projectRole } = useProjectStore();
  const canAccess = ["SUPER_ADMIN","ADMIN"].includes(user?.role ?? "") || projectRole === "ADMIN";
  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  // Proje ID — currentProject yoksa localStorage'dan al
  const projectId = currentProject?.id ?? localStorage.getItem('projectId') ?? '';

  if (!projectId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-secondary)', fontSize: 14 }}>
        Proje seçilmedi.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>

      {/* Sol navigasyon */}
      <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', overflowY: 'auto', padding: '20px 12px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: 12, paddingLeft: 8 }}>
          Proje Ayarları
        </p>
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            style={{
              width: '100%', textAlign: 'left', padding: '8px 12px',
              borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
              background: activeSection === s.key ? '#6366f120' : 'transparent',
              color: activeSection === s.key ? '#6366f1' : 'var(--text-secondary)',
              fontWeight: activeSection === s.key ? 600 : 400,
              marginBottom: 2,
            }}
          >
            <span>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* İçerik */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
        {activeSection === 'general' && <GeneralSection projectId={projectId} />}
        {activeSection === 'statuses' && <StatusesSection projectId={projectId} />}
        {activeSection === 'categories' && <CategoriesSection projectId={projectId} />}
        {activeSection === 'custom-fields' && <CustomFieldsSection projectId={projectId} />}
        {activeSection === 'resolution-types' && <ResolutionTypesSection projectId={projectId} />}
        {activeSection === 'departments' && <DepartmentsSection projectId={projectId} />}
        {activeSection === 'mail' && <MailSettingsSection projectId={projectId} />}
        {activeSection === 'roles' && <RolesSection projectId={projectId} />}
      </div>
    </div>
  );
}

