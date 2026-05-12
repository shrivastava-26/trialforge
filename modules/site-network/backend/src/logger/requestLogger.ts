import morgan from 'morgan';
import logger from './logger';

// Pipe morgan output into winston so all logs share one transport
const stream = {
  write: (message: string) => logger.http(message.trimEnd()),
};

// Combined format: method, url, status, response-time, content-length
const requestLogger = morgan('combined', { stream });

export default requestLogger;
