import api from './client';

export const ticketsApi = {
  list: (params?: Record<string, any>) => {
    // Boş string değerleri temizle
    const cleaned: Record<string, any> = {};
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) cleaned[k] = v;
      });
    }
    return api.get('/tickets', { params: cleaned });
  },

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
