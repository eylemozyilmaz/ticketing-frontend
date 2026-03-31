import { create } from 'zustand';
import api from '../api/client';

interface Status {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isInitial: boolean;
  isClosed: boolean;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  role?: string;
}

interface ProjectState {
  currentProject: Project | null;
  projectRole: string | null;
  statuses: Status[];
  setCurrentProject: (project: Project) => void;
  setStatuses: (statuses: Status[]) => void;
  loadInitialProject: () => Promise<void>;
}

const storedProject = (): Project | null => {
  try { return JSON.parse(localStorage.getItem('currentProject') ?? 'null'); }
  catch { return null; }
};

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: storedProject(),
  projectRole: storedProject()?.role ?? null,
  statuses: [],

  setCurrentProject: (project) => {
    localStorage.setItem('currentProject', JSON.stringify(project));
    set({ currentProject: project, projectRole: project.role ?? null });
  },

  setStatuses: (statuses) => set({ statuses }),

  loadInitialProject: async () => {
    const stored = storedProject();
    if (stored) {
      set({ currentProject: stored, projectRole: stored.role ?? null });
      try {
        const res = await api.get(`/projects/${stored.id}/statuses`);
        const statuses = res?.data?.data ?? res?.data ?? [];
        set({ statuses });
      } catch {}
      return;
    }
    try {
      const res = await api.get('/users/me/projects');
      const projects = res?.data?.data ?? res?.data ?? [];
      if (projects.length > 0) {
        const project = projects[0];
        localStorage.setItem('currentProject', JSON.stringify(project));
        set({ currentProject: project, projectRole: project.role ?? null });
        const statusRes = await api.get(`/projects/${project.id}/statuses`);
        const statuses = statusRes?.data?.data ?? statusRes?.data ?? [];
        set({ statuses });
      }
    } catch {}
  },
}));

