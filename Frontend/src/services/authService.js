import http from '../api/http';
const base = 'http://localhost:5001/api';
const authService = {
  login: async (email, password) => (await http.post(`${base}/auth/login`, {email, password})).data,
  register: async user => (await http.post(`${base}/auth/register`, user)).data,
  logout: async () => { await http.post(`${base}/auth/logout`); },
  getCurrentUser: async () => (await http.get(`${base}/auth/me`)).data.user,
  updateProfile: async user => (await http.put(`${base}/users/profile`, user)).data,
};
export default authService;
