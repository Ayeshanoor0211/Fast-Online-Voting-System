const express = require('express');
const router = express.Router();
const electionController = require('../controllers/electionController');
const { authenticateToken } = require('../middleware/authMiddleware');

// --- 1. ADMIN ROUTES (Election Create Karna) ---
// Ye route missing tha jiski wajah se error aa raha tha
router.post('/create', electionController.createElection);

// --- 2. STUDENT/PUBLIC ROUTES ---
router.get('/', electionController.getAllElections); // Saare elections (History wagera)
router.get('/active', electionController.getActiveElections); // Sirf Active elections (Dashboard ke liye)

// Dropdowns ke liye data
router.get('/campuses', electionController.getCampuses);
router.get('/departments', electionController.getDepartments);
router.get('/campuses/:campusId/departments', electionController.getDepartmentsByCampus);

// Filters
router.get('/campus/:campusId', electionController.getElectionsByCampus);
router.get('/:electionId', electionController.getElectionDetails);

// --- 3. PROTECTED ROUTES (Login Zaroori Hai) ---
// Check karna ke user registered hai ya nahi
router.get(
  '/:electionId/check-registration',
  authenticateToken,
  electionController.checkVoterRegistration
);

module.exports = router;