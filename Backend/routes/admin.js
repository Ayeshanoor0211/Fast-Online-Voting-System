const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole(['Admin']));

// Admin routes
router.get('/dashboard-stats', adminController.getDashboardStats);
router.post('/create-election', adminController.createElection);
router.post('/manage-registration', adminController.manageVoterRegistration);
router.post('/add-candidate', adminController.addCandidate);
router.get('/users', adminController.getAllUsers);

module.exports = router;