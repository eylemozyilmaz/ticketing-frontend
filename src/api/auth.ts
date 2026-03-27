import api from './client';

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
};
