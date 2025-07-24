import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';

/**
 * Handle validation errors
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg,
      })),
    });
    return;
  }
  
  next();
};

/**
 * User registration validation rules
 */
export const validateUserRegistration: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters long')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
];

/**
 * User login validation rules
 */
export const validateUserLogin: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/**
 * Client creation validation rules
 */
export const validateClientCreation: ValidationChain[] = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Client name must be between 2 and 100 characters long'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name must not exceed 100 characters'),
  
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters'),
];

/**
 * Order creation validation rules
 */
export const validateOrderCreation: ValidationChain[] = [
  body('clientId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Please provide a valid client ID'),
  
  body('description')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Description must be between 5 and 500 characters long'),
  
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  
  body('frequency')
    .isIn(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY', 'CUSTOM'])
    .withMessage('Please provide a valid frequency'),
  
  body('startDate')
    .isISO8601()
    .withMessage('Please provide a valid start date'),
  
  body('customDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Custom days must be between 1 and 365'),
];

/**
 * Invoice creation validation rules
 */
export const validateInvoiceCreation: ValidationChain[] = [
  body('clientId')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Please provide a valid client ID'),
  
  body('orderId')
    .optional()
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Please provide a valid order ID'),
  
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  
  body('issueDate')
    .isISO8601()
    .withMessage('Please provide a valid issue date'),
  
  body('dueDate')
    .isISO8601()
    .withMessage('Please provide a valid due date')
    .custom((dueDate, { req }) => {
      const issueDate = new Date(req.body.issueDate);
      const dueDateObj = new Date(dueDate);
      
      if (dueDateObj <= issueDate) {
        throw new Error('Due date must be after issue date');
      }
      
      return true;
    }),
];

/**
 * Sanitize and escape user input
 */
export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Basic sanitization for common fields
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // Trim whitespace
        req.body[key] = req.body[key].trim();
        
        // Remove null bytes
        req.body[key] = req.body[key].replace(/\0/g, '');
        
        // Basic HTML escape for display purposes (not for storage)
        // This is mainly for logging and error messages
        if (key !== 'password') {
          req.body[key] = req.body[key]
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
        }
      }
    });
  }
  
  next();
};