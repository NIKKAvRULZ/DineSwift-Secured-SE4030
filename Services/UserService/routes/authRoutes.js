const express = require("express");
const passport = require("passport");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const { register, login } = require("../controllers/authController");

const router = express.Router();

// Define the rate limiter for authentication routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: { message: "Too many login/register attempts from this IP, please try again after 15 minutes" },
    standardHeaders: true,
    legacyHeaders: false,
});

// Standard Auth Routes protected by the rate limiter
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

// --- Google OAuth 2.0 Routes ---

// Route to start the Google login flow
router.get("/google", passport.authenticate("google", { 
    scope: ["profile", "email"] 
}));

// Callback route that Google redirects to after user consent
router.get("/google/callback", 
    passport.authenticate("google", { session: false, failureRedirect: "/login" }),
    (req, res) => {
        // Successful authentication
        const token = jwt.sign(
            { id: req.user._id, role: req.user.role, name: req.user.name, email: req.user.email }, 
            process.env.JWT_SECRET, 
            { expiresIn: "1h" }
        );

        // Redirect to the frontend with the token
        res.redirect(`http://localhost:5173/auth/success?token=${token}`);
    }
);

module.exports = router;