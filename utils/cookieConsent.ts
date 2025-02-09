import { Request, Response, NextFunction } from 'express';
import logger, { logRequest, logError } from './logger';

// Cookie names
const COOKIE_CONSENT = 'cookie_consent';
const COOKIE_NECESSARY = 'cookie_necessary';

// Cookie options
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    sameSite: 'strict' as const
};

export const setCookieConsent = (req: Request, res: Response, type: 'all' | 'necessary') => {
    try {
        // Log the consent action
        logger.info('Setting cookie consent', {
            type,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            timestamp: new Date().toISOString()
        });

        // Set the consent cookie
        res.cookie(COOKIE_CONSENT, type, COOKIE_OPTIONS);
        
        // Set the necessary cookies cookie
        res.cookie(COOKIE_NECESSARY, 'true', COOKIE_OPTIONS);
        
        // If user accepted all cookies, set additional tracking cookies here
        if (type === 'all') {
            // Add your tracking cookies here
            logger.info('Setting additional tracking cookies', {
                ip: req.ip,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        logError(error as Error, 'setCookieConsent', req);
        throw error;
    }
};

export const checkCookieConsent = (req: Request, res: Response, next: NextFunction) => {
    try {
        const consent = req.cookies[COOKIE_CONSENT];
        
        // Log the consent check
        logger.debug('Checking cookie consent', {
            consent,
            ip: req.ip,
            path: req.path,
            timestamp: new Date().toISOString()
        });

        if (!consent) {
            logger.info('No cookie consent found', {
                ip: req.ip,
                path: req.path,
                timestamp: new Date().toISOString()
            });
            
            // No consent yet, send response indicating consent needed
            return res.status(403).json({ 
                error: 'Cookie consent required',
                requiresConsent: true 
            });
        }
        next();
    } catch (error) {
        logError(error as Error, 'checkCookieConsent', req);
        next(error);
    }
};

export const clearCookieConsent = (req: Request, res: Response) => {
    try {
        logger.info('Clearing cookie consent', {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            timestamp: new Date().toISOString()
        });

        res.clearCookie(COOKIE_CONSENT);
        res.clearCookie(COOKIE_NECESSARY);
        // Clear any other cookies set during consent
    } catch (error) {
        logError(error as Error, 'clearCookieConsent', req);
        throw error;
    }
};
