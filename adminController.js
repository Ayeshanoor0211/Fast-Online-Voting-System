const { getPool, sql } = require('../config/dbConfig');
const crypto = require('crypto');
const { createNotification } = require('./notificationController');
const { logAction } = require('../utils/auditLogger');

const adminController = {
  // Get admin dashboard stats
  getDashboardStats: async (req, res) => {
    let statsResult, activeElectionsResult, pendingRegistrationsResult;
    const pool = getPool();

    try {
      statsResult = await pool.request().query(`
        SELECT 
          (SELECT COUNT(*) FROM Users) as TotalUsers,
          (SELECT COUNT(*) FROM Elections) as TotalElections,
          (SELECT COUNT(*) FROM Votes) as TotalVotes,
          (SELECT COUNT(*) FROM Candidates) as TotalCandidates,
          (SELECT COUNT(*) FROM Users WHERE Role = 'Student') as TotalStudents,
          (SELECT COUNT(*) FROM Users WHERE Role = 'Faculty') as TotalFaculty
      `);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      statsResult = { recordset: [{ TotalUsers: 0, TotalElections: 0, TotalVotes: 0, TotalCandidates: 0, TotalStudents: 0, TotalFaculty: 0 }] };
    }

    try {
      activeElectionsResult = await pool.request().query(`
        SELECT e.*, p.PositionName, c.CampusName,
               (SELECT COUNT(*) FROM Votes WHERE ElectionID = e.ElectionID) as VotesCast,
               (SELECT COUNT(*) FROM Voter_Registration WHERE ElectionID = e.ElectionID AND Status = 'Approved') as RegisteredVoters
        FROM Elections e
        INNER JOIN Positions p ON e.PositionID = p.PositionID
        INNER JOIN Campuses c ON e.CampusID = c.CampusID
        WHERE e.IsActive = 1 AND GETDATE() BETWEEN e.StartDate AND e.EndDate
      `);
    } catch (error) {
      console.error('Error fetching active elections:', error);
      activeElectionsResult = { recordset: [] };
    }

    try {
      pendingRegistrationsResult = await pool.request().query(`
        SELECT vr.*, u.Name, u.Email, e.Title as ElectionTitle
        FROM Voter_Registration vr
        INNER JOIN Users u ON vr.UserID = u.UserID
        INNER JOIN Elections e ON vr.ElectionID = e.ElectionID
        WHERE vr.Status = 'Pending'
        ORDER BY vr.RegistrationDate DESC
      `);
    } catch (error) {
      console.error('Error fetching pending registrations:', error);
      pendingRegistrationsResult = { recordset: [] };
    }

    res.json({
      success: true,
      stats: statsResult.recordset[0],
      activeElections: activeElectionsResult.recordset,
      pendingRegistrations: pendingRegistrationsResult.recordset
    });
  },

  // Create new election
  createElection: async (req, res) => {
    try {
      const { campusId, positionId, title, description, startDate, endDate, eligibleVoters } = req.body;
      const pool = getPool();

      // Insert without OUTPUT clause due to potential trigger conflicts
      await pool.request()
        .input('CampusID', sql.Int, campusId)
        .input('PositionID', sql.Int, positionId)
        .input('Title', sql.NVarChar, title)
        .input('Description', sql.NVarChar, description)
        .input('StartDate', sql.DateTime, startDate)
        .input('EndDate', sql.DateTime, endDate)
        .input('EligibleVoters', sql.NVarChar, eligibleVoters || 'All')
        .query(`
          INSERT INTO Elections (CampusID, PositionID, Title, Description, StartDate, EndDate, EligibleVoters)
          VALUES (@CampusID, @PositionID, @Title, @Description, @StartDate, @EndDate, @EligibleVoters)
        `);

      // Retrieve the inserted election
      const electionResult = await pool.request()
        .input('Title', sql.NVarChar, title)
        .query(`
          SELECT TOP 1 * FROM Elections
          WHERE Title = @Title
          ORDER BY CreatedAt DESC
        `);

      const election = electionResult.recordset[0];
      await logAction(req.user.UserID, 'CREATE_ELECTION', `Admin created election "${title}" (ID: ${election.ElectionID}).`, req.ip);

      res.json({
        success: true,
        message: 'Election created successfully',
        election
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

      let voterToken = null;
      if (status === 'Approved') {
        voterToken = crypto.randomBytes(32).toString('hex');
      }

      const result = await pool.request()
        .input('RegistrationID', sql.Int, registrationId)
        .input('Status', sql.VarChar, status)
        .input('RejectionReason', sql.NVarChar, rejectionReason)
        .input('VerifiedBy', sql.Int, adminId)
        .input('VoterToken', sql.VarChar, voterToken)
        .query(`
          UPDATE Voter_Registration 
          SET Status = @Status, 
              RejectionReason = @RejectionReason,
              VerifiedBy = @VerifiedBy,
              VoterToken = @VoterToken
          OUTPUT INSERTED.UserID, INSERTED.ElectionID
          WHERE RegistrationID = @RegistrationID
        `);
      
      const { UserID, ElectionID } = result.recordset[0];

      // Log action
      await logAction(adminId, 'MANAGE_VOTER_REGISTRATION', `Admin ${status.toLowerCase()} registration ID ${registrationId} for user ${UserID}. Reason: ${rejectionReason || 'N/A'}`, req.ip);

      // Create a notification for the user
      const electionInfo = await pool.request().input('ElectionID', sql.Int, ElectionID).query('SELECT Title FROM Elections WHERE ElectionID = @ElectionID');
      const electionTitle = electionInfo.recordset[0].Title;
      let message;
      if (status === 'Approved') {
        message = `Your voter registration for the election "${electionTitle}" has been approved. You can now vote.`;
      } else {
        message = `Your voter registration for the election "${electionTitle}" has been rejected. Reason: ${rejectionReason}`;
      }
      await createNotification(UserID, 'Voter Registration', message);

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

      // Insert without OUTPUT clause due to trigger on Candidates table
      await pool.request()
        .input('ElectionID', sql.Int, electionId)
        .input('UserID', sql.Int, userId)
        .input('Symbol', sql.NVarChar, symbol)
        .input('Manifesto', sql.NVarChar, manifesto)
        .query(`
          INSERT INTO Candidates (ElectionID, UserID, Symbol, Manifesto)
          VALUES (@ElectionID, @UserID, @Symbol, @Manifesto)
        `);

      // Retrieve the inserted candidate
      const candidateResult = await pool.request()
        .input('ElectionID', sql.Int, electionId)
        .input('UserID', sql.Int, userId)
        .query(`
          SELECT * FROM Candidates
          WHERE ElectionID = @ElectionID AND UserID = @UserID
        `);

      const candidate = candidateResult.recordset[0];
      await logAction(req.user.UserID, 'ADD_CANDIDATE', `Admin added user ${userId} as a candidate (ID: ${candidate.CandidateID}) to election ${electionId}.`, req.ip);

      res.json({
        success: true,
        message: 'Candidate added successfully',
        candidate
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
  },

  // Create a new position
  createPosition: async (req, res) => {
    try {
      const { positionName, electionType, eligibilityCriteria, termYears } = req.body;
      const pool = getPool();

      // Insert without OUTPUT clause
      await pool.request()
        .input('PositionName', sql.VarChar, positionName)
        .input('ElectionType', sql.VarChar, electionType)
        .input('EligibilityCriteria', sql.NVarChar, eligibilityCriteria)
        .input('TermYears', sql.Int, termYears)
        .query(`
          INSERT INTO Positions (PositionName, ElectionType, EligibilityCriteria, TermYears)
          VALUES (@PositionName, @ElectionType, @EligibilityCriteria, @TermYears)
        `);

      // Retrieve the inserted position
      const positionResult = await pool.request()
        .input('PositionName', sql.VarChar, positionName)
        .query(`
          SELECT TOP 1 * FROM Positions
          WHERE PositionName = @PositionName
          ORDER BY PositionID DESC
        `);

      const position = positionResult.recordset[0];
      await logAction(req.user.UserID, 'CREATE_POSITION', `Admin created position "${positionName}" (ID: ${position.PositionID}).`, req.ip);

      res.status(201).json({
        success: true,
        message: 'Position created successfully',
        position
      });
    } catch (error) {
      console.error('Create position error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get all elections with detailed info
  getAllElections: async (req, res) => {
    try {
      const pool = getPool();
      const result = await pool.request().query(`
        SELECT e.*, p.PositionName, c.CampusName,
               (SELECT COUNT(*) FROM Candidates WHERE ElectionID = e.ElectionID) as CandidateCount,
               (SELECT COUNT(*) FROM Votes WHERE ElectionID = e.ElectionID) as VoteCount,
               (SELECT COUNT(*) FROM Voter_Registration WHERE ElectionID = e.ElectionID AND Status = 'Approved') as RegisteredVoters
        FROM Elections e
        INNER JOIN Positions p ON e.PositionID = p.PositionID
        INNER JOIN Campuses c ON e.CampusID = c.CampusID
        ORDER BY e.CreatedAt DESC
      `);

      res.json({ success: true, elections: result.recordset });
    } catch (error) {
      console.error('Get all elections error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get candidates for an election
  getCandidatesForElection: async (req, res) => {
    try {
      const { electionId } = req.params;
      const pool = getPool();

      const result = await pool.request()
        .input('ElectionID', sql.Int, electionId)
                  .query(`
                    SELECT c.*, u.Name, u.Email, u.Role,
                           COALESCE(r.TotalVotes, 0) as VoteCount,
                           s.RollNumber, s.Batch,
                           f.Designation
                    FROM Candidates c
                    INNER JOIN Users u ON c.UserID = u.UserID
                    LEFT JOIN Results r ON c.CandidateID = r.CandidateID
                                        LEFT JOIN Student_Details s ON u.UserID = s.UserID
                                        LEFT JOIN Faculty_Details f ON u.UserID = f.UserID                    WHERE c.ElectionID = @ElectionID
                    ORDER BY VoteCount DESC
                  `);

      res.json({ success: true, candidates: result.recordset });
    } catch (error) {
      console.error('Get candidates error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get election results with winner
  getElectionResults: async (req, res) => {
    try {
      const { electionId } = req.params;
      const pool = getPool();

      // Get election info
      const electionResult = await pool.request()
        .input('ElectionID', sql.Int, electionId)
        .query(`
          SELECT e.*, p.PositionName, c.CampusName
          FROM Elections e
          INNER JOIN Positions p ON e.PositionID = p.PositionID
          INNER JOIN Campuses c ON e.CampusID = c.CampusID
          WHERE e.ElectionID = @ElectionID
        `);

      if (electionResult.recordset.length === 0) {
        return res.status(404).json({ error: 'Election not found' });
      }

      // Get results with candidates
      const resultsResult = await pool.request()
        .input('ElectionID', sql.Int, electionId)
        .query(`
          SELECT c.*, u.Name, u.Email,
                 COALESCE(r.TotalVotes, 0) as VoteCount,
                 s.RollNumber, s.Batch,
                 f.Designation
          FROM Candidates c
          INNER JOIN Users u ON c.UserID = u.UserID
          LEFT JOIN Results r ON c.CandidateID = r.CandidateID
          LEFT JOIN Student_Details s ON u.UserID = s.UserID
          LEFT JOIN Faculty_Details f ON u.UserID = f.UserID
          WHERE c.ElectionID = @ElectionID
          ORDER BY VoteCount DESC
        `);

      // Calculate total votes
      const totalVotes = resultsResult.recordset.reduce((sum, candidate) => sum + candidate.VoteCount, 0);

      // Determine winner(s)
      const maxVotes = resultsResult.recordset.length > 0 ? resultsResult.recordset[0].VoteCount : 0;
      const winners = resultsResult.recordset.filter(c => c.VoteCount === maxVotes && maxVotes > 0);

      res.json({
        success: true,
        election: electionResult.recordset[0],
        results: resultsResult.recordset.map(candidate => ({
          ...candidate,
          percentage: totalVotes > 0 ? ((candidate.VoteCount / totalVotes) * 100).toFixed(2) : 0
        })),
        totalVotes,
        winners: winners.length > 0 ? winners : null
      });
    } catch (error) {
      console.error('Get election results error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update election status (activate/deactivate)
  updateElectionStatus: async (req, res) => {
    try {
      const { electionId, isActive } = req.body;
      const pool = getPool();

      await pool.request()
        .input('ElectionID', sql.Int, electionId)
        .input('IsActive', sql.Bit, isActive)
        .query(`
          UPDATE Elections
          SET IsActive = @IsActive
          WHERE ElectionID = @ElectionID
        `);

      await logAction(req.user.UserID, 'UPDATE_ELECTION_STATUS', `Admin ${isActive ? 'activated' : 'deactivated'} election ID ${electionId}.`, req.ip);

      res.json({
        success: true,
        message: `Election ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Update election status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete candidate
  deleteCandidate: async (req, res) => {
    try {
      const { candidateId } = req.params;
      const pool = getPool();

      // Check if election has started or if there are votes
      const checkResult = await pool.request()
        .input('CandidateID', sql.Int, candidateId)
        .query(`
          SELECT c.ElectionID, e.StartDate,
                 (SELECT COUNT(*) FROM Votes WHERE CandidateID = @CandidateID) as VoteCount
          FROM Candidates c
          INNER JOIN Elections e ON c.ElectionID = e.ElectionID
          WHERE c.CandidateID = @CandidateID
        `);

      if (checkResult.recordset.length === 0) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      const { StartDate, VoteCount } = checkResult.recordset[0];

      if (new Date() >= new Date(StartDate)) {
        return res.status(400).json({ error: 'Cannot delete candidate after election has started' });
      }

      if (VoteCount > 0) {
        return res.status(400).json({ error: 'Cannot delete candidate with existing votes' });
      }

      // Delete candidate
      await pool.request()
        .input('CandidateID', sql.Int, candidateId)
        .query('DELETE FROM Candidates WHERE CandidateID = @CandidateID');

      await logAction(req.user.UserID, 'DELETE_CANDIDATE', `Admin deleted candidate ID ${candidateId}.`, req.ip);

      res.json({
        success: true,
        message: 'Candidate deleted successfully'
      });
    } catch (error) {
      console.error('Delete candidate error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get audit logs
  getAuditLogs: async (req, res) => {
    try {
      const { limit = 100, offset = 0 } = req.query;
      const pool = getPool();

      const result = await pool.request()
        .input('Limit', sql.Int, parseInt(limit))
        .input('Offset', sql.Int, parseInt(offset))
        .query(`
          SELECT a.*, u.Name as UserName, u.Email
          FROM AuditLogs a
          LEFT JOIN Users u ON a.UserID = u.UserID
          ORDER BY a.Timestamp DESC
          OFFSET @Offset ROWS
          FETCH NEXT @Limit ROWS ONLY
        `);

      const countResult = await pool.request()
        .query('SELECT COUNT(*) as Total FROM AuditLogs');

      res.json({
        success: true,
        logs: result.recordset,
        total: countResult.recordset[0].Total
      });
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get all campuses
  getCampuses: async (req, res) => {
    try {
      const pool = getPool();
      const result = await pool.request().query('SELECT * FROM Campuses ORDER BY CampusName');
      res.json({ success: true, campuses: result.recordset });
    } catch (error) {
      console.error('Get campuses error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get all positions
  getPositions: async (req, res) => {
    try {
      const pool = getPool();
      const result = await pool.request().query('SELECT * FROM Positions ORDER BY PositionName');
      res.json({ success: true, positions: result.recordset });
    } catch (error) {
      console.error('Get positions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get all candidate applications
  getCandidateApplications: async (req, res) => {
    try {
      const { status, electionId } = req.query;
      const pool = getPool();

      let query = `
        SELECT ca.*,
               u.Name as ApplicantName, u.Email as ApplicantEmail, u.Role as ApplicantRole,
               e.Title as ElectionTitle,
               c.CampusName,
               p.PositionName,
               reviewer.Name as ReviewerName
        FROM Candidate_Applications ca
        INNER JOIN Users u ON ca.UserID = u.UserID
        INNER JOIN Elections e ON ca.ElectionID = e.ElectionID
        INNER JOIN Campuses c ON e.CampusID = c.CampusID
        INNER JOIN Positions p ON e.PositionID = p.PositionID
        LEFT JOIN Users reviewer ON ca.ReviewedBy = reviewer.UserID
        WHERE 1=1
      `;

      const request = pool.request();

      if (status) {
        query += ' AND ca.Status = @Status';
        request.input('Status', sql.NVarChar, status);
      }

      if (electionId) {
        query += ' AND ca.ElectionID = @ElectionID';
        request.input('ElectionID', sql.Int, electionId);
      }

      query += ' ORDER BY ca.ApplicationDate DESC';

      const result = await request.query(query);

      res.json({ success: true, applications: result.recordset });
    } catch (error) {
      console.error('Get candidate applications error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Review candidate application (Approve/Reject)
  reviewCandidateApplication: async (req, res) => {
    try {
      const { applicationId, status, rejectionReason } = req.body;
      const adminId = req.user.UserID;
      const pool = getPool();

      if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      if (status === 'Rejected' && !rejectionReason) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }

      // Get application details
      const appResult = await pool.request()
        .input('ApplicationID', sql.Int, applicationId)
        .query(`
          SELECT ca.*, e.EligibleVoters, u.Role
          FROM Candidate_Applications ca
          INNER JOIN Elections e ON ca.ElectionID = e.ElectionID
          INNER JOIN Users u ON ca.UserID = u.UserID
          WHERE ca.ApplicationID = @ApplicationID
        `);

      if (appResult.recordset.length === 0) {
        return res.status(404).json({ error: 'Application not found' });
      }

      const application = appResult.recordset[0];

      if (application.Status !== 'Pending') {
        return res.status(400).json({ error: 'Application has already been reviewed' });
      }

      // Check if user's role matches eligible voters
      if (application.EligibleVoters !== 'All' && application.EligibleVoters !== application.Role) {
        return res.status(403).json({ error: `This election is only for ${application.EligibleVoters} users. Application cannot be approved.` });
      }

      // Update application status
      await pool.request()
        .input('ApplicationID', sql.Int, applicationId)
        .input('Status', sql.NVarChar, status)
        .input('RejectionReason', sql.NVarChar, rejectionReason || null)
        .input('ReviewedBy', sql.Int, adminId)
        .query(`
          UPDATE Candidate_Applications
          SET Status = @Status,
              RejectionReason = @RejectionReason,
              ReviewedBy = @ReviewedBy,
              ReviewedAt = GETDATE()
          WHERE ApplicationID = @ApplicationID
        `);

      // If approved, create candidate entry
      if (status === 'Approved') {
        await pool.request()
          .input('ElectionID', sql.Int, application.ElectionID)
          .input('UserID', sql.Int, application.UserID)
          .input('Symbol', sql.NVarChar, application.Symbol)
          .input('Manifesto', sql.NVarChar, application.Manifesto)
          .input('ApplicationID', sql.Int, applicationId)
          .query(`
            INSERT INTO Candidates (ElectionID, UserID, Symbol, Manifesto, ApplicationID)
            VALUES (@ElectionID, @UserID, @Symbol, @Manifesto, @ApplicationID)
          `);

        await logAction(adminId, 'APPROVE_CANDIDATE', `Admin approved candidate application ID ${applicationId}.`, req.ip);
      } else {
        await logAction(adminId, 'REJECT_CANDIDATE', `Admin rejected candidate application ID ${applicationId}. Reason: ${rejectionReason}`, req.ip);
      }

      res.json({
        success: true,
        message: `Application ${status.toLowerCase()} successfully`
      });
    } catch (error) {
      console.error('Review candidate application error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = adminController;