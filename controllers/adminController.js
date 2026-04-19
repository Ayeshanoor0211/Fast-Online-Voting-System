const { getPool, sql } = require('../config/dbConfig');

const adminController = {
  // Get admin dashboard stats
  getDashboardStats: async (req, res) => {
    try {
      const pool = getPool();

      // Get total counts
      const statsResult = await pool.request().query(`
        SELECT 
          (SELECT COUNT(*) FROM Users) as TotalUsers,
          (SELECT COUNT(*) FROM Elections) as TotalElections,
          (SELECT COUNT(*) FROM Votes) as TotalVotes,
          (SELECT COUNT(*) FROM Candidates) as TotalCandidates,
          (SELECT COUNT(*) FROM Users WHERE Role = 'Student') as TotalStudents,
          (SELECT COUNT(*) FROM Users WHERE Role = 'Faculty') as TotalFaculty
      `);

      // Get active elections
      const activeElectionsResult = await pool.request().query(`
        SELECT e.*, p.PositionName, c.CampusName,
               (SELECT COUNT(*) FROM Votes WHERE ElectionID = e.ElectionID) as VotesCast
        FROM Elections e
        INNER JOIN Positions p ON e.PositionID = p.PositionID
        INNER JOIN Campuses c ON e.CampusID = c.CampusID
        WHERE e.IsActive = 1 AND GETDATE() BETWEEN e.StartDate AND e.EndDate
      `);

      // Get pending voter registrations
      const pendingRegistrationsResult = await pool.request().query(`
        SELECT vr.*, u.Name, u.Email, e.Title as ElectionTitle
        FROM Voter_Registration vr
        INNER JOIN Users u ON vr.UserID = u.UserID
        INNER JOIN Elections e ON vr.ElectionID = e.ElectionID
        WHERE vr.Status = 'Pending'
        ORDER BY vr.RegistrationDate DESC
      `);

      res.json({
        success: true,
        stats: statsResult.recordset[0],
        activeElections: activeElectionsResult.recordset,
        pendingRegistrations: pendingRegistrationsResult.recordset
      });
    } catch (error) {
      console.error('Get admin stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Create new election
  createElection: async (req, res) => {
    try {
      const { campusId, positionId, title, description, startDate, endDate } = req.body;
      const pool = getPool();

      const result = await pool.request()
        .input('CampusID', sql.Int, campusId)
        .input('PositionID', sql.Int, positionId)
        .input('Title', sql.NVarChar, title)
        .input('Description', sql.NVarChar, description)
        .input('StartDate', sql.DateTime, startDate)
        .input('EndDate', sql.DateTime, endDate)
        .query(`
          INSERT INTO Elections (CampusID, PositionID, Title, Description, StartDate, EndDate)
          OUTPUT INSERTED.*
          VALUES (@CampusID, @PositionID, @Title, @Description, @StartDate, @EndDate)
        `);

      res.json({
        success: true,
        message: 'Election created successfully',
        election: result.recordset[0]
      });
    } catch (error) {
      console.error('Create election error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Manage voter registrations
  manageVoterRegistration: async (req, res) => {
    try {
      const { registrationId, status, rejectionReason } = req.body;
      const adminId = req.user.UserID;
      const pool = getPool();

      await pool.request()
        .input('RegistrationID', sql.Int, registrationId)
        .input('Status', sql.VarChar, status)
        .input('RejectionReason', sql.NVarChar, rejectionReason)
        .input('VerifiedBy', sql.Int, adminId)
        .query(`
          UPDATE Voter_Registration 
          SET Status = @Status, 
              RejectionReason = @RejectionReason,
              VerifiedBy = @VerifiedBy
          WHERE RegistrationID = @RegistrationID
        `);

      res.json({
        success: true,
        message: `Voter registration ${status.toLowerCase()} successfully`
      });
    } catch (error) {
      console.error('Manage voter registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Add candidate to election
  addCandidate: async (req, res) => {
    try {
      const { electionId, userId, symbol, manifesto } = req.body;
      const pool = getPool();

      // Check if user is already a candidate in this election
      const existingCandidate = await pool.request()
        .input('ElectionID', sql.Int, electionId)
        .input('UserID', sql.Int, userId)
        .query('SELECT * FROM Candidates WHERE ElectionID = @ElectionID AND UserID = @UserID');

      if (existingCandidate.recordset.length > 0) {
        return res.status(400).json({ error: 'User is already a candidate in this election' });
      }

      const result = await pool.request()
        .input('ElectionID', sql.Int, electionId)
        .input('UserID', sql.Int, userId)
        .input('Symbol', sql.NVarChar, symbol)
        .input('Manifesto', sql.NVarChar, manifesto)
        .query(`
          INSERT INTO Candidates (ElectionID, UserID, Symbol, Manifesto)
          OUTPUT INSERTED.*
          VALUES (@ElectionID, @UserID, @Symbol, @Manifesto)
        `);

      res.json({
        success: true,
        message: 'Candidate added successfully',
        candidate: result.recordset[0]
      });
    } catch (error) {
      console.error('Add candidate error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get all users for admin
  getAllUsers: async (req, res) => {
    try {
      const pool = getPool();

      const result = await pool.request().query(`
        SELECT u.*, 
               s.RollNumber, s.Batch, s.Semester,
               f.Designation,
               m.Position AS ManagementPosition, m.Responsibility,
               a.AccessLevel,
               c.CampusName,
               d.DeptName
        FROM Users u
        LEFT JOIN Student_Details s ON u.UserID = s.UserID
        LEFT JOIN Faculty_Details f ON u.UserID = f.UserID
        LEFT JOIN Management_Details m ON u.UserID = m.UserID
        LEFT JOIN Admin_Details a ON u.UserID = a.UserID
        INNER JOIN Campuses c ON u.CampusID = c.CampusID
        LEFT JOIN Departments d ON u.DepartmentID = d.DepartmentID
        ORDER BY u.CreatedAt DESC
      `);

      res.json({ success: true, users: result.recordset });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = adminController;