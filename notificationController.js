const { getPool, sql } = require('../config/dbConfig');

const notificationController = {
  // Get all notifications for the logged-in user
  getUserNotifications: async (req, res) => {
    try {
      const userId = req.user.UserID;
      const pool = getPool();

      const result = await pool.request()
        .input('UserID', sql.Int, userId)
        .query('SELECT * FROM Notifications WHERE UserID = @UserID ORDER BY SentDate DESC');

      res.json({ success: true, notifications: result.recordset });
    } catch (error) {
      console.error('Get user notifications error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Mark notifications as read
  markNotificationsAsRead: async (req, res) => {
    try {
      const userId = req.user.UserID;
      const { notificationIds } = req.body; // Expect an array of IDs
      const pool = getPool();

      if (!notificationIds || notificationIds.length === 0) {
        return res.status(400).json({ error: 'Notification IDs are required.' });
      }

      // Create a string of comma-separated placeholders for the IN clause
      const idPlaceholders = notificationIds.map((id, index) => `@id${index}`).join(',');
      
      const request = pool.request();
      // Dynamically add inputs for each notification ID
      notificationIds.forEach((id, index) => {
        request.input(`id${index}`, sql.Int, id);
      });

      await request
        .input('UserID', sql.Int, userId)
        .query(`
          UPDATE Notifications 
          SET IsRead = 1 
          WHERE UserID = @UserID AND NotificationID IN (${idPlaceholders})
        `);

      res.json({ success: true, message: 'Notifications marked as read.' });
    } catch (error) {
      console.error('Mark notifications as read error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Helper function to create a notification (not a route handler)
  createNotification: async (userId, type, message) => {
    try {
      const pool = getPool();
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('Type', sql.VarChar, type)
        .input('Message', sql.NVarChar, message)
        .query(`
          INSERT INTO Notifications (UserID, Type, Message, SentDate, IsRead)
          VALUES (@UserID, @Type, @Message, GETDATE(), 0)
        `);
      console.log(`Notification created for user ${userId}: ${message}`);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }
};

module.exports = notificationController;
