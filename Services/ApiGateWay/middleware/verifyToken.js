const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // 1. Log every single request that hits the gateway
    console.log(`[GATEWAY] Intercepted request to: ${req.originalUrl}`);

    // 2. Let auth routes pass
    if (req.originalUrl.startsWith('/api/auth')) {
        console.log(`[GATEWAY] Letting auth request pass through`);
        return next();
    }

    // 3. Look for the token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.log(`[GATEWAY] BLOCKED: No token provided`);
        return res.status(401).json({ message: 'Access Denied: No Token Provided' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified; 
        console.log(`[GATEWAY] PASSED: Token verified for user ${verified.id}`);
        next(); 
    } catch (error) {
        console.log(`[GATEWAY] BLOCKED: Invalid or expired token`);
        return res.status(403).json({ message: 'Invalid or Expired Token' });
    }
};

module.exports = verifyToken;