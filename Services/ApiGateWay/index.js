const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const {
  createProxyMiddleware,
  fixRequestBody,
} = require("http-proxy-middleware");

const verifyToken = require("./middleware/verifyToken");
require("dotenv").config();
const app = express();

// ========================================
// GLOBAL SECURITY MIDDLEWARE
// ========================================

app.use(helmet());

app.use(
  cors({
    origin: [process.env.FRONTEND_URL || "http://localhost:5173",
      process.env.RESTAURANT_MANAGER_URL].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.use(express.json());
app.use(require('./security/session.cjs').csrfProtection());

// JWT VERIFICATION
app.use(verifyToken);

// SERVICE URLS
const SERVICES = {
  USER_SERVICE: process.env.USER_SERVICE_URL || "http://localhost:5001",

  RESTAURANT_SERVICE:
    process.env.RESTAURANT_SERVICE_URL || "http://localhost:5002",

  ORDER_SERVICE: process.env.ORDER_SERVICE_URL || "http://localhost:5003",

  DELIVERY_SERVICE: process.env.DELIVERY_SERVICE_URL || "http://localhost:5004",

  PAYMENT_SERVICE: process.env.PAYMENT_SERVICE_URL || "http://localhost:5005",

  NOTIFICATION_SERVICE:
    process.env.NOTIFICATION_SERVICE_URL || "http://localhost:5006",
};

// USER / AUTH SERVICE
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: SERVICES.USER_SERVICE,
    changeOrigin: true,
    pathRewrite: (path) => {
      const newPath = "/api/auth" + path;
      console.log(`[GATEWAY] Rewriting ${path} -> ${newPath}`);
      return newPath;
    },
    on: {
      proxyReq: (proxyReq, req, res) => {
        console.log(`[GATEWAY] Forwarding ${req.method} ${req.originalUrl}`);
        fixRequestBody(proxyReq, req, res);
      },
      proxyRes: (proxyRes) => {
        console.log(`[GATEWAY] User Service response: ${proxyRes.statusCode}`);
      },
      error: (err) => {
        console.error(`[GATEWAY] User Service proxy error: ${err.message}`);
      },
    },
  }),
);

// RESTAURANT SERVICE
app.use(
  "/api/restaurants",
  createProxyMiddleware({
    target: SERVICES.RESTAURANT_SERVICE,
    changeOrigin: true,
    on: { proxyReq: fixRequestBody },
    pathRewrite: (path) => {
      const newPath = "/api/restaurants" + (path === "/" ? "" : path);
      console.log(`[GATEWAY] Rewriting restaurant path to: ${newPath}`);
      return newPath;
    },
  }),
);
// ORDER SERVICE
app.use(
  "/api/orders",
  createProxyMiddleware({
    target: SERVICES.ORDER_SERVICE,
    changeOrigin: true,
    pathRewrite: path => '/api/orders' + (path === '/' ? '' : path),
    on: { proxyReq: fixRequestBody },
  }),
);

// PAYMENT SERVICE
app.use(
  "/api/payment",
  createProxyMiddleware({
    target: SERVICES.PAYMENT_SERVICE,
    changeOrigin: true,
  }),
);

// DELIVERY SERVICE
app.use(
  "/api/delivery",
  createProxyMiddleware({
    target: SERVICES.DELIVERY_SERVICE,
    changeOrigin: true,
  }),
);

// NOTIFICATION SERVICE
app.use(
  "/api/notifications",
  createProxyMiddleware({
    target: SERVICES.NOTIFICATION_SERVICE,
    changeOrigin: true,
  }),
);

// START SERVER
const PORT = process.env.GATEWAY_PORT || process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
