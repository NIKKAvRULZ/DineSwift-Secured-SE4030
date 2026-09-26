const express = require("express");
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const { establishSession, authenticate, beginOAuth, verifyOAuthState } = require('../security/authSession');
const { csrfProtection } = require('../security/session.cjs');
const { register, login, me, logout } = require("../controllers/authController");
const router = express.Router();
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// Rate limiter configuration (A04 / Brute-force protection)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    statusCode: 429,
    message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post("/register", authLimiter, csrfProtection(true), register);
router.post("/login", authLimiter, csrfProtection(true), login);

router.get('/me', authenticate, me);
router.post('/logout', csrfProtection(true), logout);

// OAuth state is bound to a short-lived HttpOnly cookie before leaving this site.
router.get('/google', beginOAuth, (req, res, next) =>
    passport.authenticate('google', { scope: ['profile', 'email'], state: req.oauthState, session: false })(req, res, next));
router.get('/google/callback', verifyOAuthState, (req, res, next) => {
    passport.authenticate('google', { session: false }, (error, user) => {
        const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
        if (error || !user) return res.redirect(`${frontend}/login?error=oauth`);
        try {
            establishSession(res, user);
            return res.redirect(`${frontend}/login?oauth=success`);
        } catch { return res.status(500).json({ message: 'Unable to establish session' }); }
    })(req, res, next);
});
module.exports = router;
