const jwt = require('jsonwebtoken');
const { randomBytes, timingSafeEqual } = require('node:crypto');
const { cookieName, stateName, cookieOptions, readCookie, accessToken } = require('./session.cjs');

const userInfo = user => ({ id: String(user._id || user.id), role: user.role, name: user.name, email: user.email });
function establishSession(res, user) {
    const publicUser = userInfo(user);
    const token = jwt.sign(publicUser, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
    res.cookie(cookieName(), token, { ...cookieOptions(), maxAge: 60 * 60 * 1000 });
    res.set('Cache-Control', 'no-store');
    return publicUser;
}
function clearSession(res) {
    res.clearCookie(cookieName(), cookieOptions());
    res.set('Cache-Control', 'no-store');
}
function authenticate(req, res, next) {
    try {
        const claims = jwt.verify(accessToken(req) || '', process.env.JWT_SECRET, { algorithms: ['HS256'] });
        if (!/^[a-f\d]{24}$/i.test(claims.id || '') || !Number.isInteger(claims.exp)) throw new Error('Invalid identity');
        req.user = claims;
        res.set('Cache-Control', 'no-store');
        return next();
    } catch { return res.status(401).json({ message: 'Authentication required' }); }
}
function beginOAuth(req, res, next) {
    req.oauthState = randomBytes(32).toString('hex');
    res.cookie(stateName(), req.oauthState, { ...cookieOptions(), maxAge: 10 * 60 * 1000 });
    res.set('Cache-Control', 'no-store');
    return next();
}
function verifyOAuthState(req, res, next) {
    const expected = readCookie(req, stateName());
    const actual = req.query.state;
    res.clearCookie(stateName(), cookieOptions());
    res.set('Cache-Control', 'no-store');
    if (typeof actual !== 'string' || !expected || !/^[a-f0-9]{64}$/.test(actual) || !/^[a-f0-9]{64}$/.test(expected) ||
        !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) {
        return res.status(400).json({ message: 'Invalid OAuth state; please sign in again' });
    }
    return next();
}
module.exports = { establishSession, clearSession, authenticate, beginOAuth, verifyOAuthState };
