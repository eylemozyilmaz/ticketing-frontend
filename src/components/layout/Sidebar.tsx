import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';
import { useProjectStore } from '../../store/project.store';
import { authApi } from '../../api/auth';
import api from '../../api/client';

const adminRoles = ['SUPER_ADMIN', 'ADMIN'];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { currentProject, setCurrentProject, setStatuses, projectRole } = useProjectStore();
  const isAdmin = adminRoles.includes(user?.role ?? '') || projectRole === 'ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', slug: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Kullanıcının projelerini çek
  const { data: projectsRes } = useQuery({
    queryKey: ['my-projects'],
    queryFn: () => api.get('/users/me/projects'),
    staleTime: 300_000,
  });
  const myProjects: any[] = projectsRes?.data?.data ?? projectsRes?.data ?? [];

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken') || '';
    await authApi.logout(refreshToken).catch(() => {});
    localStorage.removeItem('currentProject');
    logout();
  };

  const handleSelectProject = async (project: any) => {
    setProjectMenuOpen(false);
    setCurrentProject(project);
    try {
      const statusRes = await api.get(`/projects/${project.id}/statuses`);
      setStatuses(statusRes?.data?.data ?? statusRes?.data ?? []);
    } catch {}
    qc.invalidateQueries(); // tüm cache'i temizle
    navigate('/');
  };

  const handleCreateProject = async () => {
    if (!newForm.name || !newForm.slug) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await api.post('/projects', newForm);
      const project = res?.data?.data ?? res?.data;
      await api.post(`/projects/${project.id}/members`, {
        userId: user?.id,
        role: 'ADMIN',
      });
      setShowNewProjectForm(false);
      setNewForm({ name: '', slug: '' });
      qc.invalidateQueries({ queryKey: ['my-projects'] });
      await handleSelectProject(project);
      navigate('/settings');
    } catch (err: any) {
      setCreateError(err?.response?.data?.message?.[0] ?? 'Hata oluştu');
    } finally {
      setCreating(false);
    }
  };

  return (
    <aside className="w-60 flex flex-col h-screen fixed left-0 top-0 border-r"
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>

      {/* Proje Switcher */}
      <div className="flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', position: 'relative' }}>
        <div
          onClick={() => { setProjectMenuOpen(p => !p); setShowNewProjectForm(false); }}
          className="p-4 cursor-pointer flex items-center gap-3"
          style={{ userSelect: 'none' }}
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-xs block" style={{ color: 'var(--text-secondary)' }}>Ticketing</span>
            <span className="text-sm font-bold block truncate" style={{ color: '#6366f1' }}>
              {currentProject?.name ?? 'Proje Seç'}
            </span>
          </div>
          {/* Chevron */}
          <svg
            className="w-4 h-4 flex-shrink-0 transition-transform"
            style={{ color: 'var(--text-secondary)', transform: projectMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Dropdown */}
        {projectMenuOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '0 0 12px 12px', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            maxHeight: 320, overflowY: 'auto',
          }}>
            {/* Proje listesi */}
            {myProjects.length > 0 && (
              <div style={{ padding: '8px 0' }}>
                <p style={{ fontSize: 10, color: 'var(--text-secondary)', padding: '4px 14px 6px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                  Projelerim
                </p>
                {myProjects.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProject(p)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '8px 14px',
                      background: currentProject?.id === p.id ? '#6366f115' : 'transparent',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: currentProject?.id === p.id ? '#6366f1' : 'var(--border)',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: currentProject?.id === p.id ? 700 : 400, color: currentProject?.id === p.id ? '#6366f1' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </p>
                      {p.role && (
                        <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{p.role}</p>
                      )}
                    </div>
                    {currentProject?.id === p.id && (
                      <svg className="w-3 h-3" style={{ color: '#6366f1', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Yeni Proje — sadece SUPER_ADMIN */}
            {isSuperAdmin && (
              <div style={{ borderTop: myProjects.length > 0 ? '1px solid var(--border)' : 'none', padding: '8px 0' }}>
                {!showNewProjectForm ? (
                  <button
                    onClick={e => { e.stopPropagation(); setShowNewProjectForm(true); }}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 14px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: '#6366f1', fontSize: 13, fontWeight: 600 }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Yeni Proje Oluştur
                  </button>
                ) : (
                  <div style={{ padding: '8px 14px' }} onClick={e => e.stopPropagation()}>
                    <input
                      value={newForm.name}
                      onChange={e => setNewForm(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }))}
                      placeholder="Proje adı"
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 12, marginBottom: 6, boxSizing: 'border-box' }}
                      autoFocus
                    />
                    <input
                      value={newForm.slug}
                      onChange={e => setNewForm(f => ({ ...f, slug: e.target.value }))}
                      placeholder="slug (otomatik)"
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'monospace', marginBottom: 6, boxSizing: 'border-box' }}
                    />
                    {createError && <p style={{ fontSize: 11, color: '#ef4444', marginBottom: 6 }}>{createError}</p>}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={handleCreateProject}
                        disabled={!newForm.name || creating}
                        style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none', background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: !newForm.name ? 0.5 : 1 }}
                      >
                        {creating ? '...' : 'Oluştur'}
                      </button>
                      <button
                        onClick={() => { setShowNewProjectForm(false); setCreateError(''); }}
                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}
                      >
                        İptal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Overlay — dropdown'u kapat */}
      {projectMenuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 199 }}
          onClick={() => { setProjectMenuOpen(false); setShowNewProjectForm(false); }}
        />
      )}

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" style={{ zIndex: 1 }}>
        <NavLink to="/" end
          className={({ isActive }) => "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition " + (isActive ? 'bg-indigo-600/20' : '')}
          style={({ isActive }) => ({ color: isActive ? '#6366f1' : 'var(--text-secondary)' })}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </NavLink>

        <NavLink to="/tickets"
          className={({ isActive }) => "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition " + (isActive ? 'bg-indigo-600/20' : '')}
          style={({ isActive }) => ({ color: isActive ? '#6366f1' : 'var(--text-secondary)' })}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          Ticketlar
        </NavLink>

        <NavLink to="/users"
          className={({ isActive }) => "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition " + (isActive ? 'bg-indigo-600/20' : '')}
          style={({ isActive }) => ({ color: isActive ? '#6366f1' : 'var(--text-secondary)' })}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Kullanıcılar
        </NavLink>

        {(isAdmin || projectRole === 'SUPERVISOR') && (
          <NavLink to="/approvals"
            className={({ isActive }) => "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition " + (isActive ? 'bg-indigo-600/20' : '')}
            style={({ isActive }) => ({ color: isActive ? '#6366f1' : 'var(--text-secondary)' })}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Onaylar
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/settings"
            className={({ isActive }) => "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition " + (isActive ? 'bg-indigo-600/20' : '')}
            style={({ isActive }) => ({ color: isActive ? '#6366f1' : 'var(--text-secondary)' })}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Ayarlar
          </NavLink>
        )}
      </nav>

      {/* Alt kısım */}
      <div className="flex-shrink-0 p-3 border-t space-y-1" style={{ borderColor: 'var(--border)' }}>
        <button onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = theme === 'dark' ? '#1f2937' : '#f3f4f6')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
          {theme === 'dark' ? (
            <><svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg><span>Açık Tema</span></>
          ) : (
            <><svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg><span>Koyu Tema</span></>
          )}
        </button>

        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.firstName} {user?.lastName}</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{user?.role}</p>
          </div>
          <button onClick={handleLogout} title="Çıkış yap" style={{ color: 'var(--text-secondary)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

