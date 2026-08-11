import { Request, Response, NextFunction } from 'express';

const allowedOrigins = [
    'http://localhost:3000', // Update with your frontend URL
    'https://your-production-url.com', // Add your production URL
];

const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin as string)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
};

export default corsMiddleware;