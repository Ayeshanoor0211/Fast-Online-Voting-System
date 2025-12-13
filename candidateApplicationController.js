const { getPool, sql } = require('../config/dbConfig');


// Apply as candidate for an election
const applyAsCandidate = async (req, res) => {
  try {
    const { electionId, symbol, manifesto } = req.body;
    const userId = req.user.UserID;
    const pool = getPool();

    // Validate input
    if (!electionId || !symbol || !manifesto) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if election exists and is active
    const electionResult = await pool.request()
      .input('ElectionID', sql.Int, electionId)
      .query(`
        SELECT e.*, e.EligibleVoters
        FROM Elections e
        WHERE e.ElectionID = @ElectionID
        AND e.IsActive = 1
        AND GETDATE() < e.EndDate
      `);

    if (electionResult.recordset.length === 0) {
      return res.status(400).json({ error: 'Election not found or not accepting applications' });
    }

    const election = electionResult.recordset[0];

    // Check if user's role matches eligible voters
    const userRole = req.user.Role;
    const rawEligibleVoters = String(election.EligibleVoters || '').trim();

    // Split by comma and trim each option, then convert to lowercase for comparison
    const eligibleOptions = rawEligibleVoters.split(',').map(option => option.trim().toLowerCase());

    // Check if 'all' is explicitly in the options
    const isEligibleForAll = eligibleOptions.includes('all');

    // Check if the user's role (lowercase) is in the eligible options
    const isEligibleForRole = eligibleOptions.includes(userRole.toLowerCase());

    if (!isEligibleForAll && !isEligibleForRole) {
      return res.status(403).json({ error: `This election is only for ${election.EligibleVoters} users` });
    }

    // Check if user already applied
    const existingApplication = await pool.request()
      .input('UserID', sql.Int, userId)
      .input('ElectionID', sql.Int, electionId)
      .query(`
        SELECT * FROM Candidate_Applications
        WHERE UserID = @UserID AND ElectionID = @ElectionID
      `);

    if (existingApplication.recordset.length > 0) {
      return res.status(400).json({ error: 'You have already applied for this election' });
    }

    // Create application
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('ElectionID', sql.Int, electionId)
      .input('PositionID', sql.Int, election.PositionID)
      .input('Symbol', sql.NVarChar, symbol)
      .input('Manifesto', sql.NVarChar, manifesto)
      .query(`
        INSERT INTO Candidate_Applications (UserID, ElectionID, PositionID, Symbol, Manifesto, Status)
        VALUES (@UserID, @ElectionID, @PositionID, @Symbol, @Manifesto, 'Pending')
      `);

    res.json({ success: true, message: 'Application submitted successfully. Waiting for admin approval.' });
  } catch (error) {
    console.error('Apply as candidate error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's candidate applications
const getUserApplications = async (req, res) => {
  try {
    const userId = req.user.UserID;
    const pool = getPool();

    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT ca.*, e.Title as ElectionTitle, e.StartDate, e.EndDate,
               c.CampusName, p.PositionName,
               u.Name as ReviewerName
        FROM Candidate_Applications ca
        INNER JOIN Elections e ON ca.ElectionID = e.ElectionID
        INNER JOIN Campuses c ON e.CampusID = c.CampusID
        INNER JOIN Positions p ON e.PositionID = p.PositionID
        LEFT JOIN Users u ON ca.ReviewedBy = u.UserID
        WHERE ca.UserID = @UserID
        ORDER BY ca.ApplicationDate DESC
      `);

    res.json({ success: true, applications: result.recordset });
  } catch (error) {
    console.error('Get user applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Check if user has applied for specific election
const checkApplicationStatus = async (req, res) => {
  try {
    const { electionId } = req.params;
    const userId = req.user.UserID;
    const pool = getPool();

    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .input('ElectionID', sql.Int, electionId)
      .query(`
        SELECT * FROM Candidate_Applications
        WHERE UserID = @UserID AND ElectionID = @ElectionID
      `);

    if (result.recordset.length > 0) {
      res.json({ applied: true, application: result.recordset[0] });
    } else {
      res.json({ applied: false });
    }
  } catch (error) {
    console.error('Check application status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  applyAsCandidate,
  getUserApplications,
  checkApplicationStatus
};
