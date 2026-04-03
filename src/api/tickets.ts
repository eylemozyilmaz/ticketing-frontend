import api from './client';

export const ticketsApi = {
  list: (params?: Record<string, any>) => {
    const cleaned: Record<string, any> = {};
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) cleaned[k] = v;
      });
    }
    return api.get('/tickets', { params: cleaned });
  },
  get: (id: string) => api.get(`/tickets/${id}`),
  create: (data: Record<string, any>) => api.post('/tickets', data),
  update: (id: string, data: Record<string, any>) => api.patch(`/tickets/${id}`, data),
  changeStatus: (id: string, statusId: string, note?: string) =>
    api.patch(`/tickets/${id}/status`, { statusId, note }),
  forward: (id: string, data: Record<string, any>) => api.post(`/tickets/${id}/forward`, data),
  recall: (id: string) => api.patch(`/tickets/${id}/recall`),
  close: (id: string, data: Record<string, any>) => api.post(`/tickets/${id}/close`, data),
  getMessages: (id: string) => api.get(`/tickets/${id}/messages`),
  addMessage: (id: string, data: Record<string, any> | FormData) =>
    api.post(`/tickets/${id}/messages`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    }),
  getRelated: (id: string) => api.get(`/tickets/${id}/related`),
  getSla: (id: string) => api.get(`/tickets/${id}/sla`),
  getAttachments: (id: string) => api.get(`/tickets/${id}/attachments`),
  addAttachment: (id: string, formData: FormData) =>
    api.post(`/tickets/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteAttachment: (id: string, attId: string) =>
    api.delete(`/tickets/${id}/attachments/${attId}`),
  getApprovals: (id: string) => api.get(`/tickets/${id}/approvals`),
  getCategories: (id: string) => api.get(`/tickets/${id}/categories`),
  addCategory: (id: string, categoryId: string) =>
    api.post(`/tickets/${id}/categories`, { categoryId }),
  removeCategory: (id: string, categoryId: string) =>
    api.delete(`/tickets/${id}/categories/${categoryId}`),
  getResolutions: (id: string) => api.get(`/tickets/${id}/resolutions`),
  addResolution: (id: string, data: Record<string, any>) =>
    api.post(`/tickets/${id}/resolutions`, data),
  deleteResolution: (id: string, rid: string) =>
    api.delete(`/tickets/${id}/resolutions/${rid}`),
  getCustomValues: (id: string) => api.get(`/tickets/${id}/custom-values`),
  upsertCustomValue: (id: string, data: Record<string, any>) =>
    api.post(`/tickets/${id}/custom-values`, data),
  markViewed: (id: string) => api.post(`/tickets/${id}/viewed`),
  externalForward: (id: string, data: Record<string, any>) =>
    api.post(`/tickets/${id}/external-forward`, data),
};
