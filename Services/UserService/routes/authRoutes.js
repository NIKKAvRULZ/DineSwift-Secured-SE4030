const express = require("express");
const rateLimit = require('express-rate-limit');
const { register, login } = require("../controllers/authController");
const router = express.Router();

// Rate limiter configuration (A04 / Brute-force protection)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per window
    message: { message: 'Too many requests from this IP, please try again after 15 minutes' }
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

module.exports = router;