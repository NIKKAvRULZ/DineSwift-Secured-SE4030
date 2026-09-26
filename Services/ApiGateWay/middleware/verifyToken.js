const { accessToken } = require('../security/session.cjs');
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    console.log(`[GATEWAY] Intercepted request to: ${req.originalUrl}`);

    if ((req.path === '/api/auth' || req.path.startsWith('/api/auth/'))) {
        console.log(`[GATEWAY] Letting auth request pass through`);
        return next();
    }

    const token = accessToken(req);
    if (!token) return res.status(401).json({ message: 'Authentication required' });

    // Copilot Fix: Prevent crashes if JWT_SECRET is missing from Gateway .env
    if (!process.env.JWT_SECRET) {
        console.error(`[GATEWAY] CRITICAL: JWT_SECRET is not defined in Gateway environment`);
        return res.status(500).json({ message: 'Internal Server Error: Gateway Misconfiguration' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        req.user = verified; 
        console.log(`[GATEWAY] PASSED: Token verified for user ${verified.id}`);
        next(); 
    } catch (error) {
        console.log(`[GATEWAY] BLOCKED: Invalid or expired token`);
        return res.status(403).json({ message: 'Invalid or Expired Token' });
    }
};

module.exports = verifyToken;