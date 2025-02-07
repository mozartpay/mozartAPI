import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey || apiKey !== config.apiKey) {
        return res.status(401).json({ error: 'Invalid API key' });
    }

    next();
};
