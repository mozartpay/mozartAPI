import winston from 'winston';
import { Request } from 'express';

const logger = winston.createLogger({
    level: 'debug', 
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: 'mozart-api' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({  
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

export const logRequest = (req: Request, context: string) => {
    const logData = {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        context,
        cookies: req.cookies,
        timestamp: new Date().toISOString()
    };
    logger.info('Request received', logData);
};

export const logError = (error: Error, context: string, req?: Request) => {
    const logData = {
        error: {
            message: error.message,
            stack: error.stack
        },
        context,
        ...(req && {
            method: req.method,
            path: req.path,
            ip: req.ip
        })
    };
    logger.error('Error occurred', logData);
};

export default logger;
