const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 }),
  handleValidationErrors
];

const registerValidation = [
  body('name').isLength({ min: 3 }).withMessage('Name must be at least 3 characters long'),
  body('email').isEmail().normalizeEmail().withMessage('Must be a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').isIn(['Student', 'Faculty', 'Management', 'Admin']).withMessage('Invalid role'),
  body('cnic').isLength({ min: 15, max: 15 }).withMessage('CNIC must be 15 characters long'),
  body('phoneNumber').optional().isLength({ min: 11, max: 15 }).withMessage('Phone number is invalid'),
  body('campusId').isInt({ min: 1 }).withMessage('Campus ID is required'),
  body('departmentId').optional().isInt({ min: 1 }).withMessage('Department ID is invalid'),

  // Role-specific validation
  body('rollNumber').if(body('role').equals('Student')).isLength({ min: 1 }).withMessage('Roll number is required for students'),
  body('batch').if(body('role').equals('Student')).isLength({ min: 1 }).withMessage('Batch is required for students'),
  body('semester').if(body('role').equals('Student')).isInt({ min: 1 }).withMessage('Semester is required for students'),
  body('section').if(body('role').equals('Student')).isLength({ min: 1 }).withMessage('Section is required for students'),
  body('admissionYear').if(body('role').equals('Student')).isInt({ min: 2000 }).withMessage('Admission year is required for students'),

  body('designation').if(body('role').equals('Faculty')).isLength({ min: 1 }).withMessage('Designation is required for faculty'),
  body('qualification').if(body('role').equals('Faculty')).isLength({ min: 1 }).withMessage('Qualification is required for faculty'),
  body('joiningDate').if(body('role').equals('Faculty')).isISO8601().withMessage('Joining date is required for faculty'),

  body('position').if(body('role').equals('Management')).isLength({ min: 1 }).withMessage('Position is required for management'),

  body('accessLevel').if(body('role').equals('Admin')).isLength({ min: 1 }).withMessage('Access level is required for admins'),

  handleValidationErrors
];

const voteValidation = [
  body('electionId').isInt({ min: 1 }),
  body('candidateId').isInt({ min: 1 }),
  handleValidationErrors
];

const electionValidation = [
  body('title').isLength({ min: 5 }),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  handleValidationErrors
];

module.exports = {
  loginValidation,
  registerValidation,
  voteValidation,
  electionValidation,
  handleValidationErrors
};