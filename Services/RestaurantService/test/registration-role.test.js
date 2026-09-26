const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

// Exercise the real registration controller without connecting to UserService's DB.
function controller() {
    const saved = [];
    class User {
        constructor(data) { Object.assign(this, data); }
        async save() { saved.push(this); }
    }
    const context = {
        exports: {},
        require(name) {
            if (name === '../models/User') return User;
            if (name === 'bcryptjs') return { hash: async () => 'test-password-hash' };
            if (name === 'jsonwebtoken') return {};
            if (name === '../security/authSession') return { establishSession: (res, user) => ({ name: user.name, role: user.role }) };
            throw new Error(`Unexpected dependency: ${name}`);
        }
    };
    const source = fs.readFileSync(path.join(__dirname, '../../UserService/controllers/authController.js'), 'utf8');
    vm.runInNewContext(source, context);
    return { register: context.exports.register, saved };
}
async function register(role) {
    const { register, saved } = controller();
    const result = { status: 200 };
    const res = {
        status(code) { result.status = code; return this; },
        json(body) { result.body = body; return this; },
        send(body) { result.body = body; return this; }
    };
    await register({ body: { name: 'Test', email: 'test@example.com', password: 'test-only', role } }, res);
    return { ...result, saved };
}
test('public registration rejects privileged and malformed roles without saving a user', async () => {
    for (const role of ['restaurant-admin', 'delivery-personnel', 'admin', {}, ['customer'], null]) {
        const result = await register(role);
        assert.equal(result.status, 400);
        assert.equal(result.saved.length, 0);
    }
});
test('ordinary registration still hashes the password and creates a customer', async () => {
    for (const role of [undefined, 'customer']) {
        const result = await register(role);
        assert.equal(result.status, 201);
        assert.equal(result.saved[0].role, 'customer');
        assert.equal(result.saved[0].password, 'test-password-hash');
    }
});
