import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth.store';
import { useProjectStore } from '../store/project.store';
import api from '../api/client';

const GLOBAL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'AGENT', 'READONLY'];
const GLOBAL_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Süper Admin', ADMIN: 'Admin', SUPERVISOR: 'Supervisor',
  AGENT: 'Agent', READONLY: 'Salt Okunur',
};
const PROJECT_ROLES = ['ADMIN', 'SUPERVISOR', 'AGENT', 'READONLY'];
const AVAILABILITY_COLORS: Record<string, string> = {
  ONLINE: '#10b981', BREAK: '#f59e0b', OFFLINE: '#6b7280',
};
const AVAILABILITY_LABELS: Record<string, string> = {
  ONLINE: 'Çevrimiçi', BREAK: 'Molada', OFFLINE: 'Çevrimdışı',
};

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--border)', fontSize: 12,
  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
  boxSizing: 'border-box' as any, outline: 'none',
};
const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 };

function InfoTab({ selectedUser, isAdmin, onUpdated }: { selectedUser: any; isAdmin: boolean; onUpdated: () => void }) {
  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const resetMutation = useMutation({
    mutationFn: () => {
      if (!newPassword || newPassword.length < 6) throw new Error('Şifre en az 6 karakter olmalı');
      return api.patch(`/users/${selectedUser.id}`, { password: newPassword });
    },
    onSuccess: () => {
      setResetSuccess(true);
      setNewPassword('');
      setTimeout(() => { setShowResetForm(false); setResetSuccess(false); }, 2000);
      onUpdated();
    },
    onError: (err: any) => setResetError(err?.response?.data?.message?.[0] ?? err?.message ?? 'Hata'),
  });

  const inpStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: '1px solid var(--border)', fontSize: 12,
    background: 'var(--bg-secondary)', color: 'var(--text-primary)',
    boxSizing: 'border-box' as any, outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
      {[
        { label: 'Global Rol', value: GLOBAL_ROLE_LABELS[selectedUser.role] },
        { label: 'Durum', value: AVAILABILITY_LABELS[selectedUser.availability], color: AVAILABILITY_COLORS[selectedUser.availability] },
        { label: 'Aktif', value: selectedUser.isActive ? 'Evet' : 'Hayır', color: selectedUser.isActive ? '#10b981' : '#ef4444' },
        selectedUser.phone ? { label: 'Telefon', value: selectedUser.phone } : null,
        { label: 'Kayıt Tarihi', value: new Date(selectedUser.createdAt).toLocaleDateString('tr-TR') },
      ].filter(Boolean).map((item: any) => (
        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
          <span style={{ color: item.color ?? 'var(--text-primary)', fontWeight: 500 }}>{item.value}</span>
        </div>
      ))}

      {/* Şifre Sıfırlama */}
      {isAdmin && (
        <div style={{ marginTop: 8 }}>
          {!showResetForm ? (
            <button onClick={() => { setShowResetForm(true); setResetError(''); setResetSuccess(false); }}
              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', width: '100%' }}>
              🔑 Şifre Sıfırla
            </button>
          ) : (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Yeni Şifre Belirle</p>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="En az 6 karakter"
                style={{ ...inpStyle, marginBottom: 8 }}
              />
              {resetError && <p style={{ fontSize: 11, color: '#ef4444', marginBottom: 6 }}>{resetError}</p>}
              {resetSuccess && <p style={{ fontSize: 11, color: '#10b981', marginBottom: 6 }}>✓ Şifre güncellendi!</p>}
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { setResetError(''); resetMutation.mutate(); }}
                  disabled={!newPassword || resetMutation.isPending}
                  style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: !newPassword ? 0.5 : 1 }}>
                  {resetMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
                <button onClick={() => { setShowResetForm(false); setNewPassword(''); setResetError(''); }}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
                  İptal
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  const { user: me } = useAuthStore();
  const qc = useQueryClient();
  const isSuperAdmin = me?.role === 'SUPER_ADMIN';
  const isAdmin = me?.role === 'SUPER_ADMIN' || me?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'projects'>('info');
  const [newFormError, setNewFormError] = useState('');
  const [newForm, setNewForm] = useState({
    firstName: '', lastName: '', email: '', password: '', phone: '', role: 'AGENT',
  });

  // Proje ekleme formu
  const [addProjectForm, setAddProjectForm] = useState({ projectId: '', role: 'AGENT', departmentId: '' });
  const [addProjectError, setAddProjectError] = useState('');

  // Tüm kullanıcılar
  const { data: usersRes, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
    staleTime: 30_000,
  });
  const users: any[] = usersRes?.data?.data ?? usersRes?.data ?? [];
  const filtered = users.filter((u: any) =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  // Seçili kullanıcının proje üyelikleri
  const { data: membershipsRes } = useQuery({
    queryKey: ['user-memberships', selectedUser?.id],
    queryFn: () => api.get(`/users/${selectedUser.id}/memberships`),
    enabled: !!selectedUser?.id && activeTab === 'projects',
    staleTime: 0,
  });
  const memberships: any[] = membershipsRes?.data?.data ?? membershipsRes?.data ?? [];

  // Tüm projeler (proje ekleme için)
  const { data: allProjectsRes } = useQuery({
    queryKey: ['all-projects'],
    queryFn: () => api.get('/projects'),
    staleTime: 60_000,
  });
  const allProjects: any[] = allProjectsRes?.data?.data ?? allProjectsRes?.data ?? [];

  // Seçili projenin departmanları
  const [selectedProjectForDept, setSelectedProjectForDept] = useState('');
  const { data: deptsRes } = useQuery({
    queryKey: ['departments', selectedProjectForDept],
    queryFn: () => api.get(`/projects/${selectedProjectForDept}/departments`),
    enabled: !!selectedProjectForDept,
    staleTime: 60_000,
  });
  const departments: any[] = deptsRes?.data?.data ?? deptsRes?.data ?? [];

  // Yeni kullanıcı oluştur
  const createMutation = useMutation({
    mutationFn: () => {
      if (!newForm.firstName || !newForm.lastName || !newForm.email || !newForm.password)
        throw new Error('Ad, soyad, email ve şifre zorunludur');
      return api.post('/users', newForm);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowNewForm(false);
      setNewForm({ firstName: '', lastName: '', email: '', password: '', phone: '', role: 'AGENT' });
      setNewFormError('');
    },
    onError: (err: any) => setNewFormError(err?.response?.data?.message?.[0] ?? err?.message ?? 'Hata'),
  });

  // Pasif/Aktif yap
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/users/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  // Projeye üye ekle/güncelle
  const upsertMembershipMutation = useMutation({
    mutationFn: () => {
      if (!addProjectForm.projectId) throw new Error('Proje seçin');
      return api.post(`/users/${selectedUser.id}/memberships`, {
        projectId: addProjectForm.projectId,
        role: addProjectForm.role,
        departmentId: addProjectForm.departmentId || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-memberships', selectedUser?.id] });
      setAddProjectForm({ projectId: '', role: 'AGENT', departmentId: '' });
      setSelectedProjectForDept('');
      setAddProjectError('');
    },
    onError: (err: any) => setAddProjectError(err?.response?.data?.message?.[0] ?? err?.message ?? 'Hata'),
  });

  // Projeden çıkar
  const removeMembershipMutation = useMutation({
    mutationFn: (projectId: string) =>
      api.delete(`/users/${selectedUser.id}/memberships/${projectId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-memberships', selectedUser?.id] }),
  });

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      {/* Başlık */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Kullanıcılar</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{users.length} kullanıcı</p>
        </div>
        {isSuperAdmin && (
          <button onClick={() => setShowNewForm(p => !p)}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Yeni Kullanıcı
          </button>
        )}
      </div>

      {/* Yeni Kullanıcı Formu */}
      {showNewForm && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid #6366f1', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Yeni Kullanıcı</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div><label style={lbl}>Ad *</label><input value={newForm.firstName} onChange={e => setNewForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Ahmet" style={inp} /></div>
            <div><label style={lbl}>Soyad *</label><input value={newForm.lastName} onChange={e => setNewForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Yılmaz" style={inp} /></div>
            <div><label style={lbl}>E-posta *</label><input type="email" value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))} placeholder="ahmet@firma.com" style={inp} /></div>
            <div><label style={lbl}>Şifre *</label><input type="password" value={newForm.password} onChange={e => setNewForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" style={inp} /></div>
            <div><label style={lbl}>Telefon</label><input value={newForm.phone} onChange={e => setNewForm(f => ({ ...f, phone: e.target.value }))} placeholder="+90 555 000 0000" style={inp} /></div>
            <div>
              <label style={lbl}>Global Rol</label>
              <select value={newForm.role} onChange={e => setNewForm(f => ({ ...f, role: e.target.value }))} style={inp}>
                {GLOBAL_ROLES.map(r => <option key={r} value={r}>{GLOBAL_ROLE_LABELS[r]}</option>)}
              </select>
            </div>
          </div>
          {newFormError && <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: '#ef444415', border: '1px solid #ef444430', fontSize: 12, color: '#ef4444' }}>{newFormError}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setNewFormError(''); createMutation.mutate(); }} disabled={createMutation.isPending}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {createMutation.isPending ? 'Kaydediliyor…' : 'Oluştur'}
            </button>
            <button onClick={() => { setShowNewForm(false); setNewFormError(''); }}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
              İptal
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedUser ? '1fr 380px' : '1fr', gap: 20 }}>
        {/* Kullanıcı Listesi */}
        <div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="İsim veya email ara…" style={{ ...inp, marginBottom: 16, fontSize: 13 }} />
          <div style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                  {['Kullanıcı', 'E-posta', 'Global Rol', 'Durum', 'Aktif', isAdmin ? 'İşlem' : ''].filter(Boolean).map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>Yükleniyor…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>Kullanıcı bulunamadı</td></tr>
                ) : filtered.map((u: any) => (
                  <tr key={u.id}
                    onClick={() => { setSelectedUser(selectedUser?.id === u.id ? null : u); setActiveTab('info'); }}
                    style={{ borderBottom: '1px solid var(--border)', background: selectedUser?.id === u.id ? '#6366f110' : 'var(--bg-card)', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => { if (selectedUser?.id !== u.id) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                    onMouseLeave={e => { if (selectedUser?.id !== u.id) e.currentTarget.style.background = 'var(--bg-card)'; }}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{u.firstName} {u.lastName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: 12 }}>{u.email}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, color: u.role === 'SUPER_ADMIN' ? '#f59e0b' : u.role === 'ADMIN' ? '#6366f1' : 'var(--text-secondary)', background: u.role === 'SUPER_ADMIN' ? '#f59e0b15' : u.role === 'ADMIN' ? '#6366f115' : 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 999 }}>
                        {GLOBAL_ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: AVAILABILITY_COLORS[u.availability] ?? '#6b7280' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: AVAILABILITY_COLORS[u.availability] ?? '#6b7280', flexShrink: 0 }} />
                        {AVAILABILITY_LABELS[u.availability] ?? u.availability}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, color: u.isActive ? '#10b981' : '#ef4444', background: u.isActive ? '#10b98115' : '#ef444415', padding: '2px 8px', borderRadius: 999 }}>
                        {u.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                        {u.id !== me?.id && (
                          <button
                            onClick={() => toggleActiveMutation.mutate({ id: u.id, isActive: !u.isActive })}
                            disabled={toggleActiveMutation.isPending}
                            style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${u.isActive ? '#ef444430' : '#10b98130'}`, background: u.isActive ? '#ef444410' : '#10b98110', color: u.isActive ? '#ef4444' : '#10b981', fontSize: 11, cursor: 'pointer' }}>
                            {u.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kullanıcı Detay Paneli */}
        {selectedUser && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, height: 'fit-content', position: 'sticky', top: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>
                  {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedUser.firstName} {selectedUser.lastName}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{selectedUser.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
              {(['info', 'projects'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{ padding: '8px 14px', fontSize: 12, fontWeight: 500, border: 'none', borderBottom: `2px solid ${activeTab === tab ? '#6366f1' : 'transparent'}`, color: activeTab === tab ? '#6366f1' : 'var(--text-secondary)', background: 'none', cursor: 'pointer' }}>
                  {tab === 'info' ? 'Bilgiler' : 'Proje Üyelikleri'}
                </button>
              ))}
            </div>

            {/* Bilgiler Tab */}
            {activeTab === 'info' && (
              <InfoTab
                selectedUser={selectedUser}
                isAdmin={isAdmin}
                onUpdated={() => qc.invalidateQueries({ queryKey: ['users'] })}
              />
            )}

            {/* Proje Üyelikleri Tab */}
            {activeTab === 'projects' && (
              <div>
                {/* Projeye Ekle Formu */}
                {isAdmin && (
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>Projeye Ekle / Güncelle</p>
                    <div style={{ marginBottom: 8 }}>
                      <label style={lbl}>Proje *</label>
                      <select value={addProjectForm.projectId}
                        onChange={e => {
                          setAddProjectForm(f => ({ ...f, projectId: e.target.value, departmentId: '' }));
                          setSelectedProjectForDept(e.target.value);
                        }}
                        style={inp}>
                        <option value="">— Proje Seçin —</option>
                        {allProjects.filter((p: any) => p.isActive).map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={lbl}>Proje Rolü</label>
                        <select value={addProjectForm.role} onChange={e => setAddProjectForm(f => ({ ...f, role: e.target.value }))} style={inp}>
                          {PROJECT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Departman</label>
                        <select value={addProjectForm.departmentId} onChange={e => setAddProjectForm(f => ({ ...f, departmentId: e.target.value }))} style={inp} disabled={!selectedProjectForDept}>
                          <option value="">— Yok —</option>
                          {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                    </div>
                    {addProjectError && <p style={{ fontSize: 11, color: '#ef4444', marginBottom: 6 }}>{addProjectError}</p>}
                    <button onClick={() => { setAddProjectError(''); upsertMembershipMutation.mutate(); }}
                      disabled={!addProjectForm.projectId || upsertMembershipMutation.isPending}
                      style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: !addProjectForm.projectId ? 0.5 : 1 }}>
                      {upsertMembershipMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
                    </button>
                  </div>
                )}

                {/* Mevcut üyelikler */}
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Mevcut Üyelikler ({memberships.filter((m: any) => m.isActive).length})
                </p>
                {memberships.filter((m: any) => m.isActive).length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', padding: '16px 0' }}>Henüz proje üyeliği yok</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {memberships.filter((m: any) => m.isActive).map((m: any) => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.project?.name}
                          </p>
                          <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10, color: '#6366f1', background: '#6366f115', padding: '1px 6px', borderRadius: 999 }}>{m.role}</span>
                            {m.department && <span style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '1px 6px', borderRadius: 999 }}>{m.department.name}</span>}
                          </div>
                        </div>
                        {isAdmin && (
                          <button onClick={() => removeMembershipMutation.mutate(m.project?.id)}
                            disabled={removeMembershipMutation.isPending}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

