const jwt = require('jsonwebtoken');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');

function authenticateToken(req, res, next) {
    const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || '');
    if (!match) return res.status(401).json({ message: 'Authentication required' });
    if (!process.env.JWT_SECRET) {
        return res.status(503).json({ message: 'Authentication unavailable' });
    }
    try {
        const user = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
        if (!user || typeof user.id !== 'string' || !/^[a-f\d]{24}$/i.test(user.id) ||
            !Number.isInteger(user.exp)) throw new Error('Invalid identity');
        req.user = user;
        return next();
    } catch {
        return res.status(401).json({ message: 'Invalid or expired access token' });
    }
}

function requireRestaurantAdmin(req, res, next) {
    if (req.user?.role !== 'restaurant-admin') {
        return res.status(403).json({ message: 'Restaurant administrator access required' });
    }
    return next();
}

function requireOwner(resource) {
    return async (req, res, next) => {
        try {
            let restaurantId = req.params.restaurantId || req.params.id;
            if (!/^[a-f\d]{24}$/i.test(restaurantId || '')) {
                return res.status(400).json({ message: 'Invalid resource ID' });
            }
            if (resource === 'menu') {
                const item = await MenuItem.findById(req.params.id).select('restaurantId');
                if (!item) return res.status(404).json({ message: 'Menu item not found' });
                restaurantId = item.restaurantId;
            }
            const restaurant = await Restaurant.findById(restaurantId).select('+owner');
            if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
            // Legacy records remain read-only until a trusted operator assigns an owner.
            if (!restaurant.owner || restaurant.owner.toString() !== req.user.id) {
                return res.status(403).json({ message: 'You do not own this restaurant' });
            }
            return next();
        } catch (error) {
            return next(error);
        }
    };
}

module.exports = { authenticateToken, requireRestaurantAdmin, requireOwner };
