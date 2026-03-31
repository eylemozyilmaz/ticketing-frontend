import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/project.store';
import { useAuthStore } from '../store/auth.store';
import api from '../api/client';

export default function ProjectSelectPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { setCurrentProject, setStatuses } = useProjectStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', slug: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    const stored = sessionStorage.getItem('pendingProjects');
    if (stored) {
      setProjects(JSON.parse(stored));
    } else {
      navigate('/login');
    }
  }, []);

  const handleSelect = async (project: any) => {
    setSelecting(project.id);
    try {
      setCurrentProject(project);
      const statusRes = await api.get(`/projects/${project.id}/statuses`);
      setStatuses(statusRes?.data?.data ?? statusRes?.data ?? []);
      sessionStorage.removeItem('pendingProjects');
      navigate('/');
    } catch {
      setSelecting(null);
    }
  };

  const handleCreateProject = async () => {
    if (!newForm.name || !newForm.slug) return;
    setCreating(true);
    setError('');
    try {
      const res = await api.post('/projects', newForm);
      const project = res?.data?.data ?? res?.data;
      // Yeni projeye SUPER_ADMIN olarak ekle
      await api.post(`/projects/${project.id}/members`, {
        userId: user?.id,
        role: 'ADMIN',
      });
      // Otomatik seç
      setCurrentProject(project);
      const statusRes = await api.get(`/projects/${project.id}/statuses`);
      setStatuses(statusRes?.data?.data ?? statusRes?.data ?? []);
      sessionStorage.removeItem('pendingProjects');
      navigate('/settings');
    } catch (err: any) {
      setError(err?.response?.data?.message?.[0] ?? 'Proje oluşturulamadı');
      setCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    sessionStorage.removeItem('pendingProjects');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Proje Seçin</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Merhaba {user?.firstName}, hangi projede çalışmak istiyorsunuz?
          </p>
        </div>

        {/* Proje listesi */}
        <div className="space-y-3 mb-4">
          {projects.map((project: any) => (
            <button
              key={project.id}
              onClick={() => handleSelect(project)}
              disabled={!!selecting}
              style={{
                width: '100%',
                background: selecting === project.id ? '#6366f1' : '#111827',
                border: `1px solid ${selecting === project.id ? '#6366f1' : '#1f2937'}`,
                borderRadius: 12, padding: '16px 20px',
                cursor: selecting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all 0.15s',
                opacity: selecting && selecting !== project.id ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!selecting) e.currentTarget.style.borderColor = '#6366f1'; }}
              onMouseLeave={e => { if (selecting !== project.id) e.currentTarget.style.borderColor = '#1f2937'; }}
            >
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{project.name}</p>
                <p style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>{project.slug}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {project.role && (
                  <span style={{ fontSize: 10, color: '#6366f1', background: '#6366f115', border: '1px solid #6366f130', padding: '2px 8px', borderRadius: 999 }}>
                    {project.role}
                  </span>
                )}
                {selecting === project.id ? (
                  <svg style={{ width: 20, height: 20, color: '#fff', animation: 'spin 0.7s linear infinite' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg style={{ width: 20, height: 20, color: '#6b7280' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Yeni Proje — sadece SUPER_ADMIN */}
        {isSuperAdmin && (
          <div style={{ marginBottom: 20 }}>
            {!showNewForm ? (
              <button
                onClick={() => setShowNewForm(true)}
                style={{ width: '100%', background: 'transparent', border: '1px dashed #374151', borderRadius: 12, padding: '14px 20px', cursor: 'pointer', color: '#6b7280', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>+</span> Yeni Proje Oluştur
              </button>
            ) : (
              <div style={{ background: '#111827', border: '1px solid #6366f1', borderRadius: 12, padding: 20 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Yeni Proje</p>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 6 }}>Proje Adı *</label>
                  <input
                    value={newForm.name}
                    onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
                    style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, boxSizing: 'border-box' }}
                    placeholder="Müşteri Hizmetleri"
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 6 }}>Slug * <span style={{ fontSize: 10, color: '#6b7280' }}>(URL için benzersiz)</span></label>
                  <input
                    value={newForm.slug}
                    onChange={e => setNewForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                    style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, boxSizing: 'border-box', fontFamily: 'monospace' }}
                    placeholder="musteri-hizmetleri"
                  />
                </div>
                {error && <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>{error}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleCreateProject}
                    disabled={!newForm.name || !newForm.slug || creating}
                    style={{ flex: 1, background: '#6366f1', border: 'none', borderRadius: 8, padding: '10px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: !newForm.name || !newForm.slug ? 0.5 : 1 }}>
                    {creating ? 'Oluşturuluyor…' : 'Oluştur ve Devam Et'}
                  </button>
                  <button onClick={() => { setShowNewForm(false); setError(''); }}
                    style={{ background: 'transparent', border: '1px solid #374151', borderRadius: 8, padding: '10px 16px', color: '#6b7280', fontSize: 13, cursor: 'pointer' }}>
                    İptal
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Çıkış */}
        <div style={{ textAlign: 'center' }}>
          <button onClick={handleLogout} style={{ fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Farklı hesapla giriş yap
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

