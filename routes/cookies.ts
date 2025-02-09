import express from 'express';
import { setCookieConsent, clearCookieConsent } from '../utils/cookieConsent';
import logger, { logRequest, logError } from '../utils/logger';

const router = express.Router();

router.post('/consent', (req, res) => {
    try {
        const { type } = req.body;
        
        logRequest(req, 'cookie-consent-request');
        
        if (type !== 'all' && type !== 'necessary') {
            logger.warn('Invalid consent type received', {
                type,
                ip: req.ip,
                timestamp: new Date().toISOString()
            });
            return res.status(400).json({ error: 'Invalid consent type' });
        }
        
        setCookieConsent(req, res, type);
        
        logger.info('Cookie consent set successfully', {
            type,
            ip: req.ip,
            timestamp: new Date().toISOString()
        });
        
        res.json({ success: true });
    } catch (error) {
        logError(error as Error, 'cookie-consent-endpoint', req);
        res.status(500).json({ error: 'Failed to set cookie consent' });
    }
});

router.post('/clear', (req, res) => {
    try {
        logRequest(req, 'cookie-clear-request');
        
        clearCookieConsent(req, res);
        
        logger.info('Cookies cleared successfully', {
            ip: req.ip,
            timestamp: new Date().toISOString()
        });
        
        res.json({ success: true });
    } catch (error) {
        logError(error as Error, 'cookie-clear-endpoint', req);
        res.status(500).json({ error: 'Failed to clear cookies' });
    }
});

export default router;
