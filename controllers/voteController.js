const { getPool, sql } = require('../config/dbConfig');
const crypto = require('crypto');

const voteController = {
  
  // 1. Register Voter
  registerVoter: async (req, res) => {
    try {
      const pool = getPool();
      const { userId, electionId } = req.body;

      // Check if already registered
      const check = await pool.request()
        .input('UserID', sql.Int, userId)
        .input('ElectionID', sql.Int, electionId)
        .query('SELECT * FROM Voter_Registration WHERE UserID = @UserID AND ElectionID = @ElectionID');

      if (check.recordset.length > 0) {
        return res.status(400).json({ message: 'You are already registered for this election!' });
      }

      // Generate Token
      const voterToken = crypto.randomBytes(16).toString('hex');

      // Insert
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('ElectionID', sql.Int, electionId)
        .input('VoterToken', sql.VarChar, voterToken)
        .query(`
          INSERT INTO Voter_Registration (UserID, ElectionID, VoterToken, Status)
          VALUES (@UserID, @ElectionID, @VoterToken, 'Approved')
        `);

      res.status(200).json({ success: true, message: 'Registration Successful! You can now vote.' });

    } catch (error) {
      console.error('Registration Error:', error);
      res.status(500).json({ message: 'Server Error: ' + error.message });
    }
  },

  // 2. Cast Vote
  castVote: async (req, res) => {
    try {
      const pool = getPool();
      const { userId, electionId, candidateId } = req.body;

      // Step A: Voter Token nikalo
      const registration = await pool.request()
        .input('UserID', sql.Int, userId)
        .input('ElectionID', sql.Int, electionId)
        .query('SELECT VoterToken FROM Voter_Registration WHERE UserID = @UserID AND ElectionID = @ElectionID');

      if (registration.recordset.length === 0) {
        return res.status(403).json({ message: 'You are not registered to vote in this election!' });
      }

      const voterToken = registration.recordset[0].VoterToken;

      // Step B: Check karo pehle vote diya hai ya nahi
      const voteCheck = await pool.request()
        .input('ElectionID', sql.Int, electionId)
        .input('VoterToken', sql.VarChar, voterToken)
        .query('SELECT * FROM Votes WHERE ElectionID = @ElectionID AND VoterToken = @VoterToken');

      if (voteCheck.recordset.length > 0) {
        return res.status(400).json({ message: 'You have ALREADY voted in this election!' });
      }

      // Step C: Vote Save Karo
      await pool.request()
        .input('ElectionID', sql.Int, electionId)
        .input('CandidateID', sql.Int, candidateId)
        .input('VoterToken', sql.VarChar, voterToken)
        .input('IPAddress', sql.VarChar, '127.0.0.1') 
        .query(`
          INSERT INTO Votes (ElectionID, CandidateID, VoterToken, IPAddress)
          VALUES (@ElectionID, @CandidateID, @VoterToken, @IPAddress)
        `);

      res.status(200).json({ success: true, message: 'Vote Cast Successfully! 🎉' });

    } catch (error) {
      console.error('Voting Error:', error);
      res.status(500).json({ message: 'Error: ' + error.message });
    }
  },

  // 3. Get Vote Count for User [NEW ADDITION]
  getVoteCount: async (req, res) => {
    try {
      const { userId } = req.params;
      const pool = getPool();

      // Logic: Votes table ko Voter_Registration se join karo taake UserID mil sake
      const result = await pool.request()
        .input('UserID', sql.Int, userId)
        .query(`
          SELECT COUNT(*) AS count 
          FROM Votes v
          INNER JOIN Voter_Registration vr ON v.VoterToken = vr.VoterToken
          WHERE vr.UserID = @UserID
        `);

      res.json({ success: true, count: result.recordset[0].count });

    } catch (error) {
      console.error('Get vote count error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
};

module.exports = voteController;