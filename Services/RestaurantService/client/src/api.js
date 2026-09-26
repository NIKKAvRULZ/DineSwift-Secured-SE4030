import axios from 'axios';
export const authURL = process.env.REACT_APP_AUTH_URL || 'http://localhost:5000';
const restaurantURL = process.env.REACT_APP_RESTAURANT_URL || 'http://localhost:5002';
const api = axios.create();
api.interceptors.request.use(config => {
    const url = new URL(config.url, window.location.origin);
    const origins = { 'http://localhost:5000': authURL, 'http://localhost:5002': restaurantURL };
    if (origins[url.origin] || [authURL, restaurantURL].includes(url.origin)) {
        config.url = (origins[url.origin] || url.origin) + url.pathname + url.search;
        config.withCredentials = true;
        config.headers['X-DineSwift-Request'] = '1';
    }
    return config;
});
export default api;
