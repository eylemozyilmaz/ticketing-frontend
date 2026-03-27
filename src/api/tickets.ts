import api from './client';

export const ticketsApi = {
  list: (params?: Record<string, any>) =>
    api.get('/tickets', { params }),

  get: (id: string) =>
    api.get(`/tickets/${id}`),

  create: (data: Record<string, any>) =>
    api.post('/tickets', data),

  update: (id: string, data: Record<string, any>) =>
    api.patch(`/tickets/${id}`, data),

  changeStatus: (id: string, statusId: string, note?: string) =>
    api.patch(`/tickets/${id}/status`, { statusId, note }),

  forward: (id: string, data: Record<string, any>) =>
    api.post(`/tickets/${id}/forward`, data),

  recall: (id: string) =>
    api.patch(`/tickets/${id}/recall`),

  close: (id: string, data: Record<string, any>) =>
    api.post(`/tickets/${id}/close`, data),

  getMessages: (id: string) =>
    api.get(`/tickets/${id}/messages`),

  addMessage: (id: string, data: Record<string, any>) =>
    api.post(`/tickets/${id}/messages`, data),

  getRelated: (id: string) =>
    api.get(`/tickets/${id}/related`),
};
