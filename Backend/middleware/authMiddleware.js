const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/dbConfig');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const pool = getPool();
    
    const result = await pool.request()
      .input('UserID', sql.Int, decoded.userId)
      .input('Token', sql.VarChar, token)
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
        INNER JOIN Sessions sess ON u.UserID = sess.UserID
        WHERE u.UserID = @UserID AND sess.Token = @Token AND sess.ExpiryTime > GETDATE()
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = result.recordset[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.Role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = { authenticateToken, requireRole };