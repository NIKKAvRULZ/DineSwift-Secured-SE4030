const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validate, safeWriteError } = require('../middleware/validatePayload');
const restaurant = { name: ' Cafe ', cuisine: 'Local', image: 'https://example.com/a.jpg',
    deliveryTime: 30, minOrder: 0, location: { type: 'Point', coordinates: [80, 7] } };
const menu = { name: 'Meal', category: 'Main', price: 10, images: ['https://example.com/a.jpg'] };

test('strict restaurant types, ranges, nested allow-lists and required fields', () => {
    const invalid = [null, [], 'text', {}, ...Object.keys(restaurant).map(key => {
        const body = { ...restaurant }; delete body[key]; return body;
    }), ...[
        {name: ' '}, {name: 42}, {name: 'x'.repeat(201)}, {cuisine: {$gt: ''}},
        {deliveryTime: '30'}, {deliveryTime: -1}, {minOrder: Infinity}, {minOrder: null},
        {rating: 6}, {rating: NaN}, {isOpen: 'false'}, {owner: 'other'},
        {address: {city: {$ne: ''}}}, {address: {owner: 'other'}},
        {location: {type: 'Point', coordinates: [181, 0]}},
        {location: {type: 'Point', coordinates: [0, -91]}},
        {location: {type: 'Point', coordinates: [0, 0, 0]}},
        {location: {type: 'Point', coordinates: ['80', 7]}},
        {location: {type: 'LineString', coordinates: [80, 7]}},
        {location: {type: 'Point', coordinates: [80, 7], $set: {owner: 'other'}}},
        {operatingHours: {monday: {open: '25:00', close: '20:00'}}},
        {operatingHours: {monday: {open: '', close: '20:00'}}},
        {operatingHours: {monday: {open: '09:00'}}},
        {operatingHours: {unknown: {open: '09:00', close: '20:00'}}},
        {operatingHours: {monday: {open: '09:00', close: '20:00', owner: 'other'}}},
        JSON.parse('{"__proto__":{"admin":true}}')
    ].map(change => ({...restaurant, ...change}))];
    for (const body of invalid) assert.throws(() => validate(body, 'restaurant', false));
    assert.equal({}.admin, undefined);
});
test('image URLs reject script/data/file schemes and credential-bearing URLs', () => {
    for (const image of ['javascript:alert(1)', 'data:image/png;base64,AAAA', 'file:///tmp/image',
        'https://user:password@example.com/x', 'not-a-url', '', 42]) {
        assert.throws(() => validate({...restaurant, image}, 'restaurant', false));
        assert.throws(() => validate({...menu, images: [image]}, 'menu', false));
    }
});
test('menu fields cannot overwrite ratings, relationships or accept invalid values', () => {
    for (const change of [{price: -1}, {price: '10'}, {price: NaN}, {discount: 101}, {discount: -1},
        {isSpicy: 1}, {description: {}}, {images: []}, {images: Array(6).fill('https://example.com/a')},
        {images: 'https://example.com/a'}, {rating: 5}, {ratingCount: 10}, {comments: []},
        {restaurantId: 'other'}, {$set: {price: 0}}, {image: 'https://example.com/different'}]) {
        for (const update of [false, true]) assert.throws(() => validate({...menu, ...change}, 'menu', update));
    }
    assert.throws(() => validate({name: 'Meal', category: 'Main', price: 1}, 'menu', false));
    assert.throws(() => validate({price: 1}, 'menu', true));
});
test('valid forms, zero values, closed/overnight hours and partial restaurant updates are preserved', () => {
    const body = {...restaurant, isOpen: false, rating: 0, address: {street: '', city: 'Colombo'},
        operatingHours: {monday: {open: '', close: ''}, tuesday: {open: '22:00', close: '02:00'}}};
    const result = validate(body, 'restaurant', false);
    assert.equal(result.name, 'Cafe');
    assert.equal(result.isOpen, false);
    assert.deepEqual(validate({isOpen: false}, 'restaurant', true), {isOpen: false});
    assert.equal(validate({...menu, price: 0, discount: 100}, 'menu', false).price, 0);
    assert.deepEqual(validate({name: 'Meal', category: 'Main', price: 1}, 'menu', true),
        {name: 'Meal', category: 'Main', price: 1});
    assert.deepEqual(body.name, ' Cafe ');
});
test('Mongoose validation failures and unexpected write errors do not disclose internals', () => {
    for (const name of ['ValidationError', 'CastError', 'StrictModeError', 'MongoServerError']) {
        let code, body;
        const res = {status(value) {code = value; return this;}, json(value) {body = value;}};
        safeWriteError({name, message: 'private database details', stack: 'secret stack'}, res);
        assert.equal(code, name === 'MongoServerError' ? 500 : 400);
        assert.equal(JSON.stringify(body).includes('private'), false);
        assert.equal(body.stack, undefined);
    }
});
