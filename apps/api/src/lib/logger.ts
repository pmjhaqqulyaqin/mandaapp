import pino from 'pino';
import path from 'path';
import fs from 'fs';

const isProduction = process.env.NODE_ENV === 'production';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create a date-stamped log file for rotation
function getLogFilePath(): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(logsDir, `app-${date}.log`);
}

const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  
  // Structured JSON in production, pretty in development
  ...(isProduction ? {
    // In production, log to file with daily rotation via filename
    transport: {
      target: 'pino/file',
      options: { destination: getLogFilePath(), mkdir: true },
    },
  } : {
    // In development, pretty-print to console
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),

  // Redact sensitive fields from logs
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'token'],
    remove: true,
  },
});

export default logger;
