import axios from 'axios';
const origins = {
  'http://localhost:5000': import.meta.env.VITE_GATEWAY_URL || 'http://localhost:5000',
  'http://localhost:5001': import.meta.env.VITE_AUTH_URL || 'http://localhost:5001',
  'http://localhost:5002': import.meta.env.VITE_RESTAURANT_URL || 'http://localhost:5002',
  'http://localhost:5003': import.meta.env.VITE_ORDER_URL || 'http://localhost:5003',
  'http://localhost:5004': import.meta.env.VITE_DELIVERY_URL || 'http://localhost:5004',
  'http://localhost:5005': import.meta.env.VITE_PAYMENT_URL || 'http://localhost:5005',
  'http://localhost:5006': import.meta.env.VITE_NOTIFICATION_URL || 'http://localhost:5006',
};
export const gatewayURL = origins['http://localhost:5000'];
const http = axios.create();
http.interceptors.request.use(config => {
  const url = new URL(config.url, config.baseURL || window.location.origin);
  if (origins[url.origin]) {
    config.url = origins[url.origin] + url.pathname + url.search;
    config.baseURL = undefined;
    config.withCredentials = true;
    config.headers['X-DineSwift-Request'] = '1';
  }
  return config;
});
export default http;
