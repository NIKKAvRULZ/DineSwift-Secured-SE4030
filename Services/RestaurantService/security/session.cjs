// Kept byte-identical in UserService, ApiGateWay, RestaurantService and OrderService
// so each service can still be built from its existing independent Docker context.
const production = () => process.env.NODE_ENV === 'production';
const cookieName = () => production() ? '__Host-dineswift_session' : 'dineswift_session';
const stateName = () => production() ? '__Host-dineswift_oauth_state' : 'dineswift_oauth_state';
const cookieOptions = () => ({ httpOnly: true, secure: production(), sameSite: 'lax', path: '/' });
const origins = () => [process.env.FRONTEND_URL || 'http://localhost:5173', process.env.RESTAURANT_MANAGER_URL].filter(Boolean);

function readCookie(req, name) {
    const entries = (req.headers.cookie || '').split(';').map(value => value.trim())
        .filter(value => value.startsWith(name + '='));
    if (entries.length !== 1) return null;
    try { return decodeURIComponent(entries[0].slice(name.length + 1)); } catch { return null; }
}
function accessToken(req) {
    if (req.headers.authorization !== undefined) {
        return /^Bearer ([^\s]+)$/i.exec(req.headers.authorization)?.[1] || null;
    }
    return readCookie(req, cookieName());
}
function csrfProtection(always = false) {
    return (req, res, next) => {
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
        const hasCookie = (req.headers.cookie || '').split(';').some(value => value.trim().startsWith(cookieName() + '='));
        if (!always && !hasCookie) return next(); // Explicit bearer API clients remain supported.
        if (!origins().includes(req.headers.origin) || req.headers['x-dineswift-request'] !== '1') {
            return res.status(403).json({ message: 'Request origin could not be verified' });
        }
        return next();
    };
}
module.exports = { cookieName, stateName, cookieOptions, origins, readCookie, accessToken, csrfProtection };
