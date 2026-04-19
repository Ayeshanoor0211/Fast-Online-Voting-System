const express = require('express');
const router = express.Router();
const voteController = require('../controllers/voteController');

// 1. Register for Vote
router.post('/register', voteController.registerVoter);

// 2. Cast Vote
router.post('/cast', voteController.castVote);

// 3. Get Vote Count (Ye zaroori hai Dashboard ke liye)
router.get('/count/:userId', voteController.getVoteCount);

module.exports = router;