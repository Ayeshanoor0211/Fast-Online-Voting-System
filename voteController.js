const { getPool, sql } = require('../config/dbConfig');
const { logAction } = require('../utils/auditLogger');

const voteController = {
  // Check if user has voted and get vote details
  checkVoteStatus: async (req, res) => {
    try {
      const { electionId } = req.params;
      const userId = req.user.UserID;
      const pool = getPool();

      // Get voter registration
      const registrationResult = await pool.request()
        .input('UserID', sql.Int, userId)
        .input('ElectionID', sql.Int, electionId)
        .query(`
          SELECT VoterToken FROM Voter_Registration
          WHERE UserID = @UserID AND ElectionID = @ElectionID AND Status = 'Approved'
        `);

      if (registrationResult.recordset.length === 0) {
        return res.json({ success: true, hasVoted: false });
      }

      const voterToken = registrationResult.recordset[0].VoterToken;

      // Check if user has voted
      const voteResult = await pool.request()
        .input('ElectionID', sql.Int, electionId)
        .input('VoterToken', sql.VarChar, voterToken)
        .query(`
          SELECT v.VoteID, v.VotedAt, c.CandidateID, c.Symbol, c.Manifesto, u.Name as CandidateName
          FROM Votes v
          INNER JOIN Candidates c ON v.CandidateID = c.CandidateID
          INNER JOIN Users u ON c.UserID = u.UserID
          WHERE v.ElectionID = @ElectionID AND v.VoterToken = @VoterToken
        `);

      if (voteResult.recordset.length > 0) {
        const vote = voteResult.recordset[0];
        return res.json({
          success: true,
          hasVoted: true,
          votedFor: {
            candidateName: vote.CandidateName,
            symbol: vote.Symbol,
            manifesto: vote.Manifesto,
            votedAt: vote.VotedAt
          }
        });
      }

      res.json({ success: true, hasVoted: false });
    } catch (error) {
      console.error('Check vote status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  castVote: async (req, res) => {
    try {
      const { electionId } = req.params;
      const { candidateId, voterToken } = req.body;
      const userId = req.user.UserID;
      const ipAddress = req.ip;
      const pool = getPool();

      // 1. Verify the voter token is valid for this user and election
      const registrationResult = await pool.request()
        .input('UserID', sql.Int, userId)
        .input('ElectionID', sql.Int, electionId)
        .input('VoterToken', sql.VarChar, voterToken)
        .query(`
          SELECT * FROM Voter_Registration 
          WHERE UserID = @UserID 
            AND ElectionID = @ElectionID 
            AND VoterToken = @VoterToken
        `);

      const registration = registrationResult.recordset[0];

      if (!registration) {
        await logAction(userId, 'VOTE_CAST_FAILURE', `Vote cast failed. Reason: Invalid voter token.`, ipAddress);
        return res.status(403).json({ error: 'Invalid voter token or you are not registered for this election.' });
      }

      // 2. Check if registration is approved
      if (registration.Status !== 'Approved') {
        await logAction(userId, 'VOTE_CAST_FAILURE', `Vote cast failed. Reason: Voter registration not approved (status: ${registration.Status}).`, ipAddress);
        return res.status(403).json({ error: `Your voter registration status is: ${registration.Status}. You cannot vote.` });
      }

      // 3. Check if the election is currently active
      const electionResult = await pool.request()
        .input('ElectionID', sql.Int, electionId)
        .query('SELECT * FROM Elections WHERE ElectionID = @ElectionID AND GETDATE() BETWEEN StartDate AND EndDate');

      if (electionResult.recordset.length === 0) {
        await logAction(userId, 'VOTE_CAST_FAILURE', `Vote cast failed. Reason: Election ${electionId} is not active.`, ipAddress);
        return res.status(400).json({ error: 'This election is not currently active.' });
      }

      // 4. Insert the vote (The database trigger 'trg_PreventDoubleVote' will handle duplicates)
      await pool.request()
        .input('ElectionID', sql.Int, electionId)
        .input('CandidateID', sql.Int, candidateId)
        .input('VoterToken', sql.VarChar, voterToken)
        .input('IPAddress', sql.VarChar, ipAddress)
        .query(`
          INSERT INTO Votes (ElectionID, CandidateID, VoterToken, IPAddress, VotedAt)
          VALUES (@ElectionID, @CandidateID, @VoterToken, @IPAddress, GETDATE())
        `);

      // The database triggers 'trg_UpdateResults' and 'trg_Audit_Votes' will handle the rest.
      // We keep the application-level failure logs above as they provide more context.

      res.status(201).json({ success: true, message: 'Your vote has been cast successfully!' });

    } catch (error) {
      if (error.number === 2627) { // SQL Server unique constraint violation
        await logAction(req.user.UserID, 'VOTE_CAST_FAILURE', `Vote cast failed. Reason: User has already voted in election ${req.params.electionId}.`, req.ip);
        return res.status(409).json({ error: 'You have already voted in this election.' });
      }
      console.error('Cast vote error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = voteController;