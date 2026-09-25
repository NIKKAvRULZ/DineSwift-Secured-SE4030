const express = require('express');
const router = express.Router();
const { authenticateToken, requireRestaurantAdmin, requireOwner } = require('../middleware/authMiddleware');
const restaurantOwner = [authenticateToken, requireRestaurantAdmin, requireOwner('restaurant')];
const menuOwner = [authenticateToken, requireRestaurantAdmin, requireOwner('menu')];
const {
    getAllRestaurants,
    addRestaurant,
    getRestaurant,
    updateRestaurant,
    deleteRestaurant,
    findNearbyRestaurants,
    getCuisineTypes
} = require('../controllers/restaurantController');

const {
    getAllMenuItems,
    getRestaurantMenuItems,
    getMenuItem,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    rateMenuItem,
    addComment,
    getComments
} = require('../controllers/menuItemController');

const mongoose = require('mongoose');

// Enhanced health check endpoint for connectivity testing
router.get('/health', (req, res) => {
    try {
        // Check database connection through mongoose
        const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        
        // Return detailed health status
        res.status(200).json({ 
            status: 'ok', 
            message: 'Server is running',
            timestamp: new Date().toISOString(),
            database: dbStatus,
            version: '1.0.0'
        });
    } catch (error) {
        // Still return 200 to show the server is up, even if some components have issues
        res.status(200).json({ 
            status: 'degraded',
            message: 'Server is running with issues',
            error: error.message
        });
    }
});

// Simple ping endpoint (very lightweight) - no database check
router.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

// Restaurant routes
router.get('/restaurants', getAllRestaurants);
router.get('/cuisines', getCuisineTypes);
router.post('/restaurants', authenticateToken, requireRestaurantAdmin, addRestaurant);
router.get('/restaurants/:id', getRestaurant);
router.put('/restaurants/:id', restaurantOwner, updateRestaurant);
router.delete('/restaurants/:id', restaurantOwner, deleteRestaurant);

// Error handling middleware specifically for image URL issues
const handleImageUrlErrors = (err, req, res, next) => {
    if (err.message && err.message.includes('Invalid URL')) {
        return res.status(400).json({ 
            error: 'Invalid image URL provided. Please check the URL format.' 
        });
    }
    next(err);
};

router.use(handleImageUrlErrors);

// Menu item routes with proper error catching
router.post('/restaurants/:restaurantId/menu-items', restaurantOwner, (req, res, next) => {
    try {
        // Validate image URLs if present
        if (req.body.image) {
            // Basic URL validation
            new URL(req.body.image);
        }
        if (req.body.images && Array.isArray(req.body.images)) {
            req.body.images.forEach(url => {
                if (url) new URL(url);
            });
        }
        addMenuItem(req, res, next);
    } catch (error) {
        next(error);
    }
});

// Menu item routes
router.get('/menu-items', getAllMenuItems);
router.get('/restaurants/:restaurantId/menu-items', getRestaurantMenuItems);
router.get('/menu-items/:id', getMenuItem);
router.put('/menu-items/:id', menuOwner, updateMenuItem);
router.delete('/menu-items/:id', menuOwner, deleteMenuItem);

// Rating and comment routes
router.post('/restaurants/:restaurantId/menu-items/:id/rate', authenticateToken, rateMenuItem);
router.post('/restaurants/:restaurantId/menu-items/:id/comments', authenticateToken, addComment);
router.get('/restaurants/:restaurantId/menu-items/:id/comments', getComments);

module.exports = router;
