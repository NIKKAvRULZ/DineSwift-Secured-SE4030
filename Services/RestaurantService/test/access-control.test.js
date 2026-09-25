const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('node:crypto');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const router = require('../routes/restaurantRoutes');

// Real HTTP + Express + JWT; database operations are isolated in-memory test doubles.
const owner = '111111111111111111111111';
const other = '222222222222222222222222';
const rid = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const mid = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const previousSecret = process.env.JWT_SECRET;
process.env.JWT_SECRET = randomBytes(32).toString('hex');
const token = (id = owner, role = 'restaurant-admin', options = {}) =>
    jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1h', ...options });
let server, base;
let restaurant, item, writes;
const originals = [];
function stub(object, key, value) {
    originals.push([object, key, object[key]]);
    object[key] = value;
}
function query(value) {
    return { select: () => query(value), populate: () => query(value),
        then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) };
}
function reset() {
    writes = [];
    restaurant = { _id: rid, owner, menuItems: [mid],
        toObject() { return { _id: rid, name: 'Test restaurant' }; },
        async save() { writes.push('restaurant-save'); } };
    item = { _id: mid, restaurantId: rid, name: 'Test meal', images: ['https://example.com/a.jpg'],
        ratings: [], comments: [], rating: 0,
        toObject() { return { _id: mid, comments: this.comments }; },
        async save() { writes.push('menu-save'); } };
}
async function request(method, path, bearer, body) {
    const response = await fetch(base + path, {
        method, headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    return { status: response.status, body: await response.json() };
}
before(async () => {
    stub(Restaurant, 'findById', () => query(restaurant));
    stub(Restaurant, 'find', () => query([restaurant]));
    stub(Restaurant, 'distinct', () => query(['Test cuisine']));
    stub(MenuItem, 'find', () => query([item]));
    stub(MenuItem, 'findById', () => query(item));
    stub(MenuItem, 'findOne', () => query(item));
    stub(Restaurant, 'findByIdAndUpdate', (id, update) => { writes.push(update); return query(restaurant); });
    stub(Restaurant, 'findByIdAndDelete', () => { writes.push('restaurant-delete'); return query(restaurant); });
    stub(MenuItem, 'deleteMany', () => { writes.push('menu-delete-many'); return query({}); });
    stub(MenuItem, 'findByIdAndDelete', () => { writes.push('menu-delete'); return query(item); });
    stub(MenuItem, 'findByIdAndUpdate', (id, update) => { writes.push(update); return query(item); });
    stub(Restaurant.prototype, 'save', async function () { writes.push(this.toObject({ transform: false })); return this; });
    stub(MenuItem.prototype, 'save', async function () { writes.push(this.toObject()); return this; });
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    app.use((error, req, res, next) => res.status(500).json({ message: 'Internal server error' }));
    await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
    base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
    for (const [object, key, value] of originals.reverse()) object[key] = value;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
    await new Promise(resolve => server.close(resolve));
});

const mutations = [
    ['POST', '/restaurants'], ['PUT', `/restaurants/${rid}`], ['DELETE', `/restaurants/${rid}`],
    ['POST', `/restaurants/${rid}/menu-items`], ['PUT', `/menu-items/${mid}`], ['DELETE', `/menu-items/${mid}`],
    ['POST', `/restaurants/${rid}/menu-items/${mid}/rate`],
    ['POST', `/restaurants/${rid}/menu-items/${mid}/comments`]
];

test('every write rejects missing, malformed, expired, wrong-key and wrong-algorithm JWTs before writing', async () => {
    const credentials = [undefined, 'invalid', token(owner, 'restaurant-admin', { expiresIn: -1 }),
        jwt.sign({ id: owner, role: 'restaurant-admin' }, randomBytes(32), { expiresIn: '1h' }),
        token(owner, 'restaurant-admin', { algorithm: 'HS384' }),
        jwt.sign({ id: owner, role: 'restaurant-admin' }, process.env.JWT_SECRET),
        token('not-an-id')];
    for (const [method, path] of mutations) {
        for (const bearer of credentials) {
            reset();
            assert.equal((await request(method, path, bearer, {})).status, 401, `${method} ${path}`);
            assert.deepEqual(writes, []);
        }
    }
});
test('customer and delivery roles cannot manage restaurants or menus', async () => {
    for (const role of ['customer', 'delivery-personnel']) {
        for (const [method, path] of mutations.slice(0, 6)) {
            reset();
            assert.equal((await request(method, path, token(owner, role), {})).status, 403);
            assert.deepEqual(writes, []);
        }
    }
});
test('other owners and unassigned legacy restaurants reject all existing-resource mutations', async () => {
    for (const legacy of [false, true]) {
        for (const [method, path] of mutations.slice(1, 6)) {
            reset();
            if (legacy) delete restaurant.owner;
            assert.equal((await request(method, path, token(other), {})).status, 403);
            assert.deepEqual(writes, []);
        }
    }
});
test('owner can create, update and delete restaurant/menu resources', async () => {
    const body = { name: 'Test', cuisine: 'Test', image: 'https://example.com/a.jpg',
        images: ['https://example.com/a.jpg'], category: 'Main', price: 10, deliveryTime: 20,
        minOrder: 0, location: { type: 'Point', coordinates: [80, 7] } };
    for (const [method, path] of mutations.slice(0, 6)) {
        reset();
        const result = await request(method, path, token(), body);
        assert.equal(result.status, method === 'POST' ? 201 : 200, `${method} ${path}`);
        assert.ok(writes.length > 0);
    }
});
test('create binds owner to token; updates cannot overwrite ownership, IDs or menu membership', async () => {
    reset();
    await request('POST', '/restaurants', token(), { name: 'Test', owner: other, _id: other, menuItems: [other] });
    assert.equal(writes[0].owner.toString(), owner);
    assert.notEqual(writes[0]._id.toString(), other);
    assert.deepEqual(writes[0].menuItems, []);
    reset();
    const result = await request('PUT', `/restaurants/${rid}`, token(), {
        name: 'Updated', owner: other, 'owner.id': other, $set: { owner: other }, menuItems: [other], _id: other
    });
    assert.equal(result.status, 200);
    assert.deepEqual(writes[0], { name: 'Updated', rating: 0 });
});
test('rating/comment authors come from verified identity, never body userId', async () => {
    reset();
    assert.equal((await request('POST', `/restaurants/${rid}/menu-items/${mid}/rate`, token(owner, 'customer'),
        { rating: 4, userId: other })).status, 200);
    assert.equal(item.ratings[0].user, owner);
    await request('POST', `/restaurants/${rid}/menu-items/${mid}/rate`, token(owner, 'customer'), { rating: 5 });
    assert.equal(item.ratings.length, 1);
    assert.equal(item.ratings[0].value, 5);
    assert.equal((await request('POST', `/restaurants/${rid}/menu-items/${mid}/comments`, token(owner, 'customer'),
        { text: 'Good meal', userId: other })).status, 200);
    assert.equal(item.comments[0].user, owner);
});
test('public catalogue reads stay available without a token', async () => {
    for (const path of ['/restaurants', `/restaurants/${rid}`, '/cuisines', '/menu-items',
        `/menu-items/${mid}`, `/restaurants/${rid}/menu-items`, `/restaurants/${rid}/menu-items/${mid}/comments`]) {
        reset();
        assert.equal((await request('GET', path)).status, 200, path);
        assert.deepEqual(writes, []);
    }
});
test('missing signing configuration fails closed', async () => {
    reset();
    const bearer = token();
    const secret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
        assert.equal((await request('POST', '/restaurants', bearer, {})).status, 503);
        assert.deepEqual(writes, []);
    } finally { process.env.JWT_SECRET = secret; }
});

test('public serialization hides ownership and individual rating history', () => {
    const restaurant = new Restaurant({ name: 'Test', owner });
    const menu = new MenuItem({ name: 'Meal', ratings: [{ user: owner, value: 4 }], rating: 4 });
    assert.equal(restaurant.toJSON().owner, undefined);
    assert.equal(restaurant.toObject().owner, undefined);
    assert.equal(menu.toJSON().ratings, undefined);
    assert.equal(menu.toObject().ratings, undefined);
    assert.equal(menu.toJSON().rating, 4);
});

test('invalid and missing resources are rejected without writes', async () => {
    reset();
    assert.equal((await request('PUT', '/restaurants/not-an-id', token(), {})).status, 400);
    assert.equal((await request('DELETE', '/menu-items/not-an-id', token())).status, 400);
    restaurant = null;
    assert.equal((await request('PUT', `/restaurants/${rid}`, token(), {})).status, 404);
    reset();
    item = null;
    assert.equal((await request('DELETE', `/menu-items/${mid}`, token())).status, 404);
    assert.deepEqual(writes, []);
});

test('caller-supplied identity headers do not authenticate a request', async () => {
    reset();
    const response = await fetch(base + '/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': owner, 'x-user-role': 'restaurant-admin' },
        body: '{}'
    });
    await response.json();
    assert.equal(response.status, 401);
    assert.deepEqual(writes, []);
});
