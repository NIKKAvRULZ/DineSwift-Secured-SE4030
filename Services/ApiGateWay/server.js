// const express = require('express');
// const cors = require('cors');
// const { createProxyMiddleware } = require('http-proxy-middleware');
// const verifyToken = require('./middleware/verifyToken');
// require('dotenv').config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// // Apply JWT verification middleware globally
// app.use(verifyToken);

// // Service URLs - mapped to the correct 5000-series ports
// const SERVICES = {
//   USER_SERVICE: process.env.USER_SERVICE_URL || 'http://localhost:5001',
//   RESTAURANT_SERVICE: process.env.RESTAURANT_SERVICE_URL || 'http://localhost:5002',
//   ORDER_SERVICE: process.env.ORDER_SERVICE_URL || 'http://localhost:5003',
//   PAYMENT_SERVICE: process.env.PAYMENT_SERVICE_URL || 'http://localhost:5004',
//   DELIVERY_SERVICE: process.env.DELIVERY_SERVICE_URL || 'http://localhost:5005',
//   NOTIFICATION_SERVICE: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5006'
// };

// // Route definitions (Path rewrites removed so backends receive the correct URL)
// app.use('/api/auth', createProxyMiddleware({ target: SERVICES.USER_SERVICE, changeOrigin: true }));
// app.use('/api/users', createProxyMiddleware({ target: SERVICES.USER_SERVICE, changeOrigin: true }));
// app.use('/api/restaurants', createProxyMiddleware({ target: SERVICES.RESTAURANT_SERVICE, changeOrigin: true }));
// app.use('/api/orders', createProxyMiddleware({ target: SERVICES.ORDER_SERVICE, changeOrigin: true }));
// app.use('/api/payments', createProxyMiddleware({ target: SERVICES.PAYMENT_SERVICE, changeOrigin: true }));
// app.use('/api/delivery', createProxyMiddleware({ target: SERVICES.DELIVERY_SERVICE, changeOrigin: true }));
// app.use('/api/notifications', createProxyMiddleware({ target: SERVICES.NOTIFICATION_SERVICE, changeOrigin: true }));

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`API Gateway running on port ${PORT}`);
// });