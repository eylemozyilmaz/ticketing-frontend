import api from './client';

export const projectsApi = {
  list: () => api.get('/projects'),
  get: (id: string) => api.get(`/projects/${id}`),
  getStatuses: (id: string) => api.get(`/projects/${id}/statuses`),
  getCategories: (id: string) => api.get(`/projects/${id}/categories`),
  getMembers: (id: string) => api.get(`/projects/${id}/members`),
};
