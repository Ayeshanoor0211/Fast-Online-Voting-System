const express = require('express');
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Protected routes
router.get('/dashboard', authenticateToken, userController.getDashboard);
router.post('/register-election', authenticateToken, userController.registerForElection);

module.exports = router;