// src/utils/logger.js

import { createLogger, format, transports } from 'winston';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define log directory
const logDir = join(__dirname, '../../resources/logs');

// Create a Winston logger with log rotation and multiple levels
const logger = createLogger({
    level: 'info', // Minimum logging level
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
        }),
        format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}] ${message}`;
        })
    ),
    transports: [
        new transports.Console(), // Log to the console
        new transports.File({
            filename: join(logDir, 'app.log'),
            maxsize: 5242880, // 5MB log rotation
            maxFiles: 5, // Keep up to 5 rotated files
            tailable: true,
        }),
        new transports.File({
            filename: join(logDir, 'error.log'),
            level: 'error', // Log errors separately
            maxsize: 5242880,
            maxFiles: 5,
            tailable: true,
        }),
    ],
    exceptionHandlers: [
        new transports.File({ filename: join(logDir, 'exceptions.log') })
    ],
    exitOnError: false, // Do not exit on handled exceptions
});

// Middleware to log incoming requests
const logRequest = (req, res, next) => {
    const { method, headers, url } = req;
    const origin = headers.origin || 'unknown-origin';
    logger.info(`${method}\t${origin}\t${url}`);
    console.log(`${method} ${req.path}`); // Optional: keep console logging
    next();
};

// Middleware to log errors
const logErrors = (err, req, res, next) => {
    const { method, url } = req;
    logger.error(`${method}\t${url}\t${err.message}`);
    next(err); // Pass the error to the next middleware
};

export { logger, logRequest, logErrors };
