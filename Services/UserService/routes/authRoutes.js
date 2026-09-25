const express = require("express");
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { register, login } = require("../controllers/authController");
const router = express.Router();

// Rate limiter configuration (A04 / Brute-force protection)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    statusCode: 429,
    message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

// OAuth 2.0 / OpenID Connect Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login', session: false }),
    (req, res) => {
        // Issue JWT token upon successful Google verification
        const token = jwt.sign(
            { id: req.user._id, role: req.user.role, name: req.user.name, email: req.user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Redirect user back to frontend with the token
        res.redirect(`http://localhost:5173/login?token=${token}`);
    }
);

module.exports = router;