const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../config/dbConfig');
const { logAction } = require('../utils/auditLogger');

const authController = {
  register: async (req, res) => {
    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    try {
      const {
        name, email, password, role, cnic, phoneNumber, campusId, departmentId,
        // Student details
        rollNumber, batch, semester, section, admissionYear,
        // Faculty details
        designation, qualification, joiningDate,
        // Management details
        position, responsibility,
        // Admin details
        accessLevel
      } = req.body;

      // Start transaction
      await transaction.begin();

      // Check if user already exists
      const userExistsResult = await new sql.Request(transaction)
        .input('email', sql.VarChar, email)
        .input('cnic', sql.VarChar, cnic)
        .query('SELECT * FROM Users WHERE Email = @email OR CNIC = @cnic');

      if (userExistsResult.recordset.length > 0) {
        await transaction.rollback();
        return res.status(400).json({ message: 'User with this email or CNIC already exists.' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Create new user
      const userResult = await new sql.Request(transaction)
        .input('name', sql.VarChar, name)
        .input('email', sql.VarChar, email)
        .input('passwordHash', sql.VarChar, passwordHash)
        .input('role', sql.VarChar, role)
        .input('cnic', sql.VarChar, cnic)
        .input('phoneNumber', sql.VarChar, phoneNumber)
        .input('campusId', sql.Int, campusId)
        .input('departmentId', sql.Int, departmentId)
        .query(`
          INSERT INTO Users (Name, Email, PasswordHash, Role, CNIC, PhoneNumber, CampusID, DepartmentID) 
          OUTPUT INSERTED.UserID
          VALUES (@name, @email, @passwordHash, @role, @cnic, @phoneNumber, @campusId, @departmentId)
        `);
      
      const userId = userResult.recordset[0].UserID;

      // Insert role-specific details
      if (role === 'Student') {
        await new sql.Request(transaction)
          .input('UserID', sql.Int, userId)
          .input('RollNumber', sql.VarChar, rollNumber)
          .input('Batch', sql.VarChar, batch)
          .input('Semester', sql.Int, semester)
          .input('Section', sql.VarChar, section)
          .input('AdmissionYear', sql.Int, admissionYear)
          .query('INSERT INTO Student_Details (UserID, RollNumber, Batch, Semester, Section, AdmissionYear) VALUES (@UserID, @RollNumber, @Batch, @Semester, @Section, @AdmissionYear)');
      } else if (role === 'Faculty') {
        await new sql.Request(transaction)
          .input('UserID', sql.Int, userId)
          .input('Designation', sql.VarChar, designation)
          .input('Qualification', sql.VarChar, qualification)
          .input('JoiningDate', sql.Date, joiningDate)
          .query('INSERT INTO Faculty_Details (UserID, Designation, Qualification, JoiningDate) VALUES (@UserID, @Designation, @Qualification, @JoiningDate)');
      } else if (role === 'Management') {
        await new sql.Request(transaction)
            .input('UserID', sql.Int, userId)
            .input('Position', sql.VarChar, position)
            .input('Responsibility', sql.NVarChar, responsibility)
            .query('INSERT INTO Management_Details (UserID, Position, Responsibility) VALUES (@UserID, @Position, @Responsibility)');
      } else if (role === 'Admin') {
        await new sql.Request(transaction)
          .input('UserID', sql.Int, userId)
          .input('AccessLevel', sql.VarChar, accessLevel)
          .query('INSERT INTO Admin_Details (UserID, AccessLevel) VALUES (@UserID, @AccessLevel)');
      }

      // Commit transaction
      await transaction.commit();

      // Log action
      await logAction(userId, 'USER_REGISTER', `User ${name} (${email}) registered as ${role}.`, req.ip);

      res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
      if (transaction.active) {
        await transaction.rollback();
      }
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const pool = getPool();

      // Find user
      const userResult = await pool.request()
        .input('email', sql.VarChar, email)
        .query(`
          SELECT u.*, 
                 c.CampusName,
                 d.DeptName,
                 s.RollNumber, s.Batch, s.Semester, s.Section, s.AdmissionYear,
                 f.Designation, f.Qualification, f.JoiningDate,
                 m.Position AS ManagementPosition, m.Responsibility,
                 a.AccessLevel
          FROM Users u
          LEFT JOIN Campuses c ON u.CampusID = c.CampusID
          LEFT JOIN Departments d ON u.DepartmentID = d.DepartmentID
          LEFT JOIN Student_Details s ON u.UserID = s.UserID
          LEFT JOIN Faculty_Details f ON u.UserID = f.UserID
          LEFT JOIN Management_Details m ON u.UserID = m.UserID
          LEFT JOIN Admin_Details a ON u.UserID = a.UserID
          WHERE u.Email = @email
        `);

      if (userResult.recordset.length === 0) {
        await logAction(null, 'LOGIN_FAILURE', `Login attempt failed for email: ${email}. Reason: User not found.`, req.ip);
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = userResult.recordset[0];

      // Compare password
      const isMatch = await bcrypt.compare(password, user.PasswordHash);
      if (!isMatch) {
        await logAction(user.UserID, 'LOGIN_FAILURE', `Login attempt failed. Reason: Invalid password.`, req.ip);
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Update last login
      await pool.request()
        .input('UserID', sql.Int, user.UserID)
        .query('UPDATE Users SET LastLogin = GETDATE() WHERE UserID = @UserID');

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.UserID, email: user.Email, role: user.Role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Store session in database
      await pool.request()
        .input('UserID', sql.Int, user.UserID)
        .input('Token', sql.VarChar, token)
        .input('IPAddress', sql.VarChar, req.ip)
        .input('ExpiryTime', sql.DateTime, new Date(Date.now() + 24 * 60 * 60 * 1000))
        .query(`
          INSERT INTO Sessions (UserID, Token, IPAddress, ExpiryTime)
          VALUES (@UserID, @Token, @IPAddress, @ExpiryTime)
        `);
      
      // Log action
      await logAction(user.UserID, 'USER_LOGIN', `User ${user.Name} logged in successfully.`, req.ip);

      // Remove password from response
      const { PasswordHash, ...userWithoutPassword } = user;

      res.json({
        success: true,
        token,
        user: userWithoutPassword,
        message: 'Login successful'
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  logout: async (req, res) => {
    try {
      const token = req.headers['authorization']?.split(' ')[1];
      const pool = getPool();

      await pool.request()
        .input('Token', sql.VarChar, token)
        .query('DELETE FROM Sessions WHERE Token = @Token');

      res.json({ success: true, message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getProfile: async (req, res) => {
    try {
      const user = req.user;
      // Remove sensitive data
      const { PasswordHash, ...userProfile } = user;
      res.json({ success: true, user: userProfile });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = authController;