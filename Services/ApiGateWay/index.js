const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const verifyToken = require('./middleware/verifyToken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Apply JWT verification middleware globally
app.use(verifyToken);

// Copilot Fix: Corrected port mappings for Delivery (5004), Payment (5005), and Notification (5003)
const SERVICES = {
  USER_SERVICE: process.env.USER_SERVICE_URL || 'http://localhost:5001',
  RESTAURANT_SERVICE: process.env.RESTAURANT_SERVICE_URL || 'http://localhost:5002',
  ORDER_SERVICE: process.env.ORDER_SERVICE_URL || 'http://localhost:5003',
  DELIVERY_SERVICE: process.env.DELIVERY_SERVICE_URL || 'http://localhost:5004', 
  PAYMENT_SERVICE: process.env.PAYMENT_SERVICE_URL || 'http://localhost:5005', 
  NOTIFICATION_SERVICE: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5003' 
};

// Copilot Fix: Pass the route directly into createProxyMiddleware so Express doesn't strip the /api prefix.
// Copilot Fix: Changed /api/payments to singular /api/payment.
// Copilot Fix: Routed /api/users to ORDER_SERVICE instead of USER_SERVICE.
app.use(createProxyMiddleware('/api/auth', { target: SERVICES.USER_SERVICE, changeOrigin: true }));
app.use(createProxyMiddleware('/api/users', { target: SERVICES.ORDER_SERVICE, changeOrigin: true }));
app.use(createProxyMiddleware('/api/restaurants', { target: SERVICES.RESTAURANT_SERVICE, changeOrigin: true }));
app.use(createProxyMiddleware('/api/orders', { target: SERVICES.ORDER_SERVICE, changeOrigin: true }));
app.use(createProxyMiddleware('/api/payment', { target: SERVICES.PAYMENT_SERVICE, changeOrigin: true }));
app.use(createProxyMiddleware('/api/delivery', { target: SERVICES.DELIVERY_SERVICE, changeOrigin: true }));
app.use(createProxyMiddleware('/api/notifications', { target: SERVICES.NOTIFICATION_SERVICE, changeOrigin: true }));

// Copilot Fix: Support GATEWAY_PORT variable
const PORT = process.env.GATEWAY_PORT || process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});