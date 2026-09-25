import axios from 'axios';

// The manager's token is memory-only and is cleared when the page is refreshed.
let accessToken = null;
export const setAccessToken = token => { accessToken = token; };
const api = axios.create();
api.interceptors.request.use(config => {
    const url = new URL(config.url, window.location.origin);
    if (url.origin === 'http://localhost:5002' && !['get', 'head', 'options'].includes(config.method)) {
        if (!accessToken) throw new Error('Please sign in before making changes');
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
});
export default api;
