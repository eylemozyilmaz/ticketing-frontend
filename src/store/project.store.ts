import { create } from 'zustand';

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
}

interface ProjectState {
  currentProject: Project | null;
  statuses: Status[];
  setCurrentProject: (project: Project) => void;
  setStatuses: (statuses: Status[]) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  statuses: [],
  setCurrentProject: (project) => set({ currentProject: project }),
  setStatuses: (statuses) => set({ statuses }),
}));
