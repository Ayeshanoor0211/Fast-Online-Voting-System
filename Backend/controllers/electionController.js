const { getPool, sql } = require('../config/dbConfig');

const electionController = {

  // --- 1. CREATE ELECTION (Admin ke liye) ---
  createElection: async (req, res) => {
    try {
      const pool = getPool();
      const { Title, CampusID, PositionID, Description, StartDate, EndDate } = req.body;

      // Validate Input
      if (!Title || !CampusID || !PositionID || !StartDate || !EndDate) {
        return res.status(400).json({ message: 'Please fill all required fields' });
      }

      // Database Insert
      await pool.request()
        .input('CampusID', sql.Int, CampusID)
        .input('PositionID', sql.Int, PositionID)
        .input('Title', sql.NVarChar, Title)
        .input('Description', sql.NVarChar, Description)
        .input('StartDate', sql.DateTime, new Date(StartDate))
        .input('EndDate', sql.DateTime, new Date(EndDate))
        .query(`
          INSERT INTO Elections (CampusID, PositionID, Title, Description, StartDate, EndDate, IsActive)
          VALUES (@CampusID, @PositionID, @Title, @Description, @StartDate, @EndDate, 1)
        `);

      res.status(201).json({ success: true, message: 'Election created successfully!' });

    } catch (error) {
      console.error('Error creating election:', error);
      res.status(500).json({ message: 'Database error: ' + error.message });
    }
  },

  // --- 2. GET ACTIVE ELECTIONS (Student Dashboard ke liye) ---
  getActiveElections: async (req, res) => {
    try {
      const pool = getPool();
      // Sirf Active aur Current Date wale elections layein
      const result = await pool.request().query(`
        SELECT e.ElectionID, e.Title, e.Description, e.StartDate, e.EndDate, 
               c.CampusName, p.PositionName 
        FROM Elections e
        INNER JOIN Campuses c ON e.CampusID = c.CampusID
        INNER JOIN Positions p ON e.PositionID = p.PositionID
        WHERE e.IsActive = 1 
        AND GETDATE() BETWEEN e.StartDate AND e.EndDate
        ORDER BY e.StartDate DESC
      `);

      res.status(200).json({ elections: result.recordset });
    } catch (error) {
      console.error('Error fetching active elections:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // --- 3. GET ALL ELECTIONS (Admin List ke liye) ---
  getAllElections: async (req, res) => {
    try {
      const pool = getPool();
      const result = await pool.request().query(`
        SELECT e.*, p.PositionName, c.CampusName, e.Description
        FROM Elections e
        INNER JOIN Positions p ON e.PositionID = p.PositionID
        INNER JOIN Campuses c ON e.CampusID = c.CampusID
        ORDER BY e.StartDate DESC
      `);

      res.json({ success: true, elections: result.recordset });
    } catch (error) {
      console.error('Get elections error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // --- 4. GET CAMPUS SPECIFIC ELECTIONS ---
  getElectionsByCampus: async (req, res) => {
    try {
      const { campusId } = req.params;
      const pool = getPool();

      const result = await pool.request()
        .input('CampusID', sql.Int, campusId)
        .query(`
          SELECT e.*, p.PositionName, c.CampusName
          FROM Elections e
          INNER JOIN Positions p ON e.PositionID = p.PositionID
          INNER JOIN Campuses c ON e.CampusID = c.CampusID
          WHERE e.CampusID = @CampusID AND e.IsActive = 1
          ORDER BY e.StartDate DESC
        `);

      res.json({ success: true, elections: result.recordset });
    } catch (error) {
      console.error('Get campus elections error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // --- 5. GET ELECTION DETAILS (Voting Page ke liye) ---
  getElectionDetails: async (req, res) => {
    try {
      const { electionId } = req.params;
      const pool = getPool();

      // Election Info
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

      // Candidates List
      const candidatesResult = await pool.request()
        .input('ElectionID', sql.Int, electionId)
        .query(`
          SELECT c.*, u.Name, u.Email
          FROM Candidates c
          INNER JOIN Users u ON c.UserID = u.UserID
          WHERE c.ElectionID = @ElectionID
        `);

      res.json({
        success: true,
        election: electionResult.recordset[0],
        candidates: candidatesResult.recordset
      });
    } catch (error) {
      console.error('Get election details error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // --- 6. CHECK VOTER REGISTRATION (Voting se pehle check) ---
  checkVoterRegistration: async (req, res) => {
    try {
      const { electionId } = req.params;
      const userId = req.user.UserID; // Middleware se milega
      const pool = getPool();

      const result = await pool.request()
        .input('UserID', sql.Int, userId)
        .input('ElectionID', sql.Int, electionId)
        .query(`
          SELECT * FROM Voter_Registration 
          WHERE UserID = @UserID AND ElectionID = @ElectionID
        `);

      if (result.recordset.length === 0) {
        return res.json({ 
          success: true, 
          registered: false,
          message: 'Not registered for this election'
        });
      }

      res.json({
        success: true,
        registered: true,
        registration: result.recordset[0]
      });
    } catch (error) {
      console.error('Check voter registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // --- 7. UTILITY: GET CAMPUSES (Dropdown ke liye) ---
  getCampuses: async (req, res) => {
    try {
      const pool = getPool();
      const result = await pool.request().query('SELECT * FROM Campuses ORDER BY CampusName');
      res.json({ success: true, campuses: result.recordset });
    } catch (error) {
      console.error('Get campuses error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  // --- 8. UTILITY: GET DEPARTMENTS ---
  getDepartments: async (req, res) => {
    try {
      const pool = getPool();
      const result = await pool.request().query('SELECT * FROM Departments ORDER BY DeptName');
      res.json({ success: true, departments: result.recordset });
    } catch (error) {
      console.error('Get departments error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  // --- 9. UTILITY: GET DEPARTMENTS BY CAMPUS ---
  getDepartmentsByCampus: async (req, res) => {
    try {
      const { campusId } = req.params;
      const pool = getPool();
      const result = await pool.request()
        .input('CampusID', sql.Int, campusId)
        .query('SELECT * FROM Departments WHERE CampusID = @CampusID ORDER BY DeptName');

      res.json({ success: true, departments: result.recordset });
    } catch (error) {
      console.error('Get departments by campus error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
};

module.exports = electionController;