const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { randomBytes } = require('node:crypto');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const User = require('../models/User');
const session = require('../security/session.cjs');
const { establishSession } = require('../security/authSession');

const oldEnv = { ...process.env };
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.RESTAURANT_MANAGER_URL = 'http://localhost:3000';
const user = { _id: '111111111111111111111111', role: 'restaurant-admin', name: 'Test', email: 'test@example.com' };
const password = randomBytes(16).toString('hex');
const browser = { Origin: process.env.FRONTEND_URL, 'X-DineSwift-Request': '1' };
const servers = [];
const originals = { findOne: User.findOne, findById: User.findById, save: User.prototype.save };
let base, restaurantBase, orderBase, gatewayBase, cookie, jwtValue;
async function listen(app) {
    const server = app.listen(0, '127.0.0.1'); servers.push(server);
    await new Promise(resolve => server.once('listening', resolve));
    return `http://127.0.0.1:${server.address().port}`;
}
async function call(baseURL, route, { method = 'GET', headers = {}, body, redirect = 'follow' } = {}) {
    return fetch(baseURL + route, { method, headers: { 'Content-Type': 'application/json', ...headers }, redirect,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
before(async () => {
    user.password = await bcrypt.hash(password, 4);
    User.findOne = async ({ email }) => email === user.email ? user : null;
    User.findById = () => ({ select: async () => user });
    User.prototype.save = async function () { return this; };
    // Real Passport middleware, deterministic provider fixture; no call to Google.
    class GoogleFixture extends passport.Strategy {
        authenticate(req, options) {
            if (req.query.code === 'verified-fixture') this.success(user);
            else this.redirect('https://accounts.example.test/authorize?state=' + options.state);
        }
    }
    passport.use('google', new GoogleFixture());
    const app = express();
    app.use(cors({ origin: session.origins(), credentials: true }));
    app.use(express.json()); app.use(passport.initialize());
    app.use('/api/auth', require('../routes/authRoutes'));
    base = await listen(app);
    const { authenticateToken } = require('../../RestaurantService/middleware/authMiddleware');
    const restaurant = express(); restaurant.use(express.json());
    restaurant.all('/api/restaurants/session-test', authenticateToken, (req, res) => res.json({ id: req.user.id, body: req.body }));
    restaurantBase = await listen(restaurant);
    const order = express(); order.use(express.json());
    const orderAuth = await import('../../OrderService/middleware/authMiddleware.js');
    order.all('/api/orders/session-test', orderAuth.authenticateToken, (req, res) => res.json({ id: req.user.id, body: req.body }));
    orderBase = await listen(order);
    // Execute the actual gateway entry point with ephemeral listeners and no .env loading.
    process.env.USER_SERVICE_URL = base;
    process.env.RESTAURANT_SERVICE_URL = restaurantBase;
    process.env.ORDER_SERVICE_URL = orderBase;
    const gatewayFile = path.resolve(__dirname, '../../ApiGateWay/index.js');
    const gatewayRequire = createRequire(gatewayFile);
    let gatewayServer;
    const captureExpress = Object.assign(() => {
        const gateway = express();
        const originalListen = gateway.listen.bind(gateway);
        gateway.listen = (port, callback) => {
            gatewayServer = originalListen(0, '127.0.0.1', callback); servers.push(gatewayServer); return gatewayServer;
        };
        return gateway;
    }, express);
    vm.runInNewContext(fs.readFileSync(gatewayFile, 'utf8'), {
        process, console: { log() {}, error() {} },
        require(name) {
            if (name === 'dotenv') return { config() {} };
            if (name === 'express') return captureExpress;
            return gatewayRequire(name);
        }
    });
    if (!gatewayServer.listening) await new Promise(resolve => gatewayServer.once('listening', resolve));
    gatewayBase = `http://127.0.0.1:${gatewayServer.address().port}`;
    const response = await call(base, '/api/auth/login', { method: 'POST', headers: browser, body: { email: user.email, password } });
    assert.equal(response.status, 200);
    cookie = response.headers.get('set-cookie').split(';')[0];
    jwtValue = decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1));
});
after(async () => {
    await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
    User.findOne = originals.findOne; User.findById = originals.findById; User.prototype.save = originals.save;
    for (const key of Object.keys(process.env)) if (!(key in oldEnv)) delete process.env[key];
    Object.assign(process.env, oldEnv);
});

test('login sets HttpOnly Lax host-only cookie and returns no JWT', async () => {
    const response = await call(gatewayBase, '/api/auth/login', {method: 'POST', headers: browser, body: {email: user.email, password}});
    const setCookie = response.headers.get('set-cookie');
    assert.match(setCookie, /HttpOnly/i); assert.match(setCookie, /SameSite=Lax/i);
    assert.match(setCookie, /Path=\//); assert.match(setCookie, /Max-Age=3600/);
    assert.doesNotMatch(setCookie, /Domain=/i);
    const body = await response.json();
    assert.equal(body.user.id, user._id); assert.equal(body.token, undefined); assert.equal(body.user.password, undefined);
    assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('production cookies enforce Secure, HttpOnly, host prefix and root path', () => {
    process.env.NODE_ENV = 'production';
    try {
        let issued;
        establishSession({ cookie: (name, value, options) => { issued = { name, value, options }; }, set() {} }, user);
        assert.equal(issued.name, '__Host-dineswift_session');
        assert.equal(issued.options.secure, true); assert.equal(issued.options.httpOnly, true);
        assert.equal(issued.options.path, '/'); assert.equal(issued.options.domain, undefined);
        assert.equal(jwt.verify(issued.value, process.env.JWT_SECRET).id, user._id);
    } finally { process.env.NODE_ENV = 'test'; }
});
test('registration establishes a customer cookie session without a token in JSON', async () => {
    const response = await call(base, '/api/auth/register', {method: 'POST', headers: browser,
        body: {name: 'New customer', email: 'new@example.com', password}});
    assert.equal(response.status, 201); assert.ok(response.headers.get('set-cookie'));
    const body = await response.json(); assert.equal(body.user.role, 'customer'); assert.equal(body.token, undefined);
});
test('me restores a valid session and rejects missing, altered and expired cookies', async () => {
    const expired = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: -1});
    for (const value of ['', 'dineswift_session=invalid', 'dineswift_session=' + expired]) {
        assert.equal((await call(base, '/api/auth/me', {headers: {Cookie: value}})).status, 401);
    }
    const response = await call(gatewayBase, '/api/auth/me', {headers: {Cookie: cookie}});
    assert.equal(response.status, 200); assert.equal((await response.json()).user.id, user._id);
});
test('login CSRF rejects missing/foreign Origin and missing custom header', async () => {
    for (const headers of [{}, {...browser, Origin: 'https://evil.example'}, {Origin: browser.Origin}]) {
        const response = await call(base, '/api/auth/login', {method: 'POST', headers, body: {email: user.email, password}});
        assert.equal(response.status, 403); assert.equal(response.headers.get('set-cookie'), null);
    }
});
test('restaurant and order cookie auth work directly and through actual gateway proxy with JSON bodies', async () => {
    for (const [server, route] of [[restaurantBase, '/api/restaurants/session-test'], [orderBase, '/api/orders/session-test'],
        [gatewayBase, '/api/restaurants/session-test'], [gatewayBase, '/api/orders/session-test']]) {
        const response = await call(server, route, {method: 'POST', headers: {...browser, Cookie: cookie}, body: {value: 42}});
        assert.equal(response.status, 200); assert.deepEqual(await response.json(), {id: user._id, body: {value: 42}});
        for (const headers of [{Cookie: cookie}, {Cookie: cookie, ...browser, Origin: 'https://evil.example'}, {Cookie: cookie, Origin: browser.Origin}]) {
            assert.equal((await call(server, route, {method: 'POST', headers, body: {value: 42}})).status, 403);
        }
        assert.equal((await call(server, route, {method: 'POST', headers: {Authorization: 'Bearer ' + jwtValue}, body: {}})).status, 200);
    }
});
test('CORS permits configured browser credentials and not arbitrary origins', async () => {
    for (const origin of [browser.Origin, 'http://localhost:3000', 'https://evil.example']) {
        const response = await call(base, '/api/auth/me', {method: 'OPTIONS', headers: {Origin: origin, 'Access-Control-Request-Method': 'GET'}});
        assert.equal(response.headers.get('access-control-allow-origin'), origin === 'https://evil.example' ? null : origin);
        if (origin !== 'https://evil.example') assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    }
});
test('logout rejects CSRF, clears the same cookie and unauthenticated me then returns 401', async () => {
    assert.equal((await call(base, '/api/auth/logout', {method: 'POST', headers: {Cookie: cookie}})).status, 403);
    const response = await call(gatewayBase, '/api/auth/logout', {method: 'POST', headers: {...browser, Cookie: cookie}});
    assert.equal(response.status, 204);
    assert.match(response.headers.get('set-cookie'), /dineswift_session=;/);
    assert.match(response.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
    assert.equal((await call(base, '/api/auth/me')).status, 401);
});
test('OAuth binds state, rejects missing/mismatched state and redirects without exposing a token', async () => {
    const start = await call(gatewayBase, '/api/auth/google', {redirect: 'manual'});
    const stateCookie = start.headers.get('set-cookie').split(';')[0];
    const state = new URL(start.headers.get('location')).searchParams.get('state');
    assert.equal(state.length, 64); assert.match(start.headers.get('set-cookie'), /HttpOnly/);
    for (const route of ['/api/auth/google/callback?code=verified-fixture', '/api/auth/google/callback?state=wrong&code=verified-fixture']) {
        assert.equal((await call(base, route, {headers: {Cookie: stateCookie}, redirect: 'manual'})).status, 400);
    }
    assert.equal((await call(base, `/api/auth/google/callback?state=${state}&code=verified-fixture`, {redirect: 'manual'})).status, 400);
    const callback = await call(gatewayBase, `/api/auth/google/callback?state=${state}&code=verified-fixture`, {headers: {Cookie: stateCookie}, redirect: 'manual'});
    assert.equal(callback.status, 302); assert.match(callback.headers.get('set-cookie'), /dineswift_session=/);
    assert.equal(callback.headers.get('location'), browser.Origin + '/login?oauth=success');
    assert.doesNotMatch(callback.headers.get('location'), /token|eyJ/);
});
test('independently packaged cookie helpers are identical', () => {
    const normalize = value => value.replace(/\r\n/g, '\n');
    const source = normalize(fs.readFileSync(path.resolve(__dirname, '../security/session.cjs'), 'utf8'));
    for (const service of ['ApiGateWay', 'RestaurantService', 'OrderService']) {
        assert.equal(normalize(fs.readFileSync(path.resolve(__dirname, `../../${service}/security/session.cjs`), 'utf8')), source);
    }
});
