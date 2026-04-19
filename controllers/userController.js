const { getPool, sql } = require('../config/dbConfig');

const userController = {
  // Get user dashboard data
  getDashboard: async (req, res) => {
    try {
      const userId = req.user.UserID;
      const pool = getPool();

      // Get user's active elections
      const electionsResult = await pool.request()
        .input('UserID', sql.Int, userId)
        .query(`
          SELECT e.*, p.PositionName, c.CampusName, vr.Status as RegistrationStatus
          FROM Elections e
          INNER JOIN Positions p ON e.PositionID = p.PositionID
          INNER JOIN Campuses c ON e.CampusID = c.CampusID
          LEFT JOIN Voter_Registration vr ON e.ElectionID = vr.ElectionID AND vr.UserID = @UserID
          WHERE e.CampusID = (SELECT CampusID FROM Users WHERE UserID = @UserID)
          AND e.IsActive = 1
          ORDER BY e.StartDate DESC
        `);

      // Get user's vote history
      const voteHistoryResult = await pool.request()
        .input('UserID', sql.Int, userId)
        .query(`
          SELECT v.*, e.Title, c.Name as CandidateName
          FROM Votes v
          INNER JOIN Elections e ON v.ElectionID = e.ElectionID
          INNER JOIN Candidates cand ON v.CandidateID = cand.CandidateID
          INNER JOIN Users c ON cand.UserID = c.UserID
          WHERE v.VoterToken IN (
            SELECT VoterToken FROM Voter_Registration WHERE UserID = @UserID
          )
          ORDER BY v.VotedAt DESC
        `);

      res.json({
        success: true,
        dashboard: {
          elections: electionsResult.recordset,
          voteHistory: voteHistoryResult.recordset
        }
      });
    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Register for an election
  registerForElection: async (req, res) => {
    try {
      const { electionId } = req.body;
      const userId = req.user.UserID;
      const pool = getPool();

      // Check if already registered
      const existingRegistration = await pool.request()
        .input('UserID', sql.Int, userId)
        .input('ElectionID', sql.Int, electionId)
        .query('SELECT * FROM Voter_Registration WHERE UserID = @UserID AND ElectionID = @ElectionID');

      if (existingRegistration.recordset.length > 0) {
        return res.status(400).json({ error: 'Already registered for this election' });
      }

      // Generate voter token
      const voterToken = `VOTE-${userId}-${electionId}-${Date.now()}`;

      // Register voter
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('ElectionID', sql.Int, electionId)
        .input('VoterToken', sql.VarChar, voterToken)
        .input('Status', sql.VarChar, 'Pending')
        .query(`
          INSERT INTO Voter_Registration (UserID, ElectionID, VoterToken, Status)
          VALUES (@UserID, @ElectionID, @VoterToken, @Status)
        `);

      res.json({ success: true, message: 'Registration submitted for approval' });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = userController;