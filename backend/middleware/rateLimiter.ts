import { Request, Response, NextFunction } from 'express';

const rateLimit = (req: Request, res: Response, next: NextFunction) => {
    const limit = 100; // Maximum number of requests
    const timeWindow = 60 * 1000; // Time window in milliseconds (1 minute)
    
    // Store the request count and timestamp in a simple in-memory store
    const currentTime = Date.now();
    const userIp = req.ip;

    if (!req.app.locals.rateLimit) {
        req.app.locals.rateLimit = {};
    }

    if (!req.app.locals.rateLimit[userIp]) {
        req.app.locals.rateLimit[userIp] = { count: 0, startTime: currentTime };
    }

    const userData = req.app.locals.rateLimit[userIp];

    // Reset count if time window has passed
    if (currentTime - userData.startTime > timeWindow) {
        userData.count = 0;
        userData.startTime = currentTime;
    }

    userData.count++;

    if (userData.count > limit) {
        return res.status(429).json({ message: 'Too many requests, please try again later.' });
    }

    next();
};

export default rateLimit;