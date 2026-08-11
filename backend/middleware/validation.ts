import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

// Middleware for validating API requests
const validateRequest = (validations: any[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        await Promise.all(validations.map(validation => validation.run(req)));
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    };
};

// Example validation for user creation
const userValidation = [
    body('username').isString().notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Email is not valid'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];

// Example validation for empathy processing
const empathyValidation = [
    body('message').isString().notEmpty().withMessage('Message is required'),
    body('context').isObject().withMessage('Context must be an object'),
];

// Exporting the validation middleware
export { validateRequest, userValidation, empathyValidation };