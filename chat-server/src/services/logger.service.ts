/**
 * Centralized logging service using Winston
 * Provides structured logging with different levels and formats
 */

import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';

// Custom format for development
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    const emoji = {
      error: '❌',
      warn: '⚠️',
      info: '📋',
      debug: '🔍',
      verbose: '📝'
    }[level] || '📋';
    
    return `${emoji} ${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

// Custom format for production
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: logLevel,
  format: nodeEnv === 'production' ? productionFormat : developmentFormat,
  defaultMeta: { 
    service: 'pxl-chat-server',
    version: '1.0.0'
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true
    }),
    
    // File transport for errors (production)
    ...(nodeEnv === 'production' ? [
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    ] : [])
  ],
  exitOnError: false
});

// Create logs directory in production
if (nodeEnv === 'production') {
  const fs = require('fs');
  const path = require('path');
  
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

// Add request correlation ID support
export const addCorrelationId = (correlationId: string) => {
  return logger.child({ correlationId });
};

// Export logger with additional methods
export default logger;

